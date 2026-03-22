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

**Variant B + B1:** Separate `.md` files per locale, compiled into the binary via Rust `include_str!`. Version injected by Rust at runtime using `app.package_info().version`.

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

- Add `include_str!` constants for both help `.md` files
- Add Tauri command `get_help(locale: String, app: AppHandle) -> Result<String, String>`
  - Selects markdown by locale (`"uk"` → `help.uk.md`, else `help.en.md`)
  - Replaces `{version}` placeholder with `app.package_info().version.to_string()`
  - Returns the resulting markdown string
- Register `get_help` in `invoke_handler`

Version source: `app.package_info().version` — reads from `tauri.conf.json`, always in sync.

### JS changes (`main.js`)

- Add `showHelp()` async function:
  - Calls `invoke("get_help", { locale: getLocale() })`
  - Renders via `marked.parse()` → `DOMPurify.sanitize()` → `contentEl.innerHTML`
  - Does NOT update window title (stays "Marka")
  - Applies NVDA focus cycle: `contentEl.blur()` → `requestAnimationFrame(() => contentEl.focus())`
- In startup sequence: after `initializeLocale()` and `applySettings()`, call `showHelp()` — but only if `checkCliArgs()` finds no file argument
  - Since `checkCliArgs` is async and currently not awaited, refactor startup to: await `checkCliArgs()`, if no file opened → call `showHelp()`

### HTML changes (`index.html`)

- Remove `<p id="initial-message"></p>` — no longer needed
- Remove `document.getElementById("initial-message").textContent = t("initial.message")` from JS

### Locale JSON changes

- Remove `"initial.message"` key from `uk.json` and `en.json`

## Help file content

### `help.uk.md`

```markdown
# Marka {version}

Переглядач Markdown файлів для Windows.

## Використання

Відкрити файл: **Ctrl+O** або передати шлях аргументом командного рядка:

```
marka.exe шлях\до\файлу.md
```

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

```markdown
# Marka {version}

Markdown file viewer for Windows.

## Usage

Open a file: **Ctrl+O** or pass the path as a command-line argument:

```
marka.exe path\to\file.md
```

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

## Startup sequence (revised)

```
initializeLocale()       — loads translations, sets lang attr
applySettings()          — applies font size, padding, theme, registers window listeners
fileOpened = await checkCliArgs()   — returns true if file was opened via CLI
if (!fileOpened) showHelp()         — render help screen
```

`checkCliArgs()` must be refactored to return a boolean indicating whether a file was opened.

## Constraints

- Help is read-only, no `currentFilePath` set — local link clicks will not resolve
- NVDA accessibility: same focus cycle as regular file render
- DOMPurify sanitization applied — same as regular render
- No copy buttons added to code blocks in help screen (the code block shows a CLI command, not code to copy — acceptable)
