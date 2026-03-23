# Navigation History (Alt+Left/Right)

## Summary

Add back/forward file navigation via Alt+Left / Alt+Right keyboard shortcuts using a custom JavaScript array stack. History tracks only `.md` file transitions (not the help screen). Session-only — no persistence to disk.

## Approach: Custom Array Stack

**Chosen over:** Browser History API (pushState/popstate), Hybrid approach.

**Rationale:**
- Zero dependency on WebView2 History API edge cases
- Full control over stack behavior (pruning, deduplication, future extension)
- Works identically in dev (`localhost:1420`) and production (`tauri.localhost`)
- Keyboard-driven NVDA app — browser gesture integration is not needed

## Data Structure

```js
const history = [];          // array of file paths
let historyIndex = -1;       // pointer to current position (-1 = no history)
let navigatingHistory = false; // flag to prevent double-push during back/forward
```

**Invariants:**
- `historyIndex` is always in range `[-1, history.length - 1]`
- `history[historyIndex]` is always the currently displayed file path (when >= 0)
- `navigatingHistory` is `true` only during `goBack()` / `goForward()` execution

## Core Functions

### `navigateTo(filePath, content?)`

Wrapper around `renderFile()`. All file-opening code paths call this instead of `renderFile()` directly.

1. If `navigatingHistory` is `true` — skip stack modification, just call `renderFile()`
2. Otherwise:
   - Truncate forward entries: `history.splice(historyIndex + 1)`
   - Push `filePath` onto stack
   - Set `historyIndex = history.length - 1`
3. Call `renderFile(filePath, content)`

### `goBack()`

1. If `historyIndex <= 0` → `announce(t("history.empty"))`, return
2. `historyIndex--`
3. Set `navigatingHistory = true`
4. Call `renderFile(history[historyIndex])`
5. Announce: `announce(t("history.back", { file: fileName }))`
6. Set `navigatingHistory = false` (in `.finally()`)

### `goForward()`

1. If `historyIndex >= history.length - 1` → `announce(t("history.empty"))`, return
2. `historyIndex++`
3. Set `navigatingHistory = true`
4. Call `renderFile(history[historyIndex])`
5. Announce: `announce(t("history.forward", { file: fileName }))`
6. Set `navigatingHistory = false` (in `.finally()`)

### Helper

```js
function fileNameFromPath(filePath) {
  return filePath.split(/[\\/]/).pop();
}
```

## Integration Points in main.js

### Replace `renderFile()` calls with `navigateTo()`

| Location | Current call | New call |
|---|---|---|
| Link click handler (line ~289) | `renderFile(absPath)` | `navigateTo(absPath)` |
| Ctrl+O dialog (line ~300) | `renderFile(result.path, result.content)` | `navigateTo(result.path, result.content)` |
| CLI args startup (line ~337) | `renderFile(matches.args.file.value)` | `navigateTo(matches.args.file.value)` |

**NOT changed:** `showHelp()` — help screen is excluded from history.

### Add keyboard shortcuts

In existing `keydown` handler, add two new branches:

```js
else if (e.altKey && e.code === "ArrowLeft") {
  e.preventDefault();
  goBack();
}
else if (e.altKey && e.code === "ArrowRight") {
  e.preventDefault();
  goForward();
}
```

`e.preventDefault()` blocks WebView2's default back/forward navigation.

Uses `e.code` (physical key) per project convention — layout-independent.

## NVDA Accessibility

Uses existing `announce()` function (aria-live region) for screen reader feedback:

- **Successful navigation:** announces direction + file name
  - Back: `"Назад: readme.md"` / `"Back: readme.md"`
  - Forward: `"Вперед: readme.md"` / `"Forward: readme.md"`
- **Empty history:** announces that navigation is not possible
  - `"Немає куди переходити"` / `"No navigation history"`

After `renderFile()` completes, NVDA also gets the focus-blur-refocus cycle (existing behavior) which triggers browse mode refresh on the new content.

## Locale Keys

### uk.json — new entries

```json
"history.back": "Назад: {file}",
"history.forward": "Вперед: {file}",
"history.empty": "Немає куди переходити"
```

### en.json — new entries

```json
"history.back": "Back: {file}",
"history.forward": "Forward: {file}",
"history.empty": "No navigation history"
```

## Edge Cases

| Scenario | Behavior |
|---|---|
| App starts with no file (help screen) | `history` is empty, `historyIndex = -1`. Alt+← announces "empty". |
| App starts with CLI file | `navigateTo()` pushes it as the first entry. Alt+← announces "empty". |
| Open same file twice in a row | Both entries are pushed (no deduplication). This matches browser behavior. |
| Go back 2 steps, then open new file | Forward entries are pruned. New file becomes the head. |
| File was deleted since last visit | `renderFile()` will show its existing error: "Не вдалося прочитати файл". User can Alt+← to go back. |
| Go back from help screen | Help is not in history. If user is on help and presses Alt+←, it announces "empty". |

## Files to Modify

1. **`src/main.js`** — add history state, `navigateTo()`, `goBack()`, `goForward()`, keyboard bindings
2. **`src-tauri/src/locales/uk.json`** — add 3 locale keys
3. **`src-tauri/src/locales/en.json`** — add 3 locale keys

No Rust changes needed. No new dependencies.
