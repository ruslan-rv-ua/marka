# Дизайн: Виправлення за результатами аудиту — Marka

> Дата: 2026-03-22
> Версія: 0.1.0
> Гілка: feature/audit

---

## Контекст

Аудит проекту Marka (2026-03-22) виявив 21 пункт для виправлення:
- 4 HIGH-вразливості безпеки, що утворюють реальний ланцюжок атаки через зловмисний `.md` файл
- 2 MEDIUM-вразливості безпеки
- 3 елементи мертвого коду (впевнено видалити)
- 12+ покращень якості коду та конфігурації

**Критичний ланцюжок атаки:**
> Зловмисний `.md` файл → `<script>` без CSP → `invoke('read_file', {path: 'C:\\Users\\...\\secret'})` → витік довільного файлу ОС

---

## Архітектура рішення

Три атомарних коміти, кожен оборотний:
1. `fix: security` — захист від атак через зловмисний .md файл
2. `chore: remove dead code` — видалення мертвого коду без ризику
3. `refactor: code quality` — покращення якості коду

---

## Коміт 1: `fix: security`

### 1.1 DOMPurify — санітизація HTML (src/main.js:195)

**Проблема:** `contentEl.innerHTML = marked.parse(markdown)` — marked не видаляє HTML. `<script>`, `<iframe>`, `onload=` з `.md` потрапляють у DOM.

**Рішення:**
```bash
pnpm add dompurify
```
```js
import DOMPurify from "dompurify";
// ...
contentEl.innerHTML = DOMPurify.sanitize(marked.parse(markdown));
```

**Примітка:** DOMPurify за замовчуванням дозволяє `<span class="hljs-*">` — підсвітка синтаксису через highlight.js не постраждає.

---

### 1.2 CSP — Content Security Policy (src-tauri/tauri.conf.json)

**Проблема:** `"csp": null` — будь-який `<script>` у відкритому `.md` виконується у WebView з повним доступом до Tauri API.

**Рішення:**
```json
"security": {
  "csp": "default-src 'self'; script-src 'self'; img-src asset: data: blob:; style-src 'self' 'unsafe-inline';",
  "assetProtocol": {
    "enable": true,
    "scope": ["**"]
  }
}
```

**Важливо:** `script-src 'self'` (не `'none'`) — Tauri WebView завантажує Vite-бандл як локальний файловий ресурс через `'self'`. Значення `'none'` заблокує весь JS-бандл і застосунок не запуститься. DOMPurify є головним захистом від XSS-ін'єкцій, а CSP `script-src 'self'` блокує зовнішні та inline-скрипти з контенту файлу.

**`assetProtocol.scope`:** Залишаємо `["**"]` — після додавання DOMPurify + CSP ризик значно знижено. Зміну на вужчий scope відкладаємо.

---

### 1.3 `read_file` — тільки .md файли (src-tauri/src/lib.rs:74)

**Проблема:** Tauri-команда `read_file` приймає довільний шлях без обмежень. XSS може прочитати будь-який файл ОС.

**Рішення:**
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

**Зміна UX:** Локальні посилання у Markdown на не-.md файли (наприклад, `[log](./build.log)`) тепер повертатимуть повідомлення про помилку замість спроби відкрити файл. Це навмисна зміна поведінки — Marka є переглядачем виключно `.md` файлів. CLI-аргумент з не-.md шляхом також отримає помилку. Обмеження розширення не захищає від `.md` файлів зі секретним вмістом — основний захист це DOMPurify + CSP.

---

### 1.4 `open_url` — тільки http/https (src-tauri/src/lib.rs:79)

**Проблема:** `open::that(&url)` обробляє будь-який URI — `file://`, `shell:`, `ms-word:` тощо.

**Рішення:**
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

### 1.5 `isExternal()` — URL API (src/main.js:11)

**Проблема:** Перевірка тільки `http://`/`https://`. `javascript:`, `mailto:`, `ftp://` потрапляють у гілку «локальний файл».

**Рішення:**
```js
function isExternal(href) {
  try {
    const u = new URL(href);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
}
```

---

### 1.6 `checkCliArgs` — catch (err) (src/main.js:327)

**Проблема:** `catch {}` без `(err)` поглинає будь-який виняток, включно зі справжніми помилками плагіна.

**Рішення:**
```js
} catch (err) {
  // Plugin not initialized or no CLI args — expected in non-CLI launch
  if (import.meta.env.DEV) console.warn("checkCliArgs:", err);
}
```

---

## Коміт 2: `chore: remove dead code`

### 2.1 `fileHistory` (src/main.js:254–279)

Видалити:
- Рядок 254: коментар `// In-memory history of opened files (cleared on app exit)`
- Рядок 255: `const fileHistory = [];`
- Рядки 276–279: блок `if (!fileHistory.includes(absPath)) { fileHistory.push(absPath); }`

