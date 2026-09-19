import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync('supabase/migrations/20260918111750_020_security_stage2_rls.sql','utf8');
test('product-suite sensitive tables enable RLS',()=>{
 for(const t of ['coupons','content_bundles','bundle_videos','creator_goals','premieres','live_clips'])
  assert.match(sql,new RegExp(`alter table public\\.${t} enable row level security`,'i'));
});
test('write paths enforce disciplinary restrictions',()=>{
 for(const scope of ['publish','live','comment','message','purchase','monetization'])
  assert.match(sql,new RegExp(`has_active_restriction\\('${scope}'\\)`));
});
test('profile privileged fields are protected server-side',()=>{
 for(const f of ['role','age_verified','is_blocked','is_suspended','wallet_balance'])
  assert.match(sql,new RegExp(`new\\.${f} := old\\.${f}`));
});
