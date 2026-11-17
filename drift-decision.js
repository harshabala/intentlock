// drift-decision.js — three-outcome drift decision: silent, check-in or lock.
// Pure module (no Chrome APIs). Used by the service worker and by scripts/score-drift.mjs.
// A lock is reserved for clear drift; anything the rules cannot judge becomes a check-in,
// a small prompt that asks the user. Page title/snippet are used transiently and never stored.
import {
  INTENT_CATEGORIES, CATEGORY_ALIGNMENT, buildDefaultPolicy, customRuleDecision,
  getSiteCategory, intentTerms, isTechnicalQaHost, matchesRelatedHostname,
} from './heuristic-policy.js';

export const NEUTRAL_UNRELATED_MS = 120_000; // unlisted page with no topic overlap: ask after this long on that page
export const WARN_DWELL_MS = 60_000;
export const SHORT_STAY_MS = 30_000; // relaxed preset: social and streaming ask after this short a stay
export const AFFIRMED_DWELL_MS = 45_000; // after a "yes": a page on another topic earns one more ask after this
export const REASK_MS = 3 * 60 * 1000; // a second ask on a site waits at least this long after the answer
const DISTRACTION_CATEGORIES = ['social_media', 'streaming', 'short_video', 'memes', 'gaming', 'gambling']; // watched (warn) category without topic overlap: ask after this
const EVENT_WINDOW_MS = 2 * 60 * 1000;

// Sites where one host serves both work and play, so a block-category match alone is not clear drift.
const WORK_CAPABLE = ['youtube.com', 'vimeo.com', 'reddit.com', 'linkedin.com', 'x.com', 'twitter.com',
  'facebook.com', 'instagram.com', 'pinterest.com', 'tiktok.com', 'discord.com', 'tumblr.com'];
// Hubs host unrelated pages side by side, so a "yes" covers only the page, not the whole site.
const HUB_HOSTS = ['wikipedia.org', 'medium.com', 'substack.com', 'news.ycombinator.com', 'quora.com'];
const SEARCH_HOSTS = ['google.com', 'bing.com', 'duckduckgo.com', 'search.yahoo.com', 'scholar.google.com', 'ecosia.org', 'brave.com'];
const FEED_SEGMENTS = new Set(['', 'home', 'feed', 'explore', 'foryou', 'shorts', 'reels', 'watch', 'trending',
  'news', 'discover', 'fyp', 'stories', 'marketplace']);
// Intent categories that make extra site categories part of the task.
const EXTRA_ALIGNMENT = { entertainment_allowed: ['forums', 'sports', 'news', 'gaming', 'streaming'] };

// Sign-in, SSO and MFA hops are transit pages, not browsing.
const AUTH_HOST = /^(?:login|signin|accounts|auth|id|sso|secure|oauth)\./i;
const AUTH_PATH = /\/(?:log-?in|sign-?in|sso|oauth2?|authorize|two-factor|mfa|session\/new|auth)\b/i;

const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'what', 'how', 'who', 'are', 'was', 'near',
  'best', 'tonight', 'today', 'free', 'new', 'top']);

function words(text) {
  return String(text || '').toLowerCase().match(/[a-z0-9]+/g) || [];
}

function stem(w) {
  for (const suffix of ['ations', 'ation', 'ings', 'ing', 'ions', 'ion', 'ed', 'es', 's']) {
    if (w.length - suffix.length >= 4 && w.endsWith(suffix)) return w.slice(0, -suffix.length);
  }
  return w;
}

function termMatches(token, term) {
  const a = stem(token);
  const b = stem(term);
  if (a === b) return true;
  return Math.min(a.length, b.length) >= 5 && (a.startsWith(b) || b.startsWith(a));
}

/** How many distinct intent terms appear in the text (stem-tolerant). */
export function topicHits(terms, text) {
  const tokens = words(text).filter(t => t.length > 2);
  return terms.filter(term => tokens.some(token => termMatches(token, term))).length;
}

function normalizeHost(h) {
  return String(h || '').replace(/^www\./, '').toLowerCase();
}

