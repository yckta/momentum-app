import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const get = (path) => readFileSync(join(root, path), 'utf8');

function makeContext() {
  const storage = new Map();
  const context = vm.createContext({
    crypto: webcrypto,
    TextEncoder,
    TextDecoder,
    Uint8Array,
    atob,
    btoa,
    Intl,
    Date,
    console,
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key)
    }
  });
  return context;
}

test('Jalali conversion preserves an example date and validates invalid days', () => {
  const context = makeContext();
  vm.runInContext(get('assets/core.js'), context);
  assert.equal(vm.runInContext("jalaliToISO('۱۴۰۵/۰۸/۰۴')", context), '2026-10-26');
  assert.equal(vm.runInContext("jalaliToISO('۱۴۰۵/۱۳/۰۴')", context), null);
  assert.equal(vm.runInContext("isoToJalali('2026-10-26')", context), '۱۴۰۵/۰۸/۰۴');
});

test('Encrypted cloud backup roundtrip and wrong-passphrase rejection', async () => {
  const context = makeContext();
  const sync = get('assets/sync.js');
  // Load only pure, top-of-file crypto helpers; avoid DOM and network code.
  const slice = sync.substring(sync.indexOf('const enc ='), sync.indexOf('function setCloudMsg('));
  assert.ok(slice.includes('encryptText'));
  vm.runInContext(slice, context);
  const packet = await vm.runInContext("encryptText('a sufficiently long encryption passphrase', '{\"tasks\":[]}', 'data')", context);
  context.testPacket = JSON.parse(JSON.stringify(packet));
  assert.equal(await vm.runInContext("decryptText('a sufficiently long encryption passphrase', testPacket, 'data')", context), '{"tasks":[]}');
  await assert.rejects(vm.runInContext("decryptText('wrong passphrase', testPacket, 'data')", context));
});
