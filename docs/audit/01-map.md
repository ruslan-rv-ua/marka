# Карта проекту Marka

> Сформовано: 2026-03-22 | Версія проекту: 0.1.0

---

## Технічний стек

| Категорія        | Технологія              | Версія      |
|------------------|-------------------------|-------------|
| Мова (backend)   | Rust                    | edition 2021 |
| Мова (frontend)  | JavaScript (ES modules) | —           |
| Desktop-фреймворк| Tauri                   | 2.x         |
| Bundler          | Vite                    | ^8.0.1      |
| Пакетний менеджер| pnpm                    | 10.32.1     |
| Збірка завдань   | just (justfile)         | —           |
| Платформа        | Windows (портативний exe)| —          |

---

## Архітектура

**Патерн:** Desktop-оболонка (Tauri shell + WebView frontend)

**Опис:**
Marka — портативний переглядач Markdown файлів для Windows з підтримкою скринридера NVDA.
Проект побудований за схемою Tauri v2:

```
CLI arg (--file) або Ctrl+O
  → Tauri plugin-cli / plugin-dialog (Rust)
  → read_file Tauri command (Rust)
  → marked + marked-highlight (JS)
  → rendered HTML + highlight.js syntax coloring
  → WebView (вбудований браузер Windows)
```

Rust-бекенд не містить логіки представлення — він виконує роль тонкого системного шару:
читання файлів, відкриття діалогів, збереження налаштувань, виявлення локалі, відкриття URL.
Вся логіка відображення і UX знаходиться у JavaScript-фронтенді.

**Налаштування** зберігаються у `settings.json` поруч з `.exe` (portable-підхід, без реєстру).

---

## Точки входу

| Файл | Роль |
|------|------|
| `src-tauri/src/main.rs` | Точка запуску Rust-процесу; делегує до `marka_lib::run()` |
| `src-tauri/src/lib.rs` | Ядро Tauri-додатку: реєстрація команд, ініціалізація плагінів, відновлення вікна |
| `src/index.html` | HTML-оболонка WebView; підключає `main.js` і `styles.css` |
| `src/main.js` | Головний JS-модуль: рендеринг Markdown, keyboard shortcuts, стан застосунку |

---

## Основні модулі та файли

### Frontend (`src/`)

| Файл | Призначення |
|------|-------------|
| `src/index.html` | HTML-документ WebView; мова `uk`, `role="document"` на `<main>` для NVDA |
| `src/main.js` | Увесь фронтенд-стан: invoke-виклики до Tauri, конфігурація marked.js, клавіатурні скорочення, NVDA accessibility, управління темою та шрифтом, навігація по local-посиланнях |
| `src/styles.css` | CSS з темною high-contrast темою (за замовчуванням), CSS-змінні `--font-size`, `--padding-x`, підтримка `data-theme="light"` |
| `src/i18n.js` | Модуль i18n: `initI18n(locale)`, `t(key, params)`, `getLocale()`; переклади завантажуються з Rust через `get_translations` |

### Backend (`src-tauri/src/`)

| Файл | Призначення |
|------|-------------|
| `src-tauri/src/main.rs` | Точка входу Rust; `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]` |
| `src-tauri/src/lib.rs` | Tauri-команди: `read_file`, `open_file_dialog`, `load_settings`, `save_settings`, `detect_system_locale`, `get_translations`, `open_url`; struct `Settings` та `OpenedFile` |
| `src-tauri/src/locales/uk.json` | Рядки UI українською мовою |
| `src-tauri/src/locales/en.json` | Рядки UI англійською мовою |

### Конфігурація

