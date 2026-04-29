# Sticky Notes MVP

Minimal Tauri v2 + Vue 3 desktop sticky notes app.

## Scripts

- `pnpm dev`: run the Vite frontend
- `pnpm tauri dev`: run the desktop app
- `pnpm typecheck`: run Vue TypeScript checks
- `pnpm lint`: run ESLint
- `pnpm test`: run Vitest

## MVP scope

- Create, edit, drag, resize, recolor, and delete notes
- Debounced persistence to Tauri Store files with backup fallback
- Restore notes and settings on next launch
- Toggle launch at startup
- Prevent duplicate app instances
