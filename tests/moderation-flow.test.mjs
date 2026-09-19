import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const migration=fs.readFileSync('supabase/migrations/20260919154000_moderation_flow_hardening.sql','utf8');
const admin=fs.readFileSync('src/components/admin/AdminCommandCenter.tsx','utf8');
const punish=fs.readFileSync('src/components/admin/PunishmentsPanel.tsx','utf8');

test('canonical reports feed the admin moderation queue',()=>{
  assert.match(admin,/from\('reports'\)/);
  assert.doesNotMatch(admin,/from\('safety_reports'\).*pending/);
  assert.match(admin,/open_content_report_case/);
});
test('report-to-case link preserves legacy safety report relation',()=>{
  assert.match(migration,/add column if not exists content_report_id uuid references public\.reports/);
  assert.match(migration,/content_report_id=p_report_id/);
});
test('punishment is atomic and admin-only',()=>{
  assert.match(migration,/create or replace function public\.apply_moderation_action/);
  assert.match(migration,/not public\.is_admin\(\)/);
  assert.match(migration,/insert into public\.moderation_actions/);
  assert.match(migration,/insert into public\.account_restrictions/);
  assert.match(migration,/insert into public\.moderation_audit_log/);
  assert.match(punish,/apply_moderation_action/);
});
test('revocation atomically disables restrictions and writes audit',()=>{
  assert.match(migration,/revoke_moderation_action/);
  assert.match(migration,/set is_active=false/);
  assert.match(punish,/revoke_moderation_action/);
});
