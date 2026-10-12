import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { RUNTIME_FILES } from '../scripts/package-release.mjs';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const manifest = JSON.parse(await read('manifest.json'));

test('every manifest permission is justified in the store listing', async () => {
  const listing = await read('store/LISTING.md');
  for (const permission of manifest.permissions) {
    assert.match(listing, new RegExp(`\\*\\*${permission}\\*\\*`), `listing lacks justification for ${permission}`);
  }
  for (const host of manifest.host_permissions) {
    assert.ok(listing.includes(host), `listing lacks justification for host permission ${host}`);
  }
});

test('manifest requests no permissions beyond the reviewed set', () => {
  assert.deepEqual([...manifest.permissions].sort(), ['alarms', 'idle', 'storage', 'tabGroups', 'tabs']);
  assert.deepEqual([...manifest.host_permissions].sort(), ['http://*/*', 'https://*/*']);
});

test('extension page CSP forbids remote and inline script', () => {
  const csp = manifest.content_security_policy.extension_pages;
  assert.match(csp, /script-src 'self'/);
  assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval|https?:/);
});

test('store listing links the published privacy policy and fits store limits', async () => {
  const listing = await read('store/LISTING.md');
  assert.match(listing, /privacy\.html/);
  const short = listing.split('## Short description')[1].split('##')[0].trim();
  assert.ok(short.length <= 132, `short description is ${short.length} chars (limit 132)`);
});

test('packaged files exist and exclude legacy, docs, tests and dev files', async () => {
  for (const file of RUNTIME_FILES) await access(new URL(`../${file}`, import.meta.url));
  for (const file of RUNTIME_FILES) {
    assert.doesNotMatch(file, /^(legacy-extension-source|docs|tests|scripts|store|node_modules)\//);
    assert.doesNotMatch(file, /\.(md|mjs|py|map)$/);
    assert.doesNotMatch(file, /(^|\/)\.env/);
  }
});

test('every script and page the manifest references is packaged', () => {
  const referenced = new Set([
    manifest.background.service_worker,
    manifest.chrome_url_overrides.newtab,
    manifest.options_ui.page,
    manifest.action.default_popup,
    ...Object.values(manifest.icons),
    ...manifest.content_scripts.flatMap((entry) => entry.js),
    ...manifest.web_accessible_resources.flatMap((entry) => entry.resources),
  ]);
  for (const file of referenced) assert.ok(RUNTIME_FILES.includes(file), `${file} is not packaged`);
});

test('required public documentation exists', async () => {
  for (const file of ['README.md', 'AGENTS.md', 'ARCHITECTURE.md', 'CONTRIBUTING.md', 'SECURITY.md', 'CHANGELOG.md', 'docs/privacy-policy.md', 'docs/site/privacy.html']) {
    await access(new URL(`../${file}`, import.meta.url));
  }
});
