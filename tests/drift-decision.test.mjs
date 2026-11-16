import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDefaultPolicy, mergePolicyWithIntent } from '../heuristic-policy.js';
import { decideDrift, inheritedSiteCategory, pageDwellMs, sessionAlignKey, topicHits } from '../drift-decision.js';

const now = 1_700_000_000_000;
const policyFor = (intent, strictness = 'balanced', extra = {}) => ({
  ...mergePolicyWithIntent(intent, buildDefaultPolicy(null, strictness)), ...extra,
});
const decide = (intent, url, more = {}) => decideDrift({ intent, url, policy: policyFor(intent), now, ...more });

test('a clear block-category site locks; the same site that people also use for work only asks', () => {
  assert.equal(decide('Write the Q3 budget proposal', 'https://www.netflix.com/browse').outcome, 'lock');
  const yt = decide('Write the Q3 budget proposal', 'https://www.youtube.com/watch?v=abc', { title: 'Funny fails' });
  assert.equal(yt.outcome, 'checkin');
  assert.equal(yt.checkinKind, 'video');
});

test('page title and snippet show the topic: a related video is silent', () => {
  const r = decide('Learn how to set up Kubernetes ingress', 'https://www.youtube.com/watch?v=abc',
    { title: 'Kubernetes Ingress explained - YouTube', snippet: 'Tutorial.' });
  assert.equal(r.outcome, 'silent');
  assert.equal(topicHits(['microplastics'], 'Microplastic pollution in rivers'), 1);
});

test('explicit user authority: custom block always locks, custom allow and related stay silent', () => {
  const intent = 'Write the Q3 budget proposal';
  const blocked = policyFor(intent, 'balanced', { customBlockDomains: ['docs.example'] });
  assert.equal(decideDrift({ intent, url: 'https://docs.example/a', policy: blocked, now, sessionAligned: ['host:docs.example'] }).outcome, 'lock');
  const allowed = policyFor(intent, 'balanced', { customAllowDomains: ['netflix.com'] });
  assert.equal(decideDrift({ intent, url: 'https://netflix.com/', policy: allowed, now }).outcome, 'silent');
  assert.equal(decide(intent, 'https://netflix.com/', { relatedHostnames: ['netflix.com'] }).explicit, true);
});

test('a session "yes" covers a whole ordinary site but only one page on a hub', () => {
  const intent = 'Write the Q3 budget proposal';
  const key = sessionAlignKey('https://www.youtube.com/watch?v=abc');
  assert.equal(key, 'page:https://www.youtube.com/watch?v=abc');
  assert.equal(decide(intent, 'https://www.youtube.com/watch?v=abc', { sessionAligned: [key] }).outcome, 'silent');
  assert.equal(decide(intent, 'https://www.youtube.com/watch?v=other', { sessionAligned: [key] }).outcome, 'checkin');
  assert.equal(sessionAlignKey('https://app.vendor.example/x'), 'host:app.vendor.example');
});

test('after "I drifted", an unrelated page on that site locks instead of asking again', () => {
  const r = decide('Write the Q3 budget proposal', 'https://www.youtube.com/watch?v=zzz', { driftedHosts: ['youtube.com'] });
  assert.equal(r.outcome, 'lock');
  assert.equal(r.reason, 'repeat_drift');
});

test('vague intents never lock', () => {
  for (const url of ['https://www.netflix.com/browse', 'https://www.youtube.com/watch?v=a', 'https://www.reddit.com/r/all/']) {
    assert.notEqual(decide('stuff', url).outcome, 'lock', url);
  }
  assert.equal(decide('stuff', 'https://github.com/acme/app').outcome, 'silent');
});

test('subdomains follow their listed parent', () => {
  assert.equal(inheritedSiteCategory('app.slack.com').categoryId, 'messaging');
  assert.equal(inheritedSiteCategory('unknown.example'), null);
  assert.equal(decide('Reply to team messages and send the standup update', 'https://app.slack.com/client/T/C').outcome, 'silent');
});

test('naming a site aligns its pages but not its feed', () => {
  const intent = 'Moderate the community Facebook group';
  assert.equal(decide(intent, 'https://www.facebook.com/groups/acme/pending_posts').outcome, 'silent');
  const feed = decide(intent, 'https://www.facebook.com/', { title: 'Facebook' });
  assert.equal(feed.outcome, 'checkin');
  assert.equal(feed.checkinKind, 'feed');
});

test('off-topic searches ask; related searches and sign-in hops stay silent', () => {
  const intent = 'Write the annual performance review for my team';
  assert.equal(decide(intent, 'https://www.google.com/search?q=best+pizza+near+me').checkinKind, 'search');
  assert.equal(decide(intent, 'https://www.google.com/search?q=performance+review+phrases').outcome, 'silent');
  assert.equal(decide(intent, 'https://accounts.google.com/v3/signin/identifier').outcome, 'silent');
});

test('dwell is counted per page, and dwell reports are not new unrelated events', () => {
  const intent = 'Write the annual performance review for my team';
  const ev = (actionType, ts, extra = {}) => ({ timestamp: now - ts, url: 'https://tools.example', actionType, ...extra });
  const events = [ev('PAGE_LOAD', 100_000), ev('PAGE_DWELL', 90_000, { dwellDeltaMs: 30_000 }),
    ev('PAGE_LOAD', 60_000), ev('PAGE_DWELL', 30_000, { dwellDeltaMs: 30_000 })];
  assert.equal(pageDwellMs(events, 'https://tools.example/x'), 30_000);
  assert.equal(decide(intent, 'https://tools.example/x', { events }).outcome, 'silent');
  const long = [ev('PAGE_LOAD', 120_000), ...[90, 60, 30, 1].map(t => ev('PAGE_DWELL', t * 1000, { dwellDeltaMs: 30_000 }))];
  assert.equal(decide(intent, 'https://tools.example/x', { events: long }).checkinKind, 'long_stay');
});
