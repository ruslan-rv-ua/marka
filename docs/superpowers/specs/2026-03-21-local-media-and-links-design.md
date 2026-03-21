# Design: Local Media and Relative Links Fix

**Date:** 2026-03-21
**Branch:** bugfix/no-images

## Problem

When a markdown file is opened via CLI (`marka.exe file.md`) or dialog, relative paths in the rendered HTML are broken:

1. **Images/media**: `![img](test-image1.png)` → `<img src="test-image1.png">` → WebView resolves against `tauri://localhost/` instead of the markdown file's directory → image not found.
2. **Relative markdown links**: `[other](test-links.md)` → click handler calls `renderFile("test-links.md")` → Rust `fs::read_to_string("test-links.md")` resolves against process CWD → file not found.

**Root cause**: `main.js` does not track the absolute path of the currently open file, so relative paths cannot be resolved.

## Scope

- Affected elements: `<img>`, `<video>`, `<audio>`, `<source>` (all with `src` attribute)
- Affected links: local file links (non-`http://`, non-`https://`)
- External URLs (http/https): unchanged — already handled correctly

## Chosen Approach

Track `currentFilePath` in JS. After rendering, rewrite relative media `src` to asset URLs via Tauri's `convertFileSrc`. Fix link click handler to resolve relative hrefs before calling `renderFile`.

## Design

### 1. State: `currentFilePath`

Add a module-level variable in `src/main.js`:

```js
let currentFilePath = null;
```

Set it at the top of `renderFile(filePath, preloadedContent)`:

```js
async function renderFile(filePath, preloadedContent) {
  currentFilePath = filePath;
  // ...
}
```

CLI args and dialog already provide absolute paths, so this is safe from the start.

### 2. Helper: `resolvePath(href)`

Resolves a relative href against the directory of `currentFilePath`. Uses the `URL` constructor to handle `./`, `../`, and mixed separators correctly.

```js
function resolvePath(href) {
  if (!currentFilePath) return href;
  const base = 'file:///' + currentFilePath.replace(/\\/g, '/');
  const resolved = new URL(href, base);
  // resolved.pathname: "/c:/dev/marka/test-markdown/test-image1.png"
  // Strip leading "/" and convert to Windows backslashes
  return decodeURIComponent(resolved.pathname.replace(/^\//, '').replace(/\//g, '\\'));
}
```

### 3. Helper: `isExternal(href)`

```js
function isExternal(href) {
  return href.startsWith('http://') || href.startsWith('https://');
}
```

### 4. Function: `fixMediaSrc()`

Called immediately after `contentEl.innerHTML = marked.parse(markdown)` in `renderFile`. Rewrites relative `src` attributes to Tauri asset URLs.

```js
import { convertFileSrc } from "@tauri-apps/api/core";

function fixMediaSrc() {
  if (!currentFilePath) return;
  const selectors = 'img[src], video[src], audio[src], source[src]';
  contentEl.querySelectorAll(selectors).forEach(el => {
    const src = el.getAttribute('src');
    if (!isExternal(src)) {
      el.setAttribute('src', convertFileSrc(resolvePath(src)));
    }
  });
}
```

`convertFileSrc` is synchronous and converts a native path to `http://asset.localhost/<encoded-path>` on Windows.

### 5. Fix link click handler

In the existing `contentEl` click listener, replace:

```js
renderFile(href);
```

With:

```js
const absPath = currentFilePath ? resolvePath(href) : href;
renderFile(absPath);
```

This ensures that when navigating between markdown files via relative links, each subsequent file is opened with the correct absolute path, and `currentFilePath` is updated accordingly — enabling correct media resolution in the newly opened file.

### 6. Tauri asset protocol configuration

Add to `src-tauri/tauri.conf.json` under `app.security`:

```json
"assetProtocol": {
  "enable": true,
  "scope": ["**"]
}
```

This enables the `http://asset.localhost/` protocol and grants access to all paths. Without `scope: ["**"]`, the default scope is an empty list — every asset request returns HTTP 403. No capabilities change is needed; asset protocol is configured via `tauri.conf.json`, not the ACL system.

## Data Flow (after fix)

```
marka.exe c:\docs\report.md
  → renderFile("c:\docs\report.md")
  → currentFilePath = "c:\docs\report.md"
  → marked.parse(markdown) → HTML with <img src="chart.png">
  → fixMediaSrc()
      resolvePath("chart.png") → "c:\docs\chart.png"
      convertFileSrc(...)      → "http://asset.localhost/c%3A/docs/chart.png"
      img.src = "http://asset.localhost/C%3A%5Cdocs%5Cchart.png" ✓

  → user clicks [see appendix.md]
  → resolvePath("appendix.md") → "c:\docs\appendix.md"
  → renderFile("c:\docs\appendix.md")
  → currentFilePath = "c:\docs\appendix.md" ✓
```

## Files Changed

| File | Change |
|------|--------|
| `src/main.js` | Add `currentFilePath`, `resolvePath()`, `isExternal()`, `fixMediaSrc()`; update `renderFile` and click handler |
| `src-tauri/tauri.conf.json` | Add `assetProtocol: { enable: true, scope: ["**"] }` under `app.security` |

## Out of Scope

- History/back navigation (not affected by this change)
- Absolute local Windows paths in markdown (e.g., `![](C:\img.png)`) — uncommon in standard markdown; the JS `URL` constructor does not reliably parse Windows absolute paths, but marked.js never emits them in `src` attributes
- `srcset` attribute — not used in standard markdown output
- `fileHistory` in the click handler will contain resolved absolute paths after this fix (previously it stored raw hrefs); this is acceptable since history/back navigation is not yet implemented
