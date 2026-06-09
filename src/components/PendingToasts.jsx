import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../store/useGameStore.js'
import { ACHIEVEMENT_MAP } from '../data/achievements.js'
import { TITLE_MAP } from '../data/titles.js'
import { ADVANCEMENT_MAP } from '../data/advancements.js'
import { BOSS_MAP } from '../data/bosses.js'
import { DUNGEON_MAP } from '../data/dungeons.js'
import { CATEGORY_MAP } from '../data/categories.js'
import { RARITY } from '../lib/colors.js'
import Icon from './Icon.jsx'

// Resuelve cada evento de la cola a su contenido visual.
function describe(item) {
  switch (item.kind) {
    case 'achievement': {
      const a = ACHIEVEMENT_MAP[item.id]
      return {
        tag: 'Logro desbloqueado',
        title: a?.name,
        icon: a?.icon || 'Award',
        color: RARITY[a?.rarity]?.color || 'var(--color-rare)',
      }
    }
    case 'title': {
      const t = TITLE_MAP[item.id]
      return { tag: 'Nuevo título', title: t?.name, icon: t?.icon || 'Crown', color: t?.accent || 'var(--color-legendary)' }
    }
    case 'advancement': {
      const a = ADVANCEMENT_MAP[item.id]
      const accent = CATEGORY_MAP[a?.categoryId]?.accent
      return { tag: 'Avance conseguido', title: a?.name, icon: a?.icon || 'GitBranch', color: accent || 'var(--color-brand)' }
    }
    case 'boss': {
      const b = BOSS_MAP[item.id]
      return { tag: '¡Jefe derrotado!', title: b?.name, icon: 'Swords', color: 'var(--color-legendary)' }
    }
    case 'dungeon': {
      const d = DUNGEON_MAP[item.id]
      return item.success
        ? { tag: 'Mazmorra completada', title: d?.name, icon: 'Trophy', color: d?.accent || 'var(--color-legendary)' }
        : { tag: 'Mazmorra expirada', title: d?.name, icon: 'Hourglass', color: 'var(--color-faint)' }
    }
    case 'level': {
      const c = CATEGORY_MAP[item.categoryId]
      return { tag: `${c?.name} · nivel ${item.level}`, title: '¡Subiste de nivel!', icon: c?.icon || 'TrendingUp', color: c?.accent || 'var(--color-brand)' }
    }
    default:
      return null
  }
}

function Toast({ item, onDismiss }) {
  const data = describe(item)
  const long = ['achievement', 'title', 'boss', 'dungeon'].includes(item.kind)

  useEffect(() => {
    const t = setTimeout(onDismiss, long ? 6000 : 4000)
    return () => clearTimeout(t)
  }, [long, onDismiss])

  if (!data) return null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 40, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 360, damping: 30 }}
      className="card card-sheen pointer-events-auto flex w-[20rem] max-w-[88vw] items-center gap-3 p-3 pr-4 shadow-2xl"
      style={{ borderColor: `color-mix(in srgb, ${data.color} 40%, var(--color-border))` }}
      onClick={onDismiss}
    >
      <div
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
        style={{ background: `color-mix(in srgb, ${data.color} 18%, transparent)`, color: data.color }}
      >
        <Icon name={data.icon} size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: data.color }}>
          {data.tag}
        </p>
        <p className="truncate font-semibold text-ink">{data.title}</p>
      </div>
    </motion.div>
  )
}

export default function PendingToasts() {
  const pending = useGameStore((s) => s.pending)
  const dismiss = useGameStore((s) => s.dismissPending)

  return (
    <div className="pointer-events-none fixed right-3 top-3 z-[70] flex flex-col items-end gap-2 sm:right-5 sm:top-5">
      <AnimatePresence initial={false}>
        {pending.map((item) => (
          <Toast key={item.key} item={item} onDismiss={() => dismiss(item.key)} />
        ))}
      </AnimatePresence>
    </div>
  )
}
