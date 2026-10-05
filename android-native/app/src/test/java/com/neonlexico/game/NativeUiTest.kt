package com.neonlexico.game

import android.graphics.Bitmap
import android.graphics.Canvas
import android.os.Looper
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.lifecycle.ViewModelProvider
import org.junit.Assert.*
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import org.robolectric.annotation.LooperMode
import java.io.File
import java.time.Duration

/** Interacts with the APK's real Compose screens and Android input field. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35], qualifiers = "w393dp-h873dp-xhdpi")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@LooperMode(LooperMode.Mode.PAUSED)
@OptIn(ExperimentalTestApi::class)
class NativeUiTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()
    private lateinit var model: GameViewModel

    @Before fun configure() {
        compose.runOnIdle {
            model = ViewModelProvider(compose.activity)[GameViewModel::class.java]
            model.switchProfile()
        }
    }

    @Test fun pickerSeparatesDanielAndLarissaAndAllowsPairing() {
        compose.onNodeWithContentDescription("Entrar como Daniel").assertExists()
        compose.onNodeWithContentDescription("Entrar como Larissa").assertExists()
        screenshot("android-profiles")
        compose.onNodeWithText("CONECTAR SITE E APP").performScrollTo().performClick()
        compose.onNodeWithText("Seu sinal em todo lugar.").assertExists()
        compose.onNodeWithText("Código do outro aparelho").assertExists()
        compose.onNodeWithText("FECHAR").performClick()
        compose.onNodeWithContentDescription("Entrar como Daniel").performClick()
        compose.runOnIdle { model.toggleSound(); assertFalse(model.state.save.settings.sound); model.switchProfile() }
        compose.onNodeWithContentDescription("Entrar como Larissa").performClick()
        compose.runOnIdle { assertTrue(model.state.save.settings.sound); assertEquals("larissa", model.state.activeProfileId); model.switchProfile() }
        compose.onNodeWithContentDescription("Entrar como Daniel").performClick()
        compose.runOnIdle { assertFalse(model.state.save.settings.sound) }
        screenshot("android-home")
    }

    @Test fun classicAndCascadeBoardsAcceptNativeInputAndResume() {
        compose.onNodeWithContentDescription("Entrar como Daniel").performClick()
        for (mode in listOf(Mode.CLASSIC,Mode.CASCADE)) {
            compose.runOnIdle { model.prepare(mode, 1); assertEquals(Screen.SETUP, model.state.screen); assertEquals(5, model.state.selectedThemes.size) }
            if (mode == Mode.CLASSIC) screenshot("android-setup")
            compose.onNodeWithText("ENTRAR NO CIRCUITO →").performScrollTo().performClick()
            awaitPlay()
            compose.runOnIdle { assertEquals(Screen.PLAY, model.state.screen); assertNotNull(model.state.session) }
            screenshot(if (mode == Mode.CLASSIC) "android-classic" else "android-cascade")
            val first = model.state.session!!.puzzle.words.first()
            compose.runOnIdle { model.selectWord(first.id) }
            val partial = first.answer.take(2)
            compose.onNodeWithContentDescription("Resposta para pista ${first.number}").assertExists().performTextReplacement(partial)
            compose.runOnIdle {
                model.onBackground()
                val reloaded = GameViewModel(model.getApplication()).apply { selectProfile("daniel"); prepare(mode, 1) }
                assertEquals(partial, Engine.wordCells(first).take(2).joinToString("") { reloaded.state.session!!.values[it.key].orEmpty() })
                model.onForeground()
                model.switchProfile()
            }
            compose.onNodeWithContentDescription("Entrar como Larissa").performClick()
            compose.runOnIdle { assertTrue(model.state.save.sessions.isEmpty()); model.switchProfile() }
            compose.onNodeWithContentDescription("Entrar como Daniel").performClick()
            compose.runOnIdle { model.prepare(mode, 1); model.selectWord(first.id) }
            compose.onNodeWithContentDescription("Resposta para pista ${first.number}").assertTextContains(partial,substring=true)
            compose.onNodeWithContentDescription("Resposta para pista ${first.number}").assertExists().performTextReplacement(first.answer)
            compose.onNodeWithContentDescription("Resposta para pista ${first.number}").assertTextContains(first.answer)
            compose.onNodeWithText("CONECTAR →").assertIsDisplayed().performClick()
            compose.runOnIdle { assertTrue("answer=${first.answer}; active=${model.state.activeWordId}; solved=${model.state.session!!.solved}; mistakes=${model.state.session!!.mistakes}", first.id in model.state.session!!.solved) }
            val before = model.state.session!!
            compose.runOnIdle { model.navigate(Screen.MAP); model.prepare(mode, 1); assertEquals(before.solved, model.state.session!!.solved) }
            compose.runOnIdle {
                for (word in model.state.session!!.puzzle.words) {
                    model.selectWord(word.id); model.submitAnswer(word.answer)
                }
                assertTrue(model.state.session!!.completed)
                assertEquals(3, model.state.save.results.getValue(mode).getValue("1").stars)
            }
            compose.onNodeWithText("Conexão estabelecida.").assertExists()
            screenshot(if (mode == Mode.CLASSIC) "android-classic-victory" else "android-cascade-victory")
            compose.onNodeWithText("PRÓXIMA FREQUÊNCIA →").performScrollTo().performClick()
            compose.runOnIdle { assertEquals(Screen.SETUP, model.state.screen); assertEquals(2, model.state.level) }
            compose.runOnIdle { model.prepare(mode, 1) }
            compose.onNodeWithText("JOGAR NOVAMENTE ↻").performScrollTo().performClick()
            compose.runOnIdle { assertEquals(Screen.SETUP, model.state.screen); assertEquals(1, model.state.level) }
        }
        compose.runOnIdle { model.navigate(Screen.STATS) }
        screenshot("android-stats")
    }

    @Test fun bundledThemesAndNativeSettingsCanBeBrowsed() {
        compose.onNodeWithContentDescription("Entrar como Daniel").performClick()
        compose.onNodeWithText("Universos", useUnmergedTree = true).performClick()
        compose.runOnIdle { assertEquals(Screen.THEMES, model.state.screen); assertEquals(44, model.state.themes.size) }
        screenshot("android-universes")
        compose.onNodeWithContentDescription("Abrir ajustes").performClick()
        compose.onNodeWithContentDescription("Sons do terminal").performClick()
        compose.runOnIdle { assertFalse(model.state.save.settings.sound) }
        screenshot("android-settings")
    }

    @Test fun tappingBoardFocusesTheAnswerAndKeepsTheSelectedClueBelowTheGrid() {
        compose.onNodeWithContentDescription("Entrar como Daniel").performClick()
        compose.runOnIdle { model.prepare(Mode.CLASSIC, 1) }
        compose.onNodeWithText("ENTRAR NO CIRCUITO →").performScrollTo().performClick()
        awaitPlay()
        val cell = model.state.session!!.puzzle.words.flatMap(Engine::wordCells).minWith(compareBy<Cell> { it.row }.thenBy { it.col })
        compose.onAllNodes(hasContentDescription("casa ${cell.row},${cell.col},", substring = true)).onFirst().performScrollTo().performClick()
        compose.waitForIdle()
        val selected = model.state.session!!.puzzle.words.first { it.id == model.state.activeWordId }
        compose.onNodeWithContentDescription("Resposta para pista ${selected.number}").assertIsFocused().assertExists()
        compose.onAllNodesWithText(selected.clue).onLast().assertIsDisplayed()
        compose.runOnIdle { assertEquals(0, model.state.session!!.hints) }
        screenshot("android-tap-to-type")
    }

    @Test fun everyModeTypesIntoTheTappedCellWithoutASeparateVisibleAnswerBox() {
        compose.onNodeWithContentDescription("Entrar como Daniel").performClick()
        for(mode in Mode.entries) {
            compose.runOnIdle { model.prepare(mode,1) }
            compose.onNodeWithText("ENTRAR NO CIRCUITO →").performScrollTo().performClick();awaitPlay()
            val cell=model.state.session!!.puzzle.words.flatMap(Engine::wordCells).minWith(compareBy<Cell> { it.row }.thenBy { it.col })
            compose.onAllNodes(hasContentDescription("casa ${cell.row},${cell.col},",substring=true)).onFirst().performScrollTo().performClick()
            val selected=model.state.session!!.puzzle.words.first { it.id==model.state.activeWordId }
            val input=compose.onNodeWithContentDescription("Resposta para pista ${selected.number}")
            input.assertIsFocused().performTextInput("ZQ")
            val cells=Engine.wordCells(selected);val index=cells.indexOfFirst { it.key==cell.key }
            compose.runOnIdle {
                assertEquals("Z",model.state.session!!.values[cell.key])
                assertEquals("Q",model.state.session!!.values[cells[index+1].key])
                assertEquals(index+2,model.state.cursor)
            }
            input.performKeyInput { pressKey(Key.Backspace) }
            compose.runOnIdle {
                assertEquals("Z",model.state.session!!.values[cell.key])
                assertNull(model.state.session!!.values[cells[index+1].key])
            }
            compose.onNodeWithText("Sua resposta").assertDoesNotExist()
            if(mode==Mode.MAGAZINE) {
                compose.runOnIdle { assertTrue(model.state.session!!.solved.isEmpty());assertEquals(0,model.state.session!!.mistakes) }
                compose.onNodeWithText("CONFERIR GRADE COMPLETA").assertIsNotEnabled()
                screenshot("android-magazine-direct-grid")
            }
            compose.runOnIdle { model.onBackground();model.navigate(Screen.HOME) }
        }
    }

    @Test fun magazineChecksOnlyTheWholeGridAndLeavesAllLettersEditableAfterFailure() {
        val repository=GameRepository(compose.activity.application)
        val puzzle=Engine(repository.catalog()).generatePuzzle("magazine-ui-check",Mode.MAGAZINE,1)
        val values=mutableMapOf<String,String>();puzzle.words.forEach { word -> Engine.wordCells(word).forEachIndexed { index,cell -> values[cell.key]=word.answer[index].toString() } }
        val first=puzzle.words.first();val key=Engine.wordCells(first).first().key
        values[key]=if(values[key]=="Z") "X" else "Z"
        val session=Session(puzzle,values=values)
        compose.runOnIdle { repository.save("daniel",SaveData(seed="magazine-ui-check",sessions=mapOf("magazine:1" to session))) }
        compose.onNodeWithContentDescription("Entrar como Daniel").performClick()
        compose.runOnIdle { model.prepare(Mode.MAGAZINE,1) }
        compose.onNodeWithText("CONFERIR GRADE COMPLETA").assertIsEnabled().performClick()
        compose.onNodeWithText("A grade ainda não está correta. Revise suas respostas e confira novamente.").assertIsDisplayed()
        compose.runOnIdle { assertEquals(session.values,model.state.session!!.values);assertTrue(model.state.session!!.solved.isEmpty());assertFalse(model.state.session!!.completed) }
        compose.onNodeWithContentDescription("Resposta para pista ${first.number}").performTextReplacement(first.answer)
        compose.onNodeWithText("CONFERIR GRADE COMPLETA").performClick()
        compose.runOnIdle { assertTrue(model.state.session!!.completed);assertEquals(2,Engine.unlockedLevel(model.state.save,Mode.MAGAZINE));assertEquals(1,Engine.unlockedLevel(model.state.save,Mode.CLASSIC)) }
        screenshot("android-magazine-victory")
    }

    @Test fun onlyThreeHintsCanBeUsedAndConnectedLettersAreVisible() {
        compose.onNodeWithContentDescription("Entrar como Daniel").performClick()
        compose.runOnIdle { model.prepare(Mode.CASCADE, 1) }
        compose.onNodeWithText("ENTRAR NO CIRCUITO →").performScrollTo().performClick()
        awaitPlay()
        repeat(3) { index ->
            compose.onNodeWithContentDescription("Revelar uma letra, ${3 - index} dicas restantes").assertIsDisplayed().performClick()
            compose.runOnIdle { assertEquals(index + 1, model.state.session!!.hints) }
        }
        compose.onNodeWithContentDescription("Revelar uma letra, 0 dicas restantes").assertIsNotEnabled()
        val revealed=model.state.session!!.revealed.entries.first()
        val position=revealed.key.split(":")
        compose.onAllNodes(hasContentDescription("casa ${position[0]},${position[1]}, ${revealed.value}",substring=true)).onFirst().assertIsDisplayed()
        compose.runOnIdle {
            val before = model.state.session!!
            assertTrue(before.revealed.isNotEmpty())
            model.hint()
            assertEquals(before.values, model.state.session!!.values)
            assertEquals(3, model.state.session!!.hints)
        }
        screenshot("android-hints")
    }

    private fun awaitPlay() {
        // Dispatchers.Default posts generation results to Android's main queue.
        // Robolectric's PAUSED looper needs this explicit queue drain.
        compose.waitUntil(timeoutMillis = 30_000) {
            Shadows.shadowOf(Looper.getMainLooper()).idleFor(Duration.ofMillis(100))
            model.state.screen == Screen.PLAY || model.state.error != null
        }
        compose.runOnIdle { assertEquals("generation error=${model.state.error}", Screen.PLAY, model.state.screen) }
    }

    private fun screenshot(name: String) {
        compose.waitForIdle()
        val directory = File("build/reports/native-screenshots").apply { mkdirs() }
        compose.runOnIdle {
            val view = compose.activity.window.decorView
            val bitmap = Bitmap.createBitmap(view.width, view.height, Bitmap.Config.ARGB_8888)
            view.draw(Canvas(bitmap))
            File(directory, "$name.png").outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
            bitmap.recycle()
        }
    }
}
