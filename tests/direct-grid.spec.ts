import { test, expect } from '@playwright/test';
import { wordCells } from '../src/engine';
import { MODES, type SaveData } from '../src/types';

for (const mode of MODES) test(`${mode}: tapping a middle square types there, advances and erases without a visible answer field`, async ({ page }, info) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Entrar como Daniel' }).click();
  await page.locator(`[data-action="start"][data-mode="${mode}"]`).click(); await page.locator('[data-action="begin"]').click();
  await expect(page.locator('#board')).toBeVisible();
  const read = () => page.evaluate(() => JSON.parse(localStorage.getItem('neon-lexico:v1')!) as SaveData);
  const session = (await read()).sessions[`${mode}:1`];
  const word = session.puzzle.words.find(word => wordCells(word).some((cell, index) => index > 0 && index < word.answer.length - 2 && session.puzzle.words.filter(other => wordCells(other).some(c => c.key === cell.key)).length === 1))!;
  const cells = wordCells(word), index = cells.findIndex((cell, index) => index > 0 && index < word.answer.length - 2 && session.puzzle.words.filter(other => wordCells(other).some(c => c.key === cell.key)).length === 1);
  await page.locator(`[data-cell="${cells[index].key}"]`).click();
  await expect(page.locator('#answer-input')).toBeFocused();
  const proxy = await page.locator('#answer-input').evaluate(input => ({ opacity: getComputedStyle(input).opacity, width: input.getBoundingClientRect().width, height: input.getBoundingClientRect().height }));
  expect(proxy.opacity).toBe('0'); expect(proxy.width).toBeLessThanOrEqual(1); expect(proxy.height).toBeLessThanOrEqual(1);
  await page.keyboard.type('ZQ');
  let typed = (await read()).sessions[`${mode}:1`];
  expect(typed.values[cells[index].key]).toBe('Z'); expect(typed.values[cells[index + 1].key]).toBe('Q'); expect(typed.values[cells[0].key]).toBeUndefined();
  await expect(page.locator(`[data-cell="${cells[index + 2].key}"]`)).toHaveClass(/cursor/);
  await page.keyboard.press('Backspace');
  typed = (await read()).sessions[`${mode}:1`]; expect(typed.values[cells[index + 1].key]).toBeUndefined(); expect(typed.values[cells[index].key]).toBe('Z'); expect(typed.mistakes).toBe(0);
  await page.keyboard.press('ArrowLeft'); await page.keyboard.type('A');
  expect((await read()).sessions[`${mode}:1`].values[cells[index].key]).toBe('A');
  await expect(page.locator('#active-clue')).toHaveText(word.clue);
  if (info.project.name === 'mobile') await page.screenshot({ path: `test-results/direct-grid-${mode}.png`, fullPage: false });
});
