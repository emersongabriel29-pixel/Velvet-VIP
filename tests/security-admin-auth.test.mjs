import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const sql=fs.readFileSync('supabase/migrations/023_security_stage5_admin_auth.sql','utf8');
const client=fs.readFileSync('src/lib/supabase.ts','utf8');
test('admin security events are RLS protected',()=>{assert.match(sql,/admin_security_events enable row level security/);assert.match(sql,/admins read security events/);});
test('privileged RPCs assert admin and are not anonymous',()=>{assert.match(sql,/perform public\.assert_admin\(\)/);assert.match(sql,/revoke all on function public\.assert_admin\(\) from public,anon/);});
test('browser auth uses PKCE',()=>{assert.match(client,/flowType: 'pkce'/);assert.match(client,/detectSessionInUrl: true/);});
