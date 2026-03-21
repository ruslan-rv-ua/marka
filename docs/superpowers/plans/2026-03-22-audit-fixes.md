# Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Виправити всі 21 пункт аудиту проекту Marka: закрити 6 вразливостей безпеки, видалити мертвий код, покращити якість коду.

**Architecture:** Три атомарних коміти: `fix: security` (DOMPurify + CSP + Rust валідація), `chore: remove dead code` (fileHistory, debug logs, vestigial fields), `refactor: code quality` (константи, DRY, CSS). Кожен коміт оборотний незалежно.

**Tech Stack:** Tauri v2, vanilla JS (ES modules), Rust, Vite, pnpm, DOMPurify (нова залежність)

---

## Файли, що змінюються

| Файл | Зміни |
|------|-------|
| `src/main.js` | DOMPurify, isExternal, catch(err), видалити fileHistory + console.log, константи, announce(), злиття DOM-проходів |
| `src-tauri/tauri.conf.json` | CSP рядок |
| `src-tauri/src/lib.rs` | read_file + open_url валідація |
| `package.json` | +dompurify dep, видалити "main" |
| `src/styles.css` | strong color → var(--heading) |
| `CLAUDE.md` | виправити event.key → event.code |
| `.gitignore` | +.env, +*.pem, +*.key |
| `README.md` | +розділ про test-markdown/ |
| `.github/workflows/release.yml` | видалити коментар-шаблон |

---

## COMMIT 1: `fix: security`

### Task 1: Встановити DOMPurify та обгорнути marked.parse()

**Files:**
- Modify: `package.json` (залежність)
- Modify: `src/main.js:1-7` (import) та `src/main.js:195` (innerHTML)

- [ ] **Step 1: Встановити dompurify**

```bash
cd c:/dev/marka
pnpm add dompurify
```

Очікується: dompurify з'явиться в `package.json` у секції `"dependencies"`.

- [ ] **Step 2: Додати import DOMPurify у src/main.js**

У [src/main.js](src/main.js) після рядка 7 (після `import { initI18n, t, getLocale } from "./i18n.js";`) додати:

```js
import DOMPurify from "dompurify";
```

- [ ] **Step 3: Обгорнути marked.parse() у DOMPurify.sanitize()**

У [src/main.js](src/main.js) знайти рядок:
```js
    contentEl.innerHTML = marked.parse(markdown);
```
Замінити на:
```js
    contentEl.innerHTML = DOMPurify.sanitize(marked.parse(markdown));
```

- [ ] **Step 4: Перевірити збірку**

```bash
cd c:/dev/marka
just vite-build
```

Очікується: збірка без помилок.

---

### Task 2: Увімкнути CSP у tauri.conf.json

**Files:**
- Modify: `src-tauri/tauri.conf.json:19-25`

- [ ] **Step 1: Змінити CSP з null на рядок**

У [src-tauri/tauri.conf.json](src-tauri/tauri.conf.json) знайти блок:
```json
    "security": {
      "csp": null,
      "assetProtocol": {
        "enable": true,
        "scope": ["**"]
      }
    }
```
Замінити на:
```json
    "security": {
      "csp": "default-src 'self'; script-src 'self'; img-src asset: data: blob:; style-src 'self' 'unsafe-inline';",
      "assetProtocol": {
        "enable": true,
        "scope": ["**"]
      }
    }
```

**Важливо:** `script-src 'self'` — не `'none'`! `'none'` заблокує Vite-бандл і застосунок не запуститься.

---

### Task 3: Валідація `read_file` у Rust — тільки .md

**Files:**
- Modify: `src-tauri/src/lib.rs:74-76`

- [ ] **Step 1: Додати перевірку розширення до read_file**

У [src-tauri/src/lib.rs](src-tauri/src/lib.rs) знайти функцію:
```rust
#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Не вдалося прочитати файл: {}", e))
}
```
Замінити на:
```rust
#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    let p = std::path::Path::new(&path);
    if p.extension().and_then(|e| e.to_str()) != Some("md") {
        return Err("Дозволено тільки .md файли".into());
    }
    fs::read_to_string(p).map_err(|e| format!("Не вдалося прочитати файл: {}", e))
}
```

