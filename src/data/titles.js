// Títulos equipables. Se desbloquean mediante logros (ver `unlocksTitle`).
// El usuario equipa uno en su perfil.
export const TITLES = [
  { id: 'lector-novato', name: 'Lector Novato', icon: 'BookOpen', accent: 'var(--color-conocimiento)' },
  { id: 'explorador-del-conocimiento', name: 'Explorador del Conocimiento', icon: 'Brain', accent: 'var(--color-conocimiento)' },
  { id: 'ahorrador', name: 'Ahorrador', icon: 'PiggyBank', accent: 'var(--color-finanzas)' },
  { id: 'maestro-de-la-rutina', name: 'Maestro de la Rutina', icon: 'Repeat', accent: 'var(--color-disciplina)' },
  { id: 'el-constante', name: 'El Constante', icon: 'Flame', accent: 'var(--color-disciplina)' },
  { id: 'el-disciplinado', name: 'El Disciplinado', icon: 'ShieldCheck', accent: 'var(--color-disciplina)' },
  { id: 'el-descansado', name: 'El Descansado', icon: 'Moon', accent: 'var(--color-salud)' },
  { id: 'maestro-hidratacion', name: 'Maestro de Hidratación', icon: 'Droplets', accent: 'var(--color-salud)' },
  { id: 'el-sereno', name: 'El Sereno', icon: 'Wind', accent: 'var(--color-bienestar)' },
  { id: 'el-imparable', name: 'El Imparable', icon: 'TrendingUp', accent: 'var(--color-brand)' },
  { id: 'leyenda-viva', name: 'Leyenda Viva', icon: 'Crown', accent: 'var(--color-legendary)' },
]

export const TITLE_MAP = Object.fromEntries(TITLES.map((t) => [t.id, t]))
