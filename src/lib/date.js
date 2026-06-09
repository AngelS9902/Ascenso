// Helpers de fecha en hora local (clave YYYY-MM-DD) para rachas y conteos diarios.

export function todayKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function daysBetween(aKey, bKey) {
  if (!aKey || !bKey) return Infinity
  const a = new Date(aKey + 'T00:00:00')
  const b = new Date(bKey + 'T00:00:00')
  return Math.round((b - a) / 86400000)
}

// Actualiza una racha de días consecutivos dada la última fecha registrada.
// Devuelve el nuevo estado { current, best, lastDate }.
export function advanceStreak(streak, dayKey = todayKey()) {
  const prev = streak || { current: 0, best: 0, lastDate: null }
  if (prev.lastDate === dayKey) return prev // ya contó hoy
  const gap = daysBetween(prev.lastDate, dayKey)
  const current = gap === 1 ? prev.current + 1 : 1
  return {
    current,
    best: Math.max(prev.best || 0, current),
    lastDate: dayKey,
  }
}
