import assert from 'node:assert/strict';
import test from 'node:test';
import { REASK_MS } from '../drift-decision.js';
import {
  CHECKIN_GRACE_MS, CHECKIN_MIN_GAP_MS, canAsk, checkinState, createCheckinController,
} from '../checkin-controller.js';

test('gating: global minimum gap, one check-in per site, grace expiry', () => {
  const state = checkinState({});
  assert.equal(canAsk(state, 'host:a.test', 1, 1_000_000), true);
  state.lastAt = 1_000_000;
  assert.equal(canAsk(state, 'host:b.test', 1, 1_000_000 + CHECKIN_MIN_GAP_MS - 1), false);
  assert.equal(canAsk(state, 'host:b.test', 1, 1_000_000 + CHECKIN_MIN_GAP_MS), true);
  state.sites['host:a.test'] = { at: 1_000_000, answer: 'drifted', graceUntil: 0 };
  assert.equal(canAsk(state, 'host:a.test', 1, 9_000_000), false, 'asked once already');
  state.sites['host:a.test'] = { at: 1_000_000, answer: 'quick', graceUntil: 5_000_000 };
  assert.equal(canAsk(state, 'host:a.test', 1, 4_000_000), false, 'still in the grace period');
  assert.equal(canAsk(state, 'host:a.test', 1, 5_000_000), true, 'asks again once it expires');
});

function harness() {
  const store = { activeSession: { id: 's1', intent: 'write the budget memo', isActive: true, events: [] }, trackingEnabled: true };
  let clock = 10_000_000;
  const sent = [];
  const removed = [];
  const back = [];
  const controller = createCheckinController({
    enqueue: (op) => op(),
    storageGet: async () => structuredClone(store),
    storageSet: async (values) => { Object.assign(store, structuredClone(values)); },
    sendTabMessage: async (_id, message) => { sent.push(message); return { response: { shown: true }, error: null }; },
    getTab: async (id) => ({ id, url: 'https://video.example/watch' }),
    removeTab: async (id) => { removed.push(id); },
    goBack: async (id) => { back.push(id); },
    minimizeEvent: (e) => ({ ...e, url: e.url && new URL(e.url).origin }),
    extractDomain: (u) => new URL(u).hostname,
    createId: (() => { let n = 0; return () => `id${++n}`; })(),
    now: () => clock,
  });
  return { store, sent, removed, back, controller, tick: (ms) => { clock += ms; } };
}
const ask = (c) => c.controller.maybeShow({ tabId: 7, url: 'https://video.example/watch', decision: { reasonLabel: 'why' } });
const sender = { tab: { id: 7 } };

test('yes aligns the site for this session only and records a short reason', async () => {
  const c = harness();
  assert.equal(await ask(c), true);
  assert.equal(c.sent[0].type, 'SHOW_CHECKIN');
  const r = await c.controller.answer({ id: 'id1', answer: 'yes', reason: ' a tutorial for the memo ' }, sender);
  assert.equal(r.ok, true);
  assert.deepEqual(c.store.activeSession.checkins.aligned, ['host:video.example']);
  assert.equal(c.store.activeSession.events[0].reflection, 'a tutorial for the memo');
  assert.equal(c.store.relatedDomainMarks, undefined, 'no permanent allow is written');
  assert.equal((await c.controller.answer({ id: 'id1', answer: 'yes' }, sender)).ok, false, 'an answer is used once');
});

test('quick check grants a grace period, then asks again; drifted goes back; close closes', async () => {
  const c = harness();
  await ask(c);
  await c.controller.answer({ id: 'id1', answer: 'quick' }, sender);
  c.tick(CHECKIN_MIN_GAP_MS + 1);
  assert.equal(await ask(c), false, 'inside the grace period');
  c.tick(CHECKIN_GRACE_MS);
  assert.equal(await ask(c), true, 'grace expired');
  await c.controller.answer({ id: 'id2', answer: 'drifted' }, sender);
  assert.deepEqual(c.back, [7]);
  assert.deepEqual(c.store.activeSession.checkins.drifted, ['video.example']);
  c.tick(CHECKIN_MIN_GAP_MS + CHECKIN_GRACE_MS);
  c.store.activeSession.checkins.sites = {};
  await ask(c);
  await c.controller.answer({ id: 'id3', answer: 'close' }, sender);
  assert.deepEqual(c.removed, [7]);
});

test('drifted falls back to closing the tab when there is no page to go back to', async () => {
  const c = harness();
  const removed = [];
  const controller = createCheckinController({
    enqueue: (op) => op(), storageGet: async () => structuredClone(c.store),
    storageSet: async (v) => { Object.assign(c.store, structuredClone(v)); },
    sendTabMessage: async () => ({ response: { shown: true }, error: null }),
    getTab: async (id) => ({ id, url: 'https://video.example/watch' }),
    removeTab: async (id) => { removed.push(id); }, goBack: async () => { throw new Error('no history'); },
    minimizeEvent: (e) => e, extractDomain: (u) => new URL(u).hostname, createId: () => 'x', now: () => 50_000_000,
  });
  await controller.maybeShow({ tabId: 7, url: 'https://video.example/watch', decision: {} });
  await controller.answer({ id: 'x', answer: 'drifted' }, sender);
  assert.deepEqual(removed, [7]);
});

test('nothing is shown for a paused session, a navigated tab or when the page cannot show it', async () => {
  const c = harness();
  c.store.activeSession.pausedAt = 1;
  assert.equal(await ask(c), false);
  delete c.store.activeSession.pausedAt;
  assert.equal(await c.controller.maybeShow({ tabId: 7, url: 'https://elsewhere.example/', decision: {} }), false);
  assert.equal((await c.controller.answer({ id: 'nope', answer: 'yes' }, { tab: {} })).ok, false);
});

test('a second ask on an answered host waits the interval and happens once', () => {
  const state = checkinState({});
  const key = 'page:https://en.wikipedia.org/wiki/Other';
  state.sites['page:https://en.wikipedia.org/wiki/First'] = { at: 1_000_000, answer: 'yes', graceUntil: 0 };
  const t = 1_000_000 + REASK_MS;
  assert.equal(canAsk(state, key, 1, t - 1, 'moved_on', 'en.wikipedia.org'), false, 'too soon');
  assert.equal(canAsk(state, key, 1, t, 'moved_on', 'en.wikipedia.org'), true);
  assert.equal(canAsk(state, key, 1, t, null, 'en.wikipedia.org'), true, 'a different page is a different site on a hub');
  state.sites['page:https://en.wikipedia.org/wiki/First'].reasked = true;
  assert.equal(canAsk(state, key, 1, t, 'moved_on', 'en.wikipedia.org'), false, 'the one further ask was used');
  assert.equal(canAsk(state, key, 1, t, 'moved_on', 'never-answered.test'), false);
});
