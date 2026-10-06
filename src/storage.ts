import { cellKey, clueCell, getScore, getStars, randomSeed, wordCells } from './engine';
import { MODES } from './types';
import type { LevelResult, Mode, Puzzle, PuzzleWord, SaveData, Session } from './types';

export const STORAGE_KEY = 'neon-lexico:v1';
export type ProfileId = 'daniel' | 'larissa';
export const profileKey = (id: ProfileId = 'daniel') => id === 'daniel' ? STORAGE_KEY : `${STORAGE_KEY}:larissa`;
const MAX_BACKUP_BYTES = 8_000_000;

export function createSave(): SaveData {
  return {
    version: 1,
    seed: randomSeed(),
    results: { classic: {}, magazine: {}, cascade: {} },
    sessions: {},
    settings: { sound: true, reducedMotion: false },
  };
}

function invalid(detail: string): never {
  throw new Error(`Backup inválido: ${detail}.`);
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(label);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) invalid(label);
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some(key => ['__proto__', 'prototype', 'constructor'].includes(key))) invalid(label);
  return record;
}

function exactKeys(value: Record<string, unknown>, expected: string[], label: string): void {
  const keys = Object.keys(value);
  if (keys.length !== expected.length || keys.some(key => !expected.includes(key))) invalid(label);
}

function text(value: unknown, label: string, limit = 200): string {
  if (typeof value !== 'string' || !value.length || value.length > limit || /[\u0000-\u001f\u007f]/.test(value)) invalid(label);
  return value;
}

function identifier(value: unknown, label: string, limit = 120): string {
  const result = text(value, label, limit);
  if (!/^[a-zA-Z0-9_:-]+$/.test(result)) invalid(label);
  return result;
}

function number(value: unknown, label: string, min: number, max: number, integer = true): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) invalid(label);
  return value;
}

function bool(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') invalid(label);
  return value;
}

function stringList(value: unknown, label: string, max: number): string[] {
  if (!Array.isArray(value) || value.length > max) invalid(label);
  const result = value.map(item => identifier(item, label));
  if (new Set(result).size !== result.length) invalid(label);
  return result;
}

function resultFrom(value: unknown): LevelResult {
  const source = object(value, 'resultado');
  exactKeys(source, ['stars', 'score', 'seconds'], 'campos do resultado');
  return {
    stars: number(source.stars, 'estrelas', 0, 3),
    score: number(source.score, 'pontuação', 0, 10_000_000),
    seconds: number(source.seconds, 'tempo do resultado', 0, 1_000_000_000, false),
  };
}

function puzzleFrom(value: unknown): Puzzle {
  const source = object(value, 'fase');
  exactKeys(source, ['id', 'mode', 'level', 'themeIds', 'words', 'rows', 'cols', 'difficulty'], 'campos da fase');
  if (!MODES.includes(source.mode as Mode)) invalid('modo');
  const mode = source.mode as Mode;
  const level = number(source.level, 'número da fase', 1, 100);
  // Magazine frames draw from the whole catalog: the five drawn themes first, then any other used.
  const themeIds = stringList(source.themeIds, 'temas', mode === 'magazine' ? 64 : 5);
  if (mode === 'magazine' ? themeIds.length < 5 : themeIds.length !== 5) invalid('a fase deve ter cinco temas');
  const rows = number(source.rows, 'linhas', 1, 64);
  const cols = number(source.cols, 'colunas', 1, 64);
  if (!Array.isArray(source.words) || source.words.length < 1 || source.words.length > 100) invalid('palavras');
  const words: PuzzleWord[] = source.words.map(item => {
    const word = object(item, 'palavra');
    exactKeys(word, ['id', 'answer', 'clue', 'difficulty', 'themeId', 'themeName', 'row', 'col', 'direction', 'number'], 'campos da palavra');
    const answer = text(word.answer, 'resposta', 40);
    if (!/^[A-Z]+$/.test(answer)) invalid('formato da resposta');
    const themeId = identifier(word.themeId, 'tema da palavra');
    if (!themeIds.includes(themeId)) invalid('tema desconhecido na fase');
    if (word.direction !== 'across' && word.direction !== 'down') invalid('direção da palavra');
    const row = number(word.row, 'linha da palavra', 0, rows - 1);
    const col = number(word.col, 'coluna da palavra', 0, cols - 1);
    if ((word.direction === 'across' ? col : row) + answer.length > (word.direction === 'across' ? cols : rows)) invalid('palavra fora da grade');
    return {
      id: identifier(word.id, 'identificador da palavra'),
      answer,
      clue: text(word.clue, 'dica', 600),
      difficulty: number(word.difficulty, 'dificuldade da palavra', 1, 3) as 1 | 2 | 3,
      themeId,
      themeName: text(word.themeName, 'nome do tema', 100),
      row, col,
      direction: word.direction,
      number: number(word.number, 'número da palavra', 1, 100),
    };
  });
  if (new Set(words.map(word => word.id)).size !== words.length) invalid('palavras repetidas');
  const puzzle: Puzzle = {
    id: text(source.id, 'identificador da fase', 700), mode, level, themeIds, words, rows, cols,
    difficulty: text(source.difficulty, 'dificuldade', 60),
  };
  solutionCells(puzzle);
  if (mode === 'magazine') {
    const letters = new Set(words.flatMap(wordCells).map(cell => cell.key));
    if (words.some(word => { const clue = clueCell(word); return clue.row < 0 || clue.col < 0 || letters.has(clue.key); })) invalid('casa de pista inválida');
  }
  return puzzle;
}

