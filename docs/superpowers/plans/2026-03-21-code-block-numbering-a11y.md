# Code Block Numbering for Screen Reader Accessibility — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add numbered aria-labels to code blocks (e.g., "Код 1 — регіон") so NVDA screen reader users can distinguish between multiple code blocks in a document.

**Architecture:** Reuse the existing `codeBlockIndex` counter from the copy button loop and extend it to the code block accessibility loop. Both loops must filter identically and iterate in the same order to keep numbering synchronized. Translations are updated to include a `{index}` parameter.

**Tech Stack:**
- Frontend: vanilla JavaScript (src/main.js)
- Localization: JSON translation files (src-tauri/src/locales/{uk,en}.json)
- Build: `pnpm dev` (Tauri + Vite)

---

## Task 1: Update Ukrainian Translation

**Files:**
- Modify: `src-tauri/src/locales/uk.json:7`

**Rationale:** The translation key `code.label` is currently generic ("Блок коду"). We need to add `{index}` parameter support for numbering.

- [ ] **Step 1: Read the current Ukrainian locale file**

Open `src-tauri/src/locales/uk.json` and verify current content (7 keys total, line ~7 has `"code.label": "Блок коду"`).

- [ ] **Step 2: Update the translation string**

Replace line 7:
```json
  "code.label": "Блок коду",
```

With:
```json
  "code.label": "Код {index} — регіон",
```

**Note:** Preserve the trailing comma (JSON list). The em-dash + space is intentional for NVDA pause.

- [ ] **Step 3: Verify JSON syntax is valid**

Run: `cat src-tauri/src/locales/uk.json` (or open in editor)

Expected: Valid JSON structure (no syntax errors, all braces/brackets matched).

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/locales/uk.json
git commit -m "feat: add {index} parameter to Ukrainian code.label translation"
```

---

## Task 2: Update English Translation

**Files:**
- Modify: `src-tauri/src/locales/en.json:7`

**Rationale:** Same change as Ukrainian, for English-language context.

- [ ] **Step 1: Read the current English locale file**

Open `src-tauri/src/locales/en.json` and verify current content (line ~7 has `"code.label": "Code block"`).

- [ ] **Step 2: Update the translation string**

Replace line 7:
```json
  "code.label": "Code block",
```

With:
```json
  "code.label": "Code {index} — region",
```

**Note:** Preserve the trailing comma. Pattern matches Ukrainian (em-dash + space for pause).

- [ ] **Step 3: Verify JSON syntax is valid**

Run: `cat src-tauri/src/locales/en.json`

Expected: Valid JSON structure.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/locales/en.json
git commit -m "feat: add {index} parameter to English code.label translation"
```

---

## Task 3: Refactor Code Block Loop in main.js

**Files:**
- Modify: `src/main.js:202-233`

**Rationale:** The code block accessibility loop (currently lines 228–233) sets aria-labels to generic text. We need to:
1. Move `codeBlockIndex` declaration before both loops (line 202)
2. Modify the accessibility loop to filter, increment, and pass index to the translation function
3. Reset counter before the second loop to ensure both loops count identically

This ensures copy buttons and code block aria-labels have matching numbers.

- [ ] **Step 1: Read the current code block loop section**

Open `src/main.js` and read lines 201–233 (from `const myGeneration` through the code block accessibility loop).

Verify:
- Line 202: `let codeBlockIndex = 0;` exists in the copy button loop
- Line 204: Copy button loop starts with `contentEl.querySelectorAll("pre").forEach((pre) => {`
- Line 205: Empty block check: `if (pre.textContent.trim() === "") return;`
- Line 206: Increment: `codeBlockIndex++;`
- Line 228: Accessibility loop starts with `contentEl.querySelectorAll("pre").forEach((pre) => {`
- Line 229: Accessibility loop calls `pre.setAttribute("aria-label", t("code.label"));` (generic, no index)

- [ ] **Step 2: Move counter declaration outside both loops**

Find line 202 with `let codeBlockIndex = 0;` inside the copy button loop.

Cut this line and paste it **before** the copy button loop (after line 201, which declares `const myGeneration`).

New structure:
```javascript
const myGeneration = ++renderGeneration;
let codeBlockIndex = 0;  // ← moved here

contentEl.querySelectorAll("pre").forEach((pre) => {  // copy button loop starts
  if (pre.textContent.trim() === "") return;
  codeBlockIndex++;
  // ... rest of copy button loop
});
```

- [ ] **Step 3: Add counter reset before accessibility loop**

Before the accessibility loop (before line ~228), add:
```javascript
codeBlockIndex = 0;  // Reset counter for second pass
```

This ensures the accessibility loop starts numbering from 1 again (both loops iterate identically).

- [ ] **Step 4: Modify accessibility loop to use indexed aria-label**

Replace the entire accessibility loop (currently lines 228–233):

**Before:**
```javascript
contentEl.querySelectorAll("pre").forEach((pre) => {
  pre.setAttribute("role", "region");
  pre.setAttribute("aria-label", t("code.label"));
  pre.setAttribute("tabindex", "0");
});
```

**After:**
```javascript
contentEl.querySelectorAll("pre").forEach((pre) => {
  if (pre.textContent.trim() === "") return;  // ← must filter identically to copy loop
  codeBlockIndex++;
  pre.setAttribute("role", "region");
  pre.setAttribute("aria-label", t("code.label", { index: codeBlockIndex }));  // ← pass index
  pre.setAttribute("tabindex", "0");
});
```

**Critical:** The empty-block check (`if (pre.textContent.trim() === "") return;`) MUST match the copy button loop exactly. Both loops must count non-empty blocks in the same order.

