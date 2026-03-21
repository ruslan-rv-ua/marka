# Безпека, залежності та документація

> Аудит проведено: 2026-03-22  
> Метод: пасивний аналіз (тільки читання файлів, жодних змін)

---

## 🔴 Безпека

### [БЕЗПЕКА] src-tauri/tauri.conf.json — CSP відключено

```
Тип: відсутній Content Security Policy
Рядок: "csp": null
Пріоритет: HIGH
```

**Опис:** CSP повністю вимкнено. Будь-який JavaScript, вбудований у відкритий Markdown-файл як `<script>…</script>`, виконається у контексті WebView-вікна додатку з повним доступом до Tauri API.

**Ризик:** Якщо користувач відкриє спеціально сформований `.md` файл (наприклад, завантажений з інтернету), скрипти з нього отримають доступ до `invoke()` — читання файлів, зміна налаштувань тощо.

**Найкраще рішення:**
```json
"security": {
  "csp": "default-src 'self'; script-src 'none'; img-src asset: data: blob:; style-src 'unsafe-inline';"
}
```
Якщо marked.js потребує inline-стилів — `style-src 'unsafe-inline'` можна залишити, але `script-src 'none'` блокує інʼєкцію скриптів.

---

### [БЕЗПЕКА] src/main.js:195 — innerHTML без санітизації

```
Тип: потенційний XSS
Рядок: contentEl.innerHTML = marked.parse(markdown);
Пріоритет: HIGH
```

**Опис:** `marked` v17 не видаляє HTML-теги з Markdown. Будь-який `<script>`, `<iframe>`, `onload=`, `onerror=` з тіла `.md`-файлу потрапить у DOM без фільтрації. У поєднанні з `csp: null` — повноцінна XSS-атака через файл.

**Найкраще рішення:** Додати sanitizer — або DOMPurify, або вбудований marked-option:
```js
import DOMPurify from "dompurify";
contentEl.innerHTML = DOMPurify.sanitize(marked.parse(markdown));
```
Або задати marked options `{ mangle: false, headerIds: false }` + окремий DOMPurify-крок.

---

### [БЕЗПЕКА] src-tauri/tauri.conf.json:18 — assetProtocol.scope: ["**"]

```
Тип: надмірний доступ до файлової системи
Рядок: "scope": ["**"]
Пріоритет: HIGH
```

**Опис:** Протокол `asset://` може завантажити **будь-який файл** з файлової системи. Вбудований у Markdown `<img src="C:\Users\user\Documents\secret.pdf">` або `<link rel="stylesheet" href="file:///…">` — Tauri обробить запит без обмежень.

**Найкраще рішення:** Обмежити scope до папки поточно відкритого файлу, або хоча б до домашньої папки:
```json
"scope": ["$HOME/**", "$DOCUMENT/**"]
```

---

### [БЕЗПЕКА] src-tauri/src/lib.rs:73 — read_file без обмежень шляху

```
Тип: path traversal / необмежений доступ до ФС
Рядки: fn read_file(path: String) -> Result<String, String>
Пріоритет: HIGH
```

**Опис:** Tauri-команда `read_file` приймає довільний рядок `path` і повертає вміст будь-якого файлу. Немає перевірки розширення (лише `.md`), немає обмеження по директорії. Якщо XSS відпрацює (`<script>invoke('read_file',{path:'C:\\Users\\user\\.ssh\\id_rsa'})</script>`), атака завантажить довільний файл із системи.

**Найкраще рішення:**
```rust
fn read_file(path: String) -> Result<String, String> {
    let p = std::path::Path::new(&path);
    // Дозволяємо тільки .md файли
    if p.extension().and_then(|e| e.to_str()) != Some("md") {
        return Err("Дозволено тільки .md файли".into());
    }
    fs::read_to_string(p).map_err(|e| format!("Не вдалося прочитати файл: {}", e))
}
```

---

### [БЕЗПЕКА] src-tauri/src/lib.rs:79 — open_url без валідації схеми

```
Тип: довільний запуск URI handlers
Рядки: open::that(&url)
Пріоритет: MEDIUM
```

