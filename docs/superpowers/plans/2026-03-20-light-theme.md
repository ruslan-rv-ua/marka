# Light Theme & Theme Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a light high-contrast theme to Marka with Ctrl+T toggle, persisted in `settings.json` with debounce.

**Architecture:** `[data-theme="light"]` attribute on `<html>` overrides CSS variables — dark theme is the default (no attribute). A new `toggleTheme()` JS function flips the attribute and calls the existing `scheduleSave()` debounce. Rust `Settings` struct gains a `theme: String` field; no new Tauri commands needed.

**Tech Stack:** Tauri v2, Rust (serde_json), vanilla JS (ES modules), CSS custom properties, highlight.js

**No test suite** — this project has no automated tests. Each task ends with a manual verification step using `pnpm dev`.

---

## File Map

| File | Change |
|---|---|
| `src-tauri/src/lib.rs` | Add `theme: String` to `Settings` struct and `Default` impl |
| `src/styles.css` | Add `[data-theme="light"]` CSS block with variables, `strong` override, and all `.hljs-*` overrides |
| `src/main.js` | Update `applySettings()`, `scheduleSave()`, add `announceTheme()`, `toggleTheme()`, Ctrl+T handler |

---

## Task 1: Add `theme` field to Rust Settings

**Files:**
- Modify: `src-tauri/src/lib.rs:11-35`

The `Settings` struct (line 13) and its `impl Default` (line 23) both need the new field.

- [ ] **Step 1: Add `theme: String` to the Settings struct**

Open `src-tauri/src/lib.rs`. In the `Settings` struct (lines 13–21), add one line after `window_maximized`:

```rust
pub theme: String,          // "dark" | "light"
```

The struct should now look like:

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
    pub theme: String,          // "dark" | "light"
}
```

- [ ] **Step 2: Add `theme` to `impl Default for Settings`**

In the `impl Default` block (lines 23–35), add one line after `window_maximized: false`:

```rust
theme: "dark".to_string(),
```

The full block should now look like:

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
            theme: "dark".to_string(),
        }
    }
}
```

- [ ] **Step 3: Verify it compiles**

```bash
cd src-tauri && cargo check
```

Expected: no errors. Warnings about unused fields are fine.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: add theme field to Settings struct"
```

---

## Task 2: Add light theme CSS

**Files:**
- Modify: `src/styles.css` — append new block at the end of the file (after line 239)

The light theme is implemented entirely through CSS without touching any existing rules.

- [ ] **Step 1: Append the light theme block to `src/styles.css`**

Add the following at the very end of `src/styles.css`:

```css
/* ── Light theme ──────────────────────────────────────────────── */

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

/* strong has a hardcoded dark color in base CSS — override it */
[data-theme="light"] strong {
  color: #000000;
}

