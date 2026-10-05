package com.neonlexico.game

import android.media.AudioManager
import android.media.ToneGenerator
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.repeatOnLifecycle
import kotlinx.coroutines.delay
import java.util.Locale
import kotlin.math.min

private val Night = Color(0xFF121018)
private val Panel = Color(0xFF1B1721)
private val PanelRaised = Color(0xFF211C27)
private val Stroke = Color(0xFF38303D)
private val Ink = Color(0xFFEAE4E0)
private val Muted = Color(0xFFAAA0AF)
private val Amber = Color(0xFFF5BD70)
private val Coral = Color(0xFFF18576)
private val Violet = Color(0xFFB69AF6)
private val Corners = RoundedCornerShape(5.dp)
private val LexicoFont = FontFamily(Font(R.font.space_regular), Font(R.font.space_semibold, FontWeight.SemiBold))

@Composable
fun NeonTheme(content: @Composable () -> Unit) {
    val typography = Typography().let { base -> base.copy(
        displayLarge = base.displayLarge.copy(fontFamily = LexicoFont),
        displayMedium = base.displayMedium.copy(fontFamily = LexicoFont),
        displaySmall = base.displaySmall.copy(fontFamily = LexicoFont),
        headlineLarge = base.headlineLarge.copy(fontFamily = LexicoFont),
        headlineMedium = base.headlineMedium.copy(fontFamily = LexicoFont),
        headlineSmall = base.headlineSmall.copy(fontFamily = LexicoFont),
        titleLarge = base.titleLarge.copy(fontFamily = LexicoFont),
        titleMedium = base.titleMedium.copy(fontFamily = LexicoFont),
        titleSmall = base.titleSmall.copy(fontFamily = LexicoFont),
        bodyLarge = base.bodyLarge.copy(fontFamily = LexicoFont),
        bodyMedium = base.bodyMedium.copy(fontFamily = LexicoFont),
        bodySmall = base.bodySmall.copy(fontFamily = LexicoFont),
        labelLarge = base.labelLarge.copy(fontFamily = LexicoFont),
        labelMedium = base.labelMedium.copy(fontFamily = LexicoFont),
        labelSmall = base.labelSmall.copy(fontFamily = LexicoFont),
    ) }
    MaterialTheme(typography = typography, colorScheme = darkColorScheme(
        primary = Amber, onPrimary = Night, secondary = Violet, onSecondary = Night,
        tertiary = Coral, background = Night, onBackground = Ink, surface = Panel,
        onSurface = Ink, surfaceVariant = PanelRaised, onSurfaceVariant = Muted,
        outline = Stroke, error = Coral,
    ), content = content)
}

@Composable
fun NeonApp(vm: GameViewModel) {
    val state = vm.state
    val owner = LocalLifecycleOwner.current
    var syncOpen by rememberSaveable { mutableStateOf(false) }
    val snackbar = remember { SnackbarHostState() }
    DisposableEffect(owner, vm) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_STOP) vm.onBackground()
            if (event == Lifecycle.Event.ON_START) vm.onForeground()
        }
        owner.lifecycle.addObserver(observer)
        onDispose { owner.lifecycle.removeObserver(observer) }
    }
    LaunchedEffect(owner, vm) {
        owner.lifecycle.repeatOnLifecycle(Lifecycle.State.STARTED) {
            while (true) { delay(1_000); vm.tick() }
        }
    }
    LaunchedEffect(state.error) {
        state.error?.let { snackbar.showSnackbar(it); vm.dismissError() }
    }
    BackHandler(state.activeProfileId != null && state.screen != Screen.HOME) {
        vm.navigate(if (state.screen == Screen.PLAY || state.screen == Screen.SETUP) Screen.MAP else Screen.HOME)
    }
    key(state.activeProfileId) {
        if (state.activeProfileId == null) ProfilePicker(vm, onSync = { syncOpen = true })
        else {
            Scaffold(
                containerColor = Night,
                contentWindowInsets = WindowInsets.safeDrawing,
                snackbarHost = { SnackbarHost(snackbar) },
                topBar = { TerminalHeader(vm, onSync = { syncOpen = true }) },
                bottomBar = {
                    if (state.screen != Screen.PLAY && state.screen != Screen.SETUP) TerminalNavigation(state.screen, vm::navigate)
                },
            ) { insets ->
                Box(Modifier.padding(insets).consumeWindowInsets(insets).fillMaxSize().imePadding()) {
                    when (state.screen) {
                        Screen.HOME -> HomePage(vm)
                        Screen.MAP -> MapPage(vm)
                        Screen.SETUP -> SetupPage(vm)
                        Screen.PLAY -> PlayPage(vm)
                        Screen.THEMES -> ThemesPage(vm)
                        Screen.STATS -> StatsPage(vm)
                        Screen.SETTINGS -> SettingsPage(vm, onSync = { syncOpen = true })
                    }
                }
            }
        }
    }
    if (syncOpen) SyncDialog(vm) { syncOpen = false }
    if (state.syncConflict) {
        AlertDialog(
            onDismissRequest = {}, containerColor = Panel,
            title = { Text("Qual progresso continuar?", color = Amber) },
            text = { Text("Este perfil foi jogado em dois aparelhos. Escolha a versão que deseja continuar. A outra será guardada como cópia neste aparelho.") },
            confirmButton = { TextButton(onClick = { vm.syncNow("cloud") }, enabled = !state.syncing) { Text("CONTINUAR ONLINE") } },
            dismissButton = { TextButton(onClick = { vm.syncNow("local") }, enabled = !state.syncing) { Text("USAR ESTE APARELHO") } },
        )
    }
}

