import assert from 'node:assert/strict';
import test from 'node:test';
import { themes, beginnerThemeIds } from '../src/content';
import { cellKey, createSession, drawThemes, generatePuzzle, getScore, getStars, normalizeAnswer, randomSeed, submitWord, useHint, wordCells, phaseRules } from '../src/engine';
import type { Mode, Puzzle, PuzzleWord, Session } from '../src/types';

function validatePuzzle(puzzle: Puzzle): void {
  assert.equal(puzzle.themeIds.length, 5);
  assert.equal(new Set(puzzle.themeIds).size, 5);
  assert.deepEqual(new Set(puzzle.words.map(word => word.themeId)), new Set(puzzle.themeIds));
  assert.equal(new Set(puzzle.words.map(word => word.id)).size, puzzle.words.length);
  assert.equal(new Set(puzzle.words.map(word => word.answer)).size, puzzle.words.length);
  assert.ok(puzzle.words.length >= (puzzle.mode === 'classic' ? 12 : 5));
  assert.ok(puzzle.words.length <= (puzzle.mode === 'classic' ? 30 : 14));
  const occupied = new Map<string, { letter: string; owners: PuzzleWord[] }>();
  for (const word of puzzle.words) {
    assert.match(word.answer, /^[A-Z]{3,20}$/);
    assert.ok(word.clue.trim().length > 5);
    for (const cell of wordCells(word)) {
      assert.ok(cell.row >= 0 && cell.row < puzzle.rows);
      assert.ok(cell.col >= 0 && cell.col < puzzle.cols);
      const existing = occupied.get(cell.key);
      if (existing) {
        assert.equal(existing.letter, cell.letter, 'Crossings must have identical letters');
        assert.ok(existing.owners.every(owner => owner.direction !== word.direction), 'Parallel words cannot overlap');
        existing.owners.push(word);
      } else occupied.set(cell.key, { letter: cell.letter, owners: [word] });
    }
  }
  if (puzzle.mode === 'cascade') {
    assert.equal(puzzle.rows, puzzle.words.length);
    for (let i = 0; i < puzzle.words.length; i++) {
      assert.equal(puzzle.words[i].row, i);
      assert.equal(puzzle.words[i].col, 0);
      assert.equal(puzzle.words[i].direction, 'across');
      if (i) assert.ok([...puzzle.words[i].answer].some(letter => puzzle.words[i - 1].answer.includes(letter)), 'Every row shares letters with its predecessor');
    }
    return;
  }
  assert.ok(puzzle.rows <= 28 && puzzle.cols <= 28);
  // Every adjacent letter pair must belong to a real word in that direction.
  // This catches side-touching words, merged endpoints and accidental entries.
  for (const [key, cell] of occupied) {
    const [row, col] = key.split(':').map(Number);
    for (const [dr, dc, direction] of [[1, 0, 'down'], [0, 1, 'across']] as const) {
      const neighbor = occupied.get(cellKey(row + dr, col + dc));
      if (neighbor) assert.ok(cell.owners.some(owner => owner.direction === direction && neighbor.owners.includes(owner)), `Illegal adjacency at ${key}`);
    }
  }
  const reachable = new Set([puzzle.words[0].id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const cell of occupied.values()) {
      if (!cell.owners.some(word => reachable.has(word.id))) continue;
      for (const word of cell.owners) if (!reachable.has(word.id)) { reachable.add(word.id); changed = true; }
    }
  }
  assert.equal(reachable.size, puzzle.words.length, 'The crossword must be fully connected');
  const starts = [...new Set(puzzle.words.map(word => cellKey(word.row, word.col)))].sort((a, b) => {
    const [ar, ac] = a.split(':').map(Number), [br, bc] = b.split(':').map(Number);
    return ar - br || ac - bc;
  });
  for (const word of puzzle.words) assert.equal(word.number, starts.indexOf(cellKey(word.row, word.col)) + 1);
}

function freeze<T>(object: T): T {
  if (object && typeof object === 'object' && !Object.isFrozen(object)) {
    Object.freeze(object);
    for (const value of Object.values(object)) freeze(value);
  }
  return object;
}

function fixture(mode: Mode, answers: string[]): Puzzle {
  return {
    id: 'fixture', mode, level: 1, themeIds: ['fixture'], rows: answers.length, cols: Math.max(...answers.map(answer => answer.length)), difficulty: 'Iniciante',
    words: answers.map((answer, index) => ({ id: `word-${index}`, answer, clue: `Dica da palavra ${index}`, difficulty: 1, themeId: 'fixture', themeName: 'Teste', row: index, col: 0, direction: 'across', number: index + 1 })),
  };
}

