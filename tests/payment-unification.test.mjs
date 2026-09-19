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

test('canonical webhook settles and reverses PPV idempotently',()=>{
  assert.match(webhook,/session\.kind === 'pay_per_view'/);
  assert.match(webhook,/kind:'ppv'/);
  assert.match(webhook,/reverse_creator_credit/);
  assert.match(webhook,/financial_transactions/);
  assert.match(webhook,/provider_reference/);
});


test('Mercado Pago webhook accepts second or millisecond timestamps and normalizes data.id',()=>{
  assert.match(webhook,/toLowerCase\(\)/);
  assert.match(webhook,/tsValue>10_000_000_000\?Math\.floor\(tsValue\/1000\):tsValue/);
  assert.match(webhook,/if\(dataId\)manifest\.push/);
  assert.match(webhook,/if\(requestId\)manifest\.push/);
  assert.match(webhook,/if\(tsRaw\)manifest\.push/);
});