| Файл | Призначення |
|------|-------------|
| `src-tauri/tauri.conf.json` | Налаштування Tauri: window, CSP (`null`), file associations (`.md`), CLI-аргументи, bundle (nsis/msi) |
| `src-tauri/Cargo.toml` | Rust-маніфест: залежності, профілі `release` (мінімальний exe) та `release-fast` |
| `vite.config.js` | Vite: root=`src/`, port=1420, outDir=`../dist/` |
| `package.json` | JS-маніфест: npm scripts, JS-залежності |
| `justfile` | Зручні псевдоніми команд (`just dev`, `just build`, тощо) |
| `src-tauri/capabilities/default.json` | Tauri capabilities (ACL для WebView) |

### CI/CD

| Файл | Призначення |
|------|-------------|
| `.github/workflows/release.yml` | GitHub Actions: збірка → ZIP + SHA256 → GitHub Release → Scoop bucket dispatch |

### Документація

| Файл | Призначення |
|------|-------------|
| `README.md` | Опис проекту (англ.) |
| `README.uk.md` | Опис проекту (укр.) |
| `CHANGELOG.md` | Журнал змін |
| `docs/CI_CD_IMPLEMENTATION_STATUS.md` | Статус реалізації CI/CD |
| `docs/GITHUB_TOKEN_SETUP.md` | Інструкція налаштування GitHub токену |
| `docs/RELEASE_TESTING_GUIDE.md` | Інструкція тестування релізу |
| `docs/superpowers/plans/` | Плани реалізації (CI/CD, a11y) |
| `docs/superpowers/specs/` | Специфікації (CI/CD Scoop, code-block a11y) |

### Тестові файли

| Файл | Призначення |
|------|-------------|
| `test-markdown/test-all-languages.md` | Тестовий Markdown: підсвітка всіх мов |
| `test-markdown/test-complete.md` | Повний тест усіх елементів Markdown |
| `test-markdown/test-images.md` | Тест вбудованих зображень |
| `test-markdown/test-links.md` | Тест посилань (зовнішніх і локальних) |
| `test-markdown/test-mixed.md` | Змішаний тест |

---

## Залежності

### JavaScript — Production (`package.json`)

| Пакет | Версія | Призначення |
|-------|--------|-------------|
| `@tauri-apps/api` | ^2.10.1 | Tauri JS API: `invoke`, `convertFileSrc`, window management |
| `@tauri-apps/plugin-cli` | ^2.4.1 | Читання CLI-аргументів (`--file`) |
| `highlight.js` | ^11.11.1 | Синтаксичне підсвічування коду |
| `marked` | ^17.0.4 | Парсер і рендерер Markdown |
| `marked-highlight` | ^2.2.3 | Інтеграція highlight.js у marked |

### JavaScript — Dev (`package.json`)

| Пакет | Версія | Призначення |
|-------|--------|-------------|
| `@tauri-apps/cli` | ^2.10.1 | CLI Tauri (`tauri dev`, `tauri build`) |
| `vite` | ^8.0.1 | Bundler / dev server |

### Rust — Production (`Cargo.toml`)

| Crate | Версія | Призначення |
|-------|--------|-------------|
| `tauri` | 2 (feature: `protocol-asset`) | Ядро Tauri desktop runtime |
| `tauri-plugin-dialog` | 2 | Нативний файловий діалог |
| `tauri-plugin-cli` | 2 | CLI-аргументи |
| `serde` | 1 (feature: `derive`) | Серіалізація/десеріалізація |
| `serde_json` | 1 | JSON підтримка |
| `open` | 5.0 | Відкриття URL у браузері за замовчуванням |
| `sys-locale` | 0.3 | Визначення системної локалі (uk/en) |

### Rust — Build (`Cargo.toml`)

| Crate | Версія | Призначення |
|-------|--------|-------------|
| `tauri-build` | 2 | Допоміжний build.rs для Tauri |

---

## Tauri команди (IPC Bridge)

