'use strict';

/* =========================================================
   Hábitos — clon personal de HabitKit (PWA, vanilla JS)
   Datos: IndexedDB (+ espejo en localStorage)
   ========================================================= */

const APP_VERSION = '1.2.0';
const DB_NAME = 'habitos-db';
const STORE = 'kv';

const COLORS = [
  '#f2706b', '#f4a04a', '#f5c451', '#f2d54a', '#b7dc4f', '#6fd08c', '#4fcf9f',
  '#56d3c4', '#56c8e8', '#5aa8f0', '#5b8def', '#7f7cf0', '#a07cf0', '#b56cf0',
  '#e27af0', '#ee7fc0', '#f06f86', '#9fb1c6', '#a3a8b3', '#a7a7a7', '#b8b0a4',
];

const DEFAULT_CATS = [
  { id: 'art', name: 'Arte', icon: 'palette' },
  { id: 'finances', name: 'Finanzas', icon: 'wallet' },
  { id: 'fitness', name: 'Fitness', icon: 'dumbbell' },
  { id: 'health', name: 'Salud', icon: 'heart' },
  { id: 'nutrition', name: 'Nutrición', icon: 'utensils' },
  { id: 'social', name: 'Social', icon: 'users' },
  { id: 'study', name: 'Estudio', icon: 'graduation-cap' },
  { id: 'work', name: 'Trabajo', icon: 'briefcase' },
  { id: 'other', name: 'Otro', icon: 'star' },
  { id: 'morning', name: 'Mañana', icon: 'sunrise' },
  { id: 'day', name: 'Día', icon: 'sun' },
  { id: 'evening', name: 'Noche', icon: 'moon' },
];

const DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DOW1 = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const ICS_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const HERO_BG = Object.keys(ICONS).slice(0, 66);

/* ---------------- Estado ---------------- */
let state = defaultState();
let ui = { stack: [], draft: null, adv: true, showExceed: false, iconQuery: '', newCat: false, armed: null, tmpVal: 0, selBar: null };

function defaultState() {
  return {
    version: 2,
    settings: { weekStart: 1, theme: 'auto', view: 'grid', showFilter: false, filter: null, customCats: [] },
    habits: [],
    entries: {}, // { habitId: { 'YYYY-MM-DD': valor } }
  };
}
function normalizeHabit(h) {
  return {
    type: 'build', tracking: 'step', perDay: 1, allowExceed: false, unit: '',
    streakType: 'none', streakGoal: 1, categories: [], reminders: [], desc: '',
    archived: false, ...h,
  };
}

/* ---------------- Persistencia ---------------- */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const r = db.transaction(STORE).objectStore(STORE).get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function idbSet(key, val) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(val, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
function hydrate(s) {
  const d = defaultState();
  return {
    ...d, ...s,
    settings: { ...d.settings, ...(s.settings || {}) },
    habits: (s.habits || []).map(normalizeHabit),
    entries: s.entries || {},
    version: 2,
  };
}
async function loadState() {
  let s = null;
  try { s = await idbGet('state'); } catch (e) { console.warn('IDB no disponible', e); }
  if (!s) { try { const raw = localStorage.getItem('habitos-state'); if (raw) s = JSON.parse(raw); } catch {} }
  if (s && Array.isArray(s.habits)) state = hydrate(s);
}
let saveTimer = null;
/** Guarda local y programa sincronización */
function save() { persistLocal(); Sync.schedule(); }
/** Solo guarda en el dispositivo */
function persistLocal() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try { await idbSet('state', state); } catch (e) { console.warn(e); }
    try { localStorage.setItem('habitos-state', JSON.stringify(state)); } catch {}
  }, 150);
}

/* Hooks que llama sync.js */
function onRemoteChanges() {
  persistLocal(); applyTheme(); renderList();
  if (['detail', 'stats', 'settings', 'account'].includes(topPage()?.name)) renderSheet();
}
function onSyncStatus() {
  $('#btn-settings')?.classList.toggle('warn', Sync.status === 'error');
  if (['settings', 'account'].includes(topPage()?.name)) renderSheet();
}
function syncStatusText() {
  switch (Sync.status) {
    case 'off': return 'Sin cuenta: tus datos solo están en este dispositivo';
    case 'syncing': return 'Sincronizando…';
    case 'offline': return 'Sin conexión: se sincroniza al volver';
    case 'error': return 'Error: ' + Sync.error;
    default: {
      if (!Sync.meta.lastSync) return 'Conectado';
      const m = Math.round((Date.now() - new Date(Sync.meta.lastSync)) / 60000);
      return 'Sincronizado ' + (m < 1 ? 'hace un momento' : m < 60 ? `hace ${m} min` : `hace ${Math.round(m / 60)} h`);
    }
  }
}

/* ---------------- Fechas ---------------- */
const pad = (n) => String(n).padStart(2, '0');
const dkey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const todayKey = () => dkey(today());
const weekOffset = (d) => (d.getDay() - state.settings.weekStart + 7) % 7;
const monShort = (d) => d.toLocaleDateString('es-MX', { month: 'short' }).replace('.', '');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const fmtDay = (k) => cap(parseKey(k).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }));

/* ---------------- Utilidades ---------------- */
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const fmtNum = (n) => (Math.round(n * 100) / 100).toLocaleString('es-MX');
function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function isLight() {
  const t = state.settings.theme;
  if (t === 'light') return true;
  if (t === 'dark') return false;
  return matchMedia('(prefers-color-scheme: light)').matches;
}
const emptyA = () => (isLight() ? 0.14 : 0.11);
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 2000);
}
function haptic() { try { navigator.vibrate?.(8); } catch {} }

/** Ícono: nombre de Lucide → SVG; cualquier otro texto (emoji viejo) → texto */
function ic(name) {
  const inner = UI_ICONS[name] || ICONS[name]?.[0];
  return inner ? `<svg viewBox="0 0 24 24">${inner}</svg>` : esc(name);
}
const allCats = () => [...DEFAULT_CATS, ...state.settings.customCats];
const catById = (id) => allCats().find((c) => c.id === id);

/* ---------------- Lógica de hábitos ---------------- */
const byId = (id) => state.habits.find((h) => h.id === id);
const activeHabits = () => state.habits.filter((h) => !h.archived).sort((a, b) => a.order - b.order);
const visibleHabits = () => {
  const f = state.settings.filter;
  return activeHabits().filter((h) => !f || h.categories.includes(f));
};
const getVal = (h, k) => state.entries[h.id]?.[k] || 0;
function setVal(h, k, v) {
  state.entries[h.id] ??= {};
  v = Math.max(0, Number(v) || 0);
  if (h.tracking === 'step' && !h.allowExceed && h.type === 'build') v = Math.min(v, h.perDay);
  if (v === 0) delete state.entries[h.id][k];
  else state.entries[h.id][k] = v;
  save();
}
const isMulti = (h) => h.type === 'build' && (h.perDay > 1 || h.tracking === 'custom');
function ratio(h, k) {
  if (h.type === 'quit') return isDone(h, k) ? 1 : 0;
  return Math.min(1, getVal(h, k) / h.perDay);
}
function isDone(h, k) {
  if (h.type === 'quit') return getVal(h, k) === 0 && k >= h.createdAt && k <= todayKey();
  return getVal(h, k) >= h.perDay;
}

/** Toque en el botón / celda de un día */
function tapDay(h, k) {
  const v = getVal(h, k);
  if (h.type === 'quit') { setVal(h, k, v ? 0 : 1); haptic(); if (!v) toast('Recaída registrada'); return true; }
  if (h.tracking === 'custom') { openValue(h.id, k); return false; }
  if (h.allowExceed) setVal(h, k, v + 1);
  else setVal(h, k, v >= h.perDay ? 0 : v + 1);
  haptic();
  return true;
}
function openValue(id, k) {
  const h = byId(id);
  ui.tmpVal = getVal(h, k);
  openSheet('value', { id, k });
}

