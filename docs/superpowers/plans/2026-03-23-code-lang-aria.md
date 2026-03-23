# Code Language in ARIA Labels — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface the programming language name from Markdown fences in code block ARIA labels so NVDA announces e.g. "Код 1: javascript" instead of "Код 1 —".

**Architecture:** Custom `marked` code renderer adds `data-lang` attribute to `<pre>` elements when a fence language is explicitly specified. The existing DOM traversal in `renderFile()` and `showHelp()` reads `data-lang` and selects the appropriate i18n key.

**Tech Stack:** marked.js (renderer API), highlight.js (unchanged), i18n JSON files

**Spec:** `docs/superpowers/specs/2026-03-23-code-lang-aria-design.md`

---

### Task 1: Add `code.labelLang` i18n key to both locale files

**Files:**
- Modify: `src-tauri/src/locales/uk.json:7` (after `code.label`)
- Modify: `src-tauri/src/locales/en.json:7` (after `code.label`)

- [ ] **Step 1: Add the key to uk.json**

After the existing `"code.label": "Код {index} — ",` line, add:

```json
"code.labelLang": "Код {index}: {lang}",
```

- [ ] **Step 2: Add the key to en.json**

After the existing `"code.label": "Code {index} — ",` line, add:

```json
"code.labelLang": "Code {index}: {lang}",
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/locales/uk.json src-tauri/src/locales/en.json
git commit -m "feat(i18n): add code.labelLang key for language-annotated code blocks"
```

---

### Task 2: Add custom `code` renderer to marked instance

**Files:**
- Modify: `src/main.js:103-114` (the `new Marked(...)` constructor)

- [ ] **Step 1: Add renderer as third argument to `new Marked()`**

The current code at `src/main.js:103-114`:

```js
const marked = new Marked(
  { html: true },
  markedHighlight({
    langPrefix: "hljs language-",
    highlight(code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    },
  })
);
```

Replace with:

```js
const marked = new Marked(
  { html: true },
  markedHighlight({
    langPrefix: "hljs language-",
    highlight(code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    },
  }),
  {
    renderer: {
      code({ text, lang }) {
        const safeLang = lang ? lang.replace(/[^a-zA-Z0-9._+-]/g, "") : "";
        const langAttr = safeLang ? ` data-lang="${safeLang}"` : "";
        const langClass = safeLang ? `hljs language-${safeLang}` : "hljs";
        return `<pre${langAttr}><code class="${langClass}">${text}</code></pre>\n`;
      }
    }
  }
);
```

Key details:
- `safeLang` strips anything that isn't alphanumeric, `.`, `_`, `+`, or `-` (defense-in-depth against attribute injection)
- `data-lang` only appears when a fence language was explicitly provided
- `text` is already highlighted HTML from `markedHighlight` — this renderer only wraps it

- [ ] **Step 2: Verify — run `just vite-dev` and open a test markdown file with fenced code blocks**

Run: `just vite-dev`

Open a `.md` file containing:
- A ` ```javascript ` block
- A ` ```py ` block
- A bare ` ``` ` block

Use browser DevTools to inspect `<pre>` elements:
- ` ```javascript ` block → `<pre data-lang="javascript">` ✓
- ` ```py ` block → `<pre data-lang="py">` ✓
- bare ` ``` ` block → `<pre>` (no `data-lang`) ✓
- No double `<pre>` or `<code>` wrapping ✓
- Syntax highlighting still works ✓

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat: add custom code renderer with data-lang attribute on pre elements"
```

---

### Task 3: Use `data-lang` in ARIA labels in `renderFile()` and `showHelp()`

**Files:**
- Modify: `src/main.js:273` (inside `renderFile()`)
- Modify: `src/main.js:337` (inside `showHelp()`)

- [ ] **Step 1: Update ARIA label in `renderFile()`**

At `src/main.js:273`, replace:

```js
pre.setAttribute("aria-label", t("code.label", { index: codeBlockIndex }));
```

With:

```js
const lang = pre.dataset.lang;
const labelKey = lang ? "code.labelLang" : "code.label";
const labelParams = lang ? { index: codeBlockIndex, lang } : { index: codeBlockIndex };
pre.setAttribute("aria-label", t(labelKey, labelParams));
```

- [ ] **Step 2: Update ARIA label in `showHelp()`**

At `src/main.js:337`, replace:

```js
pre.setAttribute("aria-label", t("code.label", { index: codeBlockIndex }));
```

With:

```js
const lang = pre.dataset.lang;
const labelKey = lang ? "code.labelLang" : "code.label";
const labelParams = lang ? { index: codeBlockIndex, lang } : { index: codeBlockIndex };
pre.setAttribute("aria-label", t(labelKey, labelParams));
```

- [ ] **Step 3: Verify with NVDA**

Run: `just dev`

Open a `.md` file with fenced code blocks. Tab to each `<pre>` region and confirm NVDA announces:
- ` ```javascript ` → "Код 1: javascript" ✓
- ` ```py ` → "Код 2: py" ✓
- bare ` ``` ` → "Код 3 —" ✓

Also open help screen (launch without file) and verify code blocks still have ARIA labels.

- [ ] **Step 4: Commit**

```bash
git add src/main.js
git commit -m "feat: include language name in code block ARIA labels for NVDA"
```
