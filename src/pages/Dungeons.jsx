import { useGameStore } from '../store/useGameStore.js'
import { DUNGEONS, DUNGEON_MAP } from '../data/dungeons.js'
import { PageHeader, ProgressBar } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'

function timeLeft(endsAt) {
  const ms = new Date(endsAt) - new Date()
  if (ms <= 0) return 'Expirada'
  const d = Math.floor(ms / 86400000)
  const h = Math.floor((ms % 86400000) / 3600000)
  if (d > 0) return `Quedan ${d}d ${h}h`
  if (h > 0) return `Quedan ${h}h`
  return 'Menos de 1h'
}

function ActiveDungeon({ active }) {
  const def = DUNGEON_MAP[active.id]
  const abandon = useGameStore((s) => s.abandonDungeon)
  const total = def.objectives.length
  const done = def.objectives.filter((o) => (active.progress[o.actionId] || 0) >= o.target).length

  return (
    <div className="card card-sheen p-5" style={{ borderColor: `color-mix(in srgb, ${def.accent} 35%, var(--color-border))` }}>
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ background: `color-mix(in srgb, ${def.accent} 16%, transparent)`, color: def.accent }}>
          <Icon name={def.icon} size={24} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-ink">{def.name}</h3>
            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: `color-mix(in srgb, ${def.accent} 18%, transparent)`, color: def.accent }}>
              Activa
            </span>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-faint">
            <Icon name="Clock" size={12} /> {timeLeft(active.endsAt)} · {done}/{total} objetivos
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {def.objectives.map((o) => {
          const cur = Math.min(active.progress[o.actionId] || 0, o.target)
          const complete = cur >= o.target
          return (
            <div key={o.actionId}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className={`flex items-center gap-1.5 ${complete ? 'text-ink' : 'text-muted'}`}>
                  {complete && <Icon name="Check" size={12} style={{ color: def.accent }} />}
                  {o.label}
                </span>
                <span className="tabular-nums text-faint">{cur}/{o.target}</span>
              </div>
              <ProgressBar value={cur / o.target} color={def.accent} height={6} />
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5">
        <span className="flex items-center gap-2 text-xs text-muted">
          <Icon name="Gem" size={14} style={{ color: def.accent }} /> {def.rewardBadge} · +{def.rewardXp} XP
        </span>
        <button onClick={() => abandon(active.id)} className="text-xs font-medium text-faint transition hover:text-ink">
          Abandonar
        </button>
      </div>
    </div>
  )
}

function AvailableDungeon({ def, completed }) {
  const start = useGameStore((s) => s.startDungeon)
  return (
    <div className="card p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ background: `color-mix(in srgb, ${def.accent} 16%, transparent)`, color: def.accent }}>
          <Icon name={def.icon} size={24} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-ink">{def.name}</h3>
            {completed?.success && <Icon name="Trophy" size={15} style={{ color: def.accent }} />}
          </div>
          <p className="text-xs text-muted">{def.description}</p>
        </div>
        <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-faint">
          {def.durationDays} días
        </span>
      </div>

      <ul className="mt-3 space-y-1">
        {def.objectives.map((o) => (
          <li key={o.actionId} className="flex items-center gap-2 text-xs text-muted">
            <span className="h-1 w-1 rounded-full" style={{ background: def.accent }} />
            {o.label} · {o.target}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-faint">
          <Icon name="Gem" size={13} style={{ color: def.accent }} /> {def.rewardBadge} · +{def.rewardXp} XP
        </span>
        <button
          onClick={() => start(def.id)}
          className="focus-ring rounded-lg px-4 py-2 text-sm font-semibold text-white transition active:scale-[0.98]"
          style={{ background: def.accent }}
        >
          {completed ? 'Reintentar' : 'Iniciar'}
        </button>
      </div>
    </div>
  )
}

export default function Dungeons() {
  const active = useGameStore((s) => s.dungeons.active)
  const completed = useGameStore((s) => s.dungeons.completed)
  const activeIds = new Set(active.map((a) => a.id))
  const available = DUNGEONS.filter((d) => !activeIds.has(d.id))

  return (
    <div className="space-y-6">
      <PageHeader title="Mazmorras" subtitle="Retos temporales con recompensas exclusivas." icon="DoorOpen" accent="var(--color-disciplina)" />

      {active.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-faint">En curso</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {active.map((a) => (
              <ActiveDungeon key={a.id} active={a} />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-faint">Disponibles</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {available.map((d) => (
            <AvailableDungeon key={d.id} def={d} completed={completed[d.id]} />
          ))}
          {available.length === 0 && (
            <p className="card px-6 py-8 text-center text-sm text-muted">
              Todas las mazmorras están activas. ¡A completarlas!
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