function periodStart(d, type) {
  if (type === 'week') return addDays(d, -weekOffset(d));
  if (type === 'month') return new Date(d.getFullYear(), d.getMonth(), 1);
  return new Date(d);
}
function nextPeriod(d, type) {
  if (type === 'week') return addDays(d, 7);
  if (type === 'month') return new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return addDays(d, 1);
}
function doneInPeriod(h, start, type) {
  const end = nextPeriod(start, type);
  let n = 0;
  for (let d = new Date(start); d < end; d = addDays(d, 1)) if (isDone(h, dkey(d))) n++;
  return n;
}

/** Racha actual, mejor racha, totales */
function computeStats(h) {
  const type = h.streakType === 'none' ? 'day' : h.streakType;
  const goal = type === 'day' ? 1 : h.streakGoal;
  const t = today();
  const created = parseKey(h.createdAt);
  const ent = state.entries[h.id] || {};
  let first = created;
  if (h.type === 'build') {
    const keys = Object.keys(ent).filter((k) => isDone(h, k)).sort();
    if (keys.length && parseKey(keys[0]) < created) first = parseKey(keys[0]);
  }
  let total = 0;
  for (let d = new Date(first); d <= t; d = addDays(d, 1)) if (isDone(h, dkey(d))) total++;
  const span = Math.max(1, Math.round((t - first) / 86400000) + 1);
  const sum = Object.values(ent).reduce((a, b) => a + b, 0);

  const met = [];
  const curStart = periodStart(t, type).getTime();
  for (let p = periodStart(first, type); p.getTime() <= curStart; p = nextPeriod(p, type)) met.push(doneInPeriod(h, p, type) >= goal);
  let best = 0, run = 0;
  for (const m of met) { run = m ? run + 1 : 0; best = Math.max(best, run); }
  let i = met.length - 1;
  if (!met[i] && h.type === 'build') i--; // el periodo en curso aún no rompe la racha
  let current = 0;
  while (i >= 0 && met[i]) { current++; i--; }
  return { current, best, total, sum, rate: Math.min(100, Math.round((total / span) * 100)), unit: type };
}
const unitLabel = (u, n) => ({ day: n === 1 ? 'día' : 'días', week: n === 1 ? 'semana' : 'semanas', month: n === 1 ? 'mes' : 'meses' }[u]);
function streakText(h) {
  if (h.streakType === 'none') return 'Ninguna';
  if (h.streakType === 'day') return 'Diaria';
  return `${h.streakGoal}× por ${h.streakType === 'week' ? 'semana' : 'mes'}`;
}

/* ---------------- Piezas de UI ---------------- */
function cellColor(h, k) {
  if (k > todayKey()) return 'transparent';
  if (h.type === 'quit' && k < h.createdAt) return rgba(h.color, emptyA());
  const r = ratio(h, k);
  const ea = emptyA();
  return rgba(h.color, r >= 1 ? 1 : ea + (1 - ea) * r * 0.7);
}

function ringSVG(h, r) {
  const C = 2 * Math.PI * 18;
  return `<svg class="prog" viewBox="0 0 42 42"><circle cx="21" cy="21" r="18" stroke="${rgba(h.color, 0.25)}" stroke-width="3"/>
    <circle cx="21" cy="21" r="18" stroke="${h.color}" stroke-width="3" stroke-dasharray="${C * r} ${C}" /></svg>`;
}

/** Botón de completar según tipo */
function checkBtn(h, k, extra = '') {
  const v = getVal(h, k);
  const attrs = `data-action="tap" data-lp data-id="${h.id}" data-k="${k}" ${extra}`;
  if (h.type === 'quit') {
    return v
      ? `<button class="check" ${attrs} style="color:${h.color};border-color:${rgba(h.color, .5)}" aria-label="Recaída">${ic('x')}</button>`
      : `<button class="check done" ${attrs} style="background:${h.color};color:#fff" aria-label="Día limpio">${ic('check')}</button>`;
  }
  if (isDone(h, k)) {
    const txt = h.allowExceed && v > h.perDay ? `<span class="val">${fmtNum(v)}</span>` : ic('check');
    return `<button class="check done${isMulti(h) ? ' ring' : ''}" ${attrs} style="background:${h.color};color:#fff" aria-label="Completado">${txt}</button>`;
  }
  if (isMulti(h)) {
    const inner = v > 0 ? `<span class="val">${fmtNum(v)}</span>` : ic('plus');
    return `<button class="check ring" ${attrs} style="color:${h.color}" aria-label="Sumar">${ringSVG(h, v / h.perDay)}<span style="position:relative;display:grid">${inner}</span></button>`;
  }
  return `<button class="check" ${attrs} style="color:${rgba(h.color, .7)}" aria-label="Marcar">${ic('check')}</button>`;
}

const tint = (h) => `background:linear-gradient(135deg, ${rgba(h.color, isLight() ? .10 : .12)}, ${rgba(h.color, 0)} 60%), var(--card)`;
const iconBox = (h, style = '') => `<div class="h-icon" style="background:${rgba(h.color, .18)};color:${h.color};${style}">${ic(h.icon)}</div>`;

function gridCols() {
  const w = Math.min(window.innerWidth, 640) - 32 - 28;
  return Math.max(12, Math.floor((w + 3) / (10 + 3)));
}
function heatmapHTML(h, cols) {
  const t = today();
  const firstCol = addDays(t, -weekOffset(t) - (cols - 1) * 7);
  let html = '';
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < 7; r++) {
      const d = addDays(firstCol, c * 7 + r);
      const k = dkey(d);
      html += d > t ? '<div class="cell future"></div>' : `<div class="cell" style="background:${cellColor(h, k)}"></div>`;
    }
  }
  return html;
}

/* ---------------- Render: pantalla principal ---------------- */
function renderTop() {
  const s = state.settings;
  $('#btn-filter').classList.toggle('on', s.showFilter || !!s.filter);
  const chips = $('#chips');
  const used = allCats().filter((c) => activeHabits().some((h) => h.categories.includes(c.id)));
  const cur = s.filter ? catById(s.filter) : null;
  if (!s.showFilter) {
    chips.hidden = !cur;
    chips.innerHTML = cur ? `<button class="chip on" data-action="filter" data-v="">${ic(cur.icon)}${esc(cur.name)} ${ic('x')}</button>` : '';
    return;
  }
  chips.hidden = false;
  chips.innerHTML = `<button class="chip ${!s.filter ? 'on' : ''}" data-action="filter" data-v="">Todas</button>` +
    (used.length ? used.map((c) => `<button class="chip ${s.filter === c.id ? 'on' : ''}" data-action="filter" data-v="${c.id}">${ic(c.icon)}${esc(c.name)}</button>`).join('')
      : '<span class="chip">Asigna categorías al editar un hábito</span>');
}

function renderList() {
  renderTop();
  const view = state.settings.view;
  document.querySelectorAll('.viewbar button').forEach((b) => b.classList.toggle('on', b.dataset.v === view));
  const list = $('#list');
  const habits = visibleHabits();
  if (!activeHabits().length) {
    list.innerHTML = `<div class="empty"><div class="big">${ic('sprout')}</div><b>Sin hábitos todavía</b><div>Crea tu primer hábito y empieza tu racha.</div><button data-action="new">Crear hábito</button></div>`;
    return;
  }
  if (!habits.length) { list.innerHTML = '<div class="empty">No hay hábitos en esta categoría.</div>'; return; }
  if (view === 'list') list.innerHTML = listViewHTML(habits);
  else if (view === 'compact') list.innerHTML = compactViewHTML(habits);
  else list.innerHTML = gridViewHTML(habits);
}