@Composable
private fun ProfilePicker(vm: GameViewModel, onSync: () -> Unit) {
    Column(Modifier.fillMaxSize().background(Night).safeDrawingPadding().verticalScroll(rememberScrollState()).padding(horizontal = 22.dp, vertical = 30.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Brand()
        CitySignal(Modifier.fillMaxWidth().height(145.dp).padding(top = 16.dp))
        Eyebrow("DUAS MENTES · MUITOS MUNDOS")
        Text("Quem vai conectar?", fontSize = 30.sp, color = Ink, fontWeight = FontWeight.Medium, modifier = Modifier.padding(top = 17.dp, bottom = 10.dp))
        Text("Escolha seu perfil para continuar a jornada.", color = Muted, fontSize = 13.sp, modifier = Modifier.padding(bottom = 27.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            listOf("daniel" to "Daniel", "larissa" to "Larissa").forEach { (id, name) ->
                val accent = if (id == "daniel") Amber else Violet
                Column(Modifier.weight(1f).clip(Corners).background(Panel).border(1.dp, accent.copy(alpha = .5f), Corners)
                    .clickable { vm.selectProfile(id) }.padding(16.dp).semantics { contentDescription = "Entrar como $name" }, horizontalAlignment = Alignment.CenterHorizontally) {
                    ProfileArt(id, Modifier.fillMaxWidth().aspectRatio(1f))
                    Text(name, fontSize = 22.sp, fontWeight = FontWeight.Medium, color = accent, modifier = Modifier.padding(top = 13.dp))
                    Text("ENTRAR →", fontFamily = FontFamily.Monospace, fontSize = 10.sp, color = Muted, modifier = Modifier.padding(top = 9.dp))
                }
            }
        }
        Text("Cada perfil tem sua própria campanha, suas estrelas e suas partidas em andamento.", color = Muted, fontSize = 12.sp, lineHeight = 20.sp, modifier = Modifier.padding(vertical = 25.dp))
        NeonButton("CONECTAR SITE E APP", onSync, outline = true, modifier = Modifier.fillMaxWidth())
        Text(vm.state.syncStatus, color = Muted, fontSize = 11.sp, modifier = Modifier.padding(top = 12.dp))
        if (vm.state.syncCode.isNotBlank()) Text("Código conectado · ${vm.formattedSyncCode()}", color = Violet, fontSize = 10.sp, modifier = Modifier.padding(top = 10.dp))
        TerminalFooter()
    }
}

@Composable
private fun TerminalHeader(vm: GameViewModel, onSync: () -> Unit) {
    val state = vm.state
    Column(Modifier.background(Night).statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().padding(start = 18.dp, end = 8.dp, top = 8.dp, bottom = 5.dp), verticalAlignment = Alignment.CenterVertically) {
            if (state.screen == Screen.PLAY || state.screen == Screen.SETUP) IconButton(onClick = { vm.navigate(Screen.MAP) }, modifier = Modifier.semantics { contentDescription = "Salvar e voltar ao mapa" }) { Text("←", color = Amber, fontSize = 27.sp) }
            Brand(Modifier.weight(1f), compact = true)
            IconButton(onClick = { vm.navigate(Screen.SETTINGS) }, modifier = Modifier.semantics { contentDescription = "Abrir ajustes" }) { Text("⚙", color = Muted, fontSize = 25.sp) }
        }
        Row(Modifier.fillMaxWidth().padding(horizontal = 10.dp), verticalAlignment = Alignment.CenterVertically) {
            TextButton(onClick = vm::switchProfile) {
                Text("●", color = if (state.activeProfileId == "daniel") Amber else Violet, fontSize = 10.sp)
                Spacer(Modifier.width(7.dp))
                Text(if (state.activeProfileId == "daniel") "Daniel" else "Larissa", color = Ink, fontSize = 12.sp)
                Text("  ⇄", color = Muted)
            }
            TextButton(onClick = onSync, modifier = Modifier.weight(1f)) {
                Text(if (state.syncing) "SINCRONIZANDO…" else if (state.syncCode.isBlank()) "CONECTAR APARELHOS" else state.syncStatus, color = Violet, fontSize = 9.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
        HorizontalDivider(color = Stroke)
    }
}

@Composable
private fun Brand(modifier: Modifier = Modifier, compact: Boolean = false) {
    Row(modifier, verticalAlignment = Alignment.CenterVertically) {
        Text("▦", color = Amber, fontSize = if (compact) 30.sp else 37.sp, modifier = Modifier.padding(end = 9.dp))
        Column {
            Text("NEON", color = Amber, letterSpacing = 3.sp, fontSize = if (compact) 19.sp else 24.sp, fontWeight = FontWeight.Bold)
            Text("L É X I C O", color = Muted, fontSize = if (compact) 8.sp else 10.sp, fontFamily = FontFamily.Monospace)
        }
    }
}

@Composable
private fun TerminalNavigation(screen: Screen, navigate: (Screen) -> Unit) {
    NavigationBar(containerColor = Panel, tonalElevation = 0.dp) {
        listOf(Triple(Screen.HOME, "⌂", "Início"), Triple(Screen.MAP, "▦", "Jornada"), Triple(Screen.THEMES, "◇", "Universos"), Triple(Screen.STATS, "✦", "Arquivo")).forEach { (target, glyph, label) ->
            NavigationBarItem(selected = screen == target, onClick = { navigate(target) }, icon = { Text(glyph, fontSize = 23.sp) }, label = { Text(label, fontSize = 10.sp, maxLines = 1) }, colors = NavigationBarItemDefaults.colors(selectedIconColor = Amber, selectedTextColor = Amber, unselectedIconColor = Muted, unselectedTextColor = Muted, indicatorColor = Amber.copy(alpha = .12f)))
        }
    }
}

@Composable
private fun PageColumn(content: @Composable ColumnScope.() -> Unit) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(18.dp), content = content)
}

@Composable
private fun Eyebrow(text: String, color: Color = Amber) {
    Text("—  $text", color = color, fontFamily = FontFamily.Monospace, fontSize = 9.sp, letterSpacing = 1.sp, lineHeight = 15.sp)
}

@Composable
private fun PageHead(eyebrow: String, title: String, description: String) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Eyebrow(eyebrow)
        Text(title, fontSize = 30.sp, lineHeight = 35.sp, color = Ink, fontWeight = FontWeight.Medium, letterSpacing = (-1).sp)
        Text(description, color = Muted, fontSize = 12.sp, lineHeight = 21.sp)
    }
}

@Composable
private fun NeonButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, outline: Boolean = false, violet: Boolean = false, enabled: Boolean = true) {
    val accent = if (violet) Violet else Amber
    if (outline) OutlinedButton(onClick = onClick, enabled = enabled, modifier = modifier.heightIn(min = 48.dp), shape = Corners, border = androidx.compose.foundation.BorderStroke(1.dp, Stroke), colors = ButtonDefaults.outlinedButtonColors(contentColor = Ink)) { Text(text, fontSize = 11.sp, fontWeight = FontWeight.SemiBold) }
    else Button(onClick = onClick, enabled = enabled, modifier = modifier.heightIn(min = 48.dp), shape = Corners, colors = ButtonDefaults.buttonColors(containerColor = accent, contentColor = Night)) { Text(text, fontSize = 11.sp, fontWeight = FontWeight.SemiBold) }
}

@Composable
private fun PanelBox(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Column(modifier.fillMaxWidth().clip(Corners).background(Panel).border(1.dp, Stroke, Corners).padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp), content = content)
}

private fun modeName(mode: Mode) = mode.title
private fun keyFor(mode: Mode, level: Int) = "${mode.name.lowercase(Locale.ROOT)}:$level"
private fun timeLabel(seconds: Int) = "%02d:%02d".format(Locale.ROOT, seconds / 60, seconds % 60)
private fun countCompleted(save: SaveData, mode: Mode) = save.results[mode]?.size ?: 0
private fun allResults(save: SaveData) = save.results.values.flatMap { it.values }
private fun unlocked(save: SaveData, mode: Mode): Int = Engine.unlockedLevel(save, mode)

