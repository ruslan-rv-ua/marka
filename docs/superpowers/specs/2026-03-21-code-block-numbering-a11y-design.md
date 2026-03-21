# Code Block Numbering for Screen Reader Accessibility — Design Spec

**Date:** 2026-03-21
**Status:** In Review
**Scope:** Small feature — NVDA accessibility improvement for code blocks

---

## Problem Statement

Currently, screen reader users (NVDA) hear "Блок коду регіон" (generic) for every code block in a document, making it hard to reference or distinguish between multiple blocks.

Goal: Make code blocks numbered for screen readers only, so NVDA announces "Код 1 — регіон", "Код 2 — регіон", etc. The em-dash creates a short pause that improves comprehension.

---

## Requirements

1. **Numbering:** Code blocks must be numbered sequentially (1, 2, 3…) based on render order
2. **Screen-reader-only:** Visual appearance unchanged — numbering is hidden from sighted users (pure aria-label change)
3. **Localization:** Translations must exist for both Ukrainian ("Код {index} — регіон") and English ("Code {index} — region")
4. **Pattern consistency:** Follow the same pattern used for copy button numbering (`copy.button`: "Копіювати код {index}")
5. **No side effects:** All other code block behavior (copy button, syntax highlighting, tabindex, role) remains unchanged

---

## Implementation Scope

**Files changed:** 3
- `src-tauri/src/locales/uk.json` — update `code.label` translation
- `src-tauri/src/locales/en.json` — update `code.label` translation
- `src/main.js` — modify code block accessibility loop to use numbered aria-labels

**Lines affected:**
- Locales: 1 line per file (translation key change)
- main.js: lines 228-233 (code block accessibility loop — reuse existing `codeBlockIndex` counter from copy button loop)

---

## Design Details

### Translation Strings

**Ukrainian (`src-tauri/src/locales/uk.json`):**
```json
"code.label": "Код {index} — регіон"
```

**English (`src-tauri/src/locales/en.json`):**
```json
"code.label": "Code {index} — region"
```

**Note on em-dash:** The em-dash (—) before "регіон"/"region" is intentional. The user (a blind NVDA user) requested this phrasing specifically because the em-dash creates a short pause that improves comprehension when listening to the aria-label. This deviates from standard ARIA conventions (which typically omit punctuation in labels), but is explicitly chosen based on the user's accessibility experience.

### Code Change in `main.js`

**Strategy:** Move the `codeBlockIndex` declaration *before* the copy button loop (line 203) so both loops share the same counter. This ensures copy buttons and aria-labels have synchronized numbering.

**Current state (lines 201–233):**
```javascript
// Line 201–226: Copy button loop
const myGeneration = ++renderGeneration;
let codeBlockIndex = 0;  // ← declared here
contentEl.querySelectorAll("pre").forEach((pre) => {
  if (pre.textContent.trim() === "") return;
  codeBlockIndex++;
  // ... create copy button with aria-label: t("copy.button", { index: codeBlockIndex })
});

// Line 228–233: Code block accessibility loop (SEPARATE LOOP, uses new counter)
contentEl.querySelectorAll("pre").forEach((pre) => {
  pre.setAttribute("role", "region");
  pre.setAttribute("aria-label", t("code.label"));  // ← generic label, no index
  pre.setAttribute("tabindex", "0");
});
```

**Updated (refactored for counter reuse):**
```javascript
// Line 201–202: Move counter declaration here, before both loops
const myGeneration = ++renderGeneration;
let codeBlockIndex = 0;  // ← shared counter for both loops

// First loop: add copy buttons (lines 203–226)
contentEl.querySelectorAll("pre").forEach((pre) => {
  if (pre.textContent.trim() === "") return;
  codeBlockIndex++;
  // ... create copy button with aria-label: t("copy.button", { index: codeBlockIndex })
});

// Second loop: set code block aria-labels (lines 228–233)
codeBlockIndex = 0;  // ← reset counter for second pass
contentEl.querySelectorAll("pre").forEach((pre) => {
  if (pre.textContent.trim() === "") return;  // ← must filter identically
  codeBlockIndex++;
  pre.setAttribute("role", "region");
  pre.setAttribute("aria-label", t("code.label", { index: codeBlockIndex }));  // ← numbered label
  pre.setAttribute("tabindex", "0");
});
```

**Critical:** Both loops must filter identically (`if (pre.textContent.trim() === "") return;`), iterate in the same order, and increment the counter in the same sequence to ensure copy button numbers and aria-label numbers stay synchronized.

---

## Testing Checklist

- [ ] NVDA announces "Код 1 — регіон", "Код 2 — регіон", etc. when navigating code blocks
- [ ] Copy buttons still say "Копіювати код 1", "Копіювати код 2", matching the code block numbers
- [ ] Empty code blocks (if any) are skipped and do not increment the counter
- [ ] Visual appearance is unchanged (no visual numbering added)
- [ ] Both Ukrainian and English translations work correctly
- [ ] Switching themes (light/dark) does not affect numbering
- [ ] Multiple files with code blocks render correctly

---

## Accessibility Impact

**Positive:**
- Screen reader users can now clearly identify and reference specific code blocks ("see code block 2")
- Pairing with numbered copy buttons creates clear mental associations
- Em-dash pause improves comprehension

**No negative impact:**
- Sighted users see no visual changes
- Copy button functionality unchanged
- Code syntax highlighting unchanged
- Keyboard navigation unchanged

---

## Edge Cases

1. **Empty code blocks:** Already handled in the existing loop — both copy button numbering and aria-label numbering will skip them
2. **Single code block:** Will be announced as "Код 1 — регіон" (minimal but clear)
3. **Many code blocks:** Numbering has no practical upper limit
4. **Inline code:** Not affected (only `<pre>` blocks get aria-labels; inline `<code>` elements are not labeled)

---

## Rollback Plan

If issues arise, revert the 3 changed lines:
- Restore original `code.label` translations (1 line per locale file)
- Restore main.js line to pass no index parameter

No database changes, no migrations, no structural changes — fully reversible.

---

## Related Code

- Copy button numbering loop: `main.js` lines 203–226 (full loop including createElement, aria-label, event handler)
- Current code block accessibility loop: `main.js` lines 228–233 (sets role, aria-label, tabindex)
- Translation system: `src/i18n.js` lines 22–27 (simple parameter replacement via `{index}`)
- Locales structure: `src-tauri/src/locales/{uk,en}.json`

