# Ascenso · Crecimiento Personal

Una aplicación de crecimiento personal con mecánicas de RPG: convierte tu vida en
una **hoja de personaje**. Ganas experiencia por categoría, subes de nivel,
desbloqueas logros y títulos, avanzas en un árbol de progreso (estilo Minecraft),
derrotas "jefes" (metas grandes), completas mazmorras (retos temporales) y
mantienes una barra de energía que **nunca destruye tu progreso histórico**.

> "Estoy subiendo de nivel en mi vida real."

## Stack

- **React + Vite** — interfaz y bundling.
- **Tailwind CSS v4** — sistema de diseño minimalista y premium (tema oscuro).
- **Zustand + Immer** — estado del juego, con persistencia automática.
- **Framer Motion** — animaciones de desbloqueo y subida de nivel.
- **lucide-react** — iconografía limpia.

Los datos se guardan **localmente** (localStorage). Todo el estado vive como un
único JSON, listo para migrar a **Supabase** sin reescribir la app (ver
`src/store/storage.js`).

## Desarrollo local

```bash
npm install      # instalar dependencias (una sola vez)
npm run dev      # servidor de desarrollo → http://localhost:5173
npm run build    # build de producción en /dist
npm run preview  # previsualizar el build
```

## Estructura

```
src/
├── data/        Definiciones del juego (categorías, acciones, logros,
│                títulos, árbol, jefes, mazmorras)
├── lib/         Utilidades puras (niveles, energía, fechas, formato, color)
├── store/       Estado (Zustand), motor de desbloqueos y persistencia
├── components/  UI reutilizable (Layout, Icon, modales, toasts…)
└── pages/       Pantallas (Dashboard, Categorías, Árbol, Logros, Jefes,
                 Mazmorras, Estadísticas, Perfil)
```

## Despliegue en GitHub Pages

El proyecto está listo para GitHub Pages:

- `vite.config.js` usa `base: './'` (rutas relativas).
- Se usa `HashRouter`, así que no hay 404 al recargar.
- El workflow `.github/workflows/deploy.yml` construye y publica automáticamente.

Pasos (cuando quieras subirlo):

1. Sube el repositorio a GitHub.
2. En **Settings → Pages**, elige **Source: GitHub Actions**.
3. Haz push a `main`. El workflow construye y publica la app.

## Migración futura a Supabase

Toda la persistencia está aislada en `src/store/storage.js`. Para sincronizar
entre dispositivos, se reemplaza el adaptador de localStorage por uno que
lea/escriba el mismo JSON en Supabase (con autenticación). El resto de la app no
cambia. Hay notas detalladas en ese archivo.
