import { RARITY } from '../lib/colors.js'
import Icon from './Icon.jsx'

// Barra de progreso con relleno animado y brillo del color del acento.
export function ProgressBar({ value = 0, color = 'var(--color-brand)', height = 8, className = '' }) {
  const pct = Math.max(0, Math.min(100, value * 100))
  return (
    <div
      className={`w-full overflow-hidden rounded-full bg-surface-2 ${className}`}
      style={{ height }}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{
          width: `${pct}%`,
          background: color,
          boxShadow: pct > 2 ? `0 0 10px ${color}` : 'none',
        }}
      />
    </div>
  )
}

// Anillo de progreso circular (SVG) para nivel global / energía.
export function Ring({
  pct = 0,
  size = 120,
  stroke = 10,
  color = 'var(--color-brand)',
  track = 'var(--color-surface-2)',
  children,
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.max(0, Math.min(1, pct)))
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  )
}

export function RarityTag({ rarity, className = '' }) {
  const r = RARITY[rarity] || RARITY.common
  return (
    <span
      className={`text-[11px] font-bold uppercase tracking-wider ${className}`}
      style={{ color: r.color }}
    >
      {r.label}
    </span>
  )
}

export function PageHeader({ title, subtitle, icon, accent = 'var(--color-brand)' }) {
  return (
    <div className="flex items-center gap-3.5">
      {icon && (
        <div
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
          style={{ background: `color-mix(in srgb, ${accent} 16%, transparent)`, color: accent }}
        >
          <Icon name={icon} size={22} />
        </div>
      )}
      <div>
        <h1 className="text-xl font-bold leading-tight text-ink sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
    </div>
  )
}

export function SectionTitle({ children, action }) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-faint">{children}</h2>
      {action}
    </div>
  )
}

export function Pill({ children, color = 'var(--color-muted)', icon }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
    >
      {icon && <Icon name={icon} size={13} />}
      {children}
    </span>
  )
}

export function EmptyState({ icon = 'Sparkles', title, hint }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-faint">
        <Icon name={icon} size={24} />
      </div>
      <div>
        <p className="font-semibold text-ink">{title}</p>
        {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      </div>
    </div>
  )
}
