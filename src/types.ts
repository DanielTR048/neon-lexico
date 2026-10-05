export type Mode = 'classic' | 'magazine' | 'cascade';
export const MODES: Mode[] = ['classic', 'magazine', 'cascade'];

export interface Entry {
  id: string;
  answer: string;
  clue: string;
  difficulty: 1 | 2 | 3;
}

export interface Theme {
  id: string;
  name: string;
  icon: string;
  description: string;
  entries: Entry[];
}

export interface PuzzleWord extends Entry {
  themeId: string;
  themeName: string;
  row: number;
  col: number;
  direction: 'across' | 'down';
  number: number;
}

export interface Puzzle {
  id: string;
  mode: Mode;
  level: number;
  themeIds: string[];
  words: PuzzleWord[];
  rows: number;
  cols: number;
  difficulty: string;
}

export interface Session {
  puzzle: Puzzle;
  values: Record<string, string>;
  solved: string[];
  revealed: Record<string, string>;
  mistakes: number;
  hints: number;
  elapsed: number;
  completed: boolean;
}

export interface LevelResult {
  stars: number;
  score: number;
  seconds: number;
}

export interface SaveData {
  version: 1;
  seed: string;
  results: Record<Mode, Record<string, LevelResult>>;
  sessions: Record<string, Session>;
  settings: { sound: boolean; reducedMotion: boolean };
}
