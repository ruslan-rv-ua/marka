# Remove Menu & Add Keyboard Shortcuts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the native Tauri menu and replace all commands with JS keyboard shortcuts, keeping NVDA browse mode fully functional.

**Architecture:** Delete all Rust menu code, add a new `open_file_dialog` Tauri command for the file dialog, move all shortcut handling to a single JS `keydown` listener, and introduce CSS custom properties for font size and padding.

**Tech Stack:** Tauri v2, Rust, vanilla JavaScript, CSS custom properties

**Spec:** `docs/superpowers/specs/2026-03-19-remove-menu-keyboard-shortcuts-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src-tauri/src/lib.rs` | Modify | Remove menu, add `open_file_dialog` command |
| `src/main.js` | Modify | Replace event listener + Escape handler with keydown router |
| `src/styles.css` | Modify | Add `--font-size` and `--padding-x` CSS custom properties |

No new files created. No changes to `index.html`, `tauri.conf.json`, or `Cargo.toml`.

---

### Task 1: Remove menu and add `open_file_dialog` command (Rust)

**Files:**
- Modify: `src-tauri/src/lib.rs:1-67`

- [ ] **Step 1: Replace the entire `lib.rs` with menu-free version**

Replace the full contents of `src-tauri/src/lib.rs` with:

```rust
use tauri_plugin_dialog::DialogExt;
use std::fs;

#[derive(serde::Serialize)]
pub struct OpenedFile {
    path: String,
    content: String,
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Не вдалося прочитати файл: {}", e))
}

#[tauri::command]
fn open_file_dialog(app: tauri::AppHandle) -> Result<Option<OpenedFile>, String> {
    let file_path = app
        .dialog()
        .file()
        .add_filter("Markdown", &["md"])
        .blocking_pick_file();

    match file_path {
        Some(fp) => {
            let path = fp.to_string();
            let content = fs::read_to_string(fp.as_path().ok_or("Невірний шлях")?)
                .map_err(|e| format!("Не вдалося прочитати файл: {}", e))?;
            Ok(Some(OpenedFile { path, content }))
        }
        None => Ok(None),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_cli::init())
        .invoke_handler(tauri::generate_handler![read_file, open_file_dialog])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

Key changes:
- Removed: `MenuBuilder`, `SubmenuBuilder`, `MenuItemBuilder`, `Emitter`, `on_menu_event`, entire `setup` block
- Added: `OpenedFile` struct, `open_file_dialog` command using `blocking_pick_file()`
- `open_file_dialog` returns `Ok(None)` when user cancels

- [ ] **Step 2: Verify Rust compiles**

Run: `cd src-tauri && cargo check`
Expected: compiles with no errors

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "refactor: remove native menu, add open_file_dialog command"
```

---

### Task 2: Add CSS custom properties for font size and padding

**Files:**
- Modify: `src/styles.css:1-14` (`:root` block)
- Modify: `src/styles.css:22-28` (`html, body` block)
- Modify: `src/styles.css:30-35` (`#content` block)

- [ ] **Step 1: Add custom properties to `:root`**

In `src/styles.css`, add two new properties to the existing `:root` block, after `--blockquote-bg`:

```css
--font-size: 16px;
--padding-x: 32px;
```

- [ ] **Step 2: Use `--font-size` in `html, body` rule**

Replace the hardcoded `font-size: 16px;` on line 26 with:

```css
font-size: var(--font-size);
```

- [ ] **Step 3: Use `--padding-x` in `#content` rule**

Replace `padding: 24px 32px;` on line 33 with:

```css
padding: 24px var(--padding-x);
```

- [ ] **Step 4: Verify visually**

Run: `pnpm dev`
Expected: app looks identical to before (same 16px font, same 32px horizontal padding)

- [ ] **Step 5: Commit**

```bash
git add src/styles.css
git commit -m "refactor: extract font-size and padding-x into CSS custom properties"
```

---

### Task 3: Replace event listeners with keydown router (JS)

