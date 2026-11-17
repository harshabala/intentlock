// Replays the labelled drift set (tests/drift-set/*.json) through the real decision code
// used by the service worker (heuristic-policy.js) and reports right and wrong locks.
// Exit code is non-zero only on a crash (bad data, exception), never on poor scores.
//   npm run score:drift                 summary
//   npm run score:drift -- --failures   also list every wrong lock, prompt and missed drift
//   npm run score:drift -- --set heldout   the held-out set (never tuned against); default is the tuning set
//   npm run score:drift -- --legacy     the original two-outcome rules, for before numbers
//   npm run score:drift -- --json out.json
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildDefaultPolicy, mergePolicyWithIntent, evaluatePolicyDrift, minimizeSessionEvent,
} from '../heuristic-policy.js';
import { decideDrift, sessionAlignKey } from '../drift-decision.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SET_DIRS = { tuning: join(root, 'tests', 'drift-set'), heldout: join(root, 'tests', 'drift-set-heldout') };
const SET_DIR = SET_DIRS.tuning;
const PRESETS = ['relaxed', 'balanced', 'strict'];
const T0 = 1_700_000_000_000;
const DWELL_REPORT_MS = 30_000; // page-tracker.js DWELL_REPORT_INTERVAL_MS
const MAX_EVENTS = 50; // background.js logEvent cap

export function loadSet(dir = SET_DIR) {
  const sequences = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    const doc = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    if (!Array.isArray(doc.sequences)) throw new Error(`${file}: missing sequences[]`);
    for (const s of doc.sequences) {
      if (!s.id || !s.intent || !PRESETS.includes(s.strictness) || !Array.isArray(s.visits) || !s.visits.length) {
        throw new Error(`${file}: malformed sequence ${s.id}`);
      }
      for (const v of s.visits) {
        if (!['serves-intent', 'drift'].includes(v.label) || typeof v.url !== 'string'
          || !Number.isFinite(v.dwell_s) || !Number.isFinite(v.t_s)) {
          throw new Error(`${file}: malformed visit in ${s.id}`);
        }
      }
      sequences.push({ ...s, file });
    }
  }
  return sequences;
}

const hostOf = (url) => { try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };

/**
 * Mirrors the worker: log the load/tab-switch event, check, then log each 30 s dwell report and re-check.
 * engine 'checkin' (default) is the three-outcome decision the worker uses; 'legacy' is the original
 * two-outcome evaluatePolicyDrift (kept so before/after numbers stay reproducible).
 * Simulated user: a check-in on a serves-intent visit is answered "yes" (site, or page on a hub, aligned for
 * the rest of the session); on a drift visit "I drifted" (a later unrelated page on that site locks).
 * The global minimum gap and the "quick check" grace period are not modelled.
 */
export function replay(sequence, strictness, engine = 'checkin') {
  const policy = mergePolicyWithIntent(sequence.intent, buildDefaultPolicy(null, strictness));
  const events = [];
  const sessionAligned = [];
  const driftedHosts = [];
  const answered = {};
  const log = (event) => {
    events.push(minimizeSessionEvent(event, sequence.intent));
    if (events.length > MAX_EVENTS) events.shift();
  };
  const check = (v, now) => {
    if (engine === 'legacy') {
      const r = evaluatePolicyDrift({ intent: sequence.intent, url: v.url, events: [...events], policy, now });
      return { ...r, outcome: r.shouldIntervene ? 'lock' : 'silent' };
    }
    const r = decideDrift({
      intent: sequence.intent, url: v.url, title: v.title, snippet: v.text, events: [...events], policy, now, sessionAligned, driftedHosts, answered,
    });
    return r;
  };
  return sequence.visits.map((v) => {
    const start = T0 + v.t_s * 1000;
    const end = start + v.dwell_s * 1000;
    log({ timestamp: start, url: v.url, actionType: v.via === 'tab-switch' ? 'TAB_SWITCH' : 'PAGE_LOAD' });
    let result = check(v, start);
    let at = 'navigation';
    for (let t = start + DWELL_REPORT_MS, done = 0; result.outcome === 'silent' && done < end - start;) {
      const stop = Math.min(t, end);
      const delta = stop - start - done;
      if (delta <= 0) break;
      done += delta;
      log({ timestamp: stop, url: v.url, actionType: 'PAGE_DWELL', dwellMs: done, dwellDeltaMs: delta });
      result = check(v, stop);
      at = `dwell ${Math.round(done / 1000)}s`;
      t += DWELL_REPORT_MS;
    }
    if (result.outcome === 'checkin') {
      const host = hostOf(v.url);
      const reasked = ['moved_on', 'repeat'].includes(result.checkinKind) || Boolean(answered[host]?.reasked);
      if (v.label === 'serves-intent') {
        sessionAligned.push(sessionAlignKey(v.url));
        answered[host] = { answer: 'yes', at: start, reasked };
      } else {
        driftedHosts.push(host);
        answered[host] = { answer: 'drifted', at: start, reasked };
      }
    }
    return {
      outcome: result.outcome, locked: result.outcome === 'lock', reason: result.reason, checkinKind: result.checkinKind, score: result.score ?? 0,
      signals: result.signals || [], at: result.outcome === 'silent' ? null : at,
      intentCategory: policy.intentCategoryId,
    };
  });
}

