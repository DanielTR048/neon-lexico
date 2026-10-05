package com.neonlexico.game

enum class Mode(val wire: String, val title: String) { CLASSIC("classic", "Palavras cruzadas"), MAGAZINE("magazine", "Clássico"), CASCADE("cascade", "Efeito cascata"); companion object { fun fromWire(value: String) = entries.first { it.wire == value } } }
enum class Screen { HOME, MAP, SETUP, PLAY, THEMES, STATS, SETTINGS }
data class Cell(val row: Int, val col: Int) { val key: String get() = "$row:$col" }
data class Entry(val id: String, val answer: String, val clue: String, val difficulty: Int)
data class Theme(val id: String, val name: String, val icon: String, val description: String, val entries: List<Entry>)
data class PuzzleWord(val id: String, val answer: String, val clue: String, val difficulty: Int, val themeId: String, val themeName: String, val row: Int, val col: Int, val direction: String, val number: Int)
data class Puzzle(val id: String, val mode: Mode, val level: Int, val themeIds: List<String>, val words: List<PuzzleWord>, val rows: Int, val cols: Int, val difficulty: String)
data class Session(val puzzle: Puzzle, val values: Map<String, String> = emptyMap(), val solved: List<String> = emptyList(), val revealed: Map<String, String> = emptyMap(), val mistakes: Int = 0, val hints: Int = 0, val elapsed: Int = 0, val completed: Boolean = false)
data class LevelResult(val stars: Int, val score: Int, val seconds: Int)
data class Settings(val sound: Boolean = true, val reducedMotion: Boolean = false)
data class SaveData(val seed: String = Engine.randomSeed(), val results: Map<Mode, Map<String, LevelResult>> = Mode.entries.associateWith { emptyMap() }, val sessions: Map<String, Session> = emptyMap(), val settings: Settings = Settings())
data class PlayerSummary(val id: String, val name: String)
val FIXED_PLAYERS = listOf(PlayerSummary("daniel", "Daniel"), PlayerSummary("larissa", "Larissa"))
data class State(val players: List<PlayerSummary> = FIXED_PLAYERS, val activeProfileId: String? = null, val save: SaveData = SaveData(), val screen: Screen = Screen.HOME, val mode: Mode = Mode.CLASSIC, val level: Int = 1, val selectedThemes: List<Theme> = emptyList(), val themes: List<Theme> = emptyList(), val activeWordId: String = "", val syncCode: String = "", val syncStatus: String = "Salvo neste aparelho", val syncing: Boolean = false, val syncConflict: Boolean = false, val error: String? = null, val cursor: Int = 0) {
    val session: Session? get() = save.sessions["${mode.wire}:$level"]
}
