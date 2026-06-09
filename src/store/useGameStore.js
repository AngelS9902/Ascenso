import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import { ACTION_MAP } from '../data/actions.js'
import { DUNGEON_MAP } from '../data/dungeons.js'
import { CATEGORY_IDS } from '../data/categories.js'
import { levelFromXp } from '../lib/leveling.js'
import { advanceStreak, todayKey } from '../lib/date.js'
import { decayedEnergy, energyGain } from '../lib/energy.js'
import { recompute, BOSS_MAP } from './engine.js'
import { persistStorage, STORAGE_KEY } from './storage.js'

const clamp = (n, min, max) => Math.max(min, Math.min(max, n))
const uid = () => Math.random().toString(36).slice(2, 10)

function emptyCategories() {
  return Object.fromEntries(CATEGORY_IDS.map((id) => [id, { xp: 0 }]))
}

function initialState() {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    lastActiveDate: null,
    profile: { name: 'Aventurero', equippedTitle: null },
    energy: { value: 50, lastTick: new Date().toISOString() },
    categories: emptyCategories(),
    stats: {},
    counters: {},
    streaks: {},
    dailyActions: {},
    unlockedAchievements: {},
    unlockedTitles: {},
    unlockedAdvancements: {},
    bosses: {},
    dungeons: { active: [], completed: {} },
    log: [],
    totalActions: 0,
    // Transitorio (no se persiste): cola de eventos para animaciones/toasts.
    pending: [],
    lastAction: null,
    _seq: 0,
  }
}

// ── Helpers que mutan el draft de immer ──

function pushPending(s, ev) {
  s._seq = (s._seq || 0) + 1
  s.pending.push({ ...ev, key: `${ev.kind}-${s._seq}` })
  if (s.pending.length > 24) s.pending.shift()
}

// Aplica recompute en bucle: los premios de jefe dan XP que puede encadenar más
// desbloqueos. Termina cuando una pasada no produce nada nuevo.
function runRecompute(s, nowIso) {
  for (let pass = 0; pass < 5; pass++) {
    const ev = recompute(s, nowIso)
    ev.achievements.forEach((id) => pushPending(s, { kind: 'achievement', id }))
    ev.titles.forEach((id) => pushPending(s, { kind: 'title', id }))
    ev.advancements.forEach((id) => pushPending(s, { kind: 'advancement', id }))

    let rewardApplied = false
    ev.bosses.forEach((id) => {
      pushPending(s, { kind: 'boss', id })
      const boss = BOSS_MAP[id]
      if (boss?.rewardXp && s.categories[boss.rewardCategory]) {
        s.categories[boss.rewardCategory].xp += boss.rewardXp
        rewardApplied = true
      }
    })

    const any =
      ev.achievements.length ||
      ev.titles.length ||
      ev.advancements.length ||
      ev.bosses.length
    if (!any || !rewardApplied) break
  }
}

function checkDungeons(s, nowIso) {
  const now = new Date()
  const stillActive = []
  for (const d of s.dungeons.active) {
    const def = DUNGEON_MAP[d.id]
    if (!def) continue
    const complete = def.objectives.every(
      (o) => (d.progress[o.actionId] || 0) >= o.target,
    )
    const expired = new Date(d.endsAt) < now
    if (complete) {
      s.dungeons.completed[d.id] = { at: nowIso, success: true }
      if (def.rewardXp && s.categories[def.rewardCategory]) {
        s.categories[def.rewardCategory].xp += def.rewardXp
      }
      pushPending(s, { kind: 'dungeon', id: d.id, success: true })
      runRecompute(s, nowIso)
    } else if (expired) {
      s.dungeons.completed[d.id] = { at: nowIso, success: false }
      pushPending(s, { kind: 'dungeon', id: d.id, success: false })
    } else {
      stillActive.push(d)
    }
  }
  s.dungeons.active = stillActive
}