function tally(rows) {
  const t = { serves: 0, drift: 0, wrongLocks: 0, prompts: 0, rightSilent: 0, missed: 0, driftPrompted: 0, rightLocks: 0 };
  for (const r of rows) {
    if (r.label === 'serves-intent') {
      t.serves++;
      if (r.outcome === 'lock') t.wrongLocks++; else if (r.outcome === 'checkin') t.prompts++; else t.rightSilent++;
    } else {
      t.drift++;
      if (r.outcome === 'lock') t.rightLocks++; else if (r.outcome === 'checkin') t.driftPrompted++; else t.missed++;
    }
  }
  t.wrongLockRate = t.serves ? t.wrongLocks / t.serves : 0;
  t.promptRate = t.serves ? t.prompts / t.serves : 0;
  t.missedRate = t.drift ? t.missed / t.drift : 0;
  return t;
}

export function scoreAll(sequences, engine = 'checkin') {
  const rows = [];
  for (const s of sequences) {
    for (const preset of PRESETS) {
      const outcomes = replay(s, preset, engine);
      s.visits.forEach((v, i) => rows.push({
        id: s.id, category: s.category, intent: s.intent, declared: s.strictness, preset,
        visit: i, url: v.url, title: v.title, label: v.label, dwell_s: v.dwell_s, via: v.via,
        debatable: (s.debatable || []).some((d) => d.visit === i), ...outcomes[i],
      }));
    }
  }
  return rows;
}

const pct = (x) => `${(x * 100).toFixed(1)}%`;
function table(t) {
  const c = (n) => String(n).padStart(7);
  return [
    '                  silent  check-in    lock',
    `  serves-intent ${c(t.rightSilent)} ${c(t.prompts)}  ${c(t.wrongLocks)}   (check-in = prompt, lock = wrong lock)`,
    `  drift         ${c(t.missed)} ${c(t.driftPrompted)}  ${c(t.rightLocks)}   (silent = missed drift)`,
  ].join('\n');
}

export function report(rows, sequences, { failures = false, note = 'labels are agent proposals' } = {}) {
  const out = [];
  const nv = sequences.reduce((a, s) => a + s.visits.length, 0);
  out.push(`Drift set: ${sequences.length} sequences, ${nv} visits (${note})`);
  const sections = [
    ['As declared (each sequence at its own preset)', (r) => r.preset === r.declared],
    ...PRESETS.map((p) => [`Every sequence replayed at ${p}`, (r) => r.preset === p]),
  ];
  for (const [title, pick] of sections) {
    const sel = rows.filter(pick);
    out.push('', `== ${title} ==`);
    const presetsHere = title.startsWith('As declared') ? PRESETS : [null];
    for (const p of presetsHere) {
      const sub = p ? sel.filter((r) => r.preset === p) : sel;
      const t = tally(sub);
      out.push(`${p ? `[${p}] ` : ''}visits ${sub.length}: wrong locks ${t.wrongLocks}/${t.serves} (${pct(t.wrongLockRate)}), `
        + `prompts on legitimate pages ${t.prompts}/${t.serves} (${pct(t.promptRate)}), `
        + `missed drifts ${t.missed}/${t.drift} (${pct(t.missedRate)})`);
      out.push(table(t));
    }
  }
  const ref = rows.filter((r) => r.preset === r.declared);
  const group = (key) => {
    const by = {};
    for (const r of ref) (by[r[key]] ||= []).push(r);
    return Object.entries(by).map(([name, rs]) => ({ name: String(name), ...tally(rs) }))
      .sort((a, b) => (b.wrongLocks + b.prompts + b.missed) - (a.wrongLocks + a.prompts + a.missed));
  };
  const line = (c) => `  ${c.name.padEnd(30)} wrong locks ${String(c.wrongLocks).padStart(3)}/${String(c.serves).padEnd(3)} (${pct(c.wrongLockRate).padStart(6)})  `
    + `prompts ${String(c.prompts).padStart(3)} (${pct(c.promptRate).padStart(6)})  missed ${String(c.missed).padStart(3)}/${String(c.drift).padEnd(3)} (${pct(c.missedRate).padStart(6)})`;
  out.push('', '== Worst scenario categories (as declared; by wrong locks + missed drifts) ==');
  for (const c of group('category')) out.push(line(c));
  out.push('', '== By intent category the classifier chose (null = unclassified) ==');
  for (const c of group('intentCategory')) out.push(line(c));
  if (failures) {
    out.push('', '== Failures (as declared) ==');
    for (const r of ref.filter((x) => (x.label === 'serves-intent') ? x.outcome !== 'silent' : x.outcome === 'silent')) {
      const kind = r.outcome === 'lock' ? 'WRONG LOCK ' : r.outcome === 'checkin' ? 'PROMPT     ' : 'MISSED DRIFT';
      out.push(`${kind} ${r.id}#${r.visit} [${r.preset}] ${r.reason} score=${r.score.toFixed(2)} ${r.at || ''} ${r.url}`);
    }
  }
  return out.join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const setName = args.includes('--set') ? args[args.indexOf('--set') + 1] : 'tuning';
  if (!SET_DIRS[setName]) throw new Error(`unknown set ${setName}; use tuning or heldout`);
  const sequences = loadSet(SET_DIRS[setName]);
  const engine = args.includes('--legacy') ? 'legacy' : 'checkin';
  const rows = scoreAll(sequences, engine);
  console.log(`Engine: ${engine}, set: ${setName}`);
  console.log(report(rows, sequences, {
    failures: args.includes('--failures'),
    note: setName === 'heldout' ? 'labels by agent, review pending-owner' : 'labels by agent, accepted by the owner 2026-11-16',
  }));
  const j = args.indexOf('--json');
  if (j >= 0 && args[j + 1]) writeFileSync(args[j + 1], JSON.stringify(rows, null, 1));
}