function gridViewHTML(habits) {
  const cols = gridCols();
  const tk = todayKey();
  return habits.map((h) => `
    <article class="card" data-action="open" data-id="${h.id}" style="${tint(h)}">
      <div class="card-head">
        ${iconBox(h)}
        <div class="h-text">
          <div class="h-name">${esc(h.name)}</div>
          ${h.desc ? `<div class="h-desc">${esc(h.desc)}</div>` : ''}
        </div>
        ${checkBtn(h, tk)}
      </div>
      <div class="grid" style="grid-auto-columns:1fr">${heatmapHTML(h, cols)}</div>
    </article>`).join('');
}

function listViewHTML(habits) {
  const t = today();
  const days = [4, 3, 2, 1, 0].map((n) => addDays(t, -n));
  const range = `${monShort(days[0])} ${days[0].getDate()} — ${monShort(days[4])} ${days[4].getDate()}`;
  const head = `<div class="l5-row head"><div class="mono" style="text-align:left">${habits.length} hábitos</div>` +
    days.map((d, i) => `<div class="${i === 4 ? 't' : ''}"><div class="d">${DOW[d.getDay()].slice(0, 2)}</div><div class="n">${d.getDate()}</div></div>`).join('') + '</div>';
  const rows = habits.map((h) => `<div class="l5-row">
      <div class="l5-name" data-action="open" data-id="${h.id}">${iconBox(h)}<span>${esc(h.name)}</span></div>
      ${days.map((d) => l5Cell(h, dkey(d))).join('')}
    </div>`).join('');
  return `<div class="l5"><div class="l5-top"><span class="pill">Últimos 5 días</span><span class="mono">${range}</span></div>${head}${rows}</div>`;
}
function l5Cell(h, k) {
  const v = getVal(h, k);
  const base = `data-action="tap" data-lp data-id="${h.id}" data-k="${k}"`;
  if (h.type === 'quit') {
    if (k < h.createdAt) return `<div class="l5-cell" style="background:${rgba(h.color, emptyA())}"></div>`;
    return v ? `<button class="l5-cell" ${base} style="background:${rgba(h.color, .15)};color:${h.color}">${ic('x')}</button>`
      : `<button class="l5-cell" ${base} style="background:${h.color};color:#fff">${ic('check')}</button>`;
  }
  const r = ratio(h, k);
  if (r >= 1) return `<button class="l5-cell" ${base} style="background:${h.color};color:#fff"></button>`;
  if (v > 0) return `<button class="l5-cell" ${base} style="background:${rgba(h.color, .15)};color:${h.color}">${ringSVG(h, r).replace('class="prog"', 'class="prog" style="position:absolute;inset:3px;width:32px;height:32px;transform:rotate(-90deg)"')}<span class="val">${fmtNum(v)}</span></button>`;
  return `<button class="l5-cell" ${base} style="background:${rgba(h.color, emptyA() + .03)}"></button>`;
}

function compactViewHTML(habits) {
  const t = today();
  const first = new Date(t.getFullYear(), t.getMonth(), 1);
  const nDays = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  const lead = weekOffset(first);
  const label = `${monShort(t)} ${t.getFullYear()}`;
  return `<div class="compact">${habits.map((h) => {
    let cells = '<div></div>'.repeat(lead);
    for (let i = 1; i <= nDays; i++) {
      const k = dkey(new Date(t.getFullYear(), t.getMonth(), i));
      cells += `<div style="background:${k > todayKey() ? rgba(h.color, emptyA() * .6) : cellColor(h, k)}"></div>`;
    }
    return `<article class="mini-card" data-action="open" data-id="${h.id}" style="${tint(h)}">
      <div class="mini-head">${checkBtn(h, todayKey())}<div class="t"><b>${esc(h.name)}</b><span class="mono">${label}</span></div></div>
      <div class="mini-grid">${cells}</div></article>`;
  }).join('')}</div>`;
}

/* ---------------- Sheets (pila de páginas) ---------------- */
const topPage = () => ui.stack[ui.stack.length - 1];
function openSheet(name, params = {}) {
  ui.stack.push({ name, ...params });
  $('#sheet-root').hidden = false;
  document.body.style.overflow = 'hidden';
  renderSheet(true);
}
function back() {
  ui.stack.pop();
  ui.armed = null; ui.selBar = null;
  if (!ui.stack.length) return closeAll();
  if (!ui.stack.some((p) => p.name === 'edit')) ui.draft = null;
  renderSheet(true);
  renderList();
}
function closeAll() {
  ui.stack = []; ui.draft = null; ui.armed = null; ui.selBar = null; ui.newCat = false; ui.showExceed = false;
  $('#sheet-root').hidden = true;
  document.body.style.overflow = '';
  renderList();
}
const PAGES = {};
function renderSheet(resetScroll = false) {
  const p = topPage();
  if (!p) return;
  const el = $('#sheet');
  const scroll = el.scrollTop;
  el.className = 'sheet' + (['edit', 'icon', 'stats', 'detail'].includes(p.name) ? ' tall' : '');
  el.innerHTML = PAGES[p.name](p);
  el.scrollTop = resetScroll ? 0 : scroll;
  if (p.name === 'detail' && resetScroll) scrollBigGrid();
}
function head(title, right = '') {
  const leftBtn = ui.stack.length > 1
    ? `<button class="icon-btn" data-action="back" aria-label="Atrás">${ic('chevron-left')}</button>`
    : `<button class="icon-btn" data-action="close" aria-label="Cerrar">${ic('x')}</button>`;
  return `<div class="grabber"></div><div class="sheet-head">${leftBtn}<h2>${title}</h2><div style="display:flex;justify-content:flex-end">${right}</div></div>`;
}

/* ---- Crear / editar ---- */
function newDraft() {
  return {
    id: null, name: '', desc: '', icon: 'activity', color: COLORS[11], type: 'build', tracking: 'step',
    perDay: 1, allowExceed: false, unit: '', streakType: 'none', streakGoal: 1, categories: [], reminders: [],
  };
}
function draftFrom(h) { return JSON.parse(JSON.stringify(h)); }

