import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const sql=fs.readFileSync('supabase/migrations/022_security_stage4_api_rate_limits.sql','utf8');
const mp=fs.readFileSync('supabase/functions/mercadopago-webhook/index.ts','utf8');
const pay=fs.readFileSync('supabase/functions/create-payment-preference/index.ts','utf8');
test('rate limit storage is RLS locked and RPC is server-only',()=>{assert.match(sql,/api_rate_limits enable row level security/);assert.match(sql,/revoke all on function public\.consume_rate_limit.*authenticated/i);});
test('payment creation is throttled and restriction aware',()=>{assert.match(pay,/consume_rate_limit/);assert.match(pay,/p_limit: 10/);assert.match(pay,/Account restricted/);});
test('Mercado Pago webhook rejects replay-age signatures',()=>{assert.match(mp,/Math\.abs\(now - ts\) > 300/);assert.match(mp,/Stale signature/);});
