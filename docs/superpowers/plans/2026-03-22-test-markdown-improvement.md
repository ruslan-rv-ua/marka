# Test Markdown Files Improvement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand `test-markdown/` with 4 new files and 3 extended files to achieve full coverage of Marka's rendering, NVDA accessibility, security (DOMPurify/XSS), Unicode, and edge-case behaviors.

**Architecture:** Pure Markdown/HTML content changes only — no app code modifications. Each task creates or extends one file. Verification is manual: open the file in Marka via Ctrl+O and check the criteria listed per task.

**Tech Stack:** Markdown (CommonMark + GFM via `marked`), inline HTML (sanitized by DOMPurify), UTF-8 without BOM. Verified in Marka (Tauri v2). No automated test suite.

**Spec:** `docs/superpowers/specs/2026-03-22-test-markdown-improvement-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `test-markdown/test-complete.md` | Add Section 15 (anchor links) + Section 16 (long lines) |
| Modify | `test-markdown/test-all-languages.md` | Add SQL, JSON, YAML, Bash |
| Modify | `test-markdown/test-all-languages.md` | Add CSS, C#, Kotlin, Dockerfile |
| Modify | `test-markdown/test-images.md` | Add video/audio fixMediaSrc sections |
| Create | `test-markdown/test-edge-cases.md` | Edge case rendering tests |
| Create | `test-markdown/test-unicode.md` | Unicode/multilingual content |
| Create | `test-markdown/test-security.md` | XSS/DOMPurify verification |
| Create | `test-markdown/test-nvda.md` | NVDA accessibility verification |

---

### Task 1: Extend test-complete.md — anchor links and long lines

**Files:**
- Modify: `test-markdown/test-complete.md`

- [ ] **Step 1: Insert sections 15 and 16 before the final separator**

Find the unique string `**End of test file**` near the bottom of the file. Insert the following two sections immediately before the `---` line that precedes it (i.e., before `---\n\n**End of test file**`):

```markdown
## 15. Anchor Links

### Anchor Target {#anchor-target-id}

Цей заголовок є цільовим якорем. Посилання нижче має прокрутити сторінку до нього.