@Composable
private fun HomePage(vm: GameViewModel) {
    val save = vm.state.save
    PageColumn {
        PageHead("NOVA AURORA / TRANSMISSÃO ATIVA", "Uma palavra.\nMil conexões.", "Entre no circuito de Nova Aurora. Decifre pistas e descubra as conexões entre os seus universos favoritos.")
        CitySignal(Modifier.fillMaxWidth().height(155.dp))
        Eyebrow("SELECIONE SUA FREQUÊNCIA")
        Mode.entries.forEach { mode ->
            PanelBox {
                Eyebrow(if (mode == Mode.MAGAZINE) "PISTAS DENTRO DAS CASAS" else if (mode == Mode.CLASSIC) "MATRIZ DE PALAVRAS" else "REAÇÃO EM CADEIA", if (mode != Mode.CASCADE) Amber else Violet)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text(modeName(mode), fontSize = 24.sp, color = Ink)
                        Text(if (mode == Mode.MAGAZINE) "Pistas dentro das casas e setas, como nas revistas. Preencha livremente e confira apenas a grade completa." else if (mode == Mode.CLASSIC) "Cruze pistas e letras. As respostas se encontram em cada espaço da grade." else "Uma resposta ilumina a próxima. Resolva a primeira linha e deixe as letras fluírem.", color = Muted, fontSize = 12.sp, lineHeight = 21.sp)
                    }
                    MiniBoard(mode, Modifier.size(75.dp).padding(start = 10.dp))
                }
                HorizontalDivider(color = Stroke)
                Text("${countCompleted(save, mode).toString().padStart(2, '0')} / 100 FASES CONCLUÍDAS", color = Muted, fontFamily = FontFamily.Monospace, fontSize = 10.sp)
                NeonButton(if (countCompleted(save, mode) > 0 || save.sessions.keys.any { it.startsWith(mode.name.lowercase(Locale.ROOT)) }) "CONTINUAR JORNADA →" else "INICIAR JORNADA →", { vm.prepare(mode, unlocked(save, mode)) }, violet = mode == Mode.CASCADE, modifier = Modifier.fillMaxWidth())
            }
        }
        PanelBox {
            Eyebrow("NENHUMA CONEXÃO É POR ACASO", Coral)
            Text("Cinco temas. Infinitas conexões.", fontSize = 18.sp)
            Text("Heróis, ciência, código e muito mais. A cada fase, cinco universos se encontram no seu tabuleiro.", color = Muted, fontSize = 12.sp, lineHeight = 20.sp)
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            StatTile("${allResults(save).size} / 300", "FASES CONCLUÍDAS", Modifier.weight(1f))
            StatTile("✦ ${allResults(save).sumOf { it.stars }}", "ESTRELAS", Modifier.weight(1f))
        }
        TerminalFooter()
    }
}

@Composable
private fun ModeSwitch(mode: Mode, select: (Mode) -> Unit) {
    Row(Modifier.fillMaxWidth().clip(Corners).background(Panel).border(1.dp, Stroke, Corners).padding(4.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        Mode.entries.forEach { item ->
            Box(Modifier.weight(1f).heightIn(min = 48.dp).clip(Corners).background(if (item == mode) Amber.copy(alpha = .12f) else Color.Transparent).clickable { select(item) }.padding(8.dp), contentAlignment = Alignment.Center) {
                Text(if (item == Mode.CLASSIC) "Cruzadas" else if (item == Mode.MAGAZINE) "Clássico" else "Cascata", color = if (item == mode) Amber else Muted, fontSize = 12.sp)
            }
        }
    }
}

@Composable
private fun MapPage(vm: GameViewModel) {
    val state = vm.state
    var mode by rememberSaveable { mutableStateOf(state.mode) }
    val unlocked = unlocked(state.save, mode)
    val sectors = listOf("Primeiro sinal", "Ruas de neon", "Circuito aberto", "Memória de silício", "Frequência oculta", "Cidade sintética", "Além do firewall", "Horizonte de dados", "Última transmissão", "O núcleo")
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 20.dp), contentPadding = PaddingValues(vertical = 20.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
        item { PageHead("CAMPANHA / 300 FASES", "Toda conexão\ncomeça aqui.", "Dez distritos, cem desafios em cada modo. Complete uma fase para abrir a próxima.") }
        item { ModeSwitch(mode) { mode = it } }
        item { Text("${countCompleted(state.save, mode)} / 100 CONCLUÍDAS", color = Muted, fontSize = 10.sp, fontFamily = FontFamily.Monospace) }
        items(10) { sector ->
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Eyebrow("DISTRITO ${(sector + 1).toString().padStart(2, '0')} / ${sectors[sector].uppercase()}")
                repeat(2) { row ->
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        repeat(5) { col ->
                            val level = sector * 10 + row * 5 + col + 1
                            val result = state.save.results[mode]?.get(level.toString())
                            val locked = level > unlocked
                            val accent = if (level == unlocked || result != null) Amber else Muted
                            Column(Modifier.weight(1f).heightIn(min = 70.dp).clip(Corners).background(if (result != null) Amber.copy(alpha = .04f) else Panel).border(1.dp, if (level == unlocked) Amber else Stroke, Corners).clickable(enabled = !locked) { vm.prepare(mode, level) }.padding(vertical = 12.dp).semantics { contentDescription = "Fase $level${if (locked) ", bloqueada" else if (result != null) ", concluída, ${result.stars} estrelas" else ", disponível"}" }, horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(7.dp)) {
                                Text(if (locked) "·" else level.toString().padStart(2, '0'), color = accent, fontSize = 16.sp, fontFamily = FontFamily.Monospace)
                                Text(if (result != null) "★".repeat(result.stars) + "☆".repeat(3 - result.stars) else if (locked) level.toString() else "JOGAR", color = if (locked) Muted.copy(alpha = .4f) else accent, fontSize = 8.sp)
                            }
                        }
                    }
                }
            }
        }
        item { TerminalFooter() }
    }
}

@Composable
private fun SetupPage(vm: GameViewModel) {
    val state = vm.state
    var opening by rememberSaveable(state.mode, state.level) { mutableStateOf(false) }
    LaunchedEffect(state.error) { if (state.error != null) opening = false }
    PageColumn {
        PageHead("${modeName(state.mode).uppercase()} / FASE ${state.level}", "Sintonize\nseus universos.", "Cinco temas sorteados. Todas as palavras desta fase vêm desses universos. Gostou da combinação? Entre no circuito.")
        state.selectedThemes.forEachIndexed { index, theme -> ThemeTile(theme, index) }
        PanelBox {
            Eyebrow(if (state.level <= 30) "SINAL INICIAL" else if (state.level <= 65) "SINAL AVANÇADO" else "SINAL MESTRE")
            Text(if (state.mode == Mode.MAGAZINE) "Pistas dentro das casas, como nas revistas. Toque na casa e digite diretamente na grade. Confira só quando completar tudo." else if (state.mode == Mode.CLASSIC) "As letras compartilhadas conectam as palavras. Toque na casa e digite diretamente na grade." else "Toque na casa e digite diretamente na grade. Acerte uma linha para revelar letras iguais nas linhas abaixo.", fontSize = 12.sp, color = Muted, lineHeight = 20.sp)
            Text("Sem limite de tempo. Jogue no seu ritmo.", color = Muted, fontSize = 11.sp)
            NeonButton("SORTEAR NOVAMENTE ↻", vm::shuffleThemes, outline = true, modifier = Modifier.fillMaxWidth(), enabled = !opening)
            NeonButton(if (opening) "CONECTANDO…" else "ENTRAR NO CIRCUITO →", { opening = true; vm.begin() }, modifier = Modifier.fillMaxWidth(), enabled = state.selectedThemes.size == 5 && !opening)
            if (opening) LinearProgressIndicator(modifier = Modifier.fillMaxWidth(), color = Amber, trackColor = Stroke)
        }
        Tip("Acentos, espaços e hífens não entram nas casas. “Inteligência” vira INTELIGENCIA. As pistas mostram o número de letras.")
        TextButton(onClick = { vm.navigate(Screen.MAP) }) { Text("← VOLTAR AO MAPA") }
    }
}

