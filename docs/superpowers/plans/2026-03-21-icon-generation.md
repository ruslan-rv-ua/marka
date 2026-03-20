# Icon Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate a complete set of icons (PNG + ICO) from logo.svg with transparent background and place them in the correct Tauri bundle locations.

**Architecture:** SVG → PNG (via ImageMagick) at multiple sizes → ICO compilation → file placement. No code changes needed; only asset generation and file replacement.

**Tech Stack:** ImageMagick (`magick` CLI), Tauri (v2), Windows NSIS/MSI bundler

---

## File Structure

**Files to Create:**
- `src-tauri/icons/32x32.png` — small icon (menus, small UI)
- `src-tauri/icons/64x64.png` — intermediate size
- `src-tauri/icons/128x128.png` — main app icon
- `src-tauri/icons/128x128@2x.png` — Retina/high-DPI (256×256)
- `src-tauri/icons/icon.ico` — Windows multi-resolution ICO
- `assets/logo-256x256.png` — README image (compact)
- `assets/logo-512x512.png` — README image (full-size)

**Files Modified:** None (old PNG/ICO files in `src-tauri/icons/` replaced)

**No Code Changes:** `tauri.conf.json` already points to these paths

---

## Task 1: Verify ImageMagick Installation

**Files:** None (verification only)

- [ ] **Step 1: Check if ImageMagick is installed**

Run:
```bash
magick --version
```

Expected output: Version number (e.g., "Version: ImageMagick 7.x.x-x")

**If not installed:** Install via Scoop:
```bash
scoop install imagemagick
```

- [ ] **Step 2: Verify logo.svg exists and is readable**

Run:
```bash
ls -la logo.svg
```

Expected: File exists at project root (`c:\dev\marka\logo.svg`)

---

## Task 2: Generate PNG Icons from logo.svg

**Files:**
- Create: `src-tauri/icons/32x32.png`
- Create: `src-tauri/icons/64x64.png`
- Create: `src-tauri/icons/128x128.png`
- Create: `src-tauri/icons/128x128@2x.png`
- Source: `logo.svg`

- [ ] **Step 1: Generate 32×32 PNG**

Run:
```bash
magick convert logo.svg -trim -background none -resize 32x32 src-tauri/icons/32x32.png
```

Expected: File created at `src-tauri/icons/32x32.png` (transparent background, "M" centered)

- [ ] **Step 2: Generate 64×64 PNG**

Run:
```bash
magick convert logo.svg -trim -background none -resize 64x64 src-tauri/icons/64x64.png
```

Expected: File created at `src-tauri/icons/64x64.png`

- [ ] **Step 3: Generate 128×128 PNG**

Run:
```bash
magick convert logo.svg -trim -background none -resize 128x128 src-tauri/icons/128x128.png
```

Expected: File created at `src-tauri/icons/128x128.png`

- [ ] **Step 4: Generate 128×128@2x PNG (256×256)**

Run:
```bash
magick convert logo.svg -trim -background none -resize 256x256 src-tauri/icons/128x128@2x.png
```

Expected: File created at `src-tauri/icons/128x128@2x.png`

- [ ] **Step 5: Verify all PNG files exist**

Run:
```bash
ls -la src-tauri/icons/*.png
```

Expected: All four PNG files listed with sizes

- [ ] **Step 6: Commit PNG icons**

```bash
git add src-tauri/icons/32x32.png src-tauri/icons/64x64.png src-tauri/icons/128x128.png src-tauri/icons/128x128@2x.png
git commit -m "assets: generate PNG icons from logo.svg with transparent background"
```

---

## Task 3: Generate ICO File

**Files:**
- Create: `src-tauri/icons/icon.ico`
- Source: `src-tauri/icons/32x32.png`, `src-tauri/icons/64x64.png`, `src-tauri/icons/128x128.png`

- [ ] **Step 1: Combine PNGs into ICO**

Run:
```bash
magick convert src-tauri/icons/32x32.png src-tauri/icons/64x64.png src-tauri/icons/128x128.png -colors 256 src-tauri/icons/icon.ico
```

Expected: File created at `src-tauri/icons/icon.ico`

- [ ] **Step 2: Verify ICO file exists and is valid**

Run:
```bash
ls -la src-tauri/icons/icon.ico
```

Expected: File exists, size reasonable (typically 10-50 KB for multi-res ICO)

- [ ] **Step 3: Commit ICO**

```bash
git add src-tauri/icons/icon.ico
git commit -m "assets: generate icon.ico from PNG icons for Windows bundler"
```

