# Navigation History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add back/forward file navigation via Alt+Left / Alt+Right using a custom JS array stack with NVDA announcements.

**Architecture:** Custom array stack (`history[]` + `historyIndex` pointer) in `src/main.js`. A `navigateTo()` wrapper replaces direct `renderFile()` calls at all file-opening code paths. `goBack()` / `goForward()` navigate the stack and announce via existing `announce()` aria-live region. No Rust changes, no new dependencies.

**Tech Stack:** Vanilla JavaScript (existing `src/main.js`), Tauri v2 i18n locale JSON files.

**Spec:** `docs/superpowers/specs/2026-03-23-navigation-history-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/main.js` | Modify | Add history state, `navigateTo()`, `goBack()`, `goForward()`, `fileNameFromPath()`, keyboard bindings, replace 3 `renderFile()` call sites |
| `src-tauri/src/locales/uk.json` | Modify | Add 3 locale keys for history announcements |
| `src-tauri/src/locales/en.json` | Modify | Add 3 locale keys for history announcements |

---

## Task 1: Add locale keys

**Files:**
- Modify: `src-tauri/src/locales/uk.json`
- Modify: `src-tauri/src/locales/en.json`

- [ ] **Step 1: Add Ukrainian locale keys**

In `src-tauri/src/locales/uk.json`, add these 3 entries before the closing `}`:

```json
"history.back": "Назад: {file}",
"history.forward": "Вперед: {file}",
"history.empty": "Немає куди переходити"
```

- [ ] **Step 2: Add English locale keys**

In `src-tauri/src/locales/en.json`, add these 3 entries before the closing `}`:

```json
"history.back": "Back: {file}",
"history.forward": "Forward: {file}",
"history.empty": "No navigation history"
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/locales/uk.json src-tauri/src/locales/en.json
git commit -m "feat(i18n): add navigation history locale keys"
```

---

## Task 2: Add history state and core functions

**Files:**
- Modify: `src/main.js` (lines 10-11, insert after `let currentFilePath = null;`)

- [ ] **Step 1: Add history state variables**

Insert after `let currentFilePath = null;` (line 10) in `src/main.js`:

```js
const navHistory = [];
let historyIndex = -1;
let navigatingHistory = false;
```

Note: named `navHistory` to avoid shadowing `window.history`.

- [ ] **Step 2: Add `fileNameFromPath()` helper**

Insert after the new state variables:

```js
function fileNameFromPath(filePath) {
  return filePath.split(/[\\/]/).pop();
}
```

- [ ] **Step 3: Add `navigateTo()` function**

Insert after `fileNameFromPath()`:

```js
function navigateTo(filePath, content) {
  if (!navigatingHistory) {
    navHistory.splice(historyIndex + 1);
    navHistory.push(filePath);
    historyIndex = navHistory.length - 1;
  }
  return renderFile(filePath, content);
}
```

- [ ] **Step 4: Add `goBack()` function**

Insert after `navigateTo()`:

```js
async function goBack() {
  if (navigatingHistory) return;
  if (historyIndex <= 0) {
    announce(t("history.empty"));
    return;
  }
  historyIndex--;
  navigatingHistory = true;
  try {
    await renderFile(navHistory[historyIndex]);
    announce(t("history.back", { file: fileNameFromPath(navHistory[historyIndex]) }));
  } finally {
    navigatingHistory = false;
  }
}
```

- [ ] **Step 5: Add `goForward()` function**

Insert after `goBack()`:

```js
async function goForward() {
  if (navigatingHistory) return;
  if (historyIndex >= navHistory.length - 1) {
    announce(t("history.empty"));
    return;
  }
  historyIndex++;
  navigatingHistory = true;
  try {
    await renderFile(navHistory[historyIndex]);
    announce(t("history.forward", { file: fileNameFromPath(navHistory[historyIndex]) }));
  } finally {
    navigatingHistory = false;
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/main.js
git commit -m "feat: add navigation history state and core functions"
```

---

## Task 3: Wire up call sites and keyboard shortcuts

**Files:**
- Modify: `src/main.js` (3 call sites + keydown handler)

- [ ] **Step 1: Replace `renderFile()` in link click handler**

In the click handler (~line 287), change:

```js
    renderFile(absPath);
```

to:

```js
    navigateTo(absPath);
```

- [ ] **Step 2: Replace `renderFile()` in Ctrl+O handler**

In the keydown handler (~line 297), change:

```js
        renderFile(result.path, result.content);
```

to:

```js
        navigateTo(result.path, result.content);
```

- [ ] **Step 3: Replace `renderFile()` in CLI args**

In `checkCliArgs()` (~line 333), change:

```js
      await renderFile(matches.args.file.value);
```

to:

```js
      await navigateTo(matches.args.file.value);
```

- [ ] **Step 4: Add Alt+Left/Right keyboard shortcuts**

In the keydown handler, add before the `else if (e.key === "Escape")` branch:

```js
  } else if (e.altKey && e.code === "ArrowLeft") {
    e.preventDefault();
    goBack();
  } else if (e.altKey && e.code === "ArrowRight") {
    e.preventDefault();
    goForward();
  }
```

- [ ] **Step 5: Commit**

```bash
git add src/main.js
git commit -m "feat: wire up navigateTo() and Alt+Left/Right shortcuts"
```

---

## Task 4: Manual verification

- [ ] **Step 1: Start dev server**

Run: `just dev`

- [ ] **Step 2: Verify forward navigation**

1. Press Ctrl+O, open a `.md` file (file A)
2. Click a `.md` link inside (file B) — or open another file via Ctrl+O
3. Open a third file (file C)
4. Confirm: NVDA announces each file name in the window title

- [ ] **Step 3: Verify Alt+Left (back)**

1. Press Alt+Left — should navigate back to file B
2. Confirm: NVDA announces "Назад: fileB.md" (or English equivalent)
3. Press Alt+Left again — should navigate to file A
4. Press Alt+Left again — should announce "Немає куди переходити"

- [ ] **Step 4: Verify Alt+Right (forward)**

1. Press Alt+Right — should navigate forward to file B
2. Confirm: NVDA announces "Вперед: fileB.md"
3. Press Alt+Right — should navigate to file C

- [ ] **Step 5: Verify forward pruning**

1. Go back to file A (Alt+Left twice)
2. Open a new file D via Ctrl+O
3. Press Alt+Right — should announce "Немає куди переходити" (B and C are pruned)

- [ ] **Step 6: Verify help screen is excluded**

1. Start app without arguments — help screen shows
2. Press Alt+Left — should announce "Немає куди переходити"
3. Open a file via Ctrl+O, then press Alt+Left — announces "empty" (only one file in history)
