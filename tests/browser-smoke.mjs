/**
 * Experimental real-browser acceptance probe. A tiny model is only a loading
 * and generation fixture, never a document extraction accuracy benchmark.
 */
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { statSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';

mkdirSync('tmp', { recursive: true });
const fixture = resolve('tmp/stories260K.gguf');
assert.ok(statSync(fixture).size > 1_000_000, 'Fixture must contain the GGUF weights');
const browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const external = [];
try {
  await page.route('**/*', async route => {
    const url = route.request().url();
    if (/^(https?|wss?):/i.test(url)) {
      external.push(url);
      await route.abort();
    } else await route.continue();
  });
  page.on('console', message => {
    if (message.type() === 'error') process.stderr.write('[browser console] ' + message.text() + '\n');
  });
  page.on('pageerror', e => process.stderr.write('[browser error] ' + e.message + '\n'));
  const localUrl = pathToFileURL(resolve('dist/index.html')).href + '#/documents';
  await page.goto(localUrl, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /OCR \+ LLM Pipeline Studio/i }).waitFor({ timeout: 10000 });
  await page.screenshot({ path: 'tmp/smoke-dark.png', fullPage: true });
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await page.screenshot({ path: 'tmp/smoke-light.png', fullPage: true });
  assert.equal(
    await page.evaluate(() => getComputedStyle(document.body).backgroundColor),
    'rgb(255, 255, 255)',
    'Light theme must be pure white'
  );

  await page.locator('input[type="file"][accept=".gguf"]').setInputFiles(fixture);
  await page.getByRole('button', { name: 'Load model' }).click();
  await page.getByText('Loaded: stories260K.gguf').waitFor({ timeout: 120000 });
  await page.getByRole('button', { name: 'Test model' }).click();
  await page.getByText(/Your local model generated text/i).waitFor({ timeout: 90000 });
  assert.equal(external.length, 0, 'No external network requests are allowed during file:// runtime');
  console.log('REAL BROWSER: local HTML + GGUF loading + text generation completed without external network requests.');
} catch (err) {
  const text = await page.locator('[role="alert"]').allTextContents().catch(() => []);
  console.error('Browser alerts:', text);
  await page.screenshot({ path: 'tmp/smoke-failure.png', fullPage: true }).catch(() => undefined);
  throw err;
} finally {
  await browser.close();
}
