# Test Markdown File

This file contains all basic markdown elements for testing.

---

## 1. Headings

# Heading level 1 (H1)
## Heading level 2 (H2)
### Heading level 3 (H3)
#### Heading level 4 (H4)
##### Heading level 5 (H5)
###### Heading level 6 (H6)

---

## 2. Text Formatting

This is **bold text** (bold)
This is *italic text* (italic)
This is ***bold and italic*** (bold and italic)
This is ~~strikethrough text~~ (strikethrough)
This is <u>underlined text</u> (underlined)
This is H<sub>2</sub>O (subscript)
This is E=mc<sup>2</sup> (superscript)

---

## 3. Links

### External Links
[Google](https://www.google.com)
[GitHub](https://github.com)

### Links with title attribute
[Open Google](https://www.google.com "Most popular search engine")

### Reference Links
[Google][1]
[GitHub][2]

[1]: https://www.google.com "Google"
[2]: https://github.com "GitHub"

### Internal Links
[Go to code section](#7-code-blocks)

---

## 4. Images

### External images with placeholder
![Placeholder Image 1](https://via.placeholder.com/300x200)
![Placeholder Image 2](https://placehold.co/400x300)

### Image with alt text and title
![Logo](https://via.placeholder.com/150x150 "This is a logo")

---

## 5. Lists

### Numbered Lists
1. First item
2. Second item
3. Third item
   1. Nested item 1
   2. Nested item 2
4. Fourth item

### Bulleted Lists
- Item A
- Item B
- Item C
  - Nested item A1
  - Nested item A2
  - Nested item A3
- Item D

### Mixed Lists
1. First item
   - Nested bulleted item
   - Another bulleted item
2. Second item
   1. Nested numbered item
   2. Another numbered item
3. Third item

---

## 6. Tables

### Simple Table
| First Name | Last Name | Age |
|------------|-----------|-----|
| Ivan | Petrenko | 25 |
| Maria | Koval | 30 |
| Petro | Shevchenko | 35 |

### Table with column alignment
| Left | Center | Right |
|:-----|:------:|------:|
| Text | Text | Text |
| Long text | Long text | Long text |
| Short | Short | Short |

---

## 7. Code Blocks

### Inline Code
This is an example of `inline code` in text.

### JavaScript
```javascript
function greet(name) {
    console.log(`Привіт, ${name}!`);
    return `Вітаю, ${name}`;
}

const message = greet("Світ");
```

### Python
```python
def greet(name):
    print(f"Привіт, {name}!")
    return f"Вітаю, ${name}"

message = greet("Світ")
```

### Rust
```rust
fn greet(name: &str) -> String {
    println!("Привіт, {}!", name);
    format!("Вітаю, {}", name)
}

fn main() {
    let message = greet("Світ");
}
```

### HTML/CSS
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Привіт, світ!</h1>
    </div>
</body>
</html>
```

### Code block without language
```
This is a code block without specifying language
It can contain any text
Without syntax highlighting
```

---

## 8. Blockquotes

### Simple Blockquotes
> This is a simple blockquote.
> It can span multiple lines.

### Nested Blockquotes
> This is an outer blockquote.
>
> > This is a nested blockquote.
> >
> > > This is another nested blockquote.
>
> Return to the outer blockquote.

### Blockquotes with other elements
> This is a blockquote with **bold text** and *italics*.
>
> It can also contain:
> - Lists
> - `Code`
> - Other elements

---

## 9. Horizontal Lines

Text before the first line

---

Text between lines

***

Another separator

___

And another one

---

## 10. Escaping Characters

To display markdown characters, they need to be escaped:

- Asterisk: \*
- Underscore: \_
- Square brackets: \[ \]
- Parentheses: \( \)
- Hash: \#
- Plus sign: \+
- Minus sign: \-
- Period: \.
- Exclamation mark: \!
- Backslash: \\

---

## 11. HTML Tags

This is an example of <strong>bold text</strong> via HTML.
This is <em>italic text</em> via HTML.
This is <mark>highlighted text</mark>.
This is <code>code</code> via HTML.

<details>
<summary>Click to expand</summary>
This text is hidden behind a spoiler.
</details>

---

## 12. Checkboxes

- [x] Completed task
- [x] Another completed task
- [ ] Uncompleted task
- [ ] Another uncompleted task

Shopping list:
- [x] Bread
- [x] Milk
- [ ] Eggs
- [ ] Cheese

---

## 13. Reference Links

We already used them above, but here are more examples:

[Google][google]
[GitHub][github]
[Stack Overflow][stackoverflow]

[google]: https://www.google.com "Google search engine"
[github]: https://github.com "Development platform"
[stackoverflow]: https://stackoverflow.com "Questions and answers site"

---

## 14. Headings with ID

Some parsers support adding IDs to headings:

### Heading with ID {#custom-id}

This is a heading with a custom ID that can be linked to.

#### Another heading {#another-id}

You can link to [heading with ID](#custom-id).

---

## Additional Elements

### Automatic Links
<https://www.google.com>
<example@example.com>

### Code with syntax and line numbers
```javascript {lineNumbers: true}
function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}
```

### Conclusions

This test file demonstrates all basic markdown elements that can be used to test markdown content rendering.

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

**End of test file** 🎉
