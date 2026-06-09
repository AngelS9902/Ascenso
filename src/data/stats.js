// Estadísticas acumulativas de por vida. Se sienten como los contadores de un
// videojuego: solo suben. Algunas se alimentan desde acciones (ver actions.js).
export const STATS = [
  {
    id: 'aguaLitros',
    name: 'Agua consumida',
    short: 'Agua',
    unit: 'L',
    decimals: 1,
    icon: 'Droplet',
    accent: 'var(--color-salud)',
  },
  {
    id: 'minutosLeidos',
    name: 'Minutos leídos',
    short: 'Lectura',
    unit: 'min',
    decimals: 0,
    icon: 'BookOpen',
    accent: 'var(--color-conocimiento)',
  },
  {
    id: 'horasEstudiadas',
    name: 'Horas estudiadas',
    short: 'Estudio',
    unit: 'h',
    decimals: 1,
    icon: 'GraduationCap',
    accent: 'var(--color-conocimiento)',
  },
  {
    id: 'kmCaminados',
    name: 'Kilómetros caminados',
    short: 'Caminata',
    unit: 'km',
    decimals: 1,
    icon: 'Footprints',
    accent: 'var(--color-bienestar)',
  },
  {
    id: 'horasDormidas',
    name: 'Horas dormidas',
    short: 'Sueño',
    unit: 'h',
    decimals: 0,
    icon: 'Moon',
    accent: 'var(--color-salud)',
  },
  {
    id: 'dineroAhorrado',
    name: 'Dinero ahorrado',
    short: 'Ahorro',
    prefix: '$',
    decimals: 0,
    icon: 'PiggyBank',
    accent: 'var(--color-finanzas)',
  },
  {
    id: 'diasActivos',
    name: 'Días activos',
    short: 'Días activos',
    unit: 'días',
    decimals: 0,
    icon: 'CalendarCheck',
    accent: 'var(--color-disciplina)',
  },
]

export const STAT_MAP = Object.fromEntries(STATS.map((s) => [s.id, s]))
