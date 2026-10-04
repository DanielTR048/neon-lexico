import assert from 'node:assert/strict';
import test from 'node:test';
import { createSession, generatePuzzle, submitWord } from '../src/engine';
import { createSave, exportSave, importSave, loadSave, recordCompletion, saveGame, STORAGE_KEY, unlockedLevel } from '../src/storage';
import type { SaveData } from '../src/types';

function completeLevel(level = 1) {
  let session = createSession(generatePuzzle('storage-test', 'cascade', level));
  for (const word of session.puzzle.words) session = submitWord(session, word.id, word.answer).session;
  session.elapsed = 50;
  return session;
}

test('backup round trip preserves an in-progress game and preferences', () => {
  const save = createSave();
  let session = createSession(generatePuzzle('round-trip', 'classic', 1));
  session = submitWord(session, session.puzzle.words[0].id, session.puzzle.words[0].answer).session;
  session.elapsed = 13.5;
  save.sessions['classic:1'] = session;
  save.settings.sound = false;
  assert.deepEqual(importSave(exportSave(save)), save);
});

test('completion is immutable, retains the board and tracks independent best results', () => {
  const initial = createSave();
  const session = completeLevel();
  const first = recordCompletion(initial, session);
  assert.equal(initial.results.cascade['1'], undefined);
  assert.equal(first.results.cascade['1'].stars, 3);
  assert.equal(first.sessions['cascade:1'].completed, true);
  assert.equal(unlockedLevel(first, 'cascade'), 2);
  assert.equal(unlockedLevel(first, 'classic'), 1);
  session.hints = 8;
  session.elapsed = 20;
  const second = recordCompletion(first, session);
  assert.equal(second.results.cascade['1'].stars, 3);
  assert.equal(second.results.cascade['1'].score, first.results.cascade['1'].score);
  assert.equal(second.results.cascade['1'].seconds, 20);
  assert.equal(first.sessions['cascade:1'].hints, 0);
  assert.deepEqual(importSave(exportSave(second)), second);
});

test('unlocking never skips an unfinished phase and caps at 100', () => {
  const save = createSave();
  save.results.classic['2'] = { stars: 3, score: 500, seconds: 20 };
  assert.equal(unlockedLevel(save, 'classic'), 1);
  for (let level = 1; level <= 100; level += 1) save.results.classic[String(level)] = { stars: 1, score: 100, seconds: 50 };
  assert.equal(unlockedLevel(save, 'classic'), 100);
});

test('import rejects corruption, invalid versions, oversize and prototype pollution', () => {
  const valid = createSave();
  const malformed = [
    '{', 'null', '[]', JSON.stringify({ ...valid, version: 2 }),
    JSON.stringify({ ...valid, settings: { sound: 'true', reducedMotion: false } }),
    JSON.stringify({ ...valid, results: { classic: { 101: { stars: 9, score: 0, seconds: 0 } }, cascade: {} } }),
    JSON.stringify({ ...valid, sessions: JSON.parse('{"__proto__":{}}') }),
    JSON.stringify({ ...valid, seed: 'x'.repeat(129) }),
    ' '.repeat(8_000_001),
  ];
  for (const json of malformed) assert.throws(() => importSave(json), /Backup inválido/);
  assert.equal(({} as { polluted?: boolean }).polluted, undefined);
});

test('import rejects fake solved state, invalid cell injection and off-grid words', () => {
  const save = createSave();
  save.sessions['cascade:1'] = completeLevel();
  const mutate = (change: (data: SaveData) => void) => {
    const data = structuredClone(save);
    change(data);
    assert.throws(() => importSave(JSON.stringify(data)), /Backup inválido/);
  };
  mutate(data => { data.sessions['cascade:1'].values = {}; });
  mutate(data => { data.sessions['cascade:1'].values['<img onerror=alert(1)>'] = 'A'; });
  mutate(data => { data.sessions['cascade:1'].puzzle.words[0].row = 1000; });
  mutate(data => { data.sessions['cascade:1'].puzzle.words[0].answer = '<script>'; });
  mutate(data => { data.sessions['cascade:1'].elapsed = -1; });
  mutate(data => { data.sessions['cascade:1'].puzzle.mode = 'classic'; });
  mutate(data => { data.sessions['cascade:1'].completed = false; });
  mutate(data => { data.sessions['cascade:1'].revealed = {}; });
  mutate(data => {
    const session = data.sessions['cascade:1'];
    const key = Object.keys(session.revealed)[0];
    session.values[key] = session.revealed[key] === 'A' ? 'B' : 'A';
  });
});

test('partially typed incorrect letters remain valid but revealed letters cannot be changed', () => {
  const save = createSave();
  const session = createSession(generatePuzzle('typing', 'classic', 1));
  save.sessions['classic:1'] = session;
  const word = session.puzzle.words[0];
  const key = `${word.row}:${word.col}`;
  session.values[key] = word.answer[0] === 'Z' ? 'A' : 'Z';
  assert.deepEqual(importSave(exportSave(save)), save);
  session.revealed[key] = word.answer[0];
  assert.throws(() => importSave(exportSave(save)), /letra revelada inconsistente/);
  delete session.values[key];
  assert.throws(() => importSave(exportSave(save)), /letra revelada inconsistente/);
  session.values[key] = word.answer[0];
  assert.deepEqual(importSave(exportSave(save)), save);
});

test('blocked or corrupted browser storage recovers gracefully', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Storage blocked'); } });
    assert.equal(loadSave().version, 1);
    assert.equal(saveGame(createSave()), false);
    const memory = new Map<string, string>([[STORAGE_KEY, 'broken json']]);
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => memory.set(key, value) },
    });
    const recovered = loadSave();
    assert.deepEqual(recovered.results, { classic: {}, cascade: {} });
    assert.equal(saveGame(recovered), true);
    assert.deepEqual(loadSave(), recovered);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
