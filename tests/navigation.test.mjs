import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROUTES, routeFromHash } from '../src/routes.ts';
import { normalizeTheme } from '../src/theme.ts';

test('route manifest contains unique file-safe hash URLs', () => {
  assert.equal(new Set(ROUTES.map(x => x.id)).size, ROUTES.length);
  for (const route of ROUTES) {
    assert.equal(route.path, '#/' + route.id);
    assert.equal(routeFromHash(route.path), route.id);
  }
});
test('bad or unknown hashes fall back to Documents', () => {
  for (const value of ['', '#/', '#/missing', '#/../../etc', '#http://example']) {
    assert.equal(routeFromHash(value), 'documents');
  }
});
test('theme normalization rejects unknown values', () => {
  assert.equal(normalizeTheme('light'), 'light');
  assert.equal(normalizeTheme('dark'), 'dark');
  assert.equal(normalizeTheme('invalid'), 'dark');
  assert.equal(normalizeTheme(null), 'dark');
});
