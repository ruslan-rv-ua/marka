# Локалізація Marka: План реалізації

> **Для агентів:** REQUIRED: Використовувати superpowers:subagent-driven-development або superpowers:executing-plans для реалізації плану задача за задачею.

**Мета:** Додати підтримку англійської мови до Marka з автоматичним детектуванням системної локалі та вшиванням перекладів у exe.

**Архітектура:** JSON файли з перекладами вшиваються як Rust константи через `include_str!`, фронтенд завантажує переклади через Tauri команду, простий i18n модуль в JS підставляє рядки без залежностей.

**Tech Stack:** Rust (sys-locale крейт), JavaScript (вбудований модуль), JSON (переклади).

---

## Task 1: Додати залежність sys-locale

**Файли:**
- Modify: `src-tauri/Cargo.toml`

- [ ] **Step 1: Відкрити Cargo.toml та переглянути залежності**

```bash
cat src-tauri/Cargo.toml | grep -A 20 "dependencies"
```

Expected: Список поточних залежностей (tauri, serde, serde_json, tauri-plugin-*)

- [ ] **Step 2: Додати sys-locale до [dependencies]**

У `src-tauri/Cargo.toml` в секцію `[dependencies]` додати:
```toml
sys-locale = "0.3"
```

- [ ] **Step 3: Перевірити що синтаксис коректний**

```bash
cd src-tauri && cargo check
```

Expected: Компіляція успішна, `Compiling sys-locale`

- [ ] **Step 4: Commit**

```bash
git add src-tauri/Cargo.toml
git commit -m "chore: add sys-locale dependency for locale detection"
```

---

## Task 2: Створити JSON файл з українськими перекладами

**Файли:**
- Create: `src-tauri/src/locales/uk.json`

- [ ] **Step 1: Створити папку locales**

```bash
mkdir -p src-tauri/src/locales
```

- [ ] **Step 2: Написати uk.json**

```json
{
  "theme.light": "Світла тема",
  "theme.dark": "Темна тема",
  "copy.button": "Копіювати код {index}",
  "copy.success": "Код скопійовано",
  "copy.error": "Помилка копіювання",
  "code.label": "Блок коду",
  "initial.message": "Натисніть Ctrl+O щоб відкрити файл.",
  "document.label": "Вміст документа",
  "error.prefix": "Помилка: "
}
```

- [ ] **Step 3: Перевірити JSON валідність**

```bash
jq . src-tauri/src/locales/uk.json
```

Expected: JSON видимий без помилок

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/locales/uk.json
git commit -m "i18n: add Ukrainian translations"
```

---

## Task 3: Створити JSON файл з англійськими перекладами

**Файли:**
- Create: `src-tauri/src/locales/en.json`

- [ ] **Step 1: Написати en.json**

```json
{
  "theme.light": "Light theme",
  "theme.dark": "Dark theme",
  "copy.button": "Copy code {index}",
  "copy.success": "Code copied",
  "copy.error": "Copy error",
  "code.label": "Code block",
  "initial.message": "Press Ctrl+O to open a file.",
  "document.label": "Document content",
  "error.prefix": "Error: "
}
```

- [ ] **Step 2: Перевірити JSON валідність**

```bash
jq . src-tauri/src/locales/en.json
```

Expected: JSON видимий без помилок

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/locales/en.json
git commit -m "i18n: add English translations"
```

---

## Task 4: Розширити Settings структуру в lib.rs

**Файли:**
- Modify: `src-tauri/src/lib.rs:11-36`

- [ ] **Step 1: Відкрити lib.rs та переглянути Settings**

Поточна структура починається з `#[derive(...)]` на лінії 11.

- [ ] **Step 2: Додати поле locale до Settings**

В структурі `Settings` додати (після `pub padding_x`):
```rust
pub locale: String,
```

```rust
#[derive(serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    pub font_size: f64,
    pub padding_x: f64,
    pub locale: String,                    // ← НОВЕ
    pub window_width: f64,
    pub window_height: f64,
    pub window_x: Option<f64>,
    pub window_y: Option<f64>,
    pub window_maximized: bool,
    pub theme: String,
}
```

- [ ] **Step 3: Додати locale до Default реалізації**

У блоку `impl Default for Settings` додати поле в `Self { ... }`:
```rust
locale: "en".to_string(),
```

