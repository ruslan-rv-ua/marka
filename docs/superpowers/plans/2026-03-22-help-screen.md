# Help Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain "Press Ctrl+O" startup message with a localized Markdown help screen showing app name/version, description, usage, and keyboard shortcuts table.

**Architecture:** Two `.md` help files (Ukrainian and English) are embedded in the binary via Rust `include_str!`. A new `get_help` Tauri command injects the version at runtime and returns the markdown. The JS `showHelp()` function renders it using the existing `marked` + DOMPurify pipeline, called at startup if no CLI file argument was provided.

**Tech Stack:** Rust (Tauri v2), JavaScript (ES modules, Vite), marked.js, DOMPurify, NVDA accessibility

---

## File Map

| File | Change |
|---|---|
| `src-tauri/src/locales/help.uk.md` | **Create** — Ukrainian help content |
| `src-tauri/src/locales/help.en.md` | **Create** — English help content |
| `src-tauri/src/lib.rs` | **Modify** — add `include_str!` constants + `get_help` command |
| `src/main.js` | **Modify** — add `showHelp()`, refactor `checkCliArgs()`, update startup sequence |
| `src/index.html` | **Modify** — remove `#initial-message` element |
| `src-tauri/src/locales/uk.json` | **Modify** — remove `"initial.message"` key |
| `src-tauri/src/locales/en.json` | **Modify** — remove `"initial.message"` key |

---

## Task 1: Create help Markdown files

**Files:**
- Create: `src-tauri/src/locales/help.uk.md`
- Create: `src-tauri/src/locales/help.en.md`

No tests for this task — content is verified visually in later tasks.

- [ ] **Step 1: Create `help.uk.md`**

  Create `src-tauri/src/locales/help.uk.md` with this exact content (note: CLI example uses 4-space indent, not fenced block):

  ```
  # Marka {version}

  Переглядач Markdown файлів для Windows.

  ## Використання

  Відкрити файл: **Ctrl+O** або передати шлях аргументом командного рядка:

      marka.exe шлях\до\файлу.md

  ## Гарячі клавіші

  | Клавіша | Дія |
  |---|---|
  | Ctrl+O | Відкрити файл |
  | Ctrl+= / Ctrl+- | Збільшити / зменшити шрифт |
  | Ctrl+Num+ / Ctrl+Num- | Збільшити / зменшити шрифт |
  | Ctrl+] / Ctrl+[ | Збільшити / зменшити відступи |
  | Ctrl+T | Перемкнути тему (темна/світла) |
  | Escape | Закрити програму |
  ```

- [ ] **Step 2: Create `help.en.md`**

  Create `src-tauri/src/locales/help.en.md` with this exact content:

  ```
  # Marka {version}

  Markdown file viewer for Windows.

  ## Usage

  Open a file: **Ctrl+O** or pass the path as a command-line argument:

      marka.exe path\to\file.md

  ## Keyboard Shortcuts

  | Key | Action |
  |---|---|
  | Ctrl+O | Open file |
  | Ctrl+= / Ctrl+- | Increase / decrease font size |
  | Ctrl+Num+ / Ctrl+Num- | Increase / decrease font size |
  | Ctrl+] / Ctrl+[ | Increase / decrease padding |
  | Ctrl+T | Toggle theme (dark/light) |
  | Escape | Close application |
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add src-tauri/src/locales/help.uk.md src-tauri/src/locales/help.en.md
  git commit -m "feat: add localized help markdown files"
  ```

---

## Task 2: Add `get_help` Rust command

**Files:**
- Modify: `src-tauri/src/lib.rs`

No automated tests — Tauri commands are tested by running the app. Correctness is verified in Task 4.

- [ ] **Step 1: Add `include_str!` constants in `lib.rs`**

  Open `src-tauri/src/lib.rs`. After the existing locale constants (lines 6–7):

  ```rust
  const LOCALE_UK: &str = include_str!("locales/uk.json");
  const LOCALE_EN: &str = include_str!("locales/en.json");
  ```

  Add two more:

  ```rust
  const HELP_UK: &str = include_str!("locales/help.uk.md");
  const HELP_EN: &str = include_str!("locales/help.en.md");
  ```