test('Early stages use familiar short words and magazine grids grow across the campaign', () => {
  for (const mode of ['classic', 'cascade'] as const) {
    const early = generatePuzzle('accessible-beginning', mode, 1);
    const late = generatePuzzle('accessible-beginning', mode, 100);
    assert.ok(early.themeIds.every(id => beginnerThemeIds.includes(id)));
    assert.ok(early.words.every(word => word.difficulty === 1 && word.answer.length <= 6));
    assert.ok(late.words.length > early.words.length);
    assert.equal(late.words.length, mode === 'classic' ? 30 : 14);
    let previous = phaseRules(mode, 1);
    for (let level = 2; level <= 100; level++) {
      const next = phaseRules(mode, level);
      assert.ok(next.count >= previous.count && next.maxLength >= previous.maxLength && next.difficulty >= previous.difficulty);
      previous = next;
    }
  }
});

test('A partial cascade hint reveals matching letters immediately below and never above; budget survives reload', () => {
  let session = createSession(fixture('cascade', ['LAGO', 'CASA', 'CALOR', 'SALA']));
  session = useHint(session, 'word-1');
  assert.equal(session.revealed['1:0'], 'C');
  assert.equal(session.revealed['2:0'], 'C');
  assert.equal(session.revealed['0:0'], undefined);
  assert.deepEqual(session.solved, []);
  session = useHint(session, 'word-1');
  assert.equal(session.revealed['3:1'], 'A');
  assert.equal(session.revealed['3:3'], 'A');
  session = useHint(session, 'word-0');
  const restored: Session = JSON.parse(JSON.stringify(session));
  const before = JSON.stringify(restored);
  assert.strictEqual(useHint(restored, 'word-2'), restored);
  assert.equal(JSON.stringify(restored), before);
  assert.equal(restored.hints, 3);
});

test('Content covers at least 40 complete themes and unique clues within each theme', () => {
  assert.ok(themes.length >= 40, `Expected at least 40 themes; received ${themes.length}`);
  assert.equal(new Set(themes.map(theme => theme.id)).size, themes.length);
  for (const theme of themes) {
    assert.ok(theme.entries.length >= 20, `${theme.id} must have at least 20 entries`);
    assert.equal(new Set(theme.entries.map(entry => entry.id)).size, theme.entries.length);
    assert.equal(new Set(theme.entries.map(entry => normalizeAnswer(entry.answer))).size, theme.entries.length);
    for (const entry of theme.entries) {
      assert.ok(entry.clue.length >= 10);
      assert.match(normalizeAnswer(entry.answer), /^[A-Z]{3,20}$/);
      assert.ok([1, 2, 3].includes(entry.difficulty));
    }
  }
});

test('Both complete 100-stage campaigns generate legal puzzles and are solvable', () => {
  for (const mode of ['classic', 'cascade'] as const) {
    for (let level = 1; level <= 100; level++) {
      const puzzle = generatePuzzle('full-campaign-2026', mode, level);
      validatePuzzle(puzzle);
      let session = createSession(puzzle);
      for (const word of puzzle.words) session = submitWord(session, word.id, word.answer).session;
      assert.equal(session.completed, true, `${mode} level ${level} must be completable`);
      assert.equal(session.solved.length, puzzle.words.length);
      assert.equal(getStars(session), 3);
      assert.ok(getScore(session) > 0);
      for (const word of puzzle.words) for (const cell of wordCells(word)) assert.equal(session.revealed[cell.key], cell.letter);
    }
  }
});

test('Multiple seeds retain geometry, five-theme coverage, and reproducibility at difficulty boundaries', () => {
  const allThemes = new Set<string>();
  for (let seed = 0; seed < 12; seed++) {
    for (const mode of ['classic', 'cascade'] as const) {
      for (const level of [1, 31, 66, 100]) {
        const puzzle = generatePuzzle(`audit-${seed}`, mode, level);
        validatePuzzle(puzzle);
        puzzle.themeIds.forEach(id => allThemes.add(id));
        assert.deepEqual(generatePuzzle(`audit-${seed}`, mode, level), puzzle);
      }
    }
  }
  assert.equal(allThemes.size, themes.length, 'The lottery should explore the full catalog');
});

test('Lottery and selected theme overrides are deterministic and validated', () => {
  const selected = drawThemes('fixed-seed', 'classic', 1);
  assert.equal(selected.length, 5);
  assert.deepEqual(selected, drawThemes('fixed-seed', 'classic', 1));
  assert.notDeepEqual(selected, drawThemes('different-seed', 'classic', 1));
  const ids = selected.map(theme => theme.id);
  assert.deepEqual(generatePuzzle('fixed-seed', 'classic', 1, ids).themeIds, ids);
  assert.throws(() => generatePuzzle('a', 'classic', 1, [ids[0], ids[0], ...ids.slice(2)]));
  assert.throws(() => generatePuzzle('a', 'classic', 1, ['missing', ...ids.slice(1)]));
  assert.throws(() => generatePuzzle('a', 'classic', 1, ids.slice(1)));
  for (const level of [0, 101, 1.5, NaN]) assert.throws(() => generatePuzzle('a', 'classic', level));
});

