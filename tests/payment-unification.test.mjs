import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const modal=fs.readFileSync('src/components/creator/SubscribeModal.tsx','utf8');
const client=fs.readFileSync('src/services/payments.ts','utf8');
const checkout=fs.readFileSync('supabase/functions/create-checkout/index.ts','utf8');
const webhook=fs.readFileSync('supabase/functions/payment-webhook/index.ts','utf8');

test('creator subscription and PPV use the canonical checkout client',()=>{
  assert.match(client,/pay_per_view/);
  assert.match(modal,/startCheckout\(\{kind:'pay_per_view',videoId:video\.id\}\)/);
  assert.doesNotMatch(modal,/create-payment-preference/);
});

test('canonical checkout validates PPV from server-side video data',()=>{
  assert.match(checkout,/kind === 'pay_per_view'/);
  assert.match(checkout,/premium_price/);
  assert.match(checkout,/Already purchased|já foi comprado/i);
  assert.match(checkout,/moderation_status/);
});

test('canonical webhook delegates settlement to a single database transaction',()=>{
  assert.match(webhook,/rpc\('settle_verified_payment'/);
  assert.doesNotMatch(webhook,/from\('payment_events'\)\.insert/);
});


test('Mercado Pago webhook accepts second or millisecond timestamps and normalizes data.id',()=>{
  assert.match(webhook,/toLowerCase\(\)/);
  assert.match(webhook,/tsValue>10_000_000_000\?Math\.floor\(tsValue\/1000\):tsValue/);
  assert.match(webhook,/if\(dataId\)manifest\.push/);
  assert.match(webhook,/if\(requestId\)manifest\.push/);
  assert.match(webhook,/if\(tsRaw\)manifest\.push/);
});

test('legacy webhook records payment events only after provider and local lookup succeed',()=>{
  const legacy=fs.readFileSync('supabase/functions/mercadopago-webhook/index.ts','utf8');
  const providerLookup=legacy.indexOf('const mpResponse = await fetch');
  const eventInsert=legacy.indexOf("const inserted = await admin.from('webhook_events').insert", providerLookup);
  assert.ok(providerLookup >= 0, 'provider lookup exists');
  assert.ok(eventInsert > providerLookup, 'payment idempotency marker is written after provider lookup');
  assert.match(legacy,/if \(!dbPayment\) return new Response\('Payment record not found', \{ status: 404 \}\);[\s\S]*?const inserted = await admin\.from\('webhook_events'\)\.insert/);
});

test('lockfile pins patched source-map-js release',()=>{
  const lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'));
  assert.equal(lock.packages['node_modules/source-map-js']?.version,'1.2.2');
  assert.match(lock.packages['node_modules/source-map-js']?.resolved || '',/source-map-js-1\.2\.2\.tgz$/);
});
