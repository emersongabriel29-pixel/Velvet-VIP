import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const sql=fs.readFileSync('supabase/migrations/021_security_stage3_private_media.sql','utf8');
const edge=fs.readFileSync('supabase/functions/get-video-url/index.ts','utf8');
test('media bucket stays private with constrained MIME and size',()=>{assert.match(sql,/false,536870912/);assert.match(sql,/allowed_mime_types/);});
test('uploads are owner-folder scoped and restriction aware',()=>{assert.match(sql,/owner_id=auth\.uid\(\)::text/);assert.match(sql,/storage\.foldername\(name\)/);assert.match(sql,/has_active_restriction\('publish'\)/);});
test('playback uses short lived signed URLs only',()=>{assert.match(edge,/createSignedUrl\\(path,\\s*120\\)/);assert.match(edge,/Unmanaged media URL rejected/);assert.match(edge,/Cache-Control': 'no-store'/);});
test('media CORS is allowlisted',()=>{assert.match(edge,/ALLOWED_ORIGINS/);assert.doesNotMatch(edge,/Access-Control-Allow-Origin': '\*'/);});
