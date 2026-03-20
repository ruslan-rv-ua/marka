# Design: Copy Code Button

**Date:** 2026-03-20
**Status:** Approved

## Summary

Add a "Copy" button after each code block in the rendered Markdown. The button allows sighted and screen reader users to copy the code without having to navigate through the code block itself.

## Requirements

- Button is placed **after** each `<pre>` element in the DOM (not inside it)
- Clicking copies the code block content to the clipboard
- Confirmation is delivered via `aria-live` announcement: "Код скопійовано"
- Error is announced via `aria-live`: "Помилка копіювання"
- No visible change to the button on click (announcement only)
- Button is accessible via keyboard (Enter and Space — native `<button>` behavior) and NVDA
- Empty code blocks (`pre.textContent.trim() === ""`): button is not rendered
- Visual style is consistent with the existing dark high-contrast theme

## DOM Structure

Each rendered `<pre>` with non-empty content is followed by:

```html
<button type="button" class="copy-btn" aria-label="Копіювати код 1">📋 Копіювати</button>
```

`type="button"` is explicit to prevent accidental form submission.

When a document has multiple code blocks, each button gets a numbered `aria-label`: "Копіювати код 1", "Копіювати код 2", etc. The counter increments only for non-empty `<pre>` elements that actually receive a button. It resets to 1 on every `renderFile()` call.

**Emoji and NVDA:** `aria-label` on a `<button>` is the authoritative accessible name in all NVDA modes. NVDA announces "Копіювати код N кнопка" — the emoji inside is not read separately.

A single `aria-live` region is inserted into `<body>` once, guarded by `document.getElementById("copy-announcement")`. Never destroyed or recreated:

```html
<div id="copy-announcement" aria-live="polite" aria-atomic="true" class="visually-hidden"></div>
```

`aria-live="polite"` does not interrupt NVDA's current speech. NVDA reads from a snapshot at mutation time — clearing the node after 3 seconds does not interrupt an in-progress announcement.

After copy success or failure, the appropriate message is written to this region, then cleared after 3 seconds. A pending clear timeout is always cancelled before setting a new one.

## Copy Logic

Buttons are inserted **after** `contentEl.innerHTML = marked.parse(markdown)` is called.

A module-level `renderGeneration` integer increments on each `renderFile()` call. Each button click captures the current generation and only announces if generation is still current when the async clipboard write resolves — preventing stale announcements after a new file is loaded while a write is in-flight.

```
pendingClearTimeout = null   (module-level)
renderGeneration = 0         (module-level, incremented at start of renderFile())

on button click:
  myGeneration = renderGeneration
  code text = (pre.querySelector("code") ?? pre).textContent
  clearTimeout(pendingClearTimeout)
  try:
    await navigator.clipboard.writeText(code text)
    if renderGeneration === myGeneration:
      announce("Код скопійовано")
  catch:
    if renderGeneration === myGeneration:
      announce("Помилка копіювання")

announce(text):
  announcementEl.textContent = text
  pendingClearTimeout = setTimeout(() => announcementEl.textContent = "", 3000)
```

`textContent` (not `innerText`) preserves whitespace and indentation.

`navigator.clipboard.writeText()` requires window focus — always the case when the user clicks. The `try/catch` handles any unexpected failures.

## Visual Style (styles.css)

Only `<pre>` elements followed by a `.copy-btn` lose their bottom margin (via `:has()`), so empty `<pre>` elements retain their original `margin-bottom: 1em` spacing:

```css
pre:has(+ .copy-btn) {
  margin-bottom: 0;
}
```

The button has `margin-top: 4px` (fixed, does not scale) and `margin-bottom: 1em` (relative to current font size). `font-size: 0.85em` is relative to the user's dynamic font size setting — the button scales proportionally with Ctrl+± adjustments, which is the desired behavior.

```css
/* Visually hidden utility — used by aria-live region */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

pre:has(+ .copy-btn) {
  margin-bottom: 0;
}

.copy-btn {
  display: block;
  margin-top: 4px;
  margin-bottom: 1em;
  padding: 4px 10px;
  font-family: inherit;
  font-size: 0.85em;
  color: var(--accent);
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
}

.copy-btn:hover {
  border-color: var(--accent);
  background: rgba(102, 204, 255, 0.08);
}

.copy-btn:focus-visible {
  border-color: var(--accent);
  background: rgba(102, 204, 255, 0.08);
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

`:has()` is supported in all modern WebView2 versions used by Tauri v2.

## Files Changed

- `src/main.js`:
  - Module-level: `pendingClearTimeout = null`, `renderGeneration = 0`
  - `renderFile()`: increment `renderGeneration` at start; insert `aria-live` div once (guarded by `getElementById`); after `innerHTML` is set, add `.copy-btn` after each non-empty `<pre>` with local counter
- `src/styles.css`:
  - Add `.visually-hidden` utility class
  - Add `pre:has(+ .copy-btn) { margin-bottom: 0 }` rule
  - Add `.copy-btn`, `.copy-btn:hover`, `.copy-btn:focus-visible` rules

## Files NOT Changed

- `src/index.html`
- `src-tauri/src/lib.rs`
- `tauri.conf.json`
