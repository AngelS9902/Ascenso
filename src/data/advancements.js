// Árbol de progreso (estilo avances de Minecraft). Cada nodo se desbloquea
// cuando TODOS sus `requires` están desbloqueados Y se cumple su `condition`.
// `tier` ordena las columnas para el dibujo del árbol.
// El contexto `c` es el mismo que en los logros (c.stat, c.counter, c.streak, c.level).

export const ADVANCEMENTS = [
  // ───────── Salud ─────────
  { id: 's1', categoryId: 'salud', tier: 0, name: 'Primer sorbo', description: 'Registra agua por primera vez.', icon: 'Droplet', requires: [], condition: (c) => c.stat('aguaLitros') > 0 },
  { id: 's2', categoryId: 'salud', tier: 1, name: 'Hidratación · 7 días', description: 'Toma agua 7 días seguidos.', icon: 'Droplets', requires: ['s1'], condition: (c) => c.streak('agua') >= 7 },
  { id: 's3', categoryId: 'salud', tier: 2, name: 'Hidratación · 30 días', description: '30 días consecutivos tomando agua.', icon: 'Waves', requires: ['s2'], condition: (c) => c.streak('agua') >= 30 },
  { id: 's4', categoryId: 'salud', tier: 1, name: 'Cuerpo activo', description: 'Completa 10 sesiones de ejercicio.', icon: 'Dumbbell', requires: ['s1'], condition: (c) => c.counter('sesionesEjercicio') >= 10 },
  { id: 's5', categoryId: 'salud', tier: 2, name: 'Descanso ideal', description: 'Duerme 8h durante una semana.', icon: 'Moon', requires: ['s1'], condition: (c) => c.streak('dormir8') >= 7 },
  { id: 's6', categoryId: 'salud', tier: 3, name: 'Maestro de Hidratación', description: 'Cuerpo y mente en equilibrio total.', icon: 'Trophy', requires: ['s3', 's4'], condition: (c) => c.streak('agua') >= 30 && c.counter('sesionesEjercicio') >= 10 },

  // ───────── Conocimiento ─────────
  { id: 'c1', categoryId: 'conocimiento', tier: 0, name: 'Primeras páginas', description: 'Lee tus primeras páginas.', icon: 'BookOpen', requires: [], condition: (c) => c.counter('paginasLeidas') >= 1 },
  { id: 'c2', categoryId: 'conocimiento', tier: 1, name: 'Primer libro', description: 'Termina un libro.', icon: 'BookCheck', requires: ['c1'], condition: (c) => c.counter('librosTerminados') >= 1 },
  { id: 'c3', categoryId: 'conocimiento', tier: 2, name: '5 libros', description: 'Termina 5 libros.', icon: 'Library', requires: ['c2'], condition: (c) => c.counter('librosTerminados') >= 5 },
  { id: 'c4', categoryId: 'conocimiento', tier: 2, name: '1,000 páginas', description: 'Lee 1,000 páginas.', icon: 'BookMarked', requires: ['c2'], condition: (c) => c.counter('paginasLeidas') >= 1000 },
  { id: 'c5', categoryId: 'conocimiento', tier: 1, name: 'Estudiante', description: 'Acumula 10 horas de estudio.', icon: 'GraduationCap', requires: ['c1'], condition: (c) => c.stat('horasEstudiadas') >= 10 },
  { id: 'c6', categoryId: 'conocimiento', tier: 3, name: 'Biblioteca Personal', description: 'Tu conocimiento es una fortaleza.', icon: 'Trophy', requires: ['c3', 'c4'], condition: (c) => c.counter('librosTerminados') >= 5 && c.counter('paginasLeidas') >= 1000 },

  // ───────── Finanzas ─────────
  { id: 'f1', categoryId: 'finanzas', tier: 0, name: 'Primer ahorro', description: 'Aparta dinero por primera vez.', icon: 'PiggyBank', requires: [], condition: (c) => c.stat('dineroAhorrado') > 0 },
  { id: 'f2', categoryId: 'finanzas', tier: 1, name: '$1,000', description: 'Ahorra $1,000.', icon: 'Coins', requires: ['f1'], condition: (c) => c.stat('dineroAhorrado') >= 1000 },
  { id: 'f3', categoryId: 'finanzas', tier: 2, name: '$10,000', description: 'Ahorra $10,000.', icon: 'Banknote', requires: ['f2'], condition: (c) => c.stat('dineroAhorrado') >= 10000 },
  { id: 'f4', categoryId: 'finanzas', tier: 1, name: 'Cuentas claras', description: 'Registra 30 gastos.', icon: 'Receipt', requires: ['f1'], condition: (c) => c.counter('gastosRegistrados') >= 30 },
  { id: 'f5', categoryId: 'finanzas', tier: 1, name: 'Mentalidad firme', description: 'Evita 10 compras impulsivas.', icon: 'HandCoins', requires: ['f1'], condition: (c) => c.counter('comprasEvitadas') >= 10 },
  { id: 'f6', categoryId: 'finanzas', tier: 3, name: 'Libertad en construcción', description: 'Tus finanzas trabajan para ti.', icon: 'Trophy', requires: ['f3', 'f5'], condition: (c) => c.stat('dineroAhorrado') >= 10000 && c.counter('comprasEvitadas') >= 10 },

  // ───────── Disciplina ─────────
  { id: 'd1', categoryId: 'disciplina', tier: 0, name: 'Primer hábito', description: 'Cumple un hábito.', icon: 'CircleCheck', requires: [], condition: (c) => c.streak('habito') >= 1 },
  { id: 'd2', categoryId: 'disciplina', tier: 1, name: 'Semana constante', description: 'Hábito 7 días seguidos.', icon: 'CalendarCheck', requires: ['d1'], condition: (c) => c.streak('habito') >= 7 },
  { id: 'd3', categoryId: 'disciplina', tier: 2, name: 'Mes de hierro', description: 'Hábito 30 días seguidos.', icon: 'ShieldCheck', requires: ['d2'], condition: (c) => c.streak('habito') >= 30 },
  { id: 'd4', categoryId: 'disciplina', tier: 1, name: 'Madrugador', description: 'Despierta temprano 10 días.', icon: 'Sunrise', requires: ['d1'], condition: (c) => c.streak('temprano') >= 10 },
  { id: 'd5', categoryId: 'disciplina', tier: 1, name: 'Enfoque profundo', description: 'Acumula 600 minutos de enfoque.', icon: 'Timer', requires: ['d1'], condition: (c) => c.counter('minutosFoco') >= 600 },
  { id: 'd6', categoryId: 'disciplina', tier: 3, name: 'Maestro de la Rutina', description: 'La constancia es tu naturaleza.', icon: 'Trophy', requires: ['d3', 'd4'], condition: (c) => c.streak('habito') >= 30 && c.streak('temprano') >= 10 },

  // ───────── Bienestar ─────────
  { id: 'b1', categoryId: 'bienestar', tier: 0, name: 'Primeros pasos', description: 'Sal a caminar.', icon: 'Footprints', requires: [], condition: (c) => c.stat('kmCaminados') > 0 },
  { id: 'b2', categoryId: 'bienestar', tier: 1, name: 'Caminante · 50 km', description: 'Camina 50 km.', icon: 'Map', requires: ['b1'], condition: (c) => c.stat('kmCaminados') >= 50 },
  { id: 'b3', categoryId: 'bienestar', tier: 2, name: 'Explorador · 250 km', description: 'Camina 250 km.', icon: 'Mountain', requires: ['b2'], condition: (c) => c.stat('kmCaminados') >= 250 },
  { id: 'b4', categoryId: 'bienestar', tier: 1, name: 'Mente serena', description: 'Medita 7 días seguidos.', icon: 'Wind', requires: ['b1'], condition: (c) => c.streak('meditar') >= 7 },
  { id: 'b5', categoryId: 'bienestar', tier: 1, name: 'Conexión', description: 'Tiempo de calidad 10 días.', icon: 'Users', requires: ['b1'], condition: (c) => c.streak('social') >= 10 },
  { id: 'b6', categoryId: 'bienestar', tier: 3, name: 'Equilibrio', description: 'Cuerpo, mente y vínculos en armonía.', icon: 'Trophy', requires: ['b3', 'b4'], condition: (c) => c.stat('kmCaminados') >= 250 && c.counter('minutosMeditacion') >= 300 },
]

export const ADVANCEMENT_MAP = Object.fromEntries(ADVANCEMENTS.map((a) => [a.id, a]))

export function advancementsByCategory(categoryId) {
  return ADVANCEMENTS.filter((a) => a.categoryId === categoryId)
}
