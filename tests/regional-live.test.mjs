import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const migration=read('supabase/migrations/20260919223428_regional_live_commerce.sql');
const checkout=read('supabase/functions/create-checkout/index.ts');
const auth=read('src/components/auth/AuthModalV2.tsx');
const live=read('src/components/live/LivePage.tsx');
const video=read('src/components/feed/VideoCard.tsx');
const authContext=read('src/hooks/useAuth.tsx');
const header=read('src/components/common/Header.tsx');
const profile=read('src/components/profile/ProfileView.tsx');

test('live engagement and paid offers are RLS protected',()=>{
  for(const table of ['live_likes','live_comments','live_shares','live_offers','live_offer_orders']){
    assert.match(migration,new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(migration,/settle_verified_payment_core/);
  assert.match(migration,/live_offer_sold_out/);
});

test('regional money fails closed when its gateway is unavailable',()=>{
  assert.match(checkout,/requestedCurrency!==['"]BRL['"]/);
  assert.match(checkout,/unsupported_checkout_currency/);
  assert.match(checkout,/tip_presets/);
});

test('Google OAuth, live engagement and Velvet watermarks are wired',()=>{
  assert.match(auth,/signInWithOAuth/);
  assert.match(auth,/provider: ['"]google['"]/);
  assert.match(live,/toggle_live_like/);
  assert.match(live,/live_comments/);
  assert.match(live,/live_offers/);
  assert.match(live,/VELVET/);
  assert.match(video,/showTips/);
  assert.match(video,/watermark_enabled/);
});

test('admin role preview works without changing the database role',()=>{
  assert.match(authContext,/currentUser\.role !== 'admin'/);
  assert.match(authContext,/sessionStorage\.setItem\(TEST_ROLE_KEY, role\)/);
  assert.match(authContext,/database permissions are deliberately never changed/);
  assert.match(header,/r === 'creator' \? 'creator_studio' : 'profile'/);
});

test('profile avatar is left aligned, raised and fully contained',()=>{
  assert.match(profile,/absolute -bottom-8 left-5 sm:left-8/);
  assert.match(profile,/rounded-full object-contain object-center/);
  assert.doesNotMatch(profile,/rounded-3xl overflow-hidden bg-gradient-to-r/);
});