@Composable
private fun ThemeTile(theme: Theme, index: Int, library: Boolean = false) {
    PanelBox {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(38.dp).clip(Corners).background(Violet.copy(alpha = .08f)).border(1.dp, Violet.copy(alpha = .2f), Corners), contentAlignment = Alignment.Center) { Text(themeGlyph(theme.icon), color = if (index % 2 == 0) Violet else Coral, fontSize = 22.sp) }
            Spacer(Modifier.width(12.dp))
            Text(theme.name, modifier = Modifier.weight(1f), fontSize = 16.sp, color = Ink)
            Text((index + 1).toString().padStart(2, '0'), color = Muted.copy(alpha = .6f), fontSize = 10.sp, fontFamily = FontFamily.Monospace)
        }
        Text(theme.description, color = Muted, fontSize = 12.sp, lineHeight = 20.sp)
        if (library) Text("${theme.entries.size} PALAVRAS · 3 DIFICULDADES", color = Amber, fontFamily = FontFamily.Monospace, fontSize = 9.sp)
    }
}

private fun themeGlyph(icon: String) = when (icon) { "code", "terminal" -> "⌘"; "star", "space" -> "✦"; "heart" -> "♡"; "music" -> "♫"; "book" -> "▤"; "science", "atom" -> "◎"; else -> "◇" }

@Composable
private fun ThemesPage(vm: GameViewModel) {
    var search by rememberSaveable { mutableStateOf("") }
    val all = vm.state.themes
    val filtered = all.filter { "${it.name} ${it.description}".contains(search.trim(), ignoreCase = true) }
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 20.dp), contentPadding = PaddingValues(vertical = 20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { PageHead("${all.size} UNIVERSOS / ${all.sumOf { it.entries.size }} PISTAS", "Uma mente.\nMuitos mundos.", "Da psicologia aos super-heróis, da programação ao espaço. Explore os assuntos da sua próxima conexão.") }
        item { OutlinedTextField(value = search, onValueChange = { search = it }, label = { Text("Buscar um universo") }, singleLine = true, modifier = Modifier.fillMaxWidth(), shape = Corners) }
        item { Eyebrow("${filtered.size} UNIVERSOS") }
        items(filtered, key = { it.id }) { theme -> ThemeTile(theme, all.indexOf(theme), library = true) }
        if (filtered.isEmpty()) item { Text("Nenhum universo encontrado. Tente outra palavra.", color = Muted, fontSize = 13.sp) }
    }
}

@Composable
private fun StatsPage(vm: GameViewModel) {
    val save = vm.state.save
    val results = allResults(save)
    PageColumn {
        PageHead("SEU ARQUIVO DE CONEXÕES", "Cada palavra\ndeixa uma marca.", "Suas conquistas e partidas são salvas no perfil. Conecte site e app para continuar de onde parou.")
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            StatTile(results.size.toString(), "FASES CONCLUÍDAS", Modifier.weight(1f))
            StatTile(results.sumOf { it.stars }.toString(), "ESTRELAS", Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            StatTile(results.sumOf { it.score }.toString(), "PONTOS", Modifier.weight(1f))
            StatTile(results.count { it.stars == 3 }.toString(), "FASES PERFEITAS", Modifier.weight(1f))
        }
        Mode.entries.forEach { mode ->
            PanelBox {
                Text(modeName(mode), fontSize = 17.sp)
                LinearProgressIndicator(progress = { countCompleted(save, mode) / 100f }, modifier = Modifier.fillMaxWidth(), color = if (mode == Mode.CLASSIC) Amber else Violet, trackColor = Stroke)
                Text("${countCompleted(save, mode)} de 100 fases · ${save.results[mode]?.values?.sumOf { it.stars } ?: 0} de 300 estrelas", color = Muted, fontSize = 11.sp)
            }
        }
        Tip("Três estrelas: complete sem dicas e sem erros. Duas: até quatro dicas e erros somados. Uma: conclua no seu ritmo. Sempre dá para tentar novamente.")
        NeonButton("VOLTAR À JORNADA →", { vm.navigate(Screen.MAP) }, modifier = Modifier.fillMaxWidth())
    }
}

@Composable
private fun StatTile(value: String, label: String, modifier: Modifier = Modifier) {
    Column(modifier.clip(Corners).background(Panel).border(1.dp, Stroke, Corners).padding(14.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(value, color = Amber, fontSize = 25.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        Text(label, color = Muted, fontSize = 8.sp, fontFamily = FontFamily.Monospace)
    }
}

@Composable
private fun SettingsPage(vm: GameViewModel, onSync: () -> Unit) {
    val settings = vm.state.save.settings
    PageColumn {
        PageHead("CONFIGURAÇÕES DO TERMINAL", "Seu jogo,\nsua frequência.", "Ajuste os efeitos e conecte sua campanha aos outros aparelhos.")
        PanelBox {
            SettingRow("Sons do terminal", "Notas de sintetizador nas interações e nos acertos.", settings.sound, vm::toggleSound)
            HorizontalDivider(color = Stroke)
            SettingRow("Reduzir movimento", "Uma experiência mais tranquila, com menos animações.", settings.reducedMotion, vm::toggleMotion)
        }
        PanelBox {
            Eyebrow("SUA CAMPANHA EM TODO LUGAR", Violet)
            Text("Conectar site e app Android", fontSize = 18.sp)
            Text("Use o mesmo código nos dois aparelhos. Daniel e Larissa continuam com progressos separados. Sem internet, o jogo continua salvando aqui.", color = Muted, fontSize = 12.sp, lineHeight = 21.sp)
            NeonButton("CONECTAR APARELHOS", onSync, outline = true, modifier = Modifier.fillMaxWidth())
            Text(vm.state.syncStatus, fontSize = 11.sp, color = Muted)
        }
        PanelBox {
            Eyebrow("MANUAL DE CAMPO")
            Text("Toque em uma pista ou nas casas para escolher a palavra. Digite a resposta completa e toque em Conectar. Acentos, espaços e pontuação são removidos.", color = Muted, fontSize = 12.sp, lineHeight = 22.sp)
            Text("Nas clássicas, as palavras compartilham casas. Na cascata, uma resposta ou dica revela letras iguais nas linhas abaixo. Você tem três dicas por fase; cada uma revela uma letra e pode reduzir as estrelas.", color = Muted, fontSize = 12.sp, lineHeight = 22.sp)
            Text("Não há limite de tempo nem vidas para perder. Você pode voltar ao mapa e continuar depois.", color = Muted, fontSize = 12.sp, lineHeight = 22.sp)
        }
        NeonButton("TROCAR DE PERFIL ⇄", vm::switchProfile, outline = true, modifier = Modifier.fillMaxWidth())
        TerminalFooter()
    }
}

@Composable
private fun SettingRow(title: String, description: String, checked: Boolean, onClick: () -> Unit) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f).padding(end = 12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(title, fontSize = 15.sp)
            Text(description, fontSize = 11.sp, color = Muted, lineHeight = 18.sp)
        }
        Switch(checked = checked, onCheckedChange = { onClick() }, modifier = Modifier.semantics { contentDescription = title })
    }
}

