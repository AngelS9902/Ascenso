import { useState } from 'react'
import { useGameStore } from '../store/useGameStore.js'
import { useUI } from '../store/useUI.js'
import { CATEGORY_MAP } from '../data/categories.js'
import Icon from './Icon.jsx'

// Fila-botón para registrar una acción. Si la acción pide cantidad, abre el modal;
// si no, la registra al instante con un breve destello de confirmación.
export default function LogActionButton({ action }) {
  const logAction = useGameStore((s) => s.logAction)
  const openQuantify = useUI((s) => s.openQuantify)
  const [flash, setFlash] = useState(false)
  const accent = CATEGORY_MAP[action.categoryId]?.accent || 'var(--color-brand)'

  const onClick = () => {
    if (action.quantify) {
      openQuantify(action)
    } else {
      logAction(action.id)
      setFlash(true)
      setTimeout(() => setFlash(false), 550)
    }
  }

  return (
    <button
      onClick={onClick}
      className="focus-ring group relative flex w-full items-center gap-3 overflow-hidden rounded-xl bg-surface-2 p-3 text-left transition hover:bg-surface-3 active:scale-[0.99]"
    >
      <div
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl transition"
        style={{ background: `color-mix(in srgb, ${accent} 16%, transparent)`, color: accent }}
      >
        <Icon name={action.icon} size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{action.name}</p>
        {action.detail && <p className="truncate text-xs text-muted">{action.detail}</p>}
      </div>
      <div
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-faint transition group-hover:text-ink"
        style={flash ? { background: accent, color: '#fff' } : undefined}
      >
        <Icon name={flash ? 'Check' : action.quantify ? 'ChevronRight' : 'Plus'} size={16} />
      </div>
    </button>
  )
}
