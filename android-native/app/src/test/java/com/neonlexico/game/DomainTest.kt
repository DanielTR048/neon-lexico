package com.neonlexico.game

import android.app.Application
import android.content.Context
import androidx.test.core.app.ApplicationProvider
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk=[35])
class DomainTest {
    private lateinit var app: Application
    private lateinit var repository: GameRepository
    private lateinit var engine: Engine
    private fun fixture()=JSONObject(javaClass.classLoader!!.getResourceAsStream("native-fixtures.json")!!.bufferedReader(Charsets.UTF_8).use { it.readText() })
    @Before fun configure() { app=ApplicationProvider.getApplicationContext();app.getSharedPreferences("neon-lexico",Context.MODE_PRIVATE).edit().clear().commit();repository=GameRepository(app);engine=Engine(repository.catalog()) }

    @Test fun nativePuzzlesExactlyMatchBrowserFixtures() {
        val puzzles=fixture().getJSONArray("puzzles")
        assertEquals(12,puzzles.length())
        for(i in 0 until puzzles.length()) {
            val expected=puzzles.getJSONObject(i);val actual=engine.generatePuzzle("native-parity",Mode.fromWire(expected.getString("mode")),expected.getInt("level"))
            assertEquals("Browser and Android must generate the same grid",SaveCodec.canonical(expected),SaveCodec.canonical(SaveCodec.puzzleJson(actual)))
        }
    }
    @Test fun allTwoHundredLevelsHaveValidCrossingsAndGradualSizes() {
        for(mode in Mode.entries) for(level in 1..100) {
            val puzzle=engine.generatePuzzle("test-seed",mode,level);val rules=Engine.phaseRules(mode,level)
            if(mode==Mode.MAGAZINE) { assertEquals(Engine.MAGAZINE_ROWS,puzzle.rows);assertEquals(Engine.MAGAZINE_COLS,puzzle.cols);assertTrue(puzzle.words.all { it.themeId in puzzle.themeIds }) }
            else { assertEquals(rules.count,puzzle.words.size);assertEquals(5,puzzle.words.map { it.themeId }.distinct().size) }
            val solution=mutableMapOf<String,Char>()
            for(word in puzzle.words) {
                assertTrue(word.answer.length<=rules.maxLength)
                if(level<=20) { assertEquals(1,word.difficulty);if(mode!=Mode.MAGAZINE) assertTrue(word.themeId in Engine.BEGINNER_THEME_IDS) }
                Engine.wordCells(word).forEachIndexed { index,cell -> assertTrue(cell.row in 0 until puzzle.rows);assertTrue(cell.col in 0 until puzzle.cols);assertTrue(solution[cell.key]==null||solution[cell.key]==word.answer[index]);solution[cell.key]=word.answer[index] }
            }
            if(mode==Mode.CLASSIC) { assertTrue(puzzle.words.any { it.direction=="across" });assertTrue(puzzle.words.any { it.direction=="down" });assertTrue(puzzle.rows<=28&&puzzle.cols<=28) }
            if(mode==Mode.MAGAZINE) {
                for(word in puzzle.words) { val clue=Engine.clueCell(word);assertTrue(clue.row in 0 until puzzle.rows&&clue.col in 0 until puzzle.cols);assertFalse(solution.containsKey(clue.key)) }
                assertTrue("packed frame $level",solution.size>=puzzle.rows*puzzle.cols*.6)
            }
        }
        assertEquals(12,Engine.phaseRules(Mode.CLASSIC,1).count);assertEquals(30,Engine.phaseRules(Mode.CLASSIC,100).count)
        assertEquals(5,Engine.phaseRules(Mode.CASCADE,1).count);assertEquals(14,Engine.phaseRules(Mode.CASCADE,100).count)
    }
    private fun handmade(mode: Mode): Session {
        val words=if(mode==Mode.CASCADE) listOf(
            PuzzleWord("a","CASA","Moradia",1,"t","Tema",0,0,"across",1),
            PuzzleWord("b","ASA","Parte da ave",1,"t","Tema",1,0,"across",2),
            PuzzleWord("c","ARCO","Forma curva",1,"t","Tema",2,0,"across",3))
        else listOf(PuzzleWord("a","CASA","Moradia",1,"t","Tema",0,0,"across",1),PuzzleWord("b","COPO","Recipiente",1,"t","Tema",0,0,"down",1))
        return Session(Puzzle("handmade",mode,1,listOf("t"),words,4,4,"Primeiras conexões"))
    }
    /** Persisted saves need the five theme ids the codec requires. */
    private fun saved(mode: Mode)=handmade(mode).let { it.copy(puzzle=it.puzzle.copy(themeIds=listOf("t","t2","t3","t4","t5"))) }
    @Test fun partialCascadeHintImmediatelyRevealsEveryLowerOccurrence() {
        val before=handmade(Mode.CASCADE);val hinted=Engine.useHint(before,"a")
        assertEquals(1,hinted.hints);assertEquals("C",hinted.values["0:0"]);assertEquals("C",hinted.values["2:2"]);assertEquals("C",hinted.revealed["2:2"])
        assertTrue(hinted.solved.isEmpty());assertTrue(before.values.isEmpty())
        val next=Engine.useHint(hinted,"a")
        assertEquals("A",next.values["1:0"]);assertEquals("A",next.values["1:2"]);assertEquals("A",next.values["2:0"])
    }
    @Test fun threeHintsAreFiniteAndSolvedCascadeLettersChain() {
        var session=handmade(Mode.CASCADE)
        repeat(3) { session=Engine.useHint(session,"a") }
        assertEquals(3,session.hints);assertEquals(session,Engine.useHint(session,"c"));assertTrue("b" in session.solved)
        val answered=Engine.submitWord(handmade(Mode.CASCADE),"a","cásá").session
        assertTrue("a" in answered.solved);assertTrue("b" in answered.solved);assertEquals("A",answered.revealed["2:0"]);assertEquals("C",answered.revealed["2:2"])
    }
    @Test fun classicHintRevealsSharedCellAndScoringPenalizesHelpAndErrors() {
        val hinted=Engine.useHint(handmade(Mode.CLASSIC),"a")
        assertEquals("C",hinted.values[Engine.wordCells(hinted.puzzle.words[1])[0].key])
        var session=Engine.submitWord(handmade(Mode.CLASSIC),"a","ERRADA").session
        assertEquals(1,session.mistakes);session=Engine.useHint(session,"a")
        for(word in session.puzzle.words) session=Engine.submitWord(session,word.id,word.answer).session
        assertTrue(session.completed);assertEquals(2,Engine.getStars(session));assertEquals(320,Engine.getScore(session))
    }
    @Test fun webSaveRoundTripPreservesBothModesAndRejectsCorruption() {
        val raw=fixture().getJSONObject("save");val save=SaveCodec.decode(raw.toString())
        assertEquals(SaveCodec.canonical(raw),SaveCodec.encode(save));assertFalse(save.settings.sound);assertEquals(setOf("classic:1","magazine:1","cascade:1"),save.sessions.keys)
        assertEquals(save,SaveCodec.decode(SaveCodec.encode(save)))
        val corrupted=JSONObject(raw.toString());corrupted.getJSONObject("sessions").getJSONObject("classic:1").put("solved",org.json.JSONArray().put("unknown"))
        assertThrows(IllegalArgumentException::class.java) { SaveCodec.decode(corrupted.toString()) }
        assertThrows(IllegalArgumentException::class.java) { SaveCodec.decode(JSONObject(raw.toString()).put("version",2).toString()) }
    }
    @Test fun profilesPersistIndependentlyAndLegacyCampaignBelongsToDaniel() {
        val save=SaveCodec.decode(fixture().getJSONObject("save").toString());assertTrue(repository.save("daniel",save));assertTrue(repository.load("larissa").sessions.isEmpty())
        assertEquals(save,GameRepository(app).load("daniel"))
        val prefs=app.getSharedPreferences("neon-lexico",Context.MODE_PRIVATE);prefs.edit().clear().putString("neon-lexico:v1",SaveCodec.encode(save)).commit()
        val migrated=GameRepository(app);assertEquals(save,migrated.load("daniel"));assertTrue(migrated.load("larissa").sessions.isEmpty());assertTrue(prefs.contains("neon-lexico:v1"))
        assertThrows(IllegalArgumentException::class.java) { migrated.load("unknown") }
    }
    @Test fun bestResultsAndUnlocksStayIndependentAndHintKeepsCurrentWord() {
        var session=Session(engine.generatePuzzle("test-seed",Mode.CASCADE,1));for(word in session.puzzle.words) session=Engine.submitWord(session,word.id,word.answer).session
        val save=Engine.recordCompletion(SaveData(seed="test-seed"),session.copy(elapsed=50));val replay=Engine.recordCompletion(save,session.copy(hints=3,elapsed=20))
        assertEquals(3,replay.results.getValue(Mode.CASCADE).getValue("1").stars);assertEquals(20,replay.results.getValue(Mode.CASCADE).getValue("1").seconds);assertEquals(2,Engine.unlockedLevel(replay,Mode.CASCADE));assertEquals(1,Engine.unlockedLevel(replay,Mode.CLASSIC))
        repository.save("daniel",SaveCodec.decode(fixture().getJSONObject("save").toString()))
        val model=GameViewModel(app);model.selectProfile("daniel");model.prepare(Mode.CLASSIC,1)
        val word=model.state.session!!.puzzle.words.last { it.id !in model.state.session!!.solved };model.selectWord(word.id);model.hint();assertEquals(word.id,model.state.activeWordId)
    }
    @Test fun unfinishedDraftSurvivesBackgroundReloadAndProfileSwitch() {
        repository.save("daniel",SaveCodec.decode(fixture().getJSONObject("save").toString()))
        val model=GameViewModel(app);model.selectProfile("daniel");model.prepare(Mode.CLASSIC,1)
        val session=model.state.session!!;val word=session.puzzle.words.first { it.id !in session.solved };model.selectWord(word.id)
        model.updateDraft("z".repeat(word.answer.length))
        val draft=model.state.session!!
        Engine.wordCells(word).forEachIndexed { index,cell -> assertEquals(session.revealed[cell.key]?:"Z",draft.values[cell.key]) }
        assertEquals(session.solved,draft.solved);assertEquals(word.id,model.state.activeWordId)
        model.onBackground()
        val reopened=GameViewModel(app);reopened.selectProfile("daniel");reopened.prepare(Mode.CLASSIC,1)
        assertEquals(draft,reopened.state.session)
        reopened.switchProfile();reopened.selectProfile("larissa");assertTrue(reopened.state.save.sessions.isEmpty())
        reopened.switchProfile();reopened.selectProfile("daniel");reopened.prepare(Mode.CLASSIC,1);assertEquals(draft,reopened.state.session)
        reopened.selectWord(word.id);reopened.updateDraft("")
        Engine.wordCells(word).forEach { cell -> assertEquals(session.revealed[cell.key],reopened.state.session!!.values[cell.key]) }
    }
    @Test fun magazineOnlyChecksACompleteGridAndNeverRevealsPartialCorrectness() {
        var session=Session(engine.generatePuzzle("native-magazine-check",Mode.MAGAZINE,1))
        val first=session.puzzle.words.first()
        session=Engine.submitWord(session,first.id,first.answer).session
        assertTrue(session.solved.isEmpty());assertTrue(session.revealed.isEmpty());assertEquals(0,session.mistakes)
        assertEquals("incomplete",Engine.checkGrid(session).status)
        session=Engine.useHint(session,first.id);assertTrue(session.solved.isEmpty());assertEquals(1,session.hints)
        for(word in session.puzzle.words) session=Engine.submitWord(session,word.id,word.answer).session
        assertTrue(Engine.gridFill(session).full);assertFalse(session.completed)
        val editable=session.values.keys.first { it !in session.revealed };val correct=session.values.getValue(editable)
        session=session.copy(values=session.values+(editable to if(correct=="Z") "X" else "Z"))
        val retry=Engine.checkGrid(session);assertEquals("retry",retry.status);assertEquals(session.values,retry.session.values);assertEquals(session.revealed,retry.session.revealed);assertTrue(retry.session.solved.isEmpty())
        val complete=Engine.checkGrid(retry.session.copy(values=retry.session.values+(editable to correct))).session
        assertTrue(complete.completed);assertEquals(session.puzzle.words.size,complete.solved.size)
        val save=Engine.recordCompletion(SaveData(),complete);assertEquals(save,SaveCodec.decode(SaveCodec.encode(save)));assertEquals(2,Engine.unlockedLevel(save,Mode.MAGAZINE));assertEquals(1,Engine.unlockedLevel(save,Mode.CLASSIC))
    }
    @Test fun legacyTwoModeCampaignsMigrateWithoutLosingProgress() {
        val source=fixture().getJSONObject("save");source.getJSONObject("results").remove("magazine");source.getJSONObject("sessions").remove("magazine:1")
        val migrated=SaveCodec.decode(source.toString());assertTrue(migrated.results.getValue(Mode.MAGAZINE).isEmpty());assertEquals(setOf("classic:1","cascade:1"),migrated.sessions.keys)
        val encoded=JSONObject(SaveCodec.encode(migrated));encoded.getJSONObject("results").remove("magazine")
        assertEquals(SaveCodec.canonical(source),SaveCodec.canonical(encoded))
    }
    @Test fun choosingTheNextMagazineWordPreservesLettersEnteredAfterAnEmptySquare() {
        val puzzle=engine.generatePuzzle("native-middle-draft",Mode.MAGAZINE,1)
        repository.save("daniel",SaveData(seed="native-middle-draft",sessions=mapOf("magazine:1" to Session(puzzle))))
        val model=GameViewModel(app);model.selectProfile("daniel");model.prepare(Mode.MAGAZINE,1)
        val word=puzzle.words.first { it.answer.length>=4 };val cells=Engine.wordCells(word)
        model.selectWord(word.id,cells[2].key);model.typeLetter('z')
        assertEquals("Z",model.state.session!!.values[cells[2].key]);assertNull(model.state.session!!.values[cells[0].key]);assertEquals(3,model.state.cursor)
        val before=model.state.session!!.values;model.nextWord()
        assertEquals(before,model.state.session!!.values)
        model.onBackground();assertEquals(before,GameRepository(app).load("daniel").sessions.getValue("magazine:1").values)
    }
    @Test fun cascadeTypingStartsOnTheNextLineAndSkipsUnlockedLetters() {
        val session=saved(Mode.CASCADE)
        repository.save("daniel",SaveData(seed="native-cascade-typing",sessions=mapOf("cascade:1" to session)))
        val model=GameViewModel(app);model.selectProfile("daniel");model.prepare(Mode.CASCADE,1)
        assertEquals("a",model.state.activeWordId)
        "CASA".forEach(model::typeLetter);assertEquals(3,model.state.cursor);model.confirmWord()
        // CASA unlocks every C, A and S below: ASA solves itself and ARCO keeps only R and O open.
        val solved=model.state.session!!
        assertEquals(listOf("a","b"),solved.solved);assertEquals("c",model.state.activeWordId);assertEquals(1,model.state.cursor)
        model.typeLetter('R');assertEquals(3,model.state.cursor);model.typeLetter('O')
        assertEquals("ARCO",Engine.wordCells(solved.puzzle.words[2]).joinToString("") { model.state.session!!.values[it.key].orEmpty() })
        model.confirmWord();assertTrue(model.state.session!!.completed);assertEquals(0,model.state.session!!.mistakes)
    }
    @Test fun typingNeverOverwritesALetterUnlockedByAHint() {
        repository.save("daniel",SaveData(seed="native-hint-typing",sessions=mapOf("classic:1" to saved(Mode.CLASSIC))))
        val reopened=GameViewModel(app);reopened.selectProfile("daniel");reopened.prepare(Mode.CLASSIC,1);reopened.selectWord("a")
        reopened.hint();assertEquals("C",reopened.state.session!!.revealed["0:0"])
        reopened.selectWord("a","0:0");reopened.typeLetter('Z')
        assertEquals("C",reopened.state.session!!.values["0:0"]);assertEquals("Z",reopened.state.session!!.values["0:1"])
        reopened.eraseGridCell();assertNull(reopened.state.session!!.values["0:1"]);assertEquals("C",reopened.state.session!!.values["0:0"])
        reopened.selectWord("a","0:0");reopened.toggleDirection();assertEquals("b",reopened.state.activeWordId)
    }
    @Test fun confirmingAnIncompleteAnswerAsksForTheMissingLettersWithoutAMistake() {
        repository.save("daniel",SaveData(seed="native-incomplete",sessions=mapOf("classic:1" to saved(Mode.CLASSIC))))
        val model=GameViewModel(app);model.selectProfile("daniel");model.prepare(Mode.CLASSIC,1);model.selectWord("a")
        model.typeLetter('C');model.confirmWord()
        assertEquals(0,model.state.session!!.mistakes);assertNotNull(model.state.error)
    }
}
