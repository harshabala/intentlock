import './theme.js';
import { initializeStorageClient } from './storage-client.js';
import {
  getErrorLog,
  clearErrorLog,
  formatErrorLogForExport,
} from './error-log.js';
let privacyRevision = 0;

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'DATA_DELETION_STARTED' || message?.type === 'DATA_DELETED') privacyRevision++;
});

document.addEventListener('DOMContentLoaded', async () => {
  try { await initializeStorageClient(); }
  catch (error) {
    const status = document.createElement('p');
    status.setAttribute('role', 'alert');
    status.textContent = error.message;
    document.body.appendChild(status);
    return;
  }
  const listEl = document.getElementById('error-log-list');
  const emptyEl = document.getElementById('empty-log');
  const copyBtn = document.getElementById('copy-log-btn');
  const clearBtn = document.getElementById('clear-log-btn');
  const copyStatus = document.getElementById('copy-status');
  let allEntries = [];
  let activeFilter = 'all';

  function showStatus(text) {
    copyStatus.textContent = text;
    copyStatus.classList.remove('hidden');
    copyStatus.style.display = 'block';
    clearTimeout(copyStatus._timer);
    copyStatus._timer = setTimeout(() => {
      copyStatus.style.display = 'none';
    }, 2500);
  }

  function formatTime(timestamp) {
    return new Date(timestamp).toLocaleString();
  }

  function renderEntries() {
    const filtered = activeFilter === 'all'
      ? allEntries
      : allEntries.filter((entry) => entry.type === activeFilter);

    listEl.textContent = '';
    emptyEl.classList.toggle('hidden', filtered.length > 0);

    filtered.forEach((entry) => {
      const card = document.createElement('article');
      card.className = 'diagnostics-entry';

      const meta = document.createElement('div');
      meta.className = 'diagnostics-meta';
      meta.textContent = `${formatTime(entry.timestamp)} · ${entry.type} · ${entry.source || 'unknown'}`;

      const message = document.createElement('p');
      message.className = 'diagnostics-message';
      message.textContent = entry.message;

      card.append(meta, message);

      if (entry.details && Object.keys(entry.details).length > 0) {
        const details = document.createElement('pre');
        details.className = 'diagnostics-details';
        details.textContent = JSON.stringify(entry.details, null, 2);
        card.appendChild(details);
      }

      listEl.appendChild(card);
    });
  }

  async function refresh() {
    const revision = privacyRevision;
    try {
      const entries = await getErrorLog();
      if (revision !== privacyRevision) return;
      allEntries = entries;
      renderEntries();
    } catch (error) { showStatus(error.message); }
  }

  chrome.runtime.onMessage.addListener(message => {
    if (message?.type === 'DATA_DELETION_STARTED' || message?.type === 'DATA_DELETED') {
      allEntries = [];
      renderEntries();
    }
  });

  document.querySelectorAll('.diagnostics-filters .filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.diagnostics-filters .filter-btn').forEach((b) => {
        const on = b === btn;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      activeFilter = btn.dataset.filter;
      renderEntries();
    });
  });

  function showCopiedLabel() {
    copyBtn.classList.remove('is-copied');
    void copyBtn.offsetWidth;
    copyBtn.classList.add('is-copied');
    clearTimeout(copyBtn._copiedTimer);
    copyBtn._copiedTimer = setTimeout(() => {
      copyBtn.classList.remove('is-copied');
    }, 2500);
  }

  copyBtn.addEventListener('click', async () => {
    const filtered = activeFilter === 'all'
      ? allEntries
      : allEntries.filter((entry) => entry.type === activeFilter);
    const text = formatErrorLogForExport(filtered);
    try {
      await navigator.clipboard.writeText(text);
      showStatus('Log copied to clipboard.');
      showCopiedLabel();
    } catch {
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `intentlock-diagnostics-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      showStatus('Log downloaded as text file.');
    }
  });

  const holdFill = clearBtn.querySelector('.hold-fill');
  const holdInstructions = document.getElementById('clear-log-hold');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let holdActive = false;
  let activeInput = null;
  let suppressClick = false;

  function prefersReducedMotion() {
    return reducedMotion.matches;
  }

  function syncHoldInstructions() {
    if (!holdInstructions) return;
    holdInstructions.textContent = prefersReducedMotion()
      ? 'Clears the diagnostic log.'
      : 'Press and hold for 1.2 seconds. Release to cancel.';
  }

  async function clearLog() {
    clearBtn.disabled = true;
    try {
      await clearErrorLog();
      allEntries = [];
      renderEntries();
      showStatus('Diagnostic log cleared.');
    } catch (error) { showStatus(error.message); }
    finally { clearBtn.disabled = false; }
  }

  function startHold(input) {
    if (holdActive || clearBtn.disabled || prefersReducedMotion()) return;
    holdFill?.getAnimations().forEach((animation) => animation.finish());
    void clearBtn.offsetWidth;
    holdActive = true;
    activeInput = input;
    clearBtn.classList.add('is-holding');
  }

  function cancelHold() {
    if (!holdActive) return;
    holdActive = false;
    activeInput = null;
    clearBtn.classList.remove('is-holding');
  }

  function finishHold() {
    if (!holdActive) return;
    holdActive = false;
    activeInput = null;
    clearBtn.classList.remove('is-holding');
    clearLog();
  }

  holdFill?.addEventListener('transitionend', (event) => {
    if (event.target !== holdFill) return;
    if (event.propertyName !== 'clip-path') return;
    if (!clearBtn.classList.contains('is-holding')) return;
    finishHold();
  });

  clearBtn.addEventListener('pointerdown', (event) => {
    if (prefersReducedMotion()) return;
    if (event.button !== 0 || !event.isPrimary || clearBtn.disabled) return;
    if (holdActive) return;
    clearBtn.setPointerCapture(event.pointerId);
    startHold(event.pointerId);
  });

  clearBtn.addEventListener('lostpointercapture', (event) => {
    if (activeInput === event.pointerId) cancelHold();
  });

  clearBtn.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && holdActive) {
      event.preventDefault();
      event.stopPropagation();
      cancelHold();
      return;
    }
    if (prefersReducedMotion()) return;
    if (event.key !== ' ' && event.key !== 'Enter') return;
    if (event.metaKey || event.ctrlKey || event.altKey || clearBtn.disabled) return;
    event.preventDefault();
    suppressClick = true;
    if (event.repeat || holdActive) return;
    startHold(event.key);
  });

  clearBtn.addEventListener('keyup', (event) => {
    if (!prefersReducedMotion() && event.key === ' ') event.preventDefault();
    if (activeInput === event.key) cancelHold();
  });

  clearBtn.addEventListener('blur', cancelHold);
  window.addEventListener('blur', cancelHold);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelHold();
  });

  clearBtn.addEventListener('click', (event) => {
    if (prefersReducedMotion()) {
      clearLog();
      return;
    }
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    if (event.detail === 0 && !holdActive) clearLog();
  });

  syncHoldInstructions();
  reducedMotion.addEventListener('change', syncHoldInstructions);

  refresh();
});
