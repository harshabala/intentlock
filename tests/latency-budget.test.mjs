import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDefaultPolicy, evaluatePolicyDrift, isUrlAligned, minimizeSessionEvent } from '../heuristic-policy.js';

// AGENTS.md: checks must stay under 200 ms. The local heuristic is the only
// check on the lock path, so keep a wide margin for slow machines.
const BUDGET_MS = 200;
const intent = 'finish the pull request review for the billing service';
const policy = { ...buildDefaultPolicy('coding', 'strict'), customBlockDomains: ['blocked.example'], customAllowDomains: ['allowed.example'] };
const hosts = ['github.com', 'news.ycombinator.com', 'reddit.com', 'youtube.com', 'docs.python.org', 'unlisted.example', 'm.twitter.com'];
const now = Date.now();
const events = Array.from({ length: 50 }, (_, i) => minimizeSessionEvent({
  timestamp: now - (50 - i) * 1000,
  url: `https://${hosts[i % hosts.length]}/path/${i}`,
  actionType: i % 3 === 0 ? 'PAGE_DWELL' : 'TAB_SWITCH',
  dwellDeltaMs: 30_000,
}, intent));

test('a full heuristic drift check with a 50-event history stays within the latency budget', () => {
  const samples = [];
  for (let i = 0; i < 200; i++) {
    const url = `https://${hosts[i % hosts.length]}/page/${i}`;
    const started = performance.now();
    evaluatePolicyDrift({ intent, url, events, policy, now, relatedHostnames: ['related.example'] });
    isUrlAligned(intent, url, policy, ['related.example']);
    samples.push(performance.now() - started);
  }
  samples.sort((a, b) => a - b);
  const p99 = samples[Math.floor(samples.length * 0.99)];
  assert.ok(p99 < BUDGET_MS / 10, `p99 ${p99.toFixed(2)} ms should be under ${BUDGET_MS / 10} ms`);
});