@Composable
private fun PlayPage(vm: GameViewModel) {
    if (vm.state.mode == Mode.MAGAZINE) { MagazinePlayPage(vm); return }
    val state = vm.state
    val session = state.save.sessions[keyFor(state.mode, state.level)]
    if (session == null) {
        PageColumn { Text("Escolha uma fase no mapa para começar.", color = Muted); NeonButton("ABRIR JORNADA", { vm.navigate(Screen.MAP) }) }
        return
    }
    val word = session.puzzle.words.find { it.id == state.activeWordId } ?: session.puzzle.words.firstOrNull() ?: return
    val focus = LocalFocusManager.current
    val keyboard = LocalSoftwareKeyboardController.current
    val answerFocus = remember { FocusRequester() }
    val listState = rememberLazyListState()
    val keyboardVisible = WindowInsets.ime.getBottom(LocalDensity.current) > 0
    var selectionRequest by remember { mutableIntStateOf(0) }
    fun selectAndType(id: String,cell: String?=null) { vm.selectWord(id,cell); selectionRequest++ }
    LaunchedEffect(selectionRequest) {
        if (selectionRequest > 0 && !session.completed && word.id !in session.solved) {
            answerFocus.requestFocus()
            keyboard?.show()
            listState.scrollToItem(2)
        } else if (selectionRequest > 0) { keyboard?.hide(); focus.clearFocus() }
    }
    val answer = answerPrefix(session, word)
    val connectedPattern = cells(word).joinToString(" ") { session.revealed[cellKey(it)] ?: "·" }
    val tone = remember(state.save.settings.sound) { if (state.save.settings.sound) runCatching { ToneGenerator(AudioManager.STREAM_MUSIC, 20) }.getOrNull() else null }
    DisposableEffect(tone) { onDispose { tone?.release() } }
    var previousSolved by remember(session.puzzle.id) { mutableIntStateOf(session.solved.size) }
    var previousMistakes by remember(session.puzzle.id) { mutableIntStateOf(session.mistakes) }
    LaunchedEffect(session.solved.size, session.mistakes) {
        if (session.solved.size > previousSolved) tone?.startTone(ToneGenerator.TONE_PROP_ACK, 120)
        if (session.mistakes > previousMistakes) tone?.startTone(ToneGenerator.TONE_PROP_NACK, 110)
        previousSolved = session.solved.size; previousMistakes = session.mistakes
    }
    fun confirm() { vm.submitAnswer(answer); focus.clearFocus() }
    Column(Modifier.fillMaxSize()) {
    LazyColumn(Modifier.weight(1f).fillMaxWidth().padding(horizontal = 16.dp), state = listState, contentPadding = PaddingValues(vertical = 18.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(if (keyboardVisible) 2.dp else 10.dp)) {
                Eyebrow("${modeName(state.mode).uppercase()} / ${session.puzzle.difficulty.uppercase()}")
                if (!keyboardVisible) Text("Fase ${state.level.toString().padStart(2, '0')} · ${if (session.completed) "Sinal decifrado" else "Encontre a conexão"}", fontSize = 22.sp, lineHeight = 28.sp)
                Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    Text("◷ ${timeLabel(session.elapsed)}", color = Muted, fontSize = 11.sp, fontFamily = FontFamily.Monospace)
                    Text("ϟ ${score(session)} PTS", color = Amber, fontSize = 11.sp, fontFamily = FontFamily.Monospace)
                    Text("${session.solved.size}/${session.puzzle.words.size} PALAVRAS", color = Violet, fontSize = 10.sp, fontFamily = FontFamily.Monospace)
                }
            }
        }
        item {
            if (!keyboardVisible) LazyRow(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                items(session.puzzle.themeIds) { id -> Text(state.themes.find { it.id == id }?.name ?: id, color = Violet, fontSize = 10.sp, modifier = Modifier.clip(Corners).border(1.dp, Violet.copy(alpha = .25f), Corners).padding(horizontal = 9.dp, vertical = 7.dp)) }
            }
        }
        if (session.completed) item { VictoryPanel(session, vm) }
        item { NativePuzzleBoard(session, word, state.cursor, ::selectAndType) }
        item { Eyebrow(if (state.mode == Mode.CLASSIC) "PISTAS DA FREQUÊNCIA" else "PISTAS / DE CIMA PARA BAIXO") }
        items(session.puzzle.words, key = { it.id }) { clue ->
            val solved = clue.id in session.solved
            Row(Modifier.fillMaxWidth().clip(Corners).background(if (clue.id == word.id) Amber.copy(alpha = .07f) else Panel).border(1.dp, if (clue.id == word.id) Amber.copy(alpha = .4f) else Stroke, Corners).clickable { selectAndType(clue.id) }.padding(15.dp), verticalAlignment = Alignment.Top) {
                Text(if (solved) "✓" else clue.number.toString(), color = Amber, fontFamily = FontFamily.Monospace, fontSize = 12.sp, modifier = Modifier.width(25.dp))
                Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
                    Text(clue.clue, color = if (solved) Muted else Ink, fontSize = 12.sp, lineHeight = 20.sp)
                    Text("${clue.themeName} · ${clue.answer.length} letras${if (solved) " · ${clue.answer}" else ""}", color = if (solved) Amber else Muted, fontSize = 9.sp, lineHeight = 15.sp)
                }
            }
        }
        item { NeonButton("← SALVAR E VOLTAR AO MAPA", { focus.clearFocus(); vm.navigate(Screen.MAP) }, outline = true, modifier = Modifier.fillMaxWidth()) }
    }
        if (!session.completed) {
            Column(Modifier.fillMaxWidth().background(Panel).padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Eyebrow("${word.number} ${if (session.puzzle.mode == Mode.CLASSIC) if (word.direction == "across") "→ HORIZONTAL" else "↓ VERTICAL" else "/ LINHA"}")
                    Text("${word.answer.length} LETRAS", color = Muted, fontSize = 9.sp, fontFamily = FontFamily.Monospace)
                    TextButton(onClick = { keyboard?.hide(); focus.clearFocus() }, modifier = Modifier.height(28.dp).semantics { contentDescription = "Fechar teclado" }) { Text("⌄", color = Amber, fontSize = 20.sp) }
                }
                Text(word.clue, fontSize = 15.sp, lineHeight = 21.sp, color = Ink)
                GridKeyboardInput(vm, answerFocus, ImeAction.Done) { confirm() }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    NeonButton("CONECTAR →", { confirm() }, modifier = Modifier.weight(1f), enabled = word.id !in session.solved)
                    NeonButton("DICA ${(3 - session.hints).coerceAtLeast(0)}/3", { vm.hint() }, outline = true, enabled = word.id !in session.solved && session.hints < 3, modifier = Modifier.semantics { contentDescription = "Revelar uma letra, ${(3 - session.hints).coerceAtLeast(0)} dicas restantes" })
                }
                Text("${word.themeName} · ${(3 - session.hints).coerceAtLeast(0)} dicas restantes · ${session.mistakes} tentativas incorretas", color = Muted, fontSize = 10.sp, lineHeight = 18.sp)
            }
        }
    }
}

