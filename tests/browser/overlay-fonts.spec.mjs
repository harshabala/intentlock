import { test, expect } from './fixtures.mjs';
import { onboard, configure, start, visit, locked } from './steps.mjs';

// The lock overlay lives in a closed shadow root. Chrome ignores @font-face
// rules declared inside shadow trees, so the bundled fonts must be registered
// on the document or the overlay silently falls back to system fonts.
async function renderedFonts(page, className) {
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    const { root } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
    const find = (node) => {
      const attrs = node.attributes || [];
      for (let i = 0; i < attrs.length; i += 2) {
        if (attrs[i] === 'class' && attrs[i + 1].split(' ').includes(className)) return node;
      }
      for (const child of [...(node.children || []), ...(node.shadowRoots || [])]) {
        const match = find(child);
        if (match) return match;
      }
      return null;
    };
    const node = find(root);
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId: node.nodeId });
    return fonts.map(font => font.familyName);
  } finally {
    await cdp.detach();
  }
}

test('the lock overlay renders with the bundled fonts', async ({ journey }) => {
  const home = await onboard(journey);
  await configure(journey);
  await home.reload();
  await start(home, journey);
  const distraction = await visit(journey, 'distraction.localhost', '/feed');
  await locked(distraction, journey);
  await expect.poll(() => renderedFonts(distraction, 'reason')).toEqual(['IBM Plex Mono']);
  await expect.poll(() => renderedFonts(distraction, 'intent-quote')).toEqual(['Source Serif 4']);
});
