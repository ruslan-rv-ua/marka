# CI/CD Setup: Release Workflow & Scoop Integration

**Date**: 2026-03-21
**Status**: Design
**Type**: CI/CD Infrastructure
**Version**: 0.1.0

---

## Overview

Marka will use a **hybrid CI/CD approach**:
- **Primary**: Automated builds on tag push (`v*`)
- **Fallback**: Manual `workflow_dispatch` for rerunning failed builds
- **Integration**: Automatic Scoop bucket manifest updates on release

This design ensures reliable, reproducible releases while maintaining user control when needed.

---

## Release Flow Diagram

```
git tag v0.1.0 && git push --tags
  ↓
[Marka repo] .github/workflows/release.yml
  ├─ Install: Node.js 20 LTS + pnpm
  ├─ Build: pnpm build (Cargo release profile)
  ├─ Package: marka-0.1.0-windows-x64.zip
  │    └─ Contents: marka.exe + LICENSE + README.md
  ├─ Compute: SHA256 hash
  ├─ Publish: GitHub Release (auto-notes)
  └─ Dispatch: update-marka → scoop-bucket (if not pre-release)
       ↓
[Scoop-bucket repo] .github/workflows/update-scoop-manifest.yml
  ├─ Verify: URL accessible & hash matches
  ├─ Update: bucket/marka.json (version, url, hash)
  ├─ Commit & Push to main
  └─ Trigger: ci.yml validation
       ↓
[Scoop-bucket] .github/workflows/ci.yml
  ├─ Validate: JSON syntax & Scoop manifest structure
  └─ Auto-revert on error with notification
```

---

## File Artifacts

### ZIP Archive
- **Name**: `marka-{version}-windows-x64.zip`
- **Example**: `marka-0.1.0-windows-x64.zip`
- **Contents**:
  ```
  marka.exe
  LICENSE
  README.md
  ```
- **Hash**: SHA256 computed by workflow, stored in `{zipname}.sha256` file
- **Size**: ~3.7 MB (already optimized with LTO, strip, highlight.js common preset)

### Scoop Manifest
- **Location**: `scoop-bucket/bucket/marka.json`
- **Fields**:
  - `version`: matches git tag (e.g., `0.1.0`)
  - `description`: "A fast, accessible Markdown file viewer for Windows"
  - `homepage`: github.com/ruslan-rv-ua/marka
  - `license`: MIT
  - `architecture."64bit".url`: GitHub Release download URL
  - `architecture."64bit".hash`: SHA256 from workflow
  - `bin`: marka.exe
  - `shortcuts`: [[marka.exe, Marka]]
  - `persist`: ["settings.json"] (preserved on Scoop update)
  - `checkver`: github
  - `autoupdate`: pattern for auto-updates

### Release Notes
- **Auto-generated** by `softprops/action-gh-release@v2`
- Based on commits since last release (GitHub commit messages)

---

## GitHub Workflow: release.yml

**Location**: `.github/workflows/release.yml` (in marka repo)
**Triggers**:
1. **Push tag** (`push.tags: 'v*'`): automatic build & release
2. **Manual trigger** (`workflow_dispatch`): with optional version & pre-release flag

**Key Steps**:

1. **Checkout & Setup**
   - Checkout code
   - Install Node.js 20 LTS (actions/setup-node@v4)
   - `pnpm install` via cache

2. **Build** (Windows runner)
   - `pnpm vite:build` (frontend)
   - `pnpm build` (Tauri release with `--no-bundle`)
   - Result: `src-tauri/target/release/marka.exe`

3. **Version Resolution**
   - **From tag**: extract version from `refs/tags/v0.1.0` → `0.1.0`
   - **From dispatch**: use `inputs.version`
   - App ID (lowercase): `marka`

4. **Package (PowerShell)**
   - Create temp directory
   - Copy: `marka.exe`, `LICENSE`, `README.md` into root
   - `Compress-Archive → marka-0.1.0-windows-x64.zip`
   - Compute SHA256 → `marka-0.1.0-windows-x64.zip.sha256`

5. **Publish Release**
   - Action: `softprops/action-gh-release@v2`
   - Attach: `*.zip` and `*.zip.sha256` files
   - Generate release notes from commits
   - Draft: `false` (publish immediately)
   - Pre-release: auto-detect from tag suffix (`-alpha`, `-beta`, `-rc`) OR manual flag

6. **Update Scoop Bucket** (conditional)
   - Skip if: `inputs.prerelease == true` OR tag contains `-alpha/-beta/-rc`
   - Send: `repository_dispatch` event `update-marka` with payload:
     ```json
     {
       "app": "marka",
       "version": "0.1.0",
       "hash": "abc123...",
       "url": "https://github.com/ruslan-rv-ua/marka/releases/download/v0.1.0/marka-0.1.0-windows-x64.zip"
     }
     ```
   - Token: `secrets.SCOOP_BUCKET_TOKEN` (Fine-grained PAT)

---

## Scoop Integration

### update-scoop-manifest.yml (lives in scoop-bucket)

**Triggers**:
- `repository_dispatch` with type `update-marka` (from release.yml)
- `workflow_dispatch` (manual override)

**Steps**:
1. Checkout scoop-bucket
2. Verify `bucket/marka.json` exists
3. Download & verify SHA256 against URL
4. Update manifest fields: `version`, `architecture."64bit".url`, `architecture."64bit".hash`
5. Commit & push to `main`

**On Error**:
- Download fails → exit with error
- Hash mismatch → exit with error
- Manifest not found → exit with error

---

### Scoop Manifest: bucket/marka.json

