# Якість коду

## Дублювання (DRY)

**[ЯКІСТЬ / DRY] src/main.js:157–172**
Функції `announceCopy` і `announceTheme` — майже ідентичні: обидві отримують live-регіон, встановлюють `textContent`, скидають таймер і встановлюють новий на 3000 мс. Відрізняються лише аргументом тексту.
```js
// announceCopy та announceTheme можна замінити однією функцією:
function announce(text) {
  const el = getLiveRegion();
  el.textContent = text;
  clearTimeout(pendingClearTimeout);
  pendingClearTimeout = setTimeout(() => { el.textContent = ""; }, ANNOUNCE_TIMEOUT_MS);
}
```
Поточне дублювання означає, що при зміні часу (3000 мс) або логіки очистки потрібна синхронна правка двох місць.

---

**[ЯКІСТЬ / DRY] src/main.js:199–225**
Два окремих цикли `contentEl.querySelectorAll("pre")` у `renderFile` з однаковим фільтром `if (pre.textContent.trim() === "") return;`. Перший — додає copy-кнопки, другий — встановлює ARIA-атрибути. Відлік `codeBlockIndex` скидається між циклами (`// Reset counter for second pass` — сам коментар є запахом).
Найкраще рішення: злити в один прохід, вписавши ARIA-логіку всередину першого циклу одразу після `wrapper.appendChild(btn)`.

---

**[ЯКІСТЬ / DRY] src/main.js:141–154**
`changeFontSize` і `changePadding` — ідентичний паттерн: зчитати CSS-змінну → clamp → записати CSS-змінну → `scheduleSave()`. Різниця лише в назві змінної та межах.
Невелике дублювання; виділення допоможе при розширенні (наприклад, нова CSS-змінна). Можна зробити загальну `changeCssVar(name, delta, min, max)`.

---

## Читабельність

**[ЯКІСТЬ / ЧИТАБЕЛЬНІСТЬ] src/main.js:188–253**
`renderFile` — «god function» (~65 рядків), виконує: читання файлу → парсинг Markdown → виправлення медіа-шляхів → додавання copy-кнопок → ARIA-атрибути → NVDA-фокус → оновлення заголовка вікна → обробка помилок.
Рекомендовано виділити:
- `addCopyButtons(contentEl)` — логіка рядків 199–213
- `makeCodeBlocksAccessible(contentEl)` — логіка рядків 215–225 (або злити з попереднім)

---

**[ЯКІСТЬ / ЧИТАБЕЛЬНІСТЬ] src/main.js:52–84**
`initializeLocale` містить 8 `console.log` налагоджувальних викликів у production-коді. Функція перетворюється на «журнал подій» замість читабельного алгоритму. Рекомендовано прибрати або замінити умовним `if (import.meta.env.DEV)` логуванням.

---

**[ЯКІСТЬ / ЧИТАБЕЛЬНІСТЬ] src/main.js:106–131**
`scheduleSave` використовує IIFE-обгортку `(async () => { ... })()` всередині `setTimeout`. Читабельніше винести async-логіку в окрему функцію `saveCurrentState()` і викликати її:
```js
saveTimer = setTimeout(() => saveCurrentState(), 1000);
```

---

## Консистентність

**[ЯКІСТЬ / КОНСИСТЕНТНІСТЬ] src/main.js:284–320**
Обробник `keydown` використовує `e.code` (фізична клавіша) для всіх шорткатів: `"KeyO"`, `"KeyT"`, `"BracketLeft"`, `"BracketRight"`, `"Equal"`, `"Minus"` тощо. Це правильний підхід для шорткатів, однак `CLAUDE.md` задокументовано: _«use `event.key` patterns that work regardless of keyboard layout (layouts other than QWERTY send different `event.code`)»_. Документація суперечить реалізації. Оскільки `event.code` описує фізичну позицію клавіші і є layout-незалежним для символьних клавіш, код правильний, але CLAUDE.md слід виправити щоб уникнути плутанини.

---

**[ЯКІСТЬ / КОНСИСТЕНТНІСТЬ] src/main.js:157, 163**
Тайм-аут `3000` мс дублюється двічі (в `announceCopy` і `announceTheme`) як literal. Варто оголосити `const ANNOUNCE_TIMEOUT_MS = 3000;` на рівні модуля.

---

**[ЯКІСТЬ / КОНСИСТЕНТНІСТЬ] src/styles.css:44 (strong)**
`strong { color: #fff; }` — єдиний кольоровий стиль у базовій темі, що використовує hardcoded HEX замість CSS-змінної. Решта кольорів через `var(--...)`. Виправлення: `color: var(--heading);` (вже надало б однаковий ефект).
_Примітка: для light-теми це вже компенсовано через `[data-theme="light"] strong { color: #000000; }`._

---

## Типізація

