import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUI } from '../store/useUI.js'
import { useGameStore } from '../store/useGameStore.js'
import { CATEGORY_MAP } from '../data/categories.js'
import { formatNumber } from '../lib/format.js'
import Icon from './Icon.jsx'

// Modal para acciones con cantidad variable (minutos, km, dinero…).
export default function QuantifyModal() {
  const action = useUI((s) => s.quantifyAction)
  const close = useUI((s) => s.closeQuantify)
  const logAction = useGameStore((s) => s.logAction)
  const [amount, setAmount] = useState(0)

  const q = action?.quantify
  const accent = action ? CATEGORY_MAP[action.categoryId]?.accent : 'var(--color-brand)'

  useEffect(() => {
    if (q) setAmount(q.default ?? q.min ?? 0)
  }, [action, q])

  if (!action || !q) return null

  const step = q.step ?? 1
  const min = q.min ?? 0
  const decimals = step < 1 ? 1 : 0
  const xp = Math.max(0, Math.round((q.xpPerUnit || 0) * amount))
  const adjust = (dir) => setAmount((v) => Math.max(min, +(v + dir * step).toFixed(2)))

  const confirm = () => {
    logAction(action.id, amount)
    close()
  }

  return (
    <AnimatePresence>
      {action && (
        <motion.div
          className="fixed inset-0 z-[60] grid place-items-end sm:place-items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            className="card card-sheen relative w-full max-w-sm p-6 sm:m-4"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div
                className="grid h-11 w-11 place-items-center rounded-2xl"
                style={{ background: `color-mix(in srgb, ${accent} 16%, transparent)`, color: accent }}
              >
                <Icon name={action.icon} size={22} />
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{action.name}</p>
                <p className="text-sm text-muted">{q.label}</p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-5">
              <button
                onClick={() => adjust(-1)}
                className="focus-ring grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-ink transition hover:bg-surface-3 active:scale-95"
                aria-label="Disminuir"
              >
                <Icon name="Minus" size={22} />
              </button>
              <div className="min-w-[7rem] text-center">
                <div className="text-4xl font-extrabold tabular-nums text-ink">
                  {formatNumber(amount, decimals)}
                </div>
                <div className="text-xs font-medium uppercase tracking-wide text-faint">{q.unit}</div>
              </div>
              <button
                onClick={() => adjust(1)}
                className="focus-ring grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-ink transition hover:bg-surface-3 active:scale-95"
                aria-label="Aumentar"
              >
                <Icon name="Plus" size={22} />
              </button>
            </div>

            <div className="mt-5 flex items-center justify-center">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold"
                style={{ background: `color-mix(in srgb, ${accent} 14%, transparent)`, color: accent }}
              >
                <Icon name="Zap" size={14} /> +{xp} XP
              </span>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={close}
                className="focus-ring flex-1 rounded-xl bg-surface-2 py-3 font-semibold text-muted transition hover:text-ink"
              >
                Cancelar
              </button>
              <button
                onClick={confirm}
                className="focus-ring flex-1 rounded-xl py-3 font-semibold text-white transition active:scale-[0.98]"
                style={{ background: accent }}
              >
                Registrar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