function solutionCells(puzzle: Puzzle): Record<string, string> {
  const cells: Record<string, string> = {};
  for (const word of puzzle.words) {
    Array.from(word.answer).forEach((letter, index) => {
      const key = cellKey(word.row + (word.direction === 'down' ? index : 0), word.col + (word.direction === 'across' ? index : 0));
      if (cells[key] && cells[key] !== letter) invalid('cruzamento inconsistente');
      cells[key] = letter;
    });
  }
  return cells;
}

function lettersFrom(value: unknown, solution: Record<string, string>, revealed: boolean): Record<string, string> {
  const source = object(value, revealed ? 'letras reveladas' : 'letras preenchidas');
  const entries = Object.entries(source);
  if (entries.length > Object.keys(solution).length) invalid('quantidade de letras');
  const result: Record<string, string> = {};
  for (const [key, letter] of entries) {
    if (!Object.hasOwn(solution, key) || typeof letter !== 'string' || !/^[A-Z]$/.test(letter)) invalid('letra ou célula');
    if (revealed && solution[key] !== letter) invalid('letra revelada incorreta');
    result[key] = letter;
  }
  return result;
}

function sessionFrom(value: unknown): Session {
  const source = object(value, 'partida');
  exactKeys(source, ['puzzle', 'values', 'solved', 'revealed', 'mistakes', 'hints', 'elapsed', 'completed'], 'campos da partida');
  const puzzle = puzzleFrom(source.puzzle);
  const solution = solutionCells(puzzle);
  const solved = stringList(source.solved, 'palavras resolvidas', puzzle.words.length);
  if (solved.some(id => !puzzle.words.some(word => word.id === id))) invalid('palavra resolvida desconhecida');
  const completed = bool(source.completed, 'estado de conclusão');
  if (completed !== (solved.length === puzzle.words.length)) invalid('estado de conclusão inconsistente');
  if (puzzle.mode === 'magazine' && !completed && solved.length) invalid('conferência parcial no clássico');
  const values = lettersFrom(source.values, solution, false);
  const revealed = lettersFrom(source.revealed, solution, true);
  for (const [key, letter] of Object.entries(revealed)) {
    if (values[key] !== letter) invalid('letra revelada inconsistente');
  }
  for (const word of puzzle.words.filter(word => solved.includes(word.id))) {
    for (let index = 0; index < word.answer.length; index += 1) {
      const key = cellKey(word.row + (word.direction === 'down' ? index : 0), word.col + (word.direction === 'across' ? index : 0));
      if (values[key] !== word.answer[index] || revealed[key] !== word.answer[index]) invalid('palavra resolvida inconsistente');
    }
  }
  return {
    puzzle,
    values,
    solved,
    revealed,
    mistakes: number(source.mistakes, 'erros', 0, 1_000_000),
    hints: number(source.hints, 'dicas utilizadas', 0, 1_000_000),
    elapsed: number(source.elapsed, 'tempo da partida', 0, 1_000_000_000, false),
    completed,
  };
}

