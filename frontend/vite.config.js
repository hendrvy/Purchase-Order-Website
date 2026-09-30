import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Only true when vite is invoked as `vite build --watch` (see
// frontend/Dockerfile.dev, used by docker-compose.dev.yml). Setting
// `build.watch` to a non-null object - even just to pass chokidar
// options - makes Vite enter watch mode permanently, regardless of
// whether `--watch` was actually passed on the command line. That broke
// the *production* build (`RUN npm run build` in
// backend/docker/Dockerfile.nginx, which is a plain one-shot `vite
// build`): the process never exited because it kept "watching for file
// changes...", which made `docker compose up --build` hang forever.
// Gating it behind this check keeps watch-mode-only options from ever
// affecting the one-shot production build.
const isWatchBuild = process.argv.includes('--watch')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    // `vite build --watch` (used by the `frontend-builder` service in
    // docker-compose.dev.yml for hot-reload) relies on chokidar to
    // detect file changes. Docker Desktop bind mounts on
    // Windows/OneDrive don't reliably forward native filesystem events
    // into the container, so the watcher silently never fires without
    // this. `usePolling` makes chokidar poll the filesystem instead -
    // slightly more CPU, but it's the only reliable way to pick up
    // host-side edits in this environment. Must stay `undefined` (not an
    // empty object) for one-shot production builds - see isWatchBuild
    // comment above for why.
    watch: isWatchBuild
      ? {
          chokidar: {
            usePolling: true,
            interval: 500,
          },
        }
      : undefined,
  },
})
