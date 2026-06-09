const nf = (decimals) =>
  new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

export function formatNumber(value, decimals = 0) {
  return nf(decimals).format(value ?? 0)
}

// Formatea un valor según la definición de una estadística (prefijo, unidad, decimales).
export function formatStat(value, stat) {
  const decimals = stat?.decimals ?? 0
  const num = formatNumber(value ?? 0, decimals)
  if (stat?.prefix) return `${stat.prefix}${num}`
  if (stat?.unit) return `${num} ${stat.unit}`
  return num
}

export function formatMoney(value) {
  return '$' + formatNumber(value ?? 0, 0)
}

// "hace 3 días", "hoy", etc. — para historial y logros.
export function relativeDate(iso) {
  if (!iso) return ''
  const then = new Date(iso)
  const now = new Date()
  const days = Math.floor((now - then) / 86400000)
  if (days <= 0) {
    const hours = Math.floor((now - then) / 3600000)
    if (hours <= 0) return 'hace un momento'
    if (hours === 1) return 'hace 1 hora'
    return `hace ${hours} horas`
  }
  if (days === 1) return 'ayer'
  if (days < 7) return `hace ${days} días`
  return then.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}
