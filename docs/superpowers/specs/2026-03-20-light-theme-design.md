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
  → setAttribute/removeAttribute on document.documentElement
  → announceTheme() — aria-live announcement for NVDA
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

Uses `event.code === "KeyT"` for layout independence (same reason as all other letter/symbol shortcuts in the codebase; `Escape` uses `event.key` but that is the exception).

No conflict with existing app shortcuts (O, Equal, Minus, NumpadAdd, NumpadSubtract, BracketLeft, BracketRight, Escape). `Ctrl+T` is a "new tab" shortcut in browsers, but Tauri v2's WebView2 on Windows does not have browser tabs, so this conflict does not manifest at runtime.

---

## CSS Implementation

### Approach

`[data-theme="light"]` attribute selector on `<html>` overrides `:root` CSS variables. Default (no attribute, or `data-theme` absent) = dark theme — no existing CSS changes needed.

The DOM attribute is the single source of truth for theme state. `scheduleSave()` reads it via `getAttribute("data-theme") ?? "dark"` at save time, so rapid toggling followed by a debounced save always captures the final state correctly.

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

[data-theme="light"] strong {
  color: #000000;
}
```

`strong` is hardcoded `#fff` in the base CSS (not via a CSS variable). A separate scoped rule `[data-theme="light"] strong` overrides it to `#000000`.

### `.copy-btn` hover and focus tint

Both `.copy-btn:hover` and `.copy-btn:focus-visible` use `rgba(102, 204, 255, 0.08)` — a literal value tied to the dark accent. In the light theme this renders as a nearly imperceptible light-blue tint on a white background (~`#f3fafe`). The background tint is decorative; the icon/text color uses `var(--accent)` which is overridden to `#0055cc`.

For `:focus-visible` specifically: focus indication is provided by `outline: 2px solid var(--accent)` — which correctly picks up the overridden `#0055cc` — so the focus state remains clearly visible in the light theme. The literal background value is acceptable for both pseudo-classes; no override needed.

### Note on `!important` in `.hljs`

The base `.hljs` rule uses `!important` on `background` and `color`:

```css
.hljs {
  background: var(--code-bg) !important;
  color: var(--fg) !important;
}
```

CSS `!important` applies to the resolved value of a `var()` expression, not to the variable definition itself. Overriding `--code-bg` and `--fg` in `[data-theme="light"]` causes `.hljs` to pick up the new values correctly — `!important` does not block this. No additional `!important` overrides are needed in the light theme.

### Light theme hljs overrides

All token colors scoped under `[data-theme="light"]`, applied on code-bg `#f0f0f0`.

**Important:** `.hljs-variable` has a hardcoded `color: #f0f0f0` in the base CSS (not a CSS variable). Without an explicit override it would be invisible on the light code-bg. The light theme block must include:

```css
[data-theme="light"] .hljs-variable { color: #111111; }
```

The WCAG table row "base / variable" at `#111111` applies to both the `.hljs` base inherited color AND this explicit `.hljs-variable` override.

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

The existing `impl Default for Settings` (hand-written, not `#[derive(Default)]`) must have `theme: "dark".to_string()` added to it:

```rust
impl Default for Settings {
    fn default() -> Self {
        Self {
            font_size: 16.0,
            padding_x: 10.0,
            window_width: 800.0,
            window_height: 600.0,
            window_x: None,
            window_y: None,
            window_maximized: false,
            theme: "dark".to_string(),  // NEW
        }
    }
}
```

No new Tauri commands — `load_settings` / `save_settings` handle the new field automatically.

---

## JS Changes

### `applySettings()`

After applying font-size and padding-x, apply theme. Both branches are explicit to avoid stale attribute state if `applySettings()` were ever called more than once:

```js
if (s.theme === "light") {
  document.documentElement.setAttribute("data-theme", "light");
} else {
  document.documentElement.removeAttribute("data-theme");
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
  announceTheme(next);
  scheduleSave();
}
```

Dark theme = no `data-theme` attribute (preserves existing CSS default behavior).

### `announceTheme()`

Uses the existing `aria-live` region. The `#copy-announcement` element is created inside `renderFile()`, so it may not exist if Ctrl+T is pressed before any file is opened. `announceTheme()` creates the element on demand when absent — same lazy-creation pattern used in `renderFile()`:

```js
function announceTheme(theme) {
  let el = document.getElementById("copy-announcement");
  if (!el) {
    el = document.createElement("div");
    el.id = "copy-announcement";
    el.setAttribute("aria-live", "polite");
    el.setAttribute("aria-atomic", "true");
    el.className = "visually-hidden";
    document.body.appendChild(el);
  }
  el.textContent = theme === "light" ? "Світла тема" : "Темна тема";
  clearTimeout(pendingClearTimeout);
  pendingClearTimeout = setTimeout(() => { el.textContent = ""; }, 3000);
}
```

NVDA users will hear "Світла тема" or "Темна тема" on each toggle, even before any file is opened.

`announceCopy()` has a `if (!el) return` guard and requires no modification — copy buttons only appear after `renderFile()`, by which point the element is guaranteed to exist (either created by `renderFile()` or by a prior `announceTheme()` call).

**Shared `pendingClearTimeout`:** Both `announceTheme()` and `announceCopy()` use the same module-level `pendingClearTimeout` variable. This is intentional: the live region is last-write-wins — any new announcement (copy or theme toggle) cancels the in-flight clearance timer of the previous one. This is consistent with how copy-on-copy interactions already work and is the desired behavior.

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
