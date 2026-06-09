// Jefes: objetivos grandes con barra de "vida". Cada acción relevante reduce la
// vida restante del jefe. El progreso se deriva de una fuente para mantener todo
// consistente:
//   track: { stat: 'id' }     -> progreso = estadística acumulada
//   track: { counter: 'id' }  -> progreso = contador
//   track: { manual: true }   -> el usuario actualiza su valor actual (peso, etc.)
export const BOSSES = [
  {
    id: 'ahorro-applewatch',
    name: 'Apple Watch',
    subtitle: 'Meta de ahorro',
    category: 'finanzas',
    icon: 'Watch',
    track: { stat: 'dineroAhorrado' },
    total: 15000,
    prefix: '$',
    decimals: 0,
    reward: 'Insignia "Inversor" + 300 XP',
    rewardXp: 300,
    rewardCategory: 'finanzas',
  },
  {
    id: 'lectura-anual',
    name: 'Reto de Lectura',
    subtitle: '12 libros este año',
    category: 'conocimiento',
    icon: 'Library',
    track: { counter: 'librosTerminados' },
    total: 12,
    unit: 'libros',
    decimals: 0,
    reward: 'Insignia "Ratón de Biblioteca" + 300 XP',
    rewardXp: 300,
    rewardCategory: 'conocimiento',
  },
  {
    id: 'peso-meta',
    name: 'Meta de Peso',
    subtitle: '92 kg → 80 kg',
    category: 'salud',
    icon: 'Scale',
    track: { manual: true },
    from: 92,
    to: 80,
    unit: 'kg',
    decimals: 1,
    reward: 'Insignia "Transformación" + 400 XP',
    rewardXp: 400,
    rewardCategory: 'salud',
  },
]

export const BOSS_MAP = Object.fromEntries(BOSSES.map((b) => [b.id, b]))
