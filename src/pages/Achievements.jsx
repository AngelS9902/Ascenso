import { useState } from 'react'
import { useGameStore } from '../store/useGameStore.js'
import { ACHIEVEMENTS } from '../data/achievements.js'
import { CATEGORIES, CATEGORY_MAP } from '../data/categories.js'
import { RARITY } from '../lib/colors.js'
import { relativeDate } from '../lib/format.js'
import { PageHeader, RarityTag, ProgressBar } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'

const FILTERS = [{ id: 'all', name: 'Todos', accent: 'var(--color-brand)' }, ...CATEGORIES]

export default function Achievements() {
  const unlocked = useGameStore((s) => s.unlockedAchievements)
  const [filter, setFilter] = useState('all')

  const total = ACHIEVEMENTS.length
  const got = Object.keys(unlocked).length

  const list = ACHIEVEMENTS.filter((a) => filter === 'all' || a.category === filter).sort(
    (a, b) => (unlocked[b.id] ? 1 : 0) - (unlocked[a.id] ? 1 : 0),
  )

  return (
    <div className="space-y-6">
      <PageHeader title="Logros" subtitle="Permanentes. Una vez conseguidos, son tuyos para siempre." icon="Award" accent="var(--color-legendary)" />

      {/* Resumen */}
      <div className="card card-sheen p-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-extrabold text-ink">
              {got}<span className="text-lg text-faint">/{total}</span>
            </p>
            <p className="text-sm text-muted">logros desbloqueados</p>
          </div>
          <div className="flex gap-3">
            {['common', 'rare', 'epic', 'legendary'].map((r) => {
              const n = ACHIEVEMENTS.filter((a) => a.rarity === r && unlocked[a.id]).length
              return (
                <div key={r} className="text-center">
                  <p className="text-lg font-bold" style={{ color: RARITY[r].color }}>{n}</p>
                  <p className="text-[10px] uppercase tracking-wide text-faint">{RARITY[r].label}</p>
                </div>
              )
            })}
          </div>
        </div>
        <div className="mt-4">
          <ProgressBar value={total ? got / total : 0} color="var(--color-legendary)" height={8} />
        </div>
      </div>

      {/* Filtros */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {FILTERS.map((f) => {
          const active = f.id === filter
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition"
              style={
                active
                  ? { background: `color-mix(in srgb, ${f.accent} 18%, transparent)`, color: f.accent, borderColor: `color-mix(in srgb, ${f.accent} 40%, transparent)` }
                  : { color: 'var(--color-muted)', borderColor: 'var(--color-border)' }
              }
            >
              {f.icon && <Icon name={f.icon} size={15} />}
              {f.name}
            </button>
          )
        })}
      </div>

      {/* Lista */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((a) => {
          const u = unlocked[a.id]
          const color = RARITY[a.rarity].color
          return (
            <div
              key={a.id}
              className="card relative overflow-hidden p-4"
              style={u ? { borderColor: `color-mix(in srgb, ${color} 35%, var(--color-border))` } : { opacity: 0.62 }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
                  style={
                    u
                      ? { background: `color-mix(in srgb, ${color} 18%, transparent)`, color }
                      : { background: 'var(--color-surface-2)', color: 'var(--color-faint)' }
                  }
                >
                  <Icon name={u ? a.icon : 'Lock'} size={24} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <RarityTag rarity={a.rarity} />
                    {u && <Icon name="Check" size={15} style={{ color }} />}
                  </div>
                  <p className="mt-0.5 font-semibold text-ink">{a.name}</p>
                  <p className="mt-0.5 text-xs text-muted">{a.description}</p>
                  {u ? (
                    <p className="mt-2 text-[11px] text-faint">Desbloqueado {relativeDate(u.at)}</p>
                  ) : (
                    a.unlocksTitle && (
                      <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-faint">
                        <Icon name="Crown" size={11} /> Otorga un título
                      </p>
                    )
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
