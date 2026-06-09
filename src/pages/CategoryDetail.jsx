import { useParams, Link, Navigate } from 'react-router-dom'
import { useGameStore } from '../store/useGameStore.js'
import { categoryState } from '../store/selectors.js'
import { CATEGORY_MAP } from '../data/categories.js'
import { actionsByCategory, ACTION_MAP } from '../data/actions.js'
import { advancementsByCategory } from '../data/advancements.js'
import { formatNumber, relativeDate } from '../lib/format.js'
import { ProgressBar } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import LogActionButton from '../components/LogActionButton.jsx'

export default function CategoryDetail() {
  const { id } = useParams()
  const s = useGameStore()
  const c = CATEGORY_MAP[id]
  if (!c) return <Navigate to="/categorias" replace />

  const cs = categoryState(s, id)
  const actions = actionsByCategory(id)
  const advs = advancementsByCategory(id)
  const unlockedAdv = advs.filter((a) => s.unlockedAdvancements[a.id]).length

  // Rachas: junta las claves de racha de las acciones de esta categoría.
  const seen = new Set()
  const streaks = []
  for (const a of actions) {
    const key = a.streakKey || a.quantify?.streakKey
    if (!key || seen.has(key)) continue
    seen.add(key)
    const st = s.streaks[key]
    if (st?.best > 0) streaks.push({ key, name: a.name, icon: a.icon, current: st.current, best: st.best })
  }

  const logs = s.log.filter((e) => e.categoryId === id).slice(0, 8)

  return (
    <div className="space-y-6">
      <Link to="/categorias" className="inline-flex items-center gap-1 text-sm text-muted transition hover:text-ink">
        <Icon name="ChevronLeft" size={16} /> Categorías
      </Link>

      {/* Hero */}
      <div className="card card-sheen p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <div
            className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl"
            style={{ background: `color-mix(in srgb, ${c.accent} 16%, transparent)`, color: c.accent }}
          >
            <Icon name={c.icon} size={30} />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-ink">{c.name}</h1>
            <p className="text-sm text-muted">{c.tagline}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-faint">Nivel</p>
            <p className="text-4xl font-extrabold leading-none" style={{ color: c.accent }}>{cs.level}</p>
          </div>
        </div>
        <div className="mt-5">
          <ProgressBar value={cs.progress} color={c.accent} height={10} />
          <div className="mt-1.5 flex items-center justify-between text-xs text-faint">
            <span>{formatNumber(cs.currentXp)}/{formatNumber(cs.neededXp)} XP para nivel {cs.level + 1}</span>
            <span>{formatNumber(cs.xp)} XP total</span>
          </div>
        </div>
      </div>

      {/* Registrar */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-faint">Registrar</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {actions.map((a) => (
            <LogActionButton key={a.id} action={a} />
          ))}
        </div>
      </div>

      {/* Rachas */}
      {streaks.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-faint">Rachas</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {streaks.map((st) => (
              <div key={st.key} className="card flex items-center gap-3 p-4">
                <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${c.accent} 16%, transparent)`, color: c.accent }}>
                  <Icon name="Flame" size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{st.name}</p>
                  <p className="text-xs text-faint">Mejor racha: {st.best} días</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold" style={{ color: c.accent }}>{st.current}</p>
                  <p className="text-[10px] text-faint">actual</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Avances */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-faint">Avances</h2>
          <Link to="/arbol" className="inline-flex items-center gap-1 text-sm font-medium transition hover:opacity-80" style={{ color: c.accent }}>
            Ver árbol <Icon name="ArrowRight" size={15} />
          </Link>
        </div>
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-muted">Progreso del árbol</span>
            <span className="font-semibold text-ink">{unlockedAdv}/{advs.length}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {advs.map((a) => {
              const unlocked = !!s.unlockedAdvancements[a.id]
              return (
                <div
                  key={a.id}
                  title={a.name}
                  className="grid h-10 w-10 place-items-center rounded-xl border"
                  style={
                    unlocked
                      ? { background: `color-mix(in srgb, ${c.accent} 16%, transparent)`, color: c.accent, borderColor: `color-mix(in srgb, ${c.accent} 40%, transparent)` }
                      : { background: 'var(--color-surface-2)', color: 'var(--color-faint)', borderColor: 'var(--color-border)' }
                  }
                >
                  <Icon name={unlocked ? a.icon : 'Lock'} size={18} />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Actividad */}
      {logs.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-faint">Actividad</h2>
          <div className="card divide-y divide-border">
            {logs.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5">
                <Icon name={ACTION_MAP[entry.actionId]?.icon || 'CircleCheck'} size={16} style={{ color: c.accent }} />
                <p className="min-w-0 flex-1 truncate text-sm text-ink">
                  {entry.name}
                  {entry.amount != null && <span className="text-faint"> · {formatNumber(entry.amount, entry.amount % 1 ? 1 : 0)} {entry.unit}</span>}
                </p>
                <span className="text-xs font-semibold" style={{ color: c.accent }}>+{entry.xp}</span>
                <span className="w-16 shrink-0 text-right text-[11px] text-faint">{relativeDate(entry.at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
