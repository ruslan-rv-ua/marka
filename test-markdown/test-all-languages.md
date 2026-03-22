# Test code examples for different programming languages

## 1. JavaScript

JavaScript is a high-level programming language that is one of the core technologies of web development. It supports object-oriented, functional, and imperative programming. JavaScript is used both on the client side (in browsers) and on the server side (Node.js).

```javascript
function greet(name) {
    return `Hello, ${name}!`;
}

const message = greet("World");
console.log(message);
```

In this example, we define a function `greet` that takes a parameter `name` and returns a greeting using template literals. Then we call this function with the argument "World" and output the result to the console using `console.log()`.

---

## 2. Python

Python is an interpreted, high-level programming language with dynamic typing. It is known for its simplicity and readable syntax, making it ideal for beginners. Python is widely used in web development, scientific research, data analysis, artificial intelligence, and automation.

```python
def greet(name):
    return f"Hello, {name}!"

message = greet("World")
print(message)
```

This code demonstrates a Python function `greet` that uses f-strings for text formatting. The function takes an argument `name` and returns a formatted string. We call the function with the value "World" and output the result using the built-in `print()` function.

---

## 3. Rust

Rust is a modern system programming language that focuses on memory safety, parallelism, and performance. It provides memory safety without using a garbage collector, making it ideal for system programming, operating system development, browser engines, and other high-performance applications.

```rust
fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

fn main() {
    let message = greet("World");
    println!("{}", message);
}
```

In this Rust example, we see a function `greet` with explicit typing of parameters and return value. The parameter `name` has type `&str` (a reference to a string), and the function returns `String`. The `format!` macro is used to create a formatted string. The `main` function is the program entry point, where `greet` is called and the result is output using the `println!` macro.

---

## 4. Java

Java is an object-oriented programming language known for its platform independence thanks to the Java Virtual Machine (JVM). It is used in enterprise development, Android applications, web services, and large systems. Java provides strong typing, automatic memory management, and multithreading.

```java
public class Greeting {
    public static String greet(String name) {
        return "Hello, " + name + "!";
    }

    public static void main(String[] args) {
        String message = greet("World");
        System.out.println(message);
    }
}
```

This Java code demonstrates a class `Greeting` with a static function `greet` that takes a parameter of type `String` and returns a concatenated string. The `main` method is the program entry point, where we call the `greet` function with the argument "World" and output the result to the console using `System.out.println()`. All methods are declared as `static`, which allows calling them without creating an instance of the class.

---

## 5. C++

C++ is a powerful general-purpose programming language that supports object-oriented, procedural, and functional programming. It provides high performance and low-level memory control, making it ideal for system programming, games, embedded systems, and high-performance applications.

```cpp
#include <iostream>
#include <string>

std::string greet(const std::string& name) {
    return "Hello, " + name + "!";
}

int main() {
    std::string message = greet("World");
    std::cout << message << std::endl;
    return 0;
}
```

This C++ code demonstrates the use of the Standard Template Library (STL). We include the `<iostream>` header for output and `<string>` for working with strings. The `greet` function takes a parameter by constant reference (`const std::string&`) for optimization, as this avoids copying the string. In the `main` function, we call `greet`, store the result in the `message` variable, and output it to the console using `std::cout`, returning 0 for successful program completion.

---

## 6. Go

Go (Golang) is a programming language developed by Google for creating simple, reliable, and efficient programs. It is known for its simplicity, high performance, and built-in support for concurrency (goroutines). Go is widely used in cloud services, microservices, and DevOps tools.

```go
package main

import "fmt"

func greet(name string) string {
    return "Hello, " + name + "!"
}

func main() {
    message := greet("World")
    fmt.Println(message)
}
```

In this Go example, we see the `main` package, which is the entry point for an executable program. We import the `fmt` package for formatting and output. The `greet` function takes a parameter of type `string` and returns `string`. In the `main` function, we use the `:=` operator for short variable declaration of `message` with automatic type inference, then output the result using `fmt.Println()`.

---

## 7. TypeScript

TypeScript is a superset of JavaScript that adds static typing and other features to improve development. TypeScript compiles to pure JavaScript, allowing it to be used in any project where JavaScript works. It is especially useful for large projects and team development.

```typescript
function greet(name: string): string {
    return `Hello, ${name}!`;
}

const message: string = greet("World");
console.log(message);
```

This TypeScript code is similar to JavaScript but with the addition of static typing. The `greet` function has explicitly specified types for the parameter `name` and the return value (`string`). The `message` variable is also explicitly typed as `string`. This allows errors to be detected at compile time and improves IDE support for autocompletion and refactoring. The same template literals and `console.log()` are used for output.

---

## 8. PHP

PHP is a server-side programming language specifically created for web development. It is known for its simple integration with HTML and databases. PHP is used to create dynamic websites and web applications, including popular CMS like WordPress, Drupal, and Joomla.

```php
<?php
function greet($name) {
    return "Hello, " . $name . "!";
}

$message = greet("World");
echo $message;
?>
```

This PHP code demonstrates a function `greet` with dynamic typing of the parameter `$name`. PHP uses the `.` operator for string concatenation. The code is wrapped in `<?php ... ?>` tags, which indicate the start and end of PHP code. Variables in PHP start with the `$` sign, and the `echo` function is used to output the result to the browser or console.

---

## 9. Ruby

Ruby is a dynamic, object-oriented programming language known for its elegance and developer productivity. It focuses on simplicity and programmer satisfaction. Ruby is most known for the Ruby on Rails framework, which is used for rapid web application development.

```ruby
def greet(name)
  "Hello, #{name}!"
end

message = greet("World")
puts message
```

This Ruby code demonstrates the elegant and concise syntax of the language. The `greet` function does not need the `return` keyword — the last expression in the function is automatically returned. Ruby uses string interpolation `#{name}` to insert values into strings. The `puts` method outputs the result to the console with a newline at the end. Ruby is known for its readability and minimalist syntax.

---

## 10. Swift

Swift is a powerful and intuitive programming language developed by Apple for iOS, macOS, watchOS, and tvOS. It combines performance and safety with modern syntax. Swift was created to replace Objective-C and has become the primary language for application development in the Apple ecosystem.

```swift
func greet(_ name: String) -> String {
    return "Hello, \(name)!"
}

let message = greet("World")
print(message)
```

This Swift code demonstrates the modern syntax of the Apple language. The `greet` function uses an underscore `_` before the parameter `name`, which allows calling the function without the argument name. Typing in Swift is explicit — the parameter has type `String`, and the function returns `String`. Swift uses string interpolation `\(name)` and the `let` keyword to declare the immutable constant `message`. The `print()` function outputs the result to the console.

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

Цей YAML-файл — приклад GitHub Actions workflow. Показує ключи, списки через дефіс `-`, вкладені об'єкти та багаторівневу ієрархію відступами.

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
