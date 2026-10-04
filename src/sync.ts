import { importSave, readProfile, saveGame, profileKey, type ProfileId } from './storage';
import type { SaveData } from './types';

export const API = import.meta.env.VITE_SYNC_API_URL || 'https://lexicon-laboratorio.nexcoreadm.chatgpt.site';
const CODE_KEY = 'lexicon-sync-code-v1';
type Meta = { etag?: string; dirty?: boolean; snapshot?: string };
type Remote = { save: SaveData; etag: string };
export type SyncResult = { kind: 'local' | 'saved' | 'pending' | 'offline' | 'conflict' | 'loaded'; save?: SaveData; error?: string };
const conflicts = new Map<ProfileId, Remote & { local: SaveData | null }>();
const locks = new Map<ProfileId, Promise<SyncResult>>();
const statuses = new Map<ProfileId, string>();
let listener = (_id: ProfileId, _message: string) => {};
export const setSyncListener = (value: typeof listener) => { listener = value; };
export const getCode = () => { try { return localStorage.getItem(CODE_KEY) || ''; } catch { return ''; } };
export const normalizeCode = (input: string) => input.trim().replace(/^LEX-/i, '').replace(/[-\s]/g, '').toLowerCase();
export const formatCode = (code: string) => 'LEX-' + (code.toUpperCase().match(/.{1,4}/g)?.join('-') || '');
export const newCode = () => crypto.randomUUID().replaceAll('-', '');
const metaKey = (id: ProfileId) => 'neon-sync-meta-v1:' + profileKey(id);
const meta = (id: ProfileId): Meta => { try { return JSON.parse(localStorage.getItem(metaKey(id)) || '{}'); } catch { return {}; } };
const writeMeta = (id: ProfileId, value: Meta) => localStorage.setItem(metaKey(id), JSON.stringify(value));
const snapshot = (id: ProfileId) => JSON.stringify(readProfile(id));
export const status = (id: ProfileId) => statuses.get(id) || (getCode() ? 'Pronto para sincronizar' : 'Salvo neste aparelho');
function report(id: ProfileId, message: string) { statuses.set(id, message); listener(id, message); }
export function markDirty(id: ProfileId) { try { writeMeta(id, { ...meta(id), dirty: true }); } catch { /* The snapshot also detects changed saves. */ } }
export const conflictFor = (id: ProfileId) => conflicts.get(id);
export const meaningful = (save: SaveData | null) => !!save && (Object.values(save.results).some(results => Object.keys(results).length) || Object.keys(save.sessions).length > 0 || !save.settings.sound || save.settings.reducedMotion);
async function request(path: string, code: string, options: RequestInit = {}): Promise<unknown> {
  const response = await fetch(API + '/api/' + path, { ...options, signal: AbortSignal.timeout(15000), headers: { Authorization: 'Bearer ' + code, 'Content-Type': 'application/json', ...options.headers } });
  const data = await response.json();
  if (!response.ok) { const error = new Error(data.error || 'Não foi possível sincronizar.') as Error & { status: number }; error.status = response.status; throw error; }
  return data;
}
export async function connectDevices(input: string, create = false) {
  const code = normalizeCode(input);
  if (!/^[a-f0-9]{32}$/.test(code)) throw new Error('Copie o código completo, começando com LEX-.');
  await request('family', code, { method: create ? 'POST' : 'GET' });
  const changed = getCode() !== code;
  localStorage.setItem(CODE_KEY, code);
  if (changed) for (const id of ['daniel', 'larissa'] as ProfileId[]) { writeMeta(id, { dirty: Boolean(readProfile(id)) }); conflicts.delete(id); }
}
export function syncProfile(id: ProfileId, resolve?: 'local' | 'cloud'): Promise<SyncResult> {
  const pending = locks.get(id); if (pending) return pending;
  const task = performSync(id, resolve).finally(() => locks.delete(id)); locks.set(id, task); return task;
}
async function performSync(id: ProfileId, resolve?: 'local' | 'cloud'): Promise<SyncResult> {
  const code = getCode(); if (!code) return { kind: 'local' };
  report(id, 'Sincronizando…');
  try {
    const before = snapshot(id); const local = readProfile(id); const metadata = meta(id);
    let remote: Remote | undefined;
    try { const data = await request('neon/profiles/' + id, code) as Remote; remote = { etag: data.etag, save: importSave(JSON.stringify(data.save)) }; }
    catch (error) { if ((error as { status?: number }).status !== 404) throw error; }
    if (getCode() !== code || snapshot(id) !== before) return { kind: 'pending' };
    const dirty = (metadata.dirty ?? Boolean(local)) || Boolean(metadata.snapshot && metadata.snapshot !== before);
    if (remote && ((resolve && conflicts.get(id)?.etag !== remote.etag) || (dirty && metadata.etag !== remote.etag && meaningful(local) && !resolve && JSON.stringify(remote.save) !== before))) {
      conflicts.set(id, { ...remote, local }); report(id, 'Escolha qual progresso continuar'); return { kind: 'conflict' };
    }
    if (remote && (resolve === 'cloud' || !dirty || (!meaningful(local) && metadata.etag !== remote.etag))) {
      if (local && resolve === 'cloud') localStorage.setItem('neon-sync-backup:' + id, JSON.stringify(local));
      if (!saveGame(remote.save, id)) throw new Error('O navegador não conseguiu guardar a campanha recebida.');
      writeMeta(id, { etag: remote.etag, dirty: false, snapshot: snapshot(id) }); conflicts.delete(id); report(id, 'Sincronizado');
      return { kind: 'loaded', save: readProfile(id)! };
    }
    if (!local) { report(id, 'Pronto para sincronizar'); return { kind: 'local' }; }
    if (remote && JSON.stringify(remote.save) === before) {
      writeMeta(id, { etag: remote.etag, dirty: false, snapshot: before }); conflicts.delete(id); report(id, 'Sincronizado'); return { kind: 'saved' };
    }
    if (resolve === 'local' && remote) localStorage.setItem('neon-sync-backup:' + id, JSON.stringify(remote.save));
    const result = await request('neon/profiles/' + id, code, { method: 'PUT', headers: remote ? { 'If-Match': '"' + remote.etag + '"' } : { 'If-None-Match': '*' }, body: JSON.stringify(local) }) as { etag: string };
    if (getCode() !== code) return { kind: 'pending' };
    const changed = snapshot(id) !== before;
    writeMeta(id, { etag: result.etag, dirty: changed, snapshot: before }); conflicts.delete(id); report(id, changed ? 'Alterações aguardando envio' : 'Sincronizado');
    return { kind: changed ? 'pending' : 'saved' };
  } catch (error) {
    report(id, (error as { status?: number }).status === 409 ? 'Progresso mudou em outro aparelho. Sincronize novamente.' : 'Salvo no aparelho · aguardando conexão');
    return { kind: 'offline', error: error instanceof Error ? error.message : 'Falha de conexão.' };
  }
}
