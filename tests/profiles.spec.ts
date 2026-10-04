import { test, expect, type BrowserContext, type Page, type Route } from '@playwright/test';
import { createSave, importSave, profileKey, type ProfileId } from '../src/storage';
import { createSession, submitWord, useHint } from '../src/engine';
import type { Mode, Puzzle, PuzzleWord, SaveData } from '../src/types';

const CODE = '00112233445566778899aabbccddeeff';
const themes = ['nature', 'science', 'art', 'travel', 'history'];

function controlledSave(mode: Mode = 'classic', seed = 'profile-fixture'): SaveData {
  const save = createSave(); save.seed = seed;
  const word = (id: string, answer: string, row: number, col: number, direction: 'across' | 'down', number: number): PuzzleWord => ({
    id, answer, row, col, direction, number, clue: `Pista para ${id}`, difficulty: 1, themeId: themes[0], themeName: 'Natureza',
  });
  const puzzle: Puzzle = {
    id: `${seed}:${mode}:1`, mode, level: 1, themeIds: themes, difficulty: 'Primeiras conexões', rows: mode === 'classic' ? 4 : 3, cols: 4,
    words: mode === 'classic'
      ? [word('table', 'MESA', 0, 0, 'across', 1), word('fruit', 'MACA', 0, 0, 'down', 1), word('house', 'CASA', 2, 0, 'across', 2)]
      : [word('table', 'MESA', 0, 0, 'across', 1), word('bag', 'MALA', 1, 0, 'across', 2), word('room', 'SALA', 2, 0, 'across', 3)],
  };
  save.sessions[`${mode}:1`] = createSession(puzzle);
  // Keep fixtures subject to the same bounded parser used for downloaded saves.
  return importSave(JSON.stringify(save));
}

async function stored(page: Page, id: ProfileId = 'daniel'): Promise<SaveData | null> {
  return page.evaluate(key => { const value = localStorage.getItem(key); return value ? JSON.parse(value) : null; }, profileKey(id));
}
async function choose(page: Page, name: 'Daniel' | 'Larissa') {
  await page.getByRole('button', { name: `Entrar como ${name}`, exact: true }).click();
  await expect(page.locator('.profile-toolbar strong')).toHaveText(name);
}
async function switchTo(page: Page, name: 'Daniel' | 'Larissa') {
  await page.getByRole('button', { name: 'Trocar perfil', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Quem vai jogar hoje?' })).toBeVisible();
  await choose(page, name);
}
async function seedLocal(page: Page, save: SaveData, code?: string) {
  await page.addInitScript(({ data, code }) => {
    // Initialize only once so reload tests do not replace newly earned progress.
    if (!localStorage.getItem('neon-lexico:v1')) localStorage.setItem('neon-lexico:v1', JSON.stringify(data));
    if (code) localStorage.setItem('lexicon-sync-code-v1', code);
  }, { data: save, code });
}
async function syncNow(page: Page) {
  await page.locator('[data-action="sync-setup"]').click();
  await page.getByRole('button', { name: 'Sincronizar agora', exact: true }).click();
}

// A conditional server shared by independent browser contexts. Only API calls
// are mocked; campaign persistence, selectors, imports and conflict UI are real.
function cloudServer() {
  type Remote = { save: SaveData; etag: string };
  const families = new Set<string>(); const saves = new Map<string, Remote>();
  let revision = 0; let writes = 0;
  const key = (code: string, id: string) => `${code}:${id}`;
  const get = (code: string, id: ProfileId) => saves.get(key(code, id));
  const set = (code: string, id: ProfileId, save: SaveData) => {
    const value = { save: structuredClone(save), etag: `revision-${++revision}` }; saves.set(key(code, id), value); return value;
  };
  async function handle(route: Route) {
    const request = route.request(); const headers = request.headers();
    const cors = { 'Access-Control-Allow-Origin': headers.origin || '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS', 'Access-Control-Allow-Headers': 'Authorization,Content-Type,If-Match,If-None-Match', 'Access-Control-Expose-Headers': 'ETag' };
    const respond = (status: number, value: unknown, etag?: string) => route.fulfill({ status, contentType: 'application/json', headers: { ...cors, ...(etag ? { ETag: `"${etag}"` } : {}) }, body: JSON.stringify(value) });
    if (request.method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: cors }); return; }
    const code = headers.authorization?.match(/^Bearer ([a-f0-9]{32})$/)?.[1];
    if (!code) { await respond(401, { error: 'Código inválido.' }); return; }
    const path = new URL(request.url()).pathname;
    if (path === '/api/family' && request.method() === 'POST') { families.add(code); await respond(200, { profiles: ['daniel', 'larissa'] }); return; }
    if (!families.has(code)) { await respond(404, { error: 'Código não encontrado.' }); return; }
    if (path === '/api/family') { await respond(200, { profiles: ['daniel', 'larissa'] }); return; }
    const id = path.match(/^\/api\/neon\/profiles\/(daniel|larissa)$/)?.[1] as ProfileId | undefined;
    if (!id) { await respond(404, { error: 'Perfil não encontrado.' }); return; }
    const current = get(code, id);
    if (request.method() === 'GET') { await respond(current ? 200 : 404, current || { error: 'Ainda não há progresso online.' }, current?.etag); return; }
    if (request.method() !== 'PUT') { await respond(405, { error: 'Método inválido.' }); return; }
    const create = headers['if-none-match'] === '*'; const match = headers['if-match']?.replace(/^"|"$/g, '');
    if ((create && current) || (!create && (!current || match !== current.etag))) { await respond(409, { error: 'Há progresso mais recente.' }); return; }
    const saved = set(code, id, importSave(request.postData()!)); writes++; await respond(200, { etag: saved.etag }, saved.etag);
  }
  return { families, get, set, get writes() { return writes; }, install: (context: BrowserContext) => context.route('**/api/**', handle) };
}

