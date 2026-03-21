# Link Opening & Session History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable users to click links in Markdown — external URLs open in browser, local file paths open in Marka, with in-memory session history.

**Architecture:** Minimal MVP approach. Frontend event listener intercepts `<a>` clicks, routes to browser or file handler based on URL prefix. Backend adds single new command to open URLs. No UI changes.

**Tech Stack:** Tauri v2, marked.js, `open` crate v5.0

---

## File Structure

| File | Change | Purpose |
|------|--------|---------|
| `src-tauri/Cargo.toml` | Add `open = "5.0"` | Dependency for opening browser/URLs |
| `src-tauri/src/lib.rs` | Add `open_url` command | Tauri command to open URL in system browser |
| `src/main.js` | Add event listener + history array | Handle link clicks, route to correct handler |

---

## Task 1: Add `open` Crate Dependency

**Files:**
- Modify: `src-tauri/Cargo.toml`

- [ ] **Step 1: Open Cargo.toml and locate dependencies section**

File: `src-tauri/Cargo.toml`
Look for `[dependencies]` section (around line 12-20)

- [ ] **Step 2: Add open crate**

After existing dependencies, add:
```toml
open = "5.0"
```

**Complete dependencies section should look like:**
```toml
[dependencies]
serde_json = "1"
serde = { version = "1.0", features = ["derive"] }
tauri = { version = "2", features = ["macos-private-api", "protocol-multipart"] }
tauri-build = "2"
tauri-plugin-dialog = "2"
tauri-plugin-cli = "2"
sys-locale = "0.3"
open = "5.0"
```

- [ ] **Step 3: Verify syntax**

Check that `open = "5.0"` is properly indented and follows same format as other dependencies.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/Cargo.toml
git commit -m "deps: add open crate for opening browser URLs"
```

---

## Task 2: Add `open_url` Command to Backend

**Files:**
- Modify: `src-tauri/src/lib.rs:1-10` (add import)
- Modify: `src-tauri/src/lib.rs:76-100` (add command before `open_file_dialog`)
- Modify: `src-tauri/src/lib.rs:147-154` (update invoke_handler)

- [ ] **Step 1: Add import at top of file**

After line 3 (`use std::fs;`), add:
```rust
use open;
```

**Lines 1-4 should now be:**
```rust
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;
use std::fs;
use open;
```

- [ ] **Step 2: Add new `open_url` command**

Before `open_file_dialog` function (around line 77), add:

```rust
#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    open::that(&url)
        .map_err(|e| format!("Не вдалося відкрити посилання: {}", e))
}
```

**Full location:** Between `read_file` (line 73-75) and `open_file_dialog` (line 77)

- [ ] **Step 3: Update invoke_handler**

Find this section (around line 147):
```rust
.invoke_handler(tauri::generate_handler![
    read_file,
    open_file_dialog,
    load_settings,
    save_settings,
    detect_system_locale,
    get_translations,
])
```

Add `open_url` to the list:
```rust
.invoke_handler(tauri::generate_handler![
    read_file,
    open_file_dialog,
    open_url,
    load_settings,
    save_settings,
    detect_system_locale,
    get_translations,
])
```

- [ ] **Step 4: Verify file compiles**

Run:
```bash
cd src-tauri && cargo check
```

Expected: `Finished` with no errors

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: add open_url command to open URLs in system browser"
```

---

## Task 3: Add Link Click Handler & History to Frontend

**Files:**
- Modify: `src/main.js:108-110` (add fileHistory array)
- Modify: `src/main.js:221-223` (add event listener after renderFile function)

- [ ] **Step 1: Add fileHistory array after renderFile function**

Find the end of `renderFile()` function (line 221, after the closing `}`).

After that closing brace, add:

```javascript
// In-memory history of opened files (cleared on app exit)
const fileHistory = [];
```

- [ ] **Step 2: Add click event listener**

After the fileHistory array (around line 224), add:

```javascript
// Handle clicks on links in Markdown content
contentEl.addEventListener("click", (e) => {
  if (e.target.tagName === "A") {
    const href = e.target.getAttribute("href");

    if (href.startsWith("http://") || href.startsWith("https://")) {
      // External URL → open in default browser
      e.preventDefault();
      invoke("open_url", { url: href });
    } else {
      // Local file → open in Marka + add to history
      e.preventDefault();
      renderFile(href);
      // Add to history if not already present
      if (!fileHistory.includes(href)) {
        fileHistory.push(href);
      }
    }
  }
});
```

