import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const sql=fs.readFileSync('supabase/migrations/20260918111811_025_security_stage7_observability.sql','utf8');
const runbook=fs.readFileSync('SECURITY_OPERATIONS_RUNBOOK.md','utf8');
test('security alerts are RLS protected and server raised',()=>{assert.match(sql,/security_alerts enable row level security/);assert.match(sql,/server_only/);assert.match(sql,/revoke all on function public\.raise_security_alert.*authenticated/i);});
test('recovery verification records are protected',()=>{assert.match(sql,/recovery_verifications enable row level security/);});
test('runbook requires restore drills and forbids sensitive logging',()=>{assert.match(runbook,/restore drill/i);assert.match(runbook,/Do not log bearer tokens/i);});