test('Daniel keeps the legacy campaign while Larissa has separate progress and preferences', async ({ page }, testInfo) => {
  const legacy = controlledSave();
  legacy.settings.sound = false;
  legacy.results.cascade['1'] = { stars: 2, score: 500, seconds: 60 };
  legacy.sessions['classic:1'] = useHint(legacy.sessions['classic:1'], 'table');
  await seedLocal(page, legacy);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Quem vai jogar hoje?' })).toBeVisible();
  await expect(page.locator('.profile-card.daniel')).toContainText('1 fases · 2 estrelas');
  await expect(page.locator('.profile-card.larissa')).toContainText('0 fases · 0 estrelas');
  await expect(page.locator('#answer-input')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: testInfo.outputPath('profile-picker.png'), fullPage: true, animations: 'disabled' });
  await choose(page, 'Daniel');
  await page.locator('[data-action="start"][data-mode="classic"]').click();
  await expect(page.locator('[data-cell="0:0"]')).toHaveClass(/revealed/);
  expect((await stored(page))?.seed).toBe(legacy.seed);
  expect((await stored(page))?.sessions['classic:1'].hints).toBe(1);
  await switchTo(page, 'Larissa');
  expect((await stored(page, 'larissa'))?.sessions).toEqual({});
  expect((await stored(page, 'larissa'))?.settings.sound).toBe(true);
  await page.locator('[data-action="start"][data-mode="classic"]').click();
  await page.locator('[data-action="begin"]').click();
  await expect(page.locator('#answer-input')).toBeVisible();
  await page.getByRole('button', { name: 'Revelar uma letra', exact: true }).click();
  await page.locator('[data-view="settings"]:visible').first().click();
  await page.locator('[data-action="motion"]').click();
  expect((await stored(page, 'larissa'))?.settings.reducedMotion).toBe(true);
  await switchTo(page, 'Daniel');
  expect((await stored(page))?.settings).toEqual(legacy.settings);
  expect((await stored(page))?.sessions['classic:1'].revealed).toEqual(legacy.sessions['classic:1'].revealed);
  await page.reload();
  await expect(page.locator('.profile-toolbar strong')).toHaveText('Daniel');
  await page.locator('[data-action="start"][data-mode="classic"]').click();
  await expect(page.locator('[data-cell="0:0"]')).toHaveClass(/revealed/);
  expect((await stored(page, 'larissa'))?.sessions['classic:1'].hints).toBe(1);
});

test('switching profile while puzzle generation is pending cannot create a game for the other person', async ({ page }) => {
  await page.goto('/'); await choose(page, 'Daniel');
  await page.locator('[data-action="start"][data-mode="classic"]').click();
  await page.evaluate(() => {
    document.querySelector<HTMLButtonElement>('[data-action="begin"]')!.click();
    document.querySelector<HTMLButtonElement>('[data-action="switch-profile"]')!.click();
  });
  await choose(page, 'Larissa');
  await page.waitForTimeout(160); // Complete the real deferred generation started above.
  await expect(page.locator('h1')).toContainText('O futuro');
  await expect(page.locator('#answer-input')).toHaveCount(0);
  expect((await stored(page, 'daniel'))?.sessions).toEqual({});
  expect((await stored(page, 'larissa'))?.sessions).toEqual({});
});