test('Normalization accepts accents, spaces, punctuation and lowercase', () => {
  assert.equal(normalizeAnswer('  Engenharia de Computação! '), 'ENGENHARIADECOMPUTACAO');
  assert.equal(normalizeAnswer('ação / coração - C++'), 'ACAOCORACAOC');
  assert.equal(normalizeAnswer('Homem-Aranha'), 'HOMEMARANHA');
  assert.ok(randomSeed().length >= 3);
  assert.notEqual(randomSeed(), randomSeed());
  const session = createSession(fixture('cascade', ['ACAO']));
  assert.equal(submitWord(session, 'word-0', ' Ação! ').correct, true);
});

test('Wrong guesses are immutable and preserve known letters', () => {
  const original = freeze(useHint(createSession(fixture('cascade', ['CASA', 'SALA'])), 'word-0'));
  const result = submitWord(original, 'word-0', 'CAOS');
  assert.equal(result.correct, false);
  assert.equal(result.session.mistakes, 1);
  assert.deepEqual(result.session.values, original.values);
  assert.deepEqual(result.session.revealed, original.revealed);
  assert.deepEqual(result.newlySolved, []);
  assert.equal(original.mistakes, 0);
  assert.equal(submitWord(original, 'missing', 'CASA').session, original);
});

test('Cascade reveals every occurrence in ALL lower rows and completes chained words', () => {
  const original = freeze(createSession(fixture('cascade', ['CASA', 'SALA', 'LASER', 'REAL'])));
  const first = submitWord(original, 'word-0', 'casa');
  assert.deepEqual(first.newlySolved, ['word-0']);
  assert.equal(first.session.revealed['1:0'], 'S');
  assert.equal(first.session.revealed['1:1'], 'A');
  assert.equal(first.session.revealed['1:3'], 'A');
  assert.equal(first.session.revealed['2:1'], 'A');
  assert.equal(first.session.revealed['2:2'], 'S');
  assert.equal(first.session.revealed['3:2'], 'A');
  assert.equal(first.session.revealed['1:2'], undefined);
  assert.deepEqual(original.values, {});
  const second = submitWord(freeze(first.session), 'word-1', 'SALA').session;
  assert.equal(second.revealed['2:0'], 'L');
  const third = submitWord(freeze(second), 'word-2', 'LASER');
  assert.deepEqual(third.newlySolved, ['word-2', 'word-3']);
  assert.equal(third.session.completed, true);
  assert.equal(getStars(third.session), 3);
  assert.equal(submitWord(third.session, 'word-0', 'CASA').session, third.session);
  assert.equal(useHint(third.session, 'word-0'), third.session);
});

test('Solving a lower cascade row never reveals letters upward', () => {
  const session = createSession(fixture('cascade', ['CASA', 'SALA', 'LASER', 'REAL']));
  const result = submitWord(session, 'word-3', 'REAL').session;
  for (const key of Object.keys(result.revealed)) assert.ok(key.startsWith('3:'));
  assert.deepEqual(result.solved, ['word-3']);
});

test('A hint that finishes a row propagates and cannot leave an unsolved full row', () => {
  let session = createSession(fixture('cascade', ['CASA', 'SALA', 'LASER', 'REAL']));
  session = submitWord(session, 'word-0', 'CASA').session;
  session = useHint(freeze(session), 'word-1');
  assert.ok(session.solved.includes('word-1'));
  assert.equal(session.revealed['2:0'], 'L');
  let budget = 30;
  while (!session.completed && budget-- > 0) {
    const word = session.puzzle.words.find(candidate => !session.solved.includes(candidate.id))!;
    session = useHint(freeze(session), word.id);
  }
  assert.equal(session.completed, true);
  assert.ok(session.hints > 0);
  assert.equal(useHint(session, 'word-3').hints, session.hints);
});

test('A shared hinted crossword letter completes every affected word', () => {
  const puzzle = fixture('classic', ['CASA', 'SAL']);
  puzzle.words[1] = { ...puzzle.words[1], row: 0, col: 2, direction: 'down' };
  puzzle.rows = 3;
  const session: Session = createSession(puzzle);
  for (const word of puzzle.words) for (const cell of wordCells(word)) {
    if (cell.key !== '0:2') { session.values[cell.key] = cell.letter; session.revealed[cell.key] = cell.letter; }
  }
  const result = useHint(freeze(session), 'word-0');
  assert.equal(result.completed, true);
  assert.equal(result.hints, 1);
  assert.deepEqual(new Set(result.solved), new Set(['word-0', 'word-1']));
  assert.equal(getStars(result), 2);
});

