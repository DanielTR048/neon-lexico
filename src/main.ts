import './style.css';
import './profiles.css';
import './mobile-game.css';
import { themes } from './content';
import { cellKey, createSession, drawThemes, generatePuzzle, getScore, getStars, normalizeAnswer, submitWord, useHint, wordCells, MAX_HINTS } from './engine';
import { exportSave, importSave, loadSave, readProfile, recordCompletion, saveGame, unlockedLevel, profileKey, type ProfileId } from './storage';
import { getCode, formatCode, newCode, connectDevices, markDirty, syncProfile, status, conflictFor, setSyncListener, type SyncResult } from './sync';
import { cityArt, icon, logo, modeArt } from './art';
import type { Mode, PuzzleWord, Session, Theme } from './types';

type View = 'home' | 'map' | 'themes' | 'stats' | 'settings' | 'help' | 'setup' | 'play';
const app = document.querySelector<HTMLDivElement>('#app')!;
const players = [{ id: 'daniel' as ProfileId, name: 'Daniel', glyph: 'atom' }, { id: 'larissa' as ProfileId, name: 'Larissa', glyph: 'heart' }];
let activeProfile: ProfileId | undefined;
try { activeProfile = players.find(player => player.id === sessionStorage.getItem('neon-active-profile'))?.id; } catch { /* The picker still works without session storage. */ }
let save = loadSave(activeProfile);
let profileGeneration = 0;
let picking = false;
const syncTimers = new Map<ProfileId, ReturnType<typeof setTimeout>>();
let view: View = 'home';
let mode: Mode = 'classic';
let level = 1;
let selectedThemes: Theme[] = [];
let drawCount = 0;
let activeWordId = '';
let cursor = 0;
let searchTerm = '';
let revealAnimation: string[] = [];
let editingWord = false;
let storageOkay = true;
let toastTimer: ReturnType<typeof setTimeout>;
let audioContext: AudioContext | undefined;
let installEvent: (Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> }) | undefined;
const labels: Record<View, string> = { home: 'Central de jogo', map: 'Mapa de fases', themes: 'Universos', stats: 'Seu progresso', settings: 'Ajustes', help: 'Como jogar', setup: 'Sintonizar temas', play: 'Em jogo' };
const modeName = (m: Mode) => m === 'classic' ? 'Cruzadas clássicas' : 'Efeito cascata';
const esc = (value: unknown) => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
const pad = (n: number) => String(n).padStart(2, '0');
const timeLabel = (n: number) => `${pad(Math.floor(n / 60))}:${pad(n % 60)}`;
const sessionKey = () => `${mode}:${level}`;
const current = (): Session | undefined => save.sessions[sessionKey()];
const activeWord = () => current()?.puzzle.words.find(word => word.id === activeWordId);
const completedCount = (m: Mode) => Object.keys(save.results[m]).length;
const totalCompleted = () => completedCount('classic') + completedCount('cascade');
const totalStars = () => Object.values(save.results).flatMap(Object.values).reduce((sum, result) => sum + result.stars, 0);
const themeIcon = (theme: Theme) => ['shield', 'code', 'brain', 'chip', 'atom', 'book', 'bolt', 'layers'][Math.max(0, themes.findIndex(t => t.id === theme.id)) % 8];

function persist() {
  if (!activeProfile) return true;
  let changed = true;
  try { changed = localStorage.getItem(profileKey(activeProfile)) !== JSON.stringify(save); } catch { /* Save reports unavailable storage below. */ }
  storageOkay = saveGame(save, activeProfile);
  if (storageOkay) {
    const id = activeProfile;
    if (changed) markDirty(id);
    clearTimeout(syncTimers.get(id));
    syncTimers.set(id, setTimeout(() => { void synchronize(id); }, 1500));
  }
  if (!storageOkay) toast('Não foi possível salvar neste navegador. Exporte seu progresso em Ajustes.', 'error');
  return storageOkay;
}

