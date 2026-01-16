# Agent Guide for diary

## Project overview
- Vite + React app with Tailwind CSS styling.
- Offline-first journaling app using IndexedDB via Dexie.
- Hash-based routing in `src/App.jsx` with lazy-loaded pages.
- Rich-text editor built on Lexical in `src/components/editor/`.

## Key paths
- `src/main.jsx`: React entry point.
- `src/App.jsx`: App shell, navigation, theme state, routing, data actions.
- `src/db.js`: Dexie schema versions, migrations, backup import/export, storage helpers.
- `src/components/`: Feature pages (stats, people, travel route, sleep, etc.).
- `src/components/editor/`: Lexical editor, plugins, and entry UI.
- `src/index.css`: Tailwind setup and global styles.

## Data model notes (Dexie)
- The primary store is `entries` with tags/people indexes.
- Additional stores: `sleep_sessions`, `chat_analytics`, `meditation_sessions`, `people`,
  and travel routes split into `routes_meta` + `routes_data`.
- When adding new stores or changing schema, bump `db.version(...)` in `src/db.js`.
- Backup/restore: `exportToZip` and `importFromZip` in `src/db.js` handle images and
  per-feature JSON files.

## Routing and navigation
- Routes are hash-based (ex: `#journal`, `#editor`, `#stats`).
- Add new pages by:
  1. Creating a component in `src/components/`.
  2. Adding a lazy import in `src/App.jsx`.
  3. Wiring it into the route switch and sidebar/menu.

## UI and theming
- Accent colors and dark mode are controlled in `src/App.jsx` via CSS variables on `:root`.
- Tailwind utility classes are used throughout; avoid inline styles unless necessary.

## Common commands
- `npm run dev` for local development.
- `npm run build` for production build.
- `npm run lint` to run ESLint.

## Conventions
- Prefer `useLiveQuery` for reactive Dexie reads.
- Keep heavy data (like travel paths) separate from metadata for fast UI lists.
- When touching backups, keep image handling in sync with JSON payloads.
