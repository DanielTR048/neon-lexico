import fs from 'node:fs';
import { themes } from '../src/content';
import { generatePuzzle, createSession, submitWord, useHint } from '../src/engine';
import { createSave } from '../src/storage';
const puzzles = (['classic', 'magazine', 'cascade'] as const).flatMap(mode => [1, 35, 70, 100].map(level => generatePuzzle('native-parity', mode, level)));
const save = createSave(); save.seed = 'native-parity'; save.settings.sound = false;
for (const mode of ['classic', 'magazine', 'cascade'] as const) {
  let session = createSession(puzzles.find(puzzle => puzzle.mode === mode && puzzle.level === 1)!);
  session = useHint(session, session.puzzle.words[0].id);
  session = submitWord(session, session.puzzle.words[0].id, session.puzzle.words[0].answer).session;
  session.elapsed = 27;
  save.sessions[`${mode}:1`] = session;
}
const path = 'android-native/app/src/test/resources'; fs.mkdirSync(path, { recursive: true });
fs.writeFileSync(path + '/native-fixtures.json', JSON.stringify({ puzzles, save, themes: themes.length }, null, 2) + '\n');
console.log('Fixtures de paridade e campanha web para o Android geradas.');
