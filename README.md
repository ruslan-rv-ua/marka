<div align="center">
  <img src="assets/logo-256x256.png" width="128" alt="Marka logo" />
  <h1>Marka</h1>
  <p><em>Minimal Markdown viewer for Windows with accessibility first</em></p>
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

**Marka** is a portable Markdown file viewer for Windows, built with [Tauri](https://tauri.app/) and designed with **accessibility first**. It offers full screen reader support (NVDA) and keyboard navigation.

- **No installer** — portable single `.exe` file
- **Accessibility first** — NVDA screen reader optimized
- **Auto-localization** — detects Windows language (English / Ukrainian)
- **Lightweight** — minimal dependencies, fast startup

## Features

- 📖 **Markdown rendering** — headings, tables, lists, blockquotes
- 💻 **Code blocks** — syntax highlighting via [highlight.js](https://highlightjs.org/) with copy buttons
- 🖼️ **Media embedding** — images, video, audio from local paths
- 🔗 **Navigation** — `.md` links open in-app; external URLs open in browser
- 🎨 **Theme toggle** — dark/light mode (Ctrl+T), persistent settings
- 🔤 **Font size** — adjustable 10–72px (Ctrl+= / Ctrl+-)
- 📏 **Padding control** — horizontal padding adjustment (Ctrl+[ / Ctrl+])
- ⚙️ **Persistent settings** — saved next to the executable
- 📌 **File associations** — `.md` files automatically open with Marka
- 💬 **CLI support** — `marka.exe path\to\file.md`

## Accessibility

Marka is built for screen reader users, with first-class NVDA support:

- **Document structure** — main content marked with `role="document"` and keyboard-navigable with proper focus management
- **Code block landmarks** — every `<pre>` block is a keyboard-accessible region with descriptive ARIA labels
- **Live announcements** — copy actions, theme changes, and errors announced via `aria-live` regions
- **Error handling** — errors marked with `role="alert"` for immediate announcement
- **Keyboard navigation** — all features accessible via keyboard; shortcuts use layout-independent keycodes (works with any keyboard layout)
- **Localization** — all UI text in Ukrainian or English based on Windows system language
- **Focus restoration** — automatic focus reset to content after file load, triggering NVDA virtual buffer refresh

See **Keyboard Shortcuts** section below for full list.

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
- **File association:** Double-click any `.md` file (automatically registered)

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Ctrl+O** | Open file dialog |
| **Ctrl+=** or **Ctrl+NumpadAdd** | Increase font size (+1px, max 72px) |
| **Ctrl+-** or **Ctrl+NumpadSubtract** | Decrease font size (-1px, min 10px) |
| **Ctrl+[** | Decrease horizontal padding (-5%, min 0%) |
| **Ctrl+]** | Increase horizontal padding (+5%, max 25%) |
| **Ctrl+T** | Toggle dark/light theme |
| **Escape** | Close the window |
| **Tab** | Focus code block copy buttons and landmarks |

**Note:** All shortcuts use layout-independent keycodes and work with any keyboard layout (QWERTY, AZERTY, Cyrillic, etc.).

## Building from Source

### Prerequisites

- [Rust](https://www.rust-lang.org/) (latest stable)
- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 10+
- [just](https://github.com/casey/just) (task runner)

### Development

**With just (task runner):**

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

**With just:**

```bash
just build         # Optimized build (slower, minimal exe size)
just build-fast    # Fast release build (faster compile, larger exe)
```

**Without just:**

```bash
pnpm vite:build
cargo tauri build --release
```

Built executables are in `src-tauri/target/release/`.

## Credits

Built with:

- [Tauri](https://tauri.app/) — lightweight desktop framework
- [marked](https://marked.js.org/) — fast Markdown parser
- [highlight.js](https://highlightjs.org/) — syntax highlighting
- [Vite](https://vitejs.dev/) — frontend build tool

## Support

Found a bug or have a suggestion? Open an [issue](https://github.com/ruslan-rv-ua/marka/issues) on GitHub.

---

**Made for accessibility. Built for everyone.**