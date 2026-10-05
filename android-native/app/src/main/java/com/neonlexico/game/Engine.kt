package com.neonlexico.game

import java.text.Normalizer
import java.util.UUID
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

/** The unsigned 32-bit operations and insertion order match the browser generator. */
class Engine(val themes: List<Theme>) {
    private class Random(seed: String) {
        var state = 2166136261L.toInt()
        init { for (char in seed) state = (state xor char.code) * 16777619 }
        fun next(): Double {
            state += 0x6D2B79F5
            var x = state
            x = (x xor (x ushr 15)) * (x or 1)
            x = x xor ((x + ((x xor (x ushr 7)) * (x or 61))))
            return ((x xor (x ushr 14)).toLong() and 0xffffffffL) / 4294967296.0
        }
    }
    private fun <T> shuffled(items: List<T>, random: Random): List<T> {
        val result = items.toMutableList()
        for (i in result.lastIndex downTo 1) { val j = (random.next() * (i + 1)).toInt(); val old = result[i]; result[i] = result[j]; result[j] = old }
        return result
    }
    fun drawThemes(seed: String, mode: Mode, level: Int): List<Theme> { require(level in 1..100); val pool=if(level<=20) themes.filter { it.id in BEGINNER_THEME_IDS } else themes;return shuffled(pool, Random("$seed:${mode.wire}:$level:themes")).take(5) }
    private data class Candidate(val entry: Entry, val theme: Theme)
    private data class Placement(val candidate: Candidate, val row: Int, val col: Int, val direction: String, val score: Double)
    private data class Occupied(val letter: Char, var across: Boolean = false, var down: Boolean = false) { fun used(direction: String) = if (direction == "across") across else down }
    private fun toWord(c: Candidate, row: Int, col: Int, direction: String, number: Int = 0) = PuzzleWord(c.entry.id, c.entry.answer, c.entry.clue, c.entry.difficulty, c.theme.id, c.theme.name, row, col, direction, number)

