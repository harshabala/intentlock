import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDefaultPolicy, mergePolicyWithIntent } from '../heuristic-policy.js';
import { decideDrift } from '../drift-decision.js';
import { loadSet, replay, scoreAll } from '../scripts/score-drift.mjs';

const sequences = loadSet();

test('the drift set has at least 200 labelled sequences marked as agent-labelled, pending owner review', () => {
  assert.ok(sequences.length >= 200);
  assert.equal(new Set(sequences.map((s) => s.id)).size, sequences.length);
  for (const file of new Set(sequences.map((s) => s.file))) {
    const doc = JSON.parse(readFileSync(new URL(`./drift-set/${file}`, import.meta.url), 'utf8'));
    assert.equal(doc.labelled_by, 'agent');
    assert.equal(doc.review, 'accepted-by-owner-2026-11-16');
  }
});

test('the set covers every hard case and both labels', () => {
  const cats = new Set(sequences.map((s) => s.category));
  for (const c of ['research-looks-like-browsing', 'video-for-work', 'social-for-work', 'searches',
    'signin-redirects', 'shopping-for-work', 'quick-checks', 'obvious-drift']) assert.ok(cats.has(c), c);
  const labels = new Set(sequences.flatMap((s) => s.visits.map((v) => v.label)));
  assert.deepEqual([...labels].sort(), ['drift', 'serves-intent']);
});

test('replay uses the real decision code: a blocked site locks on arrival, a related video only asks', () => {
  const visit = (url) => ({ intent: 'Write the Q3 budget proposal', visits: [{ url, title: '', text: '', dwell_s: 10, t_s: 0, via: 'load', label: 'drift' }] });
  const [lock] = replay(visit('https://www.netflix.com/browse'), 'balanced');
  assert.equal(lock.outcome, 'lock');
  const direct = decideDrift({
    intent: 'Write the Q3 budget proposal', url: 'https://www.netflix.com/browse', events: [], now: 0,
    policy: mergePolicyWithIntent('Write the Q3 budget proposal', buildDefaultPolicy(null, 'balanced')),
  });
  assert.equal(direct.reason, lock.reason);
  assert.equal(replay(visit('https://www.youtube.com/watch?v=x'), 'balanced')[0].outcome, 'checkin');
  assert.equal(replay(visit('https://www.netflix.com/browse'), 'balanced', 'legacy')[0].outcome, 'lock');
});

test('scoring the whole set completes and returns a row per visit per preset', () => {
  const rows = scoreAll(sequences);
  assert.equal(rows.length, sequences.reduce((a, s) => a + s.visits.length, 0) * 3);
});