/** Parse untrusted backup data into fresh, bounded objects. Never evaluates content. */
export function importSave(json: string): SaveData {
  if (typeof json !== 'string' || json.length > MAX_BACKUP_BYTES) invalid('arquivo muito grande');
  let parsed: unknown;
  try { parsed = JSON.parse(json); } catch { invalid('o arquivo não contém JSON válido'); }
  const source = object(parsed, 'estrutura');
  exactKeys(source, ['version', 'seed', 'results', 'sessions', 'settings'], 'campos do arquivo');
  if (source.version !== 1) invalid('versão não compatível');
  const seed = text(source.seed, 'semente', 128);
  const resultsSource = object(source.results, 'resultados');
  exactKeys(resultsSource, Object.hasOwn(resultsSource, 'magazine') ? MODES : ['classic', 'cascade'], 'modos dos resultados');
  const results: SaveData['results'] = { classic: {}, magazine: {}, cascade: {} };
  for (const mode of MODES) {
    if (mode === 'magazine' && !Object.hasOwn(resultsSource, mode)) continue;
    const modeResults = object(resultsSource[mode], 'resultados do modo');
    if (Object.keys(modeResults).length > 100) invalid('quantidade de resultados');
    for (const [level, value] of Object.entries(modeResults)) {
      if (!/^(?:[1-9]\d?|100)$/.test(level)) invalid('fase do resultado');
      results[mode][level] = resultFrom(value);
    }
  }
  const sessionsSource = object(source.sessions, 'partidas');
  if (Object.keys(sessionsSource).length > 300) invalid('quantidade de partidas');
  const sessions: SaveData['sessions'] = {};
  for (const [key, value] of Object.entries(sessionsSource)) {
    if (!/^(classic|magazine|cascade):(?:[1-9]\d?|100)$/.test(key)) invalid('identificador da partida');
    const session = sessionFrom(value);
    if (key !== `${session.puzzle.mode}:${session.puzzle.level}`) invalid('partida em fase incorreta');
    sessions[key] = session;
  }
  const settingsSource = object(source.settings, 'preferências');
  exactKeys(settingsSource, ['sound', 'reducedMotion'], 'campos das preferências');
  return {
    version: 1, seed, results, sessions,
    settings: { sound: bool(settingsSource.sound, 'som'), reducedMotion: bool(settingsSource.reducedMotion, 'animações') },
  };
}

export function readProfile(id: ProfileId = 'daniel'): SaveData | null {
  try {
    const json = localStorage.getItem(profileKey(id));
    return json ? importSave(json) : null;
  } catch { return null; }
}

export function loadSave(id: ProfileId = 'daniel'): SaveData { return readProfile(id) ?? createSave(); }

export function saveGame(data: SaveData, id: ProfileId = 'daniel'): boolean {
  try {
    localStorage.setItem(profileKey(id), JSON.stringify(data));
    return true;
  } catch { return false; }
}

export function exportSave(data: SaveData): string {
  return JSON.stringify(data, null, 2);
}

export function unlockedLevel(save: SaveData, mode: Mode): number {
  for (let level = 1; level <= 100; level += 1) {
    if (!save.results[mode][String(level)]) return level;
  }
  return 100;
}

export function recordCompletion(save: SaveData, session: Session): SaveData {
  const { mode, level } = session.puzzle;
  const next: SaveData = {
    ...save,
    settings: { ...save.settings },
    results: { classic: { ...save.results.classic }, magazine: { ...save.results.magazine }, cascade: { ...save.results.cascade } },
    sessions: { ...save.sessions, [`${mode}:${level}`]: structuredClone(session) },
  };
  if (!session.completed) return next;
  const previous = next.results[mode][String(level)];
  next.results[mode][String(level)] = {
    stars: Math.max(previous?.stars ?? 0, getStars(session)),
    score: Math.max(previous?.score ?? 0, getScore(session)),
    seconds: Math.min(previous?.seconds ?? Infinity, Math.floor(session.elapsed)),
  };
  return next;
}
