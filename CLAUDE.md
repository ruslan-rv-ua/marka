# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start Tauri dev (launches Vite + Rust watcher)
pnpm build --no-bundle  # Production release build (no installer)
pnpm vite:dev     # Frontend-only dev server on port 1420
pnpm vite:build   # Frontend-only build to /dist
```

No test suite is configured.

## Architecture

**Marka** is a Tauri v2 desktop app — a minimal Markdown file viewer for Windows with NVDA screen reader accessibility.

### Data flow

```
CLI arg (--file) or Ctrl+O
  → Tauri plugin-cli / plugin-dialog (Rust)
  → read_file Tauri command (Rust: src-tauri/src/lib.rs)
  → marked + marked-highlight (JS: src/main.js)
  → rendered HTML with highlight.js syntax coloring
```

### Frontend (`src/`)

- **`main.js`** — all app logic: Tauri invoke calls, marked.js setup, keyboard shortcuts (Ctrl+O, Ctrl+±, Ctrl+[/], Escape), dynamic font-size and padding adjustments, NVDA focus management
- **`styles.css`** — dark high-contrast theme, CSS variables, font-size/padding controlled by JS on `:root`
- **`index.html`** — Ukrainian (`lang="uk"`), `role="document"` on main content area

### Backend (`src-tauri/src/lib.rs`)

Two Tauri commands:
- `read_file(path)` → returns file content as string
- `open_file_dialog(app)` → file picker filtered to `.md`, returns `OpenedFile { path, content }`

Error messages are in Ukrainian.

### Key constraints

- **NVDA accessibility**: `pre` elements require `role="region"`, `aria-label="Блок коду"`, `tabindex="0"`; focus blur→animate→focus cycle forces NVDA browse mode refresh
- **Keyboard shortcuts**: use `event.key` patterns that work regardless of keyboard layout (layouts other than QWERTY send different `event.code`)
- **Language**: UI strings are Ukrainian throughout (frontend + Rust error messages)
- **No CSP**: `tauri.conf.json` sets `"csp": null`
