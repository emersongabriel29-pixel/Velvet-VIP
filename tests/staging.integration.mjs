import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const required=['STAGING_SUPABASE_URL','STAGING_SUPABASE_ANON_KEY','STAGING_TEST_USER_A_EMAIL','STAGING_TEST_USER_A_PASSWORD','STAGING_TEST_USER_B_EMAIL','STAGING_TEST_USER_B_PASSWORD'];
for(const key of required) if(!process.env[key]) throw new Error(`Missing staging secret: ${key}`);

const url=process.env.STAGING_SUPABASE_URL;
const key=process.env.STAGING_SUPABASE_ANON_KEY;
const clientA=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const clientB=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
let userA,userB,tokenA;

test('two isolated staging users can authenticate',async()=>{
  const [a,b]=await Promise.all([
    clientA.auth.signInWithPassword({email:process.env.STAGING_TEST_USER_A_EMAIL,password:process.env.STAGING_TEST_USER_A_PASSWORD}),
    clientB.auth.signInWithPassword({email:process.env.STAGING_TEST_USER_B_EMAIL,password:process.env.STAGING_TEST_USER_B_PASSWORD})
  ]);
  assert.equal(a.error,null,a.error?.message);assert.equal(b.error,null,b.error?.message);
  userA=a.data.user;userB=b.data.user;tokenA=a.data.session?.access_token;
  assert.ok(userA?.id);assert.ok(userB?.id);assert.notEqual(userA.id,userB.id);assert.ok(tokenA);
});

test('RLS does not expose user B notifications to user A',async()=>{
  assert.ok(userA?.id&&userB?.id);
  const {data,error}=await clientA.from('notifications').select('id,user_id').eq('user_id',userB.id);
  assert.equal(error,null,error?.message);
  assert.deepEqual(data,[]);
});

test('normal staging user cannot call admin operational health',async()=>{
  const {error}=await clientA.rpc('admin_operational_health');
  assert.ok(error,'admin RPC unexpectedly succeeded for normal user');
});

test('server-only identity RPC is not callable by browser user',async()=>{
  const {error}=await clientA.rpc('record_creator_identity_verification',{
    p_user_id:userA.id,p_provider:'e2e-invalid',p_reference:'e2e-invalid',
    p_identity_verified:true,p_age_verified:true
  });
  assert.ok(error,'server-only identity verification unexpectedly succeeded');
});

test('checkout rejects an invalid purchase kind before provider side effects',async()=>{
  const response=await fetch(`${url}/functions/v1/create-checkout`,{
    method:'POST',
    headers:{Authorization:`Bearer ${tokenA}`,apikey:key,'Content-Type':'application/json'},
    body:JSON.stringify({kind:'e2e_invalid_kind'})
  });
  assert.ok(response.status>=400&&response.status<500,`unexpected checkout status ${response.status}`);
});

test('payment webhook rejects stale or invalid signatures',async()=>{
  const response=await fetch(`${url}/functions/v1/payment-webhook?data.id=e2e-invalid`,{
    method:'POST',
    headers:{'Content-Type':'application/json','x-signature':'ts=1,v1=invalid','x-request-id':'e2e-invalid'},
    body:JSON.stringify({type:'payment',data:{id:'e2e-invalid'}})
  });
  assert.equal(response.status,401);
});
