import { test, expect } from './fixtures.mjs';
import { onboard, start, visit } from './steps.mjs';

// Audits the real rendered extension pages: document language and title,
// accessible names for every visible control, image alternatives, and WCAG AA
// text contrast (4.5:1, 3:1 for large text) computed from the live styles.
function audit() {
  const problems = [];
  const parse = (value) => {
    const m = value.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a = 1] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { r, g, b, a };
  };
  const luminance = ({ r, g, b }) => {
    const c = [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const blend = (top, bottom) => ({
    r: top.r * top.a + bottom.r * (1 - top.a),
    g: top.g * top.a + bottom.g * (1 - top.a),
    b: top.b * top.a + bottom.b * (1 - top.a),
    a: 1,
  });
  const background = (el) => {
    const layers = [];
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.backgroundImage !== 'none') return null; // gradients/images: not computable
      const color = parse(style.backgroundColor);
      if (color && color.a > 0) layers.push(color);
      if (color && color.a === 1) break;
    }
    return layers.reduceRight((acc, layer) => blend(layer, acc), { r: 255, g: 255, b: 255, a: 1 });
  };
  const visible = (el) => {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0
      && !el.closest('[hidden], [inert], [aria-hidden="true"]') && Number(style.opacity) > 0;
  };

  if (!document.documentElement.lang) problems.push('html has no lang');
  if (!document.title.trim()) problems.push('document has no title');

  for (const el of document.querySelectorAll('button, input:not([type=hidden]), select, textarea, a[href], [role=button], [role=switch], [role=tab]')) {
    if (!visible(el)) continue;
    const labelled = el.getAttribute('aria-label')?.trim()
      || (el.getAttribute('aria-labelledby') || '').split(/\s+/).some(id => document.getElementById(id)?.textContent.trim())
      || (el.labels && [...el.labels].some(label => label.textContent.trim()))
      || el.title?.trim()
      || (['button', 'submit'].includes(el.type) || !('value' in el) || el.tagName === 'BUTTON' ? el.textContent.trim() : '')
      || (el.type === 'submit' && el.value);
    if (!labelled) problems.push(`unlabelled ${el.tagName.toLowerCase()}#${el.id || ''}.${el.className || ''}`);
  }
  for (const img of document.querySelectorAll('img')) {
    if (visible(img) && !img.hasAttribute('alt')) problems.push(`img without alt: ${img.src}`);
  }

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const checked = new Set();
  for (let text = walker.nextNode(); text; text = walker.nextNode()) {
    const el = text.parentElement;
    if (!text.textContent.trim() || checked.has(el) || !visible(el)) continue;
    checked.add(el);
    if (el.closest('button:disabled, input:disabled, [aria-disabled="true"]')) continue; // exempt per WCAG 1.4.3
    const style = getComputedStyle(el);
    const fg = parse(style.color);
    const bg = background(el);
    if (!fg || !bg) continue;
    const fgSolid = blend(fg, bg);
    const [hi, lo] = [luminance(fgSolid), luminance(bg)].sort((a, b) => b - a);
    const ratio = (hi + 0.05) / (lo + 0.05);
    const size = parseFloat(style.fontSize);
    const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700);
    const required = large ? 3 : 4.5;
    if (ratio < required) {
      problems.push(`contrast ${ratio.toFixed(2)} < ${required} for "${text.textContent.trim().slice(0, 40)}" (${el.tagName.toLowerCase()}.${el.className})`);
    }
  }
  return problems;
}

const pages = ['newtab.html', 'options.html', 'popup.html', 'history.html', 'analytics.html', 'diagnostics.html'];

for (const colorScheme of ['light', 'dark']) {
  test(`extension pages pass the accessibility audit (${colorScheme})`, async ({ journey }) => {
    const home = await onboard(journey);
    await home.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    const onboarding = await home.evaluate(audit);
    await start(home, journey);
    // A real fixture page so the active session has something to report.
    await visit(journey, 'work.localhost', '/quarterly/report');
    const results = { 'newtab.html (onboarding)': onboarding, 'newtab.html (session)': await home.evaluate(audit) };
    for (const path of pages.slice(1)) {
      const page = await journey.context.newPage();
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      await page.goto(journey.extensionUrl(path));
      await page.waitForLoadState('networkidle');
      results[path] = await page.evaluate(audit);
      await page.close();
    }
    const intervention = await journey.context.newPage();
    await intervention.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await intervention.goto(journey.extensionUrl('intervention.html'));
    await intervention.waitForLoadState('networkidle');
    results['intervention.html'] = await intervention.evaluate(audit);
    expect(Object.fromEntries(Object.entries(results).filter(([, problems]) => problems.length))).toEqual({});
  });
}

test('the accessibility audit detects low contrast and unlabelled controls', async ({ journey }) => {
  const page = await visit(journey, 'work.localhost', '/audit-self-test');
  const problems = await page.evaluate((source) => {
    document.body.insertAdjacentHTML('beforeend',
      '<p style="color:#bbb;background:#fff">Faint text</p><input id="nameless"><button></button>');
    return (0, eval)(`(${source})`)();
  }, audit.toString());
  expect(problems.some(p => p.startsWith('contrast') && p.includes('Faint text'))).toBe(true);
  expect(problems.some(p => p.includes('unlabelled input#nameless'))).toBe(true);
  expect(problems.some(p => p.startsWith('unlabelled button'))).toBe(true);
});
