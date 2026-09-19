-- ==============================================================================
-- VELVET VIP - SCHEMA COMPLETO DO BANCO DE DADOS SUPABASE (PostgreSQL + RLS)
-- ==============================================================================

-- Habilita extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA: profiles (Espelho do auth.users do Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&fit=crop',
    bio TEXT,
    birth_date DATE NOT NULL,
    age_verified BOOLEAN DEFAULT FALSE,
    age_verified_at TIMESTAMPTZ,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'creator', 'admin')),
    is_blocked BOOLEAN DEFAULT FALSE,
    is_suspended BOOLEAN DEFAULT FALSE,
    wallet_balance NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA: creators
CREATE TABLE IF NOT EXISTS public.creators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    display_name TEXT NOT NULL,
    handle TEXT UNIQUE NOT NULL,
    avatar_url TEXT NOT NULL,
    cover_url TEXT,
    bio TEXT,
    verified BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT TRUE,
    subscription_price_basic NUMERIC(10, 2) DEFAULT 29.90,
    subscription_price_vip NUMERIC(10, 2) DEFAULT 59.90,
    category TEXT DEFAULT 'Sensual Art & Glamour',
    total_followers INT DEFAULT 0,
    total_likes INT DEFAULT 0,
    total_views INT DEFAULT 0,
    gross_earnings NUMERIC(10, 2) DEFAULT 0.00,
    available_balance NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA: subscription_plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    tier TEXT NOT NULL CHECK (tier IN ('basic', 'vip', 'exclusive')),
    price NUMERIC(10, 2) NOT NULL,
    benefits JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA: videos
CREATE TABLE IF NOT EXISTS public.videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT NOT NULL,
    duration_seconds INT DEFAULT 15,
    aspect_ratio TEXT DEFAULT '9:16',
    is_premium BOOLEAN DEFAULT FALSE,
    premium_price NUMERIC(10, 2) DEFAULT 0.00,
    required_tier TEXT DEFAULT 'free' CHECK (required_tier IN ('free', 'basic', 'vip')),
    category TEXT DEFAULT 'Glamour',
    hashtags TEXT[] DEFAULT ARRAY[]::TEXT[],
    views_count INT DEFAULT 0,
    likes_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    favorites_count INT DEFAULT 0,
    is_draft BOOLEAN DEFAULT FALSE,
    is_removed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELA: video_views
CREATE TABLE IF NOT EXISTS public.video_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    viewed_duration_seconds INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABELA: video_likes
CREATE TABLE IF NOT EXISTS public.video_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(video_id, user_id)
);

-- 7. TABELA: comments
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    likes_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABELA: follows
CREATE TABLE IF NOT EXISTS public.follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(follower_id, creator_id)
);

-- 9. TABELA: favorites
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, video_id)
);

-- 10. TABELA: subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
    plan_tier TEXT NOT NULL CHECK (plan_tier IN ('basic', 'vip', 'exclusive')),
    amount NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
    current_period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, creator_id)
);

-- 11. TABELA: purchases
CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    payment_method TEXT DEFAULT 'credit_card',
    status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'refunded')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, video_id)
);

-- 12. TABELA: payments
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('subscription', 'purchase', 'wallet_deposit')),
    status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'failed')),
    payment_gateway_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. TABELA: creator_balance
CREATE TABLE IF NOT EXISTS public.creator_balance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE UNIQUE,
    available_amount NUMERIC(10, 2) DEFAULT 0.00,
    pending_amount NUMERIC(10, 2) DEFAULT 0.00,
    total_withdrawn NUMERIC(10, 2) DEFAULT 0.00,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. TABELA: withdrawals
CREATE TABLE IF NOT EXISTS public.withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    fee NUMERIC(10, 2) DEFAULT 0.00,
    net_amount NUMERIC(10, 2) NOT NULL,
    pix_key TEXT NOT NULL,
    pix_key_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. TABELA: reports
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('video', 'creator', 'comment')),
    target_id UUID NOT NULL,
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. TABELA: notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    target_id UUID,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Habilita RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Políticas de perfis
CREATE POLICY "Perfis são públicos para leitura" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Usuários atualizam próprio perfil" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Políticas de criadores
CREATE POLICY "Criadores aprovados são visíveis para todos" ON public.creators FOR SELECT USING (is_approved = true OR auth.uid() = user_id);
CREATE POLICY "Criador atualiza suas configurações" ON public.creators FOR UPDATE USING (auth.uid() = user_id);

-- Políticas de vídeos
CREATE POLICY "Vídeos públicos publicados são visíveis para usuários verificados" ON public.videos
FOR SELECT USING (
    (is_draft = false AND is_removed = false) OR
    EXISTS (SELECT 1 FROM public.creators WHERE creators.id = videos.creator_id AND creators.user_id = auth.uid())
);
CREATE POLICY "Criadores podem inserir vídeos" ON public.videos FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.creators WHERE creators.id = videos.creator_id AND creators.user_id = auth.uid())
);
CREATE POLICY "Criadores podem editar seus próprios vídeos" ON public.videos FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.creators WHERE creators.id = videos.creator_id AND creators.user_id = auth.uid())
);

-- Políticas de likes, comentários, follows, favoritos
CREATE POLICY "Likes públicos para leitura" ON public.video_likes FOR SELECT USING (true);
CREATE POLICY "Usuários autenticados gerenciam seus likes" ON public.video_likes FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Comentários públicos para leitura" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Usuários postam comentários" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Follows visíveis" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Usuários gerenciam seus follows" ON public.follows FOR ALL USING (auth.uid() = follower_id);

CREATE POLICY "Usuários acessam seus favoritos" ON public.favorites FOR ALL USING (auth.uid() = user_id);

-- Políticas de assinaturas e compras
CREATE POLICY "Usuários acessam suas assinaturas" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários acessam suas compras" ON public.purchases FOR SELECT USING (auth.uid() = user_id);

-- Políticas de carteira e saques
CREATE POLICY "Criadores veem seu balanço" ON public.creator_balance FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.creators WHERE creators.id = creator_balance.creator_id AND creators.user_id = auth.uid())
);
CREATE POLICY "Criadores gerenciam seus saques" ON public.withdrawals FOR ALL USING (
    EXISTS (SELECT 1 FROM public.creators WHERE creators.id = withdrawals.creator_id AND creators.user_id = auth.uid())
);

-- Políticas de notificações
CREATE POLICY "Usuários acessam apenas suas notificações" ON public.notifications FOR ALL USING (auth.uid() = user_id);
