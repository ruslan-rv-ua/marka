# GitHub Token Setup для Scoop Integration

> Цей гайд покроково пояснює як налаштувати `SCOOP_BUCKET_TOKEN` — персональний токен доступу, необхідний для автоматичного оновлення Scoop bucket при виконанні релізів.

**Статус:** Вимагає ручного виконання на GitHub
**Час:** ~5 хвилин
**Вимагається:** GitHub аккаунт з правами власника `ruslan-rv-ua` організації

---

## Частина 1: Створення Fine-Grained PAT (Task 2)

### Що це таке?

**Fine-Grained Personal Access Token (PAT)** — це спеціальний токен доступу з обмеженими правами. На відміну від звичайного токена, fine-grained PAT може мати доступ тільки до конкретного репозиторію та конкретних операцій.

У нашому випадку: токен матиме доступ ТІЛЬКИ до `scoop-bucket` репозиторію, ТІЛЬКИ для запису вмісту (Contents: Read & Write).

### Чому це потрібно?

Workflow у `marka` репозиторії повинен мати можливість писати в `scoop-bucket` репозиторій (для оновлення `bucket/marka.json` при кожному релізі). GitHub не дозволяє це за допомогою звичайного `GITHUB_TOKEN` — потрібен спеціальний токен.

---

## Крок за кроком: Створення PAT

### 1️⃣ Перейти на сторінку налаштувань

1. Відкрий GitHub: https://github.com
2. У правому верхньому куті клацни на **аватар** (твоя фотографія або ініціали)
3. У меню вибери **Settings**

```
GitHub.com avatar ↓
  ├─ Your profile
  ├─ Your repositories
  ├─ Your projects
  ├─ Your stars
  ├─ Your gists
  ├─ Settings ← КЛАЦНИ СЮДИ
  └─ Sign out
```

**Посилання:** https://github.com/settings/profile

---

### 2️⃣ Відкрити Developer settings

На лівій панелі прокрути вниз. Знайди секцію **Developer settings** (останній пункт перед кінцем).

```
Settings (ліва панель):
  ├─ Public profile
  ├─ Account
  ├─ Password and authentication
  ├─ Sessions
  ├─ SSH and GPG keys
  ├─ Repositories
  ├─ Organizations
  ├─ Moderation
  ├─ Code, planning, and automation
  ├─ Integrations
  ├─ ...
  └─ Developer settings ← КЛАЦНИ СЮДИ
```

**Посилання:** https://github.com/settings/apps

---

### 3️⃣ Перейти до Personal access tokens

У Developer settings меню (ліва панель):
- Вибери **Personal access tokens**
- Потім **Tokens (classic)** або **Fine-grained tokens**

Нам потрібні **Fine-grained tokens** (новіший, безпечніший, із гранульованим контролем).

```
Developer settings:
  ├─ GitHub Apps
  ├─ Personal access tokens
  │    ├─ Tokens (classic) ← старий формат
  │    └─ Fine-grained tokens ← НОВИЙ, КЛАЦНИ
  ├─ SSH and GPG keys
  └─ ...
```

**Посилання:** https://github.com/settings/tokens?type=beta

---

### 4️⃣ Створити новий токен

На сторінці Fine-grained tokens клацни зеленопу кнопку:
- **Generate new token**

```
Fine-grained personal access tokens

You don't have any fine-grained personal access tokens yet.

[Generate new token] ← КЛАЦНИ
```

---

### 5️⃣ Заповнити форму

Відкриється велика форма. Заповни поля точно як описано:

#### 📋 Основна інформація

| Поле | Значення | Пояснення |
|------|----------|-----------|
| **Token name** | `scoop-bucket-dispatch` | Ім'я токена для власних записів |
| **Description** | `Token for Scoop bucket updates from Marka release workflow` | Опціонально, але корисно пам'ятати що це |
| **Expiration** | `1 year` | GitHub нагадає оновити через рік |
| **Resource owner** | `ruslan-rv-ua` | Обов'язково твій username/organization |

#### 🔐 Доступ до репозиторіїв

