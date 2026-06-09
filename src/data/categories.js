// Las 5 categorías base. El acento es una variable CSS (ver index.css / colors.js).
export const CATEGORIES = [
  {
    id: 'salud',
    name: 'Salud',
    icon: 'HeartPulse',
    accent: 'var(--color-salud)',
    tagline: 'Cuerpo y energía',
  },
  {
    id: 'conocimiento',
    name: 'Conocimiento',
    icon: 'BookOpen',
    accent: 'var(--color-conocimiento)',
    tagline: 'Mente y aprendizaje',
  },
  {
    id: 'finanzas',
    name: 'Finanzas',
    icon: 'Wallet',
    accent: 'var(--color-finanzas)',
    tagline: 'Dinero y futuro',
  },
  {
    id: 'disciplina',
    name: 'Disciplina',
    icon: 'Target',
    accent: 'var(--color-disciplina)',
    tagline: 'Constancia y hábitos',
  },
  {
    id: 'bienestar',
    name: 'Bienestar',
    icon: 'Sparkles',
    accent: 'var(--color-bienestar)',
    tagline: 'Calma y conexión',
  },
]

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]))
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id)
