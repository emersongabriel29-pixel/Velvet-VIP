import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const auth=fs.readFileSync('src/hooks/useAuth.tsx','utf8');
const modal=fs.readFileSync('src/components/auth/AuthModalV2.tsx','utf8');
const admin=fs.readFileSync('src/components/admin/AdminCommandCenter.tsx','utf8');
const migration=fs.readFileSync('supabase/migrations/20260919153000_identity_hardening.sql','utf8');
const webhook=fs.readFileSync('supabase/functions/identity-verification-webhook/index.ts','utf8');

test('auth uses explicit demo mode and fails closed without Supabase',()=>{assert.match(auth,/const demoMode = isDemoMode/);assert.doesNotMatch(auth,/const demoMode = !isSupabaseConfigured/);assert.match(modal,/isDemoMode/);});
test('login requires confirmed email before loading application profile',()=>{assert.match(auth,/email_confirmed_at/);assert.match(auth,/Confirme seu e-mail antes de entrar/);});
test('admin cannot fake KYC by toggling public badge',()=>{assert.match(admin,/Identidade só pode ser atualizada pelo adaptador KYC confiável/);assert.match(admin,/verified:!c\.verified/);assert.doesNotMatch(admin,/verified:!c\.verified,identity_status/);assert.match(admin,/identity_status!=='verified'.*content_rights_confirmed!==true/);});
test('identity result is server-only, signed and fresh',()=>{assert.match(migration,/server_only/);assert.match(migration,/service_role/);assert.match(webhook,/x-velvet-signature/);assert.match(webhook,/Math\.abs\(now-ts\)>300/);assert.match(webhook,/record_creator_identity_verification/);});