- Вибери опцію: **Only select repositories**
- Потім клацни на випадаючий список і вибери: **scoop-bucket**

```
[Repository access]
  ◯ All repositories (not recommended)
  ◉ Only select repositories ← ОБОВ'ЯЗКОВО ЦЕ

  [Select repositories ▼]  ← Клацни, вибери "scoop-bucket"
```

#### 📝 Дозволи (Permissions)

Прокрути вниз до секції **Permissions**.

**Repository permissions** — змінюй ТІ поля, які перелічені нижче. Решта залишай як є.

| Поле | Значення | Чому |
|------|----------|------|
| **Contents** | `Read and write` | Потрібно писати `bucket/marka.json` |
| **Metadata** | `Read-only` | GitHub додасть автоматично |
| *Решта полів* | `No access` | Залишай як є (для безпеки) |

```
Permissions

Repository permissions:
  ✓ Contents: Read and write ← ОБОВ'ЯЗКОВО
  ✓ Metadata: Read-only (auto-added)
  ○ Deployments: No access
  ○ Issues: No access
  ○ Discussions: No access
  ... (решта без змін)

Account permissions:
  ○ All "No access" (залишай як є)
```

#### ✅ Створити

Клацни зелену кнопку внизу:
- **Generate token**

---

### 6️⃣ КРИТИЧНО: Скопіюй токен

GitHub покаже довгий рядок, який починається з `github_pat_...`

**⚠️ ЦЕ ЄДИНИЙ МОМЕНТ КОЛИ GITHUB ПОКАЗУЄ ПОВНЕ ЗНАЧЕННЯ ТОКЕНА!**

Після закриття цієї сторінки ти його більше не побачиш.

```
Fine-grained Personal Access Token

Your new token:

github_pat_11ABC123XYZ456789ABCDEFGHIJ... [Copy]

⚠️ Make sure to save your token somewhere safe.
   You won't be able to see it again.
```

**Що робити:**
1. Клацни **Copy** (копіювати в буфер обміну)
2. Відкрий програму для збереження паролів (1Password, Bitwarden, Keepass, тощо)
3. Вставка токен там
4. **Схоронити**

Якщо ти не маєш менеджера паролів — напиши токен на папір і **СХОВАЙ В БЕЗПЕЧНЕ МІСЦЕ**.

---

## Частина 2: Додання Токена як Secret у Marka Repo (Task 3)

Тепер коли ти маєш токен, потрібно добавити його як **Secret** у `marka` репозиторій. Це дозволить workflow отримати доступ до токена при запуску.

### 1️⃣ Перейти до Settings у marka репозиторії

1. Відкрий https://github.com/ruslan-rv-ua/marka
2. Клацни на вкладку **Settings** (у меню репозиторію)

```
Marka repo navbar:
  Code | Issues | Pull requests | Discussions | Actions
  Projects | Wiki | Security | Insights | Settings ← КЛАЦНИ
```

**Посилання:** https://github.com/ruslan-rv-ua/marka/settings

---

### 2️⃣ Відкрити Secrets and variables

На лівій панелі Settings знайди секцію **Security**:

```
Settings (ліва панель):
  ├─ General
  ├─ Code and automation
  │    ├─ Actions and Packages ← МОЖЛИВО ТУТМ
  │    └─ ...
  ├─ Security (розташування може розрізнятися)
  │    ├─ Secrets and variables ← КЛАЦНИ СЮДИ
  │    ├─ Code security and analysis
  │    └─ ...
  └─ ...
```

Якщо не знайдеш — скористайся прямим посиланням:
**https://github.com/ruslan-rv-ua/marka/settings/secrets/actions**

---

### 3️⃣ Клацни на "Secrets and variables"

Відкриється сторінка з двома вкладками:
- **Secrets**
- **Variables**

Переконайся, що ти на вкладці **Secrets** (по замовчуванню вона перша).

```
Secrets / Variables
├─ Repository secrets ← КЛАЦНИ ТУТ (вже має бути активна)
├─ Repository variables
└─ Environment secrets
```

