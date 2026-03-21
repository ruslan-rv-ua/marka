# CI/CD Release & Scoop Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement hybrid CI/CD workflow: automatic release builds on tag push, manual fallback via workflow_dispatch, automatic Scoop bucket updates for stable releases.

**Architecture:**
- `release.yml` in marka repo handles build, packaging, publishing GitHub Release, and optional Scoop dispatch
- `marka.json` in scoop-bucket provides manifest template that auto-updater will fill with version/hash/url
- SCOOP_BUCKET_TOKEN enables cross-repo dispatch from marka to scoop-bucket
- Pre-release tags (`-alpha/-beta/-rc`) skip Scoop to prevent unstable releases in bucket

**Tech Stack:**
- GitHub Actions (workflow trigger: tag push + manual dispatch)
- Node.js 20 + pnpm (frontend build)
- Rust Cargo (Tauri release profile with LTO/strip)
- PowerShell (ZIP packaging)
- Scoop (manifest validation via bucket's ci.yml)

---

## Task 1: Create release.yml Workflow in Marka Repo

**Files:**
- Create: `.github/workflows/release.yml`

### Steps

- [ ] **Step 1: Copy template from scoop-bucket**

Fetch the release template:
```bash
curl -s https://raw.githubusercontent.com/ruslan-rv-ua/scoop-bucket/main/examples/release-template.yml > /tmp/release-template.yml
```

Copy to marka repo:
```bash
cp /tmp/release-template.yml c:\dev\marka\.github\workflows\release.yml
```

Expected: File created at `.github/workflows/release.yml`

- [ ] **Step 2: Set APP_NAME to 'marka'**

Edit `.github/workflows/release.yml`, find line ~52:
```yaml
env:
  # ─── ЄДИНЕ МІСЦЕ ДЕ ТРЕБА ЗМІНИТИ ІМ'Я ───────────────────────────────────
  # Регістр важливий: це ім'я буде використано в назві ZIP-архіву.
  # APP_ID (для event-type у scoop-bucket) буде автоматично приведено до lowercase.
  APP_NAME: MyApp
  # ──────────────────────────────────────────────────────────────────────────
```

Replace with:
```yaml
env:
  APP_NAME: marka
```

Expected: Line updated to `APP_NAME: marka`

- [ ] **Step 3: Replace TODO build section with Node.js + pnpm + Tauri**

Find the TODO block marked "── ЗБІРКА ──" (around line 66), delete commented examples.

Replace entire "── ЗБІРКА ──" section with:
```yaml
      # ── NODE.JS + PNPM + TAURI BUILD ─────────────────────────────────────
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build with Tauri (release profile — minimal exe)
        run: pnpm build
```

Expected: Build section now installs Node, caches pnpm, installs deps, runs `pnpm build`

- [ ] **Step 4: Replace TODO package section with correct ZIP structure**

Find the TODO block marked "── TODO: скопіюй сюди файли ──" (around line 140).

Replace the TODO Copy-Item lines with:
```powershell
          # Copy files directly to root of ZIP (no subdirectory)
          Copy-Item "src-tauri\target\release\marka.exe" -Destination $packageDir
          Copy-Item "LICENSE" -Destination $packageDir
          Copy-Item "README.md" -Destination $packageDir
```

Also update the packageDir variable section. Find:
```powershell
          $packageDir = $appName
```

Change to:
```powershell
          $tempDir = $appName
          $packageDir = "."  # Files go directly to root for ZIP
```

Then update Compress-Archive line:
```powershell
          # First copy files to temp directory matching app name, then zip the temp dir
          if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
          New-Item -ItemType Directory -Force -Path $tempDir | Out-Null
          Copy-Item "src-tauri\target\release\marka.exe" -Destination $tempDir
          Copy-Item "LICENSE" -Destination $tempDir
          Copy-Item "README.md" -Destination $tempDir

          Compress-Archive -Path $tempDir -DestinationPath $zipName -Force
```

Expected: ZIP will contain marka.exe, LICENSE, README.md at root (no subdirectory)

- [ ] **Step 5: Verify workflow structure**

Open `.github/workflows/release.yml` in editor and check:
- ✅ Triggers: `push.tags: 'v*'` and `workflow_dispatch` with inputs
- ✅ Runs on: `windows-latest`
- ✅ Node.js setup with pnpm cache
- ✅ `pnpm build` command
- ✅ PowerShell package step with file copy
- ✅ `softprops/action-gh-release@v2` with `generate_release_notes: true`
- ✅ Pre-release detection: tag suffix + manual flag
- ✅ `peter-evans/repository-dispatch@v3` with condition to skip pre-release

Expected: All sections present and correctly structured

- [ ] **Step 6: Commit**

```bash
cd c:\dev\marka
git add .github/workflows/release.yml
git commit -m "ci: add release workflow (GitHub Actions)

- Triggers: tag push (v*) + manual workflow_dispatch
- Builds: Node.js + pnpm + Tauri release profile (minimal exe)
- Packages: marka-VERSION-windows-x64.zip with exe+LICENSE+README.md
- Publishes: GitHub Release with auto-generated notes
- Dispatches: update-marka event to scoop-bucket (stable releases only)
- Pre-release: tags with -alpha/-beta/-rc skip Scoop update

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

Expected: Commit created with message

---

## Task 2: Create SCOOP_BUCKET_TOKEN Fine-Grained PAT

**Files:** None (GitHub Settings only)

### Steps

- [ ] **Step 1: Navigate to GitHub token creation page**

1. Open GitHub → click avatar → **Settings**
2. Left sidebar → scroll → **Developer settings**
3. **Personal access tokens** → **Fine-grained tokens**
4. Click **Generate new token**

Expected: GitHub token creation form opens

- [ ] **Step 2: Fill token form**

| Field | Value |
|-------|-------|
| Token name | `scoop-bucket-dispatch` |
| Expiration | 1 year |
| Resource owner | `ruslan-rv-ua` |
| Repository access | **Only select repositories** → select `scoop-bucket` |

In **Repository permissions** section:
- **Contents**: Read and write
- Leave all others as "No access"

Expected: Form filled with correct permissions

- [ ] **Step 3: Generate and copy token**

Click **Generate token** button.

GitHub displays: `github_pat_...` (long string)

⚠️ **CRITICAL**: Copy this token **now**. It will not be shown again.

```bash
# Paste into clipboard (on Windows, or use your password manager)
# Example (DO NOT USE THIS): github_pat_11ABC123XYZ456...
```

Expected: Token value copied to clipboard/password manager

---

## Task 3: Add SCOOP_BUCKET_TOKEN Secret to Marka Repo

**Files:** None (GitHub Settings only)

### Steps

- [ ] **Step 1: Navigate to marka repo secrets**

1. Open GitHub → go to **ruslan-rv-ua/marka**
2. **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

Expected: GitHub secret creation form opens

- [ ] **Step 2: Add secret**

| Field | Value |
|-------|-------|
| Name | `SCOOP_BUCKET_TOKEN` |
| Secret | Paste the token from Task 2 Step 3 |

Click **Add secret**

Expected: Secret `SCOOP_BUCKET_TOKEN` listed under "Repository secrets"

- [ ] **Step 3: Verify secret in release.yml**

The workflow already has:
```yaml
uses: peter-evans/repository-dispatch@v3
with:
  token: ${{ secrets.SCOOP_BUCKET_TOKEN }}
```

Open marka `.github/workflows/release.yml` and confirm the token reference.

Expected: `${{ secrets.SCOOP_BUCKET_TOKEN }}` is present in the `Update Scoop bucket` step

---

## Task 4: Create marka.json Manifest in Scoop-Bucket

**Files:**
- Create: `scoop-bucket/bucket/marka.json`

### Steps

- [ ] **Step 1: Create manifest file structure**

Create file `c:\dev\scoop-bucket\bucket\marka.json` with content:

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
      "hash": "placeholder_will_be_auto_updated"
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

Expected: File created at `scoop-bucket/bucket/marka.json` with valid JSON

- [ ] **Step 2: Validate JSON syntax**

```bash
cd c:\dev\scoop-bucket
cat bucket/marka.json | jq . > /dev/null && echo "JSON valid" || echo "JSON invalid"
```

Expected: Output: `JSON valid`

- [ ] **Step 3: Verify manifest structure (if scoop is available locally)**

If you have Scoop installed:
```bash
scoop info marka 2>&1 | head -20
```

Expected: No JSON parsing errors (manifest structure is correct)

Or skip if Scoop not installed — GitHub CI will validate on first release.

- [ ] **Step 4: Commit**

```bash
cd c:\dev\scoop-bucket
git add bucket/marka.json
git commit -m "add: marka Scoop manifest

- Version: 0.1.0
- Portable single-file app + settings.json
- Desktop shortcut via Scoop
- Keyboard shortcuts documented in installation notes
- Auto-update pattern configured for future releases

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

Expected: Commit created with message

---

## Task 5: Test Alpha Release (No Scoop Update)

**Files:** None (test via GitHub Actions)

### Steps

- [ ] **Step 1: Push alpha tag from marka repo**

```bash
cd c:\dev\marka
git tag v0.1.0-alpha
git push origin v0.1.0-alpha
```

Expected: Tag pushed to GitHub

- [ ] **Step 2: Monitor GitHub Actions**

1. Open **ruslan-rv-ua/marka** → **Actions**
2. Look for workflow run "Release"
3. Watch the build progress

Expected: Workflow triggered automatically

- [ ] **Step 3: Verify GitHub Release created**

1. Go to **ruslan-rv-ua/marka** → **Releases**
2. Should see `v0.1.0-alpha` release
3. Check: ZIP and SHA256 files attached
4. Check: marked as "Pre-release" ✓

Expected: Pre-release published with artifacts

- [ ] **Step 4: Verify Scoop bucket NOT updated**

1. Open **ruslan-rv-ua/scoop-bucket** → **Actions**
2. Should NOT see a run of "Update Scoop manifest"

Expected: Scoop workflow was skipped (pre-release condition worked)

- [ ] **Step 5: Delete alpha tag**

```bash
cd c:\dev\marka
git tag -d v0.1.0-alpha
git push origin --delete v0.1.0-alpha
```

Expected: Alpha tag cleaned up for next test

---

## Task 6: Test Stable Release (With Scoop Update)

**Files:** None (test via GitHub Actions)

### Steps

- [ ] **Step 1: Push stable tag from marka repo**

```bash
cd c:\dev\marka
git tag v0.1.0
git push origin v0.1.0
```

Expected: Tag pushed to GitHub

- [ ] **Step 2: Monitor marka GitHub Actions**

1. Open **ruslan-rv-ua/marka** → **Actions**
2. Watch "Release" workflow
3. Verify build completes (5-10 minutes, first run may be slower)

Expected: Workflow completes successfully

- [ ] **Step 3: Verify marka GitHub Release**

1. **ruslan-rv-ua/marka** → **Releases**
2. Should see `v0.1.0` release
3. Check: NOT marked as "Pre-release" ✓
4. Check: marka-0.1.0-windows-x64.zip attached
5. Check: marka-0.1.0-windows-x64.zip.sha256 attached

Expected: Stable release published with correct artifacts

- [ ] **Step 4: Monitor scoop-bucket GitHub Actions (wait ~2 min)**

1. Open **ruslan-rv-ua/scoop-bucket** → **Actions**
2. Look for "Update Scoop manifest" workflow run
3. Watch it complete

Expected: Workflow automatically triggered by repository_dispatch from marka

- [ ] **Step 5: Verify scoop-bucket/bucket/marka.json updated**

1. Open **ruslan-rv-ua/scoop-bucket** → **bucket/marka.json**
2. Check fields:
   - `"version": "0.1.0"` ✓
   - `"url": "...releases/download/v0.1.0/marka-0.1.0-windows-x64.zip"` ✓
   - `"hash": "actual_sha256_value"` ✓ (not placeholder)

Expected: Manifest auto-updated with correct version, URL, and hash

- [ ] **Step 6: Verify scoop-bucket ci.yml passed**

1. **ruslan-rv-ua/scoop-bucket** → **Actions** → **Validate Manifests** (or similar)
2. Should be passing (green checkmark)

Expected: CI validation passed, manifest structure is correct

- [ ] **Step 7: Verify installation works (optional, local only)**

If Scoop is installed locally:
```bash
scoop bucket add ruslan-rv-ua https://github.com/ruslan-rv-ua/scoop-bucket
scoop install marka

# Test app runs
marka.exe --help
```

Or skip if Scoop not installed locally — CI already verified structure.

Expected: App installs and runs without errors

---

## Task 7: Test Manual Workflow Dispatch

**Files:** None (test via GitHub UI)

### Steps

- [ ] **Step 1: Trigger manual release from GitHub UI**

1. **ruslan-rv-ua/marka** → **Actions**
2. Find **Release** workflow
3. Click **Run workflow** dropdown
4. Fill in:
   - **version**: `0.1.1`
   - **prerelease**: unchecked (stable)
5. Click **Run workflow**

Expected: Workflow triggered manually

- [ ] **Step 2: Monitor build**

1. Watch workflow progress in Actions
2. Should build version 0.1.1

Expected: Build completes successfully

- [ ] **Step 3: Verify release published**

1. **ruslan-rv-ua/marka** → **Releases**
2. Should see `0.1.1` release (not tagged, created via workflow_dispatch)

Expected: Release published with correct version

- [ ] **Step 4: Clean up test releases**

Delete test releases `v0.1.0-alpha` and `0.1.1` from GitHub to avoid cluttering production releases.

Expected: Only planned releases remain

---

## Task 8: Documentation & Handoff

**Files:**
- Modify: `c:\dev\marka\CLAUDE.md` (add CI/CD section)

### Steps

- [ ] **Step 1: Add CI/CD section to CLAUDE.md**

Open `c:\dev\marka\CLAUDE.md` and add before "## Git Workflow" section:

```markdown
## Release & CI/CD

**Automated Release Process:**
- Tag: `git tag v0.1.0 && git push --tags`
- Workflow: `.github/workflows/release.yml` (triggers automatically)
- Output: GitHub Release + ZIP + SHA256 + Scoop bucket update

**Manual Trigger (if automation fails):**
- GitHub → Actions → Release → Run workflow
- Enter version (e.g., `0.1.1`) and optional pre-release flag

**Pre-release Tags:**
- `v0.1.0-alpha`, `v0.1.0-beta`, `v0.1.0-rc` → GitHub Release only
- No Scoop update for pre-releases (stable bucket only)

**Version Sync Required:**
When bumping version, update all three files to same value:
- `package.json` → `"version"`
- `src-tauri/tauri.conf.json` → `"version"`
- `src-tauri/Cargo.toml` → `version =`

Then: `git tag v{version} && git push --tags`

**Scoop Integration:**
- Manifest: `scoop-bucket/bucket/marka.json`
- Auto-updated by `update-scoop-manifest.yml` on each stable release
- Token: `SCOOP_BUCKET_TOKEN` (GitHub secret, stored in Actions)
```

Expected: Section added to CLAUDE.md

- [ ] **Step 2: Commit documentation update**

```bash
cd c:\dev\marka
git add CLAUDE.md
git commit -m "docs: add CI/CD release process documentation

- Automated tag-push release workflow
- Manual workflow_dispatch fallback
- Pre-release tagging strategy
- Version sync requirements
- Scoop bucket integration

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

Expected: Commit created

- [ ] **Step 3: Create quick reference for future releases**

Add to project notes (optional, can be in memory or README):

```
QUICK REFERENCE: Releasing Marka

1. Update versions in:
   - package.json
   - src-tauri/tauri.conf.json
   - src-tauri/Cargo.toml
   (all to same value, e.g., 0.1.1)

2. Commit version bump:
   git commit -am "bump: version 0.1.1"

3. Create & push tag:
   git tag v0.1.1
   git push origin v0.1.1

4. Watch GitHub Actions:
   github.com/ruslan-rv-ua/marka/actions
   → Release workflow runs automatically
   → Publishes GitHub Release
   → Scoop bucket auto-updates (if stable release)

5. Verify:
   - GitHub Release has ZIP + SHA256
   - scoop-bucket/bucket/marka.json updated with new version
```

Expected: Quick reference created for future use

---

## Summary

| Task | Outcome |
|------|---------|
| 1. release.yml | GitHub Actions workflow configured for build, package, publish, dispatch |
| 2. SCOOP_BUCKET_TOKEN PAT | Fine-grained token created with scoop-bucket write access |
| 3. Token Secret | Secret stored in marka repo GitHub Settings |
| 4. marka.json Manifest | Scoop manifest created with version, URL, hash, persist settings |
| 5. Alpha Test | Pre-release tag verified (GitHub Release, Scoop skipped) |
| 6. Stable Test | Production release verified (GitHub Release + Scoop update) |
| 7. Manual Test | workflow_dispatch fallback verified |
| 8. Documentation | CLAUDE.md updated with release process |

---

## Next Steps (Post-Implementation)

Once this plan is implemented:

1. **First production release:** Tag `v0.1.0`, verify full pipeline
2. **Scoop users:** Can install with `scoop bucket add ruslan-rv-ua https://github.com/ruslan-rv-ua/scoop-bucket && scoop install marka`
3. **Future updates:** `scoop update marka` fetches latest from bucket
4. **Version bumps:** Always update 3 files + tag + push (workflow handles rest)

---

## References

- **Spec**: `docs/superpowers/specs/2026-03-21-ci-cd-release-scoop.md`
- **Release template**: `scoop-bucket/examples/release-template.yml`
- **Scoop bucket DEVELOPMENT guide**: `scoop-bucket/DEVELOPMENT.md`
- **Release workflow state diagrams**: See spec document