**Зміна UX:** локальні посилання на не-.md файли тепер повертатимуть помилку замість спроби відкрити файл. Це навмисно.

---

### Task 4: Валідація `open_url` — тільки http/https

**Files:**
- Modify: `src-tauri/src/lib.rs:79-82`

- [ ] **Step 1: Додати перевірку схеми до open_url**

У [src-tauri/src/lib.rs](src-tauri/src/lib.rs) знайти функцію:
```rust
#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    open::that(&url)
        .map_err(|e| format!("Не вдалося відкрити посилання: {}", e))
}
```
Замінити на:
```rust
#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("Дозволені тільки http/https посилання".into());
    }
    open::that(&url).map_err(|e| format!("Не вдалося відкрити посилання: {}", e))
}
```

---

### Task 5: Виправити `isExternal()` — URL API

**Files:**
- Modify: `src/main.js:11-13`

- [ ] **Step 1: Замінити isExternal() на URL-based реалізацію**

У [src/main.js](src/main.js) знайти:
```js
function isExternal(href) {
  return href.startsWith('http://') || href.startsWith('https://');
}
```
Замінити на:
```js
function isExternal(href) {
  try {
    const u = new URL(href);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
}
```

---

### Task 6: Виправити `checkCliArgs` — catch (err)

**Files:**
- Modify: `src/main.js` (функція checkCliArgs, рядки ~327-329)

- [ ] **Step 1: Додати (err) до catch**

У [src/main.js](src/main.js) знайти блок catch у функції `checkCliArgs`:
```js
  } catch {
    // No CLI args — that's fine
  }
```
Замінити на:
```js
  } catch (err) {
    // Plugin not initialized or no CLI args — expected in non-CLI launch
    if (import.meta.env.DEV) console.warn("checkCliArgs:", err);
  }
```

---

### Task 7: Зібрати та перевірити (Commit 1)

**Files:** всі змінені у Commit 1

- [ ] **Step 1: Зібрати fast build**

```bash
cd c:/dev/marka
just build-fast
```

Очікується: компіляція без помилок. Якщо Rust помилка — перевір синтаксис у lib.rs.

- [ ] **Step 2: Запустити і перевірити вручну**

Відкрити зібраний exe, відкрити будь-який .md файл (наприклад, `test-markdown/test-complete.md`).
Перевірити:
- Файл рендериться
- Підсвітка синтаксису working (highlight.js classes)
- Кнопки copy working
- Клавіатурні shortcuts working (Ctrl+O, Ctrl+T)

- [ ] **Step 3: Commit**

```bash
git add src/main.js src-tauri/tauri.conf.json src-tauri/src/lib.rs package.json pnpm-lock.yaml
git commit -m "fix: security — DOMPurify, CSP, read_file/open_url validation, isExternal URL API"
```

---

## COMMIT 2: `chore: remove dead code`

### Task 8: Видалити fileHistory

**Files:**
- Modify: `src/main.js` (~рядки 254-255, 276-279)

- [ ] **Step 1: Видалити оголошення fileHistory**

У [src/main.js](src/main.js) знайти та видалити два рядки:
```js
// In-memory history of opened files (cleared on app exit)
const fileHistory = [];
```

- [ ] **Step 2: Видалити push-блок у click-обробнику**

У тому ж файлі знайти та видалити блок (всередині click-обробника посилань):
```js
    // Add to history if not already present
    if (!fileHistory.includes(absPath)) {
      fileHistory.push(absPath);
    }
```

Також видалити коментар `// Local file → open in Marka + add to history` і замінити на `// Local file → open in Marka` (або просто прибрати коментар повністю — він і так зрозумілий).

---

### Task 9: Видалити 9 debug console.log з initializeLocale()

**Files:**
- Modify: `src/main.js` (функція initializeLocale, рядки ~53-84)

- [ ] **Step 1: Видалити всі console.log у initializeLocale**

