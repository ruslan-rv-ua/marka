# Release Testing Guide — Tasks 5, 6, 7

> [!WARNING]
> **Частково застаріло: Scoop більше не оновлюється звідси.**
>
> Цей гайд писався для механізму, якого вже немає. `marka` слала
> `repository_dispatch` до `scoop-bucket`, і для цього тримала секрет
> `SCOOP_BUCKET_TOKEN`. Workflow `update-scoop.yml` видалено, крок
> `Update Scoop bucket` із `release.yml` прибрано, секрет видалено.
>
> Тепер маніфест оновлює **сам bucket**: його workflow `Excavator` читає поля
> `checkver` і `autoupdate` у `bucket/marka.json`, знаходить новий реліз і бере
> хеш із `.sha256`. Запускається вручну з
> [scoop-bucket → Actions → Excavator](https://github.com/ruslan-rv-ua/scoop-bucket/actions),
> плюс раз на добу о 04:20 UTC.
>
> **Що з цього гайду ще правдиве:** усе про реліз як такий — збірка, ZIP, файл
> `.sha256`, GitHub Release, поведінка pre-release тегів.
> **Що вже ні:** кожен крок, що згадує `repository_dispatch`,
> `update-scoop-manifest.yml` або очікування автоматичного оновлення bucket
> після релізу. Зокрема Крок 4 у Task 5 і Крок 4 у Task 6.
>
> Гайд лишається як запис тієї перевірки, а не як інструкція до виконання.

> Цей гайд описує як тестувати автоматичний CI/CD pipeline після налаштування токена (Tasks 2 & 3).

**Статус:** Виконується ПІСЛЯ Tasks 2 & 3
**Час:** ~20-30 хвилин (вкл. час очікування GitHub Actions)
**Вимагається:** ~~SCOOP_BUCKET_TOKEN налаштований у `marka` репозиторії~~ — жодних секретів; див. попередження вище

---

## Загальна схема

```
Task 5: Push v0.1.0-alpha tag
  ↓
GitHub Actions: Release workflow (build, ZIP, publish)
  ↓
GitHub Release created (marked as pre-release)
  ↓
Scoop bucket: NOT updated (умова: skip pre-release)
  ↓
✅ Verify results

---

Task 6: Push v0.1.0 tag (stable)
  ↓
GitHub Actions: Release workflow (build, ZIP, publish)
  ↓
GitHub Release created (stable)
  ↓
repository_dispatch sent to scoop-bucket
  ↓
Scoop bucket: update-scoop-manifest.yml runs
  ↓
bucket/marka.json auto-updated
  ↓
✅ Verify results

---

Task 7: Manual trigger via GitHub UI
  ↓
workflow_dispatch: version 0.1.1, prerelease unchecked
  ↓
GitHub Actions: same as Task 6
  ↓
GitHub Release created
  ↓
✅ Verify results
```

---

## Task 5: Test Alpha Release (No Scoop Update)

### Мета

Перевірити що:
1. ✅ Workflow запускається на tag push
2. ✅ GitHub Release видань з ZIP+SHA256
3. ✅ Release помічена як "Pre-release"
4. ❌ Scoop bucket НЕ оновлюється (для pre-release це нормально)

### Крок 1: Push alpha tag

У командному рядку (PowerShell або Git Bash):

```bash
cd c:\dev\marka
git tag v0.1.0-alpha
git push origin v0.1.0-alpha
```

Очікуваний вивід:
```
Enumerating objects: ...
Counting objects: ...
Compressing objects: ...
Writing objects: ...
Total ... (delta ...), reused ... (delta ...)
To https://github.com/ruslan-rv-ua/marka.git
 * [new tag]         v0.1.0-alpha -> v0.1.0-alpha
```

### Крок 2: Моніторити GitHub Actions

1. Відкрий GitHub: https://github.com/ruslan-rv-ua/marka
2. Клацни на вкладку **Actions**
3. Знайди workflow run "Release" (повинна бути нова)

```
Actions

All workflows:
  ├─ Release
  │   ├─ v0.1.0-alpha  [In progress] ← ТВІЙ TAG
  │   ├─ d12345ab      [Completed]
  │   └─ ...
  └─ ...
```

4. Клацни на run і спостерігай прогрес

Workflow складається з кількох етапів:
- ✅ Checkout code
- ✅ Setup Node.js
- ✅ Install dependencies
- ✅ Build with Tauri (НАЙДОВШЕ — 5-10 хв на першому запуску!)
- ✅ Create release package
- ✅ Create GitHub Release
- ❌ Update Scoop bucket (СКІПНУТО для pre-release)

### Крок 3: Перевіри GitHub Release

1. Відкрий https://github.com/ruslan-rv-ua/marka/releases
2. Знайди новий release `v0.1.0-alpha`

```
Releases

Latest
  v0.1.0-alpha  [Pre-release] ← ЗВЕРНИ УВАГУ НА "Pre-release"

Assets:
  ├─ marka-0.1.0-alpha-windows-x64.zip (3.7 MB)
  └─ marka-0.1.0-alpha-windows-x64.zip.sha256 (65 B)

Release notes:
  (auto-generated from commits)
```

**Перевір:**
- ✅ Помічена як "Pre-release" (червена мітка)
- ✅ ZIP файл присутній
- ✅ SHA256 файл присутній
- ✅ Release notes автоматично згенеровано

### Крок 4: Перевіри що Scoop НЕ оновлено

1. Відкрий https://github.com/ruslan-rv-ua/scoop-bucket/actions
2. Шукай workflow "Update Scoop manifest"

```
Actions / Workflows

All workflows:
  ├─ Update Scoop manifest
  │   (повинна бути ПОРОЖНЯ — ніяких запусків для pre-release)
  └─ Validate Manifests
      └─ ...
```

**Очікуємо:** Немає нових запусків для pre-release (нормально! це означає умова працює).

### Крок 5: Очисти alpha tag

Тепер видали alpha tag, щоб не засмічувати releases:

```bash
cd c:\dev\marka
git tag -d v0.1.0-alpha
git push origin --delete v0.1.0-alpha
```

Очікуваний вивід:
```
To https://github.com/ruslan-rv-ua/marka.git
 - [deleted]         v0.1.0-alpha
```

---

## Task 6: Test Stable Release (With Scoop Update)

### Мета

Перевірити повний pipeline:
1. ✅ GitHub Release видається
2. ✅ ZIP+SHA256 прикріплені
3. ✅ repository_dispatch надіслано
4. ✅ Scoop bucket оновлений
5. ✅ CI validation пройшла

### Крок 1: Push stable tag

```bash
cd c:\dev\marka
git tag v0.1.0
git push origin v0.1.0
```

Очікуваний вивід:
```
To https://github.com/ruslan-rv-ua/marka.git
 * [new tag]         v0.1.0 -> v0.1.0
```

### Крок 2: Моніторити marka GitHub Actions

1. Відкрий https://github.com/ruslan-rv-ua/marka/actions
2. Знайди "Release" workflow для `v0.1.0`
3. Спостерігай поки побудується (5-10 хв)

Чекай поки статус не змінитсья на ✅ (зелена галочка).

### Крок 3: Перевіри marka GitHub Release

1. Відкрий https://github.com/ruslan-rv-ua/marka/releases
2. Знайди `v0.1.0`

```
Latest

v0.1.0  (стабільна — без мітки "Pre-release"!)

Assets:
  ├─ marka-0.1.0-windows-x64.zip (3.7 MB)
  └─ marka-0.1.0-windows-x64.zip.sha256 (65 B)
```

**Перевір:**
- ✅ НЕ помічена як "Pre-release"
- ✅ ZIP файл присутній
- ✅ SHA256 файл присутній

### Крок 4: Чекай на Scoop bucket update

GitHub Actions у `scoop-bucket` повинна запуститися автоматично (завдяки `repository_dispatch`).

⏳ **Чекай 1-2 хвилини** (час на запуск GitHub Actions)

1. Відкрий https://github.com/ruslan-rv-ua/scoop-bucket/actions
2. Знайди "Update Scoop manifest" workflow

```
Actions / Workflows

All workflows:
  ├─ Update Scoop manifest
  │   └─ update-marka [In progress] → [Completed] ← НОВИЙ RUN
  └─ ...
```

3. Клацни на run і спостерігай

Він повинен:
- Завантажити ZIP з URL
- Перевірити SHA256
- Оновити `bucket/marka.json`
- Закоммітити і запушити

### Крок 5: Перевіри оновлену manifest

1. Відкрий https://github.com/ruslan-rv-ua/scoop-bucket/blob/main/bucket/marka.json

```json
{
  "version": "0.1.0",  ← ОНОВЛЕНО
  "architecture": {
    "64bit": {
      "url": "https://github.com/ruslan-rv-ua/marka/releases/download/v0.1.0/marka-0.1.0-windows-x64.zip",  ← ОНОВЛЕНО
      "hash": "abc123def456..."  ← ОНОВЛЕНО (не "placeholder"!)
    }
  },
  ...
}
```

**Перевір:**
- ✅ Version: `"0.1.0"`
- ✅ URL: містить `/v0.1.0/` та правильне ім'я ZIP
- ✅ Hash: реальна SHA256 (починається з букв/цифр, а не "placeholder")

### Крок 6: Перевіри CI validation

1. Відкрий https://github.com/ruslan-rv-ua/scoop-bucket/actions
2. Знайди "Validate Manifests" workflow (після "Update Scoop manifest")

```
Actions / All workflows

Validate Manifests
  └─ v0.1.0 [✅ Completed]  ← ЗЕЛЕНА ГАЛОЧКА = OK
```

Якщо є ❌ (червиний хрест) — щось пішло не так. Перевір:
- JSON синтаксис у `bucket/marka.json`
- URL доступний
- Hash правильний

---

## Task 7: Test Manual Workflow Dispatch

### Мета

Перевірити что workflow можна запустити вручну (fallback якщо tag push не спрацює).

### Крок 1: Запусти workflow вручну

1. Відкрий https://github.com/ruslan-rv-ua/marka/actions
2. У лівому меню клацни "Release" workflow
3. У верху сторінки знайди кнопку "Run workflow" (dropdown)

```
All workflows > Release

[Run workflow ▼]  ← КЛАЦНИ
```

4. Відкриється форма:

```
Use workflow from: main

Версія (version):         [0.1.1              ]
Позначити як pre-release: [☐ Unchecked]

[Run workflow] [Cancel]
```

5. Заповни:
   - **version**: `0.1.1` (версія для тесту)
   - **prerelease**: НЕ обирай (лишай unchecked)

6. Клацни **Run workflow**

### Крок 2: Моніторити запуск

1. Дивися в GitHub Actions workflow
2. Чекай поки побудується

### Крок 3: Перевіри Release

1. Відкрий https://github.com/ruslan-rv-ua/marka/releases
2. Знайди `0.1.1` (без тегу `v`, але з тією версією)

```
Releases

v0.1.0
0.1.1  [New Release, no tag]  ← РУЧНИЙ ТРІГЕР
```

**Перевір:**
- ✅ Release видається
- ✅ ZIP+SHA256 прикріплені

### Крок 4: Очисти тестові releases

Видали `v0.1.0`, `0.1.1` та інші тестові releases з GitHub, щоб не засмічувати реальні релізи.

1. Для кожного release: ... → **Delete**

---

## Після завершення всіх Tasks

✅ **Готово до production!**

Ти можеш тепер:

1. **Для наступного релізу (v0.2.0, тощо):**
   ```bash
   # Оновити версію у 3 файлах:
   #  - package.json
   #  - src-tauri/tauri.conf.json
   #  - src-tauri/Cargo.toml

   git tag v0.2.0
   git push --tags
   # Workflow запуститься автоматично
   ```

2. **Користувачи зможуть установити:**
   ```bash
   scoop bucket add ruslan-rv-ua https://github.com/ruslan-rv-ua/scoop-bucket
   scoop install marka
   scoop update marka  # майбутні оновлення
   ```

3. **Для отримання оновлень:**
   - Scoop автоматично перевіряє 1 раз на день
   - `scoop update marka` оновить на останню версію

---

## Гайд з проблемами

### Проблема: GitHub Actions запускається 10+ хвилин

**Причина:** Перший білд Tauri на Windows довгий (завантажування Rust toolchain, компіляція).

**Рішення:** Це нормально. При наступних релізах буде швидше (cache).

---

### Проблема: "Hash mismatch" у Scoop bucket workflow

**Причина:** ZIP файл пошкоджена або SHA256 неправильна.

**Рішення:**
1. Перевір що GitHub Release успішно видався з правильним ZIP
2. Оновлювач Scoop спробує заново через кілька хвилин
3. Якщо не працює — видали release, видали тег, і спробуй заново

---

### Проблема: Scoop manifest validation failed

**Причина:** JSON синтаксис помилка у `bucket/marka.json`.

**Рішення:**
1. Перевір файл вручну на GitHub
2. Виправ помилку (можливо пропущена кома або лапка)
3. Оновлювач спробує заново

---

## Гарячі посилання

| Сторінка | URL |
|----------|-----|
| Marka Actions | https://github.com/ruslan-rv-ua/marka/actions |
| Marka Releases | https://github.com/ruslan-rv-ua/marka/releases |
| Scoop-bucket Actions | https://github.com/ruslan-rv-ua/scoop-bucket/actions |
| Scoop bucket main | https://github.com/ruslan-rv-ua/scoop-bucket |

---

**Успіхів у релізах! 🚀**
