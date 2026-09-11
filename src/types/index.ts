export type UserRole = 'user' | 'creator' | 'admin';

export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  avatar_url: string;
  bio?: string;
  role: UserRole;
  birth_date: string;
  age_verified: boolean;
  is_blocked?: boolean;
  is_suspended?: boolean;
  wallet_balance: number; // R$
  created_at: string;
}

export interface Creator {
  id: string;
  user_id: string;
  display_name: string;
  handle: string;
  avatar_url: string;
  cover_url: string;
  bio: string;
  verified: boolean;
  is_approved: boolean; // Admin approval
  subscription_price_basic: number;
  subscription_price_vip: number;
  total_followers: number;
  total_likes: number;
  total_views: number;
  gross_earnings: number;
  available_balance: number;
  wallet_balance?: number;
  total_earnings?: number;
  category: string;
  identity_status?: 'pending' | 'verified' | 'rejected' | 'suspended';
  created_at: string;
}

export interface Video {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  duration_seconds: number;
  aspect_ratio: string;
  is_premium: boolean;
  premium_price?: number; // Pay-per-view price in R$
  required_tier?: 'free' | 'basic' | 'vip';
  category: string;
  hashtags: string[];
  views_count: number;
  likes_count: number;
  comments_count: number;
  favorites_count: number;
  is_draft: boolean;
  is_removed: boolean;
  moderation_status?: 'pending' | 'approved' | 'rejected' | 'removed';
  moderation_notes?: string;
  consent_confirmed?: boolean;
  created_at: string;
  // Dynamic runtime properties for current user
  creator?: Creator;
  has_liked?: boolean;
  has_favorited?: boolean;
  has_unlocked?: boolean;
}

export interface SystemCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  is_active: boolean;
  order: number;
  created_at: string;
}

export interface SystemTag {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
}

export interface SecurityAuditLog {
  id: string;
  event: string;
  user_email: string;
  ip_address: string;
  status: 'success' | 'warning' | 'blocked';
  details: string;
  timestamp: string;
}

export interface Comment {
  id: string;
  video_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  user_handle: string;
  content: string;
  likes_count: number;
  has_liked?: boolean;
  created_at: string;
}

export interface Follow {
  id: string;
  follower_id: string;
  creator_id: string;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  video_id: string;
  created_at: string;
}

export interface SubscriptionPlan {
  id: string;
  creator_id: string;
  name: string;
  tier: 'basic' | 'vip' | 'exclusive';
  price: number;
  benefits: string[];
}

export interface Subscription {
  id: string;
  user_id: string;
  creator_id: string;
  plan_tier: 'basic' | 'vip' | 'exclusive';
  amount: number;
  status: 'active' | 'cancelled' | 'expired';
  current_period_end: string;
  price?: number;
  creator_name?: string;
  creator_avatar?: string;
  next_billing_date?: string;
  created_at: string;
}

export interface Purchase {
  id: string;
  user_id: string;
  video_id: string;
  creator_id: string;
  amount: number;
  payment_method: 'credit_card' | 'pix' | 'wallet';
  status: 'completed' | 'pending' | 'refunded';
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  amount: number;
  type: 'subscription' | 'purchase' | 'wallet_deposit';
  status: 'paid' | 'pending' | 'failed';
  payment_gateway_id: string;
  created_at: string;
}

export interface CreatorBalance {
  id: string;
  creator_id: string;
  available_amount: number;
  pending_amount: number;
  total_withdrawn: number;
  updated_at: string;
}

export interface Withdrawal {
  id: string;
  creator_id: string;
  amount: number;
  fee: number;
  net_amount: number;
  pix_key: string;
  pix_key_type: 'cpf' | 'email' | 'phone' | 'random';
  status: 'pending' | 'processing' | 'approved' | 'rejected';
  created_at: string;
}

export type ReportReason =
  | 'unauthorized_content'
  | 'privacy_violation'
  | 'fake_identity'
  | 'spam'
  | 'inappropriate_content'
  | 'underage_suspicion'
  | 'other';

export interface Report {
  id: string;
  reporter_id: string;
  reporter_name?: string;
  target_type: 'video' | 'creator' | 'comment';
  target_id: string;
  target_title?: string;
  reason: ReportReason;
  description: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  admin_notes?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  sender_id?: string;
  sender_name?: string;
  sender_avatar?: string;
  type: 'like' | 'comment' | 'follow' | 'subscription' | 'purchase' | 'premium_unlocked' | 'system' | 'payout';
  title: string;
  message: string;
  target_id?: string;
  target_video_id?: string;
  read: boolean;
  created_at: string;
}

export type FeedTab = 'foryou' | 'following' | 'trending' | 'new' | 'premium';