**Exact location:** After `renderFile()` function closes (line 221), before `document.addEventListener("keydown", ...)` (line 223)

- [ ] **Step 3: Verify code placement**

Check:
- `fileHistory` array is at global scope (not inside any function)
- Event listener is placed before `document.addEventListener("keydown", ...)`
- Indentation matches surrounding code (2 spaces)

- [ ] **Step 4: Start dev server and test**

```bash
pnpm dev
```

Expected: App launches, no console errors

- [ ] **Step 5: Commit**

```bash
git add src/main.js
git commit -m "feat: add link click handler and session history"
```

---

## Task 4: Manual Testing

**Test 1: External URL opens in browser**

- [ ] **Step 1:** Open any Markdown file with an external link (e.g., `https://example.com`)
- [ ] **Step 2:** Click the link
- [ ] **Expected:** System default browser opens with that URL, app stays open

**Test 2: Local file with absolute path opens in Marka**

- [ ] **Step 1:** Create a test Markdown file: `c:\test\file1.md` with content:
```markdown
# Test File 1
Content here
[Link to file 2](c:\test\file2.md)
```

- [ ] **Step 2:** Create second file: `c:\test\file2.md` with content:
```markdown
# Test File 2
Success!
```

- [ ] **Step 3:** Open file1.md in Marka
- [ ] **Step 4:** Click the link to file2.md
- [ ] **Expected:** file2.md opens in Marka, window title changes to "file2.md — Marka"

**Test 3: History tracks opened files**

- [ ] **Step 1:** With dev tools open (F12), go to Console tab
- [ ] **Step 2:** Type: `fileHistory` and press Enter
- [ ] **Step 3:** Open file1.md and click link to file2.md
- [ ] **Step 4:** Type `fileHistory` again in console
- [ ] **Expected:** Output shows `["c:\test\file2.md"]` (or similar path)

**Test 4: Duplicate files not added twice to history**

- [ ] **Step 1:** Click link to file2.md again
- [ ] **Step 2:** Check console: `fileHistory`
- [ ] **Expected:** Still only one entry, no duplicates

**Test 5: Error handling — invalid local path**

- [ ] **Step 1:** Create Markdown with link to nonexistent file: `[broken](c:\nonexistent\file.md)`
- [ ] **Step 2:** Click the link
- [ ] **Expected:** Error message shown in content area (existing error handling)

- [ ] **Step 6: Commit final state**

```bash
git add -A
git commit -m "test: verify link opening and history functionality"
```

---

## Task 5: Code Review & Cleanup

- [ ] **Step 1: Review code changes**

Verify:
- `src/main.js`: fileHistory array is simple, event listener doesn't interfere with existing keyboard handlers
- `src-tauri/src/lib.rs`: `open_url` command is properly integrated
- `src-tauri/Cargo.toml`: `open` dependency added correctly

- [ ] **Step 2: Check for console errors**

Start `pnpm dev`, open dev tools (F12 → Console).
Expected: No errors, only normal Tauri/Vite logs

- [ ] **Step 3: Final commit**

```bash
git status
```

If any uncommitted changes, commit them:

```bash
git commit -m "chore: clean up and finalize link opening feature"
```

---

## Testing Checklist

- [ ] External URL (http/https) opens in system browser
- [ ] Absolute local path opens in Marka
- [ ] fileHistory tracks opened files
- [ ] Duplicate files not added twice to history
- [ ] Error message shown for nonexistent files
- [ ] No console errors during normal operation
- [ ] Keyboard shortcuts (Ctrl+O, Ctrl+T, etc.) still work
- [ ] App doesn't crash on invalid URLs

---

## Rollback Plan

If issues arise:

1. Return to previous commit:
   ```bash
   git reset --hard HEAD~3
   ```

2. Or revert specific files:
   ```bash
   git checkout HEAD -- src/main.js
   git checkout HEAD -- src-tauri/src/lib.rs
   ```

---

## Notes

- `fileHistory` is cleared on app exit (no persistence) — this is intentional MVP simplicity
- Relative paths not supported — will trigger file-not-found error
- Yakors (#section) not implemented — can add later
- No UI for history yet — data is available in `fileHistory` for future features
