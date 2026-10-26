# Momentum

A personal, Persian-first, offline-capable student planner with Jalali dates and optional encrypted GitHub synchronization.

> **Personal-use preview:** The app is a static, client-side project. Its GitHub-token integration is designed for a single user, not as a multiuser authentication system or a security-audited production service.

## Features

- Add, edit, delete, complete, and schedule tasks independently of due dates.
- Daily/weekly recurring tasks, calendar events, XP, and progress indicators.
- Local storage in the browser; backup and restore via JSON export/import.
- Optional synchronization between devices through an **independent, private** GitHub repository.
- Data is encrypted on the client before upload (PBKDF2-SHA256 + AES-256-GCM).
- GitHub Pages deployment and installable PWA.

## Getting started

This site has **no build step and no runtime dependencies**. Deploy the contents of this directory to the **root of the public GitHub Pages repository**. The `index.html` entry point should be in the root. In repository settings, choose **Pages → Deploy from a branch → `main` → `/ (root)`**.

To run locally, use `python -m http.server 8080` and browse to http://localhost:8080. Some browser APIs require a secure context (GitHub Pages provides HTTPS).

## Structure

```text
index.html              HTML document and security policy
assets/styles.css       Interface styles
assets/core.js          Dates, task models, and local persistence
assets/ui.js            Rendering and form interactions
assets/sync.js          GitHub API, encryption, synchronization and conflict handling
assets/app.js           Event bindings and initialization
sw.js                   Offline app-shell cache
manifest.webmanifest    PWA metadata
SECURITY.md             Security assumptions and limitations
tests/                  Static integrity checks
.github/workflows/      Continuous integration
```

## Sync setup

1. Create a **separate private** GitHub repository, for example `momentum-data`, with a README.
2. Generate a **fine-grained personal access token** limited to *only that private repository*, with `Contents: Read and write` access.
3. On the live Momentum website, go to **Settings → GitHub private sync** and enter the owner, private repository, token, and a long **separate encryption passphrase**.
4. On another device, open the exact same live website, enter the same settings, and sync.
5. Confirm a new test task appears on both devices before relying on synchronization.

**Important:** Never put tokens, passphrases, personal backup JSON, or private notes in this public repository, issues, pull requests, screenshots, or commits.

## Caveats

- Changes are saved locally before attempting sync. Local browser storage is not a substitute for backups.
- The passphrase is needed again after page reload. The access token is stored locally **encrypted** with that passphrase, but entered tokens exist in browser memory while connected.
- Concurrent edits are **not merged**; conflicting changes require manual resolution.
- GitHub API connectivity may be restricted on some networks; sync only occurs when online and connected.
- Background push notifications are not implemented.
- **Plain JSON exports are not encrypted.** Store them privately.

See [SECURITY.md](SECURITY.md) for the complete threat model.

## Test

```bash
node --test tests/*.test.mjs
node --check assets/core.js
node --check assets/ui.js
node --check assets/sync.js
node --check assets/app.js
```

## Licensing

This public repository is not automatically open-source licensed. Choose and add an explicit license if you intend to allow reuse by others.
