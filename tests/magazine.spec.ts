import { test, expect, type Page } from '@playwright/test';
import { createSave } from '../src/storage';
import type { SaveData } from '../src/types';

async function read(page: Page): Promise<SaveData> { return page.evaluate(() => JSON.parse(localStorage.getItem('neon-lexico:v1')!)); }
async function openMagazine(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Entrar como Daniel' }).click();
  await expect(page.locator('.mode-card')).toHaveCount(3);
  await page.locator('[data-action="start"][data-mode="magazine"]').click();
  await page.locator('[data-action="begin"]').click();
  await expect(page.locator('.magazine-grid')).toBeVisible();
}

test('magazine clues live inside the grid, open typing and never validate individual words', async ({ page }, info) => {
  test.setTimeout(60_000);
  await openMagazine(page);
  let session = (await read(page)).sessions['magazine:1'];
  await expect(page.locator('.magazine-clue')).toHaveCount(session.puzzle.words.length);
  await expect(page.getByRole('button', { name: 'Conferir grade completa', exact: true })).toBeDisabled();
  const first = session.puzzle.words[0];
  await page.locator(`.magazine-clue[data-word="${first.id}"]`).click();
  await expect(page.locator('#answer-input')).toBeFocused();
  await expect(page.locator('#active-clue')).toHaveText(first.clue);
  await page.locator('#answer-input').fill(first.answer);
  await page.locator('#answer-input').press('Enter');
  session = (await read(page)).sessions['magazine:1'];
  expect(session.solved).toEqual([]); expect(session.revealed).toEqual({}); expect(session.mistakes).toBe(0);
  await expect(page.locator('.toast.success,.toast.error,.cell.solved,.cell.revealed')).toHaveCount(0);
  await page.locator('#answer-input').fill('Z');
  expect((await read(page)).sessions['magazine:1'].mistakes).toBe(0);
  const beforeReload = (await read(page)).sessions['magazine:1'].values;
  await page.screenshot({ path: `test-results/magazine-${info.project.name}.png`, fullPage: false });
  await page.reload();
  await page.locator('[data-action="start"][data-mode="magazine"]').click();
  await expect(page.locator('.magazine-grid')).toBeVisible();
  expect((await read(page)).sessions['magazine:1'].values).toEqual(beforeReload);
  expect((await read(page)).sessions['classic:1']).toBeUndefined();
});

test('a filled magazine checks only the whole grid, preserves edits on failure and unlocks only after success', async ({ page }, info) => {
  test.setTimeout(90_000);
  await openMagazine(page);
  const initial = (await read(page)).sessions['magazine:1'];
  for (const word of initial.puzzle.words) {
    await page.locator(`.magazine-clue[data-word="${word.id}"]`).click();
    await page.locator('#answer-input').fill(word.answer);
    await page.locator('#answer-input').press('Enter');
  }
  const filled = (await read(page)).sessions['magazine:1'];
  expect(filled.completed).toBe(false); expect(filled.solved).toEqual([]); expect(filled.revealed).toEqual({});
  const word = initial.puzzle.words[0];
  await page.locator(`.magazine-clue[data-word="${word.id}"]`).click();
  const wrong = (word.answer[0] === 'Z' ? 'X' : 'Z') + word.answer.slice(1);
  await page.locator('#answer-input').fill(wrong);
  const before = (await read(page)).sessions['magazine:1'];
  await page.getByRole('button', { name: 'Conferir grade completa', exact: true }).click();
  await expect(page.locator('#grid-feedback')).toHaveText('A grade ainda não está correta. Revise suas respostas e confira novamente.');
  const after = (await read(page)).sessions['magazine:1'];
  expect(after.values).toEqual(before.values); expect(after.solved).toEqual([]); expect(after.revealed).toEqual({}); expect(after.completed).toBe(false);
  await expect(page.locator('.cell.solved,.cell.wrong,.cell.error,.cell.revealed')).toHaveCount(0);
  await page.locator('#answer-input').fill(word.answer);
  await page.getByRole('button', { name: 'Conferir grade completa', exact: true }).click();
  await expect(page.locator('.success-panel')).toBeVisible();
  const save = await read(page); expect(save.sessions['magazine:1'].completed).toBe(true); expect(save.results.magazine['1'].stars).toBe(2); expect(save.results.classic).toEqual({});
  await page.screenshot({ path: `test-results/magazine-victory-${info.project.name}.png`, fullPage: true });
  await page.locator('[data-action="next"]').click();
  await expect(page.locator('.page-head .eyebrow')).toContainText('02');
});

test('legacy profiles keep their existing progress while magazine hints and drafts persist independently', async ({ page }) => {
  const save = createSave(); save.seed = 'legacy-magazine';
  save.results.classic['1'] = { stars: 3, score: 1000, seconds: 40 };
  const raw = JSON.parse(JSON.stringify(save)); delete raw.results.magazine;
  await page.addInitScript(data => localStorage.setItem('neon-lexico:v1', JSON.stringify(data)), raw);
  await openMagazine(page);
  const session = (await read(page)).sessions['magazine:1'];
  const word = session.puzzle.words[0];
  await page.locator(`.magazine-clue[data-word="${word.id}"]`).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Revelar uma letra', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Revelar uma letra', exact: true })).toBeDisabled();
  const hinted = (await read(page)).sessions['magazine:1']; expect(hinted.hints).toBe(3); expect(hinted.solved).toEqual([]);
  expect((await read(page)).results.classic['1'].stars).toBe(3);
  const close = page.getByRole('button', { name: 'Fechar teclado', exact: true });
  if (await close.isVisible()) await close.click();
  await page.getByRole('button', { name: 'Trocar perfil', exact: true }).click();
  await page.getByRole('button', { name: 'Entrar como Larissa' }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('neon-lexico:v1:larissa')!).sessions)).toEqual({});
});
