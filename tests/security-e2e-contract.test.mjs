import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const stage2=read('supabase/migrations/020_security_stage2_rls.sql');
const stage3=read('supabase/migrations/021_security_stage3_private_media.sql');
const stage4=read('supabase/migrations/022_security_stage4_api_rate_limits.sql');
const stage5=read('supabase/migrations/023_security_stage5_admin_auth.sql');
const stage6=read('supabase/migrations/024_security_stage6_payments_antifraud.sql');
const stage7=read('supabase/migrations/025_security_stage7_observability.sql');
const webhook=read('supabase/functions/mercadopago-webhook/index.ts');

test('E2E contract: restricted accounts cannot publish/message/purchase',()=>{
 assert.match(stage2,/has_active_restriction\('publish'\)/);
 assert.match(stage2,/has_active_restriction\('message'\)/);
 assert.match(stage2,/has_active_restriction\('purchase'\)/);
});
test('E2E contract: private media requires owner-scoped storage path',()=>{
 assert.match(stage3,/velvet-media/);assert.match(stage3,/auth\.uid\(\)/);assert.match(stage3,/storage\.foldername/);
});
test('E2E contract: API abuse and replay defenses exist',()=>{
 assert.match(stage4,/consume_rate_limit/);assert.match(webhook,/Math\.abs\(now - ts\) > 300/);
});
test('E2E contract: privileged admin path is server enforced',()=>{
 assert.match(stage5,/assert_admin/);assert.match(stage5,/admin_security_events/);
});
test('E2E contract: payment integrity and provider event idempotency exist',()=>{
 assert.match(stage6,/payment_provider_events/);assert.match(stage6,/unique\(provider,external_event_id\)/);
 assert.match(webhook,/Payment integrity check failed/);
});
test('E2E contract: security alerts and recovery evidence are protected',()=>{
 assert.match(stage7,/security_alerts enable row level security/);assert.match(stage7,/recovery_verifications enable row level security/);
});
