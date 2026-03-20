# Copy Code Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Копіювати" button after each non-empty code block that copies the code to clipboard and announces "Код скопійовано" via aria-live.

**Architecture:** Two files only — CSS styles added to `src/styles.css`, JS logic added to `src/main.js`. No new files, no new dependencies. The aria-live region is injected once into `<body>`; copy buttons are injected after each `<pre>` on every `renderFile()` call.

**Tech Stack:** Vanilla JS, CSS, Tauri v2 (WebView2). No test suite configured — verification is manual via `pnpm dev`.

---

> **Note:** No automated test suite exists in this project. Each task ends with manual verification steps instead.

---

### Task 1: Add CSS styles

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: Add `.visually-hidden`, `pre:has(+ .copy-btn)`, `.copy-btn` rules**

Open `src/styles.css` and append at the end of the file:

```css
/* Visually hidden — used by aria-live announcement region */
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

/* When a pre is followed by a copy button, the button owns the bottom spacing */
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

- [ ] **Step 2: Commit**

```bash
git add src/styles.css
git commit -m "style: add copy button styles"
```

---

### Task 2: Add JS logic to main.js

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Add module-level variables**

After the line `const root = document.documentElement;` (line 23), add:

```js
let pendingClearTimeout = null;
let renderGeneration = 0;
```

- [ ] **Step 2: Add `announceCopy` helper function**

After the `changePadding` function (after line 35), add:

```js
function announceCopy(text) {
  const el = document.getElementById("copy-announcement");
  if (!el) return;
  el.textContent = text;
  clearTimeout(pendingClearTimeout);
  pendingClearTimeout = setTimeout(() => { el.textContent = ""; }, 3000);
}
```

- [ ] **Step 3: Insert aria-live region and copy buttons in `renderFile()`**

Inside `renderFile()`, after the line `contentEl.innerHTML = marked.parse(markdown);` (currently line 40), add the following block — place it before the existing `querySelectorAll("pre")` loop:

```js
    // Insert aria-live announcement region once
    if (!document.getElementById("copy-announcement")) {
      const liveEl = document.createElement("div");
      liveEl.id = "copy-announcement";
      liveEl.setAttribute("aria-live", "polite");
      liveEl.setAttribute("aria-atomic", "true");
      liveEl.className = "visually-hidden";
      document.body.appendChild(liveEl);
    }

    // Add copy buttons after each non-empty code block
    const myGeneration = ++renderGeneration;
    let codeBlockIndex = 0;
    contentEl.querySelectorAll("pre").forEach((pre) => {
      if (pre.textContent.trim() === "") return;
      codeBlockIndex++;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "copy-btn";
      btn.setAttribute("aria-label", `Копіювати код ${codeBlockIndex}`);
      btn.textContent = "Копіювати";
      btn.addEventListener("click", async () => {
        const codeEl = pre.querySelector("code") ?? pre;
        clearTimeout(pendingClearTimeout);
        try {
          await navigator.clipboard.writeText(codeEl.textContent);
          if (renderGeneration === myGeneration) announceCopy("Код скопійовано");
        } catch {
          if (renderGeneration === myGeneration) announceCopy("Помилка копіювання");
        }
      });
      pre.insertAdjacentElement("afterend", btn);
    });
```

- [ ] **Step 4: Verify the final shape of `renderFile()`**

After edits, the function body should follow this order:
1. `const markdown = ...` — read file
2. `contentEl.innerHTML = ...` — render markdown
3. Insert `aria-live` div (if not exists)
4. Add copy buttons (the block above)
5. Existing `querySelectorAll("pre").forEach(...)` — NVDA accessibility attributes
6. `contentEl.blur()` / `requestAnimationFrame(...)` — NVDA focus refresh
7. `await getCurrentWindow().setTitle(...)` — window title

- [ ] **Step 5: Commit**

```bash
git add src/main.js
git commit -m "feat: add copy code button with aria-live announcement"
```

---

### Task 3: Manual verification

**Run the app:**

```bash
pnpm dev
```

Open a Markdown file with at least two code blocks (use any `.md` file in the repo, e.g. `README.md` or a test file from `src/test-files/`).

- [ ] **Check 1 — Button renders:** After opening a file, confirm a "Копіювати" button appears after each code block, not inside it.

- [ ] **Check 2 — Empty blocks:** If any code block is empty (` ```\n``` `), confirm no button appears after it.

- [ ] **Check 3 — Copy works:** Click a copy button, then paste (`Ctrl+V`) into Notepad — confirm the code text is correct, including indentation.

  > **Clipboard note:** `navigator.clipboard.writeText()` is a native Web API — it does NOT require any entry in `src-tauri/capabilities/default.json` (those permissions only apply to Tauri `invoke()` IPC calls, not browser APIs). WebView2 runs under `https://tauri.localhost` (secure context), CSP is `null` in this project, and the window always has focus when the user clicks — so clipboard write works without any extra configuration. If it still fails, check the dev console for the exact error.

- [ ] **Check 4 — Multiple blocks numbered:** Open DevTools (right-click → Inspect in Tauri dev mode), confirm buttons have `aria-label="Копіювати код 1"`, `"Копіювати код 2"`, etc.

- [ ] **Check 5 — Spacing:** Confirm there is a small gap between `<pre>` and its button, and the normal `1em` gap between the button and the next paragraph/heading.

- [ ] **Check 6 — Font size scaling:** Press `Ctrl++` several times, confirm the button scales with the text.

- [ ] **Check 7 — Keyboard navigation:** Tab to a copy button, press Enter — confirm clipboard is updated (paste to Notepad).

- [ ] **Check 8 — New file resets numbering:** Open a second file with 3 code blocks — confirm buttons are numbered 1, 2, 3 (not continuing from the previous file).