    private fun crossword(pool: List<Candidate>, selected: List<Theme>, count: Int, level: Int, random: Random): List<PuzzleWord>? {
        val board = linkedMapOf<String, Occupied>(); val words = mutableListOf<PuzzleWord>(); val used = mutableSetOf<String>(); val covered = mutableSetOf<String>()
        var minRow = 0; var maxRow = 0; var minCol = 0; var maxCol = 0
        val target = phaseRules(Mode.CLASSIC,level).difficulty
        fun add(c: Candidate, row: Int, col: Int, direction: String) {
            val word = toWord(c, row, col, direction); words += word; used += word.answer; covered += c.theme.id
            wordCells(word).forEachIndexed { index, cell ->
                val occupied = board.getOrPut(cell.key) { Occupied(word.answer[index]) }
                if (direction == "across") occupied.across = true else occupied.down = true
                minRow = min(minRow, cell.row); maxRow = max(maxRow, cell.row); minCol = min(minCol, cell.col); maxCol = max(maxCol, cell.col)
            }
        }
        val starts = pool.filter { it.entry.answer.length in 5..12 }.ifEmpty { pool }
        if (starts.isEmpty()) return null
        add(starts[(random.next() * starts.size).toInt()], 0, 0, if (random.next() < .5) "across" else "down")
        fun placement(candidate: Candidate): Placement? {
            val answer = candidate.entry.answer; var best: Placement? = null; val seen = mutableSetOf<String>()
            for ((key, existing) in board) {
                val parts = key.split(':'); val crossRow = parts[0].toInt(); val crossCol = parts[1].toInt()
                for (index in answer.indices) {
                    if (answer[index] != existing.letter) continue
                    for (direction in listOf("across", "down")) {
                        if (existing.used(direction)) continue
                        val dr = if (direction == "down") 1 else 0; val dc = if (direction == "across") 1 else 0
                        val row = crossRow - dr * index; val col = crossCol - dc * index
                        if (!seen.add("$row:$col:$direction")) continue
                        val endRow = row + dr * (answer.length - 1); val endCol = col + dc * (answer.length - 1)
                        val height = max(maxRow, endRow) - min(minRow, row) + 1; val width = max(maxCol, endCol) - min(minCol, col) + 1
                        if (height > 28 || width > 28 || board.containsKey("${row-dr}:${col-dc}") || board.containsKey("${endRow+dr}:${endCol+dc}")) continue
                        var crossings = 0; var valid = true
                        for (i in answer.indices) {
                            val r = row + dr * i; val c = col + dc * i; val occupied = board["$r:$c"]
                            if (occupied != null) { if (occupied.letter != answer[i] || occupied.used(direction)) { valid = false; break }; crossings++ }
                            else if (board.containsKey("${r-dc}:${c-dr}") || board.containsKey("${r+dc}:${c+dr}")) { valid = false; break }
                        }
                        if (!valid || crossings == 0) continue
                        val score = crossings * 34 - height * width * .18 - abs(height-width) * .6 - abs(candidate.entry.difficulty-target) * 6 + random.next() * 5
                        if (best == null || score > best.score) best = Placement(candidate, row, col, direction, score)
                    }
                }
            }
            return best
        }
        while (words.size < count) {
            val missing = selected.filter { it.id !in covered }; var best: Placement? = null
            for (candidate in pool) {
                if (candidate.entry.answer in used || (missing.isNotEmpty() && candidate.theme.id in covered)) continue
                val p = placement(candidate); if (p != null && (best == null || p.score > best.score)) best = p
            }
            if (best == null && count-words.size > missing.size) for (candidate in pool) {
                if (candidate.entry.answer in used) continue
                val p = placement(candidate); if (p != null && (best == null || p.score > best.score)) best = p
            }
            val found = best ?: return null; add(found.candidate, found.row, found.col, found.direction)
        }
        if (covered.size != 5) return null
        val normalized = words.map { it.copy(row=it.row-minRow,col=it.col-minCol) }
        val startsSorted = normalized.map { Cell(it.row,it.col) }.distinct().sortedWith(compareBy<Cell> { it.row }.thenBy { it.col })
        return normalized.map { it.copy(number=startsSorted.indexOf(Cell(it.row,it.col))+1) }.sortedWith(compareBy<PuzzleWord> { it.number }.thenBy { it.direction })
    }
    private fun cascade(pool: List<Candidate>, selected: List<Theme>, count: Int, level: Int, random: Random): List<PuzzleWord>? {
        val words = mutableListOf<PuzzleWord>(); val used = mutableSetOf<String>(); val covered = mutableSetOf<String>(); val target = phaseRules(Mode.CASCADE,level).difficulty
        while (words.size < count) {
            val previous = words.lastOrNull()?.answer; val missing = selected.filter { it.id !in covered }
            val earlier = words.dropLast(1).flatMap { it.answer.toList() }.toSet()
            fun priority(c: Candidate): Int = (if (previous != null && c.entry.answer.any { it in previous && it !in earlier }) 5 else 0) - abs(c.entry.difficulty-target)*3
            val candidates = pool.filter { it.entry.answer !in used && (missing.isEmpty() || it.theme.id !in covered) && (previous == null || it.entry.answer.any { letter -> letter in previous }) }.sortedByDescending(::priority)
            if (candidates.isEmpty()) return null
            val top = candidates.filter { it.entry.difficulty == candidates[0].entry.difficulty }.take(4)
            val candidate = top[(random.next()*top.size).toInt()]
            words += toWord(candidate,words.size,0,"across",words.size+1); used += candidate.entry.answer; covered += candidate.theme.id
        }
        return words.takeIf { covered.size == 5 }
    }
    fun generatePuzzle(seed: String, mode: Mode, level: Int, themeIds: List<String>? = null): Puzzle {
        require(level in 1..100)
        val chosen = themeIds?.map { id -> themes.first { it.id == id } } ?: drawThemes(seed,mode,level)
        require(chosen.size == 5 && chosen.map { it.id }.distinct().size == 5) { "Escolha cinco temas diferentes." }
        val rules=phaseRules(mode,level);val count = rules.count; var words: List<PuzzleWord>? = null
        for (attempt in 0 until 36) {
            val random = Random("$seed:${mode.wire}:$level:${chosen.joinToString(",") { it.id }}:$attempt")
            val pool = shuffled(chosen.flatMap { t -> t.entries.map { e -> Candidate(e.copy(id="${t.id}:${e.id}",answer=normalizeAnswer(e.answer)),t) } }.filter { it.entry.answer.length in 3..rules.maxLength&&(level>20||it.entry.difficulty==1) },random)
            words = if (mode != Mode.CASCADE) crossword(pool,chosen,count,level,random) else cascade(pool,chosen,count,level,random)
            if (words != null) break
        }
        val generated = words ?: error("Não foi possível montar esta grade. Sorteie novos temas.")
        val found = if (mode == Mode.MAGAZINE) generated.map { it.copy(row=it.row+1,col=it.col+1) } else generated
        val cells = found.flatMap(::wordCells)
        return Puzzle("${mode.wire}:$level:$seed:${chosen.joinToString(".") { it.id }}",mode,level,chosen.map { it.id },found,cells.maxOf { it.row }+1,cells.maxOf { it.col }+1,if(level<=10) "Primeiras conexões" else if(level<=20) "Iniciante" else if(level<=40) "Aprendiz" else if(level<=60) "Intermediário" else if(level<=80) "Avançado" else "Especialista")
    }
    companion object {
        const val MAX_HINTS=3
        val BEGINNER_THEME_IDS=setOf("natureza","gastronomia","anatomia","musica","artes","geografia","astronomia","superpoderes","emocoes","literatura","cinema","portugues")
        data class PhaseRules(val difficulty: Int,val maxLength: Int,val count: Int)
        fun phaseRules(mode: Mode,level: Int): PhaseRules { require(level in 1..100);return PhaseRules(if(level<=20) 1 else if(level<=60) 2 else 3,if(level<=10) 6 else if(level<=20) 8 else if(level<=40) 10 else if(level<=60) 12 else if(level<=80) 15 else 20,if(mode!=Mode.CASCADE) min(30,12+(level-1)/5) else min(14,5+(level-1)/10)) }
        fun normalizeAnswer(value: String) = Normalizer.normalize(value,Normalizer.Form.NFD).replace(Regex("[\\u0300-\\u036f]"),"").uppercase(java.util.Locale.ROOT).replace(Regex("[^A-Z]"),"")
        fun randomSeed() = UUID.randomUUID().toString()
        fun wordCells(word: PuzzleWord) = word.answer.indices.map { Cell(word.row+if(word.direction=="down") it else 0,word.col+if(word.direction=="across") it else 0) }
        fun clueCell(word: PuzzleWord) = Cell(word.row-if(word.direction=="down") 1 else 0,word.col-if(word.direction=="across") 1 else 0)
        data class GridFill(val filled: Int,val total: Int) { val full: Boolean get()=filled==total }
        fun gridFill(session: Session): GridFill { val keys=session.puzzle.words.flatMap(::wordCells).map { it.key }.toSet();return GridFill(keys.count { !session.values[it].isNullOrEmpty() },keys.size) }
        data class GridResult(val session: Session,val status: String)
        fun checkGrid(session: Session): GridResult {
            if(!gridFill(session).full) return GridResult(session,"incomplete")
            if(session.completed) return GridResult(session,"complete")
            if(!session.puzzle.words.all { word -> wordCells(word).withIndex().all { session.values[it.value.key]==word.answer[it.index].toString() } }) return GridResult(session.copy(mistakes=session.mistakes+1),"retry")
            val revealed=session.revealed.toMutableMap();session.puzzle.words.forEach { word -> wordCells(word).forEachIndexed { index,cell -> revealed[cell.key]=word.answer[index].toString() } }
            return GridResult(session.copy(solved=session.puzzle.words.map { it.id },revealed=revealed,completed=true),"complete")
        }
        fun getStars(session: Session) = if(!session.completed) 0 else if(session.mistakes==0&&session.hints==0) 3 else if(session.mistakes+session.hints<=4) 2 else 1
        fun getScore(session: Session) = max(0,session.puzzle.words.filter { it.id in session.solved }.sumOf { 100+it.answer.length*25 }+(if(session.completed) session.puzzle.level*20 else 0)-session.mistakes*40-session.hints*60-session.elapsed/5)
        fun unlockedLevel(save: SaveData, mode: Mode) = (1..100).firstOrNull { !save.results.getValue(mode).containsKey(it.toString()) } ?: 100
        fun recordCompletion(save: SaveData, session: Session): SaveData {
            val key = "${session.puzzle.mode.wire}:${session.puzzle.level}"
            val sessions = save.sessions + (key to session)
            if(!session.completed) return save.copy(sessions=sessions)
            val mode = session.puzzle.mode; val level = session.puzzle.level.toString(); val previous = save.results.getValue(mode)[level]
            val result = LevelResult(max(previous?.stars?:0,getStars(session)),max(previous?.score?:0,getScore(session)),min(previous?.seconds?:Int.MAX_VALUE,session.elapsed))
            return save.copy(sessions=sessions,results=save.results+(mode to (save.results.getValue(mode)+(level to result))))
        }
        private fun finish(session: Session, values: MutableMap<String,String>, solved: MutableList<String>, revealed: MutableMap<String,String>): Session {
            fun reveal(word: PuzzleWord) { wordCells(word).forEachIndexed { index, cell -> val letter=word.answer[index].toString(); values[cell.key]=letter;revealed[cell.key]=letter } }
            var changed = true
            while(changed) {
                changed=false
                for(word in session.puzzle.words) {
                    if(word.id in solved || !wordCells(word).withIndex().all { values[it.value.key]==word.answer[it.index].toString() }) continue
                    solved += word.id;reveal(word);changed=true
                    if(session.puzzle.mode==Mode.CASCADE) for(lower in session.puzzle.words) {
                        if(lower.row<=word.row||lower.id in solved) continue
                        wordCells(lower).forEachIndexed { index,cell -> if(lower.answer[index] in word.answer) { val letter=lower.answer[index].toString(); values[cell.key]=letter;revealed[cell.key]=letter } }
                    }
                }
            }
            return session.copy(values=values,solved=solved,revealed=revealed,completed=solved.size==session.puzzle.words.size)
        }
        data class AnswerResult(val session: Session, val correct: Boolean, val newlySolved: List<String>)
        fun submitWord(session: Session, id: String, answer: String): AnswerResult {
            val word=session.puzzle.words.firstOrNull { it.id==id } ?: return AnswerResult(session,false,emptyList())
            if(session.completed||id in session.solved) return AnswerResult(session,id in session.solved,emptyList())
            if(session.puzzle.mode==Mode.MAGAZINE) {
                val input=normalizeAnswer(answer).take(word.answer.length);val values=session.values.toMutableMap()
                wordCells(word).forEachIndexed { index,cell -> if(cell.key !in session.revealed) { if(index<input.length) values[cell.key]=input[index].toString() else values.remove(cell.key) } }
                return AnswerResult(session.copy(values=values),false,emptyList())
            }
            if(normalizeAnswer(answer)!=word.answer) return AnswerResult(session.copy(mistakes=session.mistakes+1),false,emptyList())
            val values=session.values.toMutableMap();val revealed=session.revealed.toMutableMap()
            wordCells(word).forEachIndexed { index,cell -> val letter=word.answer[index].toString();values[cell.key]=letter;revealed[cell.key]=letter }
            val next=finish(session,values,session.solved.toMutableList(),revealed)
            return AnswerResult(next,true,next.solved.filter { it !in session.solved })
        }
        fun useHint(session: Session, id: String): Session {
            val word=session.puzzle.words.firstOrNull { it.id==id } ?: return session
            if(session.completed||id in session.solved||session.hints>=MAX_HINTS) return session
            val hidden=wordCells(word).withIndex().firstOrNull { session.revealed[it.value.key]!=word.answer[it.index].toString() } ?: return session
            val letter=word.answer[hidden.index].toString();val values=(session.values+(hidden.value.key to letter)).toMutableMap();val revealed=(session.revealed+(hidden.value.key to letter)).toMutableMap()
            if(session.puzzle.mode==Mode.CASCADE) for(lower in session.puzzle.words) {
                if(lower.row<=word.row) continue
                wordCells(lower).forEachIndexed { index,cell -> if(lower.answer[index].toString()==letter) { values[cell.key]=letter;revealed[cell.key]=letter } }
            }
            return if(session.puzzle.mode==Mode.MAGAZINE) session.copy(hints=session.hints+1,values=values,revealed=revealed) else finish(session.copy(hints=session.hints+1),values,session.solved.toMutableList(),revealed)
        }
    }
}
