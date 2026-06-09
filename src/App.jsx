import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Categories from './pages/Categories.jsx'
import CategoryDetail from './pages/CategoryDetail.jsx'
import Advancements from './pages/Advancements.jsx'
import Achievements from './pages/Achievements.jsx'
import Bosses from './pages/Bosses.jsx'
import Dungeons from './pages/Dungeons.jsx'
import Stats from './pages/Stats.jsx'
import Profile from './pages/Profile.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="categorias" element={<Categories />} />
        <Route path="categorias/:id" element={<CategoryDetail />} />
        <Route path="arbol" element={<Advancements />} />
        <Route path="logros" element={<Achievements />} />
        <Route path="jefes" element={<Bosses />} />
        <Route path="mazmorras" element={<Dungeons />} />
        <Route path="estadisticas" element={<Stats />} />
        <Route path="perfil" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
