# Security considerations

Momentum is a **single-user personal project**, not a professional security-audited credential vault.

## Public and private boundaries

- **Public:** GitHub Pages code, UI files, documentation, and static icons.
- **Private:** a distinct GitHub repository used only for `momentum.enc.json`.
- **Never publish:** GitHub PATs, encryption passphrases, plaintext backups, private notes, or personal academic schedules.

## Authentication & permissions

The app currently uses a fine-grained GitHub Personal Access Token (PAT), *not OAuth*. The token must be scoped to one **private data repository** with only `Contents: Read and write`. Consider using a short expiry and revoke the token immediately if exposed. Do not grant access to the public website repository.

The token is encrypted with a passphrase before storage in the browser. Both token and passphrase exist in browser memory while connected and could be exposed by malicious browser extensions, compromised devices, or XSS. Client-side-only token handling cannot provide the guarantees of a server-side OAuth flow.

## Encryption & data storage

- Cloud payload: PBKDF2-SHA256 (180,000 iterations, random 16-byte salt) and AES-256-GCM (fresh random 12-byte IV) via Web Crypto.
- The repository name, commit times, and file size remain visible to users with access to the private repository.
- Local tasks and daily data are stored **unencrypted** in `localStorage`; exported JSON backups are **unencrypted**.
- Losing the passphrase makes previously encrypted cloud data unrecoverable.
- Sensitive personal information should not be entered until an independent security review has been completed.

## Optional remembered device (30-day opt-in)

The GitHub token still uses its existing encryption-passphrase wrapper in localStorage. The optional **Remember this device** feature stores a copy of that encryption passphrase wrapped by a random, non-extractable AES-256-GCM key in IndexedDB. The key and its encrypted payload live **in the same browser origin and browser profile**. This is *not hardware-backed*, and a non-extractable key can still be used to decrypt by any JavaScript that runs under the origin. In particular, XSS, malicious extensions, and future compromised site deployments can access the decrypted passphrase while the app is open or can request decryption using the stored key. Use only on trusted, screen-locked devices.

- The remembered entry expires after 30 days; on expiry or decrypt failure, users must unlock manually and opt in again.
- The setting is device-specific. Safari, the iPhone Home Screen PWA and another browser profile may not share storage.
- **Disable automatic sign-in** removes the locally stored CryptoKey and encrypted passphrase. **Lock connection** does this and also clears in-memory credentials. It does not revoke the GitHub PAT; revoke it at GitHub if a device is lost or compromised.
- Browser storage eviction may remove the remembered entry and unencrypted task cache. Keep JSON backups in a safe private location.
- This design is a convenience feature for a single-user project. It should not be represented as secure device-bound authentication, Face ID authentication, or protection from local device compromise.

## Sync behavior

The GitHub Contents API is used with file SHA checks. The app detects some concurrent modifications and stops automatic overwrite when a conflict is observed. This is **not a full transactional sync engine**, and resolution can replace one side's data. Keep backups, avoid editing the same tasks concurrently, and verify the storage status.

## Web security

The app uses a restrictive Content Security Policy (CSP), plain DOM event handlers (no inline JS), escaping for user-provided text, and no third-party JavaScript dependencies. A future change to the public website's script files can nevertheless affect any browser that unlocks its token there: protect the public repository with two-factor authentication and code review.

## Reporting security issues

Do not file issues containing secrets. Revoke affected PATs and rotate the encryption passphrase after any suspected compromise. If personally identifying or academic schedule data has been committed to GitHub publicly, removing it from the latest revision alone is not sufficient to remove it from commit history.

## Trusted-device troubleshooting (V5.1)

The optional remember-me feature requires persistent IndexedDB and Web Crypto on a secure origin. The app verifies repository privacy before saving an unlock key. Network errors, IndexedDB private-browsing limits, and other failures are shown explicitly in Settings. Do not use private/incognito browsing for persistent auto-unlock. A script executing under the site's origin can use the stored non-extractable `CryptoKey`, so this feature must be enabled only on trusted personal devices.