for (const mode of ['classic', 'cascade'] as Mode[]) {
  test(`${mode}: three hints remain visible and propagate to connected cells`, async ({ page }, testInfo) => {
    await seedLocal(page, controlledSave(mode));
    await page.goto('/'); await choose(page, 'Daniel');
    await page.locator(`[data-action="start"][data-mode="${mode}"]`).click();
    await page.getByRole('button', { name: 'Revelar uma letra', exact: true }).click();
    await expect(page.locator('[data-cell="0:0"]')).toHaveClass(/revealed/);
    await expect(page.locator('[data-cell="0:0"]')).toContainText('M');
    if (mode === 'classic') {
      await page.locator('[data-word="fruit"]').click();
      await expect(page.locator('[data-cell="0:0"]')).toHaveClass(/selected/);
      await expect(page.locator('#answer-input')).toHaveValue('M');
      await page.locator('[data-word="table"]').click();
    } else {
      await expect(page.locator('[data-cell="1:0"]')).toHaveClass(/revealed/);
      await expect(page.locator('[data-cell="1:0"]')).toContainText('M');
    }
    await page.getByRole('button', { name: 'Revelar uma letra', exact: true }).click();
    await page.getByRole('button', { name: 'Revelar uma letra', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Revelar uma letra', exact: true })).toBeDisabled();
    await expect(page.locator('.answer-hint')).toContainText('3 dicas usadas de 3');
    const saved = (await stored(page))!.sessions[`${mode}:1`];
    expect(saved.hints).toBe(3);
    expect(saved.revealed['0:0']).toBe('M');
    if (mode === 'cascade') expect(saved.revealed['2:0']).toBe('S');
    await page.screenshot({ path: testInfo.outputPath(`${mode}-hint-propagation.png`), fullPage: true, animations: 'disabled' });
    await page.reload();
    await page.locator(`[data-action="start"][data-mode="${mode}"]`).click();
    await expect(page.getByRole('button', { name: 'Revelar uma letra', exact: true })).toBeDisabled();
    expect((await stored(page))?.sessions[`${mode}:1`].revealed).toEqual(saved.revealed);
  });
}

test('a connection code synchronizes a campaign between independent browser devices', async ({ page, browser }) => {
  const cloud = cloudServer(); await cloud.install(page.context());
  const local = controlledSave(); await seedLocal(page, local);
  await page.goto('/'); await choose(page, 'Daniel');
  await page.locator('[data-action="sync-setup"]').click();
  await page.getByRole('button', { name: 'Criar código de conexão', exact: true }).click();
  await expect(page.locator('#device-code')).toHaveAttribute('readonly', '');
  const displayed = await page.locator('#device-code').inputValue();
  const code = displayed.replace(/^LEX-/i, '').replaceAll('-', '').toLowerCase();
  await page.getByRole('button', { name: 'Sincronizar agora', exact: true }).click();
  await expect.poll(() => cloud.get(code, 'daniel')?.save.seed).toBe(local.seed);
  const otherContext = await browser.newContext({ baseURL: new URL('/', page.url()).href });
  try {
    await cloud.install(otherContext); const other = await otherContext.newPage();
    await other.goto('/');
    await other.getByRole('button', { name: 'Conectar site e app Android', exact: true }).click();
    await other.locator('#device-code').fill(displayed);
    await other.getByRole('button', { name: 'Conectar aparelhos', exact: true }).click();
    await expect(other.locator('#sync-dialog')).not.toBeVisible();
    await choose(other, 'Daniel');
    expect((await stored(other))?.seed).toBe(local.seed);
    await other.locator('[data-action="start"][data-mode="classic"]').click();
    await other.locator('#answer-input').fill('MESA'); await other.locator('#answer-input').press('Enter');
    await syncNow(other);
    await expect.poll(() => cloud.get(code, 'daniel')?.save.sessions['classic:1'].solved).toContain('table');
    await syncNow(page);
    await expect.poll(async () => (await stored(page))?.sessions['classic:1'].solved).toContain('table');
    expect(cloud.get(code, 'larissa')).toBeUndefined();
    expect(await stored(page, 'larissa')).toBeNull();
  } finally { await otherContext.close(); }
});

test('different device saves require an explicit choice and a newer unseen revision cannot be overwritten', async ({ page }) => {
  const cloud = cloudServer(); cloud.families.add(CODE); await cloud.install(page.context());
  const local = controlledSave('classic', 'local-campaign');
  local.sessions['classic:1'] = useHint(local.sessions['classic:1'], 'table');
  const online = controlledSave('classic', 'online-campaign');
  online.sessions['classic:1'] = submitWord(online.sessions['classic:1'], 'table', 'MESA').session;
  cloud.set(CODE, 'daniel', online); await seedLocal(page, local, CODE);
  await page.goto('/'); await choose(page, 'Daniel');
  await expect(page.getByRole('heading', { name: 'Qual progresso continuar?' })).toBeVisible();
  expect(await stored(page)).toEqual(local); expect(cloud.get(CODE, 'daniel')?.save).toEqual(online); expect(cloud.writes).toBe(0);
  const latest = structuredClone(online); latest.settings.sound = false; const newer = cloud.set(CODE, 'daniel', latest);
  await page.getByRole('button', { name: 'Usar este aparelho', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Usar este aparelho', exact: true })).toBeEnabled();
  expect(cloud.get(CODE, 'daniel')?.etag).toBe(newer.etag);
  expect(cloud.get(CODE, 'daniel')?.save).toEqual(latest); expect(cloud.writes).toBe(0); expect(await stored(page)).toEqual(local);
  await page.getByRole('button', { name: 'Continuar progresso online', exact: true }).click();
  await expect(page.locator('#sync-dialog')).not.toBeVisible();
  expect(await stored(page)).toEqual(latest);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('neon-sync-backup:daniel')!))).toEqual(local);
  expect(cloud.get(CODE, 'daniel')?.save).toEqual(latest); expect(cloud.writes).toBe(0);
  expect(await stored(page, 'larissa')).toBeNull();
});
