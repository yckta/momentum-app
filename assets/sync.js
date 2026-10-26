// GitHub private-repository sync. All data is encrypted client-side with AES-GCM.
const enc = new TextEncoder(), dec = new TextDecoder();
function bytesToB64(bytes) { let out = ''; for (let i = 0; i < bytes.length; i += 16384)out += String.fromCharCode(...bytes.subarray(i, i + 16384)); return btoa(out) }
function b64ToBytes(str) { const b = atob(str.replace(/\s/g, '')); const out = new Uint8Array(b.length); for (let i = 0; i < b.length; i++)out[i] = b.charCodeAt(i); return out }
async function deriveKey(pass, salt) { const key = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']); return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 180000, hash: 'SHA-256' }, key, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']) }
async function encryptText(pass, text, purpose) { const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), key = await deriveKey(pass, salt); const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode('momentum-v3:' + purpose) }, key, enc.encode(text)); return { v: 1, kdf: 'PBKDF2-SHA256', iterations: 180000, cipher: 'AES-256-GCM', salt: bytesToB64(salt), iv: bytesToB64(iv), ciphertext: bytesToB64(new Uint8Array(ciphertext)) } }
async function decryptText(pass, packet, purpose) { if (!packet || packet.v !== 1 || packet.iterations !== 180000) throw Error('فرمت فایل رمزگذاری‌شده معتبر نیست'); try { const key = await deriveKey(pass, b64ToBytes(packet.salt)); const bytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(packet.iv), additionalData: enc.encode('momentum-v3:' + purpose) }, key, b64ToBytes(packet.ciphertext)); return dec.decode(bytes) } catch { throw Error('عبارت عبور نادرست است یا دادهٔ رمزگذاری‌شده آسیب دیده است') } }
function setCloudMsg(msg) { cloudMessage = String(msg); const el = document.getElementById('cloudMessage'); if (el) el.textContent = cloudMessage }
function gitConfigFromForm() { const owner = document.getElementById('gitOwner')?.value.trim(), repo = document.getElementById('gitRepo')?.value.trim(), token = document.getElementById('gitToken')?.value.trim(), pass = document.getElementById('gitPass')?.value || ''; if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/.test(owner || '')) throw Error('نام کاربری GitHub معتبر نیست'); if (!/^[a-zA-Z0-9_.-]{1,100}$/.test(repo || '')) throw Error('نام مخزن معتبر نیست'); if (pass.length < 10) throw Error('عبارت عبور حداقل ۱۰ نویسه داشته باشد'); return { owner, repo, token, pass } }
function gitApiUrl(path) { return `https://api.github.com/repos/${encodeURIComponent(syncConf.owner)}/${encodeURIComponent(syncConf.repo)}${path}` }
async function gitApi(url, opts = {}) {  
if (!gitToken) throw Error('ابتدا اتصال خصوصی را باز کن'); let response; try { response = await fetch(url, { ...opts, cache: 'no-store', headers: { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + gitToken, 'X-GitHub-Api-Version': '2022-11-28', ...(opts.headers || {}) } }) } catch { throw Error('اتصال به API گیت‌هاب برقرار نشد. اینترنت یا دسترسی شبکه را بررسی کن.') }
  if (response.status === 401) throw Error('توکن نامعتبر یا منقضی شده است'); if (response.status === 403) throw Error('دسترسی رد شد؛ مجوز Contents یا محدودیت دسترسی به API را بررسی کن'); if (response.status === 404) return { missing: true }; if (!response.ok) { let problem = ''; try { problem = (await response.json()).message || '' } catch { } throw Error(`خطای GitHub (${response.status}): ${problem}`) } return { value: await response.json() }
}
async function verifyPrivateRepo() { if (repoPrivateConfirmed) return; const res = await gitApi(gitApiUrl('')); if (res.missing) throw Error('مخزن داده پیدا نشد. آن را Private بساز و مجوز توکن را بررسی کن'); if (!res.value.private) throw Error('این مخزن عمومی است! برای حفاظت از برنامهٔ شخصی، مخزن جداگانهٔ Private بساز'); repoPrivateConfirmed = true }
async function gitRead() { const res = await gitApi(gitApiUrl('/contents/momentum.enc.json')); if (res.missing) return null; const file = res.value; if (!file.sha || !file.content) throw Error('فایل ذخیره‌شده معتبر نیست یا بیش از حد بزرگ است'); const json = dec.decode(b64ToBytes(file.content)); let encrypted; try { encrypted = JSON.parse(json) } catch { throw Error('ساختار فایل خصوصی خراب است') } return { sha: file.sha, packet: encrypted } }
async function gitWrite(snapshot, sha) { const envelope = await encryptText(gitPassword, JSON.stringify(snapshot), 'data'); const body = { message: 'Sync Momentum encrypted tasks', content: bytesToB64(enc.encode(JSON.stringify(envelope))), ...(sha ? { sha } : {}) }; const res = await gitApi(gitApiUrl('/contents/momentum.enc.json'), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (res.missing) throw Error('مخزن قابل نوشتن نیست؛ مجوز Contents: Read and write لازم است'); return res.value.content?.sha }
function saveSyncState(sha, dirty) { repoSha = sha || null; syncConf.knownSha = repoSha; localStorage.setItem(CFGKEY, JSON.stringify(syncConf)); markGitDirty(dirty) }
// Remembering a device is an explicit opt-in. Even a non-extractable key can
// be used by scripts running on this origin, so this is appropriate only for
// the user's own screen-locked devices, not a shared computer.
async function applyRememberChoice(shouldRemember, pass) {
  if (shouldRemember) {
    if (!cloudReady || !gitToken || !pass) throw Error('ابتدا اتصال را با عبارت عبور باز کن');
    // Remembering login is a separate operation from a data-sync attempt.
    // A temporary sync error or an existing sync conflict must not silently
    // discard the user's trusted-device preference. Verify that the chosen
    // data repository really is private before storing a reusable credential.
    await verifyPrivateRepo();
    await rememberUnlockOnDevice(pass, syncConf.owner, syncConf.repo);
    syncConf.rememberDevice = true;
    delete syncConf.autoUnlockError;
    localStorage.setItem(CFGKEY, JSON.stringify(syncConf));
    return;
  }
  // Revoke only this browser's ability to unlock automatically; do not touch
  // the data repository or the user's locally encrypted GitHub access token.
  if (syncConf.rememberDevice) await forgetRememberedUnlock();
  syncConf.rememberDevice = false;
  delete syncConf.autoUnlockError;
  localStorage.setItem(CFGKEY, JSON.stringify(syncConf));
}

async function setRememberPreference(shouldRemember, pass) {
  try {
    await applyRememberChoice(shouldRemember, pass);
    render();
    toast(shouldRemember ? 'ورود خودکار روی این دستگاه ذخیره شد' : 'ورود خودکار خاموش شد');
    return true;
  } catch (error) {
    // Keep the previously persisted state and make the problem visible.
    syncConf.autoUnlockError = error?.message || 'خطای نامشخص هنگام ذخیره';
    localStorage.setItem(CFGKEY, JSON.stringify(syncConf));
    render();
    setCloudMsg('ورود خودکار ذخیره نشد: ' + syncConf.autoUnlockError);
    toast('ورود خودکار ذخیره نشد؛ پیام تنظیمات را بررسی کن');
    return false;
  }
}

async function onRememberDeviceToggle(shouldRemember) {
  if (!cloudReady || !gitPassword) {
    if (shouldRemember) setCloudMsg('برای فعال‌کردن ورود خودکار، عبارت عبور را وارد کن و «باز کردن اتصال» را بزن.');
    else setCloudMsg('برای خاموش‌کردن ورود خودکار، اتصال را باز کن یا از دکمهٔ حذف ورود خودکار استفاده کن.');
    return;
  }
  // Once the connection is open, the preference is saved immediately when
  // the checkbox changes. An additional "Save connection" click is not needed.
  await setRememberPreference(shouldRemember, gitPassword);
}

async function saveCloudSettings() {
  try {
    const remember = !!document.getElementById('rememberDevice')?.checked;
    const { owner, repo, token, pass } = gitConfigFromForm();
    let tokenBox = syncConf.tokenBox;
    if (token) {
      if (token.length < 20) throw Error('توکن GitHub ناقص به نظر می‌رسد');
      tokenBox = await encryptText(pass, token, 'token');
    } else if (tokenBox) {
      await decryptText(pass, tokenBox, 'token');
    } else throw Error('اول توکن Fine-grained مخصوص مخزن خصوصی را وارد کن');
    const changed = owner !== syncConf.owner || repo !== syncConf.repo;
    syncConf = { ...syncConf, owner, repo, tokenBox, knownSha: changed ? null : repoSha };
    localStorage.setItem(CFGKEY, JSON.stringify(syncConf));
    if (changed) { repoSha = null; repoPrivateConfirmed = false; markGitDirty(!data.pristine); }
    gitToken = await decryptText(pass, tokenBox, 'token');
    gitPassword = pass;
    cloudReady = true;
    cloudSyncOk = false;
    setCloudMsg('در حال بررسی دسترسی به مخزن خصوصی…');
    await syncLatest();
    // Even when the latest data sync reports a conflict or temporary error,
    // persist trusted-device opt-in independently, with an explicit result.
    await setRememberPreference(remember, pass);
    if (cloudSyncOk) toast('همگام‌سازی خصوصی فعال شد');
  } catch (e) {
    cloudSyncOk = false;
    setCloudMsg(e.message || 'اتصال ناموفق');
    toast(e.message || 'اتصال ناموفق');
    refreshStorageBadge();
  }
}

async function cloudLogin() {
  try {
    if (!syncConf.tokenBox) throw Error('اول تنظیمات اتصال را ذخیره کن');
    const pass = document.getElementById('gitPass')?.value || '';
    const remember = !!document.getElementById('rememberDevice')?.checked;
    if (pass.length < 10) throw Error('عبارت عبور رمزگذاری را وارد کن');
    gitToken = await decryptText(pass, syncConf.tokenBox, 'token');
    gitPassword = pass;
    cloudReady = true;
    cloudSyncOk = false;
    await syncLatest();
    await setRememberPreference(remember, pass);
    if (cloudSyncOk) toast('اتصال خصوصی باز شد');
  } catch (e) {
    setCloudMsg(e.message || 'اتصال ناموفق');
    toast(e.message || 'اتصال ناموفق');
    refreshStorageBadge();
  }
}

async function initializeRememberedDevice() {
  if (!syncConf.rememberDevice || !syncConf.tokenBox) return;
  try {
    const pass = await restoreRememberedUnlock(syncConf.owner, syncConf.repo);
    gitToken = await decryptText(pass, syncConf.tokenBox, 'token');
    gitPassword = pass;
    cloudReady = true;
    cloudSyncOk = false;
    delete syncConf.autoUnlockError;
    localStorage.setItem(CFGKEY, JSON.stringify(syncConf));
    render();
    // Network failure does not revoke the trusted device: local tasks remain
    // available and synchronization retries on focus / visibility / interval.
    await syncLatest();
  } catch (error) {
    gitToken = '';
    gitPassword = '';
    cloudReady = false;
    cloudSyncOk = false;
    // Retain the encrypted vault on transient IndexedDB errors. Previously
    // a failed restore permanently deleted the stored credential without
    // telling the user what went wrong.
    syncConf.autoUnlockError = error?.message || 'خطای خواندن حافظهٔ دستگاه';
    localStorage.setItem(CFGKEY, JSON.stringify(syncConf));
    render();
    setCloudMsg('ورود خودکار انجام نشد: ' + syncConf.autoUnlockError + '؛ با عبارت عبور اتصال را باز کن.');
  }
}

async function disableRememberedDevice() {
  const disabled = await setRememberPreference(false, gitPassword);
  if (disabled) setCloudMsg('ورود خودکار این دستگاه حذف شد. اتصال فعلی تا قفل‌شدن برنامه باز می‌ماند.');
}

async function syncLatest() {  
if (!cloudReady || !gitPassword || busySync || syncConflict) return; busySync = true; try {    
await verifyPrivateRepo(); const file = await gitRead(); if (!file) { const snapshot = JSON.parse(JSON.stringify(data)), stamp = data.lastModified; const newSha = await gitWrite(snapshot, null); if (!newSha) throw Error('GitHub SHA برنگرداند'); saveSyncState(newSha, data.lastModified !== stamp); cloudSyncOk = !gitDirty; if (gitDirty) scheduleUpload(); setCloudMsg('فایل خصوصی رمزگذاری‌شده ایجاد شد.'); }
    else if (!repoSha && !data.pristine || repoSha && file.sha !== repoSha && gitDirty) { syncConflict = true; cloudSyncOk = false; setCloudMsg('تعارض شناسایی شد: هم در این دستگاه و هم در مخزن داده وجود دارد. ابتدا خروجی پشتیبان بگیر، سپس از دکمه‌های جایگزینی استفاده کن.'); toast('تعارض داده‌ها؛ بازنویسی خودکار متوقف شد'); }
    else if (!repoSha || file.sha !== repoSha) { const remote = normalize(JSON.parse(await decryptText(gitPassword, file.packet, 'data'))); data = remote; localStorage.setItem(DBKEY, JSON.stringify(data)); saveSyncState(file.sha, false); syncConflict = false; cloudSyncOk = true; render(); setCloudMsg('آخرین اطلاعات رمزگذاری‌شده از مخزن خصوصی دریافت شد.'); }
    else if (gitDirty) { const snapshot = JSON.parse(JSON.stringify(data)), stamp = data.lastModified; const newSha = await gitWrite(snapshot, file.sha); if (!newSha) throw Error('شناسهٔ فایل جدید دریافت نشد'); saveSyncState(newSha, data.lastModified !== stamp); cloudSyncOk = !gitDirty; if (gitDirty) scheduleUpload(); setCloudMsg('تغییرات روی GitHub خصوصی ثبت شد.'); }
    else { cloudSyncOk = true; setCloudMsg('اطلاعات با مخزن خصوصی هماهنگ‌اند.'); }
    refreshStorageBadge();  
} catch (e) { cloudSyncOk = false; refreshStorageBadge(); setCloudMsg('خطای همگام‌سازی: ' + (e.message || e)); toast('همگام‌سازی ناموفق؛ اطلاعات این دستگاه حفظ شده است') } finally { busySync = false }
}
function scheduleUpload() { clearTimeout(syncTimer); syncTimer = setTimeout(() => syncLatest(), 1500) }
async function cloudLogout() { await disableRememberedDevice(); cloudReady = false; cloudSyncOk = false; gitToken = ''; gitPassword = ''; repoPrivateConfirmed = false; clearTimeout(syncTimer); render(); toast('اتصال قفل شد؛ برای ورود دوباره عبارت عبور لازم است') }
async function forceCloudDownload() { if (!cloudReady) { toast('اول اتصال را باز کن'); return } if (!confirm('اطلاعات این دستگاه با نسخهٔ ابری جایگزین می‌شود. اول یک فایل پشتیبان گرفته می‌شود. ادامه می‌دهی؟')) return; downloadBackup(); try { await verifyPrivateRepo(); const file = await gitRead(); if (!file) throw Error('هنوز فایلی روی مخزن داده نیست'); const remote = normalize(JSON.parse(await decryptText(gitPassword, file.packet, 'data'))); data = remote; localStorage.setItem(DBKEY, JSON.stringify(data)); saveSyncState(file.sha, false); syncConflict = false; cloudSyncOk = true; render(); toast('داده‌های ابری جایگزین شدند') } catch (e) { setCloudMsg(e.message); toast(e.message) } }
async function forceCloudUpload() { if (!cloudReady) { toast('اول اتصال را باز کن'); return } if (!confirm('هشدار: نسخهٔ ابری با اطلاعات همین دستگاه بازنویسی خواهد شد. مطمئنی؟')) return; downloadBackup(); try { await verifyPrivateRepo(); const file = await gitRead(); const snapshot = JSON.parse(JSON.stringify(data)), stamp = data.lastModified; const sha = await gitWrite(snapshot, file?.sha || null); saveSyncState(sha, data.lastModified !== stamp); syncConflict = false; cloudSyncOk = !gitDirty; render(); toast('نسخهٔ محلی روی ابر جایگزین شد') } catch (e) { setCloudMsg(e.message); toast(e.message) } }
