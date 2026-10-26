import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import test from 'node:test';

function fakeIndexedDB() {
  const storage = new Map();
  const db = {
    objectStoreNames: { contains: (name) => name === 'vault' && db.created },
    created: false,
    createObjectStore: () => { db.created = true; },
    close() {},
    transaction(_name, access) {
      const tx = {
        objectStore() {
          return {
            put(value, key) {
              assert.equal(access, 'readwrite');
              storage.set(key, value);
              setTimeout(() => tx.oncomplete?.(), 0);
              return {};
            },
            clear() {
              storage.clear();
              setTimeout(() => tx.oncomplete?.(), 0);
              return {};
            },
            get(key) {
              const req = {};
              setTimeout(() => { req.result = storage.get(key); req.onsuccess?.(); }, 0);
              return req;
            }
          };
        }
      };
      return tx;
    }
  };
  return {
    storage,
    open() {
      const req = {};
      setTimeout(() => {
        req.result = db;
        if (!db.created) req.onupgradeneeded?.();
        req.onsuccess?.();
      }, 0);
      return req;
    }
  };
}

const root = fileURLToPath(new URL('../', import.meta.url));
const source = readFileSync(join(root, 'assets/device.js'), 'utf8');

function createDevice() {
  const indexedDB = fakeIndexedDB();
  const context = vm.createContext({
    indexedDB,
    crypto: webcrypto,
    TextEncoder,
    TextDecoder,
    Uint8Array,
    Date,
    console,
    setTimeout
  });
  vm.runInContext(source, context);
  return { context, indexedDB };
}

test('Trusted-device opt in restores correct passphrase without storing a raw string', async () => {
  const { context, indexedDB } = createDevice();
  await vm.runInContext("rememberUnlockOnDevice('an-example-very-long-passphrase', 'yckta', 'momentum-data')", context);
  const key = indexedDB.storage.get('deviceKey');
  assert.equal(key.extractable, false);
  assert.deepEqual(key.usages, ['encrypt', 'decrypt']);
  const envelope = indexedDB.storage.get('envelope');
  assert.equal(envelope.version, 1);
  assert.ok(!JSON.stringify(envelope).includes('passphrase'));
  assert.equal(await vm.runInContext("restoreRememberedUnlock('yckta','momentum-data')", context), 'an-example-very-long-passphrase');
  await assert.rejects(vm.runInContext("restoreRememberedUnlock('yckta','wrong-repo')", context));
});

test('Forgetting device removes key and passphrase and prevents auto unlock', async () => {
  const { context, indexedDB } = createDevice();
  await vm.runInContext("rememberUnlockOnDevice('passphrase', 'yckta', 'momentum-data')", context);
  await vm.runInContext('forgetRememberedUnlock()', context);
  assert.equal(indexedDB.storage.size, 0);
  await assert.rejects(vm.runInContext("restoreRememberedUnlock('yckta','momentum-data')", context));
});

test('Tampering with the remembered device payload prevents its decryption', async () => {
  const { context, indexedDB } = createDevice();
  await vm.runInContext("rememberUnlockOnDevice('passphrase', 'yckta', 'momentum-data')", context);
  const envelope = indexedDB.storage.get('envelope');
  envelope.ciphertext[0] ^= 1;
  await assert.rejects(vm.runInContext("restoreRememberedUnlock('yckta','momentum-data')", context));
});
