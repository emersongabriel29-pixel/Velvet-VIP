import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const required=['STAGING_SUPABASE_URL','STAGING_SUPABASE_ANON_KEY','STAGING_TEST_USER_A_EMAIL','STAGING_TEST_USER_A_PASSWORD','STAGING_TEST_USER_B_EMAIL','STAGING_TEST_USER_B_PASSWORD'];
const productionHost='kdhcczkhsxjfhfyhmxht.supabase.co';

test('isolated staging: authenticated accounts, two-user RLS and server-only settlement',async t=>{
  const missing=required.filter(key=>!process.env[key]);
  assert.deepEqual(missing,[],`Missing staging secrets: ${missing.join(', ')}`);
  const url=new URL(process.env.STAGING_SUPABASE_URL);
  assert.equal(url.protocol,'https:');
  assert.notEqual(url.hostname,productionHost,'Production must never be used as the staging fixture');
  assert.doesNotMatch(url.hostname,/YOUR_PROJECT|localhost/i);
  const makeClient=()=>createClient(url.href,process.env.STAGING_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const a=makeClient(),b=makeClient(),anon=makeClient();
  try {
    const [loginA,loginB]=await Promise.all([
      a.auth.signInWithPassword({email:process.env.STAGING_TEST_USER_A_EMAIL,password:process.env.STAGING_TEST_USER_A_PASSWORD}),
      b.auth.signInWithPassword({email:process.env.STAGING_TEST_USER_B_EMAIL,password:process.env.STAGING_TEST_USER_B_PASSWORD}),
    ]);
    assert.equal(loginA.error,null,'User A login failed');assert.equal(loginB.error,null,'User B login failed');
    const idA=loginA.data.user.id,idB=loginB.data.user.id;
    assert.notEqual(idA,idB,'Two distinct fixture accounts are required');
    await t.test('each fixture has an accessible non-admin profile',async()=>{
      for(const [client,id] of [[a,idA],[b,idB]]) {
        const {data,error}=await client.from('profiles').select('id,role').eq('id',id).single();
        assert.equal(error,null);assert.equal(data.id,id);assert.notEqual(data.role,'admin');
      }
    });
    await t.test('cross-user and anonymous profile reads expose no rows',async()=>{
      for(const [client,id] of [[a,idB],[b,idA],[anon,idA]]) {
        const {data,error}=await client.from('profiles').select('id').eq('id',id);
        if(error) assert.equal(error.code,'42501'); else assert.deepEqual(data,[]);
      }
    });
    await t.test('cross-user profile update changes no rows',async()=>{
      const {data,error}=await a.from('profiles').update({bio:'unauthorized staging probe'}).eq('id',idB).select('id');
      if(error) assert.equal(error.code,'42501'); else assert.deepEqual(data,[]);
    });
    await t.test('client roles cannot invoke financial settlement',async()=>{
      for(const client of [a,anon]) {
        const {error}=await client.rpc('settle_verified_payment',{p_payment:{}});
        assert.ok(error,'Client unexpectedly invoked privileged settlement');
        assert.equal(error.code,'42501');
      }
    });
  } finally {
    await Promise.allSettled([a.auth.signOut(),b.auth.signOut()]);
  }
});
