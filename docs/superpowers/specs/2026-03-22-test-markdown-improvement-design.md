# Design: Test Markdown Files Improvement

**Date:** 2026-03-22
**Project:** Marka — Tauri v2 Markdown viewer
**Status:** Approved
**Encoding:** All files must be UTF-8 without BOM.

---

## Overview

Improve and expand the `test-markdown/` folder to provide full coverage of all app features: Markdown rendering, NVDA accessibility, security (DOMPurify/XSS), Unicode/multilingual content, and edge cases.

---

## Current State

Five test files exist:

| File | Coverage |
|------|----------|
| `test-complete.md` | Basic Markdown elements |
| `test-all-languages.md` | 10 programming languages |
| `test-images.md` | External and local images |
| `test-links.md` | Cross-file and external links |
| `test-mixed.md` | Combination of links and images |

**Gaps identified:**
- No NVDA-specific accessibility tests (code block numbering, copy buttons, focus flow)
- No security/XSS sanitization tests (DOMPurify)
- No Unicode, cyrillic, emoji, RTL tests
- No edge case tests (broken images, empty blocks, long lines, etc.)
- No video/audio tests (fixMediaSrc() supports them, untested)
- Missing code languages (SQL, JSON, YAML, Bash, CSS, C#, Kotlin, Dockerfile)

---

## Approach

Mixed: extend 3 existing files where content fits organically, add 4 new focused files.

---

## Changes

### New Files

#### `test-markdown/test-nvda.md`

Purpose: Dedicated NVDA screen reader accessibility testing.

**What "renders without errors" means here:** the file opens in Marka, the content area is populated, and no error `<p role="alert">` element appears in the DOM.

Contents:
- **10+ consecutive code blocks** (mix of languages) — verify aria-label numbering: "Блок коду 1", "Блок коду 2", ... "Блок коду 10+". Numbering must be sequential with no gaps.
- **Empty code block placed mid-sequence** — ```` ``` ``` ```` with no content. Must be skipped: the sequence counter must not increment, and no copy button must be added. The next non-empty block must continue the prior count.
- **Whitespace-only code block** — same skip rule as empty.
- **Very long code block** (50+ lines) — verify tab navigation enters the block and scrolling works inside it.
- **Language-less code block** — auto-detection fallback; must still receive an aria-label and copy button.
- **All heading levels H1–H6 in sequence** — for verifying NVDA browse mode H-key navigation.
- **Tab order section** — include 3 links followed by 3 code blocks in document order. This gives a concrete sequence to Tab through: link 1 → link 2 → link 3 → copy button 1 → copy button 2 → copy button 3. Inline instruction states expected Tab order.
- **Inline instructions** as visible paragraph text before each section, stating exactly what to verify (e.g., "NVDA має оголосити: Блок коду 1, регіон").
- **Note on `role="document"`**: this is a property of the app shell (`index.html`), not the Markdown file. The file includes a checklist annotation reminding the tester to verify it via DevTools or NVDA object inspector, but no Markdown content can affect it.

#### `test-markdown/test-security.md`

Purpose: Verify DOMPurify sanitizes dangerous content. All attacks must silently disappear — no popups, no code execution.

**How to verify:** open the file in Marka and check that (a) no alert dialogs appear, and (b) DevTools console shows no uncaught errors or CSP violations. DOMPurify must strip the attribute or tag entirely — the rendered HTML must not contain `onerror`, `onclick`, `onload`, `onmouseover`, `<script>`, `<iframe>`, `<object>`, or `<embed>` tags.

Contents by category:
- **Script injection** — `<script>alert('xss')</script>` inline and in an HTML block. Expected: tag stripped entirely, no text rendered.
- **Event handlers** — `<img src="x" onerror="alert(1)">`, `<div onclick="alert(1)">text</div>`, `onmouseover`, `onload` on various elements. Expected: element rendered but event attribute stripped.
- **javascript: href** — `[click me](javascript:alert(1))`. Expected: DOMPurify strips the `href` entirely, rendering a link with no `href` attribute (not clickable, no navigation).
- **data: URI in image src** — `<img src="data:text/html,<script>alert(1)</script>">`. Expected: `src` attribute stripped.
- **Dangerous tags** — `<iframe src="https://example.com">`, `<object>`, `<embed>`. Expected: tags stripped entirely, no content rendered.
- **SVG with payload** — `<svg onload="alert(1)"><circle r="50"/></svg>`. Expected: `onload` attribute stripped; SVG may or may not render (DOMPurify default: SVG allowed, event attributes stripped).
- **Markdown-specific vectors** — image with XSS in title: `![img](x.png "onmouseover=alert(1)")`. Expected: title attribute stripped or sanitized.

#### `test-markdown/test-unicode.md`

Purpose: Verify rendering of non-ASCII characters and multilingual content.

**What "renders correctly" means:** each character or sequence appears as a visible glyph (not a replacement character □ or mojibake), and the page layout does not overflow or collapse. The following characters are the must-pass baseline: Ukrainian cyrillic (А-Я а-я і ї є ґ), composite emoji (👨‍💻 🇺🇦), math (∑ √ ∞), typography (— … «»), Arabic (مرحبا), Chinese (你好).

Contents:
- **Cyrillic** — headings, paragraphs, lists, tables in Ukrainian; code block with cyrillic variable names (`змінна`, `функція`, `let результат = 42`)
- **Emoji** — in text, headings, lists, tables, code blocks; composite sequences: 👨‍💻 (ZWJ sequence), 🇺🇦 (flag), 🏳️‍🌈 (ZWJ flag)
- **Math symbols** — ∑ ∫ √ ∞ ± ≤ ≥ π φ → ← ⊕ ∧ ∨
- **Typography** — em dash —, en dash –, ellipsis …, guillemets «», curly quotes "", '', arrows →←↑↓
- **Other scripts** — Arabic right-to-left (مرحبا بالعالم), Chinese (你好，世界), Japanese hiragana (こんにちは), Korean (안녕하세요), Hebrew (שלום עולם) — each in its own paragraph to test bidirectional text isolation
- **Special characters** — non-breaking space (U+00A0), soft hyphen (U+00AD), zero-width space (U+200B) — each labeled with its Unicode codepoint
- **Box drawing** — ┌─┬─┐ │ │ └─┴─┘ for ASCII diagrams in a code block

#### `test-markdown/test-edge-cases.md`

Purpose: Verify graceful handling of unusual or broken content. "No crashes or unhandled errors" means: no error `<p role="alert">` appears, no uncaught exceptions in DevTools console, and the app remains interactive after opening.

**Note on empty/whitespace code blocks:** `test-nvda.md` also includes these to verify numbering continuity. This file tests the same behavior independently as a DOM/rendering concern, not as an accessibility concern. The duplication is intentional: one file tests "does NVDA read the correct number?", the other tests "is the DOM correct?"

Contents:
- **Empty code block** — ```` ``` ``` ```` — must not receive `role="region"`, `aria-label`, `tabindex`, or copy button
- **Whitespace-only code block** — ```` ```\n   \n``` ```` — same: skipped
- **Very long line** — single line of 500+ alphanumeric characters with no spaces or breaks — verify horizontal scroll or text overflow clipping (no layout breakage)
- **Broken image** — `![alt text описовий](nonexistent-file.png)` — browser shows broken image icon; alt text "alt text описовий" must be present in the DOM
- **Link to nonexistent local file** — `[відкрити файл](missing-file.md)` — clicking must trigger `renderFile()` which calls `read_file`; Rust returns error; app renders error `<p role="alert">` with Ukrainian message; app must remain functional after
- **Empty href link** — `[текст]()` — must render as a link with empty href; clicking must not crash
- **Hash-only link** — `[текст](#)` — must render as an anchor link
- **Deep blockquote nesting** — 6 levels of `>` — must render without layout overflow
- **Deep list nesting** — 5 levels of indented list items — must render without layout overflow
- **Table with long content** — cells containing 200+ characters; also a cell containing `**bold**` markdown — bold must render inside the cell
- **Markdown inside code block** — `` `**not bold**` `` and a fenced block with `**not bold**` — must appear as literal asterisks
- **Very long H1** — `# ` followed by 200 characters — must wrap or clip without breaking layout
- **Anchor target heading** — a heading with `{#edge-target}` id, and a link `[go to target](#edge-target)` — clicking must scroll to the heading

---

### Extensions to Existing Files

#### `test-all-languages.md` — add 8 languages

Languages to add: SQL, JSON, YAML, Bash/Shell, CSS, C#, Kotlin, Dockerfile.

Each follows the same format as existing entries: language name as H2, description paragraph, fenced code block with language identifier, explanation paragraph.

**How to verify syntax highlighting:** inspect the rendered HTML and confirm that `<span class="hljs-...">` elements are present inside the `<code>` block. At minimum, keywords must be wrapped in highlight spans.

#### `test-images.md` — add video/audio

Add sections using relative paths (e.g., `./sample.mp4`, `./sample.mp3`, `./sample.webm`) as src values. These files will not exist; the purpose is to verify that `fixMediaSrc()` transforms the `src` attribute.

**How to verify:** open DevTools after loading the file and inspect the `src` attribute of the video/audio element. It must be a `tauri://localhost/...` or `asset://...` URI (the result of `convertFileSrc()`), not the original relative path. The element rendering a broken media placeholder is expected and acceptable.

Add sections:
- `<video src="./sample.mp4" controls></video>` — verify `src` is transformed
- `<audio src="./sample.mp3" controls></audio>` — verify `src` is transformed
- `<video controls><source src="./sample.webm" type="video/webm"></video>` — verify `<source src>` is transformed

#### `test-complete.md` — add missing elements

Add two sections at the end (before the final `---` and "End of test file"):

- **Section 15: Anchor Links** — include a heading `### Anchor Target {#anchor-target-id}` and a link `[Go to anchor target](#anchor-target-id)`. Both must be present in the same file. Clicking the link must scroll to the heading.
- **Section 16: Long Lines** — a paragraph containing a single word/token of 500+ characters (e.g., `AAAA...` repeated). Must not break the page layout; horizontal scrollbar or text clipping is acceptable.

---

## File Count Summary

| Action | Files |
|--------|-------|
| New | `test-nvda.md`, `test-security.md`, `test-unicode.md`, `test-edge-cases.md` |
| Extended | `test-all-languages.md`, `test-images.md`, `test-complete.md` |
| Unchanged | `test-links.md`, `test-mixed.md` |

---

## Success Criteria

**Definition of "renders without errors":** the file opens in Marka, the content area is populated with rendered HTML, and no `<p role="alert">` error element appears in the DOM.

| File | Criteria |
|------|----------|
| All files | No `<p role="alert">` in DOM; no uncaught exceptions in DevTools console |
| `test-nvda.md` | Code blocks numbered sequentially (1, 2, 3...); empty/whitespace blocks skipped (counter does not increment); each non-empty block has `role="region"`, `aria-label="Блок коду N"`, `tabindex="0"`, and a copy button |
| `test-security.md` | No alert dialogs; DevTools console shows no uncaught errors or CSP violations; rendered HTML contains no `onerror`, `onclick`, `onload`, `<script>`, `<iframe>`, `<object>`, `<embed>` |
| `test-unicode.md` | Must-pass characters (Ukrainian cyrillic, composite emoji, math, Arabic, Chinese) render as glyphs, not replacement characters; no layout overflow |
| `test-edge-cases.md` | No uncaught exceptions; app remains interactive after opening; error cases (missing file link) show Ukrainian error message |
| `test-all-languages.md` | Each new language block contains `<span class="hljs-...">` elements in rendered HTML |
| `test-images.md` | Video/audio `src` attributes in DOM are `tauri://` or `asset://` URIs, not the original relative paths |
