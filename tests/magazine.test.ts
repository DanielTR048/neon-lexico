import assert from 'node:assert/strict';
import test from 'node:test';
import { MAGAZINE_COLS, MAGAZINE_ROWS, checkGrid, clueCell, createSession, generatePuzzle, gridFill, submitWord, useHint, wordCells } from '../src/engine';
import { createSave, exportSave, importSave, recordCompletion, unlockedLevel } from '../src/storage';

test('every magazine phase packs the same fixed frame with legal clue squares', () => {
  for (const seed of ['magazine-campaign', 'revista-daniel', 'revista-larissa']) for (let level = 1; level <= 100; level++) {
    const puzzle = generatePuzzle(seed, 'magazine', level);
    assert.equal(puzzle.rows, MAGAZINE_ROWS); assert.equal(puzzle.cols, MAGAZINE_COLS);
    const solution = new Map<string, string>();
    for (const word of puzzle.words) for (const cell of wordCells(word)) {
      assert.ok(!solution.has(cell.key) || solution.get(cell.key) === cell.letter);
      solution.set(cell.key, cell.letter);
    }
    const clueSlots = new Set<string>();
    for (const word of puzzle.words) {
      const clue = clueCell(word);
      assert.ok(clue.row >= 0 && clue.row < puzzle.rows && clue.col >= 0 && clue.col < puzzle.cols);
      assert.equal(solution.has(clue.key), false, `A clue may never cover an answer: ${seed} ${level}`);
      assert.ok(!clueSlots.has(`${clue.key}:${word.direction}`), 'one clue per direction in each square');
      clueSlots.add(`${clue.key}:${word.direction}`);
      const last = wordCells(word).at(-1)!, after = word.direction === 'across' ? `${last.row}:${last.col + 1}` : `${last.row + 1}:${last.col}`;
      assert.equal(solution.has(after), false, 'answers end at a clue square or at the border');
      assert.ok(word.themeId && puzzle.themeIds.includes(word.themeId));
    }
    assert.ok(solution.size >= puzzle.rows * puzzle.cols * 0.6, `packed frame: ${seed} ${level}`);
    if (level <= 10) assert.ok(puzzle.words.every(word => word.difficulty === 1 && word.answer.length <= 6));
    if (level <= 60) assert.ok(puzzle.words.every(word => word.difficulty <= 2));
    const save = createSave(); save.sessions[`magazine:${level}`] = createSession(puzzle);
    assert.deepEqual(importSave(exportSave(save)), save);
  }
  const average = (level: number) => { const words = generatePuzzle('curve', 'magazine', level).words; return words.reduce((sum, word) => sum + word.difficulty, 0) / words.length; };
  assert.ok(average(100) > average(40) && average(40) > average(1));
});

test('magazine drafts and hints never disclose or lock correct words before the final check', () => {
  let session = createSession(generatePuzzle('blind-check', 'magazine', 1));
  const correct = session.puzzle.words[0], wrong = session.puzzle.words[1];
  session = submitWord(session, correct.id, correct.answer).session;
  assert.deepEqual(session.solved, []); assert.deepEqual(session.revealed, {}); assert.equal(session.mistakes, 0);
  session = submitWord(session, wrong.id, 'Z'.repeat(wrong.answer.length)).session;
  assert.deepEqual(session.solved, []); assert.equal(session.mistakes, 0); assert.equal(session.completed, false);
  const incomplete = checkGrid(session); assert.equal(incomplete.status, 'incomplete'); assert.strictEqual(incomplete.session, session);
  for (let i = 0; i < 3; i++) session = useHint(session, correct.id);
  assert.equal(session.hints, 3); assert.deepEqual(session.solved, []);
  assert.strictEqual(useHint(session, wrong.id), session);
  session = submitWord(session, correct.id, 'Z'.repeat(correct.answer.length)).session;
  for (const [key, letter] of Object.entries(session.revealed)) assert.equal(session.values[key], letter);
});

test('only a fully correct grid finishes, while an incorrect complete grid stays editable without error locations', () => {
  let session = createSession(generatePuzzle('final-check', 'magazine', 1));
  for (const word of session.puzzle.words) session = submitWord(session, word.id, word.answer).session;
  assert.equal(gridFill(session).full, true); assert.equal(session.completed, false); assert.deepEqual(session.solved, []);
  const key = wordCells(session.puzzle.words[0])[0].key, correct = session.values[key];
  session.values[key] = correct === 'Z' ? 'X' : 'Z';
  const before = structuredClone(session);
  const retry = checkGrid(session); assert.equal(retry.status, 'retry');
  assert.deepEqual(retry.session.values, before.values); assert.deepEqual(retry.session.revealed, before.revealed);
  assert.deepEqual(retry.session.solved, []); assert.equal(retry.session.completed, false); assert.equal(retry.session.mistakes, 1);
  assert.deepEqual(Object.keys(retry).sort(), ['session', 'status']);
  session = retry.session; session.values[key] = correct;
  const finished = checkGrid(session); assert.equal(finished.status, 'complete'); assert.equal(finished.session.completed, true);
  const save = recordCompletion(createSave(), finished.session);
  assert.equal(unlockedLevel(save, 'magazine'), 2); assert.equal(unlockedLevel(save, 'classic'), 1);
  assert.deepEqual(importSave(exportSave(save)), save);
});

test('old two-mode backups migrate without changing existing progress and reject partial magazine confirmations', () => {
  const old = createSave(); old.seed = 'existing-campaign';
  old.sessions['classic:1'] = useHint(createSession(generatePuzzle(old.seed, 'classic', 1)), generatePuzzle(old.seed, 'classic', 1).words[0].id);
  old.results.cascade['1'] = { stars: 2, score: 500, seconds: 80 };
  const legacy = JSON.parse(exportSave(old)); delete legacy.results.magazine;
  const migrated = importSave(JSON.stringify(legacy));
  assert.equal(migrated.seed, old.seed); assert.deepEqual(migrated.sessions, old.sessions); assert.deepEqual(migrated.results.classic, old.results.classic); assert.deepEqual(migrated.results.cascade, old.results.cascade); assert.deepEqual(migrated.results.magazine, {});
  const session = createSession(generatePuzzle('partial-confirmation', 'magazine', 1));
  session.solved = [session.puzzle.words[0].id]; migrated.sessions['magazine:1'] = session;
  assert.throws(() => importSave(exportSave(migrated)), /conferência parcial/);
});