- [ ] **Step 2: Add the `get_help` command function**

  Add this function anywhere before the `pub fn run()` block (e.g., after `get_translations`):

  ```rust
  #[tauri::command]
  fn get_help(locale: String, app: tauri::AppHandle) -> Result<String, String> {
      let template = match locale.as_str() {
          "uk" => HELP_UK,
          _ => HELP_EN,
      };
      let version = app.package_info().version.to_string();
      Ok(template.replace("{version}", &version))
  }
  ```

- [ ] **Step 3: Register `get_help` in `invoke_handler`**

  Inside `pub fn run()`, find the `.invoke_handler(tauri::generate_handler![` block. The current list is:

  ```rust
  tauri::generate_handler![
      detect_system_locale,
      get_translations,
      load_settings,
      open_file_dialog,
      open_url,
      read_file,
      save_settings,
  ]
  ```

  Add `get_help,` to the list (keep alphabetical order):

  ```rust
  tauri::generate_handler![
      detect_system_locale,
      get_help,
      get_translations,
      load_settings,
      open_file_dialog,
      open_url,
      read_file,
      save_settings,
  ]
  ```

- [ ] **Step 4: Verify the Rust code compiles**

  Run from the project root:

  ```bash
  just build-fast
  ```

  Expected: build succeeds with no errors. Warnings are OK.

- [ ] **Step 5: Commit**

  ```bash
  git add src-tauri/src/lib.rs
  git commit -m "feat: add get_help Tauri command with version injection"
  ```

---

## Task 3: Remove `#initial-message` and clean up locale keys (atomic)

**These changes MUST be made together** — removing the HTML element without removing the JS line causes a `TypeError` at startup.

**Files:**
- Modify: `src/index.html`
- Modify: `src/main.js` (inside `initializeLocale` function)
- Modify: `src-tauri/src/locales/uk.json`
- Modify: `src-tauri/src/locales/en.json`

- [ ] **Step 1: Remove `#initial-message` from `index.html`**

  In `src/index.html`, remove this line:

  ```html
  <p id="initial-message"></p>
  ```

  The `<main>` element should now be empty:

  ```html
  <main id="content" role="document" tabindex="-1" aria-label="Вміст документа">
  </main>
  ```

- [ ] **Step 2: Remove the JS line that sets `#initial-message` text**

  In `src/main.js`, inside the `initializeLocale` function, remove this line:

  ```js
  document.getElementById("initial-message").textContent = t("initial.message");
  ```

- [ ] **Step 3: Remove `"initial.message"` from locale JSON files**

  In `src-tauri/src/locales/uk.json`, remove:
  ```json
  "initial.message": "Натисніть Ctrl+O щоб відкрити файл.",
  ```

  In `src-tauri/src/locales/en.json`, remove:
  ```json
  "initial.message": "Press Ctrl+O to open a file.",
  ```

  Make sure the JSON remains valid (no trailing commas on the last remaining key).

- [ ] **Step 4: Commit**

  ```bash
  git add src/index.html src/main.js src-tauri/src/locales/uk.json src-tauri/src/locales/en.json
  git commit -m "feat: remove initial-message element and cleanup locale keys"
  ```

---

## Task 4: Add `showHelp()` and update startup sequence in `main.js`

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Add `showHelp()` function**

  In `src/main.js`, add this function after the `renderFile` function (around line 241):

  ```js
  async function showHelp() {
    try {
      const markdown = await invoke("get_help", { locale: getLocale() });
      contentEl.innerHTML = DOMPurify.sanitize(marked.parse(markdown));

      // ARIA attributes for NVDA on code blocks (no copy buttons for help screen)
      let codeBlockIndex = 0;
      contentEl.querySelectorAll("pre").forEach((pre) => {
        if (pre.textContent.trim() === "") return;
        codeBlockIndex++;
        pre.setAttribute("role", "region");
        pre.setAttribute("aria-label", t("code.label", { index: codeBlockIndex }));
        pre.setAttribute("tabindex", "0");
      });

      // Force NVDA browse mode refresh
      contentEl.blur();
      requestAnimationFrame(() => contentEl.focus());
    } catch (err) {
      const errorEl = document.createElement("p");
      errorEl.setAttribute("role", "alert");
      errorEl.textContent = `${t("error.prefix")}${err}`;
      contentEl.replaceChildren(errorEl);
      contentEl.focus();
    }
  }
  ```

