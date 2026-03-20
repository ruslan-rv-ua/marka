# Light Theme & Theme Toggle — Design Spec

**Date:** 2026-03-20
**Status:** Approved

---

## Overview

Add a light high-contrast theme to Marka, a keyboard shortcut to toggle between dark and light themes, and persist the selected theme in `settings.json` with debounce.

---

## Architecture

Three files change:

- **`src/styles.css`** — new `[data-theme="light"] { ... }` block overriding all CSS variables and `.hljs-*` token colors
- **`src/main.js`** — `toggleTheme()` function, `Ctrl+T` handler, theme read in `applySettings()`, theme written in `scheduleSave()`
- **`src-tauri/src/lib.rs`** — `theme: String` field (default `"dark"`) added to `Settings` struct

### Data flow

```
Ctrl+T
  → toggleTheme() (JS)
  → document.documentElement.setAttribute("data-theme", newTheme)
  → scheduleSave() — debounce 1000ms
  → invoke("save_settings", { settings: { ..., theme } })
  → settings.json on disk
```

On startup:
```
invoke("load_settings")
  → applySettings()
  → apply font-size, padding-x, AND data-theme attribute
```

---

## Settings Schema

`settings.json` gains one field:

```json
{
  "fontSize": 16,
  "paddingX": 10,
  "theme": "dark",
  "windowWidth": 800,
  "windowHeight": 600,
  "windowX": null,
  "windowY": null,
  "windowMaximized": false
}
```

`theme` defaults to `"dark"` — backwards compatible with existing `settings.json` files that lack the field (Rust `#[serde(default)]` already present on the struct).

---

## Keyboard Shortcut

| Shortcut | Action |
|---|---|
| `Ctrl+T` | Toggle theme dark ↔ light |

Uses `event.code === "KeyT"` (consistent with existing shortcut style in the codebase). No conflict with existing shortcuts (O, Equal, Minus, NumpadAdd, NumpadSubtract, BracketLeft, BracketRight, Escape).

---

## CSS Implementation

### Approach

`[data-theme="light"]` attribute selector on `<html>` overrides `:root` CSS variables. Default (no attribute or `data-theme="dark"`) is the existing dark theme — no existing CSS changes.

### Light theme CSS variables

```css
[data-theme="light"] {
  --bg: #ffffff;
  --fg: #111111;
  --accent: #0055cc;
  --border: #aaaaaa;
  --code-bg: #f0f0f0;
  --heading: #000000;
  --link: #0044bb;
  --link-visited: #5500aa;
  --table-border: #999999;
  --table-header-bg: #e0e0e0;
  --blockquote-border: #0055cc;
  --blockquote-bg: #f5f5f5;
}
```

`strong` color is hardcoded `#fff` in the base CSS — must be overridden to `#000` in the light theme block.

### Light theme hljs overrides

All token colors scoped under `[data-theme="light"]`, applied on code-bg `#f0f0f0`.

---

## WCAG 2.1 Contrast Verification

### Dark theme — code-bg `#1a1a1a`

| Token | Color | Contrast |
|---|---|---|
| base / variable | #f0f0f0 | ~15.6:1 ✓ |
| keyword | #f97 | ~8.2:1 ✓ |
| string | #9f9 | ~10.1:1 ✓ |
| comment | #999 | ~6.4:1 ✓ |
| number | #fc6 | ~9.8:1 ✓ |
| function | #6cf | ~8.5:1 ✓ |
| type | #fd8 | ~10.4:1 ✓ |
| meta | #c9f | ~8.9:1 ✓ |

### Light theme — code-bg `#f0f0f0`

| Token | Color | Contrast |
|---|---|---|
| base / variable | #111111 | ~15.6:1 ✓ |
| keyword | #9000d0 | ~5.8:1 ✓ |
| string | #006400 | ~5.9:1 ✓ |
| comment | #595959 | ~5.5:1 ✓ |
| number | #a05000 | ~4.6:1 ✓ |
| function | #0050b3 | ~6.0:1 ✓ |
| type | #7a5200 | ~5.5:1 ✓ |
| meta | #7700aa | ~7.4:1 ✓ |

All tokens pass WCAG 2.1 AA (4.5:1 minimum) in both themes.

---

## Rust Changes

Add `theme` field to `Settings`:

```rust
#[derive(serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    pub font_size: f64,
    pub padding_x: f64,
    pub window_width: f64,
    pub window_height: f64,
    pub window_x: Option<f64>,
    pub window_y: Option<f64>,
    pub window_maximized: bool,
    pub theme: String,          // NEW: "dark" | "light"
}
```

`Default` impl sets `theme: "dark".to_string()`.

No new Tauri commands — `load_settings` / `save_settings` handle the new field automatically.

---

## JS Changes

### `applySettings()`

After applying font-size and padding-x, apply theme:

```js
if (s.theme === "light") {
  document.documentElement.setAttribute("data-theme", "light");
}
```

### `toggleTheme()`

```js
function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "light" ? "dark" : "light";
  if (next === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  scheduleSave();
}
```

Dark theme = no attribute (preserves existing CSS default behavior).

### `scheduleSave()`

Add `theme` to the settings object:

```js
theme: document.documentElement.getAttribute("data-theme") ?? "dark",
```

### Keyboard handler

Add to the existing `keydown` handler:

```js
} else if (e.ctrlKey && e.code === "KeyT") {
  e.preventDefault();
  toggleTheme();
}
```

---

## Backwards Compatibility

- Existing `settings.json` without `theme` field → Rust `Default` → `"dark"` → no change in appearance
- No existing CSS rules change — dark theme is the CSS default (no `data-theme` attribute)