**Опис:** Функція `open::that()` з крейту `open` викликає системний обробник для **будь-якого URI** — включно з `file://`, `ms-excel:`, `ms-word:`, `shell:`, власними протоколами сторонніх застосунків. Зловмисний `.md` може через HTML-посилання змусити `open_url` запустити небезпечний URI-обробник.

**Ризик:** Середній — потребує спочатку відпрацювання XSS (тобто залежить від попередніх проблем).

**Найкраще рішення:**
```rust
fn open_url(url: String) -> Result<(), String> {
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("Дозволені тільки http/https посилання".into());
    }
    open::that(&url).map_err(|e| format!("Не вдалося відкрити посилання: {}", e))
}
```

---

### [БЕЗПЕКА] src/main.js — isExternal() не охоплює всі схеми

```
Тип: некоректне визначення зовнішніх URL
Рядки: function isExternal(href) — перевірка тільки http/https
Пріоритет: MEDIUM
```

**Опис:** Функція `isExternal` повертає `true` тільки для `http://` та `https://`. Схеми `ftp://`, `file:///`, `mailto:`, `javascript:`, власні протоколи — потраплять у гілку "local file" → `resolvePath()` → `renderFile()`. Хоч `renderFile` й викличе `read_file` на Rust-стороні (що поверне помилку для недійсного шляху), поведінка непередбачувана.

**Найкраще рішення:**
```js
function isExternal(href) {
  try {
    const u = new URL(href);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
}
```

---

## 📦 Залежності

### [ЗАЛЕЖНОСТІ] package.json — версії залежностей

```
Стан: актуальні (перевірено на 2026-03-22)
```

| Пакет | Версія в проекті | Примітки |
|---|---|---|
| `marked` | 17.0.4 | Актуальна. Не має вбудованої санітизації HTML |
| `highlight.js` | 11.11.1 | Актуальна |
| `marked-highlight` | 2.2.3 | Актуальна, відповідає marked@17 |
| `@tauri-apps/api` | 2.10.1 | Актуальна |
| `@tauri-apps/plugin-cli` | 2.4.1 | Актуальна |
| `vite` | 8.0.1 | Актуальна |

**Важливе спостереження:** `marked` починаючи з v1.0.0 видалив опцію `sanitize` — тепер відповідальність за санітизацію HTML повністю на розробнику.

**Проблема:** Немає `DOMPurify` або аналога. Залежність відсутня, а потреба є.

**Найкраще рішення:** Додати `dompurify` як production dependency:
```
pnpm add dompurify
pnpm add -D @types/dompurify
```

---

### [ЗАЛЕЖНОСТІ] Cargo.toml — Rust залежності

| Крейт | Версія | Примітки |
|---|---|---|
| `tauri` | 2 | Актуальна гілка v2 |
| `serde` / `serde_json` | 1 | Стабільні |
| `tauri-plugin-dialog` | 2 | OK |
| `tauri-plugin-cli` | 2 | OK |
| `open` | 5.0 | Актуальна, але без схемної валідації (див. вище) |
| `sys-locale` | 0.3 | OK |

Критичних вразливостей у залежностях не виявлено. Рекомендується час від часу запускати `cargo audit` з крейту `cargo-audit`.

---

## ⚙️ Конфігурація середовища

### [КОНФІГУРАЦІЯ] .gitignore — мінімальний

```
Проблема: .gitignore містить лише 3 правила
```

Поточний `.gitignore`:
```
node_modules/
dist/
src-tauri/target/
```

**Відсутні важливі записи:**
- `.env`, `.env.*`, `.env.local` — немає захисту від випадкового коміту credentials
- `*.pem`, `*.key`, `*.p12` — сертифікати
- `settings.json` у корені (settings зберігаються поруч з exe, але якби хтось скопіював до проекту)

**Ризик:** Низький (наразі `.env` файлів немає), але варто захиститися превентивно.

**Найкраще рішення:** Додати до `.gitignore`:
```
.env
.env.*
!.env.example
*.pem
*.key
```

---

