// Las categorías guardan su acento como variable CSS (p. ej. 'var(--color-salud)').
// color-mix nos permite generar tintes y mezclas dinámicas sin clases de Tailwind.

export const tint = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, transparent)`

export const onSurface = (color, pct) =>
  `color-mix(in srgb, ${color} ${pct}%, var(--color-surface))`

export const RARITY = {
  common: { label: 'Común', color: 'var(--color-common)' },
  rare: { label: 'Raro', color: 'var(--color-rare)' },
  epic: { label: 'Épico', color: 'var(--color-epic)' },
  legendary: { label: 'Legendario', color: 'var(--color-legendary)' },
}
