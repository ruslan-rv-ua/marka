# Remove Native Menu, Replace with Keyboard Shortcuts

**Date:** 2026-03-19
**Status:** Approved

## Problem

Marka uses a native Tauri menu. To access it, NVDA users must switch to focus mode, which is inconvenient when reading markdown in browse mode. The goal is to remove the menu entirely and handle all commands via keyboard shortcuts that work alongside NVDA browse mode navigation.

## Constraints

- NVDA in browse mode intercepts single-letter keys (H, L, K, T, 1-6, etc.) for navigation. These must remain available.
- All app shortcuts must use modifier keys (Ctrl+key) or special keys (Escape) so NVDA does not intercept them.
- WebView2 (Chromium) intercepts Ctrl+= / Ctrl+- for page zoom. These must be suppressed via `preventDefault()` to use them for font size instead.
- `role="document"` on the content container keeps NVDA in browse mode. This must not change.

## Design

### Rust Changes (src-tauri/src/lib.rs)

**Remove:**
- All menu-related code: `MenuBuilder`, `SubmenuBuilder`, `MenuItemBuilder` construction
- `on_menu_event` handler
- Menu-related imports from `tauri::menu`

**Add:**
- `open_file_dialog` Tauri command — opens native file dialog for .md files using `dialog().file().add_filter("Markdown", &["md"]).blocking_pick_file()`. If user selects a file, reads it and returns `Some({ path: String, content: String })`. If user cancels the dialog, returns `None` (not an error). The frontend ignores `None` results silently.

**Also remove:**
- `Emitter` import (only used by the removed menu event handler)

**Keep unchanged:**
- `read_file` command
- CLI plugin setup
- `tauri-plugin-dialog` dependency

### JavaScript Changes (src/main.js)

**Replace** the current `listen("open-file", ...)` event listener and separate Escape handler with a single `keydown` event router. Remove the `listen` import from `@tauri-apps/api/event` (no longer used).

| Shortcut | Action | Details |
|----------|--------|---------|
| Ctrl+O | Open file | Calls `invoke("open_file_dialog")`, renders result |
| Ctrl+= | Increase font size | `preventDefault()`, CSS `--font-size` +1px |
| Ctrl+- | Decrease font size | `preventDefault()`, CSS `--font-size` -1px (minimum enforced) |
| Ctrl+[ | Decrease horizontal padding | CSS `--padding-x` -8px, minimum 0 |
| Ctrl+] | Increase horizontal padding | CSS `--padding-x` +8px |
| Escape | Close window | `getCurrentWindow().close()` |

**Helper functions:**
- `changeFontSize(delta)` — reads current `--font-size` from `:root`, applies delta, sets new value
- `changePadding(delta)` — reads current `--padding-x` from `:root`, applies delta, sets new value

### CSS Changes (src/styles.css)

**Add** CSS custom properties on `:root`:
- `--font-size: 16px` (default, minimum `10px`) — replaces the hardcoded `16px` in the `html, body` rule with `font-size: var(--font-size)`. Headings use `em` units so they scale proportionally.
- `--padding-x: 32px` (default, minimum `0px`, maximum `128px`) — used by `#content` for left/right padding

**Update** existing rules to reference these custom properties instead of hardcoded values.

### No Changes

- `src/index.html` — `role="document"`, `aria-label`, `tabindex` remain as-is
- `src-tauri/tauri.conf.json` — no menu config to remove, CLI plugin stays
- `src-tauri/Cargo.toml` — dependencies unchanged
- All accessibility attributes preserved

## NVDA Compatibility

- All shortcuts use Ctrl modifier or Escape — NVDA does not intercept these in browse mode
- Single-letter NVDA navigation (H, L, K, T, etc.) continues to work unaffected
- `role="document"` keeps NVDA in browse mode at all times
- No `role="application"` is introduced

## Settings Persistence

Not included in this iteration. Font size and padding reset to defaults on each app launch. Persistence planned for a future version.
