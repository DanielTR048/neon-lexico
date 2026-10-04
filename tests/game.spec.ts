async function enterDaniel(page: import("@playwright/test").Page) { const button = page.getByRole("button", { name: "Entrar como Daniel" }); if (await button.isVisible()) await button.click(); }
import { test, expect, type Page } from '@playwright/test';
import type { Mode, SaveData, Session } from '../src/types';
import { createSave } from '../src/storage';
import { createSession, generatePuzzle } from '../src/engine';

async function state(page: Page): Promise<SaveData> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('neon-lexico:v1')!));
}
async function start(page: Page, mode: Mode) {
  await page.goto('/');
  await enterDaniel(page);
  await page.locator(`[data-action="start"][data-mode="${mode}"]`).click();
  await expect(page.locator('.theme-draw .theme-card')).toHaveCount(5);
  await page.locator('[data-action="begin"]').click();
  await expect(page.locator('#answer-input')).toBeVisible();
}

test('home, navigation, theme search and responsive layout', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await enterDaniel(page);
  await expect(page.locator('h1')).toContainText('O futuro');
  await expect(page.locator('.mode-card')).toHaveCount(2);
  await expect(page.locator('body')).not.toHaveText(/undefined|NaN/);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(overflow).toBe(false);
  await page.screenshot({ path: `test-results/home-${testInfo.project.name}.png`, fullPage: true, animations: 'disabled' });
  await page.locator('[data-view="themes"]:visible').first().click();
  await expect(page.locator('.theme-library .theme-card')).toHaveCount(44);
  await page.locator('#theme-search').fill('programação');
  await expect(page.locator('.theme-library .theme-card')).toHaveCount(1);
  await page.locator('#theme-search').fill('zzzzzz');
  await expect(page.locator('.empty-state')).toBeVisible();
  await page.locator('[data-view="map"]:visible').first().click();
  await expect(page.locator('.level-button')).toHaveCount(100);
  await expect(page.locator('.level-button:not([disabled])')).toHaveCount(1);
  expect(errors).toEqual([]);
});

for (const mode of ['classic', 'cascade'] as Mode[]) {
  test(`${mode}: solve, hints, incorrect answer, resume and unlock`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await start(page, mode);
    let save = await state(page);
    const initial = save.sessions[`${mode}:1`];
    const first = initial.puzzle.words[0];
    await page.locator('#answer-input').fill('Z'.repeat(first.answer.length));
    await page.locator('#answer-form button[type="submit"]').click();
    expect((await state(page)).sessions[`${mode}:1`].mistakes).toBe(1);
    await page.locator('[data-action="hint"]').click();
    expect((await state(page)).sessions[`${mode}:1`].hints).toBe(1);
    await page.screenshot({ path: `test-results/${mode}-${testInfo.project.name}.png`, fullPage: true, animations: 'disabled' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    const before = (await state(page)).sessions[`${mode}:1`];
    await page.reload();
    await page.locator(`[data-action="start"][data-mode="${mode}"]`).click();
    await expect(page.locator('#answer-input')).toBeVisible();
    const after = (await state(page)).sessions[`${mode}:1`];
    expect(after.revealed).toEqual(before.revealed);
    expect(after.values).toEqual(before.values);
    for (const word of initial.puzzle.words) {
      save = await state(page);
      if (save.sessions[`${mode}:1`].solved.includes(word.id)) continue;
      await page.locator(`[data-word="${word.id}"]`).click();
      await page.locator('#answer-input').fill(word.answer.toLowerCase());
      await page.locator('#answer-input').press('Enter');
    }
    await expect(page.locator('.success-panel')).toBeVisible();
    save = await state(page);
    expect(save.sessions[`${mode}:1`].completed).toBe(true);
    expect(save.results[mode]['1'].stars).toBe(2);
    expect(Object.keys(save.results[mode])).toHaveLength(1);
    await page.locator('[data-action="next"]').click();
    await expect(page.locator('.page-head .eyebrow')).toContainText('02');
    await expect(page.locator('.theme-draw .theme-card')).toHaveCount(5);
    expect(errors).toEqual([]);
  });
}

test('on-screen keyboard and physical keyboard, sound and reduced motion', async ({ page }) => {
  await start(page, 'classic');
  const session: Session = (await state(page)).sessions['classic:1'];
  const word = session.puzzle.words[0];
  for (const letter of word.answer) await page.locator(`[data-key="${letter}"]`).click();
  await page.locator('[data-key="Enter"]').click();
  expect((await state(page)).sessions['classic:1'].solved).toContain(word.id);
  let next = (await state(page)).sessions['classic:1'].puzzle.words.find(w=>!(session.solved.includes(w.id))&&w.id!==word.id)!;
  const latest=(await state(page)).sessions['classic:1'];
  next=latest.puzzle.words.find(w=>!latest.solved.includes(w.id))!;
  await page.locator(`[data-word="${next.id}"]`).click();
  await page.locator('#answer-input').fill(next.answer);
  await page.locator('#answer-input').press('Enter');
  expect((await state(page)).sessions['classic:1'].solved).toContain(next.id);
  await page.locator('[data-view="settings"]:visible').first().click();
  await page.locator('[data-action="motion"]').click();
  await expect(page.locator('html')).toHaveClass('reduce-motion');
  await page.locator('.setting-row [data-action="sound"]').click();
  expect((await state(page)).settings.sound).toBe(false);
});

test('last district remains usable on narrow screens and the campaign can finish', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const saved=createSave();
  saved.seed='last-district-qa';
  for(let n=1;n<100;n++) saved.results.classic[n]={stars:3,score:1000,seconds:60};
  saved.sessions['classic:100']=createSession(generatePuzzle(saved.seed,'classic',100));
  await page.addInitScript(data=>localStorage.setItem('neon-lexico:v1',JSON.stringify(data)),saved);
  await page.goto('/');
  await enterDaniel(page);
  await page.locator('[data-action="start"][data-mode="classic"]').click();
  await expect(page.locator('.game-header h1')).toContainText('100');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  await page.screenshot({path:`test-results/final-level-${testInfo.project.name}.png`,fullPage:true,animations:'disabled'});
  for(const word of saved.sessions['classic:100'].puzzle.words){
    if((await state(page)).sessions['classic:100'].solved.includes(word.id))continue;
    await page.locator(`[data-word="${word.id}"]`).click();
    await page.locator('#answer-input').fill(word.answer);
    await page.locator('#answer-input').press('Enter');
  }
  await expect(page.locator('.success-panel h2')).toHaveText('Você decifrou a cidade.');
  await expect(page.locator('[data-action="next"]')).toHaveCount(0);
  const final=await state(page);
  expect(Object.keys(final.results.classic)).toHaveLength(100);
  expect(final.results.classic['100'].stars).toBe(3);
  expect(Object.keys(final.results.cascade)).toHaveLength(0);
  await page.locator('[data-action="replay"]').click();
  await expect(page.locator('.theme-draw .theme-card')).toHaveCount(5);
  expect(Object.keys((await state(page)).results.classic)).toHaveLength(100);
});
