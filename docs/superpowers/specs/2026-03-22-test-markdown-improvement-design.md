# Design: Test Markdown Files Improvement

**Date:** 2026-03-22
**Project:** Marka — Tauri v2 Markdown viewer
**Status:** Approved

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

Contents:
- **10+ consecutive code blocks** — verify aria-label numbering: "Блок коду 1", "Блок коду 2", ... "Блок коду 10+"
- **Empty code block** — must be skipped (no number, no copy button assigned)
- **Whitespace-only code block** — same: must be skipped
- **Very long code block** — verify tab navigation and scrolling inside the block
- **Language-less code block** — auto-detection fallback
- **All heading levels H1–H6** — verify browse mode navigation (H key in NVDA)
- **Landmark regions** — verify `role="document"` on main content area
- **Tab order check** — links → copy buttons, Tab key traversal between interactive elements
- **Inline instructions** in the file itself (as visible text) explaining what to verify for each section

#### `test-markdown/test-security.md`

Purpose: Verify DOMPurify sanitizes dangerous content. All attacks must silently disappear — no popups, no code execution.

Contents by category:
- **Script injection** — `<script>alert('xss')</script>` inline and in HTML blocks
- **Event handlers** — `<img onerror="alert(1)">`, `onclick`, `onmouseover`, `onload` on various elements
- **javascript: href** — `[click](javascript:alert(1))` — must render as text or safe link
- **data: URI** — `<img src="data:text/html,<script>alert(1)</script>">` — must be blocked
- **Dangerous tags** — `<iframe>`, `<object>`, `<embed>` — must be stripped entirely
- **SVG with payload** — `<svg onload="alert(1)"><circle/></svg>`
- **Markdown-specific vectors** — XSS in image alt text, title attribute, link href

Format: each case has: description of attack → expected result → instruction to verify nothing executed.

#### `test-markdown/test-unicode.md`

Purpose: Verify rendering of non-ASCII characters and multilingual content.

Contents:
- **Cyrillic** — headings, paragraphs, lists, tables in Ukrainian; code with cyrillic variable names (`змінна`, `функція`)
- **Emoji** — in text, headings, lists, tables, code blocks; composite sequences: 👨‍💻, 🇺🇦, 🏳️‍🌈
- **Math symbols** — ∑ ∫ √ ∞ ± ≤ ≥ π φ → ← ⊕ ∧ ∨
- **Typography** — em dash —, en dash –, ellipsis …, guillemets «», curly quotes "", '', arrows →←↑↓
- **Other scripts** — Arabic (RTL), Chinese, Japanese (kana), Korean, Hebrew — bidirectional text
- **Special characters** — non-breaking space, soft hyphen, zero-width characters
- **Box drawing** — ┌─┐│└─┘ for ASCII diagrams in code blocks

#### `test-markdown/test-edge-cases.md`

Purpose: Verify graceful handling of unusual or broken content.

Contents:
- **Empty code block** — ` ``` ``` ` — must not receive a number or copy button
- **Whitespace-only code block** — same behavior
- **Very long line** — 500+ chars without breaks — verify horizontal scroll or clipping
- **Broken image** — `![img](nonexistent.png)` — alt text must be readable
- **Link to nonexistent file** — `[file](missing.md)` — app must handle error gracefully
- **Empty link** — `[text]()` and `[text](#)`
- **Deep nesting** — blockquotes 6+ levels, lists 5+ levels
- **Table with long content** — cells with 200+ characters, markdown inside cells
- **Markdown inside code block** — `**not bold**` must appear as literal text
- **Very long H1** — heading with 200+ characters
- **Image-only file** — minimal file with no text content

---

### Extensions to Existing Files

#### `test-all-languages.md` — add 8 languages

Languages to add: SQL, JSON, YAML, Bash/Shell, CSS, C#, Kotlin, Dockerfile.

Each follows the same format as existing entries: language description paragraph, code block, explanation paragraph.

#### `test-images.md` — add video/audio

Add sections:
- `<video src="...">` with local src — verify `fixMediaSrc()` converts path via `convertFileSrc()`
- `<audio src="...">` with local src — same verification
- `<video><source src="..."></video>` — verify nested `source[src]` is also converted
- Note in file that actual video/audio files may not exist; fallback/error rendering should be graceful

#### `test-complete.md` — add missing elements

Add two sections:
- **Anchor links** — links to `#custom-id` headings, verify scroll-to behavior
- **Long lines** — a 300+ character line without breaks, verify layout behavior

---

## File Count Summary

| Action | Files |
|--------|-------|
| New | `test-nvda.md`, `test-security.md`, `test-unicode.md`, `test-edge-cases.md` |
| Extended | `test-all-languages.md`, `test-images.md`, `test-complete.md` |
| Unchanged | `test-links.md`, `test-mixed.md` |

---

## Success Criteria

- Opening each file in Marka renders without errors
- `test-nvda.md`: code blocks numbered sequentially, empty blocks skipped, copy buttons present
- `test-security.md`: no JavaScript alerts or console errors when rendering
- `test-unicode.md`: all scripts render correctly, no mojibake or layout breaks
- `test-edge-cases.md`: no crashes or unhandled errors for any edge case
- `test-all-languages.md`: all new languages have syntax highlighting applied
- `test-images.md`: video/audio elements present in DOM (even if media files absent)