/* highlight.js token colors for light theme (background: #f0f0f0)      */
/* All WCAG 2.1 AA verified (≥4.5:1 on #f0f0f0) — see spec for ratios  */
/* .hljs-variable is hardcoded #f0f0f0 in base CSS — must be explicit   */
[data-theme="light"] .hljs-variable { color: #111111; }

[data-theme="light"] .hljs-keyword,
[data-theme="light"] .hljs-selector-tag,
[data-theme="light"] .hljs-built_in { color: #9000d0; }

[data-theme="light"] .hljs-string,
[data-theme="light"] .hljs-attr { color: #006400; }

[data-theme="light"] .hljs-comment,
[data-theme="light"] .hljs-quote { color: #595959; font-style: italic; }

[data-theme="light"] .hljs-number,
[data-theme="light"] .hljs-literal { color: #a05000; }

[data-theme="light"] .hljs-function,
[data-theme="light"] .hljs-title { color: #0050b3; }

[data-theme="light"] .hljs-type,
[data-theme="light"] .hljs-class { color: #7a5200; }

[data-theme="light"] .hljs-meta { color: #7700aa; }
```

- [ ] **Step 2: Manually verify dark theme is unchanged**

Run `pnpm vite:dev`, open any `.md` file. Without setting `data-theme="light"` the page must look identical to before this change. Open browser devtools, confirm no errors, confirm `:root` CSS variables are still dark.

- [ ] **Step 3: Manually verify light theme renders**

In browser devtools console, run:
```js
document.documentElement.setAttribute("data-theme", "light")
```
Expected: background turns white, text turns dark, code blocks are light grey with colored syntax tokens. Run:
```js
document.documentElement.removeAttribute("data-theme")
```
Expected: dark theme restores.

- [ ] **Step 4: Commit**

```bash
git add src/styles.css
git commit -m "feat: add light theme CSS with WCAG-verified hljs token colors"
```

---

## Task 3: Wire theme into settings (read + write)

**Files:**
- Modify: `src/main.js:25-64`

This task connects the theme to the existing settings persistence mechanism. No new functions — only changes to `applySettings()` and `scheduleSave()`.

- [ ] **Step 1: Update `applySettings()` to restore saved theme**

In `src/main.js`, in the `applySettings()` function (lines 25–36), after the two `root.style.setProperty` calls (lines 27–28), add:

```js
if (s.theme === "light") {
  root.setAttribute("data-theme", "light");
} else {
  root.removeAttribute("data-theme");
}
```

`root` is `document.documentElement` (already defined at line 23).

Both branches are explicit so the function is idempotent — calling it twice never leaves a stale attribute.

- [ ] **Step 2: Update `scheduleSave()` to persist current theme**

In `scheduleSave()` (lines 39–64), in the object literal passed to `invoke("save_settings", { settings: { ... } })` (lines 49–57), add one line after `windowMaximized`:

```js
theme: root.getAttribute("data-theme") ?? "dark",
```

The full settings object should now look like:

```js
settings: {
  fontSize: parseFloat(getComputedStyle(root).getPropertyValue("--font-size")),
  paddingX: parseFloat(getComputedStyle(root).getPropertyValue("--padding-x")),
  windowWidth: size.width,
  windowHeight: size.height,
  windowX: pos.x,
  windowY: pos.y,
  windowMaximized: maximized,
  theme: root.getAttribute("data-theme") ?? "dark",
}
```

Note: `getAttribute` returns `null` when the attribute is absent (dark theme), and `?? "dark"` converts that to the string `"dark"`. The DOM attribute is the single source of truth for theme state.

- [ ] **Step 3: Manually verify persistence round-trip**

Run `pnpm dev` (full Tauri dev build). In devtools console:
```js
document.documentElement.setAttribute("data-theme", "light")
```
Wait 1.5 seconds for the debounce. Check the `settings.json` file next to the built exe (or in the dev output folder). It should contain `"theme": "light"`.

Close and reopen the app. The light theme should be restored automatically.

Repeat with `removeAttribute("data-theme")` — app should reopen in dark theme.

- [ ] **Step 4: Commit**

```bash
git add src/main.js
git commit -m "feat: persist and restore theme in settings"
```

---

## Task 4: Add toggleTheme, announceTheme, and Ctrl+T shortcut

**Files:**
- Modify: `src/main.js` — add two functions and one keyboard handler branch

- [ ] **Step 1: Add `announceTheme()` function**

In `src/main.js`, add the following function after the existing `announceCopy()` function (after line 91):

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

Why lazy creation: `#copy-announcement` is normally created inside `renderFile()`. If the user presses Ctrl+T before opening any file, the element won't exist yet — this function creates it on demand. `announceCopy()` uses `if (!el) return` which is safe: copy buttons only appear after `renderFile()` runs, so the element always exists by then.

The shared `pendingClearTimeout` is intentional: last-write-wins — any new announcement cancels the previous one's clear timer. This matches the existing copy-on-copy behavior.

- [ ] **Step 2: Add `toggleTheme()` function**

Add the following function directly after `announceTheme()`:

```js
function toggleTheme() {
  const current = root.getAttribute("data-theme");
  const next = current === "light" ? "dark" : "light";
  if (next === "light") {
    root.setAttribute("data-theme", "light");
  } else {
    root.removeAttribute("data-theme");
  }
  announceTheme(next);
  scheduleSave();
}
```

Dark theme = no `data-theme` attribute. This preserves the CSS default behavior — no attribute needed for the dark theme to work.

- [ ] **Step 3: Add Ctrl+T to the keyboard handler**

In the `keydown` event handler (starting at line 158), add a new branch. Place it after the existing `Ctrl+]` branch (after the `changePadding(5)` block) and before the `Escape` branch:

```js
} else if (e.ctrlKey && e.code === "KeyT") {
  e.preventDefault();
  toggleTheme();
}
```

`event.code === "KeyT"` is used (not `event.key`) for layout independence — same approach as all other letter shortcuts (O, BracketLeft, BracketRight).

- [ ] **Step 4: Manually verify toggle**

Run `pnpm dev`. Press Ctrl+T. Expected:
- Page switches to light theme
- NVDA (or any screen reader) announces "Світла тема"

Press Ctrl+T again. Expected:
- Page switches back to dark theme
- NVDA announces "Темна тема"

Press Ctrl+T before opening any file. Expected: no crash, announcement works.

- [ ] **Step 5: Manually verify persistence after toggle**

Press Ctrl+T to switch to light. Wait 1.5 seconds. Close the app. Reopen. Expected: app opens in light theme.

- [ ] **Step 6: Commit**

```bash
git add src/main.js
git commit -m "feat: add theme toggle (Ctrl+T) with NVDA announcement"
```

---

## Final Verification

- [ ] **Dark theme unchanged:** Open app without any `settings.json` (rename existing one). Expected: dark theme, all existing shortcuts work.

- [ ] **Light theme toggle:** Press Ctrl+T — switches to light. Press again — switches to dark. NVDA announces each change.

- [ ] **Persistence:** Toggle to light → close → reopen → light theme restored. Toggle to dark → close → reopen → dark theme restored.

- [ ] **Backwards compatibility:** Delete `theme` field from `settings.json`. Reopen app. Expected: dark theme (Rust default).

- [ ] **Code blocks visible in both themes:** Open a Markdown file with syntax-highlighted code blocks. In dark theme: light colored tokens on dark background. In light theme: dark colored tokens on light grey background. No token is invisible or unreadable.

- [ ] **Copy button focus visible in light theme:** Tab to a copy button. Expected: blue `#0055cc` outline visible on the button.
