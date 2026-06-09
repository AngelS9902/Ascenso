import { useGameStore } from '../store/useGameStore.js'
import { globalState } from '../store/selectors.js'
import { STATS } from '../data/stats.js'
import { ACTIONS } from '../data/actions.js'
import { ACHIEVEMENTS } from '../data/achievements.js'
import { formatStat, formatNumber } from '../lib/format.js'
import { PageHeader } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'

// Nombre legible para cada clave de racha (a partir de las acciones).
const STREAK_NAME = {}
for (const a of ACTIONS) {
  const key = a.streakKey || a.quantify?.streakKey
  if (key && !STREAK_NAME[key]) STREAK_NAME[key] = a.name
}

export default function Stats() {
  const s = useGameStore()
  const global = globalState(s)

  const records = Object.entries(s.streaks)
    .filter(([, v]) => v?.best > 0)
    .sort((a, b) => b[1].best - a[1].best)

  const summary = [
    { icon: 'Zap', label: 'XP total', value: formatNumber(global.totalXp), color: 'var(--color-brand-soft)' },
    { icon: 'TrendingUp', label: 'Nivel global', value: global.level, color: 'var(--color-brand)' },
    { icon: 'Sparkles', label: 'Acciones', value: formatNumber(s.totalActions || 0), color: 'var(--color-conocimiento)' },
    { icon: 'Award', label: 'Logros', value: `${Object.keys(s.unlockedAchievements).length}/${ACHIEVEMENTS.length}`, color: 'var(--color-legendary)' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Estadísticas" subtitle="Tus contadores de por vida. Solo suben." icon="BarChart3" accent="var(--color-conocimiento)" />

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summary.map((m) => (
          <div key={m.label} className="card p-4">
            <Icon name={m.icon} size={18} style={{ color: m.color }} />
            <p className="mt-2 text-2xl font-extrabold text-ink">{m.value}</p>
            <p className="text-xs text-faint">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Estadísticas acumulativas */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-faint">Acumulado de por vida</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STATS.map((stat) => (
            <div key={stat.id} className="card flex items-center gap-4 p-5">
              <div
                className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
                style={{ background: `color-mix(in srgb, ${stat.accent} 16%, transparent)`, color: stat.accent }}
              >
                <Icon name={stat.icon} size={24} />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-extrabold tabular-nums text-ink">
                  {formatStat(s.stats[stat.id] || 0, stat)}
                </p>
                <p className="truncate text-xs text-faint">{stat.name}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rachas récord */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-faint">Rachas récord</h2>
        {records.length === 0 ? (
          <div className="card px-6 py-8 text-center text-sm text-muted">
            Aún no hay rachas. La constancia construye tus récords.
          </div>
        ) : (
          <div className="card divide-y divide-border">
            {records.map(([key, v]) => (
              <div key={key} className="flex items-center gap-3 px-4 py-3">
                <Icon name="Flame" size={18} className="text-[color:var(--color-energia)]" />
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                  {STREAK_NAME[key] || key}
                </p>
                <span className="text-xs text-faint">actual {v.current}</span>
                <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-bold text-ink">
                  récord {v.best}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
