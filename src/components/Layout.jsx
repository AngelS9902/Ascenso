import { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useGameStore } from '../store/useGameStore.js'
import { globalState, energyNow } from '../store/selectors.js'
import { energyState } from '../lib/energy.js'
import Icon from './Icon.jsx'
import QuantifyModal from './QuantifyModal.jsx'
import PendingToasts from './PendingToasts.jsx'

const NAV = [
  { to: '/', label: 'Inicio', icon: 'Home', primary: true, end: true },
  { to: '/categorias', label: 'Categorías', icon: 'LayoutGrid', primary: true },
  { to: '/arbol', label: 'Árbol', icon: 'GitBranch', primary: true },
  { to: '/logros', label: 'Logros', icon: 'Award', primary: true },
  { to: '/jefes', label: 'Jefes', icon: 'Swords' },
  { to: '/mazmorras', label: 'Mazmorras', icon: 'DoorOpen' },
  { to: '/estadisticas', label: 'Estadísticas', icon: 'BarChart3' },
  { to: '/perfil', label: 'Perfil', icon: 'User', primary: true },
]

const PRIMARY = NAV.filter((n) => n.primary)

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand/15 text-brand-soft">
        <Icon name="Sparkles" size={18} />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-bold text-ink">Ascenso</p>
        <p className="text-[11px] text-faint">Sube de nivel en la vida</p>
      </div>
    </div>
  )
}

export default function Layout() {
  // Suscripción al estado completo: computamos los derivados como llamadas
  // normales (no como selectores) para evitar bucles infinitos en Zustand v5,
  // ya que globalState/energyNow devuelven objetos nuevos o dependen de la hora.
  const s = useGameStore()
  const tick = s.tick
  const global = globalState(s)
  const energy = energyNow(s)
  const eState = energyState(energy)

  useEffect(() => {
    tick()
  }, [tick])

  return (
    <div className="mx-auto flex min-h-full w-full max-w-7xl">
      {/* Sidebar — escritorio */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border px-4 py-6 md:flex">
        <div className="px-2">
          <Brand />
        </div>
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-surface-2 text-ink'
                    : 'text-muted hover:bg-surface/60 hover:text-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    name={item.icon}
                    size={19}
                    style={isActive ? { color: 'var(--color-brand-soft)' } : undefined}
                  />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <NavLink
          to="/perfil"
          className="card-2 mt-4 flex items-center gap-3 p-3 transition hover:border-border-strong"
        >
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand/15 text-brand-soft text-sm font-bold">
            {global.level}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-faint">Nivel global</p>
            <div className="mt-1 flex items-center gap-1.5">
              <Icon name="Zap" size={12} style={{ color: eState.tone }} />
              <span className="text-xs font-medium" style={{ color: eState.tone }}>
                {eState.label}
              </span>
            </div>
          </div>
        </NavLink>
      </aside>

      {/* Contenido */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar — móvil */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-bg/80 px-4 py-3 backdrop-blur-md md:hidden">
          <Brand />
          <div className="flex items-center gap-2 rounded-full bg-surface px-3 py-1.5">
            <Icon name="Zap" size={14} style={{ color: eState.tone }} />
            <span className="text-xs font-semibold text-ink">Nv. {global.level}</span>
          </div>
        </header>

        <main className="flex-1 px-4 pb-28 pt-5 sm:px-6 md:pb-10 md:pt-8">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav — móvil */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/90 backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-around px-2 py-1.5">
          {PRIMARY.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[10px] font-medium transition ${
                  isActive ? 'text-brand-soft' : 'text-faint'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon name={item.icon} size={21} strokeWidth={isActive ? 2.4 : 2} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <QuantifyModal />
      <PendingToasts />
    </div>
  )
}
