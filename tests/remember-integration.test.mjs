import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import vm from 'node:vm';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = readFileSync(join(root, 'assets/sync.js'), 'utf8');
const script = source.substring(source.indexOf('async function applyRememberChoice('), source.indexOf('async function syncLatest()'));
function fixture({ connected = false, syncSucceeds = false } = {}) {
  const saved = new Map();
  const fields = {
    rememberDevice: { checked: true },
    gitPass: { value: 'a-very-long-example-passphrase' }
  };
  const events = { saved: [], rendered: 0, messages: [] };
  const state = {
    cloudReady: connected, cloudSyncOk: syncSucceeds, gitPassword: connected ? fields.gitPass.value : '',
    gitToken: connected ? 'fake-github-pat' : '', repoPrivateConfirmed: true, syncConflict: false,
    syncConf: { owner: 'yckta', repo: 'momentum-data', tokenBox: 'encrypted-token' },
    localStorage: { setItem(key, value) { saved.set(key, value); } },
    CFGKEY: 'cfg',
    document: { getElementById(id) { return fields[id] ?? null; } },
    render() { events.rendered++; }, toast(msg) { events.messages.push(msg); },
    async verifyPrivateRepo() { return true; },
    async rememberUnlockOnDevice(pass, owner, repo) { events.saved.push({ pass, owner, repo }); },
    async forgetRememberedUnlock() { events.saved.push({ removed: true }); },
    async decryptText() { return 'fake-github-pat'; },
    async syncLatest() { state.cloudSyncOk = syncSucceeds; },
    setCloudMsg(msg) { events.messages.push(msg); },
    refreshStorageBadge() {},
  };
  const context = vm.createContext(state);
  vm.runInContext(script, context);
  return { context, state, fields, events, saved };
}

test('remembered device saves even when cloud data sync temporarily fails', async () => {
  const f = fixture({connected:false, syncSucceeds:false});
  await vm.runInContext('cloudLogin()', f.context);
  assert.equal(f.events.saved.length, 1);
  assert.equal(f.events.saved[0].owner, 'yckta');
  assert.equal(f.state.syncConf.rememberDevice, true);
  assert.equal(JSON.parse(f.saved.get('cfg')).rememberDevice, true);
  assert.equal(f.state.cloudReady, true);
});

test('checking Remember on an unlocked device saves immediately', async () => {
  const f = fixture({connected:true});
  await vm.runInContext('onRememberDeviceToggle(true)', f.context);
  assert.equal(f.state.syncConf.rememberDevice, true);
  assert.equal(f.events.saved.length, 1);
});

test('auto-unlock restore failures show an error and preserve encrypted data', async () => {
  const f = fixture({connected:false});
  f.state.syncConf.rememberDevice = true;
  f.state.restoreRememberedUnlock = async()=>{throw new Error('IndexedDB temporarily unavailable')};
  await vm.runInContext('initializeRememberedDevice()', f.context);
  assert.equal(f.state.syncConf.rememberDevice, true);
  assert.match(f.state.syncConf.autoUnlockError,/IndexedDB/);
  assert.equal(f.events.saved.some(x=>x.removed),false);
});