У [src/main.js](src/main.js) у функції `initializeLocale` видалити наступні рядки (всі `console.log`, але НЕ чіпати `console.error` на рядку з "Error saving settings"):

```js
console.log("initializeLocale: Starting...");
```
```js
console.log("initializeLocale: Loaded settings:", settings);
```
```js
console.log("initializeLocale: No locale found, detecting system locale...");
```
```js
console.log("initializeLocale: Detected locale:", detectedLocale);
```
```js
console.log("initializeLocale: Saving settings...", settings);
```
```js
console.log("initializeLocale: Settings saved successfully");
```
```js
console.log("initializeLocale: Locale already set to:", settings.locale);
```
```js
console.log("initializeLocale: Initializing i18n with locale:", settings.locale);
```
```js
console.log("initializeLocale: Complete");
```

Залишити без змін:
```js
console.error("initializeLocale: Error saving settings:", err);
```

---

### Task 10: Видалити "main" з package.json

**Files:**
- Modify: `package.json:5`

- [ ] **Step 1: Видалити рядок "main": "index.js"**

У [package.json](package.json) видалити рядок:
```json
  "main": "index.js",
```

---

### Task 11: Видалити коментар-шаблон з release.yml

**Files:**
- Modify: `.github/workflows/release.yml:1-28`

- [ ] **Step 1: Видалити заголовний блок коментарів**

У [.github/workflows/release.yml](.github/workflows/release.yml) видалити рядки 1-28 (весь блок від `# ───...` до закриваючого `# ───...`), що починається з:
```
# ─────────────────────────────────────────────────────────────────────────────
# release-template.yml — шаблон для GitHub Actions release workflow
```
і закінчується перед рядком `name: Release`.

Після видалення файл має починатися з:
```yaml
name: Release
```

- [ ] **Step 2: Commit**

```bash
git add src/main.js package.json .github/workflows/release.yml
git commit -m "chore: remove dead code — fileHistory, debug logs, vestigial fields"
```

---

## COMMIT 3: `refactor: code quality`

### Task 12: Виділити іменовані константи

**Files:**
- Modify: `src/main.js` (після блоку import та перших let-оголошень)

- [ ] **Step 1: Додати константи після рядка `let renderGeneration = 0;`**

У [src/main.js](src/main.js) знайти рядок:
```js
let renderGeneration = 0;
```
Після нього додати:
```js

const ANNOUNCE_TIMEOUT_MS = 3000;
const SAVE_DEBOUNCE_MS = 1000;
const FONT_SIZE_MIN = 10, FONT_SIZE_MAX = 72;
const PADDING_MIN = 0, PADDING_MAX = 25;
```

- [ ] **Step 2: Замінити magic numbers на константи**

В функції `changeFontSize`:
```js
  const next = Math.min(72, Math.max(10, current + delta));
```
→
```js
  const next = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, current + delta));
```

В функції `changePadding`:
```js
  const next = Math.min(25, Math.max(0, current + delta));
```
→
```js
  const next = Math.min(PADDING_MAX, Math.max(PADDING_MIN, current + delta));
```

В функції `scheduleSave` — знайти `}, 1000);` (затримка таймера):
```js
  }, 1000);
```
→
```js
  }, SAVE_DEBOUNCE_MS);
```

---

### Task 13: Об'єднати announceCopy/announceTheme → announce(text)

**Files:**
- Modify: `src/main.js` (функції announceCopy, announceTheme, toggleTheme, click-обробник copy-кнопки)

- [ ] **Step 1: Замінити обидві функції однією announce()**

У [src/main.js](src/main.js) знайти та видалити функцію `announceCopy`:
```js
function announceCopy(text) {
  const el = getLiveRegion();
  el.textContent = text;
  clearTimeout(pendingClearTimeout);
  pendingClearTimeout = setTimeout(() => { el.textContent = ""; }, 3000);
}
```

Знайти та видалити функцію `announceTheme`:
```js
function announceTheme(theme) {
  const el = getLiveRegion();
  el.textContent = t(theme === "light" ? "theme.light" : "theme.dark");
  clearTimeout(pendingClearTimeout);
  pendingClearTimeout = setTimeout(() => { el.textContent = ""; }, 3000);
}
```

