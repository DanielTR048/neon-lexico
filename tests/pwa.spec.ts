async function enterDaniel(page: import("@playwright/test").Page) { const button = page.getByRole("button", { name: "Entrar como Daniel" }); if (await button.isVisible()) await button.click(); }
import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import type { SaveData } from '../src/types';

test('production app caches its shell and fonts, then starts a phase offline', async ({ page, context }) => {
  await page.goto('/');
  await enterDaniel(page);
  await expect(page.getByRole('heading', { name: 'O futuro é um enigma.' })).toBeVisible();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  const cached = await page.evaluate(async () => {
    const keys = await caches.keys();
    const cache = await caches.open(keys.find(key => key.startsWith('neon-lexico-offline-'))!);
    return (await cache.keys()).map(request => new URL(request.url).pathname);
  });
  expect(cached.some(path => /\/assets\/.+\.js$/.test(path))).toBe(true);
  expect(cached.some(path => /\/assets\/.+\.css$/.test(path))).toBe(true);
  expect(cached.filter(path => /\.(ttf|woff2?)$/.test(path)).length).toBeGreaterThanOrEqual(2);
  expect(cached).toContain('/manifest.webmanifest');
  expect(cached).toContain('/icon-192.png');
  const failures: string[] = [];
  page.on('pageerror', error => failures.push(error.message));
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'O futuro é um enigma.' })).toBeVisible();
  await page.locator('[data-action="start"][data-mode="cascade"]').click();
  await expect(page.locator('.theme-draw .theme-card')).toHaveCount(5);
  await page.locator('[data-action="begin"]').click();
  await expect(page.locator('.cascade-line')).toHaveCount(5);
  await expect(page.locator('#active-clue')).toBeVisible();
  expect(failures).toEqual([]);
});

test('provisional letters survive reload and a downloaded backup can restore preferences and game state', async ({ page }) => {
  await page.goto('/');
  await enterDaniel(page);
  await page.locator('[data-action="start"][data-mode="classic"]').click();
  await page.locator('[data-action="begin"]').click();
  await expect(page.locator('#answer-input')).toBeVisible();
  await page.locator('#answer-input').fill('ZZ');
  const savedBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('neon-lexico:v1')!) as SaveData);
  expect(Object.values(savedBefore.sessions['classic:1'].values)).toEqual(['Z', 'Z']);
  await page.reload();
  await page.locator('[data-action="start"][data-mode="classic"]').click();
  await expect(page.locator('.cell').filter({ hasText: 'Z' })).toHaveCount(2);
  await page.locator('[data-view="settings"]:visible').first().click();
  const downloadPromise = page.waitForEvent('download');
  await page.locator('[data-action="export"]').click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).not.toBeNull();
  const backup = JSON.parse(await readFile(path!, 'utf8')) as SaveData;
  expect(backup.sessions['classic:1'].values).toEqual(savedBefore.sessions['classic:1'].values);
  backup.settings.sound = false;
  const dialogPromise = page.waitForEvent('dialog').then(dialog => dialog.accept());
  await page.locator('#import-file').setInputFiles({ name: 'campanha.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await dialogPromise;
  await expect(page.locator('#toast')).toContainText('Campanha restaurada');
  const restored = await page.evaluate(() => JSON.parse(localStorage.getItem('neon-lexico:v1')!) as SaveData);
  expect(restored.settings.sound).toBe(false);
  expect(restored.sessions['classic:1'].values).toEqual(savedBefore.sessions['classic:1'].values);
  await page.locator('[data-view="settings"]:visible').first().click();
  await expect(page.getByRole('switch', { name: 'Sons do terminal' })).toHaveAttribute('aria-checked', 'false');
  await page.locator('#import-file').setInputFiles({ name: 'corrompido.json', mimeType: 'application/json', buffer: Buffer.from('{"version":1,"seed":"<script>"}') });
  await expect(page.locator('#toast')).toContainText('Backup inválido');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('neon-lexico:v1')!).seed)).toBe(backup.seed);
});