test('Hints overwrite wrong provisional letters without accepting remaining mistakes', () => {
  const puzzle = fixture('classic', ['CASA', 'SAL']);
  puzzle.words[1] = { ...puzzle.words[1], row: 0, col: 2, direction: 'down' };
  puzzle.rows = 3;
  let session = createSession(puzzle);
  for (const word of puzzle.words) for (const cell of wordCells(word)) session.values[cell.key] = 'X';
  const original = freeze(session);
  session = useHint(original, 'word-0');
  assert.equal(original.values['0:0'], 'X');
  assert.equal(session.values['0:0'], 'C');
  assert.equal(session.revealed['0:0'], 'C');
  assert.equal(session.values['0:1'], 'X');
  assert.deepEqual(session.solved, []);
  assert.equal(session.completed, false);
  for (let i = 0; i < 2; i++) session = useHint(freeze(session), 'word-0');
  assert.equal(session.hints, 3);
  assert.strictEqual(useHint(session, 'word-0'), session);
  session = submitWord(session, 'word-0', 'CASA').session;
  assert.deepEqual(session.solved, ['word-0']);
  assert.equal(session.values['0:2'], 'S');
  assert.equal(session.values['1:2'], 'X');
  assert.equal(session.completed, false);
  assert.strictEqual(useHint(session, 'word-1'), session);
  session = submitWord(session, 'word-1', 'SAL').session;
  assert.equal(session.values['1:2'], 'A');
  assert.equal(session.completed, true);
  assert.deepEqual(new Set(session.solved), new Set(['word-0', 'word-1']));
  assert.equal(session.hints, 3);
});

test('Cascade replaces incorrect drafts only where a solved word reveals matching letters', () => {
  const original = createSession(fixture('cascade', ['CASA', 'SALA', 'LASER', 'REAL']));
  for (const word of original.puzzle.words.slice(1)) for (const cell of wordCells(word)) original.values[cell.key] = 'X';
  let session = submitWord(freeze(original), 'word-0', 'CASA').session;
  assert.deepEqual(session.solved, ['word-0']);
  assert.equal(session.values['1:0'], 'S');
  assert.equal(session.values['1:1'], 'A');
  assert.equal(session.values['1:2'], 'X');
  assert.equal(session.values['1:3'], 'A');
  assert.equal(session.revealed['1:2'], undefined);
  assert.equal(session.values['2:3'], 'X');
  assert.equal(session.completed, false);
  session = useHint(freeze(session), 'word-1');
  assert.deepEqual(session.solved, ['word-0', 'word-1']);
  assert.equal(session.values['2:0'], 'L');
  assert.equal(session.values['2:3'], 'X');
  assert.equal(session.completed, false);
  assert.equal(submitWord(session, 'word-2', 'LASXX').correct, false);
  const result = submitWord(freeze(session), 'word-2', 'LASER');
  assert.deepEqual(result.newlySolved, ['word-2', 'word-3']);
  assert.equal(result.session.completed, true);
  assert.equal(original.values['1:0'], 'X');
});

test('A word with one incorrect provisional crossing cannot be marked solved', () => {
  const puzzle = fixture('classic', ['CASA', 'SAL']);
  puzzle.words[1] = { ...puzzle.words[1], row: 0, col: 2, direction: 'down' };
  puzzle.rows = 3;
  const original = createSession(puzzle);
  original.values = { '0:0': 'C', '0:1': 'A', '0:2': 'X', '0:3': 'A', '1:2': 'X', '2:2': 'L' };
  const hinted = useHint(freeze(original), 'word-0');
  assert.deepEqual(hinted.solved, []);
  assert.equal(hinted.completed, false);
  const solvedAcross = submitWord(freeze(hinted), 'word-0', 'CASA').session;
  assert.deepEqual(solvedAcross.solved, ['word-0']);
  assert.equal(solvedAcross.values['0:2'], 'S');
  assert.equal(solvedAcross.values['1:2'], 'X');
  assert.equal(solvedAcross.completed, false);
});

test('Scores reward solving, account for penalties, and never become negative', () => {
  const initial = createSession(fixture('cascade', ['CASA']));
  assert.equal(getStars(initial), 0);
  assert.equal(getScore(initial), 0);
  const complete = submitWord(initial, 'word-0', 'CASA').session;
  assert.equal(getStars(complete), 3);
  assert.equal(getStars({ ...complete, mistakes: 2 }), 2);
  assert.equal(getStars({ ...complete, hints: 5 }), 1);
  assert.equal(getScore({ ...complete, mistakes: 1 }), getScore(complete) - 40);
  assert.equal(getScore({ ...complete, hints: 1 }), getScore(complete) - 60);
  assert.equal(getScore({ ...complete, elapsed: 10 }), getScore(complete) - 2);
  assert.equal(getScore({ ...complete, mistakes: 100 }), 0);
});
