package com.neonlexico.game

import android.media.AudioManager
import android.media.ToneGenerator
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.calculateZoom
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.relocation.BringIntoViewRequester
import androidx.compose.foundation.relocation.bringIntoViewRequester
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.PointerEventPass
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.sqrt

private val Paper = Color(0xFFFFFDF7)
private val CluePaper = Color(0xFFE9E5DC)
private val ClueActive = Color(0xFFF5D39A)
private val SelectedPaper = Color(0xFFFCEAC3)
private val CursorPaper = Color(0xFFF7C873)
private val PaperLine = Color(0xFF79654D)
private val PaperInk = Color(0xFF302A23)
private val GivenInk = Color(0xFF8A5A1E)
private val Block = Color(0xFFBDB5A6)

/** Full-screen play: the whole grid fits above the clue bar and the in-app keyboard. */
@Composable
fun PlayPage(vm: GameViewModel) {
    val state = vm.state
    val session = state.session
    if (session == null) {
        Column(Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text("Escolha uma fase no mapa para começar.", color = Muted)
            NeonButton("ABRIR JORNADA", { vm.navigate(Screen.MAP) })
        }
        return
    }
    val word = session.puzzle.words.firstOrNull { it.id == state.activeWordId } ?: session.puzzle.words.first()
    val magazine = session.puzzle.mode == Mode.MAGAZINE
    var showClues by rememberSaveable(session.puzzle.id) { mutableStateOf(false) }
    var scale by rememberSaveable(session.puzzle.id) { mutableFloatStateOf(1f) }
    var feedback by remember(session.puzzle.id) { mutableStateOf("") }
    LaunchedEffect(session.values) { feedback = "" }
    BackHandler(showClues) { showClues = false }
    val tone = remember(state.save.settings.sound) { if (state.save.settings.sound) runCatching { ToneGenerator(AudioManager.STREAM_MUSIC, 20) }.getOrNull() else null }
    DisposableEffect(tone) { onDispose { tone?.release() } }
    var previousSolved by remember(session.puzzle.id) { mutableIntStateOf(session.solved.size) }
    var previousMistakes by remember(session.puzzle.id) { mutableIntStateOf(session.mistakes) }
    LaunchedEffect(session.solved.size, session.mistakes) {
        if (session.solved.size > previousSolved) tone?.startTone(ToneGenerator.TONE_PROP_ACK, 120)
        if (session.mistakes > previousMistakes) tone?.startTone(ToneGenerator.TONE_PROP_NACK, 110)
        previousSolved = session.solved.size; previousMistakes = session.mistakes
    }
    val cursorKey = if (session.completed) null else Engine.wordCells(word).getOrNull(state.cursor)?.key
    Column(Modifier.fillMaxSize().background(Night)) {
        PlayTopBar(vm, session, showClues, scale, toggleClues = { showClues = !showClues }, toggleZoom = { scale = if (scale > 1.05f) 1f else 2f })
        Box(Modifier.weight(1f).fillMaxWidth()) {
            if (showClues) ClueList(session, word) { id -> vm.selectWord(id); showClues = false }
            else ZoomableGrid(session, scale, { scale = it }, cursorKey) { cell, cursorView ->
                if (magazine) MagazineGrid(session, word, cursorKey, cursorView, cell, vm::selectWord)
                else WordGrid(session, word, cursorKey, cursorView, cell, vm::selectWord)
            }
        }
        if (session.completed) Column(Modifier.fillMaxWidth().heightIn(max = 330.dp).verticalScroll(rememberScrollState()).padding(12.dp)) { VictoryPanel(session, vm) }
        else {
            ClueBar(session, word, vm)
            Row(Modifier.fillMaxWidth().background(Panel).padding(horizontal = 8.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                val left = (Engine.MAX_HINTS - session.hints).coerceAtLeast(0)
                val canHint = session.hints < Engine.MAX_HINTS && (magazine || word.id !in session.solved)
                CompactButton("DICA $left/3", vm::hint, enabled = canHint, outline = true, modifier = Modifier.semantics { contentDescription = "Revelar uma letra, $left dicas restantes" })
                if (magazine) {
                    val fill = Engine.gridFill(session)
                    CompactButton(if (fill.full) "CONFERIR GRADE" else "${fill.filled}/${fill.total} CASAS", {
                        feedback = when (vm.checkGrid()) { "retry" -> "A grade ainda não está correta. Revise e confira de novo."; "incomplete" -> "Preencha todas as casas antes de conferir."; else -> "" }
                    }, enabled = fill.full, modifier = Modifier.weight(1f).semantics { contentDescription = "Conferir grade completa" })
                } else CompactButton("CONECTAR ✓", vm::confirmWord, enabled = word.id !in session.solved, modifier = Modifier.weight(1f).semantics { contentDescription = "Conectar resposta" })
            }
            if (feedback.isNotEmpty()) Text(feedback, color = Coral, fontSize = 11.sp, modifier = Modifier.fillMaxWidth().background(Panel).padding(horizontal = 12.dp, vertical = 2.dp).semantics { contentDescription = "Resultado da conferência" })
            LetterKeyboard(onLetter = vm::typeLetter, onErase = vm::eraseGridCell, onToggle = if (session.puzzle.mode == Mode.CASCADE) null else vm::toggleDirection)
        }
    }
}

@Composable
private fun PlayTopBar(vm: GameViewModel, session: Session, showClues: Boolean, scale: Float, toggleClues: () -> Unit, toggleZoom: () -> Unit) {
    Row(Modifier.fillMaxWidth().statusBarsPadding().height(48.dp).padding(end = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        IconButton(onClick = { vm.navigate(Screen.MAP) }, modifier = Modifier.semantics { contentDescription = "Salvar e voltar ao mapa" }) { Text("←", color = Amber, fontSize = 24.sp) }
        Column(Modifier.weight(1f)) {
            Text("FASE ${session.puzzle.level.toString().padStart(2, '0')} · ${session.puzzle.mode.title.uppercase()}", color = Ink, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            val progress = if (session.puzzle.mode == Mode.MAGAZINE) Engine.gridFill(session).let { "${it.filled}/${it.total} casas" } else "${session.solved.size}/${session.puzzle.words.size} palavras · ${Engine.getScore(session)} pts"
            Text("◷ ${"%02d:%02d".format(session.elapsed / 60, session.elapsed % 60)} · $progress · ${session.puzzle.difficulty}", color = Muted, fontSize = 10.sp, fontFamily = FontFamily.Monospace, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        TextButton(onClick = toggleZoom, enabled = !showClues, modifier = Modifier.semantics { contentDescription = if (scale > 1.05f) "Ver a grade inteira" else "Ampliar grade" }) { Text(if (scale > 1.05f) "⤡ TUDO" else "⤢ ZOOM", color = if (showClues) Muted else Amber, fontSize = 11.sp) }
        TextButton(onClick = toggleClues, modifier = Modifier.semantics { contentDescription = if (showClues) "Voltar à grade" else "Ver todas as pistas" }) { Text(if (showClues) "▦ GRADE" else "☰ PISTAS", color = Violet, fontSize = 11.sp) }
    }
    HorizontalDivider(color = Stroke)
}

/**
 * Fits the whole grid in the available space; pinch (or the zoom button) enlarges it and the
 * cursor square is kept in view. Two-finger gestures are intercepted before the scroll containers.
 */
@Composable
private fun ZoomableGrid(session: Session, scale: Float, setScale: (Float) -> Unit, cursorKey: String?, content: @Composable (Dp, BringIntoViewRequester) -> Unit) {
    val (rows, cols) = gridShape(session)
    val cursorView = rememberGridCursor(cursorKey, scale)
    val currentScale by rememberUpdatedState(scale)
    BoxWithConstraints(Modifier.fillMaxSize().padding(6.dp).pointerInput(session.puzzle.id) {
        awaitEachGesture {
            awaitFirstDown(requireUnconsumed = false, pass = PointerEventPass.Initial)
            do {
                val event = awaitPointerEvent(PointerEventPass.Initial)
                if (event.changes.count { it.pressed } >= 2) {
                    val zoom = event.calculateZoom()
                    if (zoom != 1f) { setScale((currentScale * zoom).coerceIn(1f, 4f)); event.changes.forEach { it.consume() } }
                }
            } while (event.changes.any { it.pressed })
        }
    }) {
        val fit = minOf(maxWidth / cols, maxHeight / rows)
        val cell = fit * scale
        val padX = ((maxWidth - cell * cols) / 2).coerceAtLeast(0.dp)
        val padY = ((maxHeight - cell * rows) / 2).coerceAtLeast(0.dp)
        Box(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).horizontalScroll(rememberScrollState())) {
            Box(Modifier.padding(start = padX, top = padY)) { content(cell, cursorView) }
        }
    }
}

private fun gridShape(session: Session): Pair<Int, Int> =
    if (session.puzzle.mode == Mode.CASCADE) session.puzzle.words.size to (session.puzzle.words.maxOf { it.answer.length } + 1)
    else session.puzzle.rows to session.puzzle.cols

@Composable
private fun dpText(value: Dp): TextUnit = with(LocalDensity.current) { value.toSp() }

/** Magazine squares: clue text shrinks to fit its square like the printed grids; letters stay large. */
@Composable
private fun MagazineGrid(session: Session, selected: PuzzleWord, cursorKey: String?, cursorView: BringIntoViewRequester, cell: Dp, selectWord: (String, String?) -> Unit) {
    val letters = remember(session.puzzle.id) { session.puzzle.words.flatMap(Engine::wordCells).map { it.key }.toSet() }
    val clues = remember(session.puzzle.id) { session.puzzle.words.groupBy { Engine.clueCell(it).key } }
    val active = Engine.wordCells(selected).map { it.key }.toSet()
    val letterSize = dpText(cell * .56f)
    Column(Modifier.background(PaperLine).border(1.dp, PaperLine)) {
        repeat(session.puzzle.rows) { row ->
            Row {
                repeat(session.puzzle.cols) { col ->
                    val key = "$row:$col"; val entries = clues[key]
                    when {
                        entries != null -> Column(Modifier.size(cell).background(CluePaper).border(.5.dp, PaperLine)) {
                            entries.sortedBy { it.direction }.forEach { word ->
                                val height = cell / entries.size
                                val font = sqrt(((cell.value - 3f) * (height.value - 2f)) / (.95f * word.clue.length)).coerceIn(2.5f, cell.value * .2f)
                                Box(Modifier.weight(1f).fillMaxWidth().background(if (word.id == selected.id) ClueActive else CluePaper).border(.5.dp, PaperLine)
                                    .clickable { selectWord(word.id, null) }
                                    .semantics { contentDescription = "Pista ${word.number} ${if (word.direction == "across") "horizontal" else "vertical"}: ${word.clue}" }) {
                                    Text(word.clue, color = PaperInk, fontSize = dpText(font.dp), lineHeight = dpText((font * 1.06f).dp), textAlign = TextAlign.Center, overflow = TextOverflow.Clip,
                                        modifier = Modifier.fillMaxSize().padding(start = 1.dp, end = if (word.direction == "across") 4.dp else 1.dp, bottom = if (word.direction == "down") 3.dp else 0.dp).wrapContentHeight(Alignment.CenterVertically))
                                    Text(if (word.direction == "across") "▸" else "▾", color = PaperLine, fontSize = dpText(cell * .2f), lineHeight = dpText(cell * .2f),
                                        modifier = Modifier.align(if (word.direction == "across") Alignment.CenterEnd else Alignment.BottomCenter))
                                }
                            }
                        }
                        key in letters -> {
                            val background = when { key == cursorKey -> CursorPaper; key in active -> SelectedPaper; else -> Paper }
                            Box(Modifier.size(cell).then(if (key == cursorKey) Modifier.bringIntoViewRequester(cursorView) else Modifier).background(background)
                                .border(if (key == cursorKey) 2.dp else .5.dp, if (key in active) Color(0xFFBA7925) else PaperLine)
                                .clickable {
                                    val owners = session.puzzle.words.filter { word -> Engine.wordCells(word).any { it.key == key } }
                                    val next = if (selected in owners && owners.size > 1 && key == cursorKey) owners.first { it.id != selected.id } else owners.firstOrNull { it.id == selected.id } ?: owners.first()
                                    selectWord(next.id, key)
                                }
                                .semantics { contentDescription = "casa $row,$col, ${session.values[key] ?: "vazia"}" }, contentAlignment = Alignment.Center) {
                                Text(session.values[key] ?: "", fontSize = letterSize, lineHeight = letterSize, fontWeight = FontWeight.Bold, color = if (key in session.revealed && !session.completed) GivenInk else PaperInk)
                            }
                        }
                        else -> Spacer(Modifier.size(cell).background(Block).border(.5.dp, PaperLine))
                    }
                }
            }
        }
    }
}

/** Palavras cruzadas and Cascata squares (the cascade uses one row per answer, number first). */
@Composable
private fun WordGrid(session: Session, selected: PuzzleWord, cursorKey: String?, cursorView: BringIntoViewRequester, cell: Dp, selectWord: (String, String?) -> Unit) {
    val active = Engine.wordCells(selected).map { it.key }.toSet()
    val solved = session.puzzle.words.filter { it.id in session.solved }.flatMap(Engine::wordCells).map { it.key }.toSet()
    val gap = (cell * .06f).coerceAtMost(3.dp)
    if (session.puzzle.mode == Mode.CASCADE) {
        Column {
            session.puzzle.words.forEach { word ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(cell), contentAlignment = Alignment.Center) {
                        Text(if (word.id in session.solved) "✓" else word.number.toString().padStart(2, '0'), color = if (word.id == selected.id) Amber else Muted, fontSize = dpText(cell * .3f), fontFamily = FontFamily.Monospace)
                    }
                    Engine.wordCells(word).forEach { square ->
                        Box(Modifier.size(cell).padding(gap)) { BoardCell(square.key, session, active, solved, null, square.key == cursorKey, cursorView, cell) { selectWord(word.id, square.key) } }
                    }
                }
            }
        }
        return
    }
    val all = remember(session.puzzle.id) { session.puzzle.words.flatMap(Engine::wordCells).map { it.key }.toSet() }
    val numbers = remember(session.puzzle.id) { session.puzzle.words.associate { "${it.row}:${it.col}" to it.number } }
    Column {
        repeat(session.puzzle.rows) { row ->
            Row {
                repeat(session.puzzle.cols) { col ->
                    val key = "$row:$col"
                    Box(Modifier.size(cell).padding(gap)) {
                        if (key in all) BoardCell(key, session, active, solved, numbers[key], key == cursorKey, cursorView, cell) {
                            val owners = session.puzzle.words.filter { word -> Engine.wordCells(word).any { it.key == key } }
                            val next = if (selected in owners && owners.size > 1 && key == cursorKey) owners.first { it.id != selected.id } else owners.firstOrNull { it.id == selected.id } ?: owners.first()
                            selectWord(next.id, key)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun BoardCell(key: String, session: Session, active: Set<String>, solved: Set<String>, number: Int?, cursor: Boolean, cursorView: BringIntoViewRequester, cell: Dp, onClick: () -> Unit) {
    val isSolved = key in solved; val isActive = key in active; val given = key in session.revealed
    val shape = RoundedCornerShape(2.dp)
    Box(Modifier.fillMaxSize().then(if (cursor) Modifier.bringIntoViewRequester(cursorView) else Modifier).clip(shape)
        .background(when { cursor -> Amber.copy(alpha = .32f); isSolved -> Amber.copy(alpha = .14f); isActive -> Amber.copy(alpha = .12f); else -> Color(0xFF2D2633) })
        .border(if (cursor) 2.dp else 1.dp, if (cursor) Amber else if (isSolved || isActive) Amber.copy(alpha = .55f) else Color(0xFF4C3C53), shape)
        .clickable(onClick = onClick)
        .semantics { contentDescription = "${if (number != null) "Palavra $number, " else ""}casa ${key.replace(':', ',')}, ${session.values[key] ?: "vazia"}" }, contentAlignment = Alignment.Center) {
        if (number != null) Text(number.toString(), color = Muted, fontSize = dpText(cell * .24f), lineHeight = dpText(cell * .24f), modifier = Modifier.align(Alignment.TopStart).padding(start = 1.dp))
        Text(session.values[key] ?: "", color = if (isSolved || given) Amber else Ink, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, fontSize = dpText(cell * .5f), lineHeight = dpText(cell * .5f))
    }
}

/** Selected clue between the grid and the keyboard; arrows walk the answers, a tap switches direction. */
@Composable
private fun ClueBar(session: Session, word: PuzzleWord, vm: GameViewModel) {
    val label = when (session.puzzle.mode) {
        Mode.CASCADE -> "LINHA ${word.number}"
        else -> if (word.direction == "across") "→ HORIZONTAL" else "↓ VERTICAL"
    }
    Row(Modifier.fillMaxWidth().background(PanelRaised).heightIn(min = 62.dp), verticalAlignment = Alignment.CenterVertically) {
        IconButton(onClick = vm::previousWord, modifier = Modifier.semantics { contentDescription = "Pista anterior" }) { Text("‹", color = Amber, fontSize = 30.sp) }
        Column(Modifier.weight(1f).clickable(enabled = session.puzzle.mode != Mode.CASCADE) { vm.toggleDirection() }.padding(vertical = 6.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text("$label · ${word.answer.length} LETRAS · ${word.themeName.uppercase()}", color = Amber, fontSize = 9.sp, fontFamily = FontFamily.Monospace, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(word.clue, color = Ink, fontSize = 14.sp, lineHeight = 18.sp, maxLines = 3, overflow = TextOverflow.Ellipsis)
        }
        IconButton(onClick = vm::nextWord, modifier = Modifier.semantics { contentDescription = "Próxima pista" }) { Text("›", color = Amber, fontSize = 30.sp) }
    }
}

@Composable
private fun ClueList(session: Session, selected: PuzzleWord, select: (String) -> Unit) {
    val groups = if (session.puzzle.mode == Mode.CASCADE) listOf("DE CIMA PARA BAIXO" to session.puzzle.words)
        else listOf("HORIZONTAIS →" to session.puzzle.words.filter { it.direction == "across" }, "VERTICAIS ↓" to session.puzzle.words.filter { it.direction == "down" })
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 12.dp), contentPadding = PaddingValues(vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        groups.forEach { (title, words) ->
            item(title) { Text(title, color = Amber, fontFamily = FontFamily.Monospace, fontSize = 10.sp, modifier = Modifier.padding(top = 8.dp)) }
            items(words, key = { it.id }) { clue ->
                val done = clue.id in session.solved || (session.puzzle.mode == Mode.MAGAZINE && Engine.wordCells(clue).all { !session.values[it.key].isNullOrEmpty() })
                Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(5.dp)).background(if (clue.id == selected.id) Amber.copy(alpha = .1f) else Panel)
                    .border(1.dp, if (clue.id == selected.id) Amber.copy(alpha = .45f) else Stroke, RoundedCornerShape(5.dp)).clickable { select(clue.id) }.padding(12.dp)) {
                    Text(if (done) "✓" else clue.number.toString(), color = Amber, fontFamily = FontFamily.Monospace, fontSize = 12.sp, modifier = Modifier.width(28.dp))
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(clue.clue, color = if (done) Muted else Ink, fontSize = 13.sp, lineHeight = 18.sp)
                        Text("${clue.themeName} · ${clue.answer.length} letras${if (clue.id in session.solved) " · ${clue.answer}" else ""}", color = Muted, fontSize = 10.sp)
                    }
                }
            }
        }
    }
}

/** The game's own keyboard: tapping a square never opens the phone keyboard over the grid. */
@Composable
private fun LetterKeyboard(onLetter: (Char) -> Unit, onErase: () -> Unit, onToggle: (() -> Unit)?) {
    val haptic = LocalHapticFeedback.current
    @Composable
    fun RowScope.Key(label: String, description: String, weight: Float = 1f, accent: Boolean = false, action: () -> Unit) {
        Box(Modifier.weight(weight).height(46.dp).padding(horizontal = 2.5.dp).clip(RoundedCornerShape(6.dp)).background(if (accent) Stroke else PanelRaised)
            .clickable { haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove); action() }
            .semantics { contentDescription = description }, contentAlignment = Alignment.Center) {
            Text(label, color = if (accent) Amber else Ink, fontSize = if (label.length == 1) 19.sp else 15.sp, fontWeight = FontWeight.Medium)
        }
    }
    Column(Modifier.fillMaxWidth().background(Night).navigationBarsPadding().padding(horizontal = 3.dp, vertical = 5.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
        Row { "QWERTYUIOP".forEach { letter -> Key(letter.toString(), "Tecla $letter") { onLetter(letter) } } }
        Row { Spacer(Modifier.weight(.5f)); "ASDFGHJKL".forEach { letter -> Key(letter.toString(), "Tecla $letter") { onLetter(letter) } }; Spacer(Modifier.weight(.5f)) }
        Row {
            if (onToggle != null) Key("⇄", "Trocar direção", 1.5f, accent = true, action = onToggle) else Spacer(Modifier.weight(1.5f))
            "ZXCVBNM".forEach { letter -> Key(letter.toString(), "Tecla $letter") { onLetter(letter) } }
            Key("⌫", "Apagar letra", 1.5f, accent = true, action = onErase)
        }
    }
}

@Composable
private fun CompactButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true, outline: Boolean = false) {
    val shape = RoundedCornerShape(5.dp)
    Box(modifier.height(38.dp).clip(shape).background(if (outline || !enabled) Color.Transparent else Amber).border(1.dp, if (enabled) Amber.copy(alpha = if (outline) .6f else 1f) else Stroke, shape)
        .clickable(enabled = enabled, onClick = onClick).padding(horizontal = 14.dp), contentAlignment = Alignment.Center) {
        Text(text, color = if (!enabled) Muted else if (outline) Amber else Night, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
    }
}
