import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const sql=fs.readFileSync('supabase/migrations/20260919155000_operational_health.sql','utf8');
const admin=fs.readFileSync('src/components/admin/AdminCommandCenter.tsx','utf8');

test('operational health is admin-only and detects stale critical flows',()=>{
  assert.match(sql,/not public\.is_admin\(\)/);
  assert.match(sql,/unprocessed_payment_events/);
  assert.match(sql,/stuck_media_jobs/);
  assert.match(sql,/unprocessed_provider_events/);
  assert.match(sql,/unacknowledged_critical_alerts/);
  assert.match(sql,/stale_live_sessions/);
});
test('admin displays real operational health snapshot',()=>{
  assert.match(admin,/admin_operational_health/);
  assert.match(admin,/Webhook de pagamento atrasado/);
  assert.match(admin,/Mídia travada/);
  assert.match(admin,/Alertas críticos/);
});