PAGES.edit = () => {
  const d = ui.draft;
  const catNames = d.categories.map((id) => catById(id)?.name).filter(Boolean);
  const remN = d.reminders.length;
  const unitTxt = d.tracking === 'custom' && d.unit ? `${esc(d.unit)} / día` : '/ Día';
  return `${head(d.id ? 'Editar hábito' : 'Nuevo hábito')}
    <button class="icon-hero" data-action="page" data-v="icon" style="--glow:${rgba(d.color, .35)};width:100%">
      <div class="bg">${HERO_BG.map(ic).join('')}</div>
      <div class="big" style="background:${rgba(d.color, .22)};color:${d.color}">${ic(d.icon)}</div>
      <div class="edit">${ic('pencil')}</div>
    </button>

    <label class="sec-label" for="f-name">Nombre</label>
    <input class="input" type="text" id="f-name" data-bind="name" maxlength="40" placeholder="Ej. Leer 20 minutos" value="${esc(d.name)}">
    <label class="sec-label" for="f-desc">Descripción</label>
    <input class="input" type="text" id="f-desc" data-bind="desc" maxlength="80" placeholder="Opcional" value="${esc(d.desc)}">

    <span class="sec-label">Color</span>
    <div class="color-grid">${COLORS.map((c) => `<button data-action="d-set" data-f="color" data-v="${c}" class="${d.color === c ? 'sel' : ''}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div>

    <span class="sec-label">Tipo de hábito</span>
    <div class="seg"><button data-action="d-set" data-f="type" data-v="build" class="${d.type === 'build' ? 'on' : ''}">Construir hábito</button><button data-action="d-set" data-f="type" data-v="quit" class="${d.type === 'quit' ? 'on' : ''}">Dejar hábito</button></div>
    <p class="hint">${d.type === 'build' ? 'Marca cada día que lo completes.' : 'Marca solo los días que recaigas. Los demás cuentan como éxito.'}</p>

    <button class="adv-toggle" data-action="adv">Opciones avanzadas ${ic(ui.adv ? 'chevron-up' : 'chevron-down')}</button>
    ${ui.adv ? `
    <div class="two">
      <div><span class="sec-label">Meta de racha</span><button class="row-btn" data-action="page" data-v="streak"><span>${streakText(d)}</span>${ic('chevron-right')}</button></div>
      <div><span class="sec-label">Recordatorios</span><button class="row-btn" data-action="page" data-v="rem"><span>${remN} ${remN === 1 ? 'activo' : 'activos'}</span>${ic('chevron-right')}</button></div>
    </div>
    <span class="sec-label">Categorías</span>
    <button class="row-btn" data-action="page" data-v="cats"><span>${catNames.length ? esc(catNames.join(', ')) : 'Ninguna'}</span>${ic('chevron-right')}</button>

    ${d.type === 'build' ? `
    <span class="sec-label">¿Cómo registrar el avance?</span>
    <div class="seg"><button data-action="d-set" data-f="tracking" data-v="step" class="${d.tracking === 'step' ? 'on' : ''}">Paso a paso</button><button data-action="d-set" data-f="tracking" data-v="custom" class="${d.tracking === 'custom' ? 'on' : ''}">Valor personalizado</button></div>
    <p class="hint">${d.tracking === 'step' ? 'Suma 1 con cada toque.' : 'Escribe cualquier cantidad al completar (ej. páginas leídas).'}</p>
    ${d.tracking === 'custom' ? `<label class="sec-label" for="f-unit">Unidad</label><input class="input" id="f-unit" data-bind="unit" maxlength="16" placeholder="ej. páginas, min, km" value="${esc(d.unit)}">` : ''}

    <span class="sec-label">Meta por día</span>
    <div class="goal-row">
      <div class="goal-box"><input type="number" inputmode="decimal" min="1" data-bind="perDay" value="${d.perDay}"><span>${unitTxt}</span></div>
      <button class="sq-btn" data-action="d-per" data-v="-1" ${d.perDay <= 1 ? 'disabled' : ''}>${ic('minus')}</button>
      <button class="sq-btn" data-action="d-per" data-v="1">${ic('plus')}</button>
      <button class="sq-btn ${ui.showExceed ? 'on' : ''}" data-action="exceed-panel">${ic('sliders-horizontal')}</button>
    </div>
    <p class="hint">El cuadro se llena completo al llegar a esta meta.</p>
    ${ui.showExceed ? `<div class="exceed"><b>Seguir contando después de la meta</b><p>Registra más de tu meta diaria para ver tu actividad total en días extra productivos.</p>
      <div class="seg"><button data-action="d-set" data-f="allowExceed" data-v="0" class="${!d.allowExceed ? 'on' : ''}">Detener en la meta</button><button data-action="d-set" data-f="allowExceed" data-v="1" class="${d.allowExceed ? 'on' : ''}">Permitir exceder</button></div></div>` : ''}
    ` : ''}` : ''}

    <div class="save-bar"><button class="btn primary" data-action="save-habit" ${d.name.trim() ? '' : 'disabled'}>Guardar</button></div>`;
};

PAGES.icon = () => {
  const q = ui.iconQuery.trim().toLowerCase();
  const names = Object.keys(ICONS).filter((n) => !q || n.includes(q) || ICONS[n][1].includes(q));
  return `${head('Ícono')}
    <div class="icon-search"><input class="input" id="icon-q" placeholder="Buscar (ej. leer, agua, gym)" value="${esc(ui.iconQuery)}"></div>
    <div class="icon-grid" id="icon-grid">${iconGridHTML(names)}</div>`;
};
const iconGridHTML = (names) => names.length
  ? names.map((n) => `<button data-action="pick-icon" data-v="${n}" class="${ui.draft.icon === n ? 'sel' : ''}" aria-label="${n}">${ic(n)}</button>`).join('')
  : '<p class="muted" style="grid-column:1/-1;text-align:center">Sin resultados</p>';

PAGES.streak = () => {
  const d = ui.draft;
  const opts = [['none', 'Ninguna'], ['day', 'Diaria'], ['week', 'Semanal'], ['month', 'Mensual']];
  const max = d.streakType === 'week' ? 7 : 31;
  return `${head('Meta de racha')}
    <span class="sec-label">Intervalo</span>
    <div class="opt-list">${opts.map(([v, l]) => `<button class="opt" data-action="d-streak" data-v="${v}"><span>${l}</span>${d.streakType === v ? `<span class="tick">${ic('check')}</span>` : ''}</button>`).join('')}</div>
    ${d.streakType === 'week' || d.streakType === 'month' ? `
      <span class="sec-label">Días por ${d.streakType === 'week' ? 'semana' : 'mes'}</span>
      <div class="goal-row" style="grid-template-columns:1fr 52px 52px">
        <div class="goal-box"><b style="padding:13px 0">${d.streakGoal}</b><span>días</span></div>
        <button class="sq-btn" data-action="d-goal" data-v="-1" ${d.streakGoal <= 1 ? 'disabled' : ''}>${ic('minus')}</button>
        <button class="sq-btn" data-action="d-goal" data-v="1" ${d.streakGoal >= max ? 'disabled' : ''}>${ic('plus')}</button>
      </div>` : ''}
    <p class="hint">${d.streakType === 'none' ? 'La racha cuenta días seguidos completados.' : d.streakType === 'day' ? 'Tu racha sube cada día que completes el hábito.' : `Tu racha sube cada ${d.streakType === 'week' ? 'semana' : 'mes'} que llegues a ${d.streakGoal} días.`}</p>
    <button class="btn primary" data-action="back">Listo</button>`;
};

PAGES.cats = () => {
  const d = ui.draft;
  return `${head('Categorías')}
    <p class="muted" style="margin:0 0 14px">Elige una o varias categorías para este hábito.</p>
    <div class="cat-chips">
      ${allCats().map((c) => `<button class="chip ${d.categories.includes(c.id) ? 'on' : ''}" data-action="toggle-cat" data-v="${c.id}">${ic(c.icon)}${esc(c.name)}</button>`).join('')}
      ${ui.newCat ? '' : `<button class="chip add" data-action="new-cat">${ic('plus')}Crear la tuya</button>`}
    </div>
    ${ui.newCat ? `<div class="goal-row" style="grid-template-columns:1fr 52px;margin-top:12px">
      <input class="input" id="new-cat" maxlength="20" placeholder="Nombre de la categoría">
      <button class="sq-btn on" data-action="add-cat">${ic('check')}</button></div>` : ''}
    <button class="btn primary" data-action="back" style="margin-top:20px">Listo</button>`;
};

PAGES.rem = () => {
  const d = ui.draft;
  return `${head('Recordatorios')}
    <p class="muted" style="margin:0 0 14px">iOS no deja que una web app programe notificaciones. Tus recordatorios se agregan al <b>Calendario del iPhone</b>, que sí te avisa a la hora indicada.</p>
    ${d.reminders.map((r, i) => `<div class="rem">
      <div class="rem-top">${ic('bell')}<input type="time" data-rem="${i}" value="${r.time}"><button class="mini" data-action="rem-del" data-v="${i}" aria-label="Eliminar">${ic('trash-2')}</button></div>
      <div class="days">${[0, 1, 2, 3, 4, 5, 6].map((j) => (j + state.settings.weekStart) % 7).map((wd) => `<button data-action="rem-day" data-i="${i}" data-v="${wd}" class="${r.days.includes(wd) ? 'on' : ''}">${DOW1[wd]}</button>`).join('')}</div>
    </div>`).join('')}
    <button class="btn" data-action="rem-add">${ic('plus')}Agregar recordatorio</button>
    <button class="btn primary" data-action="rem-ics" ${d.reminders.length && d.name.trim() ? '' : 'disabled'}>${ic('calendar-plus')}Agregar al Calendario</button>
    <p class="hint">${d.name.trim() ? 'Si cambias horarios, vuelve a agregarlos y borra los eventos anteriores en Calendario.' : 'Primero ponle nombre al hábito.'}</p>`;
};

function saveHabit() {
  const d = ui.draft;
  if (!d.name.trim()) return;
  d.name = d.name.trim(); d.desc = d.desc.trim(); d.unit = (d.unit || '').trim();
  d.perDay = Math.max(d.tracking === 'custom' ? 0.01 : 1, Number(d.perDay) || 1);
  if (d.type === 'quit') { d.perDay = 1; d.tracking = 'step'; d.allowExceed = false; }
  if (d.tracking === 'step') d.perDay = Math.round(d.perDay);
  if (d.id) {
    Object.assign(byId(d.id), d);
    save(); ui.draft = null; ui.showExceed = false;
    back();
    return;
  }
  const maxOrder = state.habits.reduce((m, h) => Math.max(m, h.order), -1);
  state.habits.push(normalizeHabit({ ...d, id: uid(), createdAt: todayKey(), order: maxOrder + 1, archived: false }));
  save();
  closeAll();
  toast('Hábito creado');
}

/* ---- Recordatorios → .ics ---- */
function buildICS(h) {
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const t = today();
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Habitos//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  h.reminders.forEach((r, i) => {
    if (!r.days.length) return;
    const [hh, mm] = r.time.split(':');
    const start = `${t.getFullYear()}${pad(t.getMonth() + 1)}${pad(t.getDate())}T${hh}${mm}00`;
    const endD = new Date(t); endD.setHours(Number(hh), Number(mm) + 5);
    const end = `${endD.getFullYear()}${pad(endD.getMonth() + 1)}${pad(endD.getDate())}T${pad(endD.getHours())}${pad(endD.getMinutes())}00`;
    const title = h.name.replace(/[,;\\]/g, ' ');
    lines.push('BEGIN:VEVENT', `UID:${h.id || 'h'}-${i}-${Date.now()}@habitos`, `DTSTAMP:${stamp}`,
      `DTSTART:${start}`, `DTEND:${end}`, `RRULE:FREQ=WEEKLY;BYDAY=${r.days.map((d) => ICS_DAYS[d]).join(',')}`,
      `SUMMARY:${title}`, `DESCRIPTION:${(h.desc || 'Hábito').replace(/[,;\\]/g, ' ')}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${title}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
async function exportICS(h) {
  const ics = buildICS(h);
  const name = `recordatorio-${h.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`;
  const file = new File([ics], name, { type: 'text/calendar' });
  // iOS: abrir el .ics muestra "Agregar al calendario". Si no, se descarga.
  const a = document.createElement('a');
  a.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
  if (!/iPhone|iPad|iPod/.test(navigator.userAgent)) { a.href = URL.createObjectURL(file); a.download = name; }
  a.target = '_blank'; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
}

/* ---- Detalle ---- */
PAGES.detail = (p) => {
  const h = byId(p.id);
  if (!h) return '';
  const s = computeStats(h);
  const t = today();
  const m = ui.calMonth;
  const monthName = cap(m.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }));
  const first = new Date(m.getFullYear(), m.getMonth(), 1);
  const nDays = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
  const dows = Array.from({ length: 7 }, (_, i) => `<div class="dow">${DOW[(i + state.settings.weekStart) % 7]}</div>`).join('');
  let cells = '<div></div>'.repeat(weekOffset(first));
  for (let i = 1; i <= nDays; i++) {
    const d = new Date(m.getFullYear(), m.getMonth(), i);
    const k = dkey(d);
    const done = isDone(h, k);
    const r = ratio(h, k);
    const fill = !done && r > 0 ? `<div class="fill" style="height:${r * 100}%;background:${rgba(h.color, .5)}"></div>` : '';
    const slip = h.type === 'quit' && getVal(h, k) > 0;
    const cls = ['cal-day', d > t ? 'future' : '', k === todayKey() ? 'today' : ''].join(' ');
    cells += `<button class="${cls}" data-action="cal-day" data-k="${k}" style="background:${done ? h.color : rgba(h.color, emptyA())};color:${done ? '#fff' : slip ? h.color : 'inherit'}">${fill}<span>${slip ? '✕' : i}</span></button>`;
  }
  const nextDisabled = m.getFullYear() === t.getFullYear() && m.getMonth() === t.getMonth();
  const goalTxt = h.type === 'quit' ? 'Dejar hábito' : isMulti(h) ? `Meta: ${fmtNum(h.perDay)} ${esc(h.unit) || 'veces'} al día` : 'Una vez al día';
  const u = unitLabel(s.unit, s.current);
  const simpleTap = h.type === 'quit' || (h.tracking === 'step' && h.perDay === 1 && !h.allowExceed);
  return `${head('', `<button class="icon-btn" data-action="edit" aria-label="Editar">${ic('pencil')}</button>`)}
    <div class="card-head">
      ${iconBox(h, 'width:54px;height:54px;border-radius:16px')}
      <div class="h-text"><div class="h-name" style="font-size:20px">${esc(h.name)}</div>
        <div class="h-desc">${esc(h.desc) || goalTxt}</div></div>
      ${checkBtn(h, todayKey())}
    </div>
    <div class="big-grid-wrap" id="big-grid"><div class="grid">${heatmapHTML(h, 53)}</div></div>
    <div class="stats">
      <div class="stat"><div class="v" style="color:${h.color}">${ic('flame')}<span style="color:var(--text)">${s.current}</span></div><div class="k">Racha actual (${u})</div></div>
      <div class="stat"><div class="v" style="color:${h.color}">${ic('trophy')}<span style="color:var(--text)">${s.best}</span></div><div class="k">Mejor racha (${unitLabel(s.unit, s.best)})</div></div>
      <div class="stat"><div class="v">${s.total}</div><div class="k">${h.type === 'quit' ? 'Días limpios' : 'Días completados'}</div></div>
      ${h.tracking === 'custom' ? `<div class="stat"><div class="v">${fmtNum(s.sum)}</div><div class="k">Total ${esc(h.unit) || 'acumulado'}</div></div>`
        : `<div class="stat"><div class="v">${s.rate}%</div><div class="k">Cumplimiento</div></div>`}
    </div>
    <div class="cal">
      <div class="cal-head">
        <button data-action="cal-move" data-v="-1" aria-label="Mes anterior">${ic('chevron-left')}</button>
        <b>${monthName}</b>
        <button data-action="cal-move" data-v="1" aria-label="Mes siguiente" ${nextDisabled ? 'disabled' : ''}>${ic('chevron-right')}</button>
      </div>
      <div class="cal-grid">${dows}${cells}</div>
    </div>
    <p class="hint">${streakText(h) === 'Ninguna' ? '' : `Meta de racha: ${streakText(h)} · `}${simpleTap ? 'Toca un día para marcarlo' : 'Toca un día para editar su valor'} · Mantén presionado el check para editar hoy</p>
    <div class="btn-row">
      <button class="btn" data-action="archive">${ic(h.archived ? 'archive-restore' : 'archive')}${h.archived ? 'Restaurar' : 'Archivar'}</button>
      <button class="btn danger ${ui.armed === 'delete' ? 'armed' : ''}" data-action="delete">${ic('trash-2')}${ui.armed === 'delete' ? '¿Seguro?' : 'Eliminar'}</button>
    </div>`;
};

