// Sistema de energía / impulso. NO es una racha destructiva: representa el estado
// ACTUAL de consistencia. Sube con acciones positivas, baja lentamente con la
// inactividad, pero el progreso histórico (XP, logros, estadísticas) jamás baja.

export const ENERGY_MAX = 100
const DECAY_PER_DAY = 8 // puntos que se pierden por cada día de inactividad

export function decayedEnergy(value, lastTickIso, now = new Date()) {
  if (!lastTickIso) return value ?? 50
  const elapsedDays = (now - new Date(lastTickIso)) / 86400000
  if (!Number.isFinite(elapsedDays) || elapsedDays <= 0) return value ?? 50
  return Math.max(0, (value ?? 50) - elapsedDays * DECAY_PER_DAY)
}

export function energyGain(xp) {
  return Math.min(14, Math.max(3, Math.round(xp / 6)))
}

export function energyState(value) {
  if (value >= 80) return { label: 'En racha', tone: 'var(--color-energia)' }
  if (value >= 55) return { label: 'Con impulso', tone: 'var(--color-energia)' }
  if (value >= 30) return { label: 'Estable', tone: 'var(--color-brand-soft)' }
  if (value >= 12) return { label: 'Bajando', tone: 'var(--color-muted)' }
  return { label: 'En reposo', tone: 'var(--color-faint)' }
}
