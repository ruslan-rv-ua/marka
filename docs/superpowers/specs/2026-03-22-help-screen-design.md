# Spec: Help Screen on Startup

**Date:** 2026-03-22
**Status:** Approved

## Problem

When the app launches without a file argument, it shows a plain text message "Press Ctrl+O to open a file." This is unhelpful — the user gets no overview of the app's features or keyboard shortcuts.

## Goal

Replace the initial message with a full help screen rendered as Markdown, showing:
- App name and version (H1)
- One-line description
- Usage instructions (including CLI argument)
- Keyboard shortcuts table

## Approach

**Variant B + B1:** Separate `.md` files per locale, compiled into the binary via Rust `include_str!`. Version injected by Rust at runtime using `app.package_info().version.to_string()`.

Rejected alternatives:
- Variant A (Markdown string inside JSON): awkward multiline JSON, hard to edit
- Variant C (hardcoded in JS): breaks localization

## Architecture

### Data flow

```
App launch without --file argument
  → JS: showHelp() called after initializeLocale()
  → JS: invoke("get_help", { locale })
  → Rust: selects help.{locale}.md, replaces {version}, returns markdown string
  → JS: marked.parse() → DOMPurify.sanitize() → contentEl.innerHTML
  → Window title stays "Marka" (no file name)
```

### New files

- `src-tauri/src/locales/help.uk.md` — Ukrainian help
- `src-tauri/src/locales/help.en.md` — English help

### Rust changes (`lib.rs`)

- Add `include_str!` constants for both help `.md` files:
  ```rust
  const HELP_UK: &str = include_str!("locales/help.uk.md");
  const HELP_EN: &str = include_str!("locales/help.en.md");
  ```
- Add Tauri command (Tauri v2 injects `AppHandle` by type from context, position doesn't matter):
  ```rust
  fn get_help(locale: String, app: tauri::AppHandle) -> Result<String, String>
  ```
  - Selects markdown by locale (`"uk"` → `HELP_UK`, else `HELP_EN`); unrecognized locale defaults to EN
  - Replaces `{version}` placeholder: `app.package_info().version` is `semver::Version`; call `.to_string()` on it
  - Returns the resulting markdown string
- Register `get_help` in `invoke_handler`

Version source: `app.package_info().version` — reads from `tauri.conf.json`, always in sync with the released binary.

### JS changes (`main.js`)

- Add `showHelp()` async function:
  - Calls `invoke("get_help", { locale: getLocale() })`
  - Renders via `marked.parse()` → `DOMPurify.sanitize()` → `contentEl.innerHTML`
  - Applies NVDA ARIA attributes to `<pre>` elements: `role="region"`, `aria-label` using `t("code.label", { index })` (same key as `renderFile`, intentionally reused — NVDA will announce "Код 1 — " which is acceptable for the single CLI example block), `tabindex="0"` — **no copy buttons**
  - Applies NVDA focus cycle: `contentEl.blur()` → `requestAnimationFrame(() => contentEl.focus())`
  - Does NOT set `currentFilePath`
  - Does NOT update window title (stays "Marka")
  - On error: renders a plain-text error message inside `contentEl` with `role="alert"`, same pattern as `renderFile`
- Refactor `checkCliArgs()` to return a boolean:
  - Returns `true` if a file was opened, `false` otherwise
  - **Must `await renderFile(...)` internally** before returning `true` — this prevents a race condition where `showHelp()` could overwrite an in-progress file render. `renderFile` catches all errors internally and never throws, so no additional try/catch is needed around it inside `checkCliArgs`
  - On internal error (e.g., CLI plugin not initialized): keep the existing internal `try/catch`, log the warning, and **return `false`** — do not re-throw. The outer startup sequence then calls `showHelp()` normally
- `getLocale()` is guaranteed to be set before `showHelp()` is called (after `initializeLocale()` succeeds). If `initializeLocale()` itself failed, `getLocale()` returns the default `"en"`, and `get_help` will return the English help — acceptable fallback
- Revised startup sequence:

  ```
  initializeLocale()        — loads translations, sets lang attr
  applySettings()           — applies font size, padding, theme, window listeners
  fileOpened = await checkCliArgs()
  if (!fileOpened) await showHelp()
  ```

  Since `checkCliArgs` handles its own errors internally and returns `false` on failure (see above), no outer catch is needed for it. Startup structure:

  ```js
  try {
    await initializeLocale();
    await applySettings();
  } catch (err) {
    console.error("Initialization failed:", err);
  }
  const fileOpened = await checkCliArgs();  // never throws
  if (!fileOpened) await showHelp();
  ```

### HTML changes (`index.html`) — atomic change with JS

These two changes must be made together. Removing the element without removing the JS line causes a `TypeError` at startup (setting `.textContent` on `null`).

- Remove `<p id="initial-message"></p>` from `index.html`
- Remove `document.getElementById("initial-message").textContent = t("initial.message")` from `main.js` (`initializeLocale` function)

### Locale JSON changes

- Remove `"initial.message"` key from `uk.json` and `en.json`

## Help file content

The actual `.md` files use a 4-space indented code block for the CLI example (to avoid nested fencing issues):

### `help.uk.md`

```
# Marka {version}

Переглядач Markdown файлів для Windows.

## Використання

Відкрити файл: **Ctrl+O** або передати шлях аргументом командного рядка:

    marka.exe шлях\до\файлу.md

## Гарячі клавіші

| Клавіша | Дія |
|---|---|
| Ctrl+O | Відкрити файл |
| Ctrl+= / Ctrl+- | Збільшити / зменшити шрифт |
| Ctrl+Num+ / Ctrl+Num- | Збільшити / зменшити шрифт |
| Ctrl+] / Ctrl+[ | Збільшити / зменшити відступи |
| Ctrl+T | Перемкнути тему (темна/світла) |
| Escape | Закрити програму |
```

### `help.en.md`

```
# Marka {version}

Markdown file viewer for Windows.

## Usage

Open a file: **Ctrl+O** or pass the path as a command-line argument:

    marka.exe path\to\file.md

## Keyboard Shortcuts

| Key | Action |
|---|---|
| Ctrl+O | Open file |
| Ctrl+= / Ctrl+- | Increase / decrease font size |
| Ctrl+Num+ / Ctrl+Num- | Increase / decrease font size |
| Ctrl+] / Ctrl+[ | Increase / decrease padding |
| Ctrl+T | Toggle theme (dark/light) |
| Escape | Close application |
```

## Constraints

- Help is read-only, no `currentFilePath` set — local link clicks will not resolve
- NVDA accessibility: `<pre>` elements get `role="region"`, `aria-label`, `tabindex="0"` (same as regular render) but **no copy buttons**
- DOMPurify sanitization applied — same as regular render
- Window title stays "Marka" when help is shown