### [КОНФІГУРАЦІЯ] .github/workflows/release.yml — GitHub Actions

**Позитивно:**
- `GITHUB_TOKEN` та `SCOOP_BUCKET_TOKEN` використовуються через `secrets.*` — не захардкоджені
- Pre-release логіка коректно пропускає Scoop update
- Workflow тригери чіткі та обґрунтовані

**Проблеми:**

```
[КОНФІГУРАЦІЯ] .github/workflows/release.yml
Проблема: дії не прив'язані до конкретних SHA-хешів
Пріоритет: MEDIUM
```

Використовуються тег-версії замість SHA:
```yaml
uses: actions/checkout@v4               # ризик: тег може бути переміщений
uses: actions/setup-node@v4
uses: softprops/action-gh-release@v2
uses: peter-evans/repository-dispatch@v3
```

**Найкраще рішення:** Для production-рівня безпеки — прив'язати до SHA:
```yaml
uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2
```

---

```
[КОНФІГУРАЦІЯ] .github/workflows/release.yml
Проблема: permissions: contents: write на рівні всього workflow
Пріоритет: LOW
```

**Опис:** `permissions: contents: write` задано на рівні всього workflow, а не окремого кроку (`Create GitHub Release`). Усі інші кроки (build, package) теж отримують дозвіл на запис у репозиторій.

**Найкраще рішення:** Перенести permission на рівень job або залишити default (`contents: read`) і явно підвищити тільки для release-кроку.

---

### [КОНФІГУРАЦІЯ] Відсутній .env.example

```
Проблема: немає шаблону змінних середовища
Пріоритет: LOW
```

Проект не використовує `.env`, але `SCOOP_BUCKET_TOKEN` — зовнішній секрет, необхідний для CI/CD. Документація (README) не містить інструкції щодо його налаштування поза `docs/GITHUB_TOKEN_SETUP.md`.

---

## 📚 Документація та тести

### [ДОКУМЕНТАЦІЯ] Тести відсутні

```
Проблема: no tests configured (з CLAUDE.md: "No test suite is configured")
Пріоритет: бажано
```

Відсутні:
- Unit-тести для JS-логіки (`resolvePath`, `isExternal`, `fixMediaSrc`)
- Integration-тести для Tauri-команд (`read_file`, `open_url`)
- E2E-тести для відкриття файлів

**Ризик для безпеки:** Без тестів зміни в `isExternal()` або `open_url` можуть непомітно зламати захисну логіку.

---

### [ДОКУМЕНТАЦІЯ] src-tauri/src/lib.rs — відсутні doc-коментарі на публічних командах

```
Проблема: немає документації до Tauri-команд
Пріоритет: за можливості
```

Команди `read_file`, `open_url`, `open_file_dialog` не мають `///` doc-коментарів з описом очікуваних вхідних даних, обмежень та можливих помилок.

---

### [ДОКУМЕНТАЦІЯ] README.md — актуальний

README.md та README.uk.md відповідають поточному стану проекту. Клавіатурні скорочення, архітектура та інструкції зі збірки актуальні.

---

## Підсумок

| Категорія | Критичних (HIGH) | Середніх (MEDIUM) | Низьких (LOW) |
|---|---|---|---|
| Безпека | 4 | 2 | 0 |
| Залежності | 0 | 1 | 0 |
| Конфігурація середовища | 0 | 1 | 2 |
| Документація та тести | 0 | 1 | 1 |
| **Разом** | **4** | **5** | **3** |

### Пріоритетний план виправлення

1. **[HIGH]** Увімкнути CSP у `tauri.conf.json`
2. **[HIGH]** Додати `DOMPurify` перед `innerHTML =`
3. **[HIGH]** Обмежити `assetProtocol.scope` до конкретних директорій
4. **[HIGH]** Додати валідацію шляху (тільки `.md`) у `read_file` Rust-команді
5. **[MEDIUM]** Додати валідацію схеми в `open_url` (тільки `http/https`)
6. **[MEDIUM]** Виправити `isExternal()` для обробки нестандартних схем
7. **[MEDIUM]** Прив'язати GitHub Actions до SHA
