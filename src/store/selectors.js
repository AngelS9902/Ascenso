// Selectores derivados puros. Reciben el estado del store y calculan vistas.
import { CATEGORY_IDS } from '../data/categories.js'
import { levelFromXp, globalLevelFromXp } from '../lib/leveling.js'
import { decayedEnergy } from '../lib/energy.js'

export function categoryState(state, id) {
  const xp = state.categories[id]?.xp || 0
  return { id, xp, ...levelFromXp(xp) }
}

export function globalState(state) {
  const totalXp = CATEGORY_IDS.reduce((sum, id) => sum + (state.categories[id]?.xp || 0), 0)
  return { totalXp, ...globalLevelFromXp(totalXp) }
}

export function energyNow(state) {
  return decayedEnergy(state.energy.value, state.energy.lastTick)
}

export function countUnlocked(map) {
  return Object.keys(map || {}).length
}
