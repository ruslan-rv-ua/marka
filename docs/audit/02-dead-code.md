# Мертвий код

## Невикористані файли

Не виявлено. Усі наявні файли або є частиною збірки, або мають чітке призначення.

**Потребує перевірки:**

```
[ПОТРЕБУЄ ПЕРЕВІРКИ] test-markdown/ (5 файлів)
Проблема: test-markdown/test-all-languages.md, test-complete.md, test-images.md,
          test-links.md, test-mixed.md — не імпортуються і не запускаються жодними
          скриптами чи CI. Використовуються для ручного тестування.
Найкраще рішення: якщо це офіційні QA-фікстури — додати до README або Makefile;
                  якщо вже не потрібні — видалити.
Впевненість: потребує перевірки
```

---

## Невикористані змінні та функції

```
[МЕРТВИЙ КОД] src/main.js:255
Проблема: const fileHistory = [] — масив оголошується з коментарем
          "In-memory history of opened files", елементи push-аться у click-обробнику
          (рядки 277-278), але масив ніколи не читається. Функції "назад" або
          перегляду історії у застосунку немає.
Найкраще рішення: видалити fileHistory, push-блок у click-обробнику та коментар.
Впевненість: висока
```

---

## Невикористані імпорти

Не виявлено. Усі JS-імпорти (invoke, convertFileSrc, getCurrentWindow, getMatches,
Marked, markedHighlight, hljs, initI18n, t, getLocale) використовуються у коді.
Усі Rust use-декларації (tauri::Manager, tauri_plugin_dialog::DialogExt, std::fs,
open) використовуються у функціях.

---

## Невикористані залежності

**package.json:**

Не виявлено. Усі п'ять runtime-залежностей та дві dev-залежності використовуються
у коді або у Tauri CLI.

Додатково — виявлено vestigial-поле:

```
[МЕРТВИЙ КОД] package.json:5
Проблема: "main": "index.js" — поле успадковане з npm-шаблону. Файл index.js
          не існує в корені проекту. Для Tauri + Vite точкою входу є src/index.html,
          яка налаштована у vite.config.js. Поле main ніяк не впливає на збірку,
          але є оманливим.
Найкраще рішення: видалити рядок "main": "index.js" з package.json.
Впевненість: висока
```

**Cargo.toml:**

Не виявлено. Усі залежності (tauri, serde, serde_json, tauri-plugin-dialog,
tauri-plugin-cli, open, sys-locale) активно використовуються у lib.rs.

---

## Недосяжний код

Не виявлено. Жодного коду після return/throw/break, умов що завжди false або
взаємовиключних match-гілок у JS чи Rust не виявлено.

---

## Застарілі коментарі та TODO

```
[МЕРТВИЙ КОД] src/main.js:53–84
Проблема: 8 відлагоджувальних console.log у initializeLocale() — виконуються при
          кожному старті застосунку і виводять у консоль внутрішній стан ініціалізації:
            53: "initializeLocale: Starting..."
            55: "initializeLocale: Loaded settings:", settings
            59: "initializeLocale: No locale found, detecting system locale..."
            61: "initializeLocale: Detected locale:", detectedLocale
            63: "initializeLocale: Saving settings...", settings
            66: "initializeLocale: Settings saved successfully"
            71: "initializeLocale: Locale already set to:", settings.locale
            75: "initializeLocale: Initializing i18n with locale:", settings.locale
            84: "initializeLocale: Complete"
          Ці логи явно залишені від активної розробки функції i18n.
Найкраще рішення: видалити всі 8 рядків console.log (console.error на рядку 68
                  залишити — він повідомляє про реальну помилку збереження).
Впевненість: висока
```

```
[ПОТРЕБУЄ ПЕРЕВІРКИ] .github/workflows/release.yml:1–26
Проблема: увесь заголовний блок коментарів описує файл як "шаблон" і містить
          інструкцію "Заміни TODO-блоки: збірка і список файлів для ZIP."
          Насправді обидва TODO-блоки вже заповнені реальним кодом, а коментар
          є пережитком процесу копіювання шаблону.
Найкраще рішення: або видалити/скоротити заголовний коментар, або залишити як
                  документацію — не впливає на роботу CI.
Впевненість: потребує перевірки
```

---

## Підсумок

- **Впевнено можна видалити: 3 елементи**
  1. `fileHistory` масив + push-блок (src/main.js:255, 277–278)
  2. 8 debug `console.log` в `initializeLocale()` (src/main.js:53–84)
  3. `"main": "index.js"` поле (package.json:5)

- **Потребує ручної перевірки: 2 елементи**
  1. `test-markdown/` — 5 тестових файлів (чи потрібні, документувати або видалити?)
  2. Заголовний коментар-шаблон у `.github/workflows/release.yml:1–26`
