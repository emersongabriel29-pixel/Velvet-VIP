export function isPublishedVideo(video: Record<string, any>) {
  return video.is_draft === false && video.is_removed === false &&
    video.moderation_status === 'approved' && video.media_status === 'ready' &&
    video.processing_status === 'ready';
}

export function subscriptionAllowsVideo(video: Record<string, any>, subscription: Record<string, any> | null, now = Date.now()) {
  if (video.access_type !== 'subscription' || !subscription) return false;
  const ranks: Record<string, number> = { basic: 1, vip: 2, exclusive: 3 };
  const required = ranks[video.required_tier];
  return subscription.status === 'active' && Date.parse(subscription.current_period_end) > now &&
    required !== undefined && (ranks[subscription.plan_tier] || 0) >= required;
}
