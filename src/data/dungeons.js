// Mazmorras: retos temporales con duración limitada. El usuario las inicia; los
// objetivos cuentan acciones registradas mientras la mazmorra está activa.
// Si se completan todos los objetivos antes de la fecha límite, se reclama la recompensa.
export const DUNGEONS = [
  {
    id: 'semana-saludable',
    name: 'Semana Saludable',
    description: 'Siete días para reconstruir tu base física.',
    icon: 'HeartPulse',
    accent: 'var(--color-salud)',
    durationDays: 7,
    objectives: [
      { actionId: 'agua', label: 'Tomar agua', target: 14 },
      { actionId: 'dormir', label: 'Registrar buen sueño', target: 5 },
      { actionId: 'ejercicio', label: 'Hacer ejercicio', target: 4 },
      { actionId: 'comida-sana', label: 'Comer saludable', target: 5 },
    ],
    rewardXp: 250,
    rewardCategory: 'salud',
    rewardBadge: 'Bienestar Total',
  },
  {
    id: 'maraton-lectura',
    name: 'Maratón de Lectura',
    description: 'Una semana para reencender el hábito de leer.',
    icon: 'BookOpen',
    accent: 'var(--color-conocimiento)',
    durationDays: 7,
    objectives: [
      { actionId: 'leer', label: 'Sesiones de lectura', target: 7 },
      { actionId: 'paginas', label: 'Registrar páginas', target: 5 },
      { actionId: 'estudiar', label: 'Sesiones de estudio', target: 3 },
    ],
    rewardXp: 250,
    rewardCategory: 'conocimiento',
    rewardBadge: 'Devorador de Libros',
  },
  {
    id: 'reto-ahorro',
    name: 'Reto de Ahorro',
    description: 'Dos semanas para fortalecer tu disciplina financiera.',
    icon: 'PiggyBank',
    accent: 'var(--color-finanzas)',
    durationDays: 14,
    objectives: [
      { actionId: 'ahorro', label: 'Registrar ahorro', target: 10 },
      { actionId: 'no-impulsivo', label: 'Evitar compras impulsivas', target: 5 },
      { actionId: 'gasto', label: 'Registrar gastos', target: 7 },
    ],
    rewardXp: 350,
    rewardCategory: 'finanzas',
    rewardBadge: 'Mente de Inversor',
  },
]

export const DUNGEON_MAP = Object.fromEntries(DUNGEONS.map((d) => [d.id, d]))