Результат:
```rust
impl Default for Settings {
    fn default() -> Self {
        Self {
            font_size: 16.0,
            padding_x: 10.0,
            locale: "en".to_string(),       // ← НОВЕ
            window_width: 800.0,
            window_height: 600.0,
            window_x: None,
            window_y: None,
            window_maximized: false,
            theme: "dark".to_string(),
        }
    }
}
```

- [ ] **Step 4: Перевірити що компіляція успішна**

```bash
cd src-tauri && cargo check
```

Expected: Успішна компіляція

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: add locale field to Settings struct"
```

---

## Task 5: Вшити локалі як Rust константи та додати команду get_translations

**Файли:**
- Modify: `src-tauri/src/lib.rs:1-10` (додати імпорти), та додати константи + команду

- [ ] **Step 1: Додати `use std::fs;` у верхню частину файлу (якщо не є)**

На початку файлу повинен бути:
```rust
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;
use std::fs;
```

Якщо `use std::fs;` уже є — пропустити цей крок.

- [ ] **Step 2: Додати вшивання локалей на початок файлу (після імпортів, перед публічними структурами)**

Після всіх `use` statements та перед `#[derive(...)] pub struct OpenedFile`:
```rust
const LOCALE_UK: &str = include_str!("locales/uk.json");
const LOCALE_EN: &str = include_str!("locales/en.json");
```

- [ ] **Step 3: Додати функцію detect_system_locale перед run()**

Перед функцією `pub fn run()` додати:
```rust
#[tauri::command]
fn detect_system_locale() -> String {
    use sys_locale::get_locale;
    match get_locale() {
        Some(locale) => {
            if locale.starts_with("uk") {
                "uk".to_string()
            } else {
                "en".to_string()
            }
        }
        None => "en".to_string(),
    }
}
```

- [ ] **Step 4: Додати функцію get_translations перед run()**

Перед функцією `pub fn run()` додати:
```rust
#[tauri::command]
fn get_translations(locale: String) -> Result<serde_json::Value, String> {
    let json_str = match locale.as_str() {
        "uk" => LOCALE_UK,
        _ => LOCALE_EN,
    };
    serde_json::from_str(json_str).map_err(|e| e.to_string())
}
```

- [ ] **Step 5: Додати команди до invoke_handler**

У функції `pub fn run()` знайти рядок з `.invoke_handler(tauri::generate_handler![...])`.

Поточно:
```rust
.invoke_handler(tauri::generate_handler![read_file, open_file_dialog, load_settings, save_settings])
```

Змінити на:
```rust
.invoke_handler(tauri::generate_handler![
    read_file,
    open_file_dialog,
    load_settings,
    save_settings,
    detect_system_locale,      // ← НОВЕ
    get_translations,          // ← НОВЕ
])
```

- [ ] **Step 6: Перевірити компіляцію**

```bash
cd src-tauri && cargo check
```

Expected: Успішна компіляція

- [ ] **Step 7: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: add detect_system_locale and get_translations commands"
```

---

## Task 6: Створити модуль i18n.js для фронтенду

**Файли:**
- Create: `src/i18n.js`

- [ ] **Step 1: Написати i18n.js**

```javascript
import { invoke } from "@tauri-apps/api/core";

let translations = {};
let currentLocale = "en";

/**
 * Ініціалізувати i18n з вказаною локаллю
 * @param {string} locale - код локалі ("uk" або "en")
 */
export async function initI18n(locale) {
  currentLocale = locale;
  const result = await invoke("get_translations", { locale });
  translations = result;
}

/**
 * Отримати переклад за ключем
 * @param {string} key - ключ в файлі JSON (e.g., "theme.light")
 * @param {object} params - параметри для підстановки (e.g., { index: 1 })
 * @returns {string} - переведений рядок
 */
export function t(key, params = {}) {
  let text = translations[key] || key;
  for (const [k, v] of Object.entries(params)) {
    text = text.replace(`{${k}}`, v);
  }
  return text;
}

/**
 * Отримати поточну локаль
 */
