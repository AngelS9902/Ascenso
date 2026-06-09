import { Link } from 'react-router-dom'
import { useGameStore } from '../store/useGameStore.js'
import { categoryState, globalState } from '../store/selectors.js'
import { CATEGORIES } from '../data/categories.js'
import { formatNumber } from '../lib/format.js'
import { PageHeader, ProgressBar } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'

export default function Categories() {
  const s = useGameStore()
  const global = globalState(s)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categorías"
        subtitle="Cada área de tu vida sube de nivel por separado."
        icon="LayoutGrid"
      />

      <div className="card card-sheen flex items-center gap-4 p-5">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand/15 text-2xl font-extrabold text-brand-soft">
          {global.level}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-ink">Nivel global</p>
          <p className="text-xs text-faint">Derivado de todas tus categorías</p>
          <div className="mt-2">
            <ProgressBar value={global.progress} color="var(--color-brand)" height={8} />
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {CATEGORIES.map((c) => {
          const cs = categoryState(s, c.id)
          return (
            <Link
              key={c.id}
              to={`/categorias/${c.id}`}
              className="card group p-5 transition hover:border-border-strong"
            >
              <div className="flex items-center gap-3.5">
                <div
                  className="grid h-12 w-12 place-items-center rounded-2xl"
                  style={{ background: `color-mix(in srgb, ${c.accent} 16%, transparent)`, color: c.accent }}
                >
                  <Icon name={c.icon} size={24} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-ink">{c.name}</p>
                  <p className="text-xs text-faint">{c.tagline}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-faint">Nivel</p>
                  <p className="text-2xl font-extrabold leading-none" style={{ color: c.accent }}>
                    {cs.level}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <ProgressBar value={cs.progress} color={c.accent} height={7} />
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-faint">
                  <span>{formatNumber(cs.currentXp)}/{formatNumber(cs.neededXp)} XP</span>
                  <span>{formatNumber(cs.xp)} XP total</span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
