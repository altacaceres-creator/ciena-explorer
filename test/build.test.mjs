// The single-file page: it builds, it is stamped, and it lays out on a phone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dist = readFileSync(new URL('../dist/netlandia.html', import.meta.url), 'utf8');

test('the single-file page has the phone viewport and a build date', () => {
  assert.match(dist, /<meta name="viewport" content="width=device-width[^"]*">/);
  assert.ok(!dist.includes("'__BUILD__'"), 'the build stamps its date');
  assert.match(dist, /const BUILD = "\d{4}-\d\d-\d\d \d\d:\d\d UTC"/);
});
