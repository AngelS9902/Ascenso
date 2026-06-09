// Curvas de experiencia. Inspiradas en RPGs: cada nivel cuesta un poco más.
// Filosofía del producto: el progreso histórico NUNCA baja, solo sube.

const CATEGORY_BASE = 60
const CATEGORY_EXP = 1.35
const GLOBAL_BASE = 280
const GLOBAL_EXP = 1.32

// XP necesaria para pasar DEL nivel `level` al siguiente.
export function xpForNext(level, base = CATEGORY_BASE, exp = CATEGORY_EXP) {
  return Math.round(base * Math.pow(level, exp))
}

// Dada la XP total acumulada, deriva nivel + progreso hacia el siguiente.
export function levelFromXp(totalXp, base = CATEGORY_BASE, exp = CATEGORY_EXP) {
  let level = 1
  let remaining = Math.max(0, Math.floor(totalXp || 0))
  let needed = xpForNext(level, base, exp)
  while (remaining >= needed) {
    remaining -= needed
    level += 1
    needed = xpForNext(level, base, exp)
  }
  return {
    level,
    currentXp: remaining,
    neededXp: needed,
    progress: needed > 0 ? remaining / needed : 0,
  }
}

// El nivel global usa una curva más amplia: refleja el avance de toda la vida.
export function globalLevelFromXp(totalXp) {
  return levelFromXp(totalXp, GLOBAL_BASE, GLOBAL_EXP)
}
