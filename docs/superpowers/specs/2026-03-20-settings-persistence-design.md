# Settings Persistence — Design Spec

**Date:** 2026-03-20
**Status:** Approved

## Overview

Persist user preferences (zoom, padding, window size/position) to `settings.json` next to the executable. Settings are loaded on startup and saved with a 1000 ms debounce after each change.

## Data Structure

`settings.json` placed in the same directory as the running exe:

```json
{
  "fontSize": 16,
  "paddingX": 10,
  "windowWidth": 800,
  "windowHeight": 600,
  "windowX": null,
  "windowY": null,
  "windowMaximized": false
}
```

Fields use **camelCase** to match Tauri v2's default JS↔Rust serde serialization convention.

| Field | Type | Default | Range |
|---|---|---|---|
| `fontSize` | `f64` | `16.0` | 10–72 |
| `paddingX` | `f64` | `10.0` | 0–25 |
| `windowWidth` | `f64` | `800.0` | — |
| `windowHeight` | `f64` | `600.0` | — |
| `windowX` | `Option<f64>` | `null` | — |
| `windowY` | `Option<f64>` | `null` | — |
| `windowMaximized` | `bool` | `false` | — |

`windowX`/`windowY` being `null` means the OS positions the window (first run behavior).

Missing file or missing/extra fields → use field-level defaults via `#[serde(default)]`, no error.

**Out of scope:** off-screen guard (window position outside visible monitors) — not handled in this iteration.

## Rust (`src-tauri/src/lib.rs`)

### `Settings` struct

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
}
```

- `#[serde(rename_all = "camelCase")]` — maps Rust `snake_case` fields to JSON `camelCase`
- `#[serde(default)]` on the struct — missing fields in JSON fall back to `Default::default()`
- Implements `Default`: `font_size=16.0`, `padding_x=10.0`, `window_width=800.0`, `window_height=600.0`, `window_x=None`, `window_y=None`, `window_maximized=false`

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
  → if windowMaximized → maximize()
  → else if windowX/windowY not null → new PhysicalPosition(windowX, windowY) + new PhysicalSize(windowWidth, windowHeight)
                                        → setPosition() + setSize()
```

Imports needed: `PhysicalPosition`, `PhysicalSize` from `@tauri-apps/api/window` (re-exported there from `@tauri-apps/api/dpi`).

Window geometry values (`windowWidth`, `windowHeight`, `windowX`, `windowY`) are physical pixels stored as `f64` for serde simplicity — they are always whole numbers in practice.

The startup sequence runs as part of the top-level module initialization. Tauri guarantees the window handle is available by the time any JS executes, so no `DOMContentLoaded` guard is needed for `setPosition`/`setSize`.

### Debounce save

Single shared `scheduleSave()` — clears and restarts a 1000 ms timer:

```js
let saveTimer = null;
async function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const win = getCurrentWindow();
    const maximized = await win.isMaximized();
    const size = await win.outerSize();
    const pos = await win.outerPosition();
    await invoke("save_settings", {
      settings: {
        fontSize: parseFloat(getComputedStyle(root).getPropertyValue("--font-size")),
        paddingX: parseFloat(getComputedStyle(root).getPropertyValue("--padding-x")),
        windowWidth: size.width,
        windowHeight: size.height,
        windowX: pos.x,
        windowY: pos.y,
        windowMaximized: maximized,
      }
    });
  }, 1000);
}
```

When `windowMaximized` is `true`, size/position are still saved so they can be restored if the user later un-maximizes.

### Window event registration (at startup, after settings applied)

```js
// UnlistenFn return values intentionally discarded — single-window app, no teardown needed
await getCurrentWindow().onResized(() => scheduleSave());
await getCurrentWindow().onMoved(() => scheduleSave());
```

### Triggers for `scheduleSave`

- After `changeFontSize()` (Ctrl+=, Ctrl+-)
- After `changePadding()` (Ctrl+[, Ctrl+])
- On `onResized` window event
- On `onMoved` window event

## Error Handling

- `load_settings`: always returns defaults on any failure — no UI error shown
- `save_settings`: logs error to console on failure — no UI error shown (non-critical)

## Files Changed

| File | Change |
|---|---|
| `src-tauri/src/lib.rs` | Add `Settings` struct with `Default`, `load_settings`, `save_settings`, register commands |
| `src/main.js` | Load+apply settings on startup, `scheduleSave` with 1000 ms debounce, `onResized`/`onMoved` listeners, import `PhysicalPosition`/`PhysicalSize` |
