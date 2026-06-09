import { useGameStore } from '../store/useGameStore.js'
import { bossProgress } from '../store/engine.js'
import { BOSSES } from '../data/bosses.js'
import { CATEGORY_MAP } from '../data/categories.js'
import { formatNumber, relativeDate } from '../lib/format.js'
import { PageHeader, ProgressBar } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'

function fmt(boss, n) {
  const num = formatNumber(n, boss.decimals ?? 0)
  if (boss.prefix) return `${boss.prefix}${num}`
  if (boss.unit) return `${num} ${boss.unit}`
  return num
}

function BossCard({ boss }) {
  const s = useGameStore()
  const setBossValue = useGameStore((st) => st.setBossValue)
  const accent = CATEGORY_MAP[boss.category]?.accent || 'var(--color-brand)'
  const prog = bossProgress(boss, s)
  const defeated = !!s.bosses[boss.id]?.defeatedAt
  const remaining = Math.max(0, prog.total - prog.value)

  const current = s.bosses[boss.id]?.manualValue ?? boss.from
  const adjustWeight = (dir) =>
    setBossValue(boss.id, Math.max(boss.to - 5, +(current + dir * 0.5).toFixed(1)))

  return (
    <div
      className="card card-sheen overflow-hidden p-5"
      style={defeated ? { borderColor: `color-mix(in srgb, ${accent} 45%, var(--color-border))` } : undefined}
    >
      <div className="flex items-start gap-4">
        <div
          className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl"
          style={{ background: `color-mix(in srgb, ${accent} 16%, transparent)`, color: accent }}
        >
          <Icon name={boss.icon} size={28} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-ink">{boss.name}</h3>
            {defeated && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: `color-mix(in srgb, ${accent} 18%, transparent)`, color: accent }}>
                <Icon name="Swords" size={11} /> Derrotado
              </span>
            )}
          </div>
          <p className="text-sm text-muted">{boss.subtitle}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-extrabold text-ink">{Math.round(prog.pct * 100)}%</p>
          <p className="text-[10px] text-faint">completado</p>
        </div>
      </div>

      <div className="mt-4">
        <ProgressBar value={prog.pct} color={accent} height={12} />
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-muted">
            {boss.track.manual
              ? `${fmt(boss, prog.value)} de ${fmt(boss, prog.total)}`
              : `${fmt(boss, prog.value)} / ${fmt(boss, prog.total)}`}
          </span>
          <span className="text-faint">
            {defeated ? '¡Completado!' : `Faltan ${fmt(boss, remaining)}`}
          </span>
        </div>
      </div>

      {/* Control manual (peso) */}
      {boss.track.manual && !defeated && (
        <div className="mt-4 flex items-center justify-between rounded-xl bg-surface-2 p-3">
          <span className="text-xs text-muted">Tu valor actual</span>
          <div className="flex items-center gap-3">
            <button onClick={() => adjustWeight(1)} className="focus-ring grid h-8 w-8 place-items-center rounded-full bg-surface-3 text-ink active:scale-95">
              <Icon name="Plus" size={16} />
            </button>
            <span className="min-w-[4.5rem] text-center text-lg font-bold tabular-nums text-ink">
              {formatNumber(current, 1)} {boss.unit}
            </span>
            <button onClick={() => adjustWeight(-1)} className="focus-ring grid h-8 w-8 place-items-center rounded-full bg-surface-3 text-ink active:scale-95">
              <Icon name="Minus" size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2.5">
        <Icon name="Gem" size={15} style={{ color: accent }} />
        <span className="text-xs text-muted">Recompensa:</span>
        <span className="text-xs font-semibold text-ink">{boss.reward}</span>
      </div>

      {defeated && (
        <p className="mt-3 text-center text-[11px] text-faint">
          Derrotado {relativeDate(s.bosses[boss.id].defeatedAt)}
        </p>
      )}
    </div>
  )
}

export default function Bosses() {
  return (
    <div className="space-y-6">
      <PageHeader title="Jefes" subtitle="Tus metas grandes. Cada acción relevante reduce su vida." icon="Swords" accent="var(--color-legendary)" />
      <div className="grid gap-4 lg:grid-cols-2">
        {BOSSES.map((boss) => (
          <BossCard key={boss.id} boss={boss} />
        ))}
      </div>
    </div>
  )
}