export function getLocale() {
  return currentLocale;
}
```

- [ ] **Step 2: Перевірити синтаксис JavaScript**

```bash
node -c src/i18n.js
```

Expected: Без помилок

- [ ] **Step 3: Commit**

```bash
git add src/i18n.js
git commit -m "feat: add i18n module for frontend"
```

---

## Task 7: Оновити main.js - додати ініціалізацію локалі та заміну рядків

**Файли:**
- Modify: `src/main.js`

- [ ] **Step 1: Додати import i18n на верхівку файлу**

На початку `main.js` (після інших import), додати:
```javascript
import { initI18n, t, getLocale } from "./i18n.js";
```

- [ ] **Step 2: Додати функцію initializeLocale перед applySettings**

Додати перед функцією `async function applySettings()`:
```javascript
async function initializeLocale() {
  const settings = await invoke("load_settings");

  // Якщо локаль не встановлена — перший запуск
  if (!settings.locale || settings.locale === "") {
    const detectedLocale = await invoke("detect_system_locale");
    settings.locale = detectedLocale;
    // Зберегти налаштування з новою локаллю
    await invoke("save_settings", { settings });
  }

  // Ініціалізувати i18n
  await initI18n(settings.locale);

  // Встановити lang атрибут на документі
  document.documentElement.lang = getLocale();
}
```

- [ ] **Step 3: Оновити блок ініціалізації на кінці файлу**

Поточно:
```javascript
try {
  await applySettings();
} catch (err) {
  console.error("applySettings failed:", err);
}
```

Змінити на:
```javascript
try {
  await initializeLocale();
  await applySettings();
} catch (err) {
  console.error("Initialization failed:", err);
}
```

- [ ] **Step 4: Замінити hard-coded рядок у функції announceTheme (лінія ~111)**

Поточно:
```javascript
function announceTheme(theme) {
  const el = getLiveRegion();
  el.textContent = theme === "light" ? "Світла тема" : "Темна тема";
  clearTimeout(pendingClearTimeout);
  pendingClearTimeout = setTimeout(() => { el.textContent = ""; }, 3000);
}
```

Змінити на:
```javascript
function announceTheme(theme) {
  const el = getLiveRegion();
  el.textContent = t(theme === "light" ? "theme.light" : "theme.dark");
  clearTimeout(pendingClearTimeout);
  pendingClearTimeout = setTimeout(() => { el.textContent = ""; }, 3000);
}
```

- [ ] **Step 5: Замінити hard-coded рядки у функції renderFile (лінії ~146, 152, 154, 167)**

У блоці де додаються copy buttons:

Поточно лінія 146:
```javascript
btn.setAttribute("aria-label", `Копіювати код ${codeBlockIndex}`);
```

Змінити на:
```javascript
btn.setAttribute("aria-label", t("copy.button", { index: codeBlockIndex }));
```

Поточно лінія 152:
```javascript
announceCopy("Код скопійовано");
```

Змінити на:
```javascript
announceCopy(t("copy.success"));
```

Поточно лінія 154:
```javascript
announceCopy("Помилка копіювання");
```

Змінити на:
```javascript
announceCopy(t("copy.error"));
```

Поточно лінія 167:
```javascript
pre.setAttribute("aria-label", "Блок коду");
```

Змінити на:
```javascript
pre.setAttribute("aria-label", t("code.label"));
```

- [ ] **Step 6: Замінити hard-coded помилку у renderFile (лінія ~181)**

Поточно:
```javascript
errorEl.textContent = `Помилка: ${err}`;
```

Змінити на:
```javascript
errorEl.textContent = `${t("error.prefix")}${err}`;
```

- [ ] **Step 7: Перевірити синтаксис**

```bash
node -c src/main.js
```

Expected: Без помилок

- [ ] **Step 8: Commit**

```bash
git add src/main.js
git commit -m "feat: initialize locale on startup and replace hardcoded strings with i18n"
```

---

## Task 8: Оновити index.html - зробити повідомлення динамічним

**Файли:**
- Modify: `src/index.html:10-11`

- [ ] **Step 1: Замінити статичний текст на заповнювач**

Поточно лінії 10-11:
```html
<main id="content" role="document" tabindex="-1" aria-label="Вміст документа">
  <p>Натисніть <kbd>Ctrl+O</kbd> щоб відкрити файл.</p>
</main>
```

Змінити на:
```html
<main id="content" role="document" tabindex="-1" aria-label="Вміст документа">
  <p id="initial-message"></p>
