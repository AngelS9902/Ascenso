import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base: './' produces relative asset paths so the build works under any
// GitHub Pages subpath (https://user.github.io/<repo>/) without knowing the
// repo name in advance. Combined with HashRouter this avoids 404s on refresh.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