---

## Task 4: Generate README Images

**Files:**
- Create: `assets/logo-256x256.png`
- Create: `assets/logo-512x512.png`
- Source: `logo.svg`

- [ ] **Step 1: Create assets directory (if needed)**

Run:
```bash
mkdir -p assets
```

Expected: Directory exists (or already existed)

- [ ] **Step 2: Generate 256×256 README image**

Run:
```bash
magick convert logo.svg -trim -background none -resize 256x256 assets/logo-256x256.png
```

Expected: File created at `assets/logo-256x256.png`

- [ ] **Step 3: Generate 512×512 README image**

Run:
```bash
magick convert logo.svg -trim -background none -resize 512x512 assets/logo-512x512.png
```

Expected: File created at `assets/logo-512x512.png`

- [ ] **Step 4: Verify README images exist**

Run:
```bash
ls -la assets/logo-*.png
```

Expected: Both files listed

- [ ] **Step 5: Commit README images**

```bash
git add assets/logo-256x256.png assets/logo-512x512.png
git commit -m "assets: add logo images for README (256×256 and 512×512)"
```

---

## Task 5: Verify Tauri Bundle Configuration

**Files:** `src-tauri/tauri.conf.json` (verify, no changes)

- [ ] **Step 1: Check bundle icon paths in tauri.conf.json**

Read file: `src-tauri/tauri.conf.json` (lines 39-43)

Expected content:
```json
"bundle": {
  "icon": [
    "icons/32x32.png",
    "icons/128x128.png",
    "icons/icon.ico"
  ]
}
```

✅ Confirm paths match the files you created in Task 2 & 3.

- [ ] **Step 2: No action needed**

The config already points to the correct files. The new icons will be bundled automatically.

---

## Task 6: Test the Build

**Files:** None (testing only)

- [ ] **Step 1: Clean build artifacts (optional, but recommended)**

Run:
```bash
pnpm tauri build -- --no-bundle
```

Or full clean:
```bash
rm -rf src-tauri/target
pnpm build
```

Expected: Tauri builds without icon-related errors

- [ ] **Step 2: Build the application**

Run:
```bash
pnpm build
```

Expected: Build completes successfully (check console output for any icon warnings)

- [ ] **Step 3: Verify icon in exe**

Run:
```bash
ls -la src-tauri/target/release/marka.exe
```

Expected: Executable exists

**Manual verification (Windows GUI):**
- Open `src-tauri/target/release/marka.exe` in File Explorer
- Right-click → **Properties**
- Verify icon shows the "M" logo (not the default Windows icon)

Alternative: Run the exe and check:
- Window title bar icon (top-left of window)
- Taskbar icon when app is running

- [ ] **Step 4: Verify MSI/NSIS installer**

Run:
```bash
ls -la src-tauri/target/release/bundle/
```

Expected: `msi/` and/or `nsis/` folders exist with installer files

**Manual verification (if NSIS installer built):**
- Open the `.exe` installer
- Verify icon in installer UI matches your logo

- [ ] **Step 5: Commit test results (if clean build)**

```bash
git add -A
git commit -m "build: verify icon integration in Tauri bundle"
```

(Only commit if there are untracked files from the build; otherwise no commit needed.)

---

## Summary of Outputs

| File | Size | Purpose |
|------|------|---------|
| `src-tauri/icons/32x32.png` | 32×32 px | Menu, small UI |
| `src-tauri/icons/64x64.png` | 64×64 px | Intermediate |
| `src-tauri/icons/128x128.png` | 128×128 px | Main app icon |
| `src-tauri/icons/128x128@2x.png` | 256×256 px | Retina |
| `src-tauri/icons/icon.ico` | Multi-res | Windows exe/installer |
| `assets/logo-256x256.png` | 256×256 px | README (compact) |
| `assets/logo-512x512.png` | 512×512 px | README (full) |

All files have **transparent background** (RGBA PNG, no color keying).

---

## Notes for Implementation

- **ImageMagick `-trim`:** Removes solid-colored borders and white space; ideal for extracting just the "M" from logo.svg
- **`-background none`:** Ensures transparent output
- **ICO multi-resolution:** Combining multiple sizes in one `.ico` file allows Windows to pick the best size for each context (window, installer, etc.)
- **Tauri auto-bundling:** Once files are in place and `tauri.conf.json` references them, `pnpm build` automatically includes them in the exe and installer packages
- **No app code changes:** This is purely asset work; no Rust or JavaScript modifications needed