**Files:**
- Modify: `src/main.js:1-76`

- [ ] **Step 1: Remove `listen` import**

Replace line 2:
```js
import { listen } from "@tauri-apps/api/event";
```
with nothing (delete the line).

- [ ] **Step 2: Add helper functions after `contentEl` declaration (after line 22)**

Insert after `const contentEl = document.getElementById("content");`:

```js
const root = document.documentElement;

function changeFontSize(delta) {
  const current = parseFloat(getComputedStyle(root).getPropertyValue("--font-size"));
  const next = Math.max(10, current + delta);
  root.style.setProperty("--font-size", `${next}px`);
}

function changePadding(delta) {
  const current = parseFloat(getComputedStyle(root).getPropertyValue("--padding-x"));
  const next = Math.min(128, Math.max(0, current + delta));
  root.style.setProperty("--padding-x", `${next}px`);
}
```

- [ ] **Step 3: Replace the `listen("open-file", ...)` block and Escape handler with a single keydown router**

Remove lines 52-62 (the `listen("open-file", ...)` block and the Escape `keydown` listener). Replace with:

```js
document.addEventListener("keydown", async (e) => {
  if (e.ctrlKey && e.key === "o") {
    e.preventDefault();
    const result = await invoke("open_file_dialog");
    if (result) {
      renderFile(result.path);
    }
  } else if (e.ctrlKey && (e.key === "=" || e.key === "+")) {
    e.preventDefault();
    changeFontSize(1);
  } else if (e.ctrlKey && e.key === "-") {
    e.preventDefault();
    changeFontSize(-1);
  } else if (e.ctrlKey && e.key === "[") {
    e.preventDefault();
    changePadding(-8);
  } else if (e.ctrlKey && e.key === "]") {
    e.preventDefault();
    changePadding(8);
  } else if (e.key === "Escape") {
    getCurrentWindow().close();
  }
});
```

Note: `e.key === "="` covers both `=` and `+` (Shift+=) on standard keyboards. The `|| e.key === "+"` handles edge cases.

- [ ] **Step 4: Update `renderFile` for `open_file_dialog` flow**

The existing `renderFile(filePath)` calls `invoke("read_file", { path: filePath })` to get content. For Ctrl+O, the `open_file_dialog` command already returns `{ path, content }`. To avoid reading the file twice, add an optional `content` parameter:

Replace the `renderFile` function signature and first line of the try block:

```js
async function renderFile(filePath, preloadedContent) {
  try {
    const markdown = preloadedContent || await invoke("read_file", { path: filePath });
```

Then update the Ctrl+O handler to pass content:
```js
if (result) {
  renderFile(result.path, result.content);
}
```

- [ ] **Step 5: Verify all shortcuts work**

Run: `pnpm dev`
Test:
1. Ctrl+O → file dialog opens, select .md file → renders
2. Ctrl+O → cancel dialog → nothing happens (no error)
3. Ctrl+= → font size increases
4. Ctrl+- → font size decreases (stops at 10px)
5. Ctrl+[ → padding decreases (stops at 0)
6. Ctrl+] → padding increases (stops at 128px)
7. Escape → window closes

- [ ] **Step 6: Commit**

```bash
git add src/main.js
git commit -m "feat: replace menu with keyboard shortcuts for file open, font size, padding"
```

---

### Task 4: Build and verify

- [ ] **Step 1: Run full build**

Run: `pnpm build`
Expected: builds successfully with no errors

- [ ] **Step 2: Test NVDA compatibility**

Launch the built app, open a .md file with headings and lists:
1. NVDA stays in browse mode (no focus mode switch)
2. Press H → jumps to next heading
3. Press L → jumps to next list
4. Press K → jumps to next link
5. Ctrl+O → file dialog opens (NVDA announces dialog)
6. Ctrl+= / Ctrl+- → font changes (NVDA does not interfere)

- [ ] **Step 3: Commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address issues found during NVDA testing"
```