### 2.2 9 debug `console.log` (src/main.js:53–84)

Видалити рядки: 53, 55, 59, 61, 63, 66, 71, 75, 84 (9 викликів)
Залишити: `console.error` на рядку 68 (реальна помилка збереження)

### 2.3 `"main": "index.js"` (package.json:5)

Видалити рядок `"main": "index.js"` — файлу не існує, поле оманливе для Tauri+Vite проекту.

### 2.4 Заголовний коментар-шаблон (release.yml:1–26)

Видалити застарілий блок коментарів, що описує файл як «шаблон» зі списком TODO (обидва TODO вже заповнені реальним кодом).

---

## Коміт 3: `refactor: code quality`

### 3.1 Іменовані константи (src/main.js)

Додати на рівні модуля (після існуючих `let` оголошень):
```js
const ANNOUNCE_TIMEOUT_MS = 3000;
const SAVE_DEBOUNCE_MS = 1000;
const FONT_SIZE_MIN = 10, FONT_SIZE_MAX = 72;
const PADDING_MIN = 0, PADDING_MAX = 25;
```

Замінити всі magic numbers на ці константи.

### 3.2 Об'єднати `announceCopy`/`announceTheme` → `announce(text)`

```js
function announce(text) {
  const el = getLiveRegion();
  el.textContent = text;
  clearTimeout(pendingClearTimeout);
  pendingClearTimeout = setTimeout(() => { el.textContent = ""; }, ANNOUNCE_TIMEOUT_MS);
}
```

Після рефакторингу:
- Видалити функцію `announceCopy` (рядок 166–171)
- Видалити функцію `announceTheme` (рядок 173–178)
- У `toggleTheme()`: замінити виклик `announceTheme(next)` на `announce(t(next === "light" ? "theme.light" : "theme.dark"))`
- У click-обробнику copy-кнопки: замінити виклики `announceCopy(...)` на `announce(...)`

### 3.3 Злиття двох DOM-проходів у `renderFile` (src/main.js:199–236)

Замість двох окремих `querySelectorAll("pre")` — один прохід, де одночасно:
- Додається copy-кнопка
- Встановлюються ARIA-атрибути (`role="region"`, `aria-label`, `tabindex="0"`)

Видалити коментар `// Reset counter for second pass` та скидання `codeBlockIndex = 0`.

### 3.4 CSS: `strong { color: #fff }` → `var(--heading)` (src/styles.css)

```css
strong { color: var(--heading); }
```

### 3.5 CLAUDE.md — виправити документацію

Замінити `event.key` на `event.code` у розділі «Key constraints» — код правильний, документація застаріла.

### 3.6 `.gitignore` — захист credentials

Додати:
```
.env
.env.*
!.env.example
*.pem
*.key
```

### 3.7 README.md — документувати `test-markdown/`

Додати розділ або рядок про призначення `test-markdown/` як ручних QA-фікстур для перевірки рендерингу.

---

## Що НЕ чіпати

| Елемент | Причина |
|---------|---------|
| `event.code` у клавіатурних шорткатах | Правильний підхід, layout-незалежний. Виправляємо тільки документацію |
| `role="document"` + NVDA focus-цикл | Специфічна a11y техніка; не чіпати без тестування зі скрінрідером |
| `assetProtocol.scope: ["**"]` | Відкладаємо після встановлення DOMPurify + CSP |
| Portable settings.json | Архітектурне рішення, не чіпати |
| `windows_subsystem = "windows"` | Правильно приховує консоль у release |
| Профілі `release` vs `release-fast` | Обидва обґрунтовані |
| NVDA a11y атрибути на `pre` | Критично для доступності сліпого користувача |

---

## Обсяг змін

| Файл | Зміни |
|------|-------|
| `src/main.js` | DOMPurify import, isExternal URL API, catch (err), видалити fileHistory + 9 console.log, константи, announce(), злиття DOM-проходів |
| `src-tauri/tauri.conf.json` | CSP рядок |
| `src-tauri/src/lib.rs` | read_file + open_url валідація |
| `package.json` | pnpm add dompurify, видалити "main" |
| `src/styles.css` | strong color → var(--heading) |
| `CLAUDE.md` | event.key → event.code |
| `.gitignore` | +.env, +*.pem, +*.key |
| `README.md` | +розділ про test-markdown/ |
| `.github/workflows/release.yml` | видалити коментар-шаблон |

---

## Порядок виконання

1. Коміт 1: `fix: security` — DOMPurify, CSP, read_file, open_url, isExternal, checkCliArgs
2. Коміт 2: `chore: remove dead code` — fileHistory, console.log, "main", yml коментар
3. Коміт 3: `refactor: code quality` — константи, announce(), DOM-прохід, CSS, CLAUDE.md, .gitignore, README