function parse(url) {
  try {
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    return { host: normalizeHost(u.hostname), path: u.pathname, search: u.search, params: u.searchParams, origin: u.origin };
  } catch {
    return null;
  }
}

/** What a "yes, this is for my task" answer covers this session: a whole site, or one page on a hub. */
export function sessionAlignKey(url) {
  const p = parse(url);
  if (!p) return null;
  return hostMatches(p.host, [...WORK_CAPABLE, ...SEARCH_HOSTS, ...HUB_HOSTS]) ? `page:${p.origin}${p.path}${p.search}` : `host:${p.host}`;
}

function hostMatches(host, list) {
  return list.some(d => host === d || host.endsWith(`.${d}`));
}

/** Site category with inheritance: a subdomain follows its nearest listed parent. */
export function inheritedSiteCategory(host) {
  const labels = normalizeHost(host).split('.');
  for (let i = 0; i < labels.length - 1; i++) {
    const hit = getSiteCategory(labels.slice(i).join('.'));
    if (hit) return hit;
  }
  return null;
}

function categoryAligned(host, intentCategoryId) {
  if (!intentCategoryId) return false;
  if ((intentCategoryId === 'coding' || intentCategoryId === 'learning') && isTechnicalQaHost(host)) return true;
  const cat = inheritedSiteCategory(host);
  if (!cat) return false;
  return (CATEGORY_ALIGNMENT[intentCategoryId] || []).includes(cat.categoryId)
    || (EXTRA_ALIGNMENT[intentCategoryId] || []).includes(cat.categoryId);
}

function originOf(url) {
  return parse(url)?.origin || null;
}

/** Dwell on the current page: deltas since the last navigation to this origin, not summed per origin. */
export function pageDwellMs(events, url) {
  const origin = originOf(url);
  if (!origin) return 0;
  let start = 0;
  events.forEach((e, i) => {
    if ((e.actionType === 'PAGE_LOAD' || e.actionType === 'SPA_NAVIGATION') && originOf(e.url) === origin) start = i + 1;
  });
  let delta = 0;
  let legacy = 0;
  for (const e of events.slice(start)) {
    if (e.actionType !== 'PAGE_DWELL' || originOf(e.url) !== origin) continue;
    if (Number.isFinite(e.dwellDeltaMs)) delta += Math.max(0, e.dwellDeltaMs);
    else if (Number.isFinite(e.dwellMs)) legacy = Math.max(legacy, e.dwellMs);
  }
  return delta + legacy;
}

function searchQuery(p) {
  const isSearchHost = hostMatches(p.host, SEARCH_HOSTS);
  if (!isSearchHost || !(/\/(search|scholar)\b/.test(p.path) || p.host.includes('duckduckgo') || p.params.has('q'))) return null;
  return p.params.get('q') || p.params.get('query') || p.params.get('p') || '';
}

function categoryLexicon(intentCategoryId) {
  return INTENT_CATEGORIES.find(c => c.id === intentCategoryId)?.keywords || [];
}

const silent = (reason, extra = {}) => ({ outcome: 'silent', reason, reasonLabel: '', score: 0, signals: [], ...extra });

/**
 * @returns {{outcome:'silent'|'checkin'|'lock', reason:string, reasonLabel:string, score:number,
 *   signals:string[], explicit?:true, checkinKind?:string}}
 */
export function decideDrift({
  intent, url, title = '', snippet = '', signals: pageSignals = {}, events = [], policy, now = Date.now(),
  relatedHostnames = [], sessionAligned = [], driftedHosts = [], answered = {},
}) {
  const r = decideInner({
    intent, url, title, snippet, signals: pageSignals, events, policy, now, relatedHostnames, sessionAligned, answered,
  });
  const p = parse(url);
  if (!p) return r;
  const relaxed = policy?.strictness === 'relaxed';
  const reask = (entry) => Boolean(entry) && !entry.reasked && now - entry.at >= REASK_MS;
  // The user already said this site was a drift; coming back to a page that is still unrelated is a lock
  // (relaxed never locks from inference: it asks one more time after the interval instead).
  if (r.outcome === 'checkin' && matchesRelatedHostname(p.host, driftedHosts)) {
    const repeat = {
      ...r, reason: 'repeat_drift', score: 0.9,
      reasonLabel: 'You said earlier that this site was a drift, and this page is still unrelated to your task.',
    };
    if (!relaxed) return { ...repeat, outcome: 'lock' };
    return reask(answered[p.host])
      ? { ...repeat, outcome: 'checkin', checkinKind: 'repeat' }
      : silent('relaxed_no_lock');
  }
  // The relaxed preset is gentle: it may ask, but it never locks from inference.
  if (relaxed && r.outcome === 'lock' && !r.explicit) {
    return { ...r, outcome: 'checkin', checkinKind: 'relaxed_ask', score: 0.5 };
  }
  return r;
}

