import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useGameStore } from '../store/useGameStore.js'
import { globalState, categoryState, energyNow } from '../store/selectors.js'
import { CATEGORIES, CATEGORY_MAP } from '../data/categories.js'
import { actionsByCategory } from '../data/actions.js'
import { TITLE_MAP } from '../data/titles.js'
import { energyState } from '../lib/energy.js'
import { formatNumber, relativeDate } from '../lib/format.js'
import { Ring, ProgressBar } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import LogActionButton from '../components/LogActionButton.jsx'

function greeting() {
  const h = new Date().getHours()
  if (h < 6) return 'Buenas noches'
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function MiniStat({ icon, value, label, color }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="grid h-9 w-9 place-items-center rounded-xl"
        style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
      >
        <Icon name={icon} size={17} />
      </div>
      <div className="leading-tight">
        <p className="text-base font-bold text-ink">{value}</p>
        <p className="text-[11px] text-faint">{label}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const s = useGameStore()
  const global = globalState(s)
  const energy = energyNow(s)
  const eState = energyState(energy)
  const title = s.profile.equippedTitle ? TITLE_MAP[s.profile.equippedTitle] : null
  const [cat, setCat] = useState(CATEGORIES[0].id)
  const activeCat = CATEGORY_MAP[cat]
  const achievements = Object.keys(s.unlockedAchievements).length

  return (
    <div className="space-y-6">
      {/* Saludo */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{greeting()},</p>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-ink">{s.profile.name}</h1>
            {title && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
                style={{ background: `color-mix(in srgb, ${title.accent} 16%, transparent)`, color: title.accent }}
              >
                <Icon name={title.icon} size={12} /> {title.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hero — hoja de personaje */}
      <div className="card card-sheen p-5 sm:p-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
          <Ring pct={global.progress} size={132} stroke={11} color="var(--color-brand)">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-faint">Nivel</p>
              <p className="text-4xl font-extrabold leading-none text-ink">{global.level}</p>
              <p className="mt-1 text-[10px] text-faint">
                {formatNumber(global.currentXp)}/{formatNumber(global.neededXp)} XP
              </p>
            </div>
          </Ring>

          <div className="w-full flex-1">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="Zap" size={16} style={{ color: eState.tone }} />
                <span className="text-sm font-semibold" style={{ color: eState.tone }}>
                  {eState.label}
                </span>
              </div>
              <span className="text-xs text-faint">Energía {Math.round(energy)}%</span>
            </div>
            <ProgressBar value={energy / 100} color={eState.tone} height={10} />
            <p className="mt-2 text-xs text-muted">
              La energía sube con cada acción y baja despacio si descansas. Tu progreso nunca se pierde.
            </p>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <MiniStat icon="CalendarCheck" value={s.stats.diasActivos || 0} label="Días activos" color="var(--color-disciplina)" />
              <MiniStat icon="Zap" value={formatNumber(s.totalActions || 0)} label="Acciones" color="var(--color-brand-soft)" />
              <MiniStat icon="Award" value={achievements} label="Logros" color="var(--color-legendary)" />
            </div>
          </div>
        </div>
      </div>

      {/* Registro rápido */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-faint">Registro rápido</h2>
        <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1">
          {CATEGORIES.map((c) => {
            const isActive = c.id === cat
            return (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition"
                style={
                  isActive
                    ? { background: `color-mix(in srgb, ${c.accent} 18%, transparent)`, color: c.accent, borderColor: `color-mix(in srgb, ${c.accent} 40%, transparent)` }
                    : { color: 'var(--color-muted)', borderColor: 'var(--color-border)' }
                }
              >
                <Icon name={c.icon} size={16} />
                {c.name}
              </button>
            )
          })}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {actionsByCategory(cat).map((a) => (
            <LogActionButton key={a.id} action={a} />
          ))}
        </div>
        <Link
          to={`/categorias/${cat}`}
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-muted transition hover:text-ink"
          style={{ color: activeCat.accent }}
        >
          Ver {activeCat.name} a detalle <Icon name="ArrowRight" size={15} />
        </Link>
      </div>

      {/* Categorías */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-faint">Tus categorías</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c) => {
            const cs = categoryState(s, c.id)
            return (
              <Link
                key={c.id}
                to={`/categorias/${c.id}`}
                className="card group p-4 transition hover:border-border-strong"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="grid h-10 w-10 place-items-center rounded-xl"
                    style={{ background: `color-mix(in srgb, ${c.accent} 16%, transparent)`, color: c.accent }}
                  >
                    <Icon name={c.icon} size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-ink">{c.name}</p>
                    <p className="text-xs text-faint">Nivel {cs.level}</p>
                  </div>
                  <Icon name="ChevronRight" size={18} className="text-faint transition group-hover:translate-x-0.5" />
                </div>
                <div className="mt-3">
                  <ProgressBar value={cs.progress} color={c.accent} height={7} />
                  <p className="mt-1.5 text-[11px] text-faint">
                    {formatNumber(cs.currentXp)}/{formatNumber(cs.neededXp)} XP
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Accesos + Actividad */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-faint">Explora</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { to: '/jefes', icon: 'Swords', label: 'Jefes', color: 'var(--color-legendary)' },
              { to: '/mazmorras', icon: 'DoorOpen', label: 'Mazmorras', color: 'var(--color-disciplina)' },
              { to: '/estadisticas', icon: 'BarChart3', label: 'Estadísticas', color: 'var(--color-conocimiento)' },
            ].map((q) => (
              <Link key={q.to} to={q.to} className="card flex flex-col items-center gap-2 p-4 text-center transition hover:border-border-strong">
                <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${q.color} 16%, transparent)`, color: q.color }}>
                  <Icon name={q.icon} size={20} />
                </div>
                <span className="text-xs font-semibold text-ink">{q.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-faint">Actividad reciente</h2>
          <div className="card divide-y divide-border">
            {s.log.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-muted">
                Aún no registras nada. Toca una acción arriba para empezar tu ascenso.
              </p>
            )}
            {s.log.slice(0, 6).map((entry) => {
              const c = CATEGORY_MAP[entry.categoryId]
              return (
                <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c?.accent }} />
                  <p className="min-w-0 flex-1 truncate text-sm text-ink">{entry.name}</p>
                  <span className="text-xs font-semibold" style={{ color: c?.accent }}>+{entry.xp}</span>
                  <span className="w-16 shrink-0 text-right text-[11px] text-faint">{relativeDate(entry.at)}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
