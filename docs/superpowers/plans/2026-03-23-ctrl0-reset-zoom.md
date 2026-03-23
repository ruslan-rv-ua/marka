# Ctrl+0 Reset Zoom Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `Ctrl+0` keyboard shortcut that resets font size to 16 px and horizontal padding to 10 % in `src/main.js`.

**Architecture:** Three additions to a single file — two new constants, one new function, one new `else if` branch in the existing keydown handler. No new files, no changes to CSS or Rust.

**Tech Stack:** Vanilla JS, Tauri v2, CSS custom properties on `:root` (`document.documentElement`).

---

## File Map

| File | Change |
|------|--------|
| `src/main.js` | Add `DEFAULT_FONT_SIZE`, `DEFAULT_PADDING_X` constants; add `resetZoom()` function; add `Ctrl+Digit0` branch in keydown handler |

No other files are touched.

---

### Task 1: Add DEFAULT constants

**Files:**
- Modify: `src/main.js:194-195`

Current lines 194–195:
```js
const FONT_SIZE_MIN = 10, FONT_SIZE_MAX = 72;
const PADDING_MIN = 0, PADDING_MAX = 25;
```

- [ ] **Step 1: Add DEFAULT constants on new lines after line 195**

Insert after line 195 (the `PADDING_MIN/MAX` line):
```js
const DEFAULT_FONT_SIZE = 16; // px, matches :root --font-size in styles.css
const DEFAULT_PADDING_X = 10; // %, matches :root --padding-x in styles.css
```

The block should now read:
```js
const FONT_SIZE_MIN = 10, FONT_SIZE_MAX = 72;
const PADDING_MIN = 0, PADDING_MAX = 25;
const DEFAULT_FONT_SIZE = 16; // px, matches :root --font-size in styles.css
const DEFAULT_PADDING_X = 10; // %, matches :root --padding-x in styles.css
```

- [ ] **Step 2: Verify the file looks right**

Open `src/main.js` and confirm the four constant lines appear together before `COPY_ICON`.

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat: add DEFAULT_FONT_SIZE and DEFAULT_PADDING_X constants"
```

---

### Task 2: Add resetZoom() function

**Files:**
- Modify: `src/main.js:206-211` (after `changePadding()`)

Current lines 206–211:
```js
function changePadding(delta) {
  const current = parseFloat(getComputedStyle(root).getPropertyValue("--padding-x"));
  const next = Math.min(PADDING_MAX, Math.max(PADDING_MIN, current + delta));
  root.style.setProperty("--padding-x", `${next}%`);
  scheduleSave();
}
```

- [ ] **Step 1: Add resetZoom() immediately after changePadding()**

Insert after line 211 (the closing `}` of `changePadding`):
```js

function resetZoom() {
  root.style.setProperty("--font-size", `${DEFAULT_FONT_SIZE}px`);
  root.style.setProperty("--padding-x", `${DEFAULT_PADDING_X}%`);
  scheduleSave();
}
```

- [ ] **Step 2: Verify placement**

Confirm that in `src/main.js` the function order is:
1. `changeFontSize(delta)`
2. `changePadding(delta)`
3. `resetZoom()` ← new
4. `getLiveRegion()` (existing, still there)

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat: add resetZoom() function"
```

---

### Task 3: Wire Ctrl+Digit0 in the keydown handler

**Files:**
- Modify: `src/main.js:390-392` (after `NumpadSubtract` branch)

Current lines 390–392:
```js
  } else if (e.ctrlKey && e.code === "NumpadSubtract") {
    e.preventDefault();
    changeFontSize(-1);
```

- [ ] **Step 1: Add Digit0 branch after NumpadSubtract**

After the `changeFontSize(-1);` line (and before the next `} else if`), insert:
```js
  } else if (e.ctrlKey && e.code === "Digit0") {
    e.preventDefault();
    resetZoom();
```

The block should now read:
```js
  } else if (e.ctrlKey && e.code === "NumpadSubtract") {
    e.preventDefault();
    changeFontSize(-1);
  } else if (e.ctrlKey && e.code === "Digit0") {
    e.preventDefault();
    resetZoom();
  } else if (e.ctrlKey && e.code === "BracketLeft") {
```

- [ ] **Step 2: Manual smoke test — run the app**

```bash
just vite-dev
```

Open in browser at `http://localhost:1420`.

Test sequence:
1. Press `Ctrl++` several times → font size increases
2. Press `Ctrl+]` several times → padding increases
3. Press `Ctrl+0` → font size should snap back to 16 px, padding to 10 %
4. Press `Ctrl+-` several times → font size decreases
5. Press `Ctrl+[` several times → padding decreases
6. Press `Ctrl+0` → both reset again

Confirm via browser DevTools: `getComputedStyle(document.documentElement).getPropertyValue("--font-size")` returns `"16px"` and `"--padding-x"` returns `"10%"` after each reset.

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat: add Ctrl+0 shortcut to reset font size and padding to defaults"
```
