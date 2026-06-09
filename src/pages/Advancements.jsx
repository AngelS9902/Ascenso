import { useState, useRef, useMemo, useLayoutEffect, useEffect, useCallback } from 'react'
import { useGameStore } from '../store/useGameStore.js'
import { CATEGORIES, CATEGORY_MAP } from '../data/categories.js'
import { advancementsByCategory } from '../data/advancements.js'
import { relativeDate } from '../lib/format.js'
import { PageHeader } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'

function statusOf(a, unlocked) {
  if (unlocked[a.id]) return 'unlocked'
  if (a.requires.every((r) => unlocked[r])) return 'available'
  return 'locked'
}

function CategoryTree({ category }) {
  const unlocked = useGameStore((s) => s.unlockedAdvancements)
  const advs = useMemo(() => advancementsByCategory(category.id), [category.id])
  const maxTier = useMemo(() => Math.max(...advs.map((a) => a.tier)), [advs])
  const columns = useMemo(() => {
    const cols = []
    for (let t = 0; t <= maxTier; t++) cols.push(advs.filter((a) => a.tier === t))
    return cols
  }, [advs, maxTier])

  const contentRef = useRef(null)
  const nodeRefs = useRef({})
  const [pos, setPos] = useState({})
  const [selected, setSelected] = useState(null)
  const accent = category.accent

  const measure = useCallback(() => {
    const content = contentRef.current
    if (!content) return
    const base = content.getBoundingClientRect()
    const next = {}
    for (const a of advs) {
      const el = nodeRefs.current[a.id]
      if (!el) continue
      const r = el.getBoundingClientRect()
      next[a.id] = { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height }
    }
    setPos(next)
  }, [advs])

  useLayoutEffect(() => {
    measure()
  }, [measure, unlocked])

  useEffect(() => {
    const ro = new ResizeObserver(measure)
    if (contentRef.current) ro.observe(contentRef.current)
    window.addEventListener('resize', measure)
    const t = setTimeout(measure, 60)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
      clearTimeout(t)
    }
  }, [measure])

  const edges = []
  for (const a of advs) {
    for (const r of a.requires) {
      if (pos[a.id] && pos[r]) edges.push({ from: pos[r], to: pos[a.id], on: !!unlocked[a.id] })
    }
  }

  const sel = selected ? advs.find((a) => a.id === selected) : null
  const selStatus = sel ? statusOf(sel, unlocked) : null

  return (
    <div>
      <div className="overflow-x-auto pb-2">
        <div ref={contentRef} className="relative flex w-max gap-14 px-2 py-4">
          {/* Conectores */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ overflow: 'visible' }}>
            {edges.map((e, i) => {
              const sx = e.from.x + e.from.w
              const sy = e.from.y + e.from.h / 2
              const ex = e.to.x
              const ey = e.to.y + e.to.h / 2
              const mx = (sx + ex) / 2
              return (
                <path
                  key={i}
                  d={`M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ey}, ${ex} ${ey}`}
                  fill="none"
                  stroke={e.on ? accent : 'var(--color-border-strong)'}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              )
            })}
          </svg>

          {columns.map((col, ti) => (
            <div key={ti} className="relative z-10 flex flex-col justify-center gap-7">
              {col.map((a) => {
                const st = statusOf(a, unlocked)
                const isSel = selected === a.id
                const style =
                  st === 'unlocked'
                    ? { background: `color-mix(in srgb, ${accent} 18%, transparent)`, color: accent, borderColor: accent }
                    : st === 'available'
                      ? { background: 'var(--color-surface-2)', color: accent, borderColor: `color-mix(in srgb, ${accent} 55%, transparent)`, borderStyle: 'dashed' }
                      : { background: 'var(--color-surface-2)', color: 'var(--color-faint)', borderColor: 'var(--color-border)' }
                return (
                  <button
                    key={a.id}
                    ref={(el) => (nodeRefs.current[a.id] = el)}
                    onClick={() => setSelected(isSel ? null : a.id)}
                    className="flex w-[88px] flex-col items-center gap-1.5 outline-none"
                  >
                    <span
                      className="grid h-14 w-14 place-items-center rounded-2xl border-2 transition active:scale-95"
                      style={{ ...style, boxShadow: isSel ? `0 0 0 3px color-mix(in srgb, ${accent} 35%, transparent)` : undefined }}
                    >
                      <Icon name={st === 'locked' ? 'Lock' : a.icon} size={24} />
                    </span>
                    <span className={`text-center text-[11px] leading-tight ${st === 'locked' ? 'text-faint' : 'text-ink'}`}>
                      {a.name}
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Detalle del nodo seleccionado */}
      {sel && (
        <div className="card animate-float-up mt-2 flex items-start gap-3 p-4">
          <div
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
            style={
              selStatus === 'locked'
                ? { background: 'var(--color-surface-2)', color: 'var(--color-faint)' }
                : { background: `color-mix(in srgb, ${accent} 16%, transparent)`, color: accent }
            }
          >
            <Icon name={selStatus === 'locked' ? 'Lock' : sel.icon} size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">{sel.name}</p>
            <p className="text-sm text-muted">{sel.description}</p>
            <p className="mt-1.5 text-xs font-medium" style={{ color: selStatus === 'locked' ? 'var(--color-faint)' : accent }}>
              {selStatus === 'unlocked'
                ? `Desbloqueado ${relativeDate(unlocked[sel.id].at)}`
                : selStatus === 'available'
                  ? 'En progreso — ¡a por ello!'
                  : 'Bloqueado — completa el avance anterior'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Advancements() {
  const unlocked = useGameStore((s) => s.unlockedAdvancements)
  const [cat, setCat] = useState(CATEGORIES[0].id)
  const category = CATEGORY_MAP[cat]
  const advs = advancementsByCategory(cat)
  const got = advs.filter((a) => unlocked[a.id]).length

  return (
    <div className="space-y-6">
      <PageHeader title="Árbol de Progreso" subtitle="Cada avance desbloquea el siguiente. Toca un nodo para ver el detalle." icon="GitBranch" />

      {/* Selector de categoría */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {CATEGORIES.map((c) => {
          const active = c.id === cat
          return (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition"
              style={
                active
                  ? { background: `color-mix(in srgb, ${c.accent} 18%, transparent)`, color: c.accent, borderColor: `color-mix(in srgb, ${c.accent} 40%, transparent)` }
                  : { color: 'var(--color-muted)', borderColor: 'var(--color-border)' }
              }
            >
              <Icon name={c.icon} size={15} />
              {c.name}
            </button>
          )
        })}
      </div>

      <div className="card p-3 sm:p-5">
        <div className="mb-1 flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <Icon name={category.icon} size={18} style={{ color: category.accent }} />
            <span className="font-semibold text-ink">{category.name}</span>
          </div>
          <span className="text-sm text-faint">{got}/{advs.length} avances</span>
        </div>
        <CategoryTree category={category} />

        {/* Leyenda */}
        <div className="mt-2 flex flex-wrap gap-4 border-t border-border px-2 pt-3 text-xs text-muted">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border-2" style={{ background: `color-mix(in srgb, ${category.accent} 18%, transparent)`, borderColor: category.accent }} /> Desbloqueado</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border-2 border-dashed" style={{ borderColor: `color-mix(in srgb, ${category.accent} 55%, transparent)` }} /> En progreso</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border-2 border-border bg-surface-2" /> Bloqueado</span>
        </div>
      </div>
    </div>
  )
}
