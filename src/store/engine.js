// Motor de evaluación (puro). Recibe el estado (o un draft de immer) y desbloquea
// logros, avances del árbol y jefes derivando todo desde estadísticas/contadores.

import { ACHIEVEMENTS } from '../data/achievements.js'
import { ADVANCEMENTS } from '../data/advancements.js'
import { BOSSES, BOSS_MAP } from '../data/bosses.js'
import { CATEGORY_IDS } from '../data/categories.js'
import { levelFromXp, globalLevelFromXp } from '../lib/leveling.js'

const clamp01 = (n) => Math.max(0, Math.min(1, n))

// Contexto con helpers que leen el estado. Lo usan las condiciones de logros/avances.
export function buildContext(state) {
  const categoryLevels = {}
  let totalXp = 0
  for (const id of CATEGORY_IDS) {
    const xp = state.categories[id]?.xp || 0
    totalXp += xp
    categoryLevels[id] = levelFromXp(xp).level
  }
  return {
    stat: (id) => state.stats[id] || 0,
    counter: (id) => state.counters[id] || 0,
    streak: (key) => state.streaks[key]?.best || 0,
    streakCurrent: (key) => state.streaks[key]?.current || 0,
    level: (id) => categoryLevels[id] || 1,
    globalLevel: globalLevelFromXp(totalXp).level,
    actionsLogged: state.totalActions || 0,
  }
}

// Progreso de un jefe según su fuente (stat, counter o manual).
export function bossProgress(boss, state) {
  if (boss.track.manual) {
    const current = state.bosses?.[boss.id]?.manualValue ?? boss.from
    const total = boss.from - boss.to
    const value = boss.from - current
    return { value, current, total, pct: clamp01(total === 0 ? 0 : value / total) }
  }
  const source = boss.track.stat
    ? state.stats[boss.track.stat] || 0
    : state.counters[boss.track.counter] || 0
  return {
    value: Math.min(source, boss.total),
    raw: source,
    total: boss.total,
    pct: clamp01(boss.total === 0 ? 0 : source / boss.total),
  }
}

export function isBossDefeated(boss, state) {
  return bossProgress(boss, state).pct >= 1
}

// Recalcula desbloqueos y MUTA el draft. Devuelve los eventos nuevos para la UI.
export function recompute(draft, nowIso) {
  const events = { achievements: [], titles: [], advancements: [], bosses: [] }
  const ctx = buildContext(draft)

  // Logros
  for (const a of ACHIEVEMENTS) {
    if (draft.unlockedAchievements[a.id]) continue
    if (a.condition(ctx)) {
      draft.unlockedAchievements[a.id] = { at: nowIso }
      events.achievements.push(a.id)
      if (a.unlocksTitle && !draft.unlockedTitles[a.unlocksTitle]) {
        draft.unlockedTitles[a.unlocksTitle] = { at: nowIso, from: a.id }
        events.titles.push(a.unlocksTitle)
      }
    }
  }

  // Avances del árbol: requieren prerrequisitos desbloqueados + condición.
  // Iteramos hasta estabilizar (un nodo puede habilitar a otro en la misma pasada).
  let changed = true
  while (changed) {
    changed = false
    for (const adv of ADVANCEMENTS) {
      if (draft.unlockedAdvancements[adv.id]) continue
      const reqsMet = adv.requires.every((r) => draft.unlockedAdvancements[r])
      if (reqsMet && adv.condition(ctx)) {
        draft.unlockedAdvancements[adv.id] = { at: nowIso }
        events.advancements.push(adv.id)
        changed = true
      }
    }
  }

  // Jefes
  for (const boss of BOSSES) {
    if (draft.bosses[boss.id]?.defeatedAt) continue
    if (isBossDefeated(boss, draft)) {
      draft.bosses[boss.id] = { ...(draft.bosses[boss.id] || {}), defeatedAt: nowIso }
      events.bosses.push(boss.id)
    }
  }

  return events
}

export { BOSS_MAP }