const dialogMarkup = '<dialog id="sync-dialog" class="sync-dialog"></dialog>';
function pickerView() {
  const apk = import.meta.env.VITE_ANDROID_APK_URL;
  return `<main class="profile-picker"><div class="picker-logo">${logo}<span>NEON LÉXICO</span></div><div class="eyebrow">DUAS MENTES. DUZENTAS CONEXÕES.</div><h1>Quem vai jogar hoje?</h1><p>Cada pessoa tem sua própria campanha.<br>Escolha um perfil e continue de onde parou.</p><div class="profile-cards">${players.map(player => {
    const stored = readProfile(player.id);
    const results = stored ? Object.values(stored.results).flatMap(Object.values) : [];
    return `<button class="profile-card ${player.id}" data-action="choose-profile" data-profile="${player.id}" aria-label="Entrar como ${player.name}" ${picking ? 'disabled' : ''}><span class="profile-badge">${icon(player.glyph, 64)}</span><strong>${player.name}</strong><small>${results.length} fases · ${results.reduce((sum, result) => sum + result.stars, 0)} estrelas</small></button>`;
  }).join('')}</div><div class="picker-actions"><button class="btn outline" data-action="sync-setup">${icon('layers',16)} ${getCode() ? 'Código dos aparelhos' : 'Conectar site e app Android'}</button>${apk ? `<a class="btn outline" href="${esc(apk)}" download="neon-lexico-android.apk">${icon('download',16)} Baixar app Android</a>` : ''}</div><p class="picker-note">Seu progresso fica separado e funciona offline.<br>${getCode() ? 'Site e app conectados com o mesmo código.' : 'Use o mesmo código no site e no app para sincronizar.'}</p><div class="profile-loading" role="status">${picking ? 'Abrindo sua campanha…' : ''}</div></main>${dialogMarkup}`;
}
function resetProfileView() {
  editingWord = false;
  view = 'home'; mode = 'classic'; level = 1; selectedThemes = []; drawCount = 0; activeWordId = ''; cursor = 0; searchTerm = ''; revealAnimation = [];
  document.querySelectorAll('.confetti').forEach(node => node.remove());
}
async function chooseProfile(id: ProfileId) {
  if (picking || !players.some(player => player.id === id)) return;
  activeProfile = id; profileGeneration++; picking = false; save = loadSave(id); resetProfileView();
  try { sessionStorage.setItem('neon-active-profile', id); } catch { /* Selection lasts for this page. */ }
  if (!readProfile(id)) persist();
  render(); window.scrollTo(0, 0);
  void synchronize(id);
}
function switchProfile() {
  if (!persist()) return;
  activeProfile = undefined; profileGeneration++; resetProfileView();
  try { sessionStorage.removeItem('neon-active-profile'); } catch { /* Picker is already visible. */ }
  render(); window.scrollTo(0, 0);
}
function showDialog(html: string) {
  const dialog = document.querySelector<HTMLDialogElement>('#sync-dialog')!;
  dialog.innerHTML = `<button class="sync-close" data-action="sync-close" aria-label="Fechar">×</button>${html}`;
  if (!dialog.open) dialog.showModal();
}
function showSyncSetup(enterOther = false) {
  const code = getCode();
  showDialog(`<h2>Conectar seus aparelhos</h2><p>Use o mesmo código no site e no app Android. Daniel e Larissa têm campanhas separadas. Quem tem o código pode acessar os perfis dos jogos conectados.</p>${code && !enterOther ? `<label for="device-code">Código dos aparelhos</label><input id="device-code" value="${formatCode(code)}" readonly><button class="btn" data-action="copy-code">Copiar código</button><button class="btn outline" data-action="sync-now">Sincronizar agora</button><button class="btn text" data-action="sync-other">Usar outro código</button>` : `${!code ? '<button class="btn" data-action="create-code">Criar código de conexão</button>' : ''}<form id="connect-form"><label for="device-code">Código do outro aparelho</label><input id="device-code" required autocomplete="off" spellcheck="false" placeholder="LEX-…"><button class="btn outline" type="submit">Conectar aparelhos</button></form>`}<p class="sync-message" id="sync-message" role="status"></p>`);
}
function showConflict(id: ProfileId) {
  const conflict = conflictFor(id); if (!conflict) return;
  const summary = (data: typeof conflict.local) => data ? `${Object.values(data.results).flatMap(Object.values).length} fases · ${Object.values(data.sessions).reduce((sum, session) => sum + session.solved.length, 0)} palavras resolvidas` : 'Campanha nova';
  showDialog(`<h2>Qual progresso continuar?</h2><p>Este perfil foi jogado em dois aparelhos. Escolha a campanha que quer continuar. A outra fica guardada como cópia neste aparelho.</p><p class="sync-summary"><b>Neste aparelho:</b> ${summary(conflict.local)}<br><b>Online:</b> ${summary(conflict.save)}</p><button class="btn" data-action="sync-resolve" data-profile="${id}" data-choice="cloud">Continuar progresso online</button><button class="btn outline" data-action="sync-resolve" data-profile="${id}" data-choice="local">Usar este aparelho</button>`);
}
setSyncListener((id, message) => { if (activeProfile === id) { const label = document.querySelector('.sync-status'); if (label) label.textContent = message; } });
async function synchronize(id: ProfileId, resolve?: 'local' | 'cloud'): Promise<SyncResult> {
  const generation = profileGeneration;
  const result = await syncProfile(id, resolve);
  if (activeProfile === id && generation === profileGeneration && result.kind === 'loaded' && result.save) {
    save = result.save;
    if (!current()) { resetProfileView(); } else { activeWordId = ''; cursor = 0; }
    render();
  }
  if (result.kind === 'conflict' && (activeProfile === id || !activeProfile)) showConflict(id);
  if (result.kind === 'pending') { clearTimeout(syncTimers.get(id)); syncTimers.set(id, setTimeout(() => { void synchronize(id); }, 1500)); }
  return result;
}
async function syncCurrent() { for (const id of activeProfile ? [activeProfile] : players.map(player => player.id)) { const result = await synchronize(id); if (result.kind === 'conflict') return; } if (!activeProfile) render(); }

function tone(kind: 'tap' | 'correct' | 'wrong' | 'win' = 'tap') {
  if (!save.settings.sound) return;
  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === 'suspended') void audioContext.resume();
    const frequencies = kind === 'win' ? [392, 494, 587, 784] : kind === 'correct' ? [523, 659, 784] : kind === 'wrong' ? [165, 130] : [360];
    frequencies.forEach((frequency, index) => {
      const oscillator = audioContext!.createOscillator();
      const gain = audioContext!.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.value = frequency;
      const start = audioContext!.currentTime + index * .085;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(.045, start + .01);
      gain.gain.exponentialRampToValueAtTime(.001, start + .12);
      oscillator.connect(gain); gain.connect(audioContext!.destination);
      oscillator.start(start); oscillator.stop(start + .14);
    });
  } catch { /* Sound is optional when the browser does not offer audio. */ }
}

function toast(message: string, type = '') {
  const element = document.querySelector<HTMLDivElement>('#toast')!;
  element.textContent = message;
  element.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { element.className = 'toast'; }, 3600);
}