/* ---- Editor de valor de un día ---- */
PAGES.value = (p) => {
  const h = byId(p.id);
  const unit = h.tracking === 'custom' ? (h.unit || '') : 'veces';
  const custom = h.tracking === 'custom';
  const quick = custom ? [1, 5, 10] : [];
  const v = ui.tmpVal;
  return `${head(p.k === todayKey() ? 'Hoy' : esc(fmtDay(p.k)))}
    <div class="card-head" style="justify-content:center">${iconBox(h)}<b>${esc(h.name)}</b></div>
    <div class="value-big" style="color:${v >= h.perDay ? h.color : 'var(--text)'}" id="v-big">${fmtNum(v)}</div>
    <div class="value-sub">de ${fmtNum(h.perDay)} ${esc(unit)}</div>
    <div class="stepper-big">
      <button data-action="v-step" data-v="-1">${ic('minus')}</button>
      <input class="input" type="number" inputmode="decimal" id="v-input" value="${v}">
      <button data-action="v-step" data-v="1">${ic('plus')}</button>
    </div>
    ${quick.length ? `<div class="quick">${quick.map((q) => `<button data-action="v-step" data-v="${q}">+${q}</button>`).join('')}<button data-action="v-set" data-v="${h.perDay}">Meta</button></div>` : ''}
    <div class="btn-row"><button class="btn" data-action="v-set" data-v="0">Reiniciar</button><button class="btn primary" data-action="v-save">Guardar</button></div>`;
};

