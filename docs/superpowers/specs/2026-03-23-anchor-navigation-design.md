---
title: Anchor Navigation in Marka
date: 2026-03-23
status: approved
---

# Anchor Navigation Design

## Overview

Implement navigation to document anchors (`#section`) when users click or press Enter on internal links like `[text](#anchor)`. This enables structured navigation through markdown documents, which is essential for accessibility.

## Problem Statement

Markdown documents often include a table of contents with anchor links at the top:
```markdown
## [Table of Contents](#toc)

## Introduction {#introduction}
...

## Methods {#methods}
...
```

For blind users navigating large documents, anchor links are the primary way to jump between sections without sequential reading. Without working anchors, structured navigation is completely inaccessible.

## User Requirements

- **Anchors already present** in markdown documents (e.g., `{#section-id}` syntax)
- **Trigger on Enter key** when focused on a link with `href="#anchor"`
- **Also trigger on click** for mouse users
- **Focus transfer** to the target heading—NVDA reads it in browse mode
- **No history entry** created for anchor navigation (stays in same document)
- **Silent failure** if anchor doesn't exist (no error announcement)

## Design

### Behavior

#### Click on Anchor Link
1. User clicks `[text](#anchor)`
2. Check if `href` starts with `#`
3. If yes:
   - Prevent default browser behavior
   - Find element with `id="anchor"` (without `#`)
   - If found: focus it (browser auto-scrolls)
   - If not found: do nothing (silent)
4. If no (external URL or file path):
   - Apply current logic (open in browser or load file)

#### Enter on Anchor Link
1. User focuses link and presses Enter
2. Check if `href` starts with `#`
3. If yes:
   - Prevent default behavior
   - Find element by ID and focus it
4. If no:
   - Apply current logic

### Implementation Details

**File:** `src/main.js`

**Helper function to add:**
```javascript
function scrollToAnchor(anchorId) {
  const target = document.getElementById(anchorId);
  if (target) {
    target.focus();
  }
}
```

**Modify click handler** (lines 322–341):
- Add check: `if (href.startsWith("#")) { scrollToAnchor(href.slice(1)); return; }`
- Place before external/file checks

**Add keydown handler** (after click handler):
- Listen for `keydown` on all links in rendered content
- If `key === "Enter"` and `href.startsWith("#")`: `scrollToAnchor(href.slice(1))`

### Edge Cases

| Case | Behavior |
|------|----------|
| Anchor not found | Silent (no error) |
| Link without `href` | No change (current logic) |
| Duplicate `id` in DOM | Browser focuses first match (standard) |
| External anchor link (e.g., `file.md#section`) | Treated as file path (current logic) |

### Accessibility (NVDA)

- Focus transfer triggers NVDA to read the target element in browse mode
- No aria-live announcements (user preference for silent navigation)
- Standard heading semantics (`<h1>`, `<h2>`, etc.) ensure proper readout

### Navigation History

- Anchor navigation **does not** create a new history entry
- Alt+Left/Right still navigates between files, not anchors
- Aligns with browser convention and user expectation

## Testing Strategy

1. **Markdown with anchors** — verify marked.js preserves `id` attributes
2. **Click on anchor link** — focus should move, browser scrolls
3. **Enter on anchor link** — same behavior as click
4. **Anchor not found** — link still interactive, no error
5. **History** — Alt+Left/Right doesn't record anchor jumps
6. **NVDA** — verify heading is announced when focused

## Files Modified

- `src/main.js` — anchor detection, focus logic, key handler

## Follow-up Considerations

- Monitor if marked.js automatically generates `id` for headings (may simplify doc preparation)
- Consider adding keyboard focus indicator styling if not visible enough