export const useGameStore = create(
  persist(
    immer((set, get) => ({
      ...initialState(),

      // Registrar una acción → XP, estadísticas, rachas, energía, desbloqueos.
      logAction: (actionId, rawAmount) =>
        set((s) => {
          const action = ACTION_MAP[actionId]
          if (!action) return
          const nowIso = new Date().toISOString()
          const day = todayKey()
          const q = action.quantify

          // 1. Cantidad + XP + estadísticas/contadores
          const amount = q ? Math.max(q.min ?? 0, rawAmount ?? q.default ?? 0) : 1
          let xp
          if (q) {
            xp = (q.xpPerUnit || 0) * amount
            if (q.statId)
              s.stats[q.statId] = (s.stats[q.statId] || 0) + (q.statPerUnit || 0) * amount
            if (q.counterId)
              s.counters[q.counterId] =
                (s.counters[q.counterId] || 0) + (q.counterPerUnit || 0) * amount
          } else {
            xp = action.xp || 0
            if (action.stat)
              s.stats[action.stat.id] = (s.stats[action.stat.id] || 0) + action.stat.amount
            if (action.counter)
              s.counters[action.counter.id] =
                (s.counters[action.counter.id] || 0) + action.counter.amount
          }
          xp = Math.max(0, Math.round(xp))

          // 2. XP de categoría + detección de subida de nivel
          const catId = action.categoryId
          const before = levelFromXp(s.categories[catId].xp).level
          s.categories[catId].xp += xp
          const after = levelFromXp(s.categories[catId].xp).level

          // 3. Rachas (con umbral mínimo opcional para acciones con cantidad)
          const streakKey = q?.streakKey || action.streakKey
          if (streakKey) {
            const meetsMin = q?.streakMin == null || amount >= q.streakMin
            if (meetsMin) s.streaks[streakKey] = advanceStreak(s.streaks[streakKey], day)
          }

          // 4. Día activo
          if (s.lastActiveDate !== day) {
            s.stats.diasActivos = (s.stats.diasActivos || 0) + 1
            s.lastActiveDate = day
          }

          // 5. Conteo diario de la acción
          const da = s.dailyActions[actionId]
          if (!da || da.date !== day) s.dailyActions[actionId] = { date: day, count: 1 }
          else da.count += 1

          // 6. Energía (decaimiento + ganancia)
          s.energy.value = clamp(
            decayedEnergy(s.energy.value, s.energy.lastTick) + energyGain(xp),
            0,
            100,
          )
          s.energy.lastTick = nowIso

          // 7. Total + bitácora
          s.totalActions = (s.totalActions || 0) + 1
          s.log.unshift({
            id: uid(),
            actionId,
            categoryId: catId,
            name: action.name,
            xp,
            amount: q ? amount : null,
            unit: q?.unit || null,
            at: nowIso,
          })
          if (s.log.length > 60) s.log.length = 60

          // 8. Progreso de mazmorras activas
          for (const d of s.dungeons.active) {
            const def = DUNGEON_MAP[d.id]
            if (!def || new Date(d.endsAt) < new Date()) continue
            if (def.objectives.some((o) => o.actionId === actionId))
              d.progress[actionId] = (d.progress[actionId] || 0) + 1
          }

          // 9. Feedback inmediato + subidas de nivel
          s.lastAction = { actionId, categoryId: catId, xp, at: nowIso, seq: (s._seq = (s._seq || 0) + 1) }
          for (let lvl = before + 1; lvl <= after; lvl++)
            pushPending(s, { kind: 'level', categoryId: catId, level: lvl })

          // 10. Desbloqueos + cierre de mazmorras
          runRecompute(s, nowIso)
          checkDungeons(s, nowIso)
        }),

      // Actualiza un jefe manual (p. ej. peso actual).
      setBossValue: (bossId, value) =>
        set((s) => {
          if (!s.bosses[bossId]) s.bosses[bossId] = {}
          s.bosses[bossId].manualValue = value
          runRecompute(s, new Date().toISOString())
        }),

      // Inicia una mazmorra (reto temporal).
      startDungeon: (dungeonId) =>
        set((s) => {
          const def = DUNGEON_MAP[dungeonId]
          if (!def) return
          if (s.dungeons.active.some((d) => d.id === dungeonId)) return
          delete s.dungeons.completed[dungeonId]
          const now = new Date()
          s.dungeons.active.push({
            id: dungeonId,
            startedAt: now.toISOString(),
            endsAt: new Date(now.getTime() + def.durationDays * 86400000).toISOString(),
            progress: {},
          })
        }),

      abandonDungeon: (dungeonId) =>
        set((s) => {
          s.dungeons.active = s.dungeons.active.filter((d) => d.id !== dungeonId)
        }),

      equipTitle: (titleId) =>
        set((s) => {
          if (titleId && !s.unlockedTitles[titleId]) return
          s.profile.equippedTitle = titleId || null
        }),

      setName: (name) =>
        set((s) => {
          s.profile.name = (name || '').trim() || 'Aventurero'
        }),

      // Llamar al montar: aplica decaimiento de energía y cierra mazmorras vencidas.
      tick: () =>
        set((s) => {
          const nowIso = new Date().toISOString()
          s.energy.value = clamp(decayedEnergy(s.energy.value, s.energy.lastTick), 0, 100)
          s.energy.lastTick = nowIso
          checkDungeons(s, nowIso)
        }),

      dismissPending: (key) =>
        set((s) => {
          s.pending = s.pending.filter((p) => p.key !== key)
        }),

      clearPending: () =>
        set((s) => {
          s.pending = []
        }),

      resetAll: () =>
        set((s) => {
          Object.assign(s, initialState())
        }),
    })),
    {
      name: STORAGE_KEY,
      storage: persistStorage,
      version: 1,
      partialize: (s) => ({
        version: s.version,
        createdAt: s.createdAt,
        lastActiveDate: s.lastActiveDate,
        profile: s.profile,
        energy: s.energy,
        categories: s.categories,
        stats: s.stats,
        counters: s.counters,
        streaks: s.streaks,
        dailyActions: s.dailyActions,
        unlockedAchievements: s.unlockedAchievements,
        unlockedTitles: s.unlockedTitles,
        unlockedAdvancements: s.unlockedAdvancements,
        bosses: s.bosses,
        dungeons: s.dungeons,
        log: s.log,
        totalActions: s.totalActions,
      }),
    },
  ),
)
