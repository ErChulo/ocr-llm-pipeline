import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
test('Guide opener is not positioned over the PBGC logo', () => {
  const css = readFileSync(new URL('../src/UserGuideDrawer.css', import.meta.url), 'utf8');
  assert.match(css, /\.guide-host\{position:fixed;[^}]*bottom:58px/);
  assert.doesNotMatch(css, /\.guide-host\{[^}]*top:74px/);
  assert.match(css, /@media print/);
});