@Composable
private fun MagazinePlayPage(vm: GameViewModel) {
    val session=vm.state.session?:return
    val word=session.puzzle.words.firstOrNull { it.id==vm.state.activeWordId }?:session.puzzle.words.first()
    val focus=LocalFocusManager.current;val keyboard=LocalSoftwareKeyboardController.current
    val answerFocus=remember { FocusRequester() };val listState=rememberLazyListState()
    val keyboardVisible=WindowInsets.ime.getBottom(LocalDensity.current)>0
    var selectionRequest by remember { mutableIntStateOf(0) }
    var feedback by remember(session.puzzle.id) { mutableStateOf("") }
    LaunchedEffect(session.values) { feedback="" }
    fun selectAndType(id: String,cell: String?=null) { vm.selectWord(id,cell);selectionRequest++ }
    LaunchedEffect(selectionRequest) {
        if(selectionRequest>0&&!session.completed) { answerFocus.requestFocus();keyboard?.show();listState.scrollToItem(1) }
    }
    val fill=Engine.gridFill(session)
    fun nextWord() { vm.nextWord();selectionRequest++ }
    Column(Modifier.fillMaxSize()) {
        LazyColumn(Modifier.weight(1f).fillMaxWidth().padding(horizontal=12.dp),state=listState,contentPadding=PaddingValues(vertical=10.dp),verticalArrangement=Arrangement.spacedBy(12.dp)) {
            item {
                if(!keyboardVisible) Column(verticalArrangement=Arrangement.spacedBy(8.dp)) {
                    Eyebrow("CLÁSSICO / ${session.puzzle.difficulty.uppercase()}")
                    Text("Fase ${session.puzzle.level} · Cruzadas de revista",fontSize=21.sp,lineHeight=27.sp)
                    Text("Toque em uma pista ou casa. Preencha livremente e confira só a grade completa. Nenhum erro será apontado.",color=Muted,fontSize=12.sp,lineHeight=18.sp)
                }
            }
            item { NativeMagazineBoard(session,word,vm.state.cursor,::selectAndType) }
            if(session.completed) item { VictoryPanel(session,vm) }
            item { NeonButton("← SALVAR E VOLTAR AO MAPA",{ keyboard?.hide();focus.clearFocus();vm.navigate(Screen.MAP) },outline=true,modifier=Modifier.fillMaxWidth()) }
        }
        if(!session.completed) Column(Modifier.fillMaxWidth().background(Panel).padding(10.dp),verticalArrangement=Arrangement.spacedBy(5.dp)) {
            Row(Modifier.fillMaxWidth(),verticalAlignment=Alignment.CenterVertically) {
                Text("${word.number} ${if(word.direction=="across") "→ HORIZONTAL" else "↓ VERTICAL"} · ${word.answer.length} LETRAS",fontSize=10.sp,color=Amber,modifier=Modifier.weight(1f))
                TextButton(onClick={keyboard?.hide();focus.clearFocus()},modifier=Modifier.height(26.dp).semantics { contentDescription="Fechar teclado" }) { Text("⌄",color=Amber,fontSize=20.sp) }
            }
            Text(word.clue,color=Ink,fontSize=14.sp,lineHeight=18.sp)
            GridKeyboardInput(vm, answerFocus, ImeAction.Next) { nextWord() }
            Row(horizontalArrangement=Arrangement.spacedBy(8.dp)) {
                NeonButton("PRÓXIMA PALAVRA →",{nextWord()},outline=true,modifier=Modifier.weight(1f))
                NeonButton("DICA ${(3-session.hints).coerceAtLeast(0)}/3",{vm.hint()},outline=true,enabled=session.hints<3,modifier=Modifier.semantics { contentDescription="Revelar uma letra, ${(3-session.hints).coerceAtLeast(0)} dicas restantes" })
            }
            NeonButton("CONFERIR GRADE COMPLETA",{
                keyboard?.hide();focus.clearFocus()
                feedback=when(vm.checkGrid()) { "retry"->"A grade ainda não está correta. Revise suas respostas e confira novamente.";"incomplete"->"Preencha todas as casas antes de conferir.";else->"" }
            },enabled=fill.full,modifier=Modifier.fillMaxWidth())
            if(feedback.isNotEmpty()) Text(feedback,color=Muted,fontSize=11.sp,lineHeight=15.sp,modifier=Modifier.semantics { contentDescription="Resultado da conferência" })
            else if(!keyboardVisible) Text(if(fill.full) "Grade preenchida. Você já pode conferir." else "A conferência libera com todas as casas preenchidas.",color=Muted,fontSize=10.sp,lineHeight=14.sp)
        }
    }
}

/** Android IME connection only; all visible text is drawn in the grid cells. */
@Composable
private fun GridKeyboardInput(vm: GameViewModel,focus: FocusRequester,action: ImeAction,onConfirm: ()->Unit) {
    val session=vm.state.session?:return
    val word=session.puzzle.words.firstOrNull { it.id==vm.state.activeWordId }?:return
    val text=Engine.wordCells(word).joinToString("") { session.values[it.key]?:" " }
    val cursor=vm.state.cursor.coerceIn(0,word.answer.lastIndex)
    BasicTextField(value=TextFieldValue(text,TextRange(cursor,cursor+1)),onValueChange={input ->
        when {
            input.text.length==word.answer.length -> vm.updateGridDraft(input.text,input.selection.end)
            input.text.length==word.answer.length-1 &&
                (input.text==text.removeRange(cursor,cursor+1) ||
                    (cursor>0 && input.text==text.removeRange(cursor-1,cursor))) -> vm.eraseGridCell()
            input.text.startsWith(text.take(cursor)) && input.text.endsWith(text.drop(cursor+1)) &&
                input.text.length>word.answer.length -> {
                val inserted=Engine.normalizeAnswer(input.text.substring(cursor,input.text.length-(text.length-cursor-1)))
                val updated=text.toCharArray()
                inserted.take(updated.size-cursor).forEachIndexed { index,letter -> updated[cursor+index]=letter }
                vm.updateGridDraft(updated.concatToString(),cursor+inserted.length)
            }
            else -> vm.updateDraft(input.text)
        }
    },enabled=word.id !in session.solved,singleLine=true,modifier=Modifier.size(1.dp).alpha(0f).focusRequester(focus).semantics { contentDescription="Resposta para pista ${word.number}" },keyboardOptions=KeyboardOptions(capitalization=KeyboardCapitalization.Characters,autoCorrectEnabled=false,imeAction=action),keyboardActions=KeyboardActions(onDone={onConfirm()},onNext={onConfirm()}))
}

private fun cells(word: PuzzleWord): List<Cell> = Engine.wordCells(word)
private fun cellKey(cell: Cell) = "${cell.row}:${cell.col}"
private fun answerPrefix(session: Session, word: PuzzleWord): String = cells(word).map { session.values[cellKey(it)] ?: "" }.takeWhile { it.isNotEmpty() }.joinToString("")
private fun stars(session: Session) = Engine.getStars(session)
private fun score(session: Session) = Engine.getScore(session)