[Перейти до якірного заголовка](#anchor-target-id)

[Перейти до секції "Блоки коду"](#7-code-blocks)

---

## 16. Long Lines

Рядок з 500+ символів без пробілів (перевірка горизонтального скролу або кліпінгу):

AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA

---
```

- [ ] **Step 2: Verify in Marka**

Open `test-complete.md` (Ctrl+O). Scroll to the bottom. Check:
- Section 15 renders with a visible heading "Anchor Target"
- Clicking `[Перейти до якірного заголовка](#anchor-target-id)` scrolls to the "Anchor Target" heading
- Section 16 renders without layout breakage (horizontal scrollbar or overflow clipping is acceptable)

- [ ] **Step 3: Commit**

```bash
git add test-markdown/test-complete.md
git commit -m "test: add anchor links and long lines to test-complete.md"
```

---

### Task 2: Extend test-all-languages.md — SQL, JSON, YAML, Bash

**Files:**
- Modify: `test-markdown/test-all-languages.md`

- [ ] **Step 1: Append 4 new language sections**

Append to the end of `test-markdown/test-all-languages.md`:

```markdown

---

## 11. SQL

SQL (Structured Query Language) — декларативна мова для роботи з реляційними базами даних. Використовується для запитів, вставки, оновлення та видалення даних. Підтримується PostgreSQL, MySQL, SQLite, MS SQL Server.

```sql
SELECT u.id, u.name, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.created_at >= '2024-01-01'
GROUP BY u.id, u.name
HAVING COUNT(o.id) > 0
ORDER BY order_count DESC
LIMIT 10;
```

Цей SQL-запит демонструє `LEFT JOIN` двох таблиць, фільтрацію по даті (`WHERE`), групування (`GROUP BY`), агрегатну функцію `COUNT`, фільтр по групах (`HAVING`) і сортування з обмеженням (`ORDER BY ... LIMIT`).

---

## 12. JSON

JSON (JavaScript Object Notation) — текстовий формат обміну даними. Широко використовується у веб-API, конфігураційних файлах і серіалізації. Підтримує рядки, числа, масиви, об'єкти, булеві значення та null.

```json
{
  "name": "marka",
  "version": "0.1.0",
  "description": "Markdown viewer for Windows",
  "features": ["nvda-accessibility", "syntax-highlighting", "dark-mode"],
  "settings": {
    "fontSize": 16,
    "paddingX": 10,
    "theme": "dark",
    "windowMaximized": false
  },
  "dependencies": null
}
```

Цей JSON-документ ілюструє основні типи даних: рядки, числа (`16`, `10`), масив рядків (`"features"`), вкладений об'єкт (`"settings"`) та значення `null`.

---

## 13. YAML

YAML (YAML Ain't Markup Language) — формат серіалізації даних, орієнтований на читабельність. Широко використовується у конфігураціях (Docker Compose, GitHub Actions, Ansible, Kubernetes).

```yaml
name: Marka Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: windows-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Build
        run: cargo build --release

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: marka-windows
          path: target/release/marka.exe
```

Цей YAML-файл — приклад GitHub Actions workflow. Показує ключі, списки через дефіс `-`, вкладені об'єкти та багаторівневу ієрархію відступами.

---

## 14. Bash

Bash (Bourne Again Shell) — командна мова та інтерпретатор Unix/Linux. Використовується для автоматизації, системного адміністрування та скриптів CI/CD.

```bash
#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:-0.1.0}"
OUTPUT_DIR="dist"

build_app() {
  local ver="$1"
  echo "Building version $ver..."
  cargo build --release
  mkdir -p "$OUTPUT_DIR"
  cp target/release/marka.exe "$OUTPUT_DIR/marka-$ver.exe"
  echo "Done: $OUTPUT_DIR/marka-$ver.exe"
}

if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: invalid version format '$VERSION'" >&2
  exit 1
fi

build_app "$VERSION"
```

Цей bash-скрипт демонструє `set -euo pipefail`, параметр зі значенням за замовчуванням (`${1:-0.1.0}`), функцію з `local` змінною, перевірку регулярного виразу (`=~`) та виведення помилки в stderr (`>&2`).
```

- [ ] **Step 2: Verify in Marka**

Open `test-all-languages.md`. Scroll to sections 11–14. Open DevTools (F12) → Elements. Confirm each `<code>` block contains `<span class="hljs-...">` elements (syntax highlighting active).

- [ ] **Step 3: Commit**

```bash
git add test-markdown/test-all-languages.md
git commit -m "test: add SQL, JSON, YAML, Bash to language tests"
```

---

### Task 3: Extend test-all-languages.md — CSS, C#, Kotlin, Dockerfile

**Files:**
- Modify: `test-markdown/test-all-languages.md`

**Precondition:** Task 2 must be complete. The file must end with the Dockerfile-less Bash section (section 14) followed by a blank line. Confirm by reading the last 5 lines before proceeding.

- [ ] **Step 1: Append 4 more language sections**

Append to the end of `test-markdown/test-all-languages.md`:

```markdown

---

## 15. CSS

CSS (Cascading Style Sheets) — мова стилів для оформлення HTML-документів. Визначає розміщення, кольори, шрифти та анімацію. Разом з HTML та JavaScript є однією з трьох основних технологій веб.

```css
:root {
  --font-size: 16px;
  --padding-x: 10%;
  --bg-color: #1a1a1a;
  --text-color: #e8e8e8;
  --accent: #4fc3f7;
}

.code-block {
  position: relative;
  background-color: var(--bg-color);
  border-radius: 4px;
  padding: 1rem;
}

.code-block:focus-within {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

@media (max-width: 768px) {
  :root {
    --padding-x: 2%;
  }
}
```

Цей CSS демонструє CSS-змінні (`--`), псевдоклас `:focus-within` для доступності, функцію `var()` та медіазапит `@media` для адаптивності.

---

## 16. C#

C# — об'єктно-орієнтована мова від Microsoft для платформи .NET. Широко використовується для Windows-додатків (WinUI, WPF), серверних застосунків (ASP.NET), ігор (Unity) і мобільних (MAUI).

```csharp
using System;
using System.Collections.Generic;
using System.Linq;

public class MarkdownFile
{
    public string Path { get; init; }
    public string Content { get; private set; }

    public MarkdownFile(string path, string content)
    {
        Path = path ?? throw new ArgumentNullException(nameof(path));
        Content = content;
    }

    public IEnumerable<string> GetHeadings() =>
        Content.Split('\n')
               .Where(line => line.StartsWith('#'))
               .Select(line => line.TrimStart('#', ' '));
}

var file = new MarkdownFile("readme.md", "# Hello\n## World");
foreach (var heading in file.GetHeadings())
    Console.WriteLine(heading);
```

Цей C#-код демонструє `init`-сетер (C# 9+), `ArgumentNullException`, LINQ-методи (`Where`, `Select`) та вираз-тіло методу (`=>`).

---

## 17. Kotlin

Kotlin — статично типізована мова JVM від JetBrains, офіційна мова Android-розробки. Поєднує ООП і функціональний стиль. Відома null-безпекою і лаконічністю.

```kotlin
data class MarkdownFile(
    val path: String,
    val content: String
)

fun MarkdownFile.headings(): List<String> =
    content.lines()
        .filter { it.startsWith("#") }
        .map { it.trimStart('#', ' ') }

fun main() {
    val file = MarkdownFile(
        path = "readme.md",
        content = "# Hello\n## World\n### Section"
    )
    file.headings().forEach { heading ->
        println(heading)
    }
}
```

Цей Kotlin-код демонструє `data class`, функцію-розширення (`fun MarkdownFile.headings()`), функціональні методи (`filter`, `map`, `forEach`) та named arguments.

---

## 18. Dockerfile

Dockerfile — набір інструкцій для збирання Docker-образу. Docker — платформа контейнеризації для пакування застосунків з залежностями. Широко використовується у DevOps та хмарних розгортаннях.

```dockerfile
FROM rust:1.76-slim AS builder

WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src/ ./src/
RUN cargo build --release

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/target/release/marka ./

EXPOSE 8080
USER 1000:1000
ENTRYPOINT ["./marka"]
```

Цей Dockerfile демонструє multi-stage build (Rust `builder` → мінімальний `debian`), копіювання артефакту між стадіями (`COPY --from=builder`) та запуск від непривілейованого користувача (`USER 1000:1000`).
```

- [ ] **Step 2: Verify in Marka**

Open `test-all-languages.md`. Scroll to sections 15–18. Check DevTools → Elements for `<span class="hljs-...">` in each block.

- [ ] **Step 3: Commit**

```bash
git add test-markdown/test-all-languages.md
git commit -m "test: add CSS, C#, Kotlin, Dockerfile to language tests"
```

---

### Task 4: Extend test-images.md — video and audio

**Files:**
- Modify: `test-markdown/test-images.md`

**Prerequisite:** `fixMediaSrc()` already exists in `src/main.js` — it transforms local `src` attributes on `img`, `video`, `audio`, and `source` elements via `convertFileSrc()`. No app code changes needed.

- [ ] **Step 1: Replace the final "End of Test" section**

Find the exact text at the end of `test-markdown/test-images.md`:

```
## End of Test
This is the end of the image test file.
```

Replace it entirely with the following (the "End of Test" heading is preserved at the bottom):

```markdown
## Video and Audio (fixMediaSrc test)

Ці медіафайли не існують на диску. Мета — перевірити що `fixMediaSrc()` перетворює відносні шляхи `src` на `tauri://` URI через `convertFileSrc()`.

**Як перевірити:** відкрийте DevTools (F12) після відкриття цього файлу. Знайдіть елементи `<video>` і `<audio>` у DOM → вкладка Elements. Атрибут `src` має бути `tauri://localhost/...` — а не оригінальний `./sample.*` шлях.

### Video (атрибут src)

<video src="./sample.mp4" controls width="400">
  Відео не підтримується вашим браузером.
</video>

### Audio (атрибут src)

<audio src="./sample.mp3" controls>
  Аудіо не підтримується вашим браузером.
</audio>

### Video з вкладеним елементом source

<video controls width="400">
  <source src="./sample.webm" type="video/webm">
  Відео не підтримується вашим браузером.
</video>

## End of Test
This is the end of the image test file.
```

- [ ] **Step 2: Verify in Marka**

Open `test-images.md`. Open DevTools → Elements. Find `<video>` and `<audio>`:
- `src` attribute on `<video>` must be `tauri://localhost/...` (not `./sample.mp4`)
- `src` attribute on `<audio>` must be `tauri://localhost/...` (not `./sample.mp3`)
- `src` on the nested `<source>` inside `<video>` must also be `tauri://localhost/...`

- [ ] **Step 3: Commit**

```bash
git add test-markdown/test-images.md
git commit -m "test: add video/audio fixMediaSrc tests to test-images.md"
```

---

### Task 5: Create test-edge-cases.md

**Files:**
- Create: `test-markdown/test-edge-cases.md`

- [ ] **Step 1: Create the file**

Create `test-markdown/test-edge-cases.md` (UTF-8, no BOM):

```markdown
# Тест граничних випадків

Цей файл перевіряє поведінку Marka при нестандартному або потенційно зламаному вмісті.

Відкрийте файл через Ctrl+O і перевіряйте кожну секцію.

**Перевірка пройдена якщо:** немає елемента `<p role="alert">` у DOM, немає uncaught exceptions у DevTools, і додаток залишається інтерактивним після відкриття.

---

## 1. Порожній блок коду

Нижче — порожній блок коду. Він **не** повинен отримати `role="region"`, `aria-label`, `tabindex` або кнопку копіювання.

```
```

Перевірте у DevTools → Elements: знайдіть `<pre>` цього блоку — він не повинен мати атрибути `role` або `aria-label`.

---

## 2. Блок коду лише з пробілами

Нижче — блок коду що містить лише пробіли. Має бути пропущений так само як порожній.

```

```

---

## 3. Дуже довгий рядок

Один рядок з 500+ символів без пробілів і переносів. Перевірте що макет не зламаний.

AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA

---

## 4. Зламане зображення

Нижче — зображення що вказує на неіснуючий файл. Браузер показує іконку зламаного зображення; alt-текст "зображення не знайдено" має бути присутній у DOM.

![зображення не знайдено](nonexistent-image-file-abc123.png)

---

## 5. Посилання на неіснуючий файл

Натисніть на посилання нижче. Додаток має показати повідомлення про помилку (українською мовою) і залишитись інтерактивним.

[Відкрити неіснуючий файл](missing-file-that-does-not-exist-abc123.md)

---

## 6. Порожнє посилання

[Текст порожнього посилання]()

---

## 7. Посилання лише з якорем

[Перейти до початку](#)

---

## 8. Глибоке вкладення цитат (6 рівнів)

Перевірте що макет не переповнюється по горизонталі.

> Рівень 1
> > Рівень 2
> > > Рівень 3
> > > > Рівень 4
> > > > > Рівень 5
> > > > > > Рівень 6 — найглибший рівень

---

## 9. Глибоке вкладення списків (5 рівнів)

- Рівень 1
  - Рівень 2
    - Рівень 3
      - Рівень 4
        - Рівень 5 — найглибший рівень

---

## 10. Таблиця з довгим вмістом

| Коротко | Вміст клітинки |
|---------|----------------|
| A | Цей текст у клітинці таблиці є дуже довгим і містить більше двохсот символів підряд без жодного переносу рядка щоб перевірити як таблиця обробляє надто широкий вміст і чи не ламається загальний макет сторінки |
| B | **жирний текст** всередині клітинки |
| C | `інлайн-код` всередині клітинки |

---

## 11. Markdown у блоці коду

Вміст нижче **не** повинен рендеритись — лише як буквальний текст з зірочками.

```
**не жирний**
*не курсив*
[не посилання](https://example.com)
# не заголовок
```

---

## 12. Дуже довгий заголовок H1

# Це дуже довгий заголовок першого рівня що містить більше двохсот символів поспіль для перевірки що він або переноситься або обрізається без зламу загального макету сторінки у додатку Marka для Windows

---

## 13. Якірне посилання

### Цільовий заголовок {#edge-target}

[Перейти до цільового заголовка](#edge-target)

---

**Кінець файлу тест-граничних-випадків**
```

- [ ] **Step 2: Verify in Marka**

Open `test-edge-cases.md`. Check:
- Sections 1–2: inspect `<pre>` elements in DevTools — no `role`, `aria-label`, or copy button
- Section 3: long line does not break page layout
- Section 4: alt text "зображення не знайдено" visible in DOM (`<img alt="...">`)
- Section 5: clicking link shows Ukrainian error message; app remains functional
- Sections 6–7: links render without crashing
- Sections 8–9: deep nesting renders without horizontal overflow
- Section 10: table renders; bold and inline-code work inside cells
- Section 11: literal asterisks visible, no bold rendering
- Section 12: long H1 wraps or clips, no layout break
- Section 13: clicking link scrolls to the target heading

- [ ] **Step 3: Commit**

```bash
git add test-markdown/test-edge-cases.md
git commit -m "test: create test-edge-cases.md"
```

---

### Task 6: Create test-unicode.md

**Files:**
- Create: `test-markdown/test-unicode.md`

- [ ] **Step 1: Create the file**

Create `test-markdown/test-unicode.md` (UTF-8, no BOM):

```markdown
# Тест Unicode та мультимовності

Цей файл перевіряє рендеринг нестандартних символів і багатомовного вмісту у Marka.

**Перевірка пройдена якщо:** усі символи відображаються як правильні гліфи (без □ або кракозябрів), і макет сторінки не переповнюється.

**Must-pass символи:** А-Я а-я і ї є ґ (кирилиця), 👨‍💻 🇺🇦 (емодзі), ∑ √ ∞ (математика), — … «» (типографіка), مرحبا (арабська), 你好 (китайська).

---

## 1. Кирилиця (українська)

### Заголовок кирилицею — Привіт, Марка!

Абзац українською мовою з усіма специфічними буквами: і ї є ґ — ці літери унікальні для українського алфавіту.

- Список першого пункту з кирилицею
- Список другого пункту: слова, речення, абзац
- Список третього пункту: файл, відкрити, закрити

| Назва | Значення |
|-------|----------|
| Розмір шрифту | 16 пікселів |
| Відступ | 10 відсотків |
| Тема | Темна |

Блок коду з кириличними іменами змінних:

```javascript
const змінна = "значення";
let результат = 42;

function вітання(імя) {
  return `Привіт, ${імя}!`;
}

console.log(вітання("Світ"));
```

---

## 2. Емодзі

### Емодзі в тексті

Звичайні: 😀 😎 🚀 ❤️ ✅ ⚠️ 🔥 💡

Прапор України (послідовність регіональних індикаторів): 🇺🇦

ZWJ-послідовності: 👨‍💻 👩‍💻 🏳️‍🌈

### Емодзі у заголовку 🎉

### Емодзі у списку

- ✅ Завершено
- ⏳ В процесі
- ❌ Не виконано

### Емодзі у таблиці

| Статус | Значок |
|--------|--------|
| Успіх | ✅ |
| Попередження | ⚠️ |
| Помилка | ❌ |

### Емодзі у блоці коду

```
# Emojis in code: 😀 🚀 ❤️ ✅
const flag = "🇺🇦";
const dev = "👨‍💻";
```

---

## 3. Математичні символи

Символи: ∑ ∫ √ ∞ ± ≤ ≥ π φ ⊕ ∧ ∨

Стрілки: → ← ↑ ↓ ↔ ⇒ ⇐ ⇔

Формули (як текст):

- Площа кола: S = π·r²
- Сума ряду: ∑ᵢ₌₀ⁿ i = n·(n+1)/2
- Границя: lim(x→∞) 1/x = 0

---

## 4. Типографіка

- Em dash: — (порівняно з дефісом -)
- En dash: – (для діапазонів: 2020–2024)
- Еліпсис: … (порівняно з трьома крапками ...)
- Лапки-ялинки: «текст у лапках»
- Кучеряві лапки: "text in curly quotes" та 'single'
- Стрілки: → ← ↑ ↓

---

## 5. Інші скрипти

### Арабська (RTL — справа наліво)

مرحبا بالعالم — це "Привіт, світ" арабською мовою.

هذا نص عربي بسيط للاختبار.

### Китайська (спрощена)

你好，世界！ — це "Привіт, світ" китайською.

这是一段简单的中文测试文本。

### Японська (хіраґана та катакана)

こんにちは、世界！ — це "Привіт, світ" японською.

マーカ — назва додатку у катакані.

### Корейська

안녕하세요, 세계! — це "Привіт, світ" корейською.

### Гебрейська (RTL)

שלום עולם — це "Привіт, світ" гебрейською.

---

## 6. Спеціальні символи Unicode

- Нерозривний пробіл (U+00A0): "слово1 слово2" (між ними нерозривний пробіл)
- М'який перенос (U+00AD): програм­не­забез­пе­чення
- Простір нульової ширини (U+200B): тут​є ZWSP між "тут" і "є"

---

## 7. Box drawing у блоці коду

```
Структура файлів проекту:
├── src/
│   ├── main.js
│   ├── styles.css
│   └── index.html
├── src-tauri/
│   └── src/
│       └── lib.rs
└── test-markdown/
    ├── test-complete.md
    ├── test-nvda.md
    └── test-unicode.md

Таблиця ASCII:
┌──────────────┬───────────┬────────────┐
│ Компонент    │ Мова      │ Функція    │
├──────────────┼───────────┼────────────┤
│ Frontend     │ JS        │ Рендеринг  │
│ Backend      │ Rust      │ Команди    │
│ Стилі        │ CSS       │ Оформлення │
└──────────────┴───────────┴────────────┘
```

---

**Кінець файлу тест-юнікоду**
```

- [ ] **Step 2: Verify in Marka**

Open `test-unicode.md`. Check:
- Section 1: Ukrainian text renders correctly, cyrillic variable names in code block visible
- Section 2: all emoji render as glyphs (not □); 🇺🇦 and 👨‍💻 display correctly
- Section 3: math symbols visible (∑ √ ∞ ≤ ≥)
- Section 4: — – … «» render as expected typographic characters
- Section 5: Arabic, Chinese, Japanese, Korean, Hebrew — all render as glyphs, no replacement chars
- Section 6: page does not crash with ZWSP or soft-hyphen content
- Section 7: box-drawing characters ┌─┐│└ render correctly in code block

- [ ] **Step 3: Commit**

```bash
git add test-markdown/test-unicode.md
git commit -m "test: create test-unicode.md"
```

---

### Task 7: Create test-security.md

**Files:**
- Create: `test-markdown/test-security.md`

- [ ] **Step 1: Create the file**

Create `test-markdown/test-security.md` (UTF-8, no BOM):

```markdown
# Тест безпеки — DOMPurify / XSS

Цей файл містить XSS-payload-и для перевірки що DOMPurify правильно їх фільтрує.

**ВАЖЛИВО:** відкрийте файл у Marka. Жодного alert-діалогу не повинно з'явитись.

**Як перевірити:** відкрийте DevTools (F12) → Console. Не повинно бути uncaught exceptions або CSP-порушень. У DevTools → Elements перевірте що у DOM відсутні атрибути `onerror`, `onclick`, `onload`, `onmouseover` і теги `<script>`, `<iframe>`, `<object>`, `<embed>`.

**Перевірка пройдена якщо:** жодного alert, жодних помилок у консолі, жоден з небезпечних атрибутів/тегів не присутній у DOM.

---

## 1. Script injection

Теги `<script>` мають бути повністю вилучені. Жодного тексту між ними не відображається.

<script>alert('XSS: script tag')</script>

<script type="text/javascript">alert('XSS: script with type')</script>

---

## 2. Event handlers на елементах

Елементи можуть відображатись, але атрибути `on*` мають бути вилучені.

<img src="x" onerror="alert('XSS: onerror')">

<div onclick="alert('XSS: onclick')">div з onclick (атрибут має бути вилучено)</div>

<p onmouseover="alert('XSS: onmouseover')">p з onmouseover (має бути вилучено)</p>

<svg onload="alert('XSS: svg onload')"><circle r="30" cx="40" cy="40" fill="steelblue"/></svg>

---

## 3. javascript: href у Markdown-посиланні

DOMPurify має вилучити атрибут `href` повністю. Посилання рендеруватиметься без `href` (не клікабельне, немає навігації).

[Спробувати javascript href](javascript:alert('XSS: javascript href'))

[Інший варіант javascript](javascript:void(0))

---

## 4. data: URI у src зображення

Атрибут `src` має бути вилучено.

<img src="data:text/html,<script>alert('XSS: data URI')</script>">

<img src="data:image/svg+xml,<svg onload='alert(1)'><circle r='50'/></svg>">

---

## 5. Небезпечні теги (iframe, object, embed)

Ці теги мають бути повністю вилучені — жодного вмісту не відображається.

<iframe src="https://example.com" width="400" height="300">Fallback iframe</iframe>

<object data="https://example.com/file.pdf" type="application/pdf">Fallback object</object>

<embed src="https://example.com/plugin">

---

## 6. SVG з вбудованим script

<svg><script>alert('XSS: SVG script')</script><circle r="30" cx="40" cy="40" fill="tomato"/></svg>

---

## 7. Markdown-специфічні вектори

### Зображення з XSS у title-атрибуті

![Тестове зображення](x.png "onmouseover=alert('XSS in title')")

### Посилання з XSS у title-атрибуті

[Посилання з небезпечним title](https://example.com "onclick=alert('XSS in link title')")

---

## Підсумок

Якщо ви бачите цей текст і не з'явилось жодного alert-діалогу — DOMPurify працює правильно.

Перевірте у DevTools → Elements:
- Немає тегів `<script>` у DOM
- Немає тегів `<iframe>`, `<object>`, `<embed>` у DOM
- Всі `on*` атрибути відсутні
- `href` у javascript:-посиланнях відсутній

**Кінець файлу тест-безпеки**
```

- [ ] **Step 2: Verify in Marka**

Open `test-security.md`. Verify:
- No alert dialogs appear at any point
- DevTools Console: no uncaught exceptions, no CSP violations
- DevTools Elements: search for `onerror`, `onclick`, `onload` — none found
- DevTools Elements: no `<script>`, `<iframe>`, `<object>`, `<embed>` tags in DOM
- Section 3: javascript: links render as `<a>` with no `href` attribute

- [ ] **Step 3: Commit**

```bash
git add test-markdown/test-security.md
git commit -m "test: create test-security.md (DOMPurify/XSS verification)"
```

---

### Task 8: Create test-nvda.md

**Files:**
- Create: `test-markdown/test-nvda.md`

- [ ] **Step 1: Create the file**

Create `test-markdown/test-nvda.md` (UTF-8, no BOM):

```markdown
# Тест NVDA — Доступність

Цей файл призначений для тестування читача екрана NVDA у додатку Marka.

Відкрийте файл через Ctrl+O і перевіряйте кожну секцію за інструкціями нижче.

**Загальна перевірка:** жодного `<p role="alert">` у DOM, жодних uncaught exceptions у DevTools.

---

## Навігація по заголовках (browse mode, клавіша H)

Перевірте: увімкніть browse mode NVDA і натискайте H — NVDA має переходити між заголовками нижче. Всі рівні H1–H6 мають бути доступні.

# H1 — Заголовок першого рівня
## H2 — Заголовок другого рівня
### H3 — Заголовок третього рівня
#### H4 — Заголовок четвертого рівня
##### H5 — Заголовок п'ятого рівня
###### H6 — Заголовок шостого рівня

---

## Порядок Tab-навігації

Перевірте: натискаючи Tab, NVDA має переходити у такому порядку:

**посилання 1 → посилання 2 → посилання 3 → кнопка копіювання блоку 1 → кнопка копіювання блоку 2 → кнопка копіювання блоку 3**

[Посилання 1 — test-complete.md](test-complete.md)

[Посилання 2 — test-images.md](test-images.md)

[Посилання 3 — test-links.md](test-links.md)

```javascript
// Блок коду 1 — після трьох посилань
const a = 1;
```

```python
# Блок коду 2
a = 1
```

```rust
// Блок коду 3
let a = 1;
```

---

## Нумерація блоків коду

Нумерація продовжується з попередньої секції: наступний блок має бути "Блок коду 4".

NVDA має оголошувати кожен блок як "Блок коду N, регіон" при Tab або при вході у блок через browse mode.

### Блок коду 4 (JavaScript)

NVDA має оголосити: "Блок коду 4, регіон"

```javascript
function greet(name) {
  return `Hello, ${name}!`;
}
```

### Блок коду 5 (Python)

NVDA має оголосити: "Блок коду 5, регіон"

```python
def greet(name):
    return f"Hello, {name}!"
```

### ПОРОЖНІЙ БЛОК — має бути ПРОПУЩЕНИЙ

Цей блок порожній. Він **не** повинен отримати номер або кнопку копіювання. Наступний блок має бути "Блок коду 6" (не 7).

Перевірте у DevTools: `<pre>` нижче не має атрибутів `role`, `aria-label`, `tabindex`.

```
```

### Блок коду 6 (Rust) — нумерація продовжується без пропуску

NVDA має оголосити: "Блок коду 6" (не "Блок коду 7").

```rust
fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}
```

### БЛОК ЛИШЕ З ПРОБІЛАМИ — також має бути ПРОПУЩЕНИЙ

```

```

### Блок коду 7 (Go)

```go
func greet(name string) string {
    return "Hello, " + name + "!"
}
```

### Блок коду 8 (TypeScript)

```typescript
function greet(name: string): string {
    return `Hello, ${name}!`;
}
```

### Блок коду 9 (Java)

```java
public static String greet(String name) {
    return "Hello, " + name + "!";
}
```

### Блок коду 10 (C++) — двозначний номер

NVDA має оголосити: "Блок коду 10, регіон". Перевірте що двозначне число читається коректно.

```cpp
std::string greet(const std::string& name) {
    return "Hello, " + name + "!";
}
```

### Блок коду 11 — без зазначення мови

Перевірте що блок без мови також отримує aria-label і кнопку копіювання (auto-detect через highlight.js).

```
Цей блок коду не має зазначеної мови.
highlight.js автоматично визначає мову.
auto-detect test: function foo() { return 42; }
```

---

## Дуже довгий блок коду (50+ рядків)

Перевірте: Tab входить у блок (tabindex="0"), прокрутка клавішами зі стрілками всередині блоку працює.

NVDA має оголосити: "Блок коду 12, регіон"

```python
# Довгий блок коду для тестування Tab-навігації та прокрутки всередині блоку
# Рядок 1: визначення функцій Фібоначчі

def fibonacci_recursive(n):
    """Рекурсивна версія — зрозуміла, але неефективна."""
    if n <= 0:
        return 0
    elif n == 1:
        return 1
    else:
        return fibonacci_recursive(n - 1) + fibonacci_recursive(n - 2)


def fibonacci_iterative(n):
    """Ітеративна версія — ефективна для великих n."""
    if n <= 0:
        return 0
    a, b = 0, 1
    for _ in range(n - 1):
        a, b = b, a + b
    return b


def fibonacci_sequence(count):
    """Повертає список перших count чисел Фібоначчі."""
    return [fibonacci_iterative(i) for i in range(count)]


def fibonacci_memoized(n, memo={}):
    """Версія з мемоізацією — швидка і рекурсивна."""
    if n in memo:
        return memo[n]
    if n <= 0:
        return 0
    if n == 1:
        return 1
    memo[n] = fibonacci_memoized(n - 1, memo) + fibonacci_memoized(n - 2, memo)
    return memo[n]


def print_fibonacci_table(count):
    """Виводить таблицю перших count чисел Фібоначчі."""
    print(f"{'N':>4} | {'Рекурсивно':>12} | {'Ітеративно':>12}")
    print("-" * 35)
    for i in range(count):
        rec = fibonacci_recursive(i) if i < 15 else "..."
        ite = fibonacci_iterative(i)
        print(f"{i:>4} | {str(rec):>12} | {ite:>12}")


if __name__ == "__main__":
    print("Перші 20 чисел Фібоначчі:")
    print_fibonacci_table(20)

    sequence = fibonacci_sequence(10)
    print(f"\nПерші 10: {sequence}")

    test_values = [0, 1, 5, 10, 20, 30]
    for n in test_values:
        result = fibonacci_iterative(n)
        print(f"fibonacci({n}) = {result}")

    print("\nГотово!")
```

---

## Примітка щодо role="document"

`role="document"` встановлюється на елемент `<main>` в `index.html` — це властивість оболонки застосунку, а не Markdown-вмісту. Жоден файл Markdown не може вплинути на цей атрибут.

**Як перевірити:** DevTools → Elements → знайти `<main role="document">`. Він має бути присутній незалежно від відкритого файлу.

---

**Кінець файлу тест-NVDA**
```

- [ ] **Step 2: Verify in Marka**

Open `test-nvda.md`. Check:
- Headings section: all H1–H6 render; NVDA H-key navigation cycles through them
- Tab order section: Tab sequence is link1 → link2 → link3 → copy btn 1 → copy btn 2 → copy btn 3
- Code block numbering: blocks 1–12 labeled sequentially; no gaps
- Empty block (between 5 and 6): DevTools confirms no `role`/`aria-label` on that `<pre>`; block 6 gets label "Блок коду 6" (not 7)
- Whitespace-only block: also skipped, numbering unaffected
- Block 10: NVDA reads "Блок коду 10" (two-digit number)
- Block 11 (no language): still has `aria-label` and copy button
- Block 12 (long): Tab enters block; arrow key scrolling works inside

- [ ] **Step 3: Commit**

```bash
git add test-markdown/test-nvda.md
git commit -m "test: create test-nvda.md (NVDA accessibility verification)"
```
