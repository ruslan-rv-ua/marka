# Settings Persistence — Design Spec

**Date:** 2026-03-20
**Status:** Approved

## Overview

Persist user preferences (zoom, padding, window size/position) to `settings.json` next to the executable. Settings are loaded on startup and saved with a 1000 ms debounce after each change.

## Data Structure

`settings.json` placed in the same directory as the running exe:

```json
{
  "font_size": 16,
  "padding_x": 10,
  "window_width": 800,
  "window_height": 600,
  "window_x": null,
  "window_y": null
}
```

| Field | Type | Default | Range |
|---|---|---|---|
| `font_size` | `f64` | `16.0` | 10–72 |
| `padding_x` | `f64` | `10.0` | 0–25 |
| `window_width` | `f64` | `800.0` | — |
| `window_height` | `f64` | `600.0` | — |
| `window_x` | `Option<f64>` | `null` | — |
| `window_y` | `Option<f64>` | `null` | — |

`window_x`/`window_y` being `null` means the OS positions the window (first run behavior).

Missing file or missing fields → use defaults, no error.

## Rust (`src-tauri/src/lib.rs`)

### `Settings` struct

```rust
#[derive(serde::Serialize, serde::Deserialize)]
pub struct Settings {
    pub font_size: f64,
    pub padding_x: f64,
    pub window_width: f64,
    pub window_height: f64,
    pub window_x: Option<f64>,
    pub window_y: Option<f64>,
}
```

Implements `Default` with values matching current CSS/`tauri.conf.json` defaults.

### `load_settings` command

- Resolves path via `std::env::current_exe()?.parent()? / "settings.json"`
- If file missing or JSON parse error → returns `Settings::default()`
- Returns `Settings` (never errors to frontend)

### `save_settings(settings: Settings)` command

- Serializes to pretty-printed JSON
- Writes to the same path as above
- Returns `Result<(), String>`

Both commands registered in `invoke_handler`.

## JS (`src/main.js`)

### Startup sequence

```
invoke("load_settings")
  → apply --font-size and --padding-x on :root
  → if window_x/window_y not null → setPosition() + setSize()
```

### Debounce save

Single shared `scheduleSave()` function — clears and restarts a 1000 ms timer:

```js
let saveTimer = null;
async function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const size = await getCurrentWindow().outerSize();
    const pos = await getCurrentWindow().outerPosition();
    await invoke("save_settings", {
      settings: {
        font_size: currentFontSize(),
        padding_x: currentPaddingX(),
        window_width: size.width,
        window_height: size.height,
        window_x: pos.x,
        window_y: pos.y,
      }
    });
  }, 1000);
}
```

### Triggers for `scheduleSave`

- After `changeFontSize()` (Ctrl+=, Ctrl+-)
- After `changePadding()` (Ctrl+[, Ctrl+])
- On `tauri://resize` window event
- On `tauri://move` window event

Window events registered once at startup after settings are loaded.

## Error Handling

- `load_settings`: always returns defaults on any failure — no UI error shown
- `save_settings`: logs error to console on failure — no UI error shown (non-critical)

## Files Changed

| File | Change |
|---|---|
| `src-tauri/src/lib.rs` | Add `Settings` struct, `load_settings`, `save_settings`, register commands |
| `src/main.js` | Load settings on startup, `scheduleSave` with debounce, window event listeners |
