/*
 * Optional trusted-device unlock. This is convenience, NOT hardware-backed
 * authentication: any script running with the app origin can ask IndexedDB
 * for the CryptoKey and decrypt the stored passphrase. Never enable on shared
 * devices. No raw token or passphrase is intentionally written to storage.
 */
const DEVICE_DB = 'momentum-device-v1';
const DEVICE_STORE = 'vault';
const REMEMBER_FOR_MS = 30 * 24 * 60 * 60 * 1000;
const DEVICE_ASSOCIATED_DATA = new TextEncoder().encode('momentum:trusted-device:v1');

function openDeviceVault() {
  if (!globalThis.indexedDB || !globalThis.crypto?.subtle) {
    return Promise.reject(new Error('مرورگر از ذخیرهٔ امن‌تر ورود خودکار پشتیبانی نمی‌کند'));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DEVICE_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DEVICE_STORE)) db.createObjectStore(DEVICE_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('بازکردن حافظهٔ دستگاه ناموفق بود'));
    request.onblocked = () => reject(new Error('حافظهٔ دستگاه توسط پنجرهٔ دیگری قفل شده است'));
  });
}

async function deviceVaultGet(name) {
  const db = await openDeviceVault();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(DEVICE_STORE, 'readonly');
      const request = tx.objectStore(DEVICE_STORE).get(name);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      tx.onabort = () => reject(tx.error || new Error('خواندن حافظه ناموفق بود'));
    });
  } finally { db.close(); }
}

async function deviceVaultPut(key, envelope) {
  const db = await openDeviceVault();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(DEVICE_STORE, 'readwrite');
      tx.objectStore(DEVICE_STORE).put(key, 'deviceKey');
      tx.objectStore(DEVICE_STORE).put(envelope, 'envelope');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('ذخیره روی دستگاه ناموفق بود'));
      tx.onabort = () => reject(tx.error || new Error('ذخیره روی دستگاه لغو شد'));
    });
  } finally { db.close(); }
}

async function forgetRememberedUnlock() {
  // Erase the locally persisted device key AND encrypted passphrase. The
  // encrypted PAT stored in localStorage still needs the user's passphrase.
  const db = await openDeviceVault();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(DEVICE_STORE, 'readwrite');
      tx.objectStore(DEVICE_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('حذف کلید دستگاه ناموفق بود'));
      tx.onabort = () => reject(tx.error || new Error('حذف کلید دستگاه لغو شد'));
    });
  } finally { db.close(); }
}

async function rememberUnlockOnDevice(passphrase, owner, repo) {
  if (!passphrase || !owner || !repo) throw new Error('تنظیمات ورود خودکار ناقص است');
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const record = {
    passphrase,
    owner,
    repo,
    expiresAt: Date.now() + REMEMBER_FOR_MS
  };
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: DEVICE_ASSOCIATED_DATA },
    key, new TextEncoder().encode(JSON.stringify(record))
  );
  // Non-extractable CryptoKey is preserved through IndexedDB structured clone.
  await deviceVaultPut(key, { version: 1, iv: Array.from(iv), ciphertext: Array.from(new Uint8Array(ciphertext)) });
}

async function restoreRememberedUnlock(owner, repo) {
  const [key, envelope] = await Promise.all([deviceVaultGet('deviceKey'), deviceVaultGet('envelope')]);
  if (!key || !envelope || envelope.version !== 1) throw new Error('اطلاعات ورود خودکار روی این دستگاه پیدا نشد');
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(envelope.iv), additionalData: DEVICE_ASSOCIATED_DATA },
    key, new Uint8Array(envelope.ciphertext)
  );
  const record = JSON.parse(new TextDecoder().decode(plain));
  if (record.owner !== owner || record.repo !== repo) throw new Error('مخزن اطلاعات این دستگاه تغییر کرده است');
  if (!record.expiresAt || Date.now() > record.expiresAt) throw new Error('اعتبار ورود خودکار تمام شده است؛ لطفاً دوباره فعال کن');
  if (!record.passphrase || typeof record.passphrase !== 'string') throw new Error('اطلاعات ورود خودکار نامعتبر است');
  return record.passphrase;
}