```json
{
  "version": "0.1.0",
  "description": "A fast, accessible Markdown file viewer for Windows",
  "homepage": "https://github.com/ruslan-rv-ua/marka",
  "license": "MIT",
  "notes": [
    "Marka is portable — all settings are stored in settings.json next to the executable.",
    "Keyboard shortcuts:",
    "  Ctrl+O     — open file dialog",
    "  Ctrl+±     — adjust font size",
    "  Ctrl+[/]   — adjust padding",
    "  Ctrl+T     — toggle theme (light/dark)",
    "  Escape     — close app",
    "NVDA accessibility: all interface elements are labeled; code blocks are navigable regions."
  ],
  "architecture": {
    "64bit": {
      "url": "https://github.com/ruslan-rv-ua/marka/releases/download/v0.1.0/marka-0.1.0-windows-x64.zip",
      "hash": "sha256_will_be_filled_by_workflow"
    }
  },
  "bin": "marka.exe",
  "shortcuts": [
    ["marka.exe", "Marka"]
  ],
  "persist": ["settings.json"],
  "checkver": {
    "github": "https://github.com/ruslan-rv-ua/marka"
  },
  "autoupdate": {
    "architecture": {
      "64bit": {
        "url": "https://github.com/ruslan-rv-ua/marka/releases/download/v$version/marka-$version-windows-x64.zip"
      }
    },
    "hash": {
      "url": "$url.sha256"
    }
  }
}
```

---

## Pre-Release Handling

**Alpha/Beta/RC Tags**:
- Tag format: `v0.1.0-alpha`, `v0.1.0-beta`, `v0.1.0-rc`
- Behavior:
  - ✅ GitHub Release: created & marked as pre-release
  - ✅ ZIP & hash: generated normally
  - ❌ Scoop update: **SKIPPED** (bucket only gets stable releases)

**Workflow Dispatch Pre-Release Flag**:
- Manual input: `prerelease` (boolean, optional)
- If checked: same behavior as tag suffix (GitHub Release only, Scoop skipped)

---

## Setup Requirements

### In Marka Repo

1. **Secrets** (Settings → Secrets and variables → Actions):
   - `SCOOP_BUCKET_TOKEN`: Fine-grained PAT with:
     - Owner: ruslan-rv-ua
     - Repository: scoop-bucket only
     - Permissions: Contents (read & write)

2. **Workflow File**: `.github/workflows/release.yml`
   - Copy from scoop-bucket's `examples/release-template.yml`
   - Set `APP_NAME: marka`
   - Update build steps (marked as TODO in template)
   - Copy file block (marked as TODO in template)

### In Scoop-Bucket Repo

1. **Manifest File**: `bucket/marka.json`
   - Initial version: `0.1.0` (matches tag)
   - Will be auto-updated by workflow on each release

2. **Workflows**: Already exist
   - `update-scoop-manifest.yml`: handles dispatch events
   - `ci.yml`: validates manifests

---

## Implementation Checklist

- [ ] Create `.github/workflows/release.yml` in marka repo (from template)
  - [ ] Set `APP_NAME: marka`
  - [ ] Configure Node.js setup & pnpm cache
  - [ ] Configure build steps: `pnpm build`
  - [ ] Configure package step: copy exe, LICENSE, README.md
- [ ] Create `SCOOP_BUCKET_TOKEN` personal access token on GitHub
- [ ] Add `SCOOP_BUCKET_TOKEN` secret to marka repo
- [ ] Create `bucket/marka.json` in scoop-bucket repo
- [ ] Test: tag `v0.1.0-alpha` → verify GitHub Release published, Scoop NOT updated
- [ ] Test: tag `v0.1.0` → verify GitHub Release + Scoop manifest auto-updated
- [ ] Verify: `scoop install ruslan-rv-ua/scoop-bucket` → can install marka

---

## Success Criteria

✅ Tag push `v0.1.0` triggers workflow automatically
✅ ZIP artifact created with correct contents
✅ GitHub Release published with auto-generated notes
✅ SHA256 hash file generated alongside ZIP
✅ Scoop bucket manifest updated automatically
✅ `scoop info marka` shows correct version & URL
✅ Pre-release tags (`-alpha/-beta/-rc`) skip Scoop update
✅ Manual `workflow_dispatch` allows re-running on failure
✅ Settings.json persisted across Scoop updates
✅ App shortcuts added to Windows Start menu via Scoop

---

## Maintenance Notes

- **Version Sync**: When bumping version, update **all three** files to the same value:
  - `package.json` → `version`
  - `src-tauri/tauri.conf.json` → `version`
  - `src-tauri/Cargo.toml` → `version`
  - (Then tag & push — workflow extracts version from tag)

- **Release Build Profile**: Always use `pnpm build` (not `build:fast`) for releases
  - `build`: LTO + strip + opt-level="s" → minimal exe (~3.7 MB)
  - `build:fast`: for local dev only (faster compile, larger exe)

- **Scoop Auto-Update**: Once bucket manifest is in place, Scoop auto-checker will run daily
  - Users: `scoop update marka` to get latest

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| **Token expires** | 1-year expiration; GitHub reminds 30 days before. Update secret in marka repo. |
| **Hash mismatch** | Workflow verifies before updating manifest; auto-reverts on error. |
| **Build fails on CI** | Use `workflow_dispatch` to manually trigger; no Scoop update until success. |
| **Wrong ZIP contents** | Manually inspect first release before enabling auto-update. |
| **Pre-release shipped to stable bucket** | Conditions prevent it (tag suffix OR flag check). |

---

## References

- **Scoop bucket repo**: https://github.com/ruslan-rv-ua/scoop-bucket
- **Release template**: `scoop-bucket/examples/release-template.yml`
- **DEVELOPMENT.md**: scoop-bucket/DEVELOPMENT.md (comprehensive guide)
- **Marka repo**: https://github.com/ruslan-rv-ua/marka