</main>
```

- [ ] **Step 2: Додати код в main.js для встановлення повідомлення**

У функції `initializeLocale()` після `document.documentElement.lang = getLocale();` додати:
```javascript
document.getElementById("initial-message").textContent = t("initial.message");
document.querySelector('main[role="document"]').setAttribute("aria-label", t("document.label"));
```

- [ ] **Step 3: Перевірити HTML валідність**

```bash
grep -A 3 '<main' src/index.html
```

Expected: Видимо `<p id="initial-message"></p>`

- [ ] **Step 4: Commit**

```bash
git add src/index.html src/main.js
git commit -m "feat: make initial message dynamic with localization"
```

---

## Task 9: Тестування — перший запуск (англійська ОС)

**Мануальне тестування**

- [ ] **Step 1: Видалити settings.json для симуляції першого запуску**

```bash
rm -f src-tauri/target/release/settings.json
```

(або там де фактично будує exe)

- [ ] **Step 2: Скомпілювати та запустити app**

```bash
pnpm dev
```

Expected:
- App стартує
- UI показується англійською (якщо системна мова не українська)
- `settings.json` створюється з `"locale": "en"`

- [ ] **Step 3: Перевірити aria-label в консолі браузера**

```javascript
console.log(document.querySelector('main[role="document"]').getAttribute("aria-label"))
```

Expected: `"Document content"` (англійська версія)

- [ ] **Step 4: Перевірити наявність перекладів у translations об'єкту**

```javascript
console.log(Object.keys(window.translations || {}).length)
```

Expected: 10+ ключів перекладів

- [ ] **Step 5: Закрити app**

---

## Task 10: Тестування — перший запуск (українська ОС)

**Мануальне тестування з українською ОС або симуляцією**

- [ ] **Step 1: (Опціонально) Зміняти системну локаль на українську для тестування**

Це залежить від ОС. На Windows: Settings → Time & Language → Language.

Альтернатива: модифікувати `detect_system_locale()` в lib.rs для тестування.

- [ ] **Step 2: Видалити settings.json**

```bash
rm -f src-tauri/target/release/settings.json
```

- [ ] **Step 3: Запустити app**

```bash
pnpm dev
```

Expected:
- UI показується українською
- `settings.json` містить `"locale": "uk"`
- aria-label = "Вміст документа"

- [ ] **Step 4: Перевірити переклади**

```javascript
console.log(document.querySelector('main[role="document"]').getAttribute("aria-label"))
```

Expected: `"Вміст документа"` (українська версія)

- [ ] **Step 5: Закрити app**

---

## Task 11: Тестування — наступні запуски

**Мануальне тестування persisted locale**

- [ ] **Step 1: Запустити app (без видалення settings.json)**

```bash
pnpm dev
```

Expected:
- App використовує збережену локаль з попереднього запуску
- Жодної детекції локалі не відбувається (быстро стартує)

- [ ] **Step 2: Перевірити console для помилок**

```javascript
console.log("No errors")
```

Expected: Без помилок у console

- [ ] **Step 3: Перевірити copy functionality**

Відкрити markdown файл з кодом, натиснути на copy button.

Expected:
- Повідомлення про копіювання озвучується правильною мовою
- Код копіюється в clipboard

- [ ] **Step 4: Перевірити theme toggle**

Натиснути Ctrl+T для перемикання теми.

Expected:
- Повідомлення про тему озвучується правильною мовою (Світла/Темна або Light/Dark)

- [ ] **Step 5: Закрити app**

---

## Task 12: Фінальна перевірка та коміт всіх змін

**Підготовка до merge**

- [ ] **Step 1: Перевірити що локалі вбудовані в exe при production build**

```bash
pnpm build --no-bundle
```

Expected: Build успішний

- [ ] **Step 2: Перевірити що exe містить переклади (опціонально)**

```bash
strings src-tauri/target/release/marka.exe | grep "Світла тема"
```

Expected: Видимо рядки перекладів в exe

- [ ] **Step 3: Переглянути всі зміни перед merge**

```bash
git log --oneline develop..HEAD
```

Expected: 12 комітів (по одному на кожну задачу)

- [ ] **Step 4: Побудувати повне резюме**

Розробка локалізації завершена:
- ✅ Додано українські та англійські переклади
- ✅ Реалізовано детектування системної локалі
- ✅ Переклади вшиті в exe
- ✅ Тестовано на першому запуску та наступних запусках
- ✅ NVDA доступність збережена

---

## Примітки щодо реалізації

1. **Компіляція**: На кожному кроці перевіряється `cargo check` для синтаксичних помилок
2. **Часті комміти**: Кожна задача = 1 коміт для простоти відстеження змін
3. **Тестування**: Мануальне тестування достатньо для цього маштабу
4. **Fallback**: Якщо системна локаль не "uk" → автоматично англійська
5. **NVDA**: aria-label встановлюються динамічно через i18n, NVDA буде озвучувати правильно
6. **Масштабування**: Для нової мови просто додати `locales/xx.json` та оновити match у `get_translations()`
