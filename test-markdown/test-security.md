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
