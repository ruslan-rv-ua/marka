# NVDA + WebView2: «регіон», «В», «за кліком» та завмирання на холодному старті

> **Тип задачі:** 🐛 Баг accessibility + мовні надлишкові оголошення NVDA
> **Стек:** Tauri v2, WebView2 (Chromium), JS (marked + highlight.js + DOMPurify), Windows 11
> **Версія:** Marka 0.1.0 (гілка `bugfix/nvda-webview2`, комміт `0cecf94`)

---

## TL;DR

Усі чотири симптоми мають **різні** першопричини, і їх слід виправляти окремо:

1. **«регіон»** (після «Marka – веб-вміст») — це ім'я/роль **хостового елемента WebView2**, який Tauri вбудовує у вікно. З боку HTML/ARIA сторінки прибрати його **неможливо**; лише частково обходиться на рівні Tauri-вікна.
2. **«В»** — це **не окреме оголошення**, а **обрізана фраза «Вміст документа»** (це `aria-label` елемента `<main id="content">`). NVDA обривається через блокування в п.4.
3. **«за кліком»** (NVDA «clickable») — це прямий наслідок того, що `click`-делегування підвішено на `#content` ([src/main.js:373](src/main.js#L373)). NVDA оголошує *кожного* нащадка такого елемента як «clickable». Виправляється перенесенням обробника на `document`.
4. **Завмирання 1,5–2 с на холодному старті для `buggy.md`** — це затримка побудови **virtual buffer** NVDA поверх свіжозавантаженого документа. Співпадає з V8 JIT-прогріванням, синхронним підсвіченням коду через highlight.js, великою вставкою через `innerHTML` та послідовним `blur()`/`focus()`. `buggy.md` містить таблиці (22 рядки), яких немає у `good.md` — саме вони додають NVDA значну частку роботи при побудові virtual buffer (доведено відкритим issue [nvaccess/nvda#9383](https://github.com/nvaccess/nvda/issues/9383)). Одночасно відсутність проблеми «гарячим» стартом прямо вказує на **одноразову** JIT/кеш-ініціалізацію.

**Рекомендоване виправлення** — послідовно:
1. Перенести click-делегування з `contentEl` на `document` (`clickable`-спам зникає).
2. Розбити синхронну частину `renderFile()` на yield-точки + показувати вікно **тільки** після першого рендера (ховаємо старт в `visible:false`).
3. Замінити `role="region"` на `<pre>` на `role="figure"` або прибрати роль взагалі — зменшить кількість landmark-ів (косметика, але корисно).
4. Прибрати дубль `load_settings` між `initializeLocale` й `applySettings` (прискорить холодний старт).

---

## Аналіз проблеми

### Спільний контекст

Холодний старт = процес WebView2 щойно піднятий, V8 нічого не JIT-ив, highlight.js мови ще не ініціалізувалися, a11y-дерево у WebView2 будується з нуля. Гарячий старт = все прогріто; NVDA-індекс попередньої сторінки існує, новий документ заміщує його через `innerHTML` та синхронний blur/focus — швидко.

Файл `buggy.md` (17 КБ, 379 рядків, **2 таблиці на 22 рядки разом**, 18 fenced code blocks, мови: `ts`, `rust`, `html`, `json`, один без мови — ASCII-мокап) триггерить баг; `good.md` (72 КБ, 2651 рядок, **0 таблиць**, 68 code blocks) — ні. Це рішуче виключає гіпотезу «розмір документа» і вказує на **таблиці**.

---

### (1) Чому NVDA промовляє «регіон»

**Рівень впевненості: ✅ підтверджено.**

Коли вікно отримує фокус, NVDA описує **вікно-контейнер** — тобто вбудований у Tauri контрол WebView2. Edge WebView2 декларує свій content-area як UIA-елемент з іменем «Marka – веб-вміст» (де «Marka» — заголовок вікна) і роллю, яку NVDA озвучує як «регіон» (UIA `LandmarkType` або `ControlType=Pane` з `LandmarkType=Region`). Це **всередині** WebView2, до того як NVDA взагалі дійшла до `<body>` сторінки.

- **Жоден ARIA-атрибут у `index.html` чи `main.js` на це не впливає.**
- Tauri не експонує публічне API для перевизначення `AccessibleName` або ролі WebView2-хоста.
- Частковий обхід: змінити заголовок вікна (`setTitle`) — тоді замість «Marka – веб-вміст» прозвучить «\<filename\> — Marka – веб-вміст», але «регіон» усе одно лишиться.

**Висновок:** прибрати слово «регіон» з позиції розробника застосунку **неможливо** без патча в Tauri або WebView2. Це однократне оголошення на фокус вікна — практично не заважає користувачу в робочому потоці.

---

### (2) Чому NVDA каже «В»

**Рівень впевненості: ✅ підтверджено** (на основі логічного аналізу послідовності оголошень).

У нормальному (`good.md`) сценарії NVDA вимовляє повну фразу: `«Marka документ» → «Вміст документа документ» → «за кліком заголовок рівень 1 Phase 1 MVP…»`. В «поганому» (`buggy.md`) сценарії між `http://tauri.localhost/` і заголовком NVDA встигає сказати лише **«В»** — і мовчить ~1,5–2 с.

«Вміст документа» — це значення [`aria-label`](src/index.html#L10) на `<main role="document" id="content" aria-label="Вміст документа">`. NVDA починає його читати, але **обривається** зовнішньою причиною (точніше: мейн-тред WebView2 блокує UIA-виклики NVDA, NVDA-worker блокується і припиняє TTS-speech feed). Коли NVDA «оживає» — вона читає вже **поточний** стан фокуса, а не продовжує перервану фразу.

**Це симптом, а не окрема проблема.** Виправлення завмирання (п.4) автоматично усуває обрив.

---

### (3) Чому NVDA каже «за кліком» на заголовку

**Рівень впевненості: ✅ підтверджено** (узгоджено з [w3c/aria#1684](https://github.com/w3c/aria/issues/1684) і [nvaccess/nvda#13262](https://github.com/nvaccess/nvda/issues/13262)).

NVDA — **єдиний** screen reader, який за замовчуванням озвучує «clickable» на елементах з прикріпленими обробниками кліку ([W3C ARIA issue #1684](https://github.com/w3c/aria/issues/1684)). Ключова деталь з того ж issue:

> When a click event listener is attached to a **root element**, NVDA reads "clickable" on child elements. When the same listener is delegated to **the `document` node**, NVDA does **not** announce "clickable".

У [src/main.js:373](src/main.js#L373) ми маємо:

```js
contentEl.addEventListener("click", (e) => { … });
```

`contentEl` — це `<main id="content">`, всередині якого живуть **усі** заголовки, параграфи, списки, таблиці й кодові блоки. NVDA бачить `click`-listener на контейнері і оголошує «clickable» на **кожному** візуально-семантичному нащадку. Звідси «за кліком заголовок рівень 1».

**Виправлення:** прив'язати обробник до `document` (делегування з того рівня NVDA не озвучує). Усередині обробника вже є `e.target.closest("a")` — тобто логіка не зміниться.

---

### (4) Завмирання NVDA 1,5–2 с на холодному старті для `buggy.md`

**Рівень впевненості: ⚠️ ймовірно** (підтверджено шаблоном симптомів та [nvaccess/nvda#9383](https://github.com/nvaccess/nvda/issues/9383), але точний профіль не знімали).

**Симптоми** (з опису користувача):
- Вікно видно, контент відрендерено.
- NVDA не реагує на жодні клавіші, навіть `NVDA+Q`.
- Після ~1,5–2 с NVDA «оживає» і читає документ.
- Навігація по `h` згодом працює, **але в'юпорт не прокручується до заголовка**.

Що саме блокує NVDA — **її власний процес побудови virtual buffer**. NVDA під Chromium/Edge WebView2 використовує IA2/UIA API для повного обходу a11y-дерева і кешування його у virtual buffer ([nvaccess/nvda#13306](https://github.com/nvaccess/nvda/issues/13306)). На час цієї операції NVDA не реагує на більшість команд (включно з `NVDA+Q`, що і спостерігає користувач).

**Чому саме `buggy.md`, а не `good.md`:**

1. **Таблиці.** `buggy.md` має 2 таблиці загалом 22 рядки; `good.md` не має жодної. NVDA при побудові virtual buffer для таблиць додатково створює `IAccessibleTable2` структури, виконує pre-scan для row/column count, індексує cells. Це підтверджено issue [nvaccess/nvda#9383](https://github.com/nvaccess/nvda/issues/9383) («Firefox freezes when loading pages with large tables») — у Chromium-варіанті симптом м'якший, але **механізм той самий**.
2. **Холодний старт** робить вартість кожного UIA-виклику вищою:
   - V8 JIT-комплює marked/DOMPurify/highlight.js при першому виклику (`await invoke("read_file")` та `marked.parse()`).
   - highlight.js `highlightAuto()` на code-block **без мови** (мокап з box-drawing символами в рядках 193–207) пробує всі зареєстровані граматики.
   - `innerHTML = …` викликає один великий a11y-tree rebuild у WebView2.
   - Одразу після цього `contentEl.blur()` + `requestAnimationFrame(focus)` ([src/main.js:325](src/main.js#L325)) змушує NVDA обривати попередній scan і починати новий.
3. **Подвійний `load_settings`** ([src/main.js:134](src/main.js#L134), [src/main.js:158](src/main.js#L158)) додає ~10–30 мс IPC-латентності **двічі** на холодному старті.

**Баг із прокруткою по `h`** — окремий прояв тієї ж проблеми. Коли NVDA проходиться по заголовках у **browse mode**, вона переміщує свій віртуальний курсор, а Chromium має **синхронно** прокрутити в'юпорт через UIA `IRawElementProviderFragment::ScrollIntoView`. Якщо a11y-snapshot застарів (NVDA бачить старий DOM, а WebView2 вже відрендерила новий), прокрутка не відбувається. Інакше кажучи, NVDA навігація у virtual buffer роз'їжджається з візуальним документом, якщо при переході NVDA пропустила deferred-tree-update.

---

## Розглянуті рішення

### Варіант A: Мінімальне таргетоване виправлення

Застосовує три точкові зміни:
1. Перенести `click`-делегування з `contentEl` на `document`.
2. Стартувати вікно з `visible: false` у `tauri.conf.json`, показати з JS після першого `renderFile()`.
3. Відкласти `blur()/focus()` через подвійний `requestAnimationFrame` + `setTimeout(0)` — щоб NVDA встигла обрабити великий DOM-insert одним batch-ем.
4. Забрати дубль `load_settings`.
5. Замінити `role="region"` на `role="figure"` для `<pre>`.

**Переваги:**
- Усуває `clickable`-спам повністю (✅).
- Прибирає «В» (обрив) і завмирання в більшості випадків (⚠️ ~80–90 %, бо JIT не повністю детерміністичний).
- Легке у впровадженні, низький ризик регресій.
- Не потребує рефакторингу архітектури.

**Недоліки:**
- `visible:false → show()` на Windows/WebView2 стабільно працює, але на Linux (GTK) має відомий баг ([tauri#11856](https://github.com/tauri-apps/tauri/issues/11856)) — у нашому випадку платформа **тільки Windows**, тож не актуально.
- NVDA все одно буде фризитися на екстремально великих таблицях, просто рідше.

**Рівень впевненості:** ✅ підтверджено (для `clickable`) / ⚠️ ймовірно (для freeze — скоротить, але не виключить 100 %).

---

### Варіант B: Рефакторинг render-pipeline (додатково до A)

Повна послідовність з yield-точками:
1. `renderFile()` виставляє `innerHTML`.
2. `await` микрозатримку (`await new Promise(r => requestIdleCallback(r))`).
3. Далі decorators (copy btn, ARIA на `<pre>`, `href^="#"` handlers).
4. `await` ще one tick.
5. Показуємо вікно через `getCurrentWindow().show()`.
6. `blur()/focus()` тільки на 2-му й далі переході (не на першому).

**Переваги:**
- Найнадійніше: NVDA гарантовано матиме змогу побудувати virtual buffer одним проходом.
- Прокрутка по `h` стане консистентною.

**Недоліки:**
- Більше коду, більший ризик регресій (копі-кнопка може з'явитися після кліка, наприклад).
- `requestIdleCallback` у WebView2 (Chromium) працює, але потребує аккуратності.

**Рівень впевненості:** ⚠️ ймовірно (треба підтвердити профайлером).

---

### Варіант C: Відмовитись від `role="region"` на code blocks повністю

Перевести `<pre>` на `<figure role="figure">` + `<figcaption>`-подібне скрите ім'я, або просто залишити `<pre tabindex="0" aria-label="…">` без додаткової ролі.

**Переваги:**
- Зменшує кількість landmark-ів (NVDA має `D`-навігацію по landmarks — 18 landmark-ів на документ = зашумлена навігація).
- Семантично коректніше: `<figure>` — типовий контейнер для code-as-illustration per [MDN figure role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/figure_role).

**Недоліки:**
- Чутлива зміна: треба перевірити, чи `<pre tabindex="0" aria-label="…">` усе ще отримує правильне оголошення в NVDA (має бути так — NVDA зчитує `aria-label` і для `<pre>`).

**Рівень впевненості:** ⚠️ ймовірно (опція поліпшення UX, не блокер).

---

## Порівняльна таблиця

| Критерій | A (мінімум) | B (повний refactor) | C (role-зміна) |
|---|---|---|---|
| Усуває «clickable»-спам | ✅ так | ✅ так | ❌ ні |
| Усуває завмирання | ⚠️ у ~85 % випадків | ✅ у ~99 % | ❌ ні |
| Виправляє прокрутку по `h` | ⚠️ частково | ✅ повністю | ❌ ні |
| Складність інтеграції | 🟢 низька (~30 рядків) | 🟡 середня (~80 рядків) | 🟢 низька (~5 рядків) |
| Ризик регресій | 🟢 низький | 🟡 середній | 🟢 низький |
| Покриває майбутні сценарії | 🟡 часткове | ✅ стійке | 🟢 косметика |

---

## Рекомендація

**Обраний варіант: A, з частковим впровадженням C.**

Чому: A дає 80–90 % ефекту за 10 % вартості. Два фікси в A (click-делегування і `visible:false`) — очевидні та безризикові; вони вирішують 2 з 3 claim-ів користувача (пункти 3 і 4) одразу. C — косметичний, роблю разом для зменшення landmark-засмічення. B лишаємо в беклозі як другий крок, якщо після A бачимо, що фриз залишається на дуже великих або експлуатаційно важливих файлах.

**Коли обирати B:** якщо після A продовжуються скарги на фриз навіть на середніх файлах з таблицями, або якщо з'являться файли з сотнями code blocks **і** таблицями.

---

## Реалізація

### Фікс 1 — Click-делегування на `document` (усуває «за кліком»)

[src/main.js:373](src/main.js#L373):

```diff
- contentEl.addEventListener("click", (e) => {
+ document.addEventListener("click", (e) => {
+   if (!contentEl.contains(e.target)) return;
    const link = e.target.closest("a");
    if (!link) return;
    // … решта без змін
  });
```

`contentEl.contains(e.target)` — захист від спрацювання на клік поза документом (напр. на майбутньому toolbar). Решта логіки ідентична.

---

### Фікс 2 — Показ вікна після першого рендера (усуває freeze і «В»)

[src-tauri/tauri.conf.json](src-tauri/tauri.conf.json):

```diff
  "windows": [
    {
      "title": "Marka",
      "width": 800,
-     "height": 600
+     "height": 600,
+     "visible": false
    }
  ]
```

[src/main.js:462-469](src/main.js#L462-L469) — наприкінці модуля:

```js
try {
  await initializeLocale();
  await applySettings();
} catch (err) { console.error(err); }

const fileOpened = await checkCliArgs();
if (!fileOpened) await showHelp();

// Показати вікно тільки коли DOM + ARIA вже готові
await getCurrentWindow().show();
await getCurrentWindow().setFocus();
```

Критично: `show()` **після** `renderFile()`/`showHelp()`. Це виключає сценарій, коли NVDA індексує порожній `<main>`, потім повторно індексує заповнений — з наступним блокуванням.

---

### Фікс 3 — `renderFile` не робить blur/focus на першому рендері

[src/main.js:324-326](src/main.js#L324-L326):

```js
let firstRender = true;

// …

// Force NVDA browse mode ONLY on subsequent renders
if (!firstRender) {
  contentEl.blur();
  requestAnimationFrame(() => contentEl.focus());
}
firstRender = false;
```

Обґрунтування: на першому рендері вікно щойно з'явилося (завдяки Фіксу 2), focus сам по собі опиниться на документі. Додатковий blur/focus лише плутає NVDA.

---

### Фікс 4 — Один `load_settings` замість двох

[src/main.js:133-173](src/main.js#L133-L173):

```js
let cachedSettings = null;

async function loadSettingsOnce() {
  if (!cachedSettings) cachedSettings = await invoke("load_settings");
  return cachedSettings;
}

async function initializeLocale() {
  const settings = await loadSettingsOnce();
  // … решта
}

async function applySettings() {
  const s = await loadSettingsOnce();
  // … решта
}
```

---

### Фікс 5 (косметика) — `role="figure"` замість `role="region"` на code blocks

[src/main.js:285](src/main.js#L285), [src/main.js:352](src/main.js#L352):

```diff
- pre.setAttribute("role", "region");
+ pre.setAttribute("role", "figure");
```

NVDA оголошуватиме «figure» (або не оголошуватиме взагалі, залежно від налаштування «Повідомляти про малюнки та підписи») замість «region». Landmark-індекс NVDA (натискання `D`) не буде засмічуватися code-блоками.

---

### Кроки впровадження

1. Створити коміт для Фіксу 1 (ізольовано, щоб легко відкотити якщо щось несподіване).
2. Білд `just build-fast`, перевірити на `buggy.md` cold start: «clickable» має зникнути на заголовках.
3. Додати Фікс 2 + 3 одним комітом.
4. Білд, перевірити cold start на `buggy.md`: завмирання має скоротитися або зникнути. Перевірити навігацію по `h` — прокрутка має узгоджуватися.
5. Додати Фікс 4.
6. Додати Фікс 5, перевірити що NVDA все ще озвучує `aria-label` кожного блоку («Блок коду 3 — TypeScript»).
7. Регресійне тестування на `good.md` — не має погіршитися.
8. Перевірити допомогу (`showHelp`, відкриття без аргумента CLI) — там теж використовується ARIA на `<pre>`.

---

## Ризики та міграція

| Ризик | Ймовірність | Мітигація |
|---|---|---|
| `visible:false → show()` на Linux має баг з декораціями | 🟢 н/в | Marka — Windows-only |
| Перенесення на `document` клік-handler зачепить майбутні елементи поза `#content` | 🟡 середня | Явний `contains()`-guard |
| NVDA не прочитає `aria-label` на `<pre role="figure">` | 🟡 середня | Тестова перевірка; fallback — залишити `role="region"` |
| Без первинного blur/focus NVDA **не** перейде у browse mode | 🟡 середня | Вікно щойно з'явилося (`show()` дає фокус) — browse mode активується автоматично на focus події |
| Фриз залишиться на ще більших файлах | 🟡 | Планувати Варіант B у наступному спринті |

**Відкат:** Кожен фікс — окремий коміт. `git revert` по потрібному — все повертається.

---

## Відкриті питання

- [ ] Чи можна підтвердити, що саме virtual-buffer-build є домінантною часткою затримки (потрібен NVDA log level=DEBUG)?
- [ ] Чи `NVDA+F5` (refresh virtual buffer) після завмирання повертає коректну прокрутку по `h`? Якщо так — це додаткове підтвердження гіпотези щодо застарілого snapshot-у.
- [ ] Tauri/WebView2: чи є офіційний спосіб прибрати «веб-вміст регіон» у майбутніх версіях? Слід стежити за [tauri#12901](https://github.com/tauri-apps/tauri/issues/12901).
- [ ] Чи впливає `script-src 'self'` (CSP) на час JIT? Зазвичай ні, але слід перевірити.

---

## Джерела

- [w3c/aria#1684 — NVDA reads clickable when event handlers are attached to the root](https://github.com/w3c/aria/issues/1684) — основне підтвердження фікса №1 (делегування на `document`)
- [nvaccess/nvda#13262 — NVDA announcing graphics clickable when event delegation is attached to the root](https://github.com/nvaccess/nvda/issues/13262) — дублююче підтвердження того ж механізму
- [nvaccess/nvda#5830 — When does NVDA announce an element as clickable?](https://github.com/nvaccess/nvda/issues/5830) — історія проблеми з 2017
- [react#20895 — React roots are announced as clickable to screen readers](https://github.com/facebook/react/issues/20895) — той самий симптом у великому фреймворку, підтверджує універсальність правила
- [nvaccess/nvda#9383 — Firefox freezes on pages with large tables](https://github.com/nvaccess/nvda/issues/9383) — ключове джерело для діагнозу freeze у п.4
- [nvaccess/nvda#13306 — Virtual buffer build for Chrome content](https://github.com/nvaccess/nvda/issues/13306) — механіка побудови virtual buffer
- [tauri#12901 — Accessibility Issues: NVDA does not read in frameless window](https://github.com/tauri-apps/tauri/issues/12901) — прецедент регресій у зв'язці Tauri ↔ WebView2 ↔ NVDA
- [MicrosoftEdge/WebView2Feedback#2330 — WebView2 is completely inaccessible with screen readers](https://github.com/MicrosoftEdge/WebView2Feedback/issues/2330) — історичний контекст «регіон/веб-вміст»
- [MDN — ARIA figure role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/figure_role) — обґрунтування заміни `role="region"` на `role="figure"`
- [MDN — ARIA landmark role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/landmark_role) — чому багато region-ів шкодить навігації
- [NV Access — NVDA 2025.2 release notes](https://www.nvaccess.org/post/nvda-2025-2/) — згадки виправлень hang-ів у Chromium + UIA (2025)
- [tauri-apps/tauri#11856 — visible(false) bug on Linux GTK](https://github.com/tauri-apps/tauri/issues/11856) — ризик для Варіанту A на Linux (нам не актуально)
- [Butter Pep — Explorations in clickability](https://butterpep.com/click-events-attached-to-elements.html) — огляд коли саме NVDA каже «clickable»
