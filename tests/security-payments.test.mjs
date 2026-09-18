import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const sql=fs.readFileSync('supabase/migrations/024_security_stage6_payments_antifraud.sql','utf8');
const hook=fs.readFileSync('supabase/functions/mercadopago-webhook/index.ts','utf8');
const create=fs.readFileSync('supabase/functions/create-payment-preference/index.ts','utf8');
test('payment credit validates amount and currency',()=>{assert.match(hook,/expectedAmount/);assert.match(hook,/currency !== 'BRL'/);assert.match(hook,/Payment integrity check failed/);});
test('payment anomalies have admin-only audit trail',()=>{assert.match(sql,/payment_security_events enable row level security/);assert.match(sql,/record_payment_security_event/);});
test('ledger has provider reference idempotency primitive',()=>{assert.match(sql,/wallet_ledger_provider_reference_unique/);});
test('payment endpoint CORS is allowlisted and no-store',()=>{assert.match(create,/ALLOWED_ORIGINS/);assert.match(create,/Cache-Control':'no-store'/);assert.doesNotMatch(create,/Access-Control-Allow-Origin': '\*'/);});