function navigate(next: View) {
  if (view === 'play') persist();
  view = next;
  tone();
  render();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function navButton(target: View, name: string, glyph: string, count = '') {
  const active = view === target || (target === 'map' && ['setup', 'play'].includes(view));
  return `<button class="nav-link ${active ? 'active' : ''}" data-view="${target}" ${active ? 'aria-current="page"' : ''}>${icon(glyph, 17)}<span>${name}</span>${count ? `<span class="nav-count">${count}</span>` : ''}</button>`;
}

function render() {
  if (view !== 'play' || current()?.completed) editingWord = false;
  const restoreFocus = view === 'play' && editingWord;
  document.documentElement.classList.toggle('game-playing', !!activeProfile && view === 'play');
  document.documentElement.classList.toggle('word-editing', !!activeProfile && view === 'play' && editingWord);
  const previousBoard = view === 'play' ? document.querySelector('#board') : null;
  const boardPosition = previousBoard ? { left: previousBoard.scrollLeft, top: previousBoard.scrollTop } : undefined;
  if (!activeProfile) { document.title = 'Neon Léxico — Escolha seu perfil'; app.innerHTML = pickerView(); return; }
  document.documentElement.classList.toggle('reduce-motion', save.settings.reducedMotion);
  document.title = `Neon Léxico — ${labels[view]}`;
  const page = { home: renderHome, map: renderMap, themes: renderThemes, stats: renderStats, settings: renderSettings, help: renderHelp, setup: renderSetup, play: renderGame }[view]();
  app.innerHTML = `<div class="app-shell"><aside class="sidebar"><button class="brand" data-view="home" aria-label="Neon Léxico, início">${logo}<span class="brand-name">NEON<span style="display:block">LÉXICO</span><small>WORD ARCADE</small></span></button><div class="side-caption">SEU TERMINAL</div><nav aria-label="Navegação principal">${navButton('home','Central de jogo','home')}${navButton('map','Mapa de fases','grid','200')}${navButton('themes','Universos','layers',String(themes.length))}${navButton('stats','Seu progresso','trophy')}</nav><div class="sidebar-bottom">${navButton('help','Como jogar','help')}${navButton('settings','Ajustes','settings')}<div class="side-system"><div class="signal-line"><span class="status-dot"></span> SISTEMA ONLINE</div><small>EST. 2086 · VERSÃO 1.0</small></div></div></aside><div class="main-wrap"><header class="topbar"><div class="breadcrumb">TERMINAL <span>/</span><b>${labels[view]}</b></div><button class="mobile-brand" data-view="home" aria-label="Neon Léxico, início">${logo} NEON LÉXICO</button><div class="top-actions"><div class="small-pill">${icon('star',12)} ${totalStars()} ESTRELAS</div><button class="icon-btn" data-action="sound" aria-label="${save.settings.sound ? 'Desativar' : 'Ativar'} som" title="Som">${icon(save.settings.sound ? 'sound' : 'mute',16)}</button><div class="avatar" title="Seu perfil local">LX</div></div></header><main id="main" class="main-content">${!storageOkay ? '<div class="save-warning">Seu navegador não está salvando. Use Ajustes → Exportar progresso.</div>' : ''}${page}<footer class="footer"><span>NEON LÉXICO © 2086<br>UMA PALAVRA. UMA NOVA CONEXÃO.</span><span class="footer-right">FEITO PARA MENTES CURIOSAS.</span></footer></main></div><nav class="mobile-nav" aria-label="Navegação no celular">${(['home','map','themes','stats','settings'] as View[]).map((v,i)=>`<button data-view="${v}" class="${v===view || v==='map'&&['setup','play'].includes(view) ? 'active' : ''}" aria-label="${labels[v]}">${icon(['home','grid','layers','trophy','settings'][i])}<span>${['Início','Fases','Universos','Progresso','Ajustes'][i]}</span></button>`).join('')}</nav></div>`;
  app.querySelector('.topbar')?.insertAdjacentHTML('afterend', `<div class="profile-toolbar"><strong>${players.find(player => player.id === activeProfile)!.name}</strong><button class="sync-status" data-action="sync-setup">${status(activeProfile)}</button><button data-action="switch-profile">Trocar perfil</button></div>`);
  app.insertAdjacentHTML('beforeend', dialogMarkup);
  if (boardPosition) { const board = document.querySelector('#board'); if (board) { board.scrollLeft = boardPosition.left; board.scrollTop = boardPosition.top; } }
  if (restoreFocus) focusAnswer();
}

function renderHome() {
  return `<section class="hero"><div class="hero-copy"><div class="eyebrow">TRANSMISSÃO ABERTA · 2086</div><h1>O futuro é<br>um <em>enigma.</em></h1><p>Em uma cidade feita de códigos, cada palavra abre um novo caminho. Sintonize sua mente.</p><div class="hero-pills"><span>${icon('grid',12)} 200 FASES</span><span>${icon('layers',12)} ${themes.length} UNIVERSOS</span><span>${icon('bolt',12)} 2 MODOS</span></div></div><div class="hero-visual"><span class="visual-label">⌖ DISTRITO LÉXICO</span>${cityArt()}</div></section><section><div class="section-heading"><h2>Escolha sua frequência</h2><span class="meta">01 / 02 MODOS DE JOGO</span></div><div class="modes">${(['classic','cascade'] as Mode[]).map((m,i)=>`<article class="mode-card ${i?'violet':''}"><div class="mode-tag"><span class="tag-square"></span> ${i ? 'CONEXÕES EM CADEIA' : 'O CLÁSSICO, RECONECTADO'}</div><div class="card-main"><div><h3>${i?'Efeito<br>cascata':'Cruzadas<br>clássicas'}</h3><p>${i?'Uma resposta acende a próxima. Descubra palavras e libere letras nas linhas abaixo.':'Cruze ideias, conecte palavras. Resolva as pistas e complete cada espaço da grade.'}</p></div>${modeArt(!!i)}</div><div class="mode-footer"><span class="phase-count"><strong>${pad(completedCount(m))}</strong> / 100 FASES</span><button class="btn ${i?'violet':''}" data-action="start" data-mode="${m}">${completedCount(m)||save.sessions[`${m}:1`] ? 'Continuar' : 'Iniciar jornada'} ${icon('arrow',16)}</button></div></article>`).join('')}</div></section><section class="home-bottom"><div class="transmission"><div class="trans-icon">${icon('shuffle',23)}</div><div><div class="eyebrow">NENHUMA CONEXÃO É POR ACASO</div><h3>Cinco temas. Infinitas conexões.</h3><p>Heróis, ciência, código e muito mais. A cada fase, cinco universos se encontram no seu tabuleiro.</p></div></div><div class="mini-stats"><div class="mini-stat"><b>${pad(totalCompleted())}<span style="font-size:13px;color:#8f7b9c"> / 200</span></b><span>FASES CONCLUÍDAS</span></div><div class="mini-stat"><b>${icon('star',18)}${totalStars()}</b><span>ESTRELAS CONQUISTADAS</span></div></div></section>`;
}

function pageHead(eyebrow: string, title: string, description: string) {
  return `<div class="page-head"><div class="eyebrow">${eyebrow}</div><h1 class="page-title">${title}</h1><p class="page-description">${description}</p></div>`;
}

function modeSwitch() {
  return `<div class="segmented" aria-label="Selecionar modo">${(['classic','cascade'] as Mode[]).map(m=>`<button data-action="mode" data-mode="${m}" class="${m===mode?'active':''}" aria-pressed="${m===mode}">${modeName(m)}</button>`).join('')}</div>`;
}

function renderMap() {
  const unlocked = unlockedLevel(save,mode);
  const sectors = ['Primeiro sinal','Ruas de neon','Circuito aberto','Memória de silício','Frequência oculta','Cidade sintética','Além do firewall','Horizonte de dados','Última transmissão','O núcleo'];
  return `${pageHead('CAMPANHA / 200 FASES','Toda conexão começa aqui.','Dez distritos, cem desafios em cada modo. Conclua uma fase para abrir a próxima. Você pode voltar às fases que já venceu.')}<div class="toolbar">${modeSwitch()}<span class="small-pill">${completedCount(mode)} / 100 CONCLUÍDAS</span></div>${sectors.map((sector,index)=>`<h2 class="sector-label">DISTRITO ${pad(index+1)} <span style="color:var(--amber)">/ ${sector.toUpperCase()}</span></h2><div class="level-grid">${Array.from({length:10},(_,i)=>{const n=index*10+i+1;const result=save.results[mode][n];const locked=n>unlocked;return `<button class="level-button ${result?'done':n===unlocked?'current':''}" data-action="level" data-level="${n}" ${locked?'disabled':''} aria-label="Fase ${n}${locked?', bloqueada':result?`, concluída, ${result.stars} estrelas`: ', disponível'}">${locked?icon('lock',15):`<b>${pad(n)}</b>`}<small>${result?'★'.repeat(result.stars)+'☆'.repeat(3-result.stars):locked?pad(n):'JOGAR'}</small></button>`}).join('')}</div>`).join('')}`;
}

function renderSetup() {
  return `${pageHead(`${modeName(mode).toUpperCase()} / FASE ${pad(level)}`,'Sintonize seus universos.','Cinco temas sorteados. Todas as palavras desta fase vêm desses universos. Gostou da combinação? Então entre no circuito.')}<div class="theme-draw">${selectedThemes.map((theme,index)=>themeCard(theme,index)).join('')}</div><div class="setup-bottom"><p><b>${level<=30?'SINAL INICIAL':level<=65?'SINAL AVANÇADO':'SINAL MESTRE'}</b><br>${mode==='classic'?'As letras compartilhadas conectam as palavras.':'Acerte uma linha para revelar letras iguais nas linhas abaixo.'}<br>Sem limite de tempo. Jogue no seu ritmo.</p><div class="setup-actions"><button class="btn outline" data-action="shuffle">${icon('shuffle',15)} Sortear novamente</button><button class="btn" data-action="begin">Entrar no circuito ${icon('arrow',16)}</button></div></div><div class="tip-note">${icon('bulb',14)} &nbsp;Acentos, espaços e hífens não entram nas casas. “Inteligência” vira INTELIGENCIA. As pistas mostram o número de letras.</div><button class="btn text" data-view="map">${icon('back',15)} Voltar ao mapa</button>`;
}

function themeCard(theme: Theme, index: number, library = false) {
  return `<article class="theme-card" style="--i:${index}"><span class="theme-number">${pad(index+1)}</span><div class="theme-icon">${icon(themeIcon(theme),21)}</div><h3>${esc(theme.name)}</h3><p>${esc(theme.description)}</p>${library?`<small>${theme.entries.length} PALAVRAS · 3 DIFICULDADES</small>`:''}</article>`;
}

function renderThemes() {
  const filtered = themes.filter(theme=>normalizeAnswer(`${theme.id} ${theme.name} ${theme.description}`).includes(normalizeAnswer(searchTerm)));
  return `${pageHead(`${themes.length} UNIVERSOS / ${themes.reduce((sum,t)=>sum+t.entries.length,0)} PISTAS`,'Uma mente. Muitos mundos.','Da psicologia aos super-heróis, da programação ao espaço. Explore os assuntos que podem aparecer no seu próximo sorteio.')}<div class="toolbar"><label for="theme-search" class="sr-only">Buscar universos</label><input class="search" id="theme-search" type="search" placeholder="Buscar um universo…" value="${esc(searchTerm)}" autocomplete="off"><span class="small-pill" id="theme-count">${filtered.length} UNIVERSOS</span></div><div class="theme-library" id="theme-library">${filtered.map((theme,index)=>themeCard(theme,index,true)).join('') || '<p class="empty-state">Nenhum universo encontrado. Tente outra palavra.</p>'}</div>`;
}

function renderStats() {
  const results = Object.values(save.results).flatMap(Object.values);
  const score = results.reduce((sum,result)=>sum+result.score,0);
  const perfect = results.filter(result=>result.stars===3).length;
  return `${pageHead('SEU ARQUIVO DE CONEXÕES','Cada palavra deixa uma marca.','Seu progresso é salvo neste navegador. Exporte um backup em Ajustes para levar a campanha a outro dispositivo.')}<div class="stat-grid">${[[String(totalCompleted()),'Fases concluídas','grid'],[String(totalStars()),'Estrelas conquistadas','star'],[score.toLocaleString('pt-BR'),'Pontos de conexão','bolt'],[String(perfect),'Fases com 3 estrelas','trophy']].map(([number,label,glyph])=>`<div class="stat-card">${icon(glyph,22)}<b>${number}</b><span>${label}</span></div>`).join('')}</div>${(['classic','cascade'] as Mode[]).map(m=>`<div class="progress-row"><h3>${modeName(m)}</h3><div class="progress-track"><span style="width:${completedCount(m)}%"></span></div><p>${completedCount(m)} de 100 fases concluídas · ${Object.values(save.results[m]).reduce((sum,result)=>sum+result.stars,0)} de 300 estrelas</p></div>`).join('')}<div class="tip-note">Três estrelas: complete sem dicas e sem erros. Duas: até 4 dicas e erros somados. Uma: conclua no seu ritmo. Sempre dá para tentar novamente.</div><button class="btn" data-view="map">Voltar à jornada ${icon('arrow',16)}</button>`;
}

function renderSettings() {
  return `${pageHead('CONFIGURAÇÕES DO TERMINAL','Seu jogo, sua frequência.','Ajuste os efeitos e cuide da sua campanha. Não é necessário criar uma conta.')}<div class="settings-panel"><div class="setting-row"><div><h3>Sons do terminal</h3><p>Notas de sintetizador nas interações e nos acertos.</p></div><button class="toggle ${save.settings.sound?'on':''}" data-action="sound" role="switch" aria-label="Sons do terminal" aria-checked="${save.settings.sound}"><span></span></button></div><div class="setting-row"><div><h3>Reduzir movimento</h3><p>Suaviza animações. A preferência do sistema também é respeitada.</p></div><button class="toggle ${save.settings.reducedMotion?'on':''}" data-action="motion" role="switch" aria-label="Reduzir movimento" aria-checked="${save.settings.reducedMotion}"><span></span></button></div><div class="setting-row"><div><h3>Guardar uma cópia</h3><p>Baixe seu progresso e partidas em andamento.</p></div><button class="btn outline" data-action="export">${icon('download',15)} Exportar</button></div><div class="setting-row"><div><h3>Restaurar progresso</h3><p>Substitui a campanha deste navegador por um backup seu.</p></div><button class="btn outline" data-action="import">${icon('upload',15)} Importar</button><input type="file" id="import-file" accept="application/json,.json" hidden></div><div class="setting-row"><div><h3>Neon Léxico no celular</h3><p>Instale pela opção “Adicionar à tela inicial” do navegador. Após carregar a versão de produção, o jogo também funciona offline.</p></div><button class="btn outline" data-action="install">${icon('download',15)} Instalar</button></div></div><div class="tip-note">O progresso fica no dispositivo. Limpar os dados do navegador remove a campanha salva; guarde um backup antes.</div>`;
}

function renderHelp() {
  return `${pageHead('MANUAL DE CAMPO','Primeiro, encontre a conexão.','Não há cronômetro regressivo nem vidas para perder. Teste suas ideias, use as pistas e aproveite a descoberta.')}<div class="help-grid"><article class="help-card">${icon('grid',26)}<h2>Cruzadas clássicas</h2><p>Selecione uma pista ou uma casa. Digite a resposta completa no campo e confirme. Você também pode preencher com o teclado do jogo.</p><p>Palavras horizontais e verticais compartilham casas. Ao acertar uma, as letras dos cruzamentos ficam disponíveis para as outras. Toque de novo em um cruzamento para trocar a direção.</p></article><article class="help-card">${icon('layers',26)}<h2>Efeito cascata</h2><p>Cada linha é uma palavra. Ao descobrir uma resposta, suas letras iguais aparecem automaticamente em todas as linhas abaixo.</p><p>Comece por cima para criar uma corrente de descobertas. Todas as pistas ficam disponíveis; você pode resolver em outra ordem se preferir.</p></article><article class="help-card">${icon('bulb',26)}<h2>Uma luz quando precisar</h2><p>A lâmpada revela uma letra da palavra selecionada. São três dicas por fase. Cada dica revela uma letra nos cruzamentos; na cascata, a letra também aparece nas linhas abaixo. As dicas reduzem a pontuação e podem diminuir as estrelas da fase.</p><p>Sem acentos, espaços ou pontuação nas casas. As pistas indicam a quantidade de letras e o tema de cada resposta.</p></article><article class="help-card">${icon('trophy',26)}<h2>200 conexões para descobrir</h2><p>Cada modo tem 100 fases. A dificuldade cresce com palavras mais desafiadoras e tabuleiros maiores. Cinco temas são sorteados antes de cada nova fase.</p><p>Enter confirma; Backspace apaga; as setas percorrem as letras da palavra selecionada. No celular, use o campo de resposta ou o teclado na tela.</p></article></div><button class="btn" data-view="home">Tudo pronto. Vamos jogar. ${icon('arrow',16)}</button>`;
}

function selectWord(id: string, cell?: string) {
  const session = current();
  const word = session?.puzzle.words.find(w=>w.id===id);
  if (!session || !word) return;
  activeWordId = id;
  editingWord = true;
  const cells = wordCells(word);
  cursor = cell ? Math.max(0,cells.findIndex(c=>c.key===cell)) : Math.max(0,cells.findIndex(c=>!session.values[c.key]));
  render();
}

function focusAnswer() {
  const input = document.querySelector<HTMLInputElement>('#answer-input');
  if (input && !input.disabled) input.focus({ preventScroll: true });
  updateKeyboardViewport();
  if (editingWord && matchMedia('(max-width:700px)').matches) document.querySelector('.board-panel')?.scrollIntoView({ block: 'start', behavior: 'instant' });
}

function updateKeyboardViewport() {
  const viewport = window.visualViewport;
  const inset = viewport ? Math.max(0, innerHeight - viewport.height - viewport.offsetTop) : 0;
  document.documentElement.style.setProperty('--ime-bottom', `${inset}px`);
  document.documentElement.style.setProperty('--visual-height', `${viewport?.height || innerHeight}px`);
  document.documentElement.classList.toggle('ime-visible', inset > 100);
  if (editingWord && matchMedia('(max-width:700px)').matches) {
    const editorHeight = document.querySelector('.word-editor')?.getBoundingClientRect().height || 0;
    const headerHeight = document.querySelector('.topbar')?.getBoundingClientRect().height || 0;
    const navigationHeight = inset > 100 ? 0 : document.querySelector('.mobile-nav')?.getBoundingClientRect().height || 0;
    document.documentElement.style.setProperty('--typing-board-height', `${Math.max(80, (viewport?.height || innerHeight) - editorHeight - headerHeight - navigationHeight - 12)}px`);
    const board = document.querySelector('#board');
    const selected = current() && activeWord() ? wordCells(activeWord()!)[cursor] : undefined;
    const cell = selected && board?.querySelector(`[data-cell="${selected.key}"]`);
    if (board && cell) {
      const grid = board.getBoundingClientRect(), tile = cell.getBoundingClientRect();
      if (tile.bottom > grid.bottom) board.scrollTop += tile.bottom - grid.bottom + 8;
      else if (tile.top < grid.top) board.scrollTop += tile.top - grid.top - 8;
      if (tile.right > grid.right) board.scrollLeft += tile.right - grid.right + 8;
      else if (tile.left < grid.left) board.scrollLeft += tile.left - grid.left - 8;
    }
  }
}
window.visualViewport?.addEventListener('resize', updateKeyboardViewport);
window.visualViewport?.addEventListener('scroll', updateKeyboardViewport);
window.addEventListener('resize', updateKeyboardViewport);
updateKeyboardViewport();

function renderGame() {
  const session = current();
  if (!session) return '<p class="empty-state">Escolha uma fase no mapa para começar.</p>';
  const puzzle = session.puzzle;
  if (!puzzle.words.some(word=>word.id===activeWordId)) activeWordId = (puzzle.words.find(word=>!session.solved.includes(word.id)) || puzzle.words[0]).id;
  const word = activeWord()!;
  const complete = session.completed;
  return `<div class="game-header"><div><div class="eyebrow">${modeName(mode).toUpperCase()} / ${esc(puzzle.difficulty)}</div><h1>Fase ${pad(level)} <span style="color:var(--muted);font-weight:400">· ${complete?'Sinal decifrado':'Encontre a conexão'}</span></h1></div><div class="game-badges"><span class="small-pill">${icon('clock',12)} <span id="timer">${timeLabel(session.elapsed)}</span></span><span class="small-pill">${icon('bolt',12)} <span id="score">${getScore(session)}</span> PTS</span></div></div><div class="game-themes">${puzzle.themeIds.map(id=>`<span class="theme-chip">${esc(themes.find(t=>t.id===id)?.name || id)}</span>`).join('')}</div>${complete?renderSuccess(session):''}<div class="game-layout"><section class="board-panel" aria-label="Tabuleiro de ${modeName(mode)}"><div class="board-caption"><span>${mode==='classic'?'CRUZADAS DE REVISTA':'CONEXÕES EM CASCATA'}</span><b>${session.solved.length} / ${puzzle.words.length} DECIFRADAS</b></div><div id="board" class="board-scroll">${renderBoard(session)}</div><div class="board-legend"><span><i class="legend-box"></i> A descobrir</span><span><i class="legend-box amber"></i> Letra conectada</span></div><div class="game-progress"><div class="progress-track"><span style="width:${session.solved.length/puzzle.words.length*100}%"></span></div><span>${Math.round(session.solved.length/puzzle.words.length*100)}% DO SINAL</span></div></section><section class="game-side" aria-label="Pistas e respostas"><div class="word-editor ${editingWord?'editing':''}">${!complete?`<form class="answer-panel" id="answer-form"><div class="answer-kicker"><span>${word.number}${mode==='classic'?(word.direction==='across'?' → HORIZONTAL':' ↓ VERTICAL'):' / LINHA'}</span><span>${word.answer.length} LETRAS</span><button type="button" class="editor-close" data-action="close-keyboard" aria-label="Fechar teclado">⌄</button></div><h2 id="active-clue">${esc(word.clue)}</h2><label for="answer-input" class="sr-only">Resposta para a pista ${word.number}</label><input id="answer-input" class="answer-input" type="text" autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false" maxlength="40" value="${esc(answerPrefix(session,word))}" placeholder="${session.solved.includes(word.id)?'Palavra decifrada':`Sua resposta · ${word.answer.length} letras`}" ${session.solved.includes(word.id)?'disabled':''} aria-describedby="active-clue"><div class="answer-controls"><button type="submit" class="btn" ${session.solved.includes(word.id)?'disabled':''}>Conectar ${icon('arrow',15)}</button><button type="button" class="btn outline" data-action="hint" aria-label="Revelar uma letra" title="Dicas disponíveis nesta fase" ${session.solved.includes(word.id)||session.hints>=MAX_HINTS?'disabled':''}>${icon('bulb',18)} <small>${Math.max(0,MAX_HINTS-session.hints)}/${MAX_HINTS}</small></button></div><p class="answer-hint">${esc(word.themeName)} · ${session.hints} ${session.hints===1?'dica usada de 3':'dicas usadas de 3'} · ${session.mistakes} ${session.mistakes===1?'tentativa incorreta':'tentativas incorretas'}</p></form>`:''}${!complete?renderKeyboard():''}</div><div class="word-list"><div class="list-heading">${mode==='classic'?'PISTAS DA FREQUÊNCIA':'PISTAS / DE CIMA PARA BAIXO'}</div>${puzzle.words.map(w=>`<button class="word-clue ${w.id===activeWordId?'active':''} ${session.solved.includes(w.id)?'is-solved':''}" data-word="${esc(w.id)}"><span class="clue-num">${session.solved.includes(w.id)?icon('check',14):w.number}</span><span class="clue-copy">${esc(w.clue)}<small>${esc(w.themeName)} · ${w.answer.length} letras${mode==='classic'?` · ${w.direction==='across'?'horizontal →':'vertical ↓'}`:''}${session.solved.includes(w.id)?` · ${esc(w.answer)}`:''}</small></span></button>`).join('')}</div></section></div><div class="toolbar"><button class="btn text" data-view="map">${icon('back',15)} Salvar e voltar ao mapa</button></div>`;
}

function renderBoard(session: Session) {
  const word = session.puzzle.words.find(w=>w.id===activeWordId);
  const activeKeys = word ? wordCells(word).map(c=>c.key) : [];
  const solvedKeys = new Set(session.puzzle.words.filter(w=>session.solved.includes(w.id)).flatMap(wordCells).map(c=>c.key));
  const numbers = new Map(session.puzzle.words.map(w=>[cellKey(w.row,w.col),w.number]));
  const cell = (key:string, index=0) => `<button class="cell ${activeKeys.includes(key)?'selected':''} ${activeKeys[cursor]===key&&!session.completed?'cursor':''} ${session.revealed[key]?'revealed':''} ${solvedKeys.has(key)?'solved':''} ${revealAnimation.includes(key)?'just-revealed':''}" data-cell="${key}" style="--i:${index}" aria-label="${numbers.has(key)?`Palavra ${numbers.get(key)}, `:''}casa ${key.replace(':',', ')}, ${session.values[key] || 'vazia'}">${session.puzzle.mode==='classic'&&numbers.has(key)?`<small>${numbers.get(key)}</small>`:''}${session.values[key]||''}</button>`;
  if (session.puzzle.mode==='cascade') return `<div class="cascade-board">${session.puzzle.words.map(w=>`<div class="cascade-line ${session.solved.includes(w.id)?'done':''}"><span class="cascade-number">${pad(w.number)}</span><div class="cascade-cells">${wordCells(w).map((c,index)=>cell(c.key,index)).join('')}</div>${session.solved.includes(w.id)?`<span style="color:var(--amber)">${icon('check',14)}</span>`:''}</div>`).join('')}</div>`;
  const allKeys = new Set(session.puzzle.words.flatMap(wordCells).map(c=>c.key));
  return `<div class="crossword" style="--cols:${session.puzzle.cols}" aria-label="Grade com ${session.puzzle.rows} linhas e ${session.puzzle.cols} colunas">${Array.from({length:session.puzzle.rows},(_,row)=>Array.from({length:session.puzzle.cols},(_,col)=>{const key=cellKey(row,col);return allKeys.has(key)?cell(key,col):'<span class="cell blank" aria-hidden="true"></span>'}).join('')).join('')}</div>`;
}

function renderKeyboard() {
  return `<div class="keyboard" aria-label="Teclado do jogo">${['QWERTYUIOP','ASDFGHJKL','ZXCVBNM'].map((row,i)=>`<div class="keyboard-row">${i===2?'<button class="key wide" data-key="Enter" aria-label="Confirmar palavra">ENTER</button>':''}${[...row].map(char=>`<button class="key" data-key="${char}" aria-label="Letra ${char}">${char}</button>`).join('')}${i===2?'<button class="key wide" data-key="Backspace" aria-label="Apagar letra">⌫</button>':''}</div>`).join('')}</div>`;
}

function renderSuccess(session: Session) {
  const stars = getStars(session);
  return `<section class="success-panel" aria-live="polite"><div class="big-stars" aria-label="${stars} estrelas">${'★'.repeat(stars)}${'☆'.repeat(3-stars)}</div><h2>${level===100?'Você decifrou a cidade.':'Conexão estabelecida.'}</h2><p>${level===100?`As 100 fases de ${modeName(mode).toLowerCase()} estão completas. Um universo inteiro de palavras passou por você.`:`Fase ${pad(level)} concluída. Mais um sinal recuperado em Nova Aurora.`}<br>${getScore(session)} pontos · ${timeLabel(session.elapsed)} · ${session.hints} dicas</p><div class="success-actions">${level<100?`<button class="btn" data-action="next">Próxima frequência ${icon('arrow',15)}</button>`:`<button class="btn" data-view="stats">Ver minhas conquistas ${icon('trophy',15)}</button>`}<button class="btn outline" data-action="replay">Jogar novamente</button></div></section>`;
}

function prepare(m: Mode, n: number, replay = false) {
  mode=m; level=n;
  if(n>unlockedLevel(save,m)) { toast('Conclua a fase anterior para abrir esta conexão.'); return; }
  const existing = current();
  if(existing && !replay) {activeWordId='';cursor=0;navigate('play');return;}
  selectedThemes=drawThemes(`${save.seed}:${drawCount}`,mode,level);
  navigate('setup');
}

async function begin() {
  const generation=profileGeneration;const startingView=view;const startingMode=mode;const startingLevel=level;const chosenThemes=selectedThemes.map(t=>t.id);const seed=save.seed;
  const button = document.querySelector<HTMLButtonElement>('[data-action="begin"]');
  if (button) {button.disabled=true;button.textContent='Conectando…';}
  await new Promise(resolve=>setTimeout(resolve,80));
  if(!activeProfile||generation!==profileGeneration||view!==startingView||mode!==startingMode||level!==startingLevel)return;
  try {
    const session=createSession(generatePuzzle(seed,startingMode,startingLevel,chosenThemes));
    save.sessions[sessionKey()]=session;
    activeWordId=session.puzzle.words[0].id;cursor=0;revealAnimation=[];
    persist();navigate('play');
  } catch (error) {
    console.error(error);toast('O sinal falhou. Sorteie outros temas e tente novamente.','error');render();
  }
}

function updateBoard() {
  const session=current();
  const board=document.querySelector('#board');
  if(session&&board) board.innerHTML=renderBoard(session);
}

function answerPrefix(session: Session, word: PuzzleWord): string {
  let prefix = '';
  for (const cell of wordCells(word)) {
    if (!session.values[cell.key]) break;
    prefix += session.values[cell.key];
  }
  return prefix;
}

function syncAnswerField() {
  const session=current();const word=activeWord();const input=document.querySelector<HTMLInputElement>('#answer-input');
  if(session&&word&&input) input.value=answerPrefix(session,word);
}

function applyInput(value: string) {
  const session=current();const word=activeWord();
  if(!session||!word||session.completed||session.solved.includes(word.id)) return;
  const letters=normalizeAnswer(value).slice(0,word.answer.length);
  const cells=wordCells(word);
  cells.forEach((cell,index)=>{
    if(session.revealed[cell.key]) return;
    if(letters[index]) session.values[cell.key]=letters[index]; else delete session.values[cell.key];
  });
  cursor=Math.min(letters.length,word.answer.length-1);revealAnimation=[];persist();updateBoard();
}

function typeKey(key: string) {
  const session=current();const word=activeWord();
  if(!session||!word||session.completed||session.solved.includes(word.id))return;
  if(key==='Enter'){confirmAnswer();return;}
  const cells=wordCells(word);
  if(key==='ArrowLeft'||key==='ArrowUp')cursor=Math.max(0,cursor-1);
  else if(key==='ArrowRight'||key==='ArrowDown')cursor=Math.min(cells.length-1,cursor+1);
  else if(key==='Backspace'){
    let index=cursor;
    if(!session.values[cells[index].key]||session.revealed[cells[index].key])index--;
    while(index>=0&&session.revealed[cells[index].key])index--;
    if(index>=0){delete session.values[cells[index].key];cursor=index;}
  }else if(/^[a-zA-ZÀ-ž]$/.test(key)){
    const letter=normalizeAnswer(key);if(!letter)return;
    let index=cursor;while(index<cells.length&&session.revealed[cells[index].key])index++;
    if(index>=cells.length)index=cells.findIndex(cell=>!session.revealed[cell.key]&&!session.values[cell.key]);
    if(index>=0&&index<cells.length){session.values[cells[index].key]=letter;cursor=Math.min(index+1,cells.length-1);while(cursor<cells.length-1&&session.revealed[cells[cursor].key])cursor++;tone();}
  }else return;
  revealAnimation=[];persist();updateBoard();syncAnswerField();
}

function afterChange(previous: Session, next: Session) {
  revealAnimation=Object.keys(next.revealed).filter(key=>!previous.revealed[key]);
  save.sessions[sessionKey()]=next;
  if(next.completed&&!previous.completed){save=recordCompletion(save,next);persist();render();tone('win');celebrate();window.scrollTo({top:0,behavior:'smooth'});return;}
  const solvedMore=next.solved.length-previous.solved.length;
  if(solvedMore){
    tone('correct');
    toast(mode==='cascade'?`Conexão feita! ${revealAnimation.length} letras acesas no circuito.`:`${solvedMore===1?'Palavra conectada':'Palavras conectadas'}! As letras dos cruzamentos estão liberadas.`,'success');
    const unsolved=next.puzzle.words.find(word=>!next.solved.includes(word.id));
    if(unsolved){activeWordId=unsolved.id;cursor=Math.max(0,wordCells(unsolved).findIndex(c=>!next.values[c.key]));}
  }
  persist();render();
}

function confirmAnswer() {
  const session=current();const word=activeWord();if(!session||!word||session.completed||session.solved.includes(word.id))return;
  const cells=wordCells(word);
  if(cells.some(cell=>!session.values[cell.key])){toast(`Faltam letras. Esta resposta tem ${word.answer.length} casas.`);return;}
  const answer=cells.map(cell=>session.values[cell.key]).join('');
  const result=submitWord(session,word.id,answer);
  if(!result.correct){save.sessions[sessionKey()]=result.session;persist();tone('wrong');toast('Ainda não é essa conexão. Confira a pista e tente de novo.','error');render();syncAnswerField();const panel=document.querySelector('.answer-panel');panel?.classList.add('shaking');return;}
  afterChange(session,result.session);
}

function revealHint() {
  const session=current();const word=activeWord();if(!session||!word||session.completed||session.solved.includes(word.id))return;
  if(session.hints>=MAX_HINTS){toast('Você usou as três dicas desta fase. As letras já reveladas continuam no tabuleiro.');return;}
  const next=useHint(session,word.id);
  afterChange(session,next);
  if(!next.completed){tone();toast('Uma letra revelada. Mais perto da conexão.','success');}
}

function celebrate() {
  if(save.settings.reducedMotion||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  for(let i=0;i<36;i++){const piece=document.createElement('i');piece.className='confetti';piece.style.setProperty('--left',`${Math.random()*100}%`);piece.style.setProperty('--delay',`${Math.random()*.5}s`);document.body.append(piece);setTimeout(()=>piece.remove(),3600);}
}

app.addEventListener('click',async event=>{
  const element=(event.target as HTMLElement).closest<HTMLElement>('button');if(!element||element.hasAttribute('disabled'))return;
  const targetView=element.dataset.view as View|undefined;if(targetView){navigate(targetView);return;}
  const action=element.dataset.action;
  if(action==='close-keyboard'){editingWord=false;document.querySelector<HTMLInputElement>('#answer-input')?.blur();render();return;}
  if(action==='choose-profile'){await chooseProfile(element.dataset.profile as ProfileId);return;}
  if(action==='switch-profile'){switchProfile();return;}
  if(action==='sync-setup'){showSyncSetup();return;}
  if(action==='sync-other'){showSyncSetup(true);return;}
  if(action==='sync-close'){document.querySelector<HTMLDialogElement>('#sync-dialog')?.close();return;}
  if(action==='create-code'){
    element.setAttribute('disabled','');
    try{await connectDevices(newCode(),true);showSyncSetup();}
    catch(error){document.querySelector('#sync-message')!.textContent=error instanceof Error?error.message:'Não foi possível conectar.';element.removeAttribute('disabled');}
    return;
  }
  if(action==='copy-code'){
    try{await navigator.clipboard.writeText(formatCode(getCode()));document.querySelector('#sync-message')!.textContent='Código copiado. Cole no outro aparelho.';}
    catch{document.querySelector<HTMLInputElement>('#device-code')?.select();document.querySelector('#sync-message')!.textContent='Selecione e copie o código acima.';}
    return;
  }
  if(action==='sync-now'){document.querySelector<HTMLDialogElement>('#sync-dialog')?.close();await syncCurrent();return;}
  if(action==='sync-resolve'){
    element.setAttribute('disabled','');
    const result=await synchronize(element.dataset.profile as ProfileId,element.dataset.choice as 'local'|'cloud');
    if(result.kind==='saved'||result.kind==='loaded'){document.querySelector<HTMLDialogElement>('#sync-dialog')?.close();render();}
    else if(result.kind!=='conflict'){element.removeAttribute('disabled');toast(result.error||'Tente sincronizar novamente.','error');}
    return;
  }
  if(element.dataset.word){selectWord(element.dataset.word);return;}
  if(element.dataset.cell){const key=element.dataset.cell;const words=current()?.puzzle.words.filter(w=>wordCells(w).some(c=>c.key===key))||[];const activeIndex=words.findIndex(w=>w.id===activeWordId);const word=words[(activeIndex+1)%words.length];if(word)selectWord(word.id,key);return;}
  if(element.dataset.key){typeKey(element.dataset.key);return;}
  if(action==='start'){const m=element.dataset.mode as Mode;prepare(m,unlockedLevel(save,m));}
  if(action==='mode'){mode=element.dataset.mode as Mode;render();}
  if(action==='level')prepare(mode,Number(element.dataset.level));
  if(action==='shuffle'){drawCount++;selectedThemes=drawThemes(`${save.seed}:${drawCount}`,mode,level);tone();render();}
  if(action==='begin')void begin();
  if(action==='hint')revealHint();
  if(action==='next')prepare(mode,Math.min(100,level+1));
  if(action==='replay')prepare(mode,level,true);
  if(action==='sound'){save.settings.sound=!save.settings.sound;persist();tone();render();}
  if(action==='motion'){save.settings.reducedMotion=!save.settings.reducedMotion;persist();render();}
  if(action==='export'){
    const blob=new Blob([exportSave(save)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`neon-lexico-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Backup exportado. Sua jornada está guardada.','success');
  }
  if(action==='import')document.querySelector<HTMLInputElement>('#import-file')?.click();
  if(action==='install'){
    if(installEvent){void installEvent.prompt().then(()=>installEvent?.userChoice).then(choice=>{if(choice?.outcome==='accepted')toast('Neon Léxico instalado.','success');installEvent=undefined;});}
    else toast('No celular: menu do navegador → Adicionar à tela inicial. No iPhone: Compartilhar → Adicionar à Tela de Início.');
  }
});

app.addEventListener('submit',async event=>{
  if((event.target as HTMLElement).id==='answer-form'){event.preventDefault();confirmAnswer();}
  if((event.target as HTMLElement).id==='connect-form'){
    event.preventDefault();const button=(event.target as HTMLFormElement).querySelector('button')!;button.disabled=true;
    try{await connectDevices(document.querySelector<HTMLInputElement>('#device-code')!.value);document.querySelector<HTMLDialogElement>('#sync-dialog')?.close();await syncCurrent();}
    catch(error){document.querySelector('#sync-message')!.textContent=error instanceof Error?error.message:'Não foi possível conectar.';button.disabled=false;}
  }
});
app.addEventListener('input',event=>{
  const input=event.target as HTMLInputElement;
  if(input.id==='answer-input')applyInput(input.value);
  if(input.id==='theme-search'){
    searchTerm=input.value;
    const filtered=themes.filter(theme=>normalizeAnswer(`${theme.id} ${theme.name} ${theme.description}`).includes(normalizeAnswer(searchTerm)));
    document.querySelector('#theme-library')!.innerHTML=filtered.map((theme,index)=>themeCard(theme,index,true)).join('')||'<p class="empty-state">Nenhum universo encontrado. Tente outra palavra.</p>';
    document.querySelector('#theme-count')!.textContent=`${filtered.length} UNIVERSOS`;
  }
});
app.addEventListener('focusin', event => {
  if ((event.target as HTMLElement).id === 'answer-input') {
    editingWord = true;
    document.querySelector('.word-editor')?.classList.add('editing');
    document.documentElement.classList.add('word-editing');
    updateKeyboardViewport();
  }
});
app.addEventListener('change',async event=>{
  const input=event.target as HTMLInputElement;
  if(input.id!=='import-file'||!input.files?.[0])return;
  try{
    if(input.files[0].size>8_000_000)throw new Error('O arquivo é muito grande.');
    const generation=profileGeneration;
    const imported=importSave(await input.files[0].text());
    if(!activeProfile||profileGeneration!==generation)return;
    if(!window.confirm('Restaurar este backup e substituir o progresso atual neste navegador?'))return;
    save=imported;persist();navigate('stats');toast('Campanha restaurada. Bem-vindo de volta.','success');
  }catch(error){toast(error instanceof Error?error.message:'Não foi possível ler este backup.','error');}
  finally{input.value='';}
});
document.addEventListener('keydown',event=>{
  if(!activeProfile||view!=='play'||document.querySelector<HTMLDialogElement>('#sync-dialog')?.open||event.ctrlKey||event.metaKey||event.altKey)return;
  const target=event.target as HTMLElement;
  if(['INPUT','TEXTAREA','SELECT'].includes(target.tagName)||target.isContentEditable)return;
  if(event.key==='Enter'&&target.tagName==='BUTTON'&&!target.hasAttribute('data-key')&&!target.hasAttribute('data-cell'))return;
  if(/^[a-zA-ZÀ-ž]$/.test(event.key)||['Enter','Backspace','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();typeKey(event.key);}
});
setInterval(()=>{
  const session=current();if(!activeProfile||view!=='play'||!session||session.completed||document.hidden||document.querySelector<HTMLDialogElement>('#sync-dialog')?.open)return;
  session.elapsed++;
  const timer=document.querySelector('#timer');if(timer)timer.textContent=timeLabel(session.elapsed);
  const score=document.querySelector('#score');if(score)score.textContent=String(getScore(session));
  if(session.elapsed%10===0)persist();
},1000);
document.addEventListener('visibilitychange',()=>{if(document.hidden)persist();});
window.addEventListener('pagehide',persist);
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installEvent=event as typeof installEvent;});
if(import.meta.env.PROD&&'serviceWorker' in navigator)window.addEventListener('load',()=>{void navigator.serviceWorker.register('./sw.js').catch(()=>{toast('O modo offline não pôde ser ativado neste navegador.');});});
render();
window.addEventListener('online',()=>{void syncCurrent();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&activeProfile&&getCode())void synchronize(activeProfile);});
if(activeProfile&&getCode())void synchronize(activeProfile);