/* ---- Estadísticas ---- */
function dayRatio(k) {
  const hs = activeHabits().filter((h) => h.createdAt <= k || getVal(h, k) > 0);
  if (!hs.length) return null;
  const done = hs.filter((h) => isDone(h, k)).length;
  return { done, total: hs.length, r: done / hs.length };
}
PAGES.stats = () => {
  const hs = activeHabits();
  const t = today();
  const tk = todayKey();
  const doneToday = hs.filter((h) => isDone(h, tk)).length;
  const stats = hs.map((h) => ({ h, s: computeStats(h) }));
  const bestCur = stats.reduce((m, x) => Math.max(m, x.s.current), 0);
  const totalDone = stats.reduce((m, x) => m + x.s.total, 0);

  const days30 = Array.from({ length: 30 }, (_, i) => dkey(addDays(t, i - 29)));
  const r30 = days30.map(dayRatio);
  const wd = Array.from({ length: 7 }, () => ({ done: 0, total: 0 }));
  for (let i = 0; i < 91; i++) {
    const d = addDays(t, -i); const r = dayRatio(dkey(d));
    if (r) { wd[d.getDay()].done += r.done; wd[d.getDay()].total += r.total; }
  }
  const wdOrder = Array.from({ length: 7 }, (_, i) => (i + state.settings.weekStart) % 7);
  const sel = ui.selBar;
  let sub30 = 'Toca una barra para ver el detalle';
  if (sel?.c === 30 && r30[sel.i]) sub30 = `${fmtDay(days30[sel.i])}: ${r30[sel.i].done} de ${r30[sel.i].total} (${Math.round(r30[sel.i].r * 100)}%)`;
  let subWd = 'Promedio de los últimos 90 días';
  if (sel?.c === 7) { const w = wd[wdOrder[sel.i]]; subWd = `${DOW[wdOrder[sel.i]]}: ${w.total ? Math.round((w.done / w.total) * 100) : 0}% de cumplimiento`; }

  const bar = (r, c, i) => `<button data-action="bar" data-c="${c}" data-i="${i}" class="${sel?.c === c && sel.i === i ? 'sel' : ''}" aria-label="${Math.round((r || 0) * 100)}%"><i style="height:${Math.max(2, (r || 0) * 100)}%"></i></button>`;
  const d0 = parseKey(days30[0]);
  return `${head('Estadísticas')}
    <div class="stats" style="margin-top:0">
      <div class="stat"><div class="v">${doneToday}/${hs.length}</div><div class="k">Completados hoy</div></div>
      <div class="stat"><div class="v" style="color:var(--accent)">${ic('flame')}<span style="color:var(--text)">${bestCur}</span></div><div class="k">Racha activa más larga</div></div>
      <div class="stat"><div class="v">${hs.length}</div><div class="k">Hábitos activos</div></div>
      <div class="stat"><div class="v">${totalDone}</div><div class="k">Días completados (total)</div></div>
    </div>
    <div class="chart-card"><h3>Cumplimiento diario · 30 días</h3><div class="sub">${esc(sub30)}</div>
      <div class="bars">${r30.map((r, i) => bar(r?.r, 30, i)).join('')}</div>
      <div class="bar-axis"><span>${d0.getDate()} ${monShort(d0)}</span><span>Hoy</span></div></div>
    <div class="chart-card"><h3>Por día de la semana</h3><div class="sub">${esc(subWd)}</div>
      <div class="bars" style="gap:8px">${wdOrder.map((d, i) => bar(wd[d].total ? wd[d].done / wd[d].total : 0, 7, i)).join('')}</div>
      <div class="bar-axis seven">${wdOrder.map((d) => `<span>${DOW[d]}</span>`).join('')}</div></div>
    <div class="chart-card"><h3 style="margin-bottom:8px">Por hábito</h3>
      <div class="hs-row head"><span></span><span>Hábito</span><span class="num">Racha</span><span class="num">Mejor</span><span class="num">%</span></div>
      ${stats.map(({ h, s }) => `<div class="hs-row" data-action="open-from-stats" data-id="${h.id}">${iconBox(h)}<span class="nm">${esc(h.name)}</span><span class="num">${s.current}</span><span class="num">${s.best}</span><span class="num">${s.rate}%</span></div>`).join('') || '<p class="muted">Sin hábitos</p>'}
    </div>`;
};

/* ---- Ajustes ---- */
PAGES.settings = () => {
  const act = activeHabits();
  const arch = state.habits.filter((h) => h.archived);
  const ws = state.settings.weekStart;
  const th = state.settings.theme;
  return `${head('Ajustes')}
    <span class="sec-label">Cuenta y sincronización</span>
    <button class="row-btn" data-action="page" data-v="account"><span>${Sync.session ? esc(Sync.email) : 'Iniciar sesión para sincronizar'}<br><small class="muted">${esc(syncStatusText())}</small></span>${ic('chevron-right')}</button>
    <span class="sec-label">La semana empieza en</span>
    <div class="seg"><button data-action="ws" data-v="1" class="${ws === 1 ? 'on' : ''}">Lunes</button><button data-action="ws" data-v="0" class="${ws === 0 ? 'on' : ''}">Domingo</button></div>
    <span class="sec-label">Tema</span>
    <div class="seg">${[['auto', 'Sistema'], ['dark', 'Oscuro'], ['light', 'Claro']].map(([v, l]) => `<button data-action="theme" data-v="${v}" class="${th === v ? 'on' : ''}">${l}</button>`).join('')}</div>
    <span class="sec-label">Ordenar hábitos</span>
    <div class="panel">${act.length ? act.map((h, i) => `
      <div class="list-item">${iconBox(h, 'width:30px;height:30px;border-radius:9px')}<span class="grow">${esc(h.name)}</span>
        <button class="mini" data-action="move" data-id="${h.id}" data-v="-1" ${i === 0 ? 'disabled' : ''}>${ic('chevron-up')}</button>
        <button class="mini" data-action="move" data-id="${h.id}" data-v="1" ${i === act.length - 1 ? 'disabled' : ''}>${ic('chevron-down')}</button></div>`).join('') : '<div class="muted">Sin hábitos activos</div>'}</div>
    <span class="sec-label">Archivados (${arch.length})</span>
    <div class="panel">${arch.length ? arch.map((h) => `
      <div class="list-item">${iconBox(h, 'width:30px;height:30px;border-radius:9px')}<span class="grow">${esc(h.name)}</span>
        <button class="small-btn" data-action="open-archived" data-id="${h.id}">Ver</button>
        <button class="small-btn" data-action="unarchive" data-id="${h.id}">Restaurar</button></div>`).join('') : '<div class="muted">Nada archivado</div>'}</div>
    <span class="sec-label">Respaldo</span>
    <div class="panel"><div class="muted">Tus datos viven solo en este dispositivo. Exporta un respaldo seguido (iCloud Drive / Archivos).</div>
      <div class="btn-row"><button class="btn" data-action="export">${ic('upload')}Exportar</button><button class="btn" data-action="import">${ic('download')}Importar</button></div></div>
    <p class="hint">Hábitos v${APP_VERSION} · uso personal</p>`;
};