function decideInner({
  intent, url, title = '', snippet = '', signals: pageSignals = {}, events = [], policy, now = Date.now(),
  relatedHostnames = [], sessionAligned = [], answered = {},
}) {
  const p = parse(url);
  if (!p) return silent('invalid_url');
  const safePolicy = (policy && typeof policy === 'object' && policy.version === 1)
    ? policy : buildDefaultPolicy('deep_work', 'balanced');
  const intentCategoryId = safePolicy.intentCategoryId || null;
  const terms = intentTerms(intent);
  const signals = [];

  // 1. Explicit user authority, in order: related correction, custom allow, custom block.
  if (matchesRelatedHostname(p.host, relatedHostnames)) return silent('related_correction', { explicit: true });
  const custom = customRuleDecision(p.host, safePolicy);
  if (custom === 'allow') return silent('explicit_allow', { explicit: true });
  if (custom === 'block') {
    return {
      outcome: 'lock', reason: 'blocked_category', score: 0.95, explicit: true, signals: ['custom_block'],
      reasonLabel: 'You visited a site your session has blocked.',
    };
  }
  const cat = inheritedSiteCategory(p.host);
  const isAuth = AUTH_HOST.test(p.host) || AUTH_PATH.test(p.path) || /[?&]authMode=/i.test(p.search);
  const hostPolicy = cat ? (safePolicy.categoryPolicies?.[cat.categoryId] || 'neutral') : 'neutral';
  const workCapable = hostMatches(p.host, WORK_CAPABLE);
  const classified = Boolean(intentCategoryId) && terms.length > 0;
  const pathText = `${p.path} ${p.search}`.toLowerCase();

  // 3. Alignment evidence.
  const pathMatch = terms.some(t => pathText.includes(t));
  const hostMatch = terms.some(t => p.host.includes(t));
  const label = p.host.split('.').slice(-2, -1)[0] || '';
  const named = hostMatch || (label.length <= 3 && words(intent).includes(label));
  // Only sites built around a feed have one; a company's home page is not a feed.
  const feedSite = cat && ['social_media', 'short_video', 'streaming', 'forums', 'memes', 'news'].includes(cat.categoryId);
  const feed = feedSite && FEED_SEGMENTS.has((p.path.split('/')[1] || '').toLowerCase()) && !p.search.includes('q=');
  // Words that only name the site do not count as topic evidence.
  const hits = topicHits(terms.filter(t => !p.host.includes(t)), `${title} ${snippet}`);
  const query = searchQuery(p);

  const kind = (k, why, reason, extra = {}) => ({
    outcome: 'checkin', reason, reasonLabel: why, score: 0.5, signals: [...signals, `checkin:${k}`], checkinKind: k, ...extra,
  });
  const recent = events.filter(e => e && Number.isFinite(e.timestamp) && e.timestamp <= now && now - e.timestamp <= EVENT_WINDOW_MS);
  const dwell = pageDwellMs(recent, url);
  if (dwell > 0) signals.push(`dwell:${Math.round(dwell / 1000)}s`);

  // After a "yes" for this host, a later page on a clearly different topic earns one further check-in,
  // once the interval since the answer has passed. Needs the page's own signals to judge the topic.
  const affirmed = answered[p.host];
  const movedOn = Boolean(affirmed) && affirmed.answer === 'yes' && !affirmed.reasked && now - affirmed.at >= REASK_MS
    && Boolean(title || snippet) && hits === 0 && !pathMatch && dwell >= AFFIRMED_DWELL_MS
    && !(cat && safePolicy.categoryPolicies?.[cat.categoryId] === 'allow');
  const movedOnAsk = () => kind('moved_on', 'You said this site was for your task, but this page looks like a different topic.', 'moved_on_after_yes');

  // 2. A "yes, this is for my task" answer covers the site (or one page on a hub) for this session only.
  const alignKey = sessionAlignKey(url);
  if (alignKey && sessionAligned.includes(alignKey)) return movedOn ? movedOnAsk() : silent('session_aligned', { explicit: true });

  if (pathMatch) return silent('aligned');
  if (named && !feed) return silent('aligned');
  if (hits > 0) return silent('topic_aligned');
  if (categoryAligned(p.host, intentCategoryId)) return silent('aligned');
  if (isAuth && !(cat && safePolicy.categoryPolicies?.[cat.categoryId] === 'block')) return silent('sign_in');

  const catLabel = cat?.label || 'this site';

  // 4. Named site, but a feed page: the intent mentions the site, the feed is not the task.
  if (named && feed) return kind('feed', `This is the ${catLabel === 'this site' ? 'site' : catLabel.toLowerCase()} feed, not the part of the site your task names.`, 'named_site_feed');

  if (movedOn) return movedOnAsk();

  // 5. Vague or unclassified intent: never lock. Ask only on sites that are usually off-task.
  if (!classified) {
    if (hostPolicy === 'block' || (hostPolicy === 'warn' && pageDwellMs(events, url) >= (safePolicy.strictness === 'relaxed' && cat && DISTRACTION_CATEGORIES.includes(cat.categoryId) ? SHORT_STAY_MS : WARN_DWELL_MS))) {
      return kind('vague', `${catLabel} is usually off-task, and your intent is too general for me to tell.`, 'vague_intent');
    }
    return silent('vague_intent');
  }

  // 6. Clear drift: a block-category site that is not work-capable and shows no link to the task.
  if (hostPolicy === 'block' && !workCapable) {
    return {
      outcome: 'lock', reason: 'blocked_category', score: 0.95, signals: [`blocked_category:${cat?.categoryId}`],
      reasonLabel: `This looks like ${catLabel} during ${INTENT_CATEGORIES.find(c => c.id === intentCategoryId)?.label || 'your task'}.`,
    };
  }
  // 7. Block-category host that people also use for work: ask.
  if (hostPolicy === 'block') {
    const video = cat?.categoryId === 'short_video' || pageSignals.video;
    return kind(video ? 'video' : 'social',
      video ? "You're watching a video that doesn't look related to your task." : `${catLabel} doesn't look related to your task.`,
      'work_capable_site');
  }
  // 8. Searches: does the query relate to the task?
  if (query !== null) {
    const qTokens = words(query).filter(t => t.length > 2 && !STOP.has(t));
    const lexicon = [...terms, ...categoryLexicon(intentCategoryId)];
    const related = qTokens.some(q => lexicon.some(t => termMatches(q, t)));
    if (qTokens.length > 0 && !related) return kind('search', "This search doesn't look related to your task.", 'off_topic_search');
    return silent('search');
  }
  // 9. The user's own policy allows the site: no drift enforcement.
  if (hostPolicy === 'allow') return silent('allowed_category');

  // 10. Watched category (news, shopping, forums...) with no topic overlap.
  if (hostPolicy === 'warn') {
    const watchAfter = safePolicy.strictness === 'relaxed' && cat && DISTRACTION_CATEGORIES.includes(cat.categoryId) ? SHORT_STAY_MS : WARN_DWELL_MS;
    if (dwell >= watchAfter) return kind('watched', `${catLabel} doesn't look related to your task.`, 'warn_category_dwell');
    return silent('warn_category');
  }
  // 11. Video playing on an unlisted host, or a long stay on a page that never mentions the task.
  if (pageSignals.video) return kind('video', "You're watching a video that doesn't look related to your task.", 'video_unrelated');
  if (dwell >= NEUTRAL_UNRELATED_MS) return kind('long_stay', "You've been on this page a while and it doesn't mention your task.", 'extended_unrelated_dwell');
  return silent('low_confidence');
}
