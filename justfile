# Marka — Tauri markdown viewer

# Show available commands
default:
    @just --list

# Start Tauri dev server (Vite + Rust watcher)
[doc('Development mode')]
dev:
    pnpm tauri dev

# Production build — minimal exe, slow compile
[doc('Release build (small exe)')]
build:
    pnpm tauri build --no-bundle

# Fast build — larger exe, quick compile
[doc('Release build (fast compile, larger exe)')]
build-fast:
    pnpm tauri build --no-bundle -- --profile release-fast

# Frontend-only dev server on port 1420
[doc('Frontend dev server only')]
vite-dev:
    pnpm vite dev --port 1420

# Frontend-only production build to /dist
[doc('Frontend build only')]
vite-build:
    pnpm vite build

# Clean Rust build artifacts
[doc('Clean cargo target/')]
clean:
    cargo clean --manifest-path src-tauri/Cargo.toml

# Install JS dependencies
[doc('Install JS dependencies')]
install:
    pnpm install
