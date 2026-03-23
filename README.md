<div align="center">
  <img src="assets/logo-256x256.png" width="128" alt="Marka logo" />
  <h1>Marka</h1>
  <p><em>Minimal Markdown viewer for Windows, built with accessibility in mind</em></p>
  <p>
    <a href="readme.uk.md">🇺🇦 Українська</a>
  </p>
</div>

<div align="center">

![Platform](https://img.shields.io/badge/platform-Windows-0078d4?logo=windows)
![Release](https://img.shields.io/github/v/release/ruslan-rv-ua/marka)
![Tauri](https://img.shields.io/badge/built%20with-Tauri-24c8db?logo=tauri)

</div>

## About

**Marka** is a portable Markdown file viewer for Windows, built with [Tauri](https://tauri.app/) and optimized for **accessibility**. It offers full screen reader support (NVDA) and keyboard navigation.

- **Portable** — single `.exe` file, no installer needed
- **Accessibility first** — optimized for NVDA screen readers
- **Auto-localization** — detects Windows language (English / Ukrainian)
- **Lightweight** — minimal dependencies and fast startup

## Features

- 📖 **Markdown rendering** — headings, tables, lists, and blockquotes
- 💻 **Code blocks** — syntax highlighting via [highlight.js](https://highlightjs.org/) with copy buttons
- 🖼️ **Local media** — support for images, video, and audio from local paths
- 🔗 **Navigation** — internal anchors (`#heading`), `.md` links open in-app; external URLs open in your browser
- 🧭 **History** — navigate back and forward between opened files (Alt+Left/Right)
- 🎨 **Theme toggle** — switch between dark and light modes (Ctrl+T)
- 🔤 **Adjustable font** — 10–72px font size (Ctrl+= / Ctrl+- / Ctrl+0 to reset)
- 📏 **Interface padding** — adjust horizontal padding (Ctrl+[ / Ctrl+ / Ctrl+0 to reset)
- ⚙️ **Auto-save settings** — configuration is saved next to the executable
- 📌 **File associations** — `.md` files can be opened directly with Marka
- 💬 **CLI support** — `marka.exe path\to\file.md`

## Accessibility

Marka is designed specifically for screen reader users, with first-class NVDA support:

- **Document structure** — main content uses `role="document"` for proper focus management and navigation
    - **Code block landmarks** — every `<pre>` block is a keyboard-accessible region with descriptive ARIA labels
- **Dynamic notifications** — file opening, copy actions, theme changes, and errors are announced via `aria-live` regions
- **Anchor navigation** — fully supported structured document traversal for jumping between sections
- **Error handling** — errors are marked with `role="alert"` for immediate announcement
- **Keyboard navigation** — all features are accessible via keyboard; shortcuts use layout-independent keycodes
- **Localization** — user interface adapts to Ukrainian or English based on system settings
- **Focus restoration** — automatic focus reset to content after loading a file to refresh the NVDA virtual buffer

See the **Keyboard Shortcuts** section below for the full list.

## Installation

### Option 1: Portable (Recommended)

1. Go to [Releases](https://github.com/ruslan-rv-ua/marka/releases)
2. Download `marka-{version}-windows-x64.zip`
3. Extract the ZIP file
4. Run `marka.exe`

### System Requirements

- **OS:** Windows 10 (version 1803+) or Windows 11
- **Microsoft WebView2 Runtime**
  - Pre-installed on Windows 10 (21H2+) and all Windows 11 versions
  - If you have an older Windows 10 build, download from [Microsoft Edge WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

- **Visual C++ Redistributable (2022)**
  - Usually pre-installed on most systems
  - If Marka fails to start, download from [Microsoft](https://aka.ms/vs/17/release/vc_redist.x64.exe)

### Option 2: Scoop

If you use [Scoop](https://scoop.sh/):

```powershell
scoop bucket add ruslan-rv-ua https://github.com/ruslan-rv-ua/scoop-bucket
scoop install marka
```

This method automatically manages updates and persists your settings.

## Usage

### Opening Files

- **File dialog:** Press **Ctrl+O** to browse for a `.md` file
- **CLI:** `marka.exe C:\path\to\file.md`
- **Help screen:** Open Marka without providing a file to see the built-in usage guide and available shortcuts

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Ctrl+O** | Open file dialog |
| **Alt+Left** | Open previous file in history |
| **Alt+Right** | Open next file in history |
| **Ctrl+=** or **Ctrl+NumpadAdd** | Increase font size (+1px, max 72px) |
| **Ctrl+-** or **Ctrl+NumpadSubtract** | Decrease font size (-1px, min 10px) |
| **Ctrl+[** | Decrease horizontal padding (-5%, min 0%) |
| **Ctrl+]** | Increase horizontal padding (+5%, max 25%) |
| **Ctrl+0** | Reset font size and padding to default |
| **Ctrl+T** | Toggle dark/light theme |
| **Escape** | Close the window |

**Note:** All shortcuts use layout-independent keycodes and work with any keyboard layout (QWERTY, AZERTY, Cyrillic, etc.).

## Building from Source

### Prerequisites

- [Rust](https://www.rust-lang.org/) (latest stable)
- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 10+
- [just](https://github.com/casey/just) (task runner)

### Development

**Using just (recommended):**

```bash
pnpm install
just dev           # Tauri dev server (Vite + Rust watcher)
just vite-dev      # Frontend only (Vite on port 1420)
just clean         # Clean Rust build artifacts
```

**Without just:**

```bash
pnpm install
pnpm vite:dev &    # Start Vite dev server in background
cargo tauri dev    # Start Tauri dev server
```

### Production Build

**Using just:**

```bash
just build         # Optimized build (slower, minimal exe size)
just build-fast    # Fast release build (faster compile, larger exe)
```

**Without just:**

```bash
pnpm vite:build
cargo tauri build --release
```

The resulting executables are located in `src-tauri/target/release/`.

## Development & Testing

### Manual QA fixtures

The `test-markdown/` directory contains Markdown files for manual rendering verification:

| File | Purpose |
|------|---------|
| `test-all-languages.md` | Syntax highlighting for all supported languages |
| `test-complete.md` | All Markdown elements (headings, tables, lists, blockquotes) |
| `test-images.md` | Embedded images (local and external) |
| `test-links.md` | Internal and external link navigation |
| `test-mixed.md` | Mixed content stress test |

Open any of these files in Marka to verify rendering after code changes.

## Credits

Built with:

- [Tauri](https://tauri.app/) — lightweight desktop framework
- [marked](https://marked.js.org/) — fast Markdown parser
- [highlight.js](https://highlightjs.org/) — syntax highlighting
- [Vite](https://vitejs.dev/) — frontend build tool

## Support

Found a bug or have a suggestion? Open an [issue](https://github.com/ruslan-rv-ua/marka/issues) on GitHub.

## License

Distributed under a modified MIT License that prohibits Russian localization
and use by the aggressor state. See [LICENSE](LICENSE) for details.

---

**Designed for accessibility. Built for everyone.**