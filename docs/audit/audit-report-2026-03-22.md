# Аудит проекту — Marka — 2026-03-22

> Версія: 0.1.0 | Гілка: develop | Субагенти: audit-map ✅ | audit-dead-code ✅ | audit-quality ✅ | audit-security ✅

---

## 📊 Загальна оцінка

| Категорія        | Оцінка (1–10) | Коментар |
|------------------|---------------|----------|
| Читабельність    | 7             | Чисте іменування, але `renderFile` — god-function; 8 debug-логів у production |
| Архітектура      | 8             | Правильний Tauri-патерн: тонкий Rust-шар + весь UX у JS; маштабується добре |
| Якість коду      | 7             | DRY-порушення у 3 місцях, magic numbers, подвійний DOM-обхід; Rust-бекенд чистий |
| Покриття тестами | 2             | Тест-сюїт відсутній; є лише ручні QA-фікстури у `test-markdown/` |
| Безпека          | 3             | 4 HIGH-вразливості утворюють реальний ланцюжок атаки через зловмисний .md файл |
| Продуктивність   | 8             | Незначні проблеми: подвійний DOM-скан, зайві getComputedStyle — не критично |

---

## 🗺️ Карта проекту

### Технічний стек

| Категорія         | Технологія              | Версія       |
|-------------------|-------------------------|--------------|
| Мова (backend)    | Rust                    | edition 2021 |
| Мова (frontend)   | JavaScript (ES modules) | —            |
| Desktop-фреймворк | Tauri                   | 2.x          |
| Bundler           | Vite                    | ^8.0.1       |
| Пакетний менеджер | pnpm                    | 10.32.1      |
| Збірка завдань    | just (justfile)         | —            |
| Платформа         | Windows (портативний exe)| —           |

### Архітектура

```
CLI arg (--file) або Ctrl+O
  → Tauri plugin-cli / plugin-dialog (Rust)
  → read_file Tauri command (Rust: src-tauri/src/lib.rs)
  → marked + marked-highlight (JS: src/main.js)
  → rendered HTML + highlight.js syntax coloring
  → WebView (вбудований браузер Windows)
```

Rust-бекенд виконує роль тонкого системного шару (7 IPC-команд). Вся логіка UX — у JS.

### Модулі

| Файл | Призначення |
|------|-------------|
| `src/main.js` | Весь фронтенд-стан: рендеринг, клавіатурні шорткати, NVDA a11y, i18n |
| `src/styles.css` | Dark high-contrast тема, CSS-змінні `--font-size`, `--padding-x` |
| `src/i18n.js` | i18n: `initI18n(locale)`, `t(key, params)`, `getLocale()` |
| `src/index.html` | HTML-оболонка WebView; lang="uk", role="document" for NVDA |
| `src-tauri/src/lib.rs` | Tauri-команди: read_file, open_file_dialog, load/save_settings, detect_locale, get_translations, open_url |
| `src-tauri/src/main.rs` | Точка запуску Rust-процесу |
| `.github/workflows/release.yml` | CI/CD: build → ZIP + SHA256 → GitHub Release → Scoop bucket dispatch |

### Tauri IPC-команди

| Команда | Що робить |
|---------|-----------|
| `read_file(path)` | Читає файл, повертає String |
| `open_file_dialog()` | Нативний діалог → `OpenedFile { path, content }` |
| `load_settings()` | Завантажує `settings.json` поруч з exe |
| `save_settings(settings)` | Зберігає `settings.json` |
| `detect_system_locale()` | Повертає `"uk"` або `"en"` |
| `get_translations(locale)` | Повертає JSON перекладів для локалі |
| `open_url(url)` | Відкриває URL через системний браузер |

---

## 🗑️ Мертвий код

### Впевнено мертвий (3 елементи)