/* ---- Cuenta ---- */
PAGES.account = () => {
  if (Sync.session) {
    return `${head('Cuenta')}
      <div class="panel">
        <div class="list-item"><span class="grow"><b>${esc(Sync.email)}</b><br><span class="muted">${esc(syncStatusText())}</span></span></div>
      </div>
      <p class="hint">Tus hábitos se guardan en este dispositivo y se sincronizan con tu cuenta. Inicia sesión con el mismo correo en tus otros dispositivos.</p>
      <button class="btn primary" data-action="sync-now" ${Sync.status === 'syncing' ? 'disabled' : ''}>Sincronizar ahora</button>
      <button class="btn danger" data-action="sign-out">Cerrar sesión</button>
      <p class="hint">Al cerrar sesión tus datos se quedan en este dispositivo.</p>`;
  }
  const err = ui.authErr ? `<p class="hint" style="color:var(--danger)">${esc(ui.authErr)}</p>` : '';
  if (!ui.authSent) {
    return `${head('Iniciar sesión')}
      <p class="muted" style="margin:0 0 14px">Te enviaremos un código a tu correo. Sin contraseñas.</p>
      <input class="input" id="auth-email" type="email" inputmode="email" autocomplete="email" placeholder="tu@correo.com" value="${esc(ui.authEmail || '')}">
      ${err}
      <button class="btn primary" data-action="auth-send" ${ui.authBusy ? 'disabled' : ''}>${ui.authBusy ? 'Enviando…' : 'Enviar código'}</button>`;
  }
  return `${head('Escribe el código')}
    <p class="muted" style="margin:0 0 14px">Lo enviamos a <b>${esc(ui.authEmail)}</b>. Revisa también spam.</p>
    <input class="input" id="auth-code" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="123456" style="text-align:center;font-size:24px;letter-spacing:.3em">
    ${err}
    <button class="btn primary" data-action="auth-verify" ${ui.authBusy ? 'disabled' : ''}>${ui.authBusy ? 'Verificando…' : 'Entrar'}</button>
    <button class="btn" data-action="auth-change">Cambiar correo</button>`;
};

/* ---------------- Backup ---------------- */
async function exportData() {
  const json = JSON.stringify({ app: 'habitos', exportedAt: new Date().toISOString(), ...state }, null, 2);
  const name = `habitos-respaldo-${todayKey()}.json`;
  const file = new File([json], name, { type: 'application/json' });
  try {
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: name }); return; }
  } catch (e) { if (e.name === 'AbortError') return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
async function importData(file) {
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.habits) || typeof data.entries !== 'object') throw new Error('Formato inválido');
    state = hydrate(data);
    save(); applyTheme(); renderSheet(); renderList();
    toast(`Importados ${data.habits.length} hábitos`);
  } catch (e) { toast('Archivo no válido'); }
}

/* ---------------- Tema ---------------- */
function applyTheme() {
  const t = state.settings.theme;
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
  $('meta[name=theme-color]').content = isLight() ? '#f2f2f5' : '#0b0b0d';
}

/* ---------------- Eventos ---------------- */
let lpTimer = null, lpFired = false, lpStart = null;
document.addEventListener('pointerdown', (e) => {
  const b = e.target.closest('[data-lp]');
  if (!b) return;
  lpFired = false; lpStart = [e.clientX, e.clientY];
  lpTimer = setTimeout(() => {
    lpFired = true; haptic();
    const h = byId(b.dataset.id);
    if (h.type === 'quit') return;
    openValue(h.id, b.dataset.k);
  }, 450);
});
const lpCancel = () => clearTimeout(lpTimer);
document.addEventListener('pointerup', lpCancel);
document.addEventListener('pointercancel', lpCancel);
document.addEventListener('pointermove', (e) => { if (lpStart && Math.hypot(e.clientX - lpStart[0], e.clientY - lpStart[1]) > 10) lpCancel(); });
document.addEventListener('contextmenu', (e) => { if (e.target.closest('[data-lp]')) e.preventDefault(); });

