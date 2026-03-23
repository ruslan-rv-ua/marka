# NVDA-оголошення при завантаженні файлу — Design Spec

## Проблема

При відкритті файлу (Ctrl+O, CLI-аргумент, клік по локальному посиланню) NVDA нічого не оголошує. Незрячий користувач не отримує підтвердження, що файл дійсно завантажився і який саме файл відкрито.

## Рішення

Додати `announce()` виклик у функцію `navigateTo()` після успішного `renderFile()`. Використовується вже існуючий `aria-live="polite"` region та функція `announce()`.

## Підхід

**announce в `navigateTo()`** — обрано як мінімальну зміну з чистою архітектурою:

- `navigateTo()` — єдина точка входу для всіх "нових" відкриттів файлів
- `goBack()`/`goForward()` викликають `renderFile()` напряму і мають власні оголошення ("Назад: файл", "Вперед: файл") — вони не зачіпаються
- Немає дублювання оголошень

Альтернативи (відхилені):
- announce в `renderFile()` з прапорцем `silent` — ускладнює сигнатуру без потреби
- Кастомний DOM event — over-engineering для однорядкового оголошення

## Зміни

### 1. i18n ключі

**`src-tauri/src/locales/uk.json`** — додати:
```json
"file.opened": "Відкрито: {file}"
```

**`src-tauri/src/locales/en.json`** — додати:
```json
"file.opened": "Opened: {file}"
```

### 2. `renderFile()` в `src/main.js`

Змінити `renderFile()` щоб повертала `boolean` — `true` при успіху, `false` при помилці. Це дозволить `navigateTo()` оголошувати тільки при успішному завантаженні.

В `catch`-блоці додати `return false`, в кінці `try`-блоку — `return true`.

### 3. `navigateTo()` в `src/main.js`

Додати `announce()` після успішного `renderFile()`, зберігши `return`:

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

Оголошення "Відкрито: файл" НЕ спрацює якщо `renderFile` показав помилку — користувач почує тільки `role="alert"` повідомлення про помилку.

## Матриця оголошень

| Спосіб відкриття | Оголошення |
|---|---|
| Ctrl+O | "Відкрито: назва.md" |
| CLI `--file` | "Відкрито: назва.md" |
| Клік по локальному посиланню | "Відкрито: назва.md" |
| Alt+← (назад) | "Назад: назва.md" (без змін) |
| Alt+→ (вперед) | "Вперед: назва.md" (без змін) |
| F1 (довідка) | Без оголошення (не є відкриттям файлу) |

## Що НЕ змінюється

- `renderFile()` — мінімальна зміна: додано `return true`/`return false`
- `goBack()` / `goForward()` — без змін
- `showHelp()` — без оголошення
- `aria-live` region — перевикористовується існуючий

## Обсяг

~5 рядків JS + 2 рядки JSON.
