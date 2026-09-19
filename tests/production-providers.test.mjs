import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const sql=fs.readFileSync('supabase/migrations/20260918111822_028_production_stage3_provider_adapters.sql','utf8');
const docs=fs.readFileSync('EXTERNAL_PROVIDERS.md','utf8');
const env=fs.readFileSync('.env.example','utf8');
test('external provider events are normalized and idempotent',()=>{assert.match(sql,/external_provider_events/);assert.match(sql,/unique\(provider_type,provider,external_event_id\)/);});
test('streaming room attachment is server only',()=>{assert.match(sql,/attach_streaming_room/);assert.match(sql,/server_only/);assert.match(sql,/revoke all on function public\.attach_streaming_room/);});
test('provider credentials stay server-side',()=>{assert.match(env,/CLOUDFLARE_STREAM_API_TOKEN/);assert.doesNotMatch(env,/VITE_CLOUDFLARE_STREAM_API_TOKEN/);assert.match(docs,/No streaming secret is exposed to Vite/);});
test('age verification remains provider-backed',()=>{assert.match(docs,/record_age_verification/);assert.match(docs,/Self-declared DOB is never verification/);});
