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
const explore=read('src/components/explore/ExplorePage.tsx');
const app=read('src/App.tsx');
const accountData=read('src/services/accountData.ts');
const feed=read('src/components/feed/VideoFeed.tsx');
const adBanner=read('src/components/ads/AdBanner.tsx');
const admin=read('src/components/admin/AdminCommandCenter.tsx');
const productHub=read('src/components/product/ProductHub.tsx');
const purchasesPage=read('src/components/purchases/MyPurchasesPage.tsx');
const notificationsPage=read('src/components/activity/NotificationsPage.tsx');
const creatorDashboard=read('src/components/creator/CreatorDashboard.tsx');

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

test('featured lives open the selected session from explore and creator profiles',()=>{
  assert.match(accountData,/from\('live_sessions'\)/);
  assert.match(accountData,/\.in\('status', \['live', 'scheduled'\]\)/);
  assert.match(explore,/Lives em destaque/);
  assert.match(explore,/onOpenLive\(live\.id\)/);
  assert.match(explore,/liveCreatorIds\.has\(c\.id\)/);
  assert.match(profile,/onOpenLive\?\.\(l\.id\)/);
  assert.match(app,/onOpenLive=\{handleOpenLive\}/);
  assert.match(live,/data-live-card-id/);
  assert.match(live,/target\.status==='live'/);
});

test('production feed ranks each tab correctly and keeps free content first',()=>{
  assert.match(feed,/currentTab==='trending'/);
  assert.match(feed,/trendingScore\(b\)-trendingScore\(a\)/);
  assert.match(feed,/Number\(a\.is_premium\)-Number\(b\.is_premium\)/);
  assert.match(feed,/followedCreatorIds\.has\(v\.creator_id\)\?500:0/);
  assert.match(feed,/subscriptionRank\.has\(v\.creator_id\)\?350:0/);
  assert.match(feed,/purchasedCreatorIds\.has\(v\.creator_id\)\?150:0/);
  assert.match(feed,/!v\.is_premium&&v\.access_type==='free'/);
});

test('feed renders active admin campaigns and recoverable loading errors',()=>{
  assert.match(feed,/from\('ad_campaigns'\)/);
  assert.match(feed,/settingsRow\.data\?\.ads_enabled!==false/);
  assert.match(feed,/Não foi possível carregar o feed/);
  assert.match(feed,/videos\.length === 0 && liveItems\.length === 0/);
  assert.match(adBanner,/campaign\.advertiser_name/);
  assert.match(adBanner,/noopener noreferrer sponsored/);
  assert.doesNotMatch(adBanner,/Espaço reservado para anunciantes/);
  assert.match(admin,/<option value="banner">Banner<\/option>/);
  assert.doesNotMatch(admin,/<option value="stories">Stories<\/option>/);
});

test('mobile shortcuts live in their natural product areas',()=>{
  for(const duplicate of ['Agenda de lives','Lista PPV','Clipes de lives','Status operacional']) assert.doesNotMatch(productHub,new RegExp(duplicate));
  for(const libraryItem of ["onOpenTool('saved')","onOpenTool('continue')","onOpenTool('wishlist')"]) assert.match(purchasesPage,new RegExp(libraryItem.replace(/[()']/g,'\\$&')));
  assert.match(explore,/onOpenTool\('premieres'\)/);
  assert.match(explore,/onOpenTool\('bundles'\)/);
  assert.match(explore,/onOpenTool\('coupons'\)/);
  assert.match(notificationsPage,/onOpenMessages/);
  assert.match(creatorDashboard,/onOpenTool\('goals'\)/);
  assert.match(creatorDashboard,/onOpenTool\('clips'\)/);
  assert.match(admin,/\['overview','Status operacional'/);
});
