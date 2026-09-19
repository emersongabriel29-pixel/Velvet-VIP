import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const files=[
 'src/components/explore/ExplorePage.tsx',
 'src/components/activity/NotificationsPage.tsx',
 'src/components/feed/ReportModal.tsx',
 'src/components/creator/CreatorDashboard.tsx',
 'src/components/creator/UploadModal.tsx',
 'src/components/profile/ProfileView.tsx',
 'src/components/monetization/MonetizationPage.tsx',
 'src/components/feed/CommentsModal.tsx',
 'src/components/feed/VideoCard.tsx',
 'src/components/feed/VideoFeed.tsx'
];
const text=Object.fromEntries(files.map(p=>[p,fs.readFileSync(p,'utf8')]));

test('local database fallback is always tied to explicit demo mode',()=>{
  for(const [path,src] of Object.entries(text)){
    if(src.includes('dbService')) assert.match(src,/isDemoMode/,path+' uses dbService without explicit demo boundary');
  }
});

test('long videos stay unavailable until processing completes',()=>{
  const media=fs.readFileSync('src/services/media.ts','utf8');
  assert.match(media,/media_status:input\.contentKind==='long'\?'processing':'ready'/);
  assert.match(media,/enqueue_media_processing/);
});

test('creator prices are persisted through hardened RPC',()=>{
  assert.match(text['src/components/creator/CreatorDashboard.tsx'],/update_creator_prices/);
});

test('production upload categories come from Supabase',()=>{
  const upload=text['src/components/creator/UploadModal.tsx'];
  assert.match(upload,/system_categories/);
  assert.match(upload,/isDemoMode/);
});