- [ ] **Step 5: Verify the refactored code structure**

Read lines 201–240 (or the entire `renderFile` function) and confirm:
- `codeBlockIndex` is declared once at line 202 (before both loops)
- Copy button loop (lines ~204–226) increments the counter
- `codeBlockIndex = 0;` reset exists before accessibility loop
- Accessibility loop (lines ~230–237) also filters, increments, and passes `{ index: codeBlockIndex }`
- Both loops have identical empty-block filters

- [ ] **Step 6: Test in dev mode**

Run: `pnpm dev`

Expected:
- App starts, no console errors
- Open a file with 2+ code blocks via Ctrl+O
- Visual appearance unchanged (no visible numbering added)
- Copy buttons still visible and functional

- [ ] **Step 7: Verify NVDA behavior (manual test)**

Using NVDA or another screen reader:
- Navigate to the first code block (Tab/arrow keys)
- Verify NVDA announces: "Код 1 — регіон" (Ukrainian) or "Code 1 — region" (English)
- Navigate to the second code block
- Verify NVDA announces: "Код 2 — регіон" or "Code 2 — region"
- Verify numbering matches copy button labels ("Копіювати код 1", "Копіювати код 2", etc.)

*Note: This manual test requires NVDA or a similar screen reader. If not available, skip this step and rely on code review.*

- [ ] **Step 8: Commit**

```bash
git add src/main.js
git commit -m "feat: add numbered aria-labels to code blocks for NVDA accessibility"
```

---

## Task 4: Final Integration Check

**Files:**
- No files modified (verification only)

**Rationale:** Ensure the entire feature works end-to-end without side effects.

- [ ] **Step 1: Open a test Markdown file with code blocks**

Create a temporary test file (or use an existing one) with 3+ code blocks:
```markdown
# Test Document

First block:
\`\`\`javascript
console.log("hello");
\`\`\`

Second block:
\`\`\`python
print("world")
\`\`\`

Third block (empty):
\`\`\`
\`\`\`

Fourth block:
\`\`\`bash
echo "done"
\`\`\`
```

Run: `pnpm dev`, then Ctrl+O to open the test file.

- [ ] **Step 2: Verify visual rendering**

Expected:
- All 3 non-empty code blocks render with syntax highlighting
- Copy buttons appear in the top-right corner of each non-empty block
- Copy buttons are numbered: "Копіювати код 1", "Копіювати код 2", "Копіювати код 3"
- Empty code block has no copy button (skipped)
- No visual numbering on the blocks themselves (numbering is hidden for sighted users)

- [ ] **Step 3: Verify NVDA numbering (if available)**

Using NVDA:
- Tab to first code block → announces "Код 1 — регіон"
- Tab to second code block → announces "Код 2 — регіон"
- Tab to third code block → announces "Код 3 — регіон"
- Verify numbers match copy button numbers

- [ ] **Step 4: Verify theme toggle (light/dark)**

Run: Ctrl+T to toggle theme

Expected:
- Theme changes visually
- Code blocks remain unchanged
- Numbering still works (no side effects from theme change)

- [ ] **Step 5: Open a different file**

Open a new file with 2 code blocks via Ctrl+O.

Expected:
- Numbering resets: first block is "Код 1 — регіон", second is "Код 2 — регіон"
- Counter does not carry over from previous file (correct behavior)

- [ ] **Step 6: Verify font size and padding adjustments**

Run: Ctrl+= (increase font size), Ctrl+- (decrease), Ctrl+[ (decrease padding), Ctrl+] (increase padding)

Expected:
- Font and padding adjust without side effects
- Code block numbering still works

- [ ] **Step 7: Verify no console errors**

Open browser DevTools (F12) and check Console.

Expected:
- No errors or warnings related to code blocks or translations
- i18n system correctly loads translated strings

---

## Testing Summary

| Aspect | Test | Expected |
|--------|------|----------|
| Translations | Read uk.json and en.json | `code.label` has `{index}` parameter |
| Counter sync | Check main.js lines 202–237 | Both loops share counter, filter identically |
| Visual | Open file with 3 blocks | Copy buttons numbered 1, 2, 3; no visual changes |
| NVDA | Tab to blocks | Announces "Код 1 — регіон", "Код 2 — регіон", "Код 3 — регіон" |
| Theme toggle | Ctrl+T | Numbering unaffected |
| File switch | Ctrl+O → new file | Numbering resets per file |
| Font/padding | Ctrl±, Ctrl[ Ctrl] | Numbering unaffected |
| Console | DevTools | No errors |

---

## Rollback Plan

If critical issues arise after implementation:

1. **Revert translations:**
   ```bash
   git revert <commit-hash-for-translations>
   ```

2. **Revert main.js:**
   ```bash
   git revert <commit-hash-for-main.js>
   ```

3. **Restore aria-label to generic:**
   In `main.js` lines 228–233, change back to:
   ```javascript
   pre.setAttribute("aria-label", t("code.label"));  // no index parameter
   ```

All changes are isolated and reversible. No database migrations, no config changes.

---

## Success Criteria

✅ All steps completed
✅ NVDA announces numbered code blocks ("Код 1 — регіон", etc.)
✅ Copy button numbers match aria-label numbers
✅ No visual changes for sighted users
✅ No console errors
✅ Theme toggle, font sizing, file switching all work without side effects
✅ All commits created with clear messages

---

## Next Steps (After Implementation)

- [ ] Review the implementation with `@superpowers:requesting-code-review` (if desired)
- [ ] Test across multiple files and keyboard layouts
- [ ] Consider adding a regression test or documentation note (optional, since no test suite exists)

