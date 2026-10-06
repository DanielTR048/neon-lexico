package com.neonlexico.game

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class GameViewModel(application: Application): AndroidViewModel(application) {
    private val repository=GameRepository(application)
    private val cloud=CloudSync(repository)
    private var engine=Engine(emptyList())
    private var generation=0L
    private var revision=0L
    private var drawCount=0
    private var foreground=true
    private var beginning=false
    private val syncJobs=mutableMapOf<String,Job>()
    private val delayedSyncJobs=mutableMapOf<String,Job>()
    var state by mutableStateOf(State())
        private set
    init {
        runCatching { val themes=repository.catalog();engine=Engine(themes);state=state.copy(themes=themes,syncCode=repository.syncCode()) }
            .onFailure { state=state.copy(error="Não foi possível abrir os temas. Feche e reabra o aplicativo; seus dados continuam guardados.") }
    }
    fun selectProfile(id: String) {
        if(id==state.activeProfileId) return
        if(state.activeProfileId!=null&&!persist(false)) return
        runCatching {
            val save=repository.load(id);generation++;revision++;drawCount=0
            state=State(themes=state.themes,activeProfileId=id,save=save,syncCode=repository.syncCode());syncNow()
        }.onFailure { state=state.copy(error="Não foi possível abrir o perfil. Seu progresso foi preservado.") }
    }
    fun switchProfile() {
        if(state.activeProfileId!=null&&!persist()) return
        generation++;revision++;drawCount=0
        state=State(themes=state.themes,syncCode=repository.syncCode())
    }
    fun navigate(screen: Screen) { if(state.activeProfileId==null) return;if(state.screen==Screen.PLAY&&!persist()) return;state=state.copy(screen=screen) }
    fun prepare(mode: Mode,level: Int,replay: Boolean=false) {
        if(state.activeProfileId==null) return
        if(level !in 1..100||level>Engine.unlockedLevel(state.save,mode)) { state=state.copy(error="Conclua a fase anterior para liberar esta conexão.");return }
        if(state.screen==Screen.PLAY&&!persist()) return
        val session=state.save.sessions["${mode.wire}:$level"]
        if(session!=null&&!replay) { state=state.copy(mode=mode,level=level,screen=Screen.PLAY,activeWordId=session.puzzle.words.firstOrNull { it.id !in session.solved }?.id?:session.puzzle.words.first().id,cursor=0);selectWord(state.activeWordId);return }
        state=state.copy(mode=mode,level=level,screen=Screen.SETUP,selectedThemes=engine.drawThemes("${state.save.seed}:$drawCount",mode,level))
    }
    fun shuffleThemes() { drawCount++;state=state.copy(selectedThemes=engine.drawThemes("${state.save.seed}:$drawCount",state.mode,state.level)) }
    fun begin() {
        val id=state.activeProfileId?:return
        if(state.screen!=Screen.SETUP||beginning) return
        val context=state;val selectedGeneration=generation;beginning=true
        viewModelScope.launch {
            val result=withContext(Dispatchers.Default) { runCatching { Session(engine.generatePuzzle(context.save.seed,context.mode,context.level,context.selectedThemes.map { it.id })) } }
            beginning=false
            if(generation!=selectedGeneration||state.activeProfileId!=id||state.screen!=Screen.SETUP||state.mode!=context.mode||state.level!=context.level||state.save.seed!=context.save.seed||state.selectedThemes!=context.selectedThemes) return@launch
            result.onSuccess { session ->
                state=state.copy(save=state.save.copy(sessions=state.save.sessions+("${state.mode.wire}:${state.level}" to session)),screen=Screen.PLAY,activeWordId=session.puzzle.words.first().id,cursor=startCursor(session,session.puzzle.words.first()));revision++;persist()
            }.onFailure { state=state.copy(error="O sinal falhou. Sorteie outros temas e tente novamente.") }
        }
    }
    /** First square the player can still type into: empty first, then any square that is not unlocked. */
    private fun startCursor(session: Session,word: PuzzleWord): Int {
        val cells=Engine.wordCells(word)
        val empty=cells.indexOfFirst { it.key !in session.revealed&&session.values[it.key].isNullOrEmpty() }
        return if(empty>=0) empty else cells.indexOfFirst { it.key !in session.revealed }.coerceAtLeast(0)
    }
    fun selectWord(id: String,cell: String?=null) {
        val session=state.session?:return;val word=session.puzzle.words.firstOrNull { it.id==id }?:return
        val cursor=if(cell!=null) Engine.wordCells(word).indexOfFirst { it.key==cell }.coerceAtLeast(0) else startCursor(session,word)
        state=state.copy(activeWordId=id,cursor=cursor)
    }
    private fun activeWord(): Pair<Session,PuzzleWord>? {
        if(state.activeProfileId==null||state.screen!=Screen.PLAY) return null
        val session=state.session?:return null;val word=session.puzzle.words.firstOrNull { it.id==state.activeWordId }?:return null
        if(session.completed||word.id in session.solved) return null
        return session to word
    }
    /**
     * In-app keyboard. Unlocked letters (cascade, hints, solved crossings) are never typed over: the
     * letter goes to the next editable square, so a player who skips a given letter keeps alignment.
     */
    fun typeLetter(letter: Char) {
        val (session,word)=activeWord()?:return
        val value=Engine.normalizeAnswer(letter.toString()).takeIf { it.length==1 }?:return
        val cells=Engine.wordCells(word);var index=state.cursor.coerceIn(cells.indices)
        while(index<cells.size&&cells[index].key in session.revealed) index++
        if(index>=cells.size) return
        var next=index+1
        while(next<cells.size&&cells[next].key in session.revealed) next++
        writeGridValues(session,session.values+(cells[index].key to value),if(next<cells.size) next else index)
        if(state.mode==Mode.MAGAZINE&&next>=cells.size&&cells.all { !state.session!!.values[it.key].isNullOrEmpty() }) nextWord()
    }
    fun eraseGridCell() {
        val (session,word)=activeWord()?:return
        val cells=Engine.wordCells(word);var index=state.cursor.coerceIn(cells.indices)
        if(session.values[cells[index].key].isNullOrEmpty()||cells[index].key in session.revealed) index--
        while(index>=0&&cells[index].key in session.revealed) index--
        if(index<0) return
        writeGridValues(session,session.values-cells[index].key,index)
    }
    /** Switches between the horizontal and vertical answer that share the cursor square. */
    fun toggleDirection() {
        val session=state.session?:return;val word=session.puzzle.words.firstOrNull { it.id==state.activeWordId }?:return
        val key=Engine.wordCells(word).getOrNull(state.cursor)?.key?:return
        val other=session.puzzle.words.firstOrNull { it.id!=word.id&&Engine.wordCells(it).any { cell -> cell.key==key } }?:return
        selectWord(other.id,key)
    }
    fun previousWord() {
        val session=state.session?:return
        val index=session.puzzle.words.indexOfFirst { it.id==state.activeWordId }
        val ordered=(session.puzzle.words.take(index.coerceAtLeast(0))).reversed()+session.puzzle.words.drop(index.coerceAtLeast(0)).reversed()
        val previous=ordered.firstOrNull { word -> word.id !in session.solved&&Engine.wordCells(word).any { session.values[it.key].isNullOrEmpty() } }?:ordered.firstOrNull { it.id !in session.solved }?:ordered.firstOrNull()
        if(previous!=null) selectWord(previous.id)
    }
    /** Confirms the active answer straight from the grid squares (Palavras cruzadas and Cascata). */
    fun confirmWord() {
        val (session,word)=activeWord()?:return
        val answer=Engine.wordCells(word).joinToString("") { session.values[it.key].orEmpty() }
        if(answer.length<word.answer.length) { state=state.copy(error="Complete as ${word.answer.length} letras antes de conectar.");return }
        submitAnswer(answer)
    }
    private fun writeGridValues(session: Session,values: Map<String,String>,cursor: Int) {
        val next=session.copy(values=values)
        state=state.copy(save=state.save.copy(sessions=state.save.sessions+("${state.mode.wire}:${state.level}" to next)),cursor=cursor)
        revision++;persist()
    }
    fun updateDraft(value: String) {
        if(state.activeProfileId==null||state.screen!=Screen.PLAY) return
        val session=state.session?:return
        val word=session.puzzle.words.firstOrNull { it.id==state.activeWordId }?:return
        if(session.completed||word.id in session.solved) return
        val input=Engine.normalizeAnswer(value).take(word.answer.length)
        val values=session.values.toMutableMap()
        Engine.wordCells(word).forEachIndexed { index,cell ->
            if(!session.revealed.containsKey(cell.key)) {
                if(index<input.length) values[cell.key]=input[index].toString() else values.remove(cell.key)
            }
        }
        if(values==session.values) return
        val next=session.copy(values=values)
        state=state.copy(save=state.save.copy(sessions=state.save.sessions+("${state.mode.wire}:${state.level}" to next)),cursor=input.length.coerceAtMost(word.answer.lastIndex))
        revision++;persist()
    }
    fun submitAnswer(answer: String) {
        if(state.mode==Mode.MAGAZINE) {
            updateDraft(answer)
            nextWord()
            return
        }
        val session=state.session?:return;val result=Engine.submitWord(session,state.activeWordId,answer)
        afterChange(result.session)
        if(!result.correct) state=state.copy(error="Ainda não é essa conexão. Confira a pista e tente de novo.")
    }
    fun nextWord() {
        val session=state.session?:return
        val index=session.puzzle.words.indexOfFirst { it.id==state.activeWordId }
        val ordered=session.puzzle.words.drop(index+1)+session.puzzle.words.take(index+1)
        val next=ordered.firstOrNull { word -> Engine.wordCells(word).any { session.values[it.key].isNullOrEmpty() } }?:ordered.firstOrNull()
        if(next!=null) selectWord(next.id)
    }
    fun hint() { val session=state.session?:return;afterChange(Engine.useHint(session,state.activeWordId)) }
    fun checkGrid(): String {
        val session=state.session?:return "incomplete"
        if(state.mode!=Mode.MAGAZINE) return "incomplete"
        val result=Engine.checkGrid(session);afterChange(result.session);return result.status
    }
    private fun afterChange(session: Session) {
        val word=state.activeWordId.takeIf { id -> session.puzzle.words.any { it.id==id }&&id !in session.solved }?:session.puzzle.words.firstOrNull { it.id !in session.solved }?.id?:state.activeWordId
        // A solved answer hands over to another word: its typing starts at that word's first open square.
        val cursor=if(word!=state.activeWordId) session.puzzle.words.firstOrNull { it.id==word }?.let { startCursor(session,it) }?:0 else state.cursor
        state=state.copy(save=Engine.recordCompletion(state.save,session),activeWordId=word,cursor=cursor);revision++;persist()
    }
    fun toggleSound() { state=state.copy(save=state.save.copy(settings=state.save.settings.copy(sound=!state.save.settings.sound)));revision++;persist() }
    fun toggleMotion() { state=state.copy(save=state.save.copy(settings=state.save.settings.copy(reducedMotion=!state.save.settings.reducedMotion)));revision++;persist() }
    fun tick() {
        if(!foreground||state.activeProfileId==null||state.screen!=Screen.PLAY) return
        val session=state.session?:return;if(session.completed||session.elapsed>=1_000_000_000) return
        val next=session.copy(elapsed=session.elapsed+1);state=state.copy(save=state.save.copy(sessions=state.save.sessions+("${state.mode.wire}:${state.level}" to next)));revision++
        if(next.elapsed%10==0) persist()
    }
    fun onBackground() { foreground=false;persist() }
    fun onForeground() { foreground=true;syncNow() }
    fun dismissError() { state=state.copy(error=null) }
    fun newSyncCode()=cloud.newCode()
    fun formattedSyncCode()=state.syncCode.takeIf { it.isNotEmpty() }?.let(cloud::format).orEmpty()
    fun connectDevices(code: String,create: Boolean=false) {
        if(state.syncing) return
        state=state.copy(syncing=true)
        viewModelScope.launch {
            val result=withContext(Dispatchers.IO) { runCatching { cloud.connect(code,create) } }
            result.onSuccess { state=state.copy(syncCode=it,syncing=false,syncStatus="Código conectado",syncConflict=false);syncNow() }
                .onFailure { state=state.copy(syncing=false,error=it.message?:"Não foi possível conectar. Confira a conexão.") }
        }
    }
    fun syncNow(resolve: String?=null) {
        val id=state.activeProfileId?:return
        if(repository.syncCode().isEmpty()||state.syncing||syncJobs[id]?.isActive==true) return
        if(SaveCodec.encode(repository.load(id))!=SaveCodec.encode(state.save)&&!persist(false)) return
        val selectedGeneration=generation;val selectedRevision=revision
        val previousMeta=repository.syncMeta(id)
        state=state.copy(syncing=true,syncStatus="Sincronizando…")
        val job=viewModelScope.launch {
            val result=withContext(Dispatchers.IO) { cloud.sync(id,resolve) }
            if(state.activeProfileId!=id||generation!=selectedGeneration) {
                if(result.save!=null&&SaveCodec.encode(repository.load(id))!=SaveCodec.encode(result.save)) {
                    repository.keepBackup(id,SaveCodec.encode(result.save))
                    repository.setSyncMeta(id,previousMeta.put("dirty",true))
                }
                return@launch
            }
            if(revision!=selectedRevision&&result.save!=null) {
                // A main-thread edit can arrive after the IO pull committed. Retain
                // the reviewed base so the next sync asks before replacing cloud data.
                repository.keepBackup(id,SaveCodec.encode(result.save))
                repository.setSyncMeta(id,previousMeta.put("dirty",true))
                persist(false);state=state.copy(syncing=false,syncStatus="Alterações aguardando envio");scheduleSync();return@launch
            }
            state=state.copy(save=result.save?:state.save,syncing=false,syncStatus=result.message,syncConflict=result.kind=="conflict")
            if(result.save!=null) {
                revision++
                val session=state.session
                state=state.copy(screen=if(state.screen==Screen.PLAY&&session==null) Screen.HOME else state.screen,activeWordId=session?.puzzle?.words?.firstOrNull { it.id !in session.solved }?.id?:"")
            }
            if(result.kind=="pending") scheduleSync()
        }
        syncJobs[id]=job
    }
    private fun scheduleSync() {
        val id=state.activeProfileId?:return
        if(repository.syncCode().isEmpty()) return
        delayedSyncJobs.remove(id)?.cancel()
        delayedSyncJobs[id]=viewModelScope.launch {
            delay(1500);delayedSyncJobs.remove(id)
            if(state.activeProfileId==id&&!state.syncConflict) syncNow()
        }
    }
    private fun persist(sync: Boolean=true): Boolean {
        val id=state.activeProfileId?:return true
        val saved=runCatching { repository.saveIfChanged(id,state.save) }.getOrDefault(false)
        if(!saved) { state=state.copy(error="O aparelho não conseguiu salvar. Mantenha o aplicativo aberto e libere espaço.");return false }
        if(sync) scheduleSync();return true
    }
}
