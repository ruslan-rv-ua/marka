# Local Media and Relative Links Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix relative image/media paths and relative markdown file links so they resolve correctly relative to the currently open file's directory.

**Architecture:** Add a `currentFilePath` state variable to `main.js`, two pure helpers (`resolvePath`, `isExternal`), a `fixMediaSrc` function called after each render, and fix the click handler. Enable Tauri's asset protocol via `tauri.conf.json` so the WebView can load local files.

**Tech Stack:** Tauri v2, `@tauri-apps/api/core` (`convertFileSrc`), Vite, vanilla JS. No test suite — verify manually with `test-markdown/test-images.md`.

**Spec:** `docs/superpowers/specs/2026-03-21-local-media-and-links-design.md`

> **Note:** This project has no automated test suite (`pnpm dev` launches the app; verify manually).

---

### Task 1: Enable Tauri asset protocol

**Files:**
- Modify: `src-tauri/tauri.conf.json`

- [ ] **Step 1: Add `assetProtocol` config**

Open `src-tauri/tauri.conf.json`. The current `app.security` section looks like:

```json
"security": {
  "csp": null
}
```

Change it to:

```json
"security": {
  "csp": null,
  "assetProtocol": {
    "enable": true,
    "scope": ["**"]
  }
}
```

`scope: ["**"]` grants the WebView access to all local paths. Without it, the default scope is empty and every `http://asset.localhost/` request returns HTTP 403.

- [ ] **Step 2: Commit**

```bash
git add src-tauri/tauri.conf.json
git commit -m "feat: enable asset protocol for local file loading"
```

---

### Task 2: Add helpers and state to `main.js`

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Add `convertFileSrc` to the existing import from `@tauri-apps/api/core`**

Current line 1 in `src/main.js`:

```js
import { invoke } from "@tauri-apps/api/core";
```

Change to:

```js
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
```

- [ ] **Step 2: Add `currentFilePath` state variable**

Insert after line 7 (the last import line) and before line 9 (the `const marked = new Marked(...)` block):

```js
let currentFilePath = null;
```

- [ ] **Step 3: Add `isExternal` helper**

After the `currentFilePath` line, add:

```js
function isExternal(href) {
  return href.startsWith('http://') || href.startsWith('https://');
}
```

- [ ] **Step 4: Add `resolvePath` helper**

After `isExternal`, add:

```js
function resolvePath(href) {
  if (!currentFilePath) return href;
  const base = 'file:///' + currentFilePath.replace(/\\/g, '/');
  const resolved = new URL(href, base);
  // pathname is like "/c:/dev/.../file.png" — strip leading "/" and restore backslashes
  return decodeURIComponent(resolved.pathname.replace(/^\//, '').replace(/\//g, '\\'));
}
```

- [ ] **Step 5: Add `fixMediaSrc` function**

After `resolvePath`, add:

```js
function fixMediaSrc() {
  if (!currentFilePath) return;
  contentEl.querySelectorAll('img[src], video[src], audio[src], source[src]').forEach((el) => {
    const src = el.getAttribute('src');
    if (!isExternal(src)) {
      el.setAttribute('src', convertFileSrc(resolvePath(src)));
    }
  });
}
```

- [ ] **Step 6: Commit**

```bash
git add src/main.js
git commit -m "feat: add currentFilePath state, resolvePath, isExternal, fixMediaSrc helpers"
```

---

### Task 3: Wire up helpers into `renderFile` and click handler

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Set `currentFilePath` at the start of `renderFile`**

The current `renderFile` function starts at line 165:

```js
async function renderFile(filePath, preloadedContent) {
  try {
    const markdown = preloadedContent ?? await invoke("read_file", { path: filePath });
```

Add `currentFilePath = filePath;` as the very first line inside the function (before the `try`):

```js
async function renderFile(filePath, preloadedContent) {
  currentFilePath = filePath;
  try {
    const markdown = preloadedContent ?? await invoke("read_file", { path: filePath });
```

- [ ] **Step 2: Call `fixMediaSrc()` after rendering HTML**

Current line 168:

```js
contentEl.innerHTML = marked.parse(markdown);
```

Add `fixMediaSrc()` immediately after:

```js
contentEl.innerHTML = marked.parse(markdown);
fixMediaSrc();
```

- [ ] **Step 3: Fix relative links in the click handler**

The click handler local-file branch currently reads (around line 241–244):

```js
  } else {
    // Local file → open in Marka + add to history
    e.preventDefault();
    renderFile(href);
    // Add to history if not already present
    if (!fileHistory.includes(href)) {
      fileHistory.push(href);
    }
  }
```

Replace with:

```js
  } else {
    // Local file → open in Marka + add to history
    e.preventDefault();
    const absPath = currentFilePath ? resolvePath(href) : href;
    renderFile(absPath);
    // Add to history if not already present
    if (!fileHistory.includes(absPath)) {
      fileHistory.push(absPath);
    }
  }
```

Note: `fileHistory` now stores absolute paths (consistent with `renderFile` always receiving absolute paths after this fix).

- [ ] **Step 4: Commit**

```bash
git add src/main.js
git commit -m "feat: resolve relative media paths and links against current file directory"
```

---

### Task 4: Manual verification

**Files:** none (read-only test run)

- [ ] **Step 1: Build and run**

```bash
pnpm build --no-bundle
```

Then run:

```
src-tauri\target\release\marka.exe test-markdown\test-images.md
```

- [ ] **Step 2: Verify images load**

Expected: all three internal images (red, blue, green rectangles) are visible in the app. External images (GitHub logo, Rust logo) also load normally.

- [ ] **Step 3: Verify relative markdown links work**

Click `[See test-links.md](test-links.md)` in the rendered output.

Expected: `test-links.md` opens successfully (title bar changes to `test-links.md — Marka`).

- [ ] **Step 4: Verify chained navigation**

From `test-links.md`, click `[Go to test-complete.md](test-complete.md)`.

Expected: `test-complete.md` opens. If it contains images, they load correctly relative to `test-markdown/`.

- [ ] **Step 5: Verify external links unchanged**

Click any `https://` link.

Expected: opens in system browser (unchanged behavior).

- [ ] **Step 6: Final commit if everything looks good**

```bash
git add -A
git status  # should be clean
```

If clean — no further commit needed. If any last-minute fixes were made, commit them:

```bash
git commit -m "fix: <describe what was fixed>"
```
