'use strict';

/* =========================================================
   Sincronización con Supabase (sin librerías, fetch directo)
   - Local primero: IndexedDB sigue siendo la fuente principal.
   - push: sube lo que cambió respecto a la última copia sincronizada (shadow).
   - pull: baja lo que cambió en el servidor desde el último cursor (server_at).
   - Login: correo + contraseña (Supabase Auth).
   ========================================================= */

const SB_URL = 'https://qkezslqtuxsonyuxrizv.supabase.co';
const SB_KEY = 'sb_publishable_stWHHQBYxsDqbaJT44o8ug_1ILRaxio'; // llave pública: segura con RLS
const SYNCED_SETTINGS = ['weekStart', 'theme', 'customCats'];
const CHUNK = 500;

function emptyMeta() {
  return { userId: null, shadow: { habits: {}, entries: {}, settings: null }, cursor: { habits: null, entries: null, settings: null }, lastSync: null };
}

const Sync = {
  session: null,
  meta: emptyMeta(),
  status: 'off', // off | idle | syncing | offline | error
  error: '',
  timer: null,
  running: false,
  again: false,

  /* ---------- Arranque ---------- */
  async init() {
    try {
      this.session = (await idbGet('session')) || null;
      this.meta = (await idbGet('sync')) || emptyMeta();
    } catch (e) { console.warn('Sync init', e); }
    if (this.session) { this.status = 'idle'; this.sync(); }
    window.addEventListener('online', () => this.sync());
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') this.sync(); });
  },
  get email() { return this.session?.user?.email || ''; },
  saveMeta() { return idbSet('sync', this.meta).catch(() => {}); },
  notify() { if (typeof onSyncStatus === 'function') onSyncStatus(); },

  /* ---------- HTTP ---------- */
  async api(path, { method = 'GET', body, headers = {}, auth = true } = {}) {
    const h = { apikey: SB_KEY, 'Content-Type': 'application/json', ...headers };
    if (auth) { await this.ensureFresh(); h.Authorization = 'Bearer ' + this.session.access_token; }
    const res = await fetch(SB_URL + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) {
      let msg = res.statusText;
      try { const j = await res.json(); msg = j.msg || j.message || j.error_description || j.error || msg; } catch {}
      const err = new Error(msg); err.status = res.status; throw err;
    }
    const txt = await res.text();
    return txt ? JSON.parse(txt) : null;
  },

  /* ---------- Auth (correo + contraseña) ---------- */
  async signIn(email, password) {
    const r = await this.api('/auth/v1/token?grant_type=password', { method: 'POST', auth: false, body: { email, password } });
    await this.afterLogin(r);
  },
  /** Devuelve true si quedó con sesión; false si Supabase pide confirmar el correo */
  async signUp(email, password) {
    const r = await this.api('/auth/v1/signup', { method: 'POST', auth: false, body: { email, password } });
    if (!r?.access_token) return false;
    await this.afterLogin(r);
    return true;
  },
  async afterLogin(r) {
    await this.setSession(r);
    if (this.meta.userId !== r.user.id) this.meta = { ...emptyMeta(), userId: r.user.id };
    await this.saveMeta();
    this.status = 'idle';
    await this.sync();
  },
  async setSession(r) {
    this.session = {
      access_token: r.access_token,
      refresh_token: r.refresh_token,
      expires_at: r.expires_at || Math.floor(Date.now() / 1000) + (r.expires_in || 3600),
      user: { id: r.user.id, email: r.user.email },
    };
    await idbSet('session', this.session);
  },
  async ensureFresh() {
    if (!this.session) throw new Error('Sin sesión');
    if (this.session.expires_at - 60 > Date.now() / 1000) return;
    try {
      const r = await this.api('/auth/v1/token?grant_type=refresh_token', { method: 'POST', auth: false, body: { refresh_token: this.session.refresh_token } });
      await this.setSession(r);
    } catch (e) {
      if (e.status === 400 || e.status === 401) { await this.signOut(true); throw new Error('La sesión expiró, vuelve a iniciar sesión'); }
      throw e;
    }
  },
  async signOut(silent = false) {
    if (!silent && this.session) { try { await this.api('/auth/v1/logout', { method: 'POST' }); } catch {} }
    this.session = null; this.status = 'off';
    await idbSet('session', null).catch(() => {});
    this.notify();
  },

  /* ---------- Sincronización ---------- */
  schedule() {
    if (!this.session) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.sync(), 1500);
  },
  async sync() {
    if (!this.session) return;
    if (!navigator.onLine) { this.status = 'offline'; this.notify(); return; }
    if (this.running) { this.again = true; return; }
    this.running = true; this.status = 'syncing'; this.notify();
    try {
      await this.push();
      const changed = await this.pull();
      this.meta.lastSync = new Date().toISOString();
      await this.saveMeta();
      this.status = 'idle'; this.error = '';
      if (changed && typeof onRemoteChanges === 'function') onRemoteChanges();
    } catch (e) {
      console.warn('Sync', e);
      this.status = navigator.onLine ? 'error' : 'offline';
      this.error = e.message;
    }
    this.running = false;
    this.notify();
    if (this.again) { this.again = false; this.sync(); }
  },

  async upsert(table, conflict, rows) {
    for (let i = 0; i < rows.length; i += CHUNK) {
      await this.api(`/rest/v1/${table}?on_conflict=${conflict}`, {
        method: 'POST', body: rows.slice(i, i + CHUNK),
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      });
    }
  },

  pickSettings() {
    const o = {};
    SYNCED_SETTINGS.forEach((k) => (o[k] = state.settings[k]));
    return JSON.stringify(o);
  },

  /** Sube diferencias entre el estado local y la última copia sincronizada */
  async push() {
    const uid = this.session.user.id;
    const now = Date.now();
    const sh = this.meta.shadow;

    // Hábitos
    const curH = {};
    state.habits.forEach((h) => (curH[h.id] = JSON.stringify(h)));
    const hRows = [];
    for (const id in curH) if (curH[id] !== sh.habits[id]) hRows.push({ user_id: uid, id, data: JSON.parse(curH[id]), deleted: false, updated_at: now });
    for (const id in sh.habits) if (!(id in curH) && sh.habits[id] !== null) hRows.push({ user_id: uid, id, data: {}, deleted: true, updated_at: now });

    // Registros
    const curE = {};
    for (const hid in state.entries) for (const day in state.entries[hid]) curE[hid + '|' + day] = state.entries[hid][day];
    const eRows = [];
    for (const k in curE) if (curE[k] !== sh.entries[k]) { const [hid, day] = k.split('|'); eRows.push({ user_id: uid, habit_id: hid, day, value: curE[k], updated_at: now }); }
    for (const k in sh.entries) if (!(k in curE)) { const [hid, day] = k.split('|'); eRows.push({ user_id: uid, habit_id: hid, day, value: 0, updated_at: now }); }

    // Ajustes
    const curS = this.pickSettings();
    const sChanged = curS !== sh.settings;

    if (hRows.length) await this.upsert('habits', 'user_id,id', hRows);
    if (eRows.length) await this.upsert('entries', 'user_id,habit_id,day', eRows);
    if (sChanged) await this.upsert('settings', 'user_id', [{ user_id: uid, data: JSON.parse(curS), updated_at: now }]);

    // Actualiza la copia sincronizada con lo que se subió
    hRows.forEach((r) => (sh.habits[r.id] = r.deleted ? null : curH[r.id]));
    eRows.forEach((r) => { const k = r.habit_id + '|' + r.day; if (r.value) sh.entries[k] = r.value; else delete sh.entries[k]; });
    if (sChanged) sh.settings = curS;
    if (hRows.length || eRows.length || sChanged) await this.saveMeta();
  },

  async pullTable(table, apply) {
    let n = 0;
    for (;;) {
      const c = this.meta.cursor[table];
      const q = `/rest/v1/${table}?select=*&order=server_at.asc&limit=1000${c ? '&server_at=gt.' + encodeURIComponent(c) : ''}`;
      const rows = await this.api(q);
      rows.forEach(apply);
      n += rows.length;
      if (rows.length) this.meta.cursor[table] = rows[rows.length - 1].server_at;
      if (rows.length < 1000) break;
    }
    return n;
  },

  /** Baja cambios del servidor y los aplica al estado local */
  async pull() {
    const sh = this.meta.shadow;
    let changed = false;

    await this.pullTable('habits', (r) => {
      const idx = state.habits.findIndex((h) => h.id === r.id);
      if (r.deleted) {
        if (idx >= 0) { state.habits.splice(idx, 1); changed = true; }
        if (state.entries[r.id]) { delete state.entries[r.id]; changed = true; }
        sh.habits[r.id] = null;
        return;
      }
      const incoming = JSON.stringify(r.data);
      if (idx >= 0 && JSON.stringify(state.habits[idx]) === incoming) { sh.habits[r.id] = incoming; return; }
      const h = normalizeHabit(r.data);
      if (idx >= 0) state.habits[idx] = h; else state.habits.push(h);
      sh.habits[r.id] = JSON.stringify(h);
      changed = true;
    });

    await this.pullTable('entries', (r) => {
      const k = r.habit_id + '|' + r.day;
      const v = Number(r.value) || 0;
      const cur = state.entries[r.habit_id]?.[r.day] || 0;
      if (v) { sh.entries[k] = v; } else delete sh.entries[k];
      if (cur === v) return;
      state.entries[r.habit_id] ??= {};
      if (v) state.entries[r.habit_id][r.day] = v; else delete state.entries[r.habit_id][r.day];
      changed = true;
    });

    await this.pullTable('settings', (r) => {
      const before = this.pickSettings();
      SYNCED_SETTINGS.forEach((k) => { if (r.data[k] !== undefined) state.settings[k] = r.data[k]; });
      sh.settings = this.pickSettings();
      if (sh.settings !== before) changed = true;
    });

    return changed;
  },
};
