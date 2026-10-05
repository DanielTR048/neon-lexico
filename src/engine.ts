import { themes, beginnerThemeIds } from './content';
import type { Entry, Mode, Puzzle, PuzzleWord, Session, Theme } from './types';

type Random = () => number;
type Cell = { letter: string; across: boolean; down: boolean };
type Candidate = { entry: Entry; theme: Theme };
type Placement = Candidate & { row: number; col: number; direction: 'across' | 'down'; score: number };

export function normalizeAnswer(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]/g, '');
}

export function randomSeed(): string {
  const bytes = new Uint32Array(2);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else { bytes[0] = Date.now() >>> 0; bytes[1] = Math.floor(Math.random() * 0x100000000); }
  return Array.from(bytes, n => n.toString(36)).join('-');
}

function rng(seed: string): Random {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i++) { state ^= seed.charCodeAt(i); state = Math.imul(state, 16777619); }
  return () => {
    state += 0x6D2B79F5;
    let x = state;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: readonly T[], random: Random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function validateLevel(level: number): void {
  if (!Number.isInteger(level) || level < 1 || level > 100) throw new RangeError('A fase deve estar entre 1 e 100.');
}

export function drawThemes(seed: string, mode: Mode, level: number): Theme[] {
  validateLevel(level);
  const pool = level <= 20 ? themes.filter(theme => beginnerThemeIds.includes(theme.id)) : themes;
  return shuffled(pool, rng(`${seed}:${mode}:${level}:themes`)).slice(0, 5);
}

export const MAX_HINTS = 3;
export function phaseRules(mode: Mode, level: number) {
  const difficulty = level <= 20 ? 1 : level <= 60 ? 2 : 3;
  const maxLength = level <= 10 ? 6 : level <= 20 ? 8 : level <= 40 ? 10 : level <= 60 ? 12 : level <= 80 ? 15 : 20;
  const count = mode !== 'cascade' ? Math.min(30, 12 + Math.floor((level - 1) / 5)) : Math.min(14, 5 + Math.floor((level - 1) / 10));
  return { difficulty, maxLength, count };
}

export function cellKey(row: number, col: number): string { return `${row}:${col}`; }

export function wordCells(word: PuzzleWord): Array<{ row: number; col: number; key: string; letter: string }> {
  return Array.from(word.answer, (letter, index) => {
    const row = word.row + (word.direction === 'down' ? index : 0);
    const col = word.col + (word.direction === 'across' ? index : 0);
    return { row, col, key: cellKey(row, col), letter };
  });
}

/** Arrowword clues occupy the empty square immediately before their answer. */
export function clueCell(word: PuzzleWord) {
  const row = word.row - (word.direction === 'down' ? 1 : 0);
  const col = word.col - (word.direction === 'across' ? 1 : 0);
  return { row, col, key: cellKey(row, col) };
}

export function gridFill(session: Session) {
  const keys = new Set(session.puzzle.words.flatMap(wordCells).map(cell => cell.key));
  const filled = [...keys].filter(key => !!session.values[key]).length;
  return { filled, total: keys.size, full: filled === keys.size };
}

/** Only the final whole-grid check may disclose correctness in magazine mode. */
export function checkGrid(session: Session): { session: Session; status: 'incomplete' | 'retry' | 'complete' } {
  if (!gridFill(session).full) return { session, status: 'incomplete' };
  if (session.completed) return { session, status: 'complete' };
  if (!session.puzzle.words.flatMap(wordCells).every(cell => session.values[cell.key] === cell.letter)) {
    return { session: { ...cloneSession(session), mistakes: session.mistakes + 1 }, status: 'retry' };
  }
  const next = cloneSession(session);
  next.solved = next.puzzle.words.map(word => word.id);
  next.completed = true;
  for (const word of next.puzzle.words) revealWord(next, word);
  return { session: next, status: 'complete' };
}

function candidatePool(selected: Theme[], random: Random, mode: Mode, level: number): Candidate[] {
  const rules = phaseRules(mode, level);
  return shuffled(selected.flatMap(theme => theme.entries.map(entry => ({
    theme,
    entry: { ...entry, answer: normalizeAnswer(entry.answer), id: `${theme.id}:${entry.id}` },
  }))).filter(candidate => candidate.entry.answer.length >= 3 && candidate.entry.answer.length <= rules.maxLength && (level > 20 || candidate.entry.difficulty === 1)), random);
}

function toWord(candidate: Candidate, row: number, col: number, direction: 'across' | 'down'): PuzzleWord {
  return { ...candidate.entry, themeId: candidate.theme.id, themeName: candidate.theme.name, row, col, direction, number: 0 };
}

function crossword(pool: Candidate[], selected: Theme[], count: number, level: number, random: Random): PuzzleWord[] | null {
  const board = new Map<string, Cell>();
  const words: PuzzleWord[] = [];
  const used = new Set<string>();
  const covered = new Set<string>();
  let minRow = 0, maxRow = 0, minCol = 0, maxCol = 0;
  const targetDifficulty = phaseRules('classic', level).difficulty;

  function add(candidate: Candidate, row: number, col: number, direction: 'across' | 'down'): void {
    const word = toWord(candidate, row, col, direction);
    words.push(word);
    used.add(word.answer);
    covered.add(word.themeId);
    for (const cell of wordCells(word)) {
      const existing = board.get(cell.key) ?? { letter: cell.letter, across: false, down: false };
      existing[direction] = true;
      board.set(cell.key, existing);
      minRow = Math.min(minRow, cell.row); maxRow = Math.max(maxRow, cell.row);
      minCol = Math.min(minCol, cell.col); maxCol = Math.max(maxCol, cell.col);
    }
  }

  const starts = pool.filter(candidate => candidate.entry.answer.length >= 5 && candidate.entry.answer.length <= 12);
  const start = (starts.length ? starts : pool)[Math.floor(random() * (starts.length || pool.length))];
  if (!start) return null;
  add(start, 0, 0, random() < 0.5 ? 'across' : 'down');

  function bestPlacement(candidate: Candidate): Placement | null {
    const answer = candidate.entry.answer;
    let best: Placement | null = null;
    const seen = new Set<string>();
    for (const [key, existing] of board) {
      const [crossRow, crossCol] = key.split(':').map(Number);
      for (let index = 0; index < answer.length; index++) {
        if (answer[index] !== existing.letter) continue;
        for (const direction of ['across', 'down'] as const) {
          if (existing[direction]) continue;
          const row = crossRow - (direction === 'down' ? index : 0);
          const col = crossCol - (direction === 'across' ? index : 0);
          const signature = `${row}:${col}:${direction}`;
          if (seen.has(signature)) continue;
          seen.add(signature);
          const dr = direction === 'down' ? 1 : 0, dc = direction === 'across' ? 1 : 0;
          const endRow = row + dr * (answer.length - 1), endCol = col + dc * (answer.length - 1);
          const height = Math.max(maxRow, endRow) - Math.min(minRow, row) + 1;
          const width = Math.max(maxCol, endCol) - Math.min(minCol, col) + 1;
          if (height > 28 || width > 28) continue;
          if (board.has(cellKey(row - dr, col - dc)) || board.has(cellKey(endRow + dr, endCol + dc))) continue;
          let crossings = 0, valid = true;
          for (let i = 0; i < answer.length; i++) {
            const r = row + dr * i, c = col + dc * i;
            const occupied = board.get(cellKey(r, c));
            if (occupied) {
              if (occupied.letter !== answer[i] || occupied[direction]) { valid = false; break; }
              crossings++;
            } else if (board.has(cellKey(r - dc, c - dr)) || board.has(cellKey(r + dc, c + dr))) {
              valid = false; break;
            }
          }
          if (!valid || crossings === 0) continue;
          const difficultyPenalty = Math.abs(candidate.entry.difficulty - targetDifficulty) * 6;
          const score = crossings * 34 - height * width * 0.18 - Math.abs(height - width) * 0.6 - difficultyPenalty + random() * 5;
          if (!best || score > best.score) best = { ...candidate, row, col, direction, score };
        }
      }
    }
    return best;
  }

  while (words.length < count) {
    const missing = selected.filter(theme => !covered.has(theme.id));
    // Missing themes have priority. An extra word can bridge a difficult theme,
    // but never consume a slot that a still-missing theme requires.
    const remaining = count - words.length;
    let best: Placement | null = null;
    for (const candidate of pool) {
      if (used.has(candidate.entry.answer)) continue;
      const needed = !covered.has(candidate.theme.id);
      if (missing.length && !needed) continue;
      const placement = bestPlacement(candidate);
      if (placement && (!best || placement.score > best.score)) best = placement;
    }
    if (!best && remaining > missing.length) {
      for (const candidate of pool) {
        if (used.has(candidate.entry.answer)) continue;
        const placement = bestPlacement(candidate);
        if (placement && (!best || placement.score > best.score)) best = placement;
      }
    }
    if (!best) return null;
    add(best, best.row, best.col, best.direction);
  }
  if (covered.size !== 5) return null;
  const normalized = words.map(word => ({ ...word, row: word.row - minRow, col: word.col - minCol }));
  const startsSorted = [...new Set(normalized.map(word => cellKey(word.row, word.col)))].sort((a, b) => {
    const [ar, ac] = a.split(':').map(Number), [br, bc] = b.split(':').map(Number);
    return ar - br || ac - bc;
  });
  return normalized.map(word => ({ ...word, number: startsSorted.indexOf(cellKey(word.row, word.col)) + 1 }))
    .sort((a, b) => a.number - b.number || a.direction.localeCompare(b.direction));
}

function cascade(pool: Candidate[], selected: Theme[], count: number, level: number, random: Random): PuzzleWord[] | null {
  const words: PuzzleWord[] = [];
  const used = new Set<string>();
  const covered = new Set<string>();
  const targetDifficulty = phaseRules('cascade', level).difficulty;
  while (words.length < count) {
    const previous = words.at(-1)?.answer;
    const missing = selected.filter(theme => !covered.has(theme.id));
    const candidates = pool.filter(candidate => !used.has(candidate.entry.answer)
      && (!missing.length || !covered.has(candidate.theme.id))
      && (!previous || Array.from(candidate.entry.answer).some(letter => previous.includes(letter))));
    if (!candidates.length) return null;
    const earlierLetters = new Set(words.slice(0, -1).flatMap(word => [...word.answer]));
    candidates.sort((a, b) => {
      const priority = (candidate: Candidate) => {
        const freshLink = previous && [...candidate.entry.answer].some(letter => previous.includes(letter) && !earlierLetters.has(letter));
        return (freshLink ? 5 : 0) - Math.abs(candidate.entry.difficulty - targetDifficulty) * 3;
      };
      return priority(b) - priority(a);
    });
    const topPriority = candidates.filter(candidate => candidate.entry.difficulty === candidates[0].entry.difficulty).slice(0, 4);
    const selectedCandidate = topPriority[Math.floor(random() * topPriority.length)] ?? candidates[0];
    words.push({ ...toWord(selectedCandidate, words.length, 0, 'across'), number: words.length + 1 });
    used.add(selectedCandidate.entry.answer);
    covered.add(selectedCandidate.theme.id);
  }
  return covered.size === 5 ? words : null;
}

export function generatePuzzle(seed: string, mode: Mode, level: number, themeIds?: string[]): Puzzle {
  validateLevel(level);
  const selected = themeIds ? themeIds.map(id => themes.find(theme => theme.id === id)) : drawThemes(seed, mode, level);
  if (selected.length !== 5 || selected.some(theme => !theme) || new Set(selected.map(theme => theme?.id)).size !== 5) {
    throw new Error('Escolha exatamente cinco temas diferentes.');
  }
  const chosen = selected as Theme[];
  const count = phaseRules(mode, level).count;
  let words: PuzzleWord[] | null = null;
  for (let attempt = 0; attempt < 36 && !words; attempt++) {
    const random = rng(`${seed}:${mode}:${level}:${chosen.map(theme => theme.id).join(',')}:${attempt}`);
    const pool = candidatePool(chosen, random, mode, level);
    words = mode !== 'cascade' ? crossword(pool, chosen, count, level, random) : cascade(pool, chosen, count, level, random);
  }
  if (!words) throw new Error('Não foi possível montar esta grade. Sorteie novos temas.');
  if (mode === 'magazine') words = words.map(word => ({ ...word, row: word.row + 1, col: word.col + 1 }));
  const cells = words.flatMap(wordCells);
  return {
    id: `${mode}:${level}:${seed}:${chosen.map(theme => theme.id).join('.')}`,
    mode, level, themeIds: chosen.map(theme => theme.id), words,
    rows: Math.max(...cells.map(cell => cell.row)) + 1,
    cols: Math.max(...cells.map(cell => cell.col)) + 1,
    difficulty: level <= 10 ? 'Primeiras conexões' : level <= 20 ? 'Iniciante' : level <= 40 ? 'Aprendiz' : level <= 60 ? 'Intermediário' : level <= 80 ? 'Avançado' : 'Especialista',
  };
}

export function createSession(puzzle: Puzzle): Session {
  return { puzzle, values: {}, solved: [], revealed: {}, mistakes: 0, hints: 0, elapsed: 0, completed: false };
}

function cloneSession(session: Session): Session {
  return { ...session, values: { ...session.values }, solved: [...session.solved], revealed: { ...session.revealed } };
}

function revealWord(session: Session, word: PuzzleWord): void {
  for (const cell of wordCells(word)) { session.values[cell.key] = cell.letter; session.revealed[cell.key] = cell.letter; }
}

function finishKnownWords(session: Session): void {
  let changed = true;
  while (changed) {
    changed = false;
    for (const word of session.puzzle.words) {
      if (session.solved.includes(word.id)) continue;
      if (!wordCells(word).every(cell => session.values[cell.key] === cell.letter)) continue;
      session.solved.push(word.id);
      revealWord(session, word);
      changed = true;
      if (session.puzzle.mode === 'cascade') {
        const letters = new Set(word.answer);
        for (const lower of session.puzzle.words) {
          if (lower.row <= word.row || session.solved.includes(lower.id)) continue;
          for (const cell of wordCells(lower)) {
            if (!letters.has(cell.letter)) continue;
            session.values[cell.key] = cell.letter;
            session.revealed[cell.key] = cell.letter;
          }
        }
      }
    }
  }
  session.completed = session.solved.length === session.puzzle.words.length;
}

export function submitWord(session: Session, wordId: string, answer: string): { session: Session; correct: boolean; newlySolved: string[] } {
  const word = session.puzzle.words.find(candidate => candidate.id === wordId);
  if (!word || session.completed || session.solved.includes(wordId)) {
    return { session, correct: !!word && session.solved.includes(wordId), newlySolved: [] };
  }
  const next = cloneSession(session);
  if (session.puzzle.mode === 'magazine') {
    const letters = normalizeAnswer(answer).slice(0, word.answer.length);
    wordCells(word).forEach((cell, index) => {
      if (next.revealed[cell.key]) return;
      if (letters[index]) next.values[cell.key] = letters[index]; else delete next.values[cell.key];
    });
    return { session: next, correct: false, newlySolved: [] };
  }
  if (normalizeAnswer(answer) !== word.answer) {
    next.mistakes++;
    return { session: next, correct: false, newlySolved: [] };
  }
  revealWord(next, word);
  finishKnownWords(next);
  return { session: next, correct: true, newlySolved: next.solved.filter(id => !session.solved.includes(id)) };
}

export function useHint(session: Session, wordId: string): Session {
  const word = session.puzzle.words.find(candidate => candidate.id === wordId);
  if (!word || session.completed || session.solved.includes(wordId) || session.hints >= MAX_HINTS) return session;
  const next = cloneSession(session);
  const hidden = wordCells(word).find(cell => next.revealed[cell.key] !== cell.letter);
  if (hidden) {
    next.values[hidden.key] = hidden.letter;
    next.revealed[hidden.key] = hidden.letter;
    next.hints++;
    if (session.puzzle.mode === 'cascade') {
      for (const lower of session.puzzle.words) {
        if (lower.row <= word.row) continue;
        for (const cell of wordCells(lower)) if (cell.letter === hidden.letter) {
          next.values[cell.key] = cell.letter; next.revealed[cell.key] = cell.letter;
        }
      }
    }
  }
  if (session.puzzle.mode !== 'magazine') finishKnownWords(next);
  return next;
}

export function getStars(session: Session): number {
  if (!session.completed) return 0;
  if (session.mistakes === 0 && session.hints === 0) return 3;
  return session.mistakes + session.hints <= 4 ? 2 : 1;
}

export function getScore(session: Session): number {
  const points = session.puzzle.words.filter(word => session.solved.includes(word.id))
    .reduce((sum, word) => sum + 100 + word.answer.length * 25, 0);
  return Math.max(0, points + (session.completed ? session.puzzle.level * 20 : 0)
    - session.mistakes * 40 - session.hints * 60 - Math.floor(session.elapsed / 5));
}
