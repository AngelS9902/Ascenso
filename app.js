'use strict';

/* =========================================================
   Hábitos — clon personal de HabitKit (PWA, vanilla JS)
   Datos: IndexedDB (+ espejo en localStorage)
   ========================================================= */

const APP_VERSION = '1.0.0';
const DB_NAME = 'habitos-db';
const STORE = 'kv';

const COLORS = [
  '#ff4d5e', '#ff7a45', '#ffa940', '#ffd43b', '#a0d911', '#52c41a', '#13c2a3', '#36cfc9', '#40a9ff', '#2f6bff',
  '#7c5cff', '#9254de', '#c850f0', '#f759ab', '#ff85c0', '#b37feb', '#8c8c8c', '#d4a373', '#e76f51', '#2a9d8f',
];

const EMOJIS = [
  '💪','🏃','🚶','🧘','🏋️','🚴','🏊','⚽','🥗','🍎','💧','🥛','☕','🚭','🍷','😴',
  '📚','📖','✍️','🧠','🎓','💻','🧑‍💻','📝','🎸','🎹','🎨','📷','🎧','🌱','🌞','🌙',
  '🦷','🧴','🚿','💊','❤️','🙏','😊','🧹','🧺','🍳','🛏️','📵','💰','💸','📈','🗓️',
  '🐶','🐱','👨‍👩‍👧','📞','✉️','🧾','🛒','🚗','✈️','🌍','♟️','🎯','🔥','⭐','✅','🏆',
];

const DOW_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/* ---------------- Estado ---------------- */
let state = defaultState();
let ui = { sheet: null, draft: null, detailId: null, calMonth: null, armed: null };

function defaultState() {
  return {
    version: 1,
    settings: { weekStart: 1, theme: 'auto' },
    habits: [],
    entries: {}, // { habitId: { 'YYYY-MM-DD': count } }
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
async function loadState() {
  let s = null;
  try { s = await idbGet('state'); } catch (e) { console.warn('IDB no disponible', e); }
  if (!s) {
    try { const raw = localStorage.getItem('habitos-state'); if (raw) s = JSON.parse(raw); } catch {}
  }
  if (s && Array.isArray(s.habits)) {
    state = { ...defaultState(), ...s, settings: { ...defaultState().settings, ...(s.settings || {}) } };
  }
}
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try { await idbSet('state', state); } catch (e) { console.warn(e); }
    try { localStorage.setItem('habitos-state', JSON.stringify(state)); } catch {}
  }, 150);
}

/* ---------------- Fechas ---------------- */
const pad = (n) => String(n).padStart(2, '0');
const dkey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const weekOffset = (d) => (d.getDay() - state.settings.weekStart + 7) % 7;

/* ---------------- Utilidades ---------------- */
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
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
const emptyAlpha = () => (isLight() ? 0.13 : 0.16);
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 2000);
}
function haptic() { try { navigator.vibrate?.(8); } catch {} }

const ICON = {
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  left: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
  right: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
};

/* ---------------- Lógica de hábitos ---------------- */
const activeHabits = () => state.habits.filter((h) => !h.archived).sort((a, b) => a.order - b.order);
const getCount = (h, k) => state.entries[h.id]?.[k] || 0;
function setCount(h, k, v) {
  state.entries[h.id] ??= {};
  if (v <= 0) delete state.entries[h.id][k];
  else state.entries[h.id][k] = Math.min(v, h.perDay);
  save();
}
const dayDone = (h, k) => getCount(h, k) >= h.perDay;

function tapDay(h, k) {
  const c = getCount(h, k);
  setCount(h, k, c >= h.perDay ? 0 : c + 1);
  haptic();
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
  for (let d = new Date(start); d < end; d = addDays(d, 1)) if (dayDone(h, dkey(d))) n++;
  return n;
}

