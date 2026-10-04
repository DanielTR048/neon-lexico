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
        assertEquals(8,puzzles.length())
        for(i in 0 until puzzles.length()) {
            val expected=puzzles.getJSONObject(i);val actual=engine.generatePuzzle("native-parity",Mode.fromWire(expected.getString("mode")),expected.getInt("level"))
            assertEquals("Browser and Android must generate the same grid",SaveCodec.canonical(expected),SaveCodec.canonical(SaveCodec.puzzleJson(actual)))
        }
    }
    @Test fun allTwoHundredLevelsHaveValidCrossingsAndGradualSizes() {
        for(mode in Mode.entries) for(level in 1..100) {
            val puzzle=engine.generatePuzzle("test-seed",mode,level);val rules=Engine.phaseRules(mode,level)
            assertEquals(rules.count,puzzle.words.size);assertEquals(5,puzzle.words.map { it.themeId }.distinct().size)
            val solution=mutableMapOf<String,Char>()
            for(word in puzzle.words) {
                assertTrue(word.answer.length<=rules.maxLength)
                if(level<=20) { assertEquals(1,word.difficulty);assertTrue(word.themeId in Engine.BEGINNER_THEME_IDS) }
                Engine.wordCells(word).forEachIndexed { index,cell -> assertTrue(cell.row in 0 until puzzle.rows);assertTrue(cell.col in 0 until puzzle.cols);assertTrue(solution[cell.key]==null||solution[cell.key]==word.answer[index]);solution[cell.key]=word.answer[index] }
            }
            if(mode==Mode.CLASSIC) { assertTrue(puzzle.words.any { it.direction=="across" });assertTrue(puzzle.words.any { it.direction=="down" });assertTrue(puzzle.rows<=28&&puzzle.cols<=28) }
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
        assertEquals(SaveCodec.canonical(raw),SaveCodec.encode(save));assertFalse(save.settings.sound);assertEquals(setOf("classic:1","cascade:1"),save.sessions.keys)
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
}
