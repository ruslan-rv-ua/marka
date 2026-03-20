# Design: Copy Code Button

**Date:** 2026-03-20
**Status:** Approved

## Summary

Add a "Copy" button after each code block in the rendered Markdown. The button allows sighted and screen reader users to copy the code without having to navigate through the code block itself.

## Requirements

- Button is placed **after** each `<pre>` element in the DOM (not inside it)
- Clicking copies the code block content to the clipboard
- Confirmation is delivered via `aria-live` announcement: "Код скопійовано"
- No visible change to the button on click (announcement only)
- Button is accessible via keyboard and NVDA screen reader
- Visual style is consistent with the existing dark high-contrast theme

## DOM Structure

Each rendered `<pre>` is followed by:

```html
<button class="copy-btn" aria-label="Копіювати код">📋 Копіювати</button>
```

A single `aria-live` region is inserted into `<body>` once on initialization:

```html
<div aria-live="polite" aria-atomic="true" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap"></div>
```

After a successful copy, "Код скопійовано" is written to this region, then cleared after 2 seconds.

## Copy Logic

```
code text = pre.querySelector("code")?.innerText ?? pre.innerText
navigator.clipboard.writeText(code text)
  → on success: write "Код скопійовано" to aria-live region, clear after 2000ms
  → on failure: silently ignore (clipboard API may be unavailable)
```

## Visual Style (styles.css)

```css
.copy-btn {
  display: block;
  margin-top: -0.5em;
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

.copy-btn:hover,
.copy-btn:focus {
  border-color: var(--accent);
  background: rgba(102, 204, 255, 0.08);
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

## Files Changed

- `src/main.js` — `renderFile()`: insert `aria-live` div once, add `.copy-btn` after each `<pre>`
- `src/styles.css` — add `.copy-btn` styles

## Files NOT Changed

- `src/index.html`
- `src-tauri/src/lib.rs`
- `tauri.conf.json`
