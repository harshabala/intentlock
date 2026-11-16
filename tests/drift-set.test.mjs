import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDefaultPolicy, evaluatePolicyDrift } from '../heuristic-policy.js';
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

test('replay uses the real evaluator: a blocked site locks on arrival', () => {
  const s = { intent: 'Write the Q3 budget proposal', visits: [{ url: 'https://twitter.com/home', dwell_s: 10, t_s: 0, via: 'load', label: 'drift' }] };
  const [r] = replay(s, 'balanced');
  assert.equal(r.locked, true);
  const direct = evaluatePolicyDrift({
    intent: s.intent, url: s.visits[0].url, events: [], policy: { ...buildDefaultPolicy('deep_work', 'balanced') }, now: 0,
  });
  assert.equal(direct.reason, r.reason);
});

test('scoring the whole set completes and returns a row per visit per preset', () => {
  const rows = scoreAll(sequences);
  assert.equal(rows.length, sequences.reduce((a, s) => a + s.visits.length, 0) * 3);
});
