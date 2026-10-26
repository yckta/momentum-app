import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const file = (name) => readFileSync(join(root, name), 'utf8');

test('GitHub Pages entry point and static assets exist', () => {
  const index = file('index.html');
  for (const path of ['assets/core.js', 'assets/ui.js', 'assets/sync.js', 'assets/device.js', 'assets/app.js', 'assets/styles.css', 'sw.js', 'manifest.webmanifest']) {
    assert.equal(existsSync(join(root, path)), true, `${path} is missing`);
  }
  assert.match(index, /<html lang="fa" dir="rtl">/);
  assert.match(index, /Content-Security-Policy/);
  assert.doesNotMatch(index, /<script(?![^>]*src=)/i);
});

test('No secrets or private starter tasks are published', () => {
  const files = ['index.html', 'assets/core.js', 'assets/ui.js', 'assets/sync.js', 'assets/device.js', 'assets/app.js', 'README.md'];
  const content = files.map(file).join('\n');
  assert.doesNotMatch(content, /github_pat_[A-Za-z0-9_]{25,}|ghp_[A-Za-z0-9]{30,}/);
  assert.doesNotMatch(content, /PRIVATE-IMPORT-Momentum/);
  assert.doesNotMatch(content, /supabase\.co\/auth\/v1\/token/);
});

test('Synced data requires private repository and encryption', () => {
  const sync = file('assets/sync.js');
  assert.match(sync, /verifyPrivateRepo/);
  assert.match(sync, /AES-GCM/);
  assert.match(sync, /PBKDF2/);
  assert.match(sync, /tokenBox/);
  assert.match(sync, /syncConflict/);
  assert.match(sync, /initializeRememberedDevice/);
  assert.match(file('assets/device.js'), /extractable.*false|false, \['encrypt', 'decrypt'\]/);
});
