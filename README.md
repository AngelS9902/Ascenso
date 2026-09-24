# Hábitos — clon personal de HabitKit (PWA)

Vanilla JS, sin dependencias ni build. Íconos: Lucide (ISC). Datos en IndexedDB (solo en tu dispositivo).

## Estructura
| Archivo | Qué hace |
|---|---|
| index.html | Shell + meta tags de iOS |
| style.css | Estilos (oscuro/claro) |
| app.js | Lógica: hábitos, rachas, vistas, estadísticas, recordatorios (.ics), respaldo |
| icons.js | Set de íconos Lucide |
| sw.js | Service worker (offline). **Sube `CACHE` en cada deploy** |
| manifest.webmanifest | Instalación como app |

## Probar local
```bash
python3 -m http.server 8000   # abre http://localhost:8000
```

## Deploy
Automático con GitHub Actions (`.github/workflows/deploy.yml`) en cada push a `main`.
Requisito único: Settings → Pages → Source: **GitHub Actions**.

URL: `https://angels9902.github.io/Ascenso/`

## Proyecto anterior
`_legacy/` (ignorado por git) guarda la app Ascenso: `ascenso-actual/` (último index.html sin commitear) y `ascenso-react-v1/` (versión React del commit 014196a, también en el historial de git).

## Instalar en iPhone
Safari → URL → Compartir → **Agregar a pantalla de inicio**.

## Actualizar
1. Edita el código  2. Sube `CACHE` en sw.js (ej. `habitos-v1.0.1`)  3. push
La app toma la versión nueva al abrirla 1–2 veces.

## Respaldo
Ajustes → Exportar (guárdalo en iCloud Drive). Si borras la app de la pantalla de inicio se borran los datos.