function openDetail(id) {
  ui.calMonth = new Date(today().getFullYear(), today().getMonth(), 1);
  openSheet('detail', { id });
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  if (lpFired) { lpFired = false; e.stopPropagation(); return; }
  const a = el.dataset.action;
  const id = el.dataset.id;
  const v = el.dataset.v;
  const d = ui.draft;
  const p = topPage();
  if (a !== 'delete') ui.armed = null;

  switch (a) {
    case 'tap': {
      e.stopPropagation();
      if (tapDay(byId(id), el.dataset.k)) { renderList(); if (p) renderSheet(); }
      break;
    }
    case 'new': ui.draft = newDraft(); ui.adv = true; openSheet('edit'); break;
    case 'open': openDetail(id); break;
    case 'open-archived': case 'open-from-stats': openDetail(id); break;
    case 'close': closeAll(); break;
    case 'back': back(); break;
    case 'view': state.settings.view = v; save(); renderList(); window.scrollTo(0, 0); break;
    case 'filter': state.settings.filter = v || null; save(); renderList(); break;

    // --- Formulario
    case 'edit': ui.draft = draftFrom(byId(p.id)); ui.adv = true; ui.showExceed = byId(p.id).allowExceed; openSheet('edit'); break;
    case 'page': if (v === 'icon') ui.iconQuery = ''; ui.newCat = false; openSheet(v); break;
    case 'save-habit': saveHabit(); break;
    case 'adv': ui.adv = !ui.adv; renderSheet(); break;
    case 'exceed-panel': ui.showExceed = !ui.showExceed; renderSheet(); break;
    case 'd-set': {
      const f = el.dataset.f;
      d[f] = f === 'allowExceed' ? v === '1' : v;
      if (f === 'tracking' && v === 'step') d.perDay = Math.max(1, Math.round(d.perDay));
      renderSheet(); break;
    }
    case 'd-per': d.perDay = Math.max(1, Math.round(Number(d.perDay) || 1) + Number(v)); renderSheet(); break;
    case 'pick-icon': d.icon = v; back(); break;
    case 'd-streak':
      d.streakType = v;
      d.streakGoal = v === 'week' ? Math.min(Math.max(d.streakGoal, 3), 7) : v === 'month' ? Math.max(d.streakGoal, 10) : 1;
      renderSheet(); break;
    case 'd-goal': d.streakGoal = Math.min(d.streakType === 'week' ? 7 : 31, Math.max(1, d.streakGoal + Number(v))); renderSheet(); break;
    case 'toggle-cat': d.categories = d.categories.includes(v) ? d.categories.filter((c) => c !== v) : [...d.categories, v]; renderSheet(); break;
    case 'new-cat': ui.newCat = true; renderSheet(); $('#new-cat')?.focus(); break;
    case 'add-cat': {
      const name = $('#new-cat').value.trim();
      if (name) {
        const c = { id: 'c-' + uid(), name, icon: 'star' };
        state.settings.customCats.push(c); d.categories.push(c.id); save();
      }
      ui.newCat = false; renderSheet(); break;
    }
    case 'rem-add': d.reminders.push({ time: '08:00', days: [0, 1, 2, 3, 4, 5, 6] }); renderSheet(); break;
    case 'rem-del': d.reminders.splice(Number(v), 1); renderSheet(); break;
    case 'rem-day': {
      const r = d.reminders[Number(el.dataset.i)]; const wd = Number(v);
      r.days = r.days.includes(wd) ? r.days.filter((x) => x !== wd) : [...r.days, wd].sort();
      renderSheet(); break;
    }
    case 'rem-ics': exportICS(d); break;

    // --- Detalle
    case 'cal-day': {
      const h = byId(p.id);
      const simple = h.type === 'quit' || (h.tracking === 'step' && h.perDay === 1 && !h.allowExceed);
      if (simple) { tapDay(h, el.dataset.k); renderSheet(); } else openValue(h.id, el.dataset.k);
      break;
    }
    case 'cal-move': ui.calMonth = new Date(ui.calMonth.getFullYear(), ui.calMonth.getMonth() + Number(v), 1); renderSheet(); break;
    case 'archive': {
      const h = byId(p.id);
      h.archived = !h.archived; save(); closeAll(); toast(h.archived ? 'Hábito archivado' : 'Hábito restaurado'); break;
    }
    case 'delete':
      if (ui.armed !== 'delete') { ui.armed = 'delete'; renderSheet(); break; }
      state.habits = state.habits.filter((x) => x.id !== p.id);
      delete state.entries[p.id];
      save(); closeAll(); toast('Hábito eliminado'); break;

    // --- Editor de valor
    case 'v-step': ui.tmpVal = Math.max(0, (Number($('#v-input').value) || 0) + Number(v)); renderSheet(); break;
    case 'v-set': ui.tmpVal = Number(v); renderSheet(); break;
    case 'v-save': {
      const h = byId(p.id);
      setVal(h, p.k, Number($('#v-input').value) || 0);
      haptic(); back(); break;
    }

    // --- Estadísticas
    case 'bar': {
      const c = Number(el.dataset.c), i = Number(el.dataset.i);
      ui.selBar = ui.selBar?.c === c && ui.selBar.i === i ? null : { c, i };
      renderSheet(); break;
    }

    // --- Ajustes
    case 'ws': state.settings.weekStart = Number(v); save(); renderSheet(); break;
    case 'theme': state.settings.theme = v; save(); applyTheme(); renderSheet(); break;
    case 'move': {
      const list = activeHabits();
      const i = list.findIndex((h) => h.id === id);
      const j = i + Number(v);
      if (j < 0 || j >= list.length) break;
      [list[i], list[j]] = [list[j], list[i]];
      list.forEach((h, n) => (h.order = n));
      save(); renderSheet(); break;
    }
    case 'unarchive': byId(id).archived = false; save(); renderSheet(); break;
    case 'export': exportData(); break;

    // --- Cuenta
    case 'auth-send': {
      const email = $('#auth-email').value.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) { ui.authErr = 'Correo no válido'; renderSheet(); break; }
      ui.authEmail = email; ui.authBusy = true; ui.authErr = ''; renderSheet();
      Sync.sendCode(email)
        .then(() => { ui.authSent = true; })
        .catch((err) => { ui.authErr = err.status === 429 ? 'Demasiados intentos, espera unos minutos' : err.message; })
        .finally(() => { ui.authBusy = false; renderSheet(); $('#auth-code')?.focus(); });
      break;
    }
    case 'auth-verify': {
      const code = $('#auth-code').value.replace(/\D/g, '');
      if (code.length < 6) { ui.authErr = 'Escribe el código completo'; renderSheet(); break; }
      ui.authBusy = true; ui.authErr = ''; renderSheet();
      Sync.verify(ui.authEmail, code)
        .then(() => { ui.authSent = false; toast('Sesión iniciada'); })
        .catch((err) => { ui.authErr = /expired|invalid/i.test(err.message) ? 'Código incorrecto o vencido' : err.message; })
        .finally(() => { ui.authBusy = false; renderSheet(); });
      break;
    }
    case 'auth-change': ui.authSent = false; ui.authErr = ''; renderSheet(); break;
    case 'sync-now': Sync.sync(); break;
    case 'sign-out': Sync.signOut().then(() => { renderSheet(); toast('Sesión cerrada'); }); break;
    case 'import': $('#import-file').click(); break;
  }
});

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.id === 'icon-q') {
    ui.iconQuery = t.value;
    const q = t.value.trim().toLowerCase();
    $('#icon-grid').innerHTML = iconGridHTML(Object.keys(ICONS).filter((n) => !q || n.includes(q) || ICONS[n][1].includes(q)));
    return;
  }
  if (t.id === 'v-input') {
    const h = byId(topPage().id);
    ui.tmpVal = Number(t.value) || 0;
    const big = $('#v-big'); big.textContent = fmtNum(ui.tmpVal);
    big.style.color = ui.tmpVal >= h.perDay ? h.color : 'var(--text)';
    return;
  }
  if (t.dataset.rem !== undefined && ui.draft) { ui.draft.reminders[Number(t.dataset.rem)].time = t.value; return; }
  const b = t.dataset.bind;
  if (!b || !ui.draft) return;
  ui.draft[b] = b === 'perDay' ? (Number(t.value) || 1) : t.value;
  const btn = $('[data-action="save-habit"]');
  if (btn) btn.disabled = !ui.draft.name.trim();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && topPage()?.name === 'edit' && e.target.tagName === 'INPUT') { e.preventDefault(); e.target.blur(); }
  if (e.key === 'Escape' && ui.stack.length) back();
});

$('#btn-add').addEventListener('click', () => { ui.draft = newDraft(); ui.adv = true; openSheet('edit'); });
$('#btn-settings').addEventListener('click', () => openSheet('settings'));
$('#btn-stats').addEventListener('click', () => openSheet('stats'));
$('#btn-filter').addEventListener('click', () => {
  const s = state.settings;
  s.showFilter = !s.showFilter;
  if (!s.showFilter) s.filter = null;
  save(); renderList();
});
$('.backdrop').addEventListener('click', () => back());
$('#import-file').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) importData(f); e.target.value = ''; });

function scrollBigGrid() { requestAnimationFrame(() => { const g = $('#big-grid'); if (g) g.scrollLeft = g.scrollWidth; }); }

let resizeT;
window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(renderList, 120); });
matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', () => { applyTheme(); renderList(); if (ui.stack.length) renderSheet(); });

let lastDay = todayKey();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && todayKey() !== lastDay) {
    lastDay = todayKey(); renderList(); if (ui.stack.length) renderSheet();
  }
});

/* ---------------- Init ---------------- */
(async function init() {
  // íconos de la barra superior y de vistas
  $('#btn-settings').innerHTML = ic('settings');
  $('#btn-filter').innerHTML = ic('funnel');
  $('#btn-stats').innerHTML = ic('chart-no-axes-column');
  $('#btn-add').innerHTML = ic('plus');
  document.querySelectorAll('.viewbar button').forEach((b) => (b.innerHTML = ic(b.dataset.icon)));

  await loadState();
  applyTheme();
  renderList();
  Sync.init();
  try { await navigator.storage?.persist?.(); } catch {}
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    try {
      const reg = await navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' });
      // Busca versión nueva cada vez que regresas a la app
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
      // Si ya había un SW y entra uno nuevo, recarga una vez para mostrar la versión nueva
      const hadController = !!navigator.serviceWorker.controller;
      let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadController || reloaded || ui.stack.length) return;
        reloaded = true; location.reload();
      });
    } catch (e) { console.warn('SW', e); }
  }
})();