На їхньому місці (або одразу після `getLiveRegion`) додати:
```js
function announce(text) {
  const el = getLiveRegion();
  el.textContent = text;
  clearTimeout(pendingClearTimeout);
  pendingClearTimeout = setTimeout(() => { el.textContent = ""; }, ANNOUNCE_TIMEOUT_MS);
}
```

- [ ] **Step 2: Оновити виклики announceCopy і announceTheme**

У функції `toggleTheme` знайти:
```js
  announceTheme(next);
```
Замінити на:
```js
  announce(t(next === "light" ? "theme.light" : "theme.dark"));
```

У click-обробнику copy-кнопки знайти:
```js
          if (renderGeneration === myGeneration) announceCopy(t("copy.success"));
```
Замінити на:
```js
          if (renderGeneration === myGeneration) announce(t("copy.success"));
```

Також:
```js
          if (renderGeneration === myGeneration) announceCopy(t("copy.error"));
```
Замінити на:
```js
          if (renderGeneration === myGeneration) announce(t("copy.error"));
```

---

### Task 14: Злити два DOM-проходи у renderFile

**Files:**
- Modify: `src/main.js` (функція renderFile, блок після `fixMediaSrc()`)

- [ ] **Step 1: Замінити два querySelectorAll на один прохід**

У [src/main.js](src/main.js) у функції `renderFile` знайти весь блок від:
```js
    // Add copy buttons after each non-empty code block
    const myGeneration = ++renderGeneration;
    let codeBlockIndex = 0;
    contentEl.querySelectorAll("pre").forEach((pre) => {
      if (pre.textContent.trim() === "") return;
      codeBlockIndex++;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "copy-btn";
      btn.setAttribute("aria-label", t("copy.button", { index: codeBlockIndex }));
      btn.innerHTML = COPY_ICON;
      btn.addEventListener("click", async () => {
        const codeEl = pre.querySelector("code") ?? pre;
        try {
          await navigator.clipboard.writeText(codeEl.textContent);
          if (renderGeneration === myGeneration) announce(t("copy.success"));
        } catch {
          if (renderGeneration === myGeneration) announce(t("copy.error"));
        }
      });
      const wrapper = document.createElement("div");
      wrapper.className = "code-block";
      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);
      wrapper.appendChild(btn);
    });

    // Make code blocks accessible for NVDA
    codeBlockIndex = 0;  // Reset counter for second pass
    contentEl.querySelectorAll("pre").forEach((pre) => {
      if (pre.textContent.trim() === "") return;  // Match copy loop filter
      codeBlockIndex++;
      pre.setAttribute("role", "region");
      pre.setAttribute("aria-label", t("code.label", { index: codeBlockIndex }));
      pre.setAttribute("tabindex", "0");
    });
```

Замінити на один прохід:
```js
    // Add copy buttons and ARIA attributes to each non-empty code block
    const myGeneration = ++renderGeneration;
    let codeBlockIndex = 0;
    contentEl.querySelectorAll("pre").forEach((pre) => {
      if (pre.textContent.trim() === "") return;
      codeBlockIndex++;

      // ARIA accessibility for NVDA
      pre.setAttribute("role", "region");
      pre.setAttribute("aria-label", t("code.label", { index: codeBlockIndex }));
      pre.setAttribute("tabindex", "0");

      // Copy button
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "copy-btn";
      btn.setAttribute("aria-label", t("copy.button", { index: codeBlockIndex }));
      btn.innerHTML = COPY_ICON;
      btn.addEventListener("click", async () => {
        const codeEl = pre.querySelector("code") ?? pre;
        try {
          await navigator.clipboard.writeText(codeEl.textContent);
          if (renderGeneration === myGeneration) announce(t("copy.success"));
        } catch {
          if (renderGeneration === myGeneration) announce(t("copy.error"));
        }
      });
      const wrapper = document.createElement("div");
      wrapper.className = "code-block";
      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);
      wrapper.appendChild(btn);
    });
```