/** Calcula racha actual y mejor racha según el tipo de meta. */
function computeStats(h) {
  const type = h.streakType === 'none' ? 'day' : h.streakType;
  const goal = type === 'day' ? 1 : h.streakGoal;
  const keys = Object.keys(state.entries[h.id] || {}).filter((k) => dayDone(h, k)).sort();
  const t = today();
  const created = parseKey(h.createdAt || dkey(t));
  const first = keys.length && parseKey(keys[0]) < created ? parseKey(keys[0]) : created;

  const totalDays = keys.length;
  const span = Math.max(1, Math.round((t - first) / 86400000) + 1);
  const rate = Math.round((totalDays / span) * 100);

  if (!keys.length) return { current: 0, best: 0, total: 0, rate: 0, unit: type };

  const met = [];
  const curStart = periodStart(t, type).getTime();
  for (let p = periodStart(first, type); p.getTime() <= curStart; p = nextPeriod(p, type)) {
    met.push(doneInPeriod(h, p, type) >= goal);
  }
  let best = 0, run = 0;
  for (const m of met) { run = m ? run + 1 : 0; best = Math.max(best, run); }
  // Racha actual: si el periodo en curso no está cumplido aún, no rompe la racha
  let i = met.length - 1;
  if (!met[i]) i--;
  let current = 0;
  while (i >= 0 && met[i]) { current++; i--; }
  return { current, best, total: totalDays, rate: Math.min(100, rate), unit: type };
}
const unitLabel = (u, n) => ({ day: n === 1 ? 'día' : 'días', week: n === 1 ? 'semana' : 'semanas', month: n === 1 ? 'mes' : 'meses' }[u]);

/* ---------------- Render: lista ---------------- */
function gridCols() {
  const w = Math.min(window.innerWidth, 640) - 32 - 28;
  const target = 12, gap = 3;
  return Math.max(10, Math.floor((w + gap) / (target + gap)));
}

function heatmapHTML(h, cols) {
  const t = today();
  const tk = dkey(t);
  const firstCol = addDays(t, -weekOffset(t) - (cols - 1) * 7);
  const ea = emptyAlpha();
  let html = '';
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < 7; r++) {
      const d = addDays(firstCol, c * 7 + r);
      const k = dkey(d);
      if (d > t) { html += '<div class="cell future"></div>'; continue; }
      const ratio = getCount(h, k) / h.perDay;
      const a = ratio >= 1 ? 1 : ea + (1 - ea) * ratio * 0.75;
      html += `<div class="cell${k === tk ? ' today' : ''}" style="background:${rgba(h.color, a)}"></div>`;
    }
  }
  return html;
}

function checkHTML(h, k) {
  const c = getCount(h, k);
  const done = c >= h.perDay;
  const ratio = c / h.perDay;
  const bg = rgba(h.color, done ? 1 : emptyAlpha());
  const fill = !done && c > 0 ? `<div class="fill" style="height:${ratio * 100}%;background:${rgba(h.color, 0.55)}"></div>` : '';
  const inner = !done && h.perDay > 1 && c > 0
    ? `<span style="color:${isLight() ? '#111' : '#fff'}">${c}/${h.perDay}</span>`
    : `<span style="color:${done ? '#fff' : h.color};display:grid">${ICON.check}</span>`;
  return `<button class="check" data-action="check" data-id="${h.id}" style="background:${bg}" aria-label="Marcar hoy">${fill}${inner}</button>`;
}

function renderList() {
  const list = $('#list');
  const habits = activeHabits();
  if (!habits.length) {
    list.innerHTML = `<div class="empty"><div class="big">🌱</div><b>Sin hábitos todavía</b><div>Crea tu primer hábito y empieza tu racha.</div><button data-action="new">Crear hábito</button></div>`;
    return;
  }
  const cols = gridCols();
  const tk = dkey(today());
  list.innerHTML = habits.map((h) => `
    <article class="card" data-action="open" data-id="${h.id}">
      <div class="card-head">
        <div class="h-icon" style="background:${rgba(h.color, emptyAlpha())}">${esc(h.icon)}</div>
        <div class="h-text">
          <div class="h-name">${esc(h.name)}</div>
          ${h.desc ? `<div class="h-desc">${esc(h.desc)}</div>` : ''}
        </div>
        ${checkHTML(h, tk)}
      </div>
      <div class="grid" style="grid-auto-columns:1fr">${heatmapHTML(h, cols)}</div>
    </article>`).join('');
}

/* ---------------- Sheets ---------------- */
function openSheet(name) {
  ui.sheet = name;
  $('#sheet-root').hidden = false;
  document.body.style.overflow = 'hidden';
  renderSheet();
  $('#sheet').scrollTop = 0;
}
function closeSheet() {
  ui.sheet = null; ui.draft = null; ui.detailId = null; ui.armed = null;
  $('#sheet-root').hidden = true;
  document.body.style.overflow = '';
  renderList();
}
function renderSheet() {
  const el = $('#sheet');
  const scroll = el.scrollTop;
  if (ui.sheet === 'edit') el.innerHTML = editHTML();
  else if (ui.sheet === 'detail') el.innerHTML = detailHTML();
  else if (ui.sheet === 'settings') el.innerHTML = settingsHTML();
  el.scrollTop = scroll;
}