**[ЯКІСТЬ / ТИПІЗАЦІЯ]** Проект написаний на vanilla JS без TypeScript. `i18n.js` має часткове JSDoc-покриття (`@param {string}`, `@returns {string}`), `main.js` — без JSDoc.
Не критично для поточного розміру проекту. Якщо кодова база зростатиме, варто розглянути `// @ts-check` + JSDoc для `renderFile`, `changeFontSize`, `changePadding`.

---

## Обробка помилок

**[ЯКІСТЬ / ПОМИЛКИ] src/main.js:60–68 (initializeLocale)**
```js
try {
  await invoke("save_settings", { settings });
  console.log("initializeLocale: Settings saved successfully");
} catch (err) {
  console.error("initializeLocale: Error saving settings:", err);
}
```
Помилка збереження налаштувань логується в консоль, але користувач не отримує жодного сповіщення. Якщо перший запуск не зберіг локаль — наступне відкриття знову запустить детекцію. Не критично для десктопного застосунку, але варто задокументувати навмисним коментарем.

---

**[ЯКІСТЬ / ПОМИЛКИ] src/main.js:325–330 (checkCliArgs)**
```js
} catch {
  // No CLI args — that's fine
}
```
`catch` без `(err)` поглинає будь-який виняток з `getMatches()`, включаючи справжні помилки плагіна (не лише «аргументів немає»). Мінімальне виправлення:
```js
} catch (err) {
  // Plugin not initialized or no CLI args — expected in non-CLI launch
  if (import.meta.env.DEV) console.warn("checkCliArgs:", err);
}
```

---

**[ЯКІСТЬ / ПОМИЛКИ] src/main.js:267–270, 291–294**
Помилки `open_url` і `open_file_dialog` логуються лише в консоль. Кінцевий користувач не отримує зворотнього зв'язку при збої. Для `open_url` — варто додати `announceCopy(t("error.openUrl"))` або аналог. Для `open_file_dialog` — помилка діалогу є незвичною; поточна поведінка прийнятна, але потребує ручної перевірки.

---

## Продуктивність

**[ПЕРФОРМАНС] src/main.js:199–225**
Два послідовних виклики `querySelectorAll("pre")` на кожен рендер файлу. Для великих Markdown-документів із сотнями code-блоків — подвійний обхід DOM.
Найкраще рішення: злити в один прохід (описано в секції DRY вище).
Очікуваний ефект: вдвічі менше обходів DOM при рендері.
Ризик змін: низький.

---

**[ПЕРФОРМАНС] src/main.js:107–131 (scheduleSave)**
При кожному спрацюванні `setTimeout` викликається `getCurrentWindow()` — створюється новий handle на вікно. Для debounce-функції, яка спрацьовує по 1 разу після закінчення руху/зміни розміру, це незначно. Але `const win = getCurrentWindow()` вже є в `applySettings` і могло б бути module-level змінною.
Ризик змін: низький.

---

**[ПЕРФОРМАНС] src/main.js:115–120 (scheduleSave)**
```js
getComputedStyle(root).getPropertyValue("--font-size")
getComputedStyle(root).getPropertyValue("--padding-x")
```
Два виклики `getComputedStyle` при кожному збереженні. Мінімальний вплив, але можна об'єднати в один:
```js
const cs = getComputedStyle(root);
```
Ризик змін: низький.

---

## Hardcoded значення / Конфігурація

**[ЯКІСТЬ / КОНФІГ] src/main.js:142–143, 149–150**
Межі шрифту (`10`–`72 px`) і відступів (`0`–`25%`) — magic numbers inline у `changeFontSize` / `changePadding`. При потребі зміни або локалізації документації — шукати по коду.
Рекомендовано:
```js
const FONT_SIZE_MIN = 10, FONT_SIZE_MAX = 72;
const PADDING_MIN = 0, PADDING_MAX = 25;
```

---

**[ЯКІСТЬ / КОНФІГ] src/main.js:108**
Debounce-затримка `1000` мс у `scheduleSave` — hardcoded. `const SAVE_DEBOUNCE_MS = 1000;`.

---

## TODO / Технічний борг

Явних `TODO`, `FIXME`, `HACK` або закоментованого коду у вихідних файлах не виявлено. Кодова база чиста в цьому відношенні.

---

## Підсумок

| Категорія | Кількість |
|-----------|-----------|
| Критичних проблем якості | 0 |
| Рекомендованих покращень | 9 |
| Косметичних / мінор | 4 |

**Загальна оцінка:** Кодова база невелика, добре структурована, з чіткою відповідальністю між модулями. Основні можливості для покращення — злиття подвійного DOM-обходу в `renderFile`, усунення debug-логів з production-коду, та виділення кількох magic-number констант. Rust-бекенд (`lib.rs`) написаний чисто, без зауважень.