| Команда Rust | Що робить |
|--------------|-----------|
| `read_file(path)` | Читає файл з диска, повертає String |
| `open_file_dialog()` | Відкриває нативний діалог, повертає `OpenedFile { path, content }` |
| `load_settings()` | Завантажує `settings.json` поруч з exe |
| `save_settings(settings)` | Зберігає `settings.json` поруч з exe |
| `detect_system_locale()` | Повертає `"uk"` або `"en"` за системною локаллю |
| `get_translations(locale)` | Повертає JSON-об'єкт перекладів для локалі |
| `open_url(url)` | Відкриває URL у браузері (`open` crate) |

---

## Скрипти та команди

### justfile

| Команда | Дія |
|---------|-----|
| `just dev` | Запуск Tauri dev (Vite + Rust watcher) |
| `just build` | Production-збірка: мінімальний exe (повільна компіляція) |
| `just build-fast` | Release-збірка: великий exe (швидка компіляція) |
| `just vite-dev` | Тільки Vite dev-сервер на порту 1420 |
| `just vite-build` | Тільки Vite build → `/dist` |
| `just clean` | Очистити `target/` Cargo |
| `just install` | Встановити JS-залежності (`pnpm install`) |

### package.json scripts

| Команда | Дія |
|---------|-----|
| `pnpm dev` | `tauri dev` |
| `pnpm build` | `tauri build --no-bundle` |
| `pnpm build:fast` | `tauri build --profile release-fast --no-bundle` |
| `pnpm vite:dev` | `vite dev --port 1420` |
| `pnpm vite:build` | `vite build` |

---

## CI/CD

**Workflow:** `.github/workflows/release.yml`

**Тригери:**
- Push тегу `v*` (наприклад, `git tag v0.1.0 && git push --tags`)
- `workflow_dispatch` (ручний запуск з введенням версії та прапорця pre-release)

**Кроки:**
1. Checkout коду
2. Setup Node.js 20 + pnpm (cache)
3. `pnpm install`
4. `pnpm build` (Tauri release build — мінімальний exe)
5. Визначення VERSION з тегу або `inputs.version`
6. Пакування: `marka-{version}-windows-x64.zip` + `SHA256`
7. Публікація GitHub Release (з авто-notes і прапорцем pre-release)
8. **Тільки для стабільних релізів:** `repository_dispatch` → `ruslan-rv-ua/scoop-bucket` → оновлення Scoop-маніфесту

**Секрети:**
- `GITHUB_TOKEN` (вбудований) — для публікації Release
- `SCOOP_BUCKET_TOKEN` — Fine-grained PAT для запису у scoop-bucket (Contents: write)

**Pre-release** (суфікси `-alpha`, `-beta`, `-rc`): Scoop-крок пропускається автоматично.

---

## Профілі збірки Rust

| Профіль | opt-level | lto | codegen-units | strip | panic | Призначення |
|---------|-----------|-----|---------------|-------|-------|-------------|
| `release` | `s` (size) | true | 1 | true | abort | Мінімальний exe для дистрибуції |
| `release-fast` | 1 | false | 16 | false | unwind | Швидка компіляція для розробки |

---

## Ключові архітектурні особливості

- **Portable app** — без інсталятора; `--no-bundle` завжди; `settings.json` поруч з exe
- **NVDA accessibility** — `pre` з `role="region"`, `aria-label`, `tabindex="0"`; blur→animate→focus цикл для оновлення browse mode; `aria-live` регіон для Copy announcements
- **Клавіатура** — використовується `event.code` (layout-незалежно): Ctrl+O (відкрити), Ctrl+± (шрифт), Ctrl+[/] (відступ), Ctrl+T (тема), Escape (закрити)
- **i18n** — дві локалі (uk/en); визначення через `sys-locale` crate при першому запуску
- **Навігація** — in-app навігація по локальних `.md`-посиланнях з in-memory history; зовнішні URL → браузер
- **CSP** — відключений (`"csp": null`) через особливості підсвітки синтаксису
- **Синхронізація версій** — версія має бути однаковою в `package.json`, `tauri.conf.json` та `Cargo.toml`
- **Git-flow** — `main` (production), `develop` (integration), `feature/*`