/* ---- Crear / editar ---- */
function newDraft() {
  return { id: null, name: '', desc: '', icon: '💪', color: COLORS[10], perDay: 1, streakType: 'day', streakGoal: 1 };
}
function editHTML() {
  const d = ui.draft;
  const typeSeg = [['none', 'Ninguna'], ['day', 'Diaria'], ['week', 'Semanal'], ['month', 'Mensual']]
    .map(([v, l]) => `<button data-action="d-type" data-v="${v}" class="${d.streakType === v ? 'on' : ''}">${l}</button>`).join('');
  const maxGoal = d.streakType === 'week' ? 7 : 31;
  return `
    <div class="grabber"></div>
    <div class="sheet-head">
      <button class="link-btn" data-action="close-sheet">Cancelar</button>
      <h2>${d.id ? 'Editar hábito' : 'Nuevo hábito'}</h2>
      <button class="link-btn" data-action="save-habit" ${d.name.trim() ? '' : 'disabled'}>Guardar</button>
    </div>

    <div class="card-head" style="margin:0 0 14px">
      <div class="h-icon" style="background:${rgba(d.color, emptyAlpha())};width:56px;height:56px;font-size:28px">${esc(d.icon)}</div>
      <div class="h-text"><div class="h-name">${esc(d.name) || '<span class="muted">Nombre del hábito</span>'}</div>
      <div class="h-desc">${esc(d.desc)}</div></div>
      <div class="check" style="background:${d.color}"><span style="color:#fff;display:grid">${ICON.check}</span></div>
    </div>

    <div class="field"><label for="f-name">Nombre</label>
      <input type="text" id="f-name" data-bind="name" maxlength="40" placeholder="Ej. Leer 20 minutos" value="${esc(d.name)}"></div>
    <div class="field"><label for="f-desc">Descripción</label>
      <input type="text" id="f-desc" data-bind="desc" maxlength="80" placeholder="Opcional" value="${esc(d.desc)}"></div>

    <div class="field"><span class="label">Ícono</span>
      <div class="emoji-grid">${EMOJIS.map((e) => `<button data-action="d-icon" data-v="${e}" class="${d.icon === e ? 'sel' : ''}">${e}</button>`).join('')}</div>
    </div>

    <div class="field"><span class="label">Color</span>
      <div class="color-grid">${COLORS.map((c) => `<button data-action="d-color" data-v="${c}" class="${d.color === c ? 'sel' : ''}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div>
    </div>

    <div class="field">
      <span class="label">Meta de racha</span>
      <div class="seg">${typeSeg}</div>
      ${d.streakType === 'week' || d.streakType === 'month' ? `
      <div class="row" style="margin-top:12px"><span>Días por ${d.streakType === 'week' ? 'semana' : 'mes'}</span>
        <div class="stepper"><button data-action="d-goal" data-v="-1">−</button><b>${d.streakGoal}</b><button data-action="d-goal" data-v="1" ${d.streakGoal >= maxGoal ? 'disabled' : ''}>+</button></div></div>` : ''}
    </div>

    <div class="field">
      <div class="row"><div><span class="label" style="margin:0">Veces por día</span><div class="muted">Toques necesarios para completar el día</div></div>
        <div class="stepper"><button data-action="d-per" data-v="-1">−</button><b>${d.perDay}</b><button data-action="d-per" data-v="1">+</button></div></div>
    </div>`;
}

function saveHabit() {
  const d = ui.draft;
  if (!d.name.trim()) return;
  const clean = {
    name: d.name.trim(), desc: d.desc.trim(), icon: d.icon, color: d.color,
    perDay: d.perDay, streakType: d.streakType, streakGoal: d.streakGoal,
  };
  if (d.id) {
    Object.assign(state.habits.find((h) => h.id === d.id), clean);
    save();
    ui.draft = null;
    ui.sheet = 'detail';
    renderSheet();
    return;
  }
  const maxOrder = state.habits.reduce((m, h) => Math.max(m, h.order), -1);
  state.habits.push({ id: uid(), ...clean, archived: false, createdAt: dkey(today()), order: maxOrder + 1 });
  save();
  closeSheet();
  toast('Hábito creado');
}

/* ---- Detalle ---- */
function detailHTML() {
  const h = state.habits.find((x) => x.id === ui.detailId);
  if (!h) return '';
  const s = computeStats(h);
  const t = today();
  const m = ui.calMonth;
  const mn = m.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  const monthName = mn.charAt(0).toUpperCase() + mn.slice(1);
  const first = new Date(m.getFullYear(), m.getMonth(), 1);
  const days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
  const lead = weekOffset(first);
  const dows = Array.from({ length: 7 }, (_, i) => `<div class="dow">${DOW_ES[(i + state.settings.weekStart) % 7]}</div>`).join('');
  const ea = emptyAlpha();
  let cells = '<div></div>'.repeat(lead);
  for (let i = 1; i <= days; i++) {
    const d = new Date(m.getFullYear(), m.getMonth(), i);
    const k = dkey(d);
    const c = getCount(h, k);
    const done = c >= h.perDay;
    const fill = !done && c > 0 ? `<div class="fill" style="height:${(c / h.perDay) * 100}%;background:${rgba(h.color, .55)}"></div>` : '';
    const cls = ['cal-day', d > t ? 'future' : '', k === dkey(t) ? 'today' : ''].join(' ');
    cells += `<button class="${cls}" data-action="cal-day" data-k="${k}" style="background:${rgba(h.color, done ? 1 : ea)};color:${done ? '#fff' : 'inherit'}">${fill}<span>${i}</span></button>`;
  }
  const nextDisabled = m.getFullYear() === t.getFullYear() && m.getMonth() === t.getMonth();

  const goalTxt = h.streakType === 'none' ? 'Sin meta de racha'
    : h.streakType === 'day' ? 'Meta: todos los días'
    : `Meta: ${h.streakGoal} ${h.streakGoal === 1 ? 'día' : 'días'} por ${h.streakType === 'week' ? 'semana' : 'mes'}`;

  return `
    <div class="grabber"></div>
    <div class="sheet-head">
      <button class="link-btn" data-action="close-sheet">Cerrar</button>
      <button class="link-btn" data-action="edit">Editar</button>
    </div>
    <div class="card-head">
      <div class="h-icon" style="background:${rgba(h.color, ea)};width:56px;height:56px;font-size:28px">${esc(h.icon)}</div>
      <div class="h-text"><div class="h-name" style="font-size:20px">${esc(h.name)}</div>
        <div class="h-desc">${esc(h.desc) || goalTxt}</div></div>
      ${checkHTML(h, dkey(t))}
    </div>

    <div class="big-grid-wrap" id="big-grid"><div class="grid">${heatmapHTML(h, 53)}</div></div>

    <div class="stats">
      <div class="stat"><div class="v">🔥 ${s.current}</div><div class="k">Racha actual (${unitLabel(s.unit, s.current)})</div></div>
      <div class="stat"><div class="v">🏆 ${s.best}</div><div class="k">Mejor racha (${unitLabel(s.unit, s.best)})</div></div>
      <div class="stat"><div class="v">${s.total}</div><div class="k">Días completados</div></div>
      <div class="stat"><div class="v">${s.rate}%</div><div class="k">Tasa de cumplimiento</div></div>
    </div>

    <div class="cal">
      <div class="cal-head">
        <button data-action="cal-prev" aria-label="Mes anterior">${ICON.left}</button>
        <b>${monthName}</b>
        <button data-action="cal-next" aria-label="Mes siguiente" ${nextDisabled ? 'disabled style="opacity:.3"' : ''}>${ICON.right}</button>
      </div>
      <div class="cal-grid">${dows}${cells}</div>
    </div>
    <p class="muted" style="text-align:center">${goalTxt} · toca un día para marcarlo</p>

    <div class="btn-row">
      <button class="btn" data-action="archive">${h.archived ? 'Desarchivar' : 'Archivar'}</button>
      <button class="btn danger ${ui.armed === 'delete' ? 'armed' : ''}" data-action="delete">${ui.armed === 'delete' ? '¿Seguro? Toca otra vez' : 'Eliminar'}</button>
    </div>`;
}

/* ---- Ajustes ---- */
function settingsHTML() {
  const act = activeHabits();
  const arch = state.habits.filter((h) => h.archived);
  const ws = state.settings.weekStart;
  const th = state.settings.theme;
  return `
    <div class="grabber"></div>
    <div class="sheet-head"><h2>Ajustes</h2><button class="link-btn" data-action="close-sheet">Listo</button></div>

    <div class="field"><span class="label">Semana empieza en</span>
      <div class="seg"><button data-action="ws" data-v="1" class="${ws === 1 ? 'on' : ''}">Lunes</button><button data-action="ws" data-v="0" class="${ws === 0 ? 'on' : ''}">Domingo</button></div></div>

    <div class="field"><span class="label">Tema</span>
      <div class="seg">${[['auto', 'Sistema'], ['dark', 'Oscuro'], ['light', 'Claro']].map(([v, l]) => `<button data-action="theme" data-v="${v}" class="${th === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>

    <div class="field"><span class="label">Ordenar hábitos</span>
      ${act.length ? act.map((h, i) => `
        <div class="list-item"><span>${esc(h.icon)}</span><span class="grow">${esc(h.name)}</span>
          <button class="mini" data-action="move" data-id="${h.id}" data-v="-1" ${i === 0 ? 'disabled' : ''}>${ICON.up}</button>
          <button class="mini" data-action="move" data-id="${h.id}" data-v="1" ${i === act.length - 1 ? 'disabled' : ''}>${ICON.down}</button></div>`).join('') : '<div class="muted">Sin hábitos activos</div>'}
    </div>

    <div class="field"><span class="label">Archivados (${arch.length})</span>
      ${arch.length ? arch.map((h) => `
        <div class="list-item"><span>${esc(h.icon)}</span><span class="grow">${esc(h.name)}</span>
          <button class="small-btn" data-action="open-archived" data-id="${h.id}">Ver</button>
          <button class="small-btn" data-action="unarchive" data-id="${h.id}">Restaurar</button></div>`).join('') : '<div class="muted">Nada archivado</div>'}
    </div>

    <div class="field"><span class="label">Respaldo</span>
      <div class="muted">Tus datos viven solo en este dispositivo. Exporta un respaldo seguido (iCloud Drive / Archivos).</div>
      <div class="btn-row"><button class="btn" data-action="export">Exportar</button><button class="btn" data-action="import">Importar</button></div>
    </div>
    <p class="muted" style="text-align:center">Hábitos v${APP_VERSION} · uso personal</p>`;
}

/* ---------------- Backup ---------------- */
async function exportData() {
  const json = JSON.stringify({ app: 'habitos', exportedAt: new Date().toISOString(), ...state }, null, 2);
  const name = `habitos-respaldo-${dkey(today())}.json`;
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
    state = { ...defaultState(), habits: data.habits, entries: data.entries || {}, settings: { ...defaultState().settings, ...(data.settings || {}) } };
    save(); applyTheme(); renderSheet(); renderList();
    toast(`Importados ${data.habits.length} hábitos`);
  } catch (e) { toast('Archivo no válido'); }
}

/* ---------------- Tema ---------------- */
function applyTheme() {
  const t = state.settings.theme;
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
  $('meta[name=theme-color]').content = isLight() ? '#f3f3f6' : '#0e0e10';
}

/* ---------------- Eventos ---------------- */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const a = el.dataset.action;
  const id = el.dataset.id;
  const v = el.dataset.v;

  // Botón de check dentro de la tarjeta: no abrir detalle
  if (a === 'check') {
    e.stopPropagation();
    const h = state.habits.find((x) => x.id === id);
    tapDay(h, dkey(today()));
    renderList();
    if (ui.sheet === 'detail') renderSheet();
    return;
  }
  if (a !== 'delete') ui.armed = null;

  switch (a) {
    case 'new': ui.draft = newDraft(); openSheet('edit'); break;
    case 'open': ui.detailId = id; ui.calMonth = new Date(today().getFullYear(), today().getMonth(), 1); openSheet('detail'); scrollBigGrid(); break;
    case 'close-sheet':
      if (ui.sheet === 'edit' && ui.draft?.id) { ui.draft = null; ui.sheet = 'detail'; renderSheet(); }
      else closeSheet();
      break;
    case 'edit': {
      const h = state.habits.find((x) => x.id === ui.detailId);
      ui.draft = { id: h.id, name: h.name, desc: h.desc, icon: h.icon, color: h.color, perDay: h.perDay, streakType: h.streakType, streakGoal: h.streakGoal };
      ui.sheet = 'edit'; renderSheet(); $('#sheet').scrollTop = 0; break;
    }
    case 'save-habit': saveHabit(); break;
    case 'd-icon': ui.draft.icon = v; renderSheet(); break;
    case 'd-color': ui.draft.color = v; renderSheet(); break;
    case 'd-type':
      ui.draft.streakType = v;
      ui.draft.streakGoal = v === 'week' ? Math.min(Math.max(ui.draft.streakGoal, 3), 7) : v === 'month' ? Math.max(ui.draft.streakGoal, 10) : 1;
      renderSheet(); break;
    case 'd-goal': {
      const max = ui.draft.streakType === 'week' ? 7 : 31;
      ui.draft.streakGoal = Math.min(max, Math.max(1, ui.draft.streakGoal + Number(v))); renderSheet(); break;
    }
    case 'd-per': ui.draft.perDay = Math.min(20, Math.max(1, ui.draft.perDay + Number(v))); renderSheet(); break;

    case 'cal-day': {
      const h = state.habits.find((x) => x.id === ui.detailId);
      tapDay(h, el.dataset.k); renderSheet(); break;
    }
    case 'cal-prev': ui.calMonth = new Date(ui.calMonth.getFullYear(), ui.calMonth.getMonth() - 1, 1); renderSheet(); break;
    case 'cal-next': ui.calMonth = new Date(ui.calMonth.getFullYear(), ui.calMonth.getMonth() + 1, 1); renderSheet(); break;
    case 'archive': {
      const h = state.habits.find((x) => x.id === ui.detailId);
      h.archived = !h.archived; save(); closeSheet(); toast(h.archived ? 'Hábito archivado' : 'Hábito restaurado'); break;
    }
    case 'delete':
      if (ui.armed !== 'delete') { ui.armed = 'delete'; renderSheet(); break; }
      state.habits = state.habits.filter((x) => x.id !== ui.detailId);
      delete state.entries[ui.detailId];
      save(); closeSheet(); toast('Hábito eliminado'); break;

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
    case 'unarchive': state.habits.find((x) => x.id === id).archived = false; save(); renderSheet(); break;
    case 'open-archived': ui.detailId = id; ui.calMonth = new Date(today().getFullYear(), today().getMonth(), 1); ui.sheet = 'detail'; renderSheet(); scrollBigGrid(); break;
    case 'export': exportData(); break;
    case 'import': $('#import-file').click(); break;
  }
});

