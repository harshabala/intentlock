import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { test, expect } from '../../tests/browser/fixtures.mjs';
import { configure, onboard, start, visit } from '../../tests/browser/steps.mjs';

const out = process.env.INTENTLOCK_CHECKIN_SHOT;
const cardHost = '#intentlock-checkin-host';

test('capture the check-in card', async ({ journey }) => {
  test.skip(!out, 'set INTENTLOCK_CHECKIN_SHOT to a png path');
  await mkdir(dirname(out), { recursive: true });
  const home = await onboard(journey);
  await configure(journey);
  await home.reload();
  await start(home, journey);
  const page = await visit(journey, 'video.localhost', '/watch');
  await expect(page.locator(cardHost)).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({ path: out });
});