**Увага:** в цьому кроці `announceCopy` вже замінено на `announce` (Task 13). Переконайся що в новому блоці використовується `announce(...)`.

---

### Task 15: Виправити CSS — strong color

**Files:**
- Modify: `src/styles.css` (~рядок 44)

- [ ] **Step 1: Замінити hardcoded color на CSS-змінну**

У [src/styles.css](src/styles.css) знайти:
```css
strong { color: #fff; }
```
Замінити на:
```css
strong { color: var(--heading); }
```

---

### Task 16: Виправити CLAUDE.md — event.key → event.code

**Files:**
- Modify: `CLAUDE.md:96`

- [ ] **Step 1: Виправити документацію**

У [CLAUDE.md](CLAUDE.md) знайти рядок:
```
- **Keyboard shortcuts**: use `event.key` patterns that work regardless of keyboard layout (layouts other than QWERTY send different `event.code`)
```
Замінити на:
```
- **Keyboard shortcuts**: use `event.code` (physical key position) — layout-independent for shortcut keys. Do not use `event.key` which returns layout-dependent characters.
```

Також знайти рядок:
```
- **No CSP**: `tauri.conf.json` sets `"csp": null`
```
Замінити на:
```
- **CSP**: `tauri.conf.json` sets `script-src 'self'` to block injected scripts. DOMPurify sanitizes Markdown HTML before inserting into DOM.
```

---

### Task 17: Оновити .gitignore

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Додати записи для credentials**

До [.gitignore](.gitignore) дописати в кінець:
```
.env
.env.*
!.env.example
*.pem
*.key
```

---

### Task 18: Задокументувати test-markdown/ у README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Додати розділ про test-markdown/**

У [README.md](README.md) знайти кінець файлу (або перед розділом Contributing/License) і додати:

```markdown
## Development & Testing

### Manual QA fixtures

The `test-markdown/` directory contains Markdown files for manual rendering verification:

| File | Purpose |
|------|---------|
| `test-all-languages.md` | Syntax highlighting for all supported languages |
| `test-complete.md` | All Markdown elements (headings, tables, lists, blockquotes) |
| `test-images.md` | Embedded images (local and external) |
| `test-links.md` | Internal and external link navigation |
| `test-mixed.md` | Mixed content stress test |

Open any of these files in Marka to verify rendering after code changes.
```

---

### Task 19: Commit 3

- [ ] **Step 1: Зібрати та перевірити**

```bash
cd c:/dev/marka
just build-fast
```

Очікується: успішна збірка без помилок.

- [ ] **Step 2: Швидка ручна перевірка**

Запустити exe, відкрити `test-markdown/test-complete.md`:
- Перевірити що code blocks рендеруються з copy-кнопками
- Перевірити Ctrl+T (тема), Ctrl+= (шрифт)
- Перевірити Ctrl+O (діалог відкриття файлу)

- [ ] **Step 3: Commit**

```bash
git add src/main.js src/styles.css CLAUDE.md .gitignore README.md
git commit -m "refactor: code quality — named constants, announce(), single DOM pass, CSS var, docs"
```

---

## Фінальна перевірка

- [ ] **Перевірити git log**

```bash
git log --oneline -5
```

Очікується три коміти на верхівці:
```
<hash> refactor: code quality — named constants, announce(), single DOM pass, CSS var, docs
<hash> chore: remove dead code — fileHistory, debug logs, vestigial fields
<hash> fix: security — DOMPurify, CSP, read_file/open_url validation, isExternal URL API
```

---

## Що НЕ чіпати

| Елемент | Причина |
|---------|---------|
| `event.code` у keydown-обробнику | Код правильний. Виправляємо тільки CLAUDE.md |
| `role="document"` + NVDA focus-цикл | Специфічна a11y техніка для сліпого користувача |
| `assetProtocol.scope: ["**"]` | Відкладаємо після DOMPurify+CSP; ризик прийнятний |
| Portable `settings.json` | Архітектурне рішення, не чіпати |
| `windows_subsystem = "windows"` | Правильно приховує консоль |
| NVDA `aria-*` атрибути на `pre` | Критично для доступності |