document.addEventListener('input', (e) => {
  const b = e.target.dataset.bind;
  if (!b || !ui.draft) return;
  ui.draft[b] = e.target.value;
  // Actualiza solo la vista previa y el botón Guardar (sin re-render para no perder el foco)
  const btn = $('[data-action="save-habit"]');
  if (btn) btn.disabled = !ui.draft.name.trim();
  const name = $('#sheet .card-head .h-name'); const desc = $('#sheet .card-head .h-desc');
  if (name) name.innerHTML = esc(ui.draft.name) || '<span class="muted">Nombre del hábito</span>';
  if (desc) desc.textContent = ui.draft.desc;
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && ui.sheet === 'edit') { e.preventDefault(); saveHabit(); }
  if (e.key === 'Escape' && ui.sheet) closeSheet();
});

$('#btn-add').addEventListener('click', () => { ui.draft = newDraft(); openSheet('edit'); });
$('#btn-settings').addEventListener('click', () => openSheet('settings'));
$('#import-file').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) importData(f); e.target.value = ''; });

function scrollBigGrid() { requestAnimationFrame(() => { const g = $('#big-grid'); if (g) g.scrollLeft = g.scrollWidth; }); }

let resizeT;
window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(renderList, 120); });
matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', () => { applyTheme(); renderList(); if (ui.sheet) renderSheet(); });

// Re-render al volver a la app (cambio de día)
let lastDay = dkey(today());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && dkey(today()) !== lastDay) {
    lastDay = dkey(today()); renderList(); if (ui.sheet) renderSheet();
  }
});

/* ---------------- Init ---------------- */
(async function init() {
  await loadState();
  applyTheme();
  renderList();
  try { await navigator.storage?.persist?.(); } catch {}
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW', e));
  }
})();
