import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { test } from '../../tests/browser/fixtures.mjs';
import { onboard, configure, start, visit, locked } from '../../tests/browser/steps.mjs';

// Captures the five Chrome Web Store screenshots (1280x800) from the real
// unpacked extension against synthetic local pages. Output is git-ignored;
// the owner reviews and picks the shots before uploading them.
const outDir = fileURLToPath(new URL('../../store/screenshots/generated/', import.meta.url));
const size = { width: 1280, height: 800 };

test('capture store screenshots', async ({ journey }) => {
  await mkdir(outDir, { recursive: true });
  const shot = (page, name) => page.screenshot({ path: `${outDir}${name}.png` });

  const home = await onboard(journey);
  // Policies apply to sessions started afterwards, as in the journeys.
  const options = await configure(journey);
  await options.setViewportSize(size);
  await home.reload();
  await home.bringToFront();
  await home.setViewportSize(size);
  await home.locator('#intent-input').fill('Draft quarterly report');
  await shot(home, '1-new-tab-intent-form');
  await home.locator('#intent-input').fill('');
  await start(home, journey);
  await shot(home, '2-active-session');

  const distraction = await visit(journey, 'distraction.localhost', '/feed');
  await distraction.setViewportSize(size);
  await locked(distraction, journey);
  await shot(distraction, '3-intervention');

  await options.bringToFront();
  await options.evaluate(() => document.querySelector('#category-grid').closest('.section').scrollIntoView());
  await shot(options, '4-settings-site-policies');
  await options.evaluate(() => window.scrollTo(0, 0));
  await shot(options, '5-settings-ai-optional');
});
