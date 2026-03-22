# Тест NVDA — Доступність

Цей файл призначений для тестування читача екрана NVDA у додатку Marka.

Відкрийте файл через Ctrl+O і перевіряйте кожну секцію за інструкціями нижче.

**Загальна перевірка:** жодного `<p role="alert">` у DOM, жодних uncaught exceptions у DevTools.

---

## Навігація по заголовкам (browse mode, клавіша H)

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
