# Локалізація Marka: Дизайн (2026-03-21)

## Мета

Додати підтримку англійської мови до Marka з автоматичним детектуванням локалі ОС при першому запуску. Збільшувати до інших мов у майбутньому.

## Вимоги

1. Підтримка української та англійської мов
2. Локалі вшиті в exe (embedded)
3. Автоматичне детектування системної локалі при першому запуску
4. Fallback на англійську, якщо локаль не підтримується
5. Локалізація тільки UI (не повідомлення Rust про помилки)
6. Розширюваність для майбутніх мов

## Архітектура

### Структура файлів

```
src-tauri/src/
  ├── lib.rs                 (розширений)
  └── locales/
      ├── uk.json           (новий)
      └── en.json           (новий)

src/
  ├── main.js               (змінений)
  ├── index.html            (змінений)
  └── i18n.js               (новий)
```

### Дані локалізації

**`src-tauri/src/locales/uk.json`**:
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

**`src-tauri/src/locales/en.json`**:
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

## Реалізація

### Rust backend (`src-tauri/src/lib.rs`)

#### 1. Вшивання локалей як констант

```rust
const LOCALE_UK: &str = include_str!("locales/uk.json");
const LOCALE_EN: &str = include_str!("locales/en.json");
```

#### 2. Розширення Settings

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

#### 3. Нові Tauri команди

**`detect_system_locale() -> String`**
- Використовує крейт `sys-locale` для отримання системної локалі
- Повертає мовний код: "uk", "en", або fallback "en"
- Логіка: якщо системна локаль містить "uk" → "uk", інакше → "en"

**`get_translations(locale: String) -> Result<serde_json::Value, String>`**
- Повертає JSON перекладів для вказаної локалі
- Підтримує: "uk", "en"
- Якщо невідома локаль → повертає "en"

```rust
#[tauri::command]
fn detect_system_locale() -> String {
    // Детектувати системну локаль
    // Повернути "uk" або "en"
}

#[tauri::command]
fn get_translations(locale: String) -> Result<serde_json::Value, String> {
    let json_str = match locale.as_str() {
        "uk" => LOCALE_UK,
        _ => LOCALE_EN,
    };
    serde_json::from_str(json_str).map_err(|e| e.to_string())
}
```

#### 4. Реєстрація команд

Додати до `invoke_handler`:
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

### Frontend

#### 1. Модуль `src/i18n.js`

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

#### 2. Логіка ініціалізації в `src/main.js`

На початку (після import, перед `applySettings`):

```javascript
import { initI18n, t, getLocale } from "./i18n.js";

// Змінна для першого запуску
let isFirstRun = false;

async function initializeLocale() {
  const settings = await invoke("load_settings");

  // Якщо локаль не встановлена — перший запуск
  if (!settings.locale || settings.locale === "") {
    isFirstRun = true;
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

async function applySettings() {
  const s = await invoke("load_settings");
  // ... решта коду залишається без змін
}

// На старті:
try {
  await initializeLocale();
  await applySettings();
} catch (err) {
  console.error("Initialization failed:", err);
}
```

#### 3. Заміна hard-coded рядків

**HTML** (`src/index.html`):
```html
<!-- До -->
<p>Натисніть <kbd>Ctrl+O</kbd> щоб відкрити файл.</p>

<!-- Після (JS встановлює текст) -->
<p id="initial-message"></p>
```

У `main.js`:
```javascript
document.getElementById("initial-message").textContent = t("initial.message");
document.querySelector('[aria-label="Вміст документа"]').setAttribute("aria-label", t("document.label"));
```

**JS рядки**:
```javascript
// До
btn.setAttribute("aria-label", `Копіювати код ${codeBlockIndex}`);
// Після
btn.setAttribute("aria-label", t("copy.button", { index: codeBlockIndex }));

// До
announceCopy("Код скопійовано");
// Після
announceCopy(t("copy.success"));

// До
announceTheme(next === "light" ? "Світла тема" : "Темна тема");
// Після
announceTheme(t(next === "light" ? "theme.light" : "theme.dark"));

// До
errorEl.textContent = `Помилка: ${err}`;
// Після
errorEl.textContent = `${t("error.prefix")}${err}`;

// У renderFile:
pre.setAttribute("aria-label", t("code.label"));

// У copy button error:
announceCopy(t("copy.error"));
```

## Залежності

**Rust** — новий крейт для детектування локалі:
```toml
[dependencies]
sys-locale = "0.3"
```

**Frontend** — жодних залежностей, тільки вбудований Tauri API.

## Детектування локалі ОС

Логіка в `detect_system_locale()`:

1. Отримати системну локаль через `sys-locale::get_locale()` → рядок типу "uk", "uk_UA", "en-US", etc.
2. Перевірити префікс:
   - Якщо починається на "uk" → "uk"
   - Інакше → "en"
3. Повернути результат

Приклад:
```rust
use sys_locale::get_locale;

#[tauri::command]
fn detect_system_locale() -> String {
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

## Поточок завантаження на першому запуску

```
1. Завантажити Settings
2. Якщо locale пуста:
   a. Виявити системну локаль (detect_system_locale)
   b. Зберегти в Settings
3. Ініціалізувати i18n з locale
4. Встановити document.lang
5. Завантажити UI з перекладами
```

## Масштабованість

Для додання нової мови (наприклад, німецької):

1. Створити `src-tauri/src/locales/de.json`
2. Додати в `lib.rs`:
   ```rust
   const LOCALE_DE: &str = include_str!("locales/de.json");
   ```
3. Розширити match у `get_translations()`:
   ```rust
   "de" => LOCALE_DE,
   ```
4. Оновити логіку в `detect_system_locale()` для підтримки нової мови

Більше змін не потрібно.

## Тестування (мануальне)

1. **Перший запуск**:
   - Видалити `settings.json`
   - Запустити app
   - Перевірити, що UI відображається на основі системної локалі ОС
   - Перевірити, що `locale` збережена в `settings.json`

2. **Наступні запуски**:
   - Перевірити, що app використовує збережену локаль

3. **NVDA доступність**:
   - Перевірити, що `aria-label` коректно перекладаються
   - Перевірити, що повідомлення про копіювання озвучуються правильною мовою

## Примітки

- **Rust помилки** залишаються на поточній мові (не перекладаються на цьому етапі)
- **Файли перекладів** вшиті в exe як константи, не завантажуються у runtime
- **Мова документа** встановлюється через `document.documentElement.lang` для правильного рендерингу браузером та NVDA
