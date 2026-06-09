import { useState } from 'react'
import { useGameStore } from '../store/useGameStore.js'
import { globalState } from '../store/selectors.js'
import { TITLES, TITLE_MAP } from '../data/titles.js'
import { ACHIEVEMENTS } from '../data/achievements.js'
import { ADVANCEMENTS } from '../data/advancements.js'
import { formatNumber } from '../lib/format.js'
import { PageHeader, ProgressBar } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'

// Qué logro desbloquea cada título (para mostrar la pista en los bloqueados).
const TITLE_SOURCE = {}
for (const a of ACHIEVEMENTS) if (a.unlocksTitle) TITLE_SOURCE[a.unlocksTitle] = a.name

export default function Profile() {
  const s = useGameStore()
  const setName = useGameStore((st) => st.setName)
  const equipTitle = useGameStore((st) => st.equipTitle)
  const resetAll = useGameStore((st) => st.resetAll)
  const global = globalState(s)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(s.profile.name)

  const equipped = s.profile.equippedTitle ? TITLE_MAP[s.profile.equippedTitle] : null
  const unlockedTitleCount = Object.keys(s.unlockedTitles).length
  const advUnlocked = ADVANCEMENTS.filter((a) => s.unlockedAdvancements[a.id]).length

  const saveName = () => {
    setName(draft)
    setEditing(false)
  }

  const confirmReset = () => {
    if (window.confirm('¿Reiniciar todo tu progreso? Esta acción no se puede deshacer.')) {
      resetAll()
    }
  }

  const summary = [
    { icon: 'Zap', label: 'XP total', value: formatNumber(global.totalXp) },
    { icon: 'CalendarCheck', label: 'Días activos', value: s.stats.diasActivos || 0 },
    { icon: 'Award', label: 'Logros', value: `${Object.keys(s.unlockedAchievements).length}/${ACHIEVEMENTS.length}` },
    { icon: 'GitBranch', label: 'Avances', value: `${advUnlocked}/${ADVANCEMENTS.length}` },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Perfil" subtitle="Tu hoja de personaje." icon="User" />

      {/* Tarjeta de personaje */}
      <div className="card card-sheen p-6">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-brand/15 text-2xl font-extrabold text-brand-soft">
            {(s.profile.name || 'A').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveName()}
                  autoFocus
                  maxLength={24}
                  className="focus-ring w-full rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-lg font-bold text-ink"
                />
                <button onClick={saveName} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand text-white">
                  <Icon name="Check" size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="truncate text-xl font-bold text-ink">{s.profile.name}</h2>
                <button onClick={() => { setDraft(s.profile.name); setEditing(true) }} className="text-faint transition hover:text-ink">
                  <Icon name="Pencil" size={15} />
                </button>
              </div>
            )}
            {equipped ? (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: `color-mix(in srgb, ${equipped.accent} 16%, transparent)`, color: equipped.accent }}>
                <Icon name={equipped.icon} size={12} /> {equipped.name}
              </span>
            ) : (
              <p className="mt-1 text-xs text-faint">Sin título equipado</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-faint">Nivel global</p>
            <p className="text-3xl font-extrabold leading-none text-brand-soft">{global.level}</p>
          </div>
        </div>
        <div className="mt-5">
          <ProgressBar value={global.progress} color="var(--color-brand)" height={9} />
          <p className="mt-1.5 text-xs text-faint">
            {formatNumber(global.currentXp)}/{formatNumber(global.neededXp)} XP para nivel {global.level + 1}
          </p>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summary.map((m) => (
          <div key={m.label} className="card p-4">
            <Icon name={m.icon} size={17} className="text-brand-soft" />
            <p className="mt-2 text-xl font-extrabold text-ink">{m.value}</p>
            <p className="text-xs text-faint">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Títulos */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-faint">Títulos</h2>
          <span className="text-xs text-faint">{unlockedTitleCount}/{TITLES.length}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TITLES.map((t) => {
            const owned = !!s.unlockedTitles[t.id]
            const isEquipped = s.profile.equippedTitle === t.id
            return (
              <button
                key={t.id}
                disabled={!owned}
                onClick={() => equipTitle(isEquipped ? null : t.id)}
                className="card flex items-center gap-3 p-4 text-left transition disabled:cursor-not-allowed"
                style={
                  isEquipped
                    ? { borderColor: t.accent }
                    : owned
                      ? undefined
                      : { opacity: 0.55 }
                }
              >
                <div
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
                  style={owned ? { background: `color-mix(in srgb, ${t.accent} 16%, transparent)`, color: t.accent } : { background: 'var(--color-surface-2)', color: 'var(--color-faint)' }}
                >
                  <Icon name={owned ? t.icon : 'Lock'} size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{t.name}</p>
                  {owned ? (
                    <p className="text-xs" style={{ color: isEquipped ? t.accent : 'var(--color-faint)' }}>
                      {isEquipped ? 'Equipado · toca para quitar' : 'Toca para equipar'}
                    </p>
                  ) : (
                    <p className="truncate text-xs text-faint">Logro: {TITLE_SOURCE[t.id] || '—'}</p>
                  )}
                </div>
                {isEquipped && <Icon name="Check" size={16} style={{ color: t.accent }} />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Ajustes */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-faint">Ajustes</h2>
        <div className="card divide-y divide-border">
          <div className="flex items-center justify-between px-4 py-3.5">
            <div>
              <p className="text-sm font-medium text-ink">Datos guardados localmente</p>
              <p className="text-xs text-faint">Tu progreso vive en este navegador. Pronto: sincronización en la nube.</p>
            </div>
            <Icon name="Info" size={18} className="text-faint" />
          </div>
          <button onClick={confirmReset} className="flex w-full items-center justify-between px-4 py-3.5 text-left transition hover:bg-surface-2">
            <div>
              <p className="text-sm font-medium text-[color:var(--color-bienestar)]">Reiniciar progreso</p>
              <p className="text-xs text-faint">Borra todo y empieza de cero.</p>
            </div>
            <Icon name="RotateCcw" size={18} className="text-[color:var(--color-bienestar)]" />
          </button>
        </div>
      </div>
    </div>
  )
}
