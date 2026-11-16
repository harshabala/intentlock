// checkin-controller.js — service-worker side of the check-in prompt.
// Everything the user answers is stored on the active session (`session.checkins`), so it is cleared
// when the session ends and is never a permanent allow. Dependencies are injected so it stays testable.
import { sessionAlignKey } from './drift-decision.js';

export const CHECKIN_MIN_GAP_MS = 90_000; // global minimum gap between check-ins
export const CHECKIN_GRACE_MS = 5 * 60 * 1000; // "just a quick check"
const PENDING_MAX_AGE_MS = 10 * 60 * 1000;
const MAX_LIST = 100;

const emptyState = () => ({ lastAt: 0, sites: {}, pending: {}, aligned: [], drifted: [], count: 0 });

export function checkinState(session) {
  const c = session?.checkins;
  return c && typeof c === 'object' && !Array.isArray(c) ? { ...emptyState(), ...c } : emptyState();
}

export const alignedKeys = (session) => checkinState(session).aligned;
export const driftedHosts = (session) => checkinState(session).drifted;

/** One check-in per site per session, unless a "quick check" grace period has expired. */
export function canAsk(state, key, tabId, now) {
  if (now - state.lastAt < CHECKIN_MIN_GAP_MS) return false;
  const pending = state.pending[tabId];
  if (pending && now - pending.at < PENDING_MAX_AGE_MS) return false;
  const site = state.sites[key];
  if (!site) return true;
  return site.answer === 'quick' && now >= site.graceUntil;
}

function pushUnique(list, value) {
  if (value && !list.includes(value)) list.push(value);
  while (list.length > MAX_LIST) list.shift();
}

export function createCheckinController({
  enqueue, storageGet, storageSet, sendTabMessage, getTab, removeTab, goBack, minimizeEvent, extractDomain, createId, now = Date.now,
}) {
  async function maybeShow({ tabId, url, decision }) {
    if (!Number.isInteger(tabId)) return false;
    return enqueue(async () => {
      const result = await storageGet(['activeSession', 'trackingEnabled']);
      const session = result.activeSession;
      if (result.trackingEnabled === false || !session?.isActive || Number.isFinite(session.pausedAt)) return false;
      const key = sessionAlignKey(url);
      const state = checkinState(session);
      const t = now();
      if (!key || !canAsk(state, key, tabId, t)) return false;
      const tab = await getTab(tabId);
      if (!tab || sessionAlignKey(tab.url) !== key) return false;
      const id = createId();
      state.pending[tabId] = { id, key, host: extractDomain(url), url, at: t };
      session.checkins = state;
      await storageSet({ activeSession: session });
      const shown = await sendTabMessage(tabId, { type: 'SHOW_CHECKIN', id, why: decision.reasonLabel || '' });
      if (shown.error || !shown.response?.shown) {
        delete state.pending[tabId];
        await storageSet({ activeSession: session });
        return false;
      }
      state.lastAt = t;
      state.sites[key] = { at: t, answer: null, graceUntil: 0 };
      state.count += 1;
      await storageSet({ activeSession: session });
      return true;
    }).catch(() => false);
  }

  async function answer(message, sender) {
    const tabId = sender?.tab?.id;
    if (!Number.isInteger(tabId)) return { ok: false, error: 'Check-in answers require a tab.' };
    const kind = message.answer;
    if (!['yes', 'quick', 'drifted', 'close'].includes(kind)) return { ok: false, error: 'Unsupported answer.' };
    const outcome = await enqueue(async () => {
      const result = await storageGet(['activeSession', 'trackingEnabled']);
      const session = result.activeSession;
      if (result.trackingEnabled === false || !session?.isActive) return { ok: false, error: 'No active session.' };
      const state = checkinState(session);
      const pending = state.pending[tabId];
      if (!pending || pending.id !== message.id) return { ok: false, error: 'This check-in is stale.' };
      delete state.pending[tabId];
      const t = now();
      const site = state.sites[pending.key] || { at: t, answer: null, graceUntil: 0 };
      site.answer = kind === 'close' ? 'drifted' : kind;
      if (kind === 'yes') pushUnique(state.aligned, pending.key);
      if (kind === 'quick') site.graceUntil = t + CHECKIN_GRACE_MS;
      if (kind === 'drifted' || kind === 'close') pushUnique(state.drifted, pending.host);
      state.sites[pending.key] = site;
      const reason = kind === 'yes' && typeof message.reason === 'string' ? message.reason.trim().slice(0, 200) : '';
      session.events = Array.isArray(session.events) ? session.events : [];
      session.events.push(minimizeEvent({
        timestamp: t, actionType: 'CHECKIN', url: pending.url, hostname: pending.host, answer: kind, reflection: reason || null,
      }, session.intent));
      if (session.events.length > 50) session.events.shift();
      session.checkins = state;
      await storageSet({ activeSession: session });
      return { ok: true, answer: kind };
    });
    if (!outcome.ok) return outcome;
    if (kind === 'close') {
      try { await removeTab(tabId); } catch { /* the tab is already gone */ }
    } else if (kind === 'drifted') {
      // Take them back; if there is nowhere to go back to, close the tab.
      try { await goBack(tabId); } catch { try { await removeTab(tabId); } catch { /* gone */ } }
    }
    return outcome;
  }

  async function forgetTab(tabId) {
    await enqueue(async () => {
      const result = await storageGet(['activeSession']);
      const session = result.activeSession;
      const pending = session?.checkins?.pending?.[tabId];
      if (!pending) return;
      delete session.checkins.pending[tabId];
      // A card that vanished with its page (reload, close) was never answered, so it did not use up the site.
      if (session.checkins.sites?.[pending.key]?.answer === null) delete session.checkins.sites[pending.key];
      await storageSet({ activeSession: session });
    }).catch(() => {});
  }

  return { maybeShow, answer, forgetTab };
}
