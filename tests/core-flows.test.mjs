import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const explore=fs.readFileSync('src/components/explore/ExplorePage.tsx','utf8');
const notifications=fs.readFileSync('src/components/activity/NotificationsPage.tsx','utf8');
const report=fs.readFileSync('src/components/feed/ReportModal.tsx','utf8');
const migration=fs.readFileSync('supabase/migrations/20260919150000_core_flow_hardening.sql','utf8');

test('Explore reads production catalog from Supabase and local data only in explicit demo mode',()=>{
  assert.match(explore,/system_categories/);
  assert.match(explore,/creator:creators/);
  assert.match(explore,/isDemoMode/);
  assert.doesNotMatch(explore,/recordSearch/);
});

test('Notifications use persisted rows and realtime updates',()=>{
  assert.match(notifications,/from\('notifications'\)/);
  assert.match(notifications,/postgres_changes/);
  assert.match(notifications,/public_profiles/);
  assert.match(notifications,/isDemoMode/);
});

test('Reports use an authenticated rate-limited RPC',()=>{
  assert.match(report,/submit_content_report/);
  assert.match(migration,/consume_rate_limit\('content_report'/);
  assert.match(migration,/auth\.uid\(\)/);
  assert.match(migration,/grant execute on function public\.submit_content_report/);
});

test('Creator price update RPC validates ownership and price range',()=>{
  assert.match(migration,/update_creator_prices/);
  assert.match(migration,/where user_id=v_uid and is_approved=true/);
  assert.match(migration,/p_vip<p_basic/);
});
