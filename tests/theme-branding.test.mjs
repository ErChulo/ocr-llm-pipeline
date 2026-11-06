import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const base = new URL('../src/', import.meta.url);
test('the exact dark PNG and light SVG assets are installed', () => {
  const png = readFileSync(new URL('assets/logo-negro.png', base));
  const svg = readFileSync(new URL('assets/logo.svg', base), 'utf8');
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.match(svg, /<svg\b/i);
  assert.doesNotMatch(svg, /<script\b|<foreignObject\b|javascript:/i);
});
test('canvases match logo backgrounds, and theme uses a small accessible icon', () => {
  const css = readFileSync(new URL('styles.css', base), 'utf8');
  const app = readFileSync(new URL('App.tsx', base), 'utf8');
  assert.match(css, /--canvas:#000000/);
  assert.match(css, /--canvas:#FFFFFF/);
  assert.match(css, /\.theme-toggle\{[^}]*44px/);
  assert.match(app, /className="theme-toggle"/);
  assert.match(app, /Switch to light theme/);
  assert.match(app, /Switch to dark theme/);
  assert.match(app, /logo-negro\.png/);
  assert.match(app, /logo\.svg/);
});