---

### 4️⃣ Клацни "New repository secret"

На сторінці Secret буде зелена кнопка:

```
[New repository secret] ← КЛАЦНИ
```

---

### 5️⃣ Заповни форму

Відкриється форма для додання Secret:

| Поле | Значення |
|------|----------|
| **Name** | `SCOOP_BUCKET_TOKEN` |
| **Secret** | Вставка токен, який ти скопіював у Task 2 |

```
Repository secrets / Add a new secret

Name: [SCOOP_BUCKET_TOKEN                    ]

Secret: [github_pat_11ABC123XYZ456789ABCD... ]

[Add secret]
```

**Важливо:**
- Ім'я повинно бути **точно** `SCOOP_BUCKET_TOKEN` (велика літера, без помилок)
- Секрет — це повне значення токена (`github_pat_...`)

---

### 6️⃣ Клацни "Add secret"

Зелена кнопка внизу форми:

```
[Add secret]
```

GitHub збереже токен і покаже його у списку secrets (але саме значення більше не буде видно).

---

### 7️⃣ Перевір що SECRET додано

На сторінці **Repository secrets** повинен з'явитися новий запис:

```
Repository secrets

SCOOP_BUCKET_TOKEN    [Updated 2 minutes ago]
```

Якщо його там немає — повтори крок 5-6.

---

## Перевірка

Коли обидва кроки (Task 2 & 3) завершені, можна переходити до **Task 5: Test Alpha Release**.

Workflow у `release.yml` матиме доступ до токена через `${{ secrets.SCOOP_BUCKET_TOKEN }}` і зможе надсилати `repository_dispatch` подія у `scoop-bucket`.

---

## Гайд для наступних кроків

Коли ти завершиш Tasks 2 & 3:

1. **Task 5: Test alpha release** — push тегу `v0.1.0-alpha` і перевіри що GitHub Release створено, але Scoop НЕ оновлено

2. **Task 6: Test stable release** — push тегу `v0.1.0` і перевіри що обидва — GitHub Release і Scoop bucket — оновлено

3. **Task 7: Manual test** — вручну спусти workflow через GitHub UI

4. **Task 8** — вже завершена ✅

---

## Проблемогайд

### Проблема: "Token not found" або помилка при push

**Причина:** Токен немає у Secret репозиторію або ім'я неправильне.

**Рішення:**
1. Перевір що Secret має ім'я **точно** `SCOOP_BUCKET_TOKEN`
2. Перевір що значення токена — повне (`github_pat_...`)
3. Перевір що Repository access включає тільки `scoop-bucket`

---

### Проблема: "Token expired"

**Причина:** Токен закінчився (по замовчуванню 1 рік).

**Рішення:**
1. Створи новий токен (повтори Task 2)
2. Оновлюй Secret в `marka` репозиторії новим токеном (повтори Task 3)

---

### Проблема: "Repository not found"

**Причина:** Токен не має доступу до `scoop-bucket` репозиторію.

**Рішення:**
1. Перевір що при створенні токена (Task 2) ти вибрав **Only select repositories** і виділив **scoop-bucket**
2. Якщо неправильно — видали токен на GitHub і створи новий

---

## Гарячі клавіші для швидкого переходу

| Сторінка | Посилання |
|----------|-----------|
| Налаштування профілю | https://github.com/settings/profile |
| Developer settings | https://github.com/settings/apps |
| Fine-grained tokens | https://github.com/settings/tokens?type=beta |
| Marka Settings | https://github.com/ruslan-rv-ua/marka/settings |
| Marka Secrets | https://github.com/ruslan-rv-ua/marka/settings/secrets/actions |

---

## Завершено!

Коли ти закінчиш обидва кроки:
1. ✅ Створено fine-grained PAT (`scoop-bucket-dispatch`)
2. ✅ Додано Secret `SCOOP_BUCKET_TOKEN` у `marka` репозиторії

...можеш почати **Task 5: Test Alpha Release** та інші тестування.

До зустрічі! 🚀
