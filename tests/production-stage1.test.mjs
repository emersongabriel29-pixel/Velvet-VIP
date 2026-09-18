import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const migration=read('supabase/migrations/026_production_stage1_blockers.sql');
const legacyCheckout=read('supabase/functions/create-checkout/index.ts');
const legacyWebhook=read('supabase/functions/payment-webhook/index.ts');
const supabaseClient=read('src/lib/supabase.ts');

test('self-declared DOB never marks age as verified',()=>{
  assert.match(migration,/birth,safe_role,false,null,null,null/);
  assert.match(migration,/record_age_verification/);
  assert.match(migration,/verification_provenance_required/);
});
test('existing unproven age flags are invalidated',()=>{
  assert.match(migration,/age_verified=true and age_verification_source is null/);
});
test('wallet credit functions persist provider idempotency key',()=>{
  assert.match(migration,/provider,reference_id,entry_type/);
  assert.match(migration,/on conflict \(provider,reference_id,entry_type\)/);
});
test('legacy checkout is no longer wildcard CORS and is rate limited',()=>{
  assert.doesNotMatch(legacyCheckout,/Access-Control-Allow-Origin': '\*'/);
  assert.match(legacyCheckout,/ALLOWED_ORIGINS/);
  assert.match(legacyCheckout,/consume_rate_limit/);
});
test('legacy webhook requires HMAC freshness and amount integrity',()=>{
  assert.match(legacyWebhook,/MERCADOPAGO_WEBHOOK_SECRET/);
  assert.match(legacyWebhook,/Math\.abs\(now-ts\)>300/);
  assert.match(legacyWebhook,/transaction_amount/);
  assert.match(legacyWebhook,/currency!==\s*'BRL'/);
});
test('production backend configuration fails closed',()=>{
  assert.match(supabaseClient,/productionBuild && !isSupabaseConfigured && !explicitDemoMode/);
});