@Composable
private fun NativePuzzleBoard(session: Session, selected: PuzzleWord, cursor: Int, selectWord: (String,String?) -> Unit) {
    var zoom by rememberSaveable(session.puzzle.id) { mutableIntStateOf(0) }
    val all = session.puzzle.words.flatMap(::cells).map(::cellKey).toSet()
    val active = cells(selected).map(::cellKey).toSet()
    val solved = session.puzzle.words.filter { it.id in session.solved }.flatMap(::cells).map(::cellKey).toSet()
    val numbers = session.puzzle.words.associate { "${it.row}:${it.col}" to it.number }
    Column(Modifier.fillMaxWidth().clip(Corners).background(Panel).border(1.dp, Stroke, Corners)) {
        Row(Modifier.fillMaxWidth().padding(start = 14.dp, end = 5.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text(if (session.puzzle.mode == Mode.CLASSIC) "MATRIZ DE PALAVRAS" else "CONEXÕES EM CASCATA", color = Muted, fontSize = 9.sp, fontFamily = FontFamily.Monospace, modifier = Modifier.weight(1f))
            IconButton(onClick = { zoom = (zoom - 1).coerceAtLeast(0) }, enabled = zoom > 0, modifier = Modifier.semantics { contentDescription = "Diminuir grade" }) { Text("−", color = if (zoom > 0) Amber else Muted, fontSize = 23.sp) }
            IconButton(onClick = { zoom = (zoom + 1).coerceAtMost(2) }, enabled = zoom < 2, modifier = Modifier.semantics { contentDescription = "Ampliar grade" }) { Text("+", color = if (zoom < 2) Amber else Muted, fontSize = 23.sp) }
        }
        HorizontalDivider(color = Stroke)
        BoxWithConstraints(Modifier.fillMaxWidth().padding(12.dp)) {
            val fit = if (session.puzzle.mode == Mode.CASCADE) 32f else ((maxWidth.value - (session.puzzle.cols - 1) * 3) / session.puzzle.cols).coerceIn(28f, 38f)
            val cellSize = when (zoom) { 1 -> maxOf(fit, 36f).dp; 2 -> 44.dp; else -> fit.dp }
            Column(Modifier.heightIn(max = 310.dp).verticalScroll(rememberScrollState()).horizontalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(if (session.puzzle.mode == Mode.CASCADE) 13.dp else 3.dp)) {
                if (session.puzzle.mode == Mode.CASCADE) {
                    session.puzzle.words.forEach { word ->
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                            Text(word.number.toString().padStart(2, '0'), color = Muted, fontSize = 9.sp, fontFamily = FontFamily.Monospace, modifier = Modifier.width(23.dp))
                            cells(word).forEach { cell -> BoardCell(cellKey(cell), session, active, solved, null, cellSize,cell.key==cells(selected).getOrNull(cursor)?.key) { selectWord(word.id,cell.key) } }
                            if (word.id in session.solved) Text(" ✓", color = Amber, fontSize = 12.sp)
                        }
                    }
                } else {
                    repeat(session.puzzle.rows) { row ->
                        Row(horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                            repeat(session.puzzle.cols) { col ->
                                val key = "$row:$col"
                                if (key !in all) Spacer(Modifier.size(cellSize))
                                else BoardCell(key, session, active, solved, numbers[key], cellSize,key==cells(selected).getOrNull(cursor)?.key) {
                                    val matching = session.puzzle.words.filter { candidate -> cells(candidate).any { cellKey(it) == key } }
                                    val next = if (selected in matching && matching.size > 1) matching.first { it.id != selected.id } else matching.firstOrNull()
                                    next?.let { selectWord(it.id,key) }
                                }
                            }
                        }
                    }
                }
            }
        }
        Text("Arraste a grade para ver todas as casas. Toque em uma pista para escolher a palavra.", color = Muted.copy(alpha = .75f), fontSize = 10.sp, lineHeight = 17.sp, modifier = Modifier.padding(horizontal = 14.dp))
        Row(Modifier.fillMaxWidth().padding(14.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
            LinearProgressIndicator(progress = { session.solved.size.toFloat() / session.puzzle.words.size.coerceAtLeast(1) }, modifier = Modifier.weight(1f), color = Amber, trackColor = Stroke)
            Text("${session.solved.size * 100 / session.puzzle.words.size.coerceAtLeast(1)}% DO SINAL", color = Muted, fontFamily = FontFamily.Monospace, fontSize = 8.sp)
        }
    }
}

@Composable
private fun BoardCell(key: String, session: Session, active: Set<String>, solved: Set<String>, number: Int?, size: androidx.compose.ui.unit.Dp, cursor: Boolean, onClick: () -> Unit) {
    val isSolved = key in solved
    val isActive = key in active
    Box(Modifier.size(size).clip(RoundedCornerShape(2.dp)).background(when { isSolved -> Amber.copy(alpha = .14f); isActive -> Amber.copy(alpha = .10f); else -> Color(0xFF2D2633) }).border(if(cursor) 2.5.dp else 1.dp, if (isSolved || isActive) Amber.copy(alpha = if(cursor) 1f else .55f) else Color(0xFF4C3C53), RoundedCornerShape(2.dp)).clickable(onClick = onClick).semantics { contentDescription = "${if (number != null) "Palavra $number, " else ""}casa ${key.replace(':', ',')}, ${session.values[key] ?: "vazia"}" }, contentAlignment = Alignment.Center) {
        if (number != null) Text(number.toString(), color = Muted, fontSize = 8.sp, modifier = Modifier.align(Alignment.TopStart).padding(start = 2.dp))
        Text(session.values[key] ?: "", color = if (isSolved || isActive || session.revealed.containsKey(key)) Amber else Ink, fontFamily = FontFamily.Monospace, fontSize = 14.sp)
    }
}

@Composable
private fun VictoryPanel(session: Session, vm: GameViewModel) {
    PanelBox {
        Text("★".repeat(stars(session)) + "☆".repeat(3 - stars(session)), color = Amber, fontSize = 37.sp, modifier = Modifier.align(Alignment.CenterHorizontally))
        Text(if (session.puzzle.level == 100) "Você decifrou a cidade." else "Conexão estabelecida.", color = Ink, fontSize = 24.sp)
        Text("${score(session)} pontos · ${timeLabel(session.elapsed)} · ${session.hints} dicas", color = Muted, fontSize = 12.sp)
        NeonButton(if (session.puzzle.level < 100) "PRÓXIMA FREQUÊNCIA →" else "VER MINHAS CONQUISTAS", { if (session.puzzle.level < 100) vm.prepare(session.puzzle.mode, session.puzzle.level + 1) else vm.navigate(Screen.STATS) }, modifier = Modifier.fillMaxWidth())
        NeonButton("JOGAR NOVAMENTE ↻", { vm.prepare(session.puzzle.mode, session.puzzle.level, replay = true) }, outline = true, modifier = Modifier.fillMaxWidth())
    }
}

@Composable
private fun SyncDialog(vm: GameViewModel, onDismiss: () -> Unit) {
    val state = vm.state
    var input by rememberSaveable { mutableStateOf("") }
    val clipboard = LocalClipboardManager.current
    var copied by rememberSaveable { mutableStateOf(false) }
    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Surface(Modifier.fillMaxWidth().padding(20.dp).heightIn(max = 660.dp), color = Panel, shape = Corners, border = androidx.compose.foundation.BorderStroke(1.dp, Stroke)) {
        Column(Modifier.verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text("Seu sinal em todo lugar.", color = Amber, fontSize = 23.sp)
            Text("Crie um código em um aparelho e cole no outro. O mesmo código conecta as campanhas de Daniel e Larissa entre site e app Android.", color = Muted, fontSize = 12.sp, lineHeight = 21.sp)
            if (state.syncCode.isNotBlank()) {
                Text("CÓDIGO CONECTADO", color = Violet, fontFamily = FontFamily.Monospace, fontSize = 9.sp)
                Text(vm.formattedSyncCode(), color = Ink, fontFamily = FontFamily.Monospace, fontSize = 12.sp, lineHeight = 20.sp)
                NeonButton(if (copied) "CÓDIGO COPIADO ✓" else "COPIAR CÓDIGO", { clipboard.setText(AnnotatedString(vm.formattedSyncCode())); copied = true }, outline = true, modifier = Modifier.fillMaxWidth())
                NeonButton("SINCRONIZAR AGORA ↻", { vm.syncNow() }, modifier = Modifier.fillMaxWidth(), enabled = !state.syncing)
            } else NeonButton("CRIAR MEU CÓDIGO", { vm.connectDevices(vm.newSyncCode(), create = true) }, modifier = Modifier.fillMaxWidth(), enabled = !state.syncing)
            HorizontalDivider(color = Stroke)
            OutlinedTextField(value = input, onValueChange = { input = it.take(70); copied = false }, label = { Text("Código do outro aparelho", fontSize = 11.sp) }, modifier = Modifier.fillMaxWidth(), textStyle = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace), singleLine = true, shape = Corners, keyboardOptions = KeyboardOptions(autoCorrectEnabled = false, imeAction = ImeAction.Done), keyboardActions = KeyboardActions(onDone = { if (input.isNotBlank()) vm.connectDevices(input) }))
            NeonButton("CONECTAR ESTE APARELHO", { vm.connectDevices(input) }, outline = true, modifier = Modifier.fillMaxWidth(), enabled = input.isNotBlank() && !state.syncing)
            if (state.syncing) LinearProgressIndicator(modifier = Modifier.fillMaxWidth(), color = Violet, trackColor = Stroke)
            Text(state.syncStatus, color = if (state.syncConflict) Coral else Muted, fontSize = 12.sp, lineHeight = 20.sp)
            Text("Guarde seu código. Ele dá acesso aos dois perfis. Sem internet, o progresso continua salvo no aparelho.", color = Muted, fontSize = 10.sp, lineHeight = 18.sp)
            TextButton(onClick = onDismiss, modifier = Modifier.align(Alignment.End)) { Text("FECHAR") }
        }
        }
    }
}