- [ ] **Step 2: Refactor `checkCliArgs()` to return a boolean and await `renderFile`**

  Find the existing `checkCliArgs` function (around line 303):

  ```js
  async function checkCliArgs() {
    try {
      const matches = await getMatches();
      if (matches.args.file && matches.args.file.value) {
        renderFile(matches.args.file.value);
      }
    } catch (err) {
      // Plugin not initialized or no CLI args — expected in non-CLI launch
      if (import.meta.env.DEV) console.warn("checkCliArgs:", err);
    }
  }
  ```

  Replace it with:

  ```js
  async function checkCliArgs() {
    try {
      const matches = await getMatches();
      if (matches.args.file && matches.args.file.value) {
        await renderFile(matches.args.file.value);
        return true;
      }
    } catch (err) {
      // Plugin not initialized or no CLI args — expected in non-CLI launch
      if (import.meta.env.DEV) console.warn("checkCliArgs:", err);
    }
    return false;
  }
  ```

- [ ] **Step 3: Update the startup sequence at the bottom of `main.js`**

  Find the current startup code at the bottom of the file:

  ```js
  try {
    await initializeLocale();
    await applySettings();
  } catch (err) {
    console.error("Initialization failed:", err);
  }
  checkCliArgs();  // intentionally not awaited — CLI open is independent of settings
  ```

  Replace it with:

  ```js
  try {
    await initializeLocale();
    await applySettings();
  } catch (err) {
    console.error("Initialization failed:", err);
  }
  const fileOpened = await checkCliArgs();
  if (!fileOpened) await showHelp();
  ```

- [ ] **Step 4: Start the dev server and check for JS errors**

  ```bash
  just vite-dev
  ```

  Open `http://localhost:1420` in a browser. The `invoke("get_help")` call will fail (no Tauri backend in browser mode), so the error path will render instead of the help screen — this is expected. Check:
  - An error paragraph with `role="alert"` is visible (confirms error path works)
  - No `<p id="initial-message">` in the DOM
  - No unexpected JS errors in the browser console (the `get_help` invoke failure is expected)

  Full integration is verified in Task 5 with `just dev`.

- [ ] **Step 5: Commit**

  ```bash
  git add src/main.js
  git commit -m "feat: add showHelp() and update startup sequence"
  ```

---

## Task 5: Full integration test with `just dev`

- [ ] **Step 1: Run the full Tauri dev build**

  ```bash
  just dev
  ```

  Expected: app window opens and shows the help screen immediately.

- [ ] **Step 2: Verify help screen content**

  Check visually (or with NVDA):
  - H1 heading: "Marka 0.1.0" (version from `tauri.conf.json`)
  - Description: "Переглядач Markdown файлів для Windows." (or English if system locale is EN)
  - Usage section with indented CLI example
  - Keyboard shortcuts table with all 6 rows
  - Window title is "Marka" (no filename)

- [ ] **Step 3: Verify CLI argument still works**

  Run the app with a file argument:

  ```bash
  just dev -- -- --file "C:\path\to\some-file.md"
  ```

  Expected: the specified file is rendered, help screen is NOT shown.

- [ ] **Step 4: Verify Ctrl+O still works**

  With the help screen showing, press Ctrl+O, select a `.md` file.
  Expected: file is rendered normally, replacing the help screen.

- [ ] **Step 5: Final commit if any fixes were needed**

  If any issues were found and fixed in steps 2–4, commit those fixes now:

  ```bash
  git add -p
  git commit -m "fix: <describe what was fixed>"
  ```
