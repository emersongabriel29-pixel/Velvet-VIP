import test from 'node:test';import assert from 'node:assert/strict';
const required=['STAGING_SUPABASE_URL','STAGING_SUPABASE_ANON_KEY','STAGING_TEST_USER_A_EMAIL','STAGING_TEST_USER_A_PASSWORD','STAGING_TEST_USER_B_EMAIL','STAGING_TEST_USER_B_PASSWORD'];
test('isolated staging credentials are explicitly configured',()=>{const missing=required.filter(k=>!process.env[k]);assert.deepEqual(missing,[],`Missing staging secrets: ${missing.join(', ')}`);});
test('staging is not a production endpoint',()=>{const url=process.env.STAGING_SUPABASE_URL||'';assert.match(url,/^https:\/\//);assert.doesNotMatch(url,/YOUR_PROJECT|localhost/i);});
