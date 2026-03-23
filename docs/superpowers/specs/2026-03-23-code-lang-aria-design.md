# Code Language in ARIA Labels — Design Spec

## Problem

When NVDA reads a code block, it announces "Код 1 —" (or "Code 1 —" in English). For a developer reading technical documentation, knowing the programming language before reading the block is critical for interpreting syntax, abbreviations, and keywords. The language is already available from the Markdown fence (` ```javascript `) — it just needs to be surfaced in the ARIA label.

## Decision Record

- **Only explicitly specified languages**: If the fence has no language (bare ` ``` `), the label stays without a language name. `highlightAuto` results are not used because they can be inaccurate.
- **Original fence name**: The label uses the exact string from the fence (`javascript`, `py`, `ts`) rather than mapping to human-readable names (`JavaScript`, `Python`, `TypeScript`). This is simpler and predictable.
- **Approach**: Custom `marked` renderer that sets `data-lang` on `<pre>`, then read from DOM when building ARIA labels.

## Design

### 1. Custom `code` renderer on `marked` instance

**File:** `src/main.js`, lines 103-114

Add a `renderer` option to the `new Marked(...)` constructor alongside the existing `markedHighlight` extension. The renderer's `code` method receives `{ text, lang }` where `text` is already highlighted HTML from `markedHighlight`.

```js
const marked = new Marked(
  { html: true },
  markedHighlight({ /* existing config */ }),
  {
    renderer: {
      code({ text, lang }) {
        const langAttr = lang ? ` data-lang="${lang}"` : "";
        const langClass = lang ? `hljs language-${lang}` : "hljs";
        return `<pre${langAttr}><code class="${langClass}">${text}</code></pre>\n`;
      }
    }
  }
);
```

When `lang` is present (author wrote ` ```javascript `), the `<pre>` gets `data-lang="javascript"`. When absent, no `data-lang` attribute is added.

### 2. Read `data-lang` when setting ARIA labels in `renderFile()`

**File:** `src/main.js`, `renderFile()` function (around line 273)

Current code:
```js
pre.setAttribute("aria-label", t("code.label", { index: codeBlockIndex }));
```

New code:
```js
const lang = pre.dataset.lang;
const labelKey = lang ? "code.labelLang" : "code.label";
const labelParams = lang ? { index: codeBlockIndex, lang } : { index: codeBlockIndex };
pre.setAttribute("aria-label", t(labelKey, labelParams));
```

### 3. Same change in `showHelp()`

**File:** `src/main.js`, `showHelp()` function (around line 337)

Apply the identical `data-lang` → `aria-label` logic.

### 4. New i18n key `code.labelLang`

**Files:**
- `src-tauri/src/locales/uk.json` — add `"code.labelLang": "Код {index}: {lang}"`
- `src-tauri/src/locales/en.json` — add `"code.labelLang": "Code {index}: {lang}"`

The existing `"code.label"` key remains unchanged for blocks without a language.

## What does NOT change

- `highlightAuto` continues to work for syntax highlighting — it just doesn't affect `data-lang`.
- Copy buttons — no changes.
- CSP — no new scripts or sources.
- DOMPurify sanitization — `data-lang` is a safe attribute, DOMPurify allows `data-*` by default.

## NVDA Behavior

| Fence | ARIA label (uk) | ARIA label (en) |
|-------|-----------------|-----------------|
| ` ```javascript ` | Код 1: javascript | Code 1: javascript |
| ` ```py ` | Код 1: py | Code 1: py |
| ` ``` ` (no lang) | Код 1 — | Code 1 — |

## Risks

- **DOMPurify and `data-lang`**: `data-*` attributes are allowed by DOMPurify's default config. Verified: DOMPurify does not strip `data-*` attributes.
- **`markedHighlight` interaction**: The custom renderer receives `text` already processed by `markedHighlight`, so highlight.js output is preserved. The renderer only wraps it in `<pre><code>`.
