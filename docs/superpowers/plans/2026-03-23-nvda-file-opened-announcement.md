# NVDA File-Opened Announcement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Announce the file name via NVDA when a file is opened (Ctrl+O, CLI, local link navigation).

**Architecture:** Add `announce()` call in `navigateTo()` after successful `renderFile()`. Make `renderFile()` return a boolean to distinguish success from error. Add one i18n key per locale.

**Tech Stack:** JavaScript (Tauri v2 frontend), JSON i18n files

**Spec:** `docs/superpowers/specs/2026-03-23-nvda-file-opened-announcement-design.md`

---

### Task 1: Add i18n keys

**Files:**
- Modify: `src-tauri/src/locales/uk.json:12` (before closing `}`)
- Modify: `src-tauri/src/locales/en.json:12` (before closing `}`)

- [ ] **Step 1: Add Ukrainian key**

In `src-tauri/src/locales/uk.json`, add comma after the last entry and new key:

```json
  "history.empty": "Немає куди переходити",
  "file.opened": "Відкрито: {file}"
```

- [ ] **Step 2: Add English key**

In `src-tauri/src/locales/en.json`, add comma after the last entry and new key:

```json
  "history.empty": "No navigation history",
  "file.opened": "Opened: {file}"
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/locales/uk.json src-tauri/src/locales/en.json
git commit -m "feat(i18n): add file.opened translation key"
```

---

### Task 2: Make `renderFile()` return success boolean

**Files:**
- Modify: `src/main.js:252-320` (`renderFile` function)

- [ ] **Step 1: Add `return true` at end of try block**

In `src/main.js`, inside `renderFile()`, add `return true;` after line 312 (`await getCurrentWindow().setTitle(...)`) — as the last statement of the `try` block:

```js
    // Update window title
    const fileName = filePath.split(/[\\/]/).pop();
    await getCurrentWindow().setTitle(`${fileName} — Marka`);
    return true;
```

- [ ] **Step 2: Add `return false` in catch block**

In the `catch` block of `renderFile()`, add `return false;` after `contentEl.focus();`:

```js
  } catch (err) {
    const errorEl = document.createElement("p");
    errorEl.setAttribute("role", "alert");
    errorEl.textContent = `${t("error.prefix")}${err}`;
    contentEl.replaceChildren(errorEl);
    contentEl.focus();
    return false;
  }
```

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "refactor: make renderFile() return success boolean"
```

---

### Task 3: Add announce in `navigateTo()`

**Files:**
- Modify: `src/main.js:20-27` (`navigateTo` function)

- [ ] **Step 1: Modify `navigateTo()` to announce on success**

Replace current `navigateTo()` with:

```js
async function navigateTo(filePath, content) {
  if (!navigatingHistory) {
    navHistory.splice(historyIndex + 1);
    navHistory.push(filePath);
    historyIndex = navHistory.length - 1;
  }
  const ok = await renderFile(filePath, content);
  if (ok) announce(t("file.opened", { file: fileNameFromPath(filePath) }));
  return ok;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/main.js
git commit -m "feat: announce file name via NVDA on file open"
```

---

### Task 4: Manual verification

- [ ] **Step 1: Build and launch**

```bash
just dev
```

- [ ] **Step 2: Verify Ctrl+O**

Press Ctrl+O, select a `.md` file. NVDA should announce "Відкрито: назва.md".

- [ ] **Step 3: Verify CLI argument**

```bash
just build-fast
./src-tauri/target/release/marka.exe --file path/to/test.md
```

NVDA should announce "Відкрито: test.md" on launch.

- [ ] **Step 4: Verify local link navigation**

Open a `.md` file that contains a link to another local `.md` file. Click the link. NVDA should announce "Відкрито: linked-file.md".

- [ ] **Step 5: Verify back/forward unchanged**

After navigating via link, press Alt+←. NVDA should announce "Назад: original.md" (not "Відкрито: original.md").

- [ ] **Step 6: Verify F1 help screen**

Press F1 to open help. NVDA should NOT announce "Відкрито:" — help is not a file open.

- [ ] **Step 7: Verify error case**

Open a file dialog and try to load a non-existent path (or modify code temporarily). NVDA should NOT announce "Відкрито:" — only the error alert should be heard.
