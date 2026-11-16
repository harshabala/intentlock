// content.js — Page-level tracking and intervention overlay host

const { createPageTracker } = globalThis.IntentLock.pageTracker;
const { createInterventionOverlay } = globalThis.IntentLock.interventionOverlay;

let pageTracker = null;
let overlay = null;
let checkin = null;
let trackingActive = false;
let pendingIntervention = null;
let privacyRevision = 0;
// Dwell stops accumulating while the system is idle or the session timer is paused.
let systemIdle = false;
let sessionPaused = false;

function applyTrackerIdle() {
  if (pageTracker) pageTracker.setIdle(systemIdle || sessionPaused);
}

function setSessionPaused(session) {
  sessionPaused = Number.isFinite(session?.pausedAt);
  applyTrackerIdle();
}

function sendRuntimeMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      const error = chrome.runtime.lastError;
      resolve({ response, error: error ? new Error(error.message) : null });
    });
  });
}

function sendContentEvent(payload) {
  chrome.runtime.sendMessage({
    type: 'CONTENT_EVENT',
    payload,
  }, () => {
    void chrome.runtime.lastError;
  });
}

// Local page signals for the topic check. Only the title, the meta description or first heading
// (300 characters at most) and whether a video is present; the worker keeps them in memory only.
function sendPageSignals(url = globalThis.location?.href) {
  try {
    const doc = globalThis.document;
    if (!doc || !url) return;
    const description = doc.querySelector?.('meta[name="description"]')?.content || '';
    const heading = doc.querySelector?.('h1')?.textContent || '';
    const snippet = `${heading} ${description}`.replace(/\s+/g, ' ').trim().slice(0, 300);
    sendContentEvent({
      actionType: 'PAGE_SIGNALS',
      url,
      pageTitle: String(doc.title || '').slice(0, 200),
      pageText: snippet,
      hasVideo: Boolean(doc.querySelector?.('video')),
    });
  } catch {
    // Signals are optional; the rules fall back to URL evidence.
  }
}

function ensureTracker() {
  if (pageTracker) return pageTracker;
  pageTracker = createPageTracker({
    onReport: (payload) => {
      sendContentEvent(payload);
      if (payload.actionType === 'SPA_NAVIGATION') sendPageSignals(payload.navigationUrl || payload.url);
    },
  });
  applyTrackerIdle();
  return pageTracker;
}

function showTransitionError(message) {
  if (overlay) overlay.setError(message);
}

function sendInterventionTransition(transition, extra = {}, fallbackError) {
  return async (arg) => {
    const state = extra.stateFrom ? extra.stateFrom(arg) : arg;
    const result = await sendRuntimeMessage({
      type: 'INTERVENTION_TRANSITION',
      transition,
      sessionId: state?.sessionId,
      nonce: state?.nonce,
      ...(extra.payloadFrom ? extra.payloadFrom(arg) : {}),
    });
    if (result.response?.ok) {
      pendingIntervention = null;
      overlay.hide();
    } else {
      showTransitionError(result.response?.error || result.error?.message || fallbackError);
    }
  };
}

function ensureOverlay() {
  if (!overlay) {
    overlay = createInterventionOverlay({
      onOverride: sendInterventionTransition('override', {
        stateFrom: (arg) => arg.state,
        payloadFrom: ({ reflection, markRelated }) => ({ reflection, markRelated }),
      }, 'Unable to continue.'),
      onCloseTab: sendInterventionTransition('close-tab', {}, 'Unable to close this lock.'),
      onEndSession: sendInterventionTransition('end-session', {}, 'Unable to end the session.'),
    });
  }
  return overlay;
}

function startTracking() {
  if (trackingActive) return;
  trackingActive = true;
  ensureTracker().start();
  sendPageSignals();
}

function ensureCheckin() {
  const api = globalThis.IntentLock?.checkinPrompt;
  if (!api) return null;
  if (!checkin) {
    checkin = api.createCheckinPrompt({
      onAnswer: async ({ id, answer, reason }) => {
        const result = await sendRuntimeMessage({ type: 'CHECKIN_ANSWER', id, answer, reason });
        if (!result.response?.ok) throw new Error(result.response?.error || result.error?.message || 'Unable to send your answer.');
        checkin.hide();
      },
    });
  }
  return checkin;
}

function stopTracking() {
  if (!trackingActive) return;
  trackingActive = false;
  if (pageTracker) pageTracker.stop();
}