@Composable
private fun Tip(text: String) {
    Text(text, color = Muted, fontSize = 12.sp, lineHeight = 21.sp, modifier = Modifier.fillMaxWidth().background(Amber.copy(alpha = .035f)).border(1.dp, Amber.copy(alpha = .1f)).padding(16.dp))
}

@Composable
private fun TerminalFooter() {
    Column(Modifier.fillMaxWidth().padding(top = 5.dp, bottom = 12.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        HorizontalDivider(color = Stroke)
        Text("NOVA AURORA  //  NEON LÉXICO", color = Muted.copy(alpha = .6f), fontFamily = FontFamily.Monospace, fontSize = 8.sp, letterSpacing = .5.sp)
    }
}

@Composable
private fun ProfileArt(id: String, modifier: Modifier = Modifier) {
    val color = if (id == "daniel") Amber else Violet
    Canvas(modifier.clip(Corners).background(color.copy(alpha = .06f)).semantics { contentDescription = if (id == "daniel") "Avatar de Daniel: circuito de palavras" else "Avatar de Larissa: coração de neon" }) {
        val unit = min(size.width, size.height) / 9f
        val rows = if (id == "daniel") listOf("..111..", "..1....", "1111111", "..1.1..", "..111..", "....1..", "..111..") else listOf(".11.11.", "1111111", "1111111", ".11111.", "..111..", "...1...")
        val left = (size.width - unit * 7) / 2
        val top = (size.height - unit * rows.size) / 2
        rows.forEachIndexed { row, line -> line.forEachIndexed { col, char -> if (char == '1') {
            drawRect(color.copy(alpha = if ((row + col) % 3 == 0) .85f else .32f), Offset(left + col * unit, top + row * unit), Size(unit - 3f, unit - 3f))
        } } }
    }
}

@Composable
private fun MiniBoard(mode: Mode, modifier: Modifier = Modifier) {
    if(mode==Mode.MAGAZINE) {
        val paper=Color(0xFFFFFDF7);val line=Color(0xFF79654D)
        Column(modifier.background(paper).border(1.dp,line)) {
            listOf(listOf("↓","↓","↓","↓"),listOf("→","S","O","L"),listOf("→","A","S","A"),listOf("→","R","I","O")).forEachIndexed { row,values ->
                Row(Modifier.weight(1f).fillMaxWidth()) {
                    values.forEachIndexed { col,value -> Box(Modifier.weight(1f).fillMaxHeight().background(if(row==0||col==0) Color(0xFFE9E5DC) else paper).border(.5.dp,line),contentAlignment=Alignment.Center) { Text(value,fontSize=8.sp,color=Color(0xFF302A23),fontWeight=FontWeight.Bold) } }
                }
            }
        }
        return
    }
    Canvas(modifier) {
        val unit = size.width / 5f
        repeat(5) { row -> repeat(5) { col ->
            if (!(mode == Mode.CASCADE && col < row / 2 || mode == Mode.CLASSIC && row % 2 == 1 && col != 2)) {
                val color = if (mode == Mode.CLASSIC) Amber else Violet
                drawRect(color.copy(alpha = .28f), Offset(col * unit, row * unit), Size(unit - 3f, unit - 3f))
                if ((row + col) % 2 == 0) drawRect(color.copy(alpha = .55f), Offset(col * unit + 5f, row * unit + 5f), Size(unit / 3f, unit / 3f))
            }
        } }
    }
}

@Composable
private fun CitySignal(modifier: Modifier = Modifier) {
    Canvas(modifier.semantics { contentDescription = "Horizonte de Nova Aurora iluminado por neon" }) {
        val w = size.width; val h = size.height
        drawCircle(Violet.copy(alpha = .04f), radius = h * .46f, center = Offset(w * .70f, h * .44f))
        drawCircle(Violet.copy(alpha = .13f), radius = h * .34f, center = Offset(w * .70f, h * .44f), style = androidx.compose.ui.graphics.drawscope.Stroke(width = 1.4f))
        repeat(9) { index ->
            val x = w * (.05f + index * .102f)
            val bw = w * .072f
            val bh = h * listOf(.36f, .53f, .42f, .68f, .47f, .73f, .51f, .60f, .38f)[index]
            val y = h * .89f - bh
            val color = if (index % 3 == 0) Coral else if (index % 2 == 0) Amber else Violet
            drawRect(PanelRaised, Offset(x, y), Size(bw, bh))
            drawLine(color.copy(alpha = .45f), Offset(x, y), Offset(x + bw, y), strokeWidth = 2f)
            drawLine(color.copy(alpha = .15f), Offset(x, y), Offset(x, h * .89f), strokeWidth = 1f)
            val windows = (bh / (h * .10f)).toInt()
            repeat(windows) { floor -> repeat(2) { col ->
                val lit = (floor + col + index) % 3 != 0
                drawRect(color.copy(alpha = if (lit) .36f else .07f), Offset(x + bw * (.19f + col * .43f), y + h * .045f + floor * h * .09f), Size(bw * .16f, h * .025f))
            } }
            if (index == 3 || index == 5) { drawLine(color.copy(alpha = .6f), Offset(x + bw / 2, y), Offset(x + bw / 2, y - h * .08f), 1.5f); drawCircle(color, radius = 2.5f, center = Offset(x + bw / 2, y - h * .08f)) }
        }
        drawLine(Amber.copy(alpha = .25f), Offset(w * .04f, h * .9f), Offset(w * .96f, h * .9f), 1f)
        repeat(6) { index -> drawLine(Violet.copy(alpha = .05f), Offset(w * .18f * index, h * .92f), Offset(w * .5f, h * .75f), 1f) }
    }
}
