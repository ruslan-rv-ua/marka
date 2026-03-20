# Settings Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Save zoom, padding, window size/position to `settings.json` next to the exe and restore them on startup.

**Architecture:** Two new Tauri commands (`load_settings`, `save_settings`) in Rust handle file I/O next to the exe. The JS frontend loads settings on startup, applies them, then schedules saves with a 1000 ms debounce on every zoom/padding/resize/move event.

**Tech Stack:** Tauri v2, Rust (`serde`, `serde_json`, `std::fs`), plain JS (`@tauri-apps/api/core`, `@tauri-apps/api/window`)

**Note:** No test suite is configured in this project. TDD steps are replaced with build + manual verification steps.

**Spec:** `docs/superpowers/specs/2026-03-20-settings-persistence-design.md`

---

## File Map

| File | Change |
|---|---|
| `src-tauri/src/lib.rs` | Add `Settings` struct + `Default`, `load_settings` command, `save_settings` command, register both in `invoke_handler` |
| `src/main.js` | Add `PhysicalPosition`/`PhysicalSize` imports, load+apply settings on startup, `scheduleSave` debounce function, wire to `changeFontSize`/`changePadding`, register `onResized`/`onMoved` |

---

## Task 1: Add `Settings` struct to Rust

**Files:**
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Add `Settings` struct with `Default` impl**

Open `src-tauri/src/lib.rs`. After the existing `OpenedFile` struct (after line 8), add:

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
        }
    }
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd src-tauri && cargo check
```

Expected: no errors. If you see "unused" warnings for fields that's fine.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: add Settings struct with Default impl"
```

---

## Task 2: Add `load_settings` Tauri command

**Files:**
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Add the `load_settings` function**

After the `Settings` impl block, add:

```rust
#[tauri::command]
fn load_settings() -> Settings {
    let path = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.join("settings.json")));

    let Some(path) = path else {
        return Settings::default();
    };

    let Ok(contents) = std::fs::read_to_string(&path) else {
        return Settings::default();
    };

    serde_json::from_str(&contents).unwrap_or_default()
}
```

- [ ] **Step 2: Register in `invoke_handler`**

In the `run()` function, update `.invoke_handler(...)`:

```rust
.invoke_handler(tauri::generate_handler![read_file, open_file_dialog, load_settings])
```

- [ ] **Step 3: Verify it compiles**

```bash
cd src-tauri && cargo check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: add load_settings Tauri command"
```

---

## Task 3: Add `save_settings` Tauri command

**Files:**
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Add the `save_settings` function**

After `load_settings`, add:

```rust
#[tauri::command]
fn save_settings(settings: Settings) -> Result<(), String> {
    // Bind to a variable first — .parent() borrows from the PathBuf,
    // so the PathBuf must outlive the borrow.
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let path = exe
        .parent()
        .ok_or("Не вдалося визначити папку exe")?
        .join("settings.json");

    let json = serde_json::to_string_pretty(&settings)
        .map_err(|e| e.to_string())?;

    std::fs::write(&path, json).map_err(|e| e.to_string())
}
```

- [ ] **Step 2: Register in `invoke_handler`**

```rust
.invoke_handler(tauri::generate_handler![read_file, open_file_dialog, load_settings, save_settings])
```

- [ ] **Step 3: Verify it compiles**

```bash
cd src-tauri && cargo check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: add save_settings Tauri command"
```

---

## Task 4: Load and apply settings on JS startup

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Add `PhysicalPosition` and `PhysicalSize` to the imports**

At the top of `src/main.js`, find the existing window import line:

```js
import { getCurrentWindow } from "@tauri-apps/api/window";
```

Replace it with:

```js
import { getCurrentWindow, PhysicalPosition, PhysicalSize } from "@tauri-apps/api/window";
```

- [ ] **Step 2: Add `applySettings` function**

After the `root` constant (after `const root = document.documentElement;`), add:

```js
async function applySettings() {
  const s = await invoke("load_settings");
  root.style.setProperty("--font-size", `${s.fontSize}px`);
  root.style.setProperty("--padding-x", `${s.paddingX}%`);

  const win = getCurrentWindow();
  if (s.windowMaximized) {
    await win.maximize();
  } else if (s.windowX !== null && s.windowY !== null) {
    await win.setPosition(new PhysicalPosition(s.windowX, s.windowY));
    await win.setSize(new PhysicalSize(s.windowWidth, s.windowHeight));
  }
}
```

