import assert from 'node:assert/strict';
import test from 'node:test';

// Returning from idle and switching to an off-intent tab locks it; switching to
// on-intent work, or while the timer is paused, does not.
const shown = [];
const tabs = new Map();
const idleListeners = [];
const activatedListeners = [];
const storageData = {
  activeSession: { id: 'idle-switch', intent: 'write the quarterly budget memo', isActive: true, startTime: Date.now(), events: [] },
  trackingEnabled: true,
  heuristicPolicy: {
    version: 1, intentCategoryId: 'deep_work', strictness: 'balanced', setupCompleted: true,
    categoryPolicies: {}, customBlockDomains: [], customAllowDomains: ['allowed.example'],
  },
};

const area = (data) => ({
  get: (keys, cb) => {
    const list = keys == null ? Object.keys(data) : Array.isArray(keys) ? keys : [keys];
    cb(Object.fromEntries(list.filter(k => k in data).map(k => [k, structuredClone(data[k])])));
  },
  set: (values, cb) => { Object.assign(data, structuredClone(values)); cb?.(); },
  remove: (keys, cb) => { (Array.isArray(keys) ? keys : [keys]).forEach(k => delete data[k]); cb?.(); },
  clear: (cb) => { Object.keys(data).forEach(k => delete data[k]); cb?.(); },
});
const event = { addListener() {} };
globalThis.chrome = {
  idle: { setDetectionInterval() {}, onStateChanged: { addListener: fn => idleListeners.push(fn) } },
  commands: { onCommand: event },
  runtime: { id: 'idle-test', lastError: undefined, onMessage: event, sendMessage() {}, getURL: p => `chrome-extension://idle-test/${p}` },
  alarms: { create() {}, clear() {}, onAlarm: event },
  tabs: {
    onUpdated: event, onActivated: { addListener: fn => activatedListeners.push(fn) }, onRemoved: event,
    get: (id, cb) => { const tab = tabs.get(id) || null; cb?.(tab); return Promise.resolve(tab); },
    query: (_q, cb) => { cb?.([]); return Promise.resolve([]); },
    sendMessage: (id, message, cb) => { if (message.type === 'SHOW_INTERVENTION') shown.push(id); cb?.({ shown: true }); },
    update: (_id, _props, cb) => cb?.(), group: () => Promise.resolve(1),
  },
  tabGroups: { update: () => Promise.resolve(), get: () => Promise.resolve() },
  storage: { local: area(storageData), session: area({}), onChanged: event },
};

const { reloadConfig } = await import('../background.js');
await reloadConfig();
const settle = () => new Promise(resolve => setTimeout(resolve, 30));

async function returnFromIdle() {
  for (const listener of idleListeners) listener('idle');
  await settle();
  for (const listener of idleListeners) listener('active');
  await settle();
}

async function activate(id, url) {
  // Start each switch from a clean event log so only the idle rule can lock.
  storageData.activeSession.events = [];
  tabs.set(id, { id, url });
  for (const listener of activatedListeners) listener({ tabId: id });
  await settle();
}

test('switching to an unlisted site without idling does not lock', async () => {
  await activate(1, 'https://unlisted.example/page');
  assert.deepEqual(shown, []);
});

test('switching to on-intent work right after idle does not lock', async () => {
  await returnFromIdle();
  await activate(2, 'https://allowed.example/doc');
  assert.deepEqual(shown, []);
});

test('switching to an off-intent site right after idle locks it', async () => {
  await returnFromIdle();
  await activate(3, 'https://unlisted.example/other');
  assert.deepEqual(shown, [3]);
});

test('the idle switch rule fires once per return from idle', async () => {
  shown.length = 0;
  await activate(4, 'https://unlisted.example/again');
  assert.deepEqual(shown, []);
});

test('a paused timer suppresses the idle switch lock', async () => {
  storageData.activeSession.pausedAt = Date.now();
  await returnFromIdle();
  await activate(5, 'https://unlisted.example/paused');
  assert.deepEqual(shown, []);
  delete storageData.activeSession.pausedAt;
});
