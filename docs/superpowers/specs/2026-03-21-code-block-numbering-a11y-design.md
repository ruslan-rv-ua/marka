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

**Files changed:** 2
- `src-tauri/src/locales/uk.json` — update `code.label` translation
- `src-tauri/src/locales/en.json` — update `code.label` translation
- `src/main.js` — pass `codeBlockIndex` to `t("code.label", { index: codeBlockIndex })`

**Lines affected:**
- Locales: 1 line per file (translation key change)
- main.js: 1 line change (line ~231 in the code block accessibility loop)

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

### Code Change in `main.js`

In the code block accessibility loop (currently lines 228–233):

**Current:**
```javascript
contentEl.querySelectorAll("pre").forEach((pre) => {
  pre.setAttribute("role", "region");
  pre.setAttribute("aria-label", t("code.label"));  // ← generic label
  pre.setAttribute("tabindex", "0");
});
```

**Updated:**
```javascript
let codeBlockIndex = 0;  // ← reuse existing counter from copy button loop
contentEl.querySelectorAll("pre").forEach((pre) => {
  if (pre.textContent.trim() === "") return;  // ← skip empty blocks (like copy button loop)
  codeBlockIndex++;
  pre.setAttribute("role", "region");
  pre.setAttribute("aria-label", t("code.label", { index: codeBlockIndex }));  // ← numbered label
  pre.setAttribute("tabindex", "0");
});
```

**Note:** The existing loop structure (lines 203–226) already counts non-empty code blocks in `codeBlockIndex`. The accessibility loop can reuse this same counter to ensure both copy buttons and aria-labels have matching numbers.

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

- Copy button numbering: `main.js` lines 203–210
- Current code block accessibility: `main.js` lines 228–233
- Translation system: `src/i18n.js` (simple parameter replacement via `{index}`)
- Locales structure: `src-tauri/src/locales/{uk,en}.json`