- [ ] **Step 3: Call `applySettings` at the bottom of the file**

The file currently ends with `checkCliArgs();`. The module is `type="module"` in `index.html`, so top-level `await` is valid. Replace the final line:

```js
// before:
checkCliArgs();

// after:
await applySettings();
checkCliArgs();  // intentionally not awaited — CLI open is independent of settings
```

- [ ] **Step 4: Verify visually**

```bash
pnpm dev
```

Open the app. Default font size and padding should look identical to before (16px, 10%). No `settings.json` file yet → defaults are used. Resize the window — nothing saved yet (scheduleSave not wired yet).

- [ ] **Step 5: Commit**

```bash
git add src/main.js
git commit -m "feat: load and apply settings on startup"
```

---

## Task 5: Add `scheduleSave` debounce function

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Add `scheduleSave` after `applySettings`**

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
    }).catch(err => console.error("save_settings failed:", err));
  }, 1000);
}
```

- [ ] **Step 2: Compile check (dev server)**

```bash
pnpm vite:build
```

Expected: no JS errors. The function exists but isn't called yet.

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat: add scheduleSave debounce function"
```

---

## Task 6: Wire `scheduleSave` to zoom/padding changes and window events

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Call `scheduleSave()` in `changeFontSize`**

Find `changeFontSize`:

```js
function changeFontSize(delta) {
  const current = parseFloat(getComputedStyle(root).getPropertyValue("--font-size"));
  const next = Math.min(72, Math.max(10, current + delta));
  root.style.setProperty("--font-size", `${next}px`);
}
```

Add `scheduleSave()` call at the end:

```js
function changeFontSize(delta) {
  const current = parseFloat(getComputedStyle(root).getPropertyValue("--font-size"));
  const next = Math.min(72, Math.max(10, current + delta));
  root.style.setProperty("--font-size", `${next}px`);
  scheduleSave();
}
```

- [ ] **Step 2: Call `scheduleSave()` in `changePadding`**

```js
function changePadding(delta) {
  const current = parseFloat(getComputedStyle(root).getPropertyValue("--padding-x"));
  const next = Math.min(25, Math.max(0, current + delta));
  root.style.setProperty("--padding-x", `${next}%`);
  scheduleSave();
}
```

- [ ] **Step 3: Register window events in `applySettings`**

At the end of the `applySettings` function, add the window event listeners:

```js
  // UnlistenFn return values intentionally discarded — single-window app, no teardown needed
  await win.onResized(() => scheduleSave());
  await win.onMoved(() => scheduleSave());
```

The full `applySettings` function now ends with these two lines before the closing `}`.

- [ ] **Step 4: Manual verification**

```bash
pnpm dev
```

1. Resize the window → wait 1 second → check that `settings.json` appears in the same folder as the dev build output (during dev this is next to the Tauri dev binary, typically `src-tauri/target/debug/marka.exe` → look in `src-tauri/target/debug/`)
2. Change font size (Ctrl+=) → wait 1 second → open `settings.json` → `fontSize` should reflect the change
3. Close and reopen the app → font size and window size/position should be restored

- [ ] **Step 5: Commit**

```bash
git add src/main.js
git commit -m "feat: wire scheduleSave to zoom, padding, resize, move events"
```

---

## Task 7: End-to-end smoke test

- [ ] **Step 1: Build release**

```bash
pnpm build --no-bundle
```

Expected: build succeeds, `src-tauri/target/release/marka.exe` produced.

- [ ] **Step 2: Run and verify settings.json location**

Open `src-tauri/target/release/marka.exe`. Check that `src-tauri/target/release/settings.json` is created after the window moves or resizes.

- [ ] **Step 3: Verify round-trip**

1. Resize window to a non-default size
2. Change zoom (Ctrl+=)
3. Wait 1 second
4. Close the app
5. Reopen — window should restore to the same size/position/zoom

- [ ] **Step 4: Verify first-run (no settings file)**

Delete `settings.json` from the release folder, reopen the app. Should open at 800×600 with default font size and padding. No errors.

- [ ] **Step 5: Verify corrupt file resilience**

Write garbage to `settings.json` (e.g., `{broken json`), reopen the app. Should fall back to defaults silently.

- [ ] **Step 6: Final commit if any fixes needed**

```bash
git add -p
git commit -m "fix: <describe any fixes found during smoke test>"
```
