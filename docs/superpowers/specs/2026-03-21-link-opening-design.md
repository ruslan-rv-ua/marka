# Design: Link Opening & Session History

**Date:** 2026-03-21
**Scope:** Adding link handling and session history to Marka Markdown viewer
**Status:** Design approved, ready for implementation

---

## Overview

Users can now interact with links in Markdown documents:
- **Local file paths** (absolute) → open in Marka
- **External URLs** (http/https) → open in system browser
- **Session history** → in-memory list of opened files (cleared on app close)

---

## Requirements

### Functional

1. **Link Recognition & Routing**
   - Intercept all clicks on `<a>` elements in rendered Markdown
   - If `href` starts with `http://` or `https://` → open in default browser
   - Otherwise → treat as local file path → open in Marka
   - Add clicked file to session history

2. **Session History**
   - Track all opened files in memory (no persistence between sessions)
   - Support quick access to recent files (future UI enhancement)
   - Clear on app exit

3. **Path Support**
   - Absolute Windows paths: `C:\Users\...\file.md`
   - Relative paths: not in MVP (can add later)

4. **Error Handling**
   - If local file doesn't exist → show error in content area (existing behavior)
   - If browser fails to open → log error to console

### Constraints

- Tauri v2 only
- No CSP (already disabled in tauri.conf.json)
- Must maintain i18n support
- No new UI elements required for MVP

---

## Architecture

### Frontend Changes (`src/main.js`)

**New variables:**
```javascript
const fileHistory = [];  // In-memory array of opened file paths
```

**New event listener:**
```javascript
contentEl.addEventListener("click", (e) => {
  if (e.target.tagName === "A") {
    const href = e.target.getAttribute("href");

    if (href.startsWith("http://") || href.startsWith("https://")) {
      // External URL → open in browser
      e.preventDefault();
      invoke("open_url", { url: href });
    } else {
      // Local file → open in Marka + add to history
      e.preventDefault();
      renderFile(href);
      if (!fileHistory.includes(href)) {
        fileHistory.push(href);
      }
    }
  }
});
```

**Placement:** After the `renderFile()` function, before the global `keydown` listener.

### Backend Changes (`src-tauri/src/lib.rs`)

**New command:**
```rust
#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    open::that(&url)
        .map_err(|e| format!("Не вдалося відкрити посилання: {}", e))
}
```

**New dependency in `src-tauri/Cargo.toml`:**
```toml
open = "5.0"
```

**Update invoke handler:**
Add `open_url` to the `generate_handler!` macro.

---

## Data Flow

```
User clicks <a> in Markdown
  ↓
Event listener intercepts
  ↓
Is href http/https?
  ├─ YES → invoke("open_url") → system browser opens
  └─ NO → renderFile(href) → add to fileHistory
       ↓
       File exists?
       ├─ YES → render in Marka
       └─ NO → error message shown
```

---

## Session History

- **Storage:** In-memory JavaScript array (`fileHistory`)
- **Scope:** Current browser session only
- **Duplicate handling:** Only unique paths (checked before adding)
- **Access:** Available via JavaScript (can be used by future history UI)
- **Lifecycle:** Cleared when app exits

**Future enhancements:**
- Add UI menu: "Recent Files" dropdown
- Persist to `settings.json` if users request
- Add navigation buttons (back/forward)

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Local file not found | Show error alert in content area (existing) |
| Browser fails to open | Log to console, silent failure |
| Invalid URL format | Treated as local file, triggers file-not-found |
| Relative paths | Not supported in MVP (shows file-not-found) |

---

## Testing Strategy

No automated tests (project has no test suite). Manual testing:

1. **External links** → Click `https://example.com` → opens in browser ✓
2. **Absolute local paths** → Click `C:\Users\...\file.md` → opens in Marka ✓
3. **History tracking** → Open 3 files → `fileHistory` contains all 3 ✓
4. **Error case** → Click invalid path → error shown ✓
5. **Multiple clicks** → Same file clicked twice → appears once in history ✓

---

## Files to Modify

1. `src/main.js` — Add event listener + history array
2. `src-tauri/src/lib.rs` — Add `open_url` command
3. `src-tauri/Cargo.toml` — Add `open` dependency

---

## Notes

- No UI changes required for MVP
- History is session-only to keep code minimal
- Yakors (#section) deliberately not implemented (can add later)
- Relative paths not supported (can add with backend resolver later)
