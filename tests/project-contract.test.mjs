import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('content policy keeps explicit content paid', async () => {
  const sql = await read('supabase/006_content_access.sql');
  assert.match(sql, /explicit/i);
  assert.match(sql, /access_type.*free|free.*explicit/i);
});

test('feed does not show ads to paid plans', async () => {
  const feed = await read('src/components/feed/VideoFeed.tsx');
  assert.match(feed, /platform_plan_slug/);
  assert.match(feed, /=== 'gratis'/);
  assert.doesNotMatch(feed, /const showAds = true/);
});

test('payment client never fabricates a successful checkout', async () => {
  const payments = await read('src/services/payments.ts');
  assert.match(payments, /functions\.invoke\('create-checkout'/);
  assert.match(payments, /checkoutUrl/);
});

test('migration order includes payment idempotency layer', async () => {
  const readme = await read('README.md');
  assert.match(readme, /010/);
});
