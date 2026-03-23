# Design: Ctrl+0 — Reset Zoom

**Date:** 2026-03-23
**Status:** Draft

## Overview

Add `Ctrl+0` keyboard shortcut that instantly resets font size and horizontal padding to their default values. Mirrors the convention used by browsers, code editors, and terminals.

## Motivation

Users can drift font size and padding far from optimal using `Ctrl++`/`Ctrl+-` and `Ctrl+[`/`Ctrl+]`. Without a reset shortcut, returning to defaults requires many keystrokes. `Ctrl+0` is the universally recognised reset-zoom convention.

## Scope

Single file change: `src/main.js` only.
No changes to CSS, Rust backend, or `tauri.conf.json`.

## Design

### New Constants

Add alongside existing `FONT_SIZE_MIN`, `FONT_SIZE_MAX`, `PADDING_MIN`, `PADDING_MAX`:

```js
const DEFAULT_FONT_SIZE = 16; // px, matches :root --font-size in styles.css
const DEFAULT_PADDING_X = 10; // %, matches :root --padding-x in styles.css
```

### New Function

Add alongside `changeFontSize()` and `changePadding()`:

```js
function resetZoom() {
  root.style.setProperty("--font-size", `${DEFAULT_FONT_SIZE}px`);
  root.style.setProperty("--padding-x", `${DEFAULT_PADDING_X}%`);
  scheduleSave();
}
```

`root` is `document.documentElement`, defined at module scope. The codebase stores no JS-side state for font size or padding — both are read from computed CSS properties at call time, so a direct `setProperty` with hardcoded defaults is sufficient; no read is needed before writing.

### Keyboard Shortcut

Add to the existing `keydown` event handler, alongside `Ctrl+=` / `Ctrl+-` cases:

```js
if (e.ctrlKey && e.code === "Digit0") {
  e.preventDefault();
  resetZoom();
}
```

Key notes:
- Uses `event.code` (physical key position), consistent with all other shortcuts in the file.
- `Numpad0` is intentionally excluded. Rationale: `Ctrl+[`/`Ctrl+]` (padding) have no numpad variants, keeping reset consistent with padding shortcuts. Additionally, `Ctrl+Numpad0` is reserved by browsers/WebView2 as reset-zoom, so handling it would shadow host behaviour.
- `scheduleSave()` persists the reset values to disk with the existing 1-second debounce.

## Behaviour

| Before | Action | After |
|--------|--------|-------|
| Any font size (10–72 px) | `Ctrl+0` | 16 px |
| Any padding (0–25 %) | `Ctrl+0` | 10 % |

Settings are saved to disk after reset (same as all other zoom/padding changes).

## Non-Goals

- Does NOT reset theme (dark/light).
- Does NOT reset window size or position.
- Does NOT add any NVDA `aria-live` announcement. Rationale: `Ctrl++`/`Ctrl+-` and `Ctrl+[`/`Ctrl+]` also produce no announcement — the effect is immediately perceptible through content reflow detectable by NVDA in browse mode. Adding an announcement only for reset would be inconsistent.
