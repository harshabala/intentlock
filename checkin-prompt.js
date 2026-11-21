// checkin-prompt.js — small non-blocking check-in card ("Still on task?") in a closed shadow root.
// Not the lock: it never covers the page, makes nothing inert and never traps focus.
// content.js supplies the nonce-free, id-bound answer callback.

(function exposeCheckinPrompt(root) {
  const HOST_ID = 'intentlock-checkin-host';

  function buildStyles() {
    return `
    :host {
      all: initial;
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 2147483646;
      font-family: "IntentLock Plex Mono", ui-monospace, "SF Mono", monospace;
      -webkit-font-smoothing: antialiased;
    }
    .card {
      box-sizing: border-box;
      width: min(360px, calc(100vw - 32px));
      padding: 16px;
      background: #000;
      color: #fff;
      border: 1px solid #fff;
      border-radius: 2px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
      opacity: 0;
      transform: translateY(8px);
      transition: opacity 160ms ease-out, transform 160ms ease-out;
    }
    .card.is-in { opacity: 1; transform: none; }
    h2 {
      margin: 0 0 8px;
      font-family: "IntentLock Source Serif", "Iowan Old Style", Palatino, Georgia, serif;
      font-size: 16px;
      font-weight: 400;
      line-height: 1.35;
    }
    p { margin: 0 0 8px; font-size: 12px; line-height: 1.6; color: #a3a3a3; }
    .intent { font-family: "IntentLock Source Serif", "Iowan Old Style", Palatino, Georgia, serif; font-size: 14px; color: #fff; }
    .actions { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
    button {
      min-height: 44px;
      font: inherit;
      font-size: 12px;
      color: #fff;
      background: transparent;
      border: 1px solid #fff;
      border-radius: 2px;
      cursor: pointer;
      text-align: left;
      padding: 0 12px;
    }
    button.primary { background: #fff; color: #000; }
    button:hover { background: #fff; color: #000; }
    button.link {
      border: none; text-decoration: underline; text-underline-offset: 0.2em; min-height: 32px; padding: 0 4px;
    }
    button.link:hover { background: transparent; color: #fff; }
    button:focus-visible, input:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }
    button:disabled { opacity: 0.5; cursor: default; }
    input {
      box-sizing: border-box; width: 100%; min-height: 36px; margin-top: 8px; padding: 0 10px;
      font: inherit; font-size: 12px; color: #fff; background: #000; border: 1px solid #fff; border-radius: 2px;
    }
    .error { min-height: 1.2em; margin: 8px 0 0; color: #fff; }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { transition: none !important; animation: none !important; }
      .card { opacity: 1; transform: none; }
    }
    `;
  }

  // shadowMode 'open' exists only so browser tests can audit the card's real styles.
  function createCheckinPrompt({ onAnswer, shadowMode = 'closed' } = {}) {
    let host = null;
    let shadow = null;
    let card = null;
    let state = null;
    let busy = false;
    const els = {};

    function ensureHost() {
      if (host) return;
      host = document.createElement('div');
      host.id = HOST_ID;
      shadow = host.attachShadow({ mode: shadowMode === 'open' ? 'open' : 'closed' });
      if (globalThis.IntentLock?.interventionOverlay?.registerOverlayFonts) {
        globalThis.IntentLock.interventionOverlay.registerOverlayFonts(document);
      }
      const style = document.createElement('style');
      style.textContent = buildStyles();
      card = document.createElement('div');
      card.className = 'card';
      card.setAttribute('role', 'dialog');
      card.setAttribute('aria-modal', 'false');
      card.setAttribute('aria-labelledby', 'intentlock-checkin-title');
      card.setAttribute('aria-describedby', 'intentlock-checkin-why');
      card.innerHTML = `
        <h2 id="intentlock-checkin-title">Still on task?</h2>
        <p class="intent" data-role="intent"></p>
        <p id="intentlock-checkin-why" data-role="why"></p>
        <div class="actions">
          <button type="button" id="intentlock-checkin-yes" class="primary" data-answer="yes">Yes, this is for my task</button>
          <button type="button" id="intentlock-checkin-quick" data-answer="quick">Just a quick check</button>
          <button type="button" id="intentlock-checkin-drifted" data-answer="drifted">I drifted</button>
          <button type="button" id="intentlock-checkin-close" class="link" data-answer="close">Close this tab</button>
        </div>
        <input type="text" maxlength="200" aria-label="Optional: why this is for your task" placeholder="Optional: why it is for your task">
        <p class="error" role="alert" aria-live="polite" data-role="error"></p>`;
      els.intent = card.querySelector('[data-role="intent"]');
      els.why = card.querySelector('[data-role="why"]');
      els.error = card.querySelector('[data-role="error"]');
      els.reason = card.querySelector('input');
      els.buttons = Array.from(card.querySelectorAll('button'));
      for (const button of els.buttons) {
        button.addEventListener('click', () => answer(button.dataset.answer));
      }
      els.reason.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') answer('yes');
      });
      shadow.append(style, card);
    }

    function setBusy(value) {
      busy = value;
      for (const button of els.buttons || []) button.disabled = value;
    }

    function answer(kind) {
      if (busy || !state) return;
      setBusy(true);
      els.error.textContent = '';
      const reason = kind === 'yes' ? els.reason.value.trim().slice(0, 200) : '';
      Promise.resolve(typeof onAnswer === 'function' ? onAnswer({ id: state.id, answer: kind, reason }) : null)
        .catch((error) => {
          els.error.textContent = error?.message || 'Unable to send your answer.';
          setBusy(false);
        });
    }

    function show({ id, intent = '', why = '' } = {}) {
      ensureHost();
      state = { id };
      els.intent.textContent = intent ? `Your intent: ${intent}` : 'No active session intent.';
      els.why.textContent = why;
      els.reason.value = '';
      els.error.textContent = '';
      setBusy(false);
      if (!host.isConnected) document.documentElement.appendChild(host);
      host.style.removeProperty('display');
      card.classList.remove('is-in');
      const enter = () => card.classList.add('is-in');
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(enter);
      else enter();
      // Never steal focus from something the user is typing into; Tab reaches the card otherwise.
      const active = document.activeElement;
      if (!active || active === document.body || active === document.documentElement) els.buttons[0].focus();
    }

    function hide() {
      state = null;
      if (host) host.style.setProperty('display', 'none', 'important');
    }

    function isVisible() {
      return Boolean(host && state && host.style.display !== 'none');
    }

    return { show, hide, isVisible };
  }

  if (!('IntentLock' in root)) {
    Object.defineProperty(root, 'IntentLock', { configurable: true, enumerable: true, value: {}, writable: true });
  }
  const namespace = root.IntentLock;
  if ('checkinPrompt' in namespace) throw new Error('IntentLock.checkinPrompt is already defined');
  Object.defineProperty(namespace, 'checkinPrompt', {
    configurable: false, enumerable: true, writable: false, value: { buildStyles, createCheckinPrompt },
  });
}(globalThis));