function syncSessionState() {
  const revision = privacyRevision;
  chrome.storage.local.get(['activeSession', 'trackingEnabled', 'privacyMutationState'], (result) => {
    if (revision !== privacyRevision || result.privacyMutationState?.deleting) return;
    setSessionPaused(result.activeSession);
    if (result.activeSession?.isActive && result.trackingEnabled !== false) {
      startTracking();
    } else {
      stopTracking();
    }

    if (result.trackingEnabled === false) {
      if (overlay) overlay.hide();
      pendingIntervention = null;
      return;
    }

    sendRuntimeMessage({ type: 'GET_INTERVENTION_STATE' }).then(({ response }) => {
      if (revision !== privacyRevision) return;
      if (response?.ok && response.state) {
        pendingIntervention = response.state;
        ensureOverlay().show({
          reason: response.state.reason,
          intent: response.state.intent || '',
          state: response.state,
        });
      }
    });
  });
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return;
  const sessionChanged = changes.activeSession && (
    changes.activeSession.oldValue?.id !== changes.activeSession.newValue?.id ||
    changes.activeSession.oldValue?.isActive !== changes.activeSession.newValue?.isActive
  );
  if (changes.privacyMutationState || sessionChanged || changes.trackingEnabled) privacyRevision++;
  if (changes.activeSession) setSessionPaused(changes.activeSession.newValue);
  if (changes.privacyMutationState?.newValue?.deleting) {
    stopTracking();
    if (overlay) overlay.hide();
    if (checkin) checkin.hide();
    pendingIntervention = null;
    return;
  }
  if (changes.trackingEnabled && changes.trackingEnabled.newValue === false) {
    stopTracking();
    if (overlay) overlay.hide();
    if (checkin) checkin.hide();
    pendingIntervention = null;
  }
  if (changes.trackingEnabled?.newValue === true) {
    const revision = privacyRevision;
    chrome.storage.local.get(['activeSession', 'privacyMutationState'], (result) => {
      if (revision !== privacyRevision || result.privacyMutationState?.deleting) return;
      if (result.activeSession?.isActive) startTracking();
    });
  } else if (changes.activeSession?.newValue?.isActive && changes.trackingEnabled?.newValue !== false) {
    startTracking();
  } else if (changes.activeSession && !changes.activeSession.newValue?.isActive) {
    stopTracking();
    if (checkin) checkin.hide();
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SHOW_INTERVENTION') {
    const revision = privacyRevision;
    chrome.storage.local.get(['activeSession', 'trackingEnabled', 'privacyMutationState'], (result) => {
      if (revision !== privacyRevision || result.privacyMutationState?.deleting) {
        sendResponse({ shown: false, reason: 'data_deleted' });
        return;
      }
      if (result.trackingEnabled === false || !result.activeSession?.isActive) {
        sendResponse({ shown: false, reason: 'tracking_disabled' });
        return;
      }
      pendingIntervention = message.state || pendingIntervention || {
        sessionId: message.sessionId,
        nonce: message.nonce,
        reason: message.reason,
      };
      if (checkin) checkin.hide();
      ensureOverlay().show({
        reason: message.reason,
        intent: message.intent,
        state: pendingIntervention,
      });
      sendResponse({ shown: true });
    });
    return true;
  }

  if (message.type === 'HIDE_INTERVENTION' || message.type === 'DATA_DELETION_STARTED' || message.type === 'DATA_DELETED') {
    privacyRevision++;
    stopTracking();
    if (overlay) overlay.hide();
    if (checkin) checkin.hide();
    pendingIntervention = null;
    sendResponse({ hidden: true });
    return true;
  }

  if (message.type === 'SHOW_CHECKIN') {
    const revision = privacyRevision;
    chrome.storage.local.get(['activeSession', 'trackingEnabled', 'privacyMutationState'], (result) => {
      const prompt = ensureCheckin();
      if (!prompt || revision !== privacyRevision || result.privacyMutationState?.deleting
        || result.trackingEnabled === false || !result.activeSession?.isActive
        || (overlay && overlay.isVisible())) {
        sendResponse({ shown: false });
        return;
      }
      prompt.show({ id: message.id, intent: result.activeSession.intent || '', why: String(message.why || '').slice(0, 300) });
      sendResponse({ shown: true });
    });
    return true;
  }

  if (message.type === 'HIDE_CHECKIN') {
    if (checkin) checkin.hide();
    sendResponse({ hidden: true });
    return true;
  }

  if (message.type === 'STOP_TRACKING') {
    stopTracking();
    sendResponse({ status: 'ok' });
    return true;
  }

  if (message.type === 'IDLE_STATE') {
    systemIdle = Boolean(message.idle);
    applyTrackerIdle();
    sendResponse({ status: 'ok' });
    return true;
  }

  return false;
});

syncSessionState();