**1. `fileHistory` масив — [src/main.js](src/main.js#L255)**
Масив оголошується, наповнюється через `push`, але **ніколи не читається**. Функції навігації назад немає.
Рішення: видалити `fileHistory`, push-блок (рядки 277–278) та коментар.

**2. 8 debug `console.log` — [src/main.js](src/main.js#L53)**
Залишені від розробки i18n-функції, виконуються при **кожному старті** застосунку.
Рядки: 53, 55, 59, 61, 63, 66, 71, 75, 84. Лишити тільки `console.error` на рядку 68.

**3. `"main": "index.js"` — [package.json](package.json#L5)**
Поле успадковане з npm-шаблону. Файл `index.js` не існує, Tauri ігнорує це поле.
Рішення: видалити рядок.

### Потребує ручної перевірки (2 елементи)

**4. `test-markdown/` (5 файлів)**
Ручні QA-фікстури без прив'язки до збірки чи CI. Якщо потрібні — задокументувати в README. Якщо ні — видалити.

**5. Заголовний коментар у `.github/workflows/release.yml:1–26`**
Описує файл як «шаблон» зі списком TODO, хоча TODO-блоки вже заповнені. Косметично.

---

## ♻️ Якість коду

### Дублювання (DRY)

**[DRY] `announceCopy` і `announceTheme` — [src/main.js](src/main.js#L157)**
Майже ідентичні функції: однаковий live-регіон, таймер 3000 мс, логіка очистки. Різниця — лише аргумент тексту.
Рішення: замінити однією функцією `announce(text)`.

**[DRY] Подвійний `querySelectorAll("pre")` — [src/main.js](src/main.js#L199)**
Два окремих проходи по `pre`-елементах у `renderFile`: перший — copy-кнопки, другий — ARIA-атрибути. Навіть є коментар `// Reset counter for second pass` — сам коментар є код-сміллям.
Рішення: злити в один прохід.

**[DRY] `changeFontSize` / `changePadding` — [src/main.js](src/main.js#L141)**
Ідентичний паттерн: читати CSS-змінну → clamp → записати → `scheduleSave()`. Відрізняються лише назвою змінної та межами.
Рішення: `changeCssVar(name, delta, min, max)`.

### Читабельність

**[GOD FUNCTION] `renderFile` — [src/main.js](src/main.js#L188)**
~65 рядків, виконує: читання файлу → парсинг Markdown → виправлення медіа-шляхів → copy-кнопки → ARIA → NVDA-фокус → заголовок → помилки.
Рішення: виділити `addCopyButtons(contentEl)` та `makeCodeBlocksAccessible(contentEl)`.

**[READABILITY] `scheduleSave` IIFE — [src/main.js](src/main.js#L106)**
`(async () => { ... })()` всередині `setTimeout` — важко читати.
Рішення: винести async-логіку в `saveCurrentState()`.

### Консистентність

**[DOC ↔ CODE] `event.code` vs `event.key` — [src/main.js](src/main.js#L284)**
`CLAUDE.md` документує: «use `event.key` patterns». Код використовує `event.code`. Код правильний (layout-незалежний), але документацію слід виправити.

**[MAGIC NUMBERS] Тайм-аут 3000 мс — [src/main.js](src/main.js#L157)**
Дублюється в двох місцях. Рішення: `const ANNOUNCE_TIMEOUT_MS = 3000`.

**[CSS] `strong { color: #fff }` — [src/styles.css](src/styles.css#L44)**
Єдиний хардкодований HEX-колір серед CSS-змінних. Рішення: `color: var(--heading)`.

### Обробка помилок

**[ERRORS] Порожній catch у `checkCliArgs` — [src/main.js](src/main.js#L325)**
`catch` без `(err)` поглинає будь-який виняток, включно зі справжніми помилками плагіна.
Рішення: `catch (err) { if (import.meta.env.DEV) console.warn(...) }`.

**[ERRORS] Помилка збереження без UI-feedback — [src/main.js](src/main.js#L60)**
При першому запуску помилка збереження locale логується тільки в консоль. Користувач не отримує сповіщення.

**[ERRORS] `open_url` / `open_file_dialog` без UI-feedback — [src/main.js](src/main.js#L267)**
Помилки логуються в консоль. Варто додати announce-сповіщення для кінцевих користувачів.

### Конфігурація (magic numbers)

**[CONFIG] Межі шрифту/відступів — [src/main.js](src/main.js#L142)**
`10`, `72`, `0`, `25` — inline magic numbers у `changeFontSize`/`changePadding`.
Рішення: `const FONT_SIZE_MIN = 10, FONT_SIZE_MAX = 72; const PADDING_MIN = 0, PADDING_MAX = 25`.

**[CONFIG] Debounce 1000 мс — [src/main.js](src/main.js#L108)**
Хардкодоване значення. Рішення: `const SAVE_DEBOUNCE_MS = 1000`.

---

## 🔒 Безпека та залежності

### 🔴 HIGH — критичний ланцюжок атаки

> Зловмисний `.md` файл → `<script>` без CSP → `invoke('read_file', {path: 'C:\\…\\secret'})` → витік довільного файлу з ОС.
> Три вразливості #1 + #2 + #3 утворюють реальний вектор атаки соціальної інженерії.

**[HIGH] CSP відключено — [src-tauri/tauri.conf.json](src-tauri/tauri.conf.json)**
`"csp": null` — будь-який `<script>` у відкритому `.md` виконується у WebView з доступом до Tauri API.
Рішення:
```json
"csp": "default-src 'self'; script-src 'none'; img-src asset: data: blob:; style-src 'unsafe-inline';"
```

**[HIGH] `innerHTML` без санітизації — [src/main.js](src/main.js#L195)**
`contentEl.innerHTML = marked.parse(markdown)` — marked не видаляє HTML. Будь-який `<script>`, `<iframe>`, `onload=` з `.md` потрапляє у DOM.
Рішення: додати DOMPurify:
```bash
pnpm add dompurify
```
```js
import DOMPurify from "dompurify";
contentEl.innerHTML = DOMPurify.sanitize(marked.parse(markdown));
```

**[HIGH] `assetProtocol.scope: ["**"]` — [src-tauri/tauri.conf.json](src-tauri/tauri.conf.json)**
Протокол `asset://` може завантажити будь-який файл ОС. `<img src="C:\Users\user\secret">` спрацює.
Рішення: обмежити scope до `["$HOME/**", "$DOCUMENT/**"]` або динамічно до папки відкритого файлу.

**[HIGH] `read_file` без обмеження шляху — [src-tauri/src/lib.rs](src-tauri/src/lib.rs#L73)**
Команда приймає довільний рядок path, немає перевірки розширення чи директорії.
Рішення: дозволяти тільки `.md` файли:
```rust
if p.extension().and_then(|e| e.to_str()) != Some("md") {
    return Err("Дозволено тільки .md файли".into());
}
```

### 🟡 MEDIUM

**[MEDIUM] `open_url` — довільні URI-обробники — [src-tauri/src/lib.rs](src-tauri/src/lib.rs#L79)**
`open::that(&url)` викликає системний обробник для будь-якого URI, включно з `file://`, `ms-excel:`, `shell:`.
Рішення: дозволити тільки `http://` та `https://`.

**[MEDIUM] `isExternal()` — неповна схем-перевірка — [src/main.js](src/main.js)**
`ftp://`, `mailto:`, `javascript:` потрапляють у гілку "local file".
Рішення: `try { const u = new URL(href); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; }`.

**[MEDIUM] GitHub Actions — дії без SHA-прив'язки**
`actions/checkout@v4` тощо без хешів. Тег може бути переміщений.
Рішення: прив'язати до SHA (опціонально, для production-рівня безпеки).

### 🟢 LOW

**[LOW] `.gitignore` — відсутні записи для credentials**
Немає захисту від випадкового коміту `.env`, `*.pem`, `*.key`.
Рішення: додати `.env`, `.env.*`, `!.env.example`, `*.pem`, `*.key`.

**[LOW] GitHub Actions — `permissions: contents: write` на весь workflow**
Правило права на запис отримують усі кроки. Варто перенести на рівень job.

### Залежності

Усі JS та Rust залежності актуальні на дату аудиту. Критичних CVE не виявлено.
Рекомендовано: час від часу запускати `cargo audit` (крейт `cargo-audit`).

---

## 🏆 Пріоритизований список рекомендацій

### 🔴 Критично — безпека (зробити негайно)

1. **Додати DOMPurify** — `pnpm add dompurify` + обгорнути `marked.parse()` → найпростіший і найважливіший захід
2. **Увімкнути CSP** — `"csp": "default-src 'self'; script-src 'none'; ..."` у `tauri.conf.json`
3. **Обмежити `read_file`** — дозволити тільки `.md` файли у Rust-команді
4. **Валідація схеми в `open_url`** — дозволити тільки `http://` / `https://`
5. **Обмежити `assetProtocol.scope`** — вузькіший scope замість `["**"]`

### 🟢 Висока користь, нульовий ризик (першочергово)

6. **Видалити 8 debug `console.log`** у `initializeLocale` — [src/main.js](src/main.js#L53) — 1 хвилина роботи
7. **Видалити `fileHistory`** — [src/main.js](src/main.js#L255) — мертвий код без ризику
8. **Видалити `"main": "index.js"`** — [package.json](package.json#L5) — 1 рядок
9. **Злити 2 DOM-проходи в `renderFile`** — [src/main.js](src/main.js#L199) — DRY + перформанс
10. **Виділити константи** — `ANNOUNCE_TIMEOUT_MS`, `FONT_SIZE_MIN/MAX`, `SAVE_DEBOUNCE_MS`

### 🟡 Середня користь, низький ризик

11. **Об'єднати `announceCopy`/`announceTheme` → `announce(text)`**
12. **Виправити `isExternal()`** — охопити всі небезпечні схеми
13. **Покращити `catch` у `checkCliArgs`** — додати `(err)` та умовний `console.warn`
14. **Виправити `strong { color: #fff }`** → `color: var(--heading)` у CSS
15. **Виправити CLAUDE.md** — `event.key` → `event.code` у документації

### 🔵 Косметика / стиль (за бажанням)

16. **Рефакторинг `renderFile`** — виділити `addCopyButtons()` та `makeCodeBlocksAccessible()`
17. **Рефакторинг `changeFontSize`/`changePadding`** → `changeCssVar(name, delta, min, max)`
18. **Рефакторинг `scheduleSave` IIFE** → виділити `saveCurrentState()`
19. **Доповнення `.gitignore`** — `.env`, `*.pem`, `*.key`
20. **Видалити або оновити заголовний коментар** у `release.yml`
21. **Документувати `test-markdown/`** у README або видалити

---

## ❌ Що НЕ чіпати

| Елемент | Причина |
|---------|---------|
| `event.code` у клавіатурних шорткатах | Правильний підхід для layout-незалежних шорткатів. CLAUDE.md містить помилку — виправити документацію, не код |
| `role="document"` + NVDA focus-цикл | Специфічна NVDA a11y техніка; ламати не можна без тестування зі скрінрідером |
| `"csp": null` — поки не додано DOMPurify | Спочатку захист (DOMPurify), потім CSP; без санітизатора строгий CSP може зламати рендеринг |
| Portable settings.json поруч з exe | Архітектурне рішення — не переходити на реєстр чи AppData |
| `windows_subsystem = "windows"` у main.rs | Правильно приховує консоль у release-збірці |
| Профілі `release` vs `release-fast` | Обидва обґрунтовані: один для dist, інший для швидкої розробки |

---

## 📝 Нотатки

**Загальне враження:** Проект невеликий (~500 рядків JS + ~150 рядків Rust), добре структурований, з чіткою відповідальністю між модулями. Кодова база зріла і консистентна для свого розміру.

**Головна проблема** — не архітектурна і не якісна, а **безпекова**: поєднання `csp: null` + `innerHTML` без санітизації + необмежений `read_file` утворює реальний вектор атаки через зловмисний `.md` файл. Це можна виправити додаванням DOMPurify (~15 хвилин роботи) і налаштуванням CSP.

**Наступний пріоритет після безпеки** — прибрати debug-логи та мертвий код: це підвищить якість без жодного ризику.

**Тести:** Відсутність тест-сюїту прийнятна для v0.1.0, але при зростанні кодової бази (особливо для безпекової логіки `isExternal`, `open_url`) варто додати хоча б unit-тести для цих функцій.
