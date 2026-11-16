import { test, expect, closedOverlay } from './fixtures.mjs';
import { intent, lockHost, onboard, configure, start, visit } from './steps.mjs';

const cardHost = '#intentlock-checkin-host';

async function begin(journey) {
  const home = await onboard(journey);
  await configure(journey);
  await home.reload();
  const id = await start(home, journey);
  return { home, id };
}

async function ask(journey, path = '/watch') {
  const page = await visit(journey, 'video.localhost', path);
  await expect(page.locator(cardHost)).toBeVisible();
  return page;
}

const activeCheckins = async (journey) => (await journey.storage()).activeSession.checkins;

test('a video unrelated to the intent gets a non-blocking check-in; "yes" lasts for this session only', async ({ journey }) => {
  const { home } = await begin(journey);
  const page = await ask(journey);
  const card = await closedOverlay(page);
  try {
    // It names the intent and says why; it is not the lock.
    await expect.poll(() => card.read('.intent', 'this.textContent')).toContain(intent);
    await expect.poll(() => card.read('#intentlock-checkin-why', 'this.textContent')).toContain('watching a video');
    await expect(page.locator(lockHost)).not.toBeVisible();
    await expect(page.locator('main')).not.toHaveAttribute('inert', '');
    await page.locator('#work-action').click(); // the page stays usable
    expect(Object.keys((await journey.storage()).interventionStates || {})).toHaveLength(0);

    await card.click('#intentlock-checkin-yes');
    await expect(page.locator(cardHost)).not.toBeVisible();
    await expect.poll(async () => (await activeCheckins(journey)).aligned).toEqual(['host:video.localhost']);
    const stored = await journey.storage();
    expect(stored.activeSession.events.find(e => e.actionType === 'CHECKIN').answer).toBe('yes');
    expect(stored.relatedDomainMarks || {}).toEqual({}); // never a permanent allow
    expect(stored.heuristicPolicy.customAllowDomains || []).not.toContain('video.localhost');

    // Not asked again this session.
    await page.reload();
    await page.waitForTimeout(2500);
    await expect(page.locator(cardHost)).not.toBeVisible();
  } finally {
    await card.close();
  }

  // The answer ends with the session: a new session asks again.
  await home.bringToFront();
  await home.getByRole('button', { name: 'End session', exact: true }).click();
  await home.getByRole('dialog').getByRole('button', { name: 'End session', exact: true }).click();
  await expect(home.getByRole('heading', { name: 'Session report', exact: true })).toBeVisible();
  await home.goto(journey.extensionUrl('newtab.html'));
  await start(home, journey);
  expect((await journey.storage()).activeSession.checkins?.aligned || []).toEqual([]);
  await page.bringToFront();
  await expect(page.locator(cardHost)).toBeVisible(); // the still-open tab is asked again in the new session
});

test('"just a quick check" grants a grace period, then asks again', async ({ journey }) => {
  await begin(journey);
  const page = await ask(journey);
  const card = await closedOverlay(page);
  try {
    await card.click('#intentlock-checkin-quick');
    await expect(page.locator(cardHost)).not.toBeVisible();
    await expect.poll(async () => (await activeCheckins(journey)).sites['host:video.localhost']?.answer).toBe('quick');
    const grace = (await activeCheckins(journey)).sites['host:video.localhost'].graceUntil;
    expect(grace).toBeGreaterThan(Date.now() + 4 * 60_000);

    await page.reload();
    await page.waitForTimeout(2500);
    await expect(page.locator(cardHost)).not.toBeVisible(); // inside the grace period

    // Expire the grace period and the global gap, as five minutes would.
    await journey.worker.evaluate(async () => {
      const { activeSession } = await chrome.storage.local.get('activeSession');
      activeSession.checkins.lastAt = 0;
      activeSession.checkins.sites['host:video.localhost'].graceUntil = 1;
      await chrome.storage.local.set({ activeSession });
    });
    await page.reload();
    await expect(page.locator(cardHost)).toBeVisible();
  } finally {
    await card.close();
  }
});

test('"I drifted" takes the user back to the previous page', async ({ journey }) => {
  await begin(journey);
  const page = await visit(journey, 'work.localhost', '/quarterly/report');
  const workUrl = page.url();
  await page.goto(journey.fixtureUrl('video.localhost', '/watch'));
  await expect(page.locator(cardHost)).toBeVisible();
  const card = await closedOverlay(page);
  try {
    await card.click('#intentlock-checkin-drifted');
    await expect.poll(() => page.url()).toBe(workUrl);
    await expect.poll(async () => (await activeCheckins(journey)).drifted).toEqual(['video.localhost']);
  } finally {
    await card.close();
  }
});

test('"Close this tab" closes the tab', async ({ journey }) => {
  await begin(journey);
  const page = await ask(journey);
  const card = await closedOverlay(page);
  try {
    await card.click('#intentlock-checkin-close');
    await expect.poll(() => page.isClosed()).toBe(true);
  } finally {
    await card.close().catch(() => {});
  }
});

test('the card is reachable by keyboard and an explicit block still locks after a "yes"', async ({ journey }) => {
  await begin(journey);
  const page = await ask(journey);
  const card = await closedOverlay(page);
  try {
    // With nothing focused on the page, the card takes focus on its first answer; Tab reaches the rest.
    await expect.poll(() => card.read('#intentlock-checkin-yes', 'this.getRootNode().activeElement === this')).toBe(true);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect.poll(() => card.read('#intentlock-checkin-drifted', 'this.getRootNode().activeElement === this')).toBe(true);
  } finally {
    await card.close();
  }
  // Pretend an earlier "yes" covered a host the user has explicitly blocked.
  await journey.worker.evaluate(async () => {
    const { activeSession } = await chrome.storage.local.get('activeSession');
    activeSession.checkins = { lastAt: 0, sites: {}, pending: {}, aligned: ['host:distraction.localhost'], drifted: [], count: 1 };
    await chrome.storage.local.set({ activeSession });
  });
  const blocked = await visit(journey, 'distraction.localhost', '/feed');
  await expect(blocked.locator(lockHost)).toBeVisible();
  await expect(blocked.locator(cardHost)).not.toBeVisible();
});
