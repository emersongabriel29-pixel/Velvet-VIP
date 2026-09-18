import {
  User,
  Creator,
  Video,
  Comment,
  Follow,
  Favorite,
  Subscription,
  Purchase,
  Withdrawal,
  Report,
  Notification,
  SubscriptionPlan,
  SystemCategory,
  SystemTag,
  SecurityAuditLog
} from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const STORAGE_KEY_PREFIX = 'velvet_vip_db_v2_';

function getStored<T>(key: string, defaultVal: T): T {
  try {
    const item = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    return item ? JSON.parse(item) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
}

function setStored<T>(key: string, val: T): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(val));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
}

const INITIAL_CATEGORIES: SystemCategory[] = [
  { id: 'cat-1', name: 'Glamour & Lifestyle', slug: 'glamour-lifestyle', description: 'Produções elegantes e estilo de vida exclusivo', is_active: true, order: 1, created_at: new Date().toISOString() },
  { id: 'cat-2', name: 'Ensaio Sensual', slug: 'ensaio-sensual', description: 'Ensaios fotográficos e vídeos de arte sensual', is_active: true, order: 2, created_at: new Date().toISOString() },
  { id: 'cat-3', name: 'Fitness Adulto', slug: 'fitness-adulto', description: 'Rotinas de treino e estética corporal', is_active: true, order: 3, created_at: new Date().toISOString() },
  { id: 'cat-4', name: 'Bastidores Exclusivos', slug: 'bastidores-exclusivos', description: 'Behind-the-scenes de produções VIP', is_active: true, order: 4, created_at: new Date().toISOString() },
  { id: 'cat-5', name: 'Dança & Performance', slug: 'danca-performance', description: 'Coreografias e apresentações ao vivo', is_active: true, order: 5, created_at: new Date().toISOString() },
  { id: 'cat-6', name: 'Cosplay VIP', slug: 'cosplay-vip', description: 'Fantasias e caracterizações temáticas', is_active: true, order: 6, created_at: new Date().toISOString() },
  { id: 'cat-7', name: 'Solo Especial', slug: 'solo-especial', description: 'Vídeos individuais intimistas', is_active: true, order: 7, created_at: new Date().toISOString() },
  { id: 'cat-8', name: 'Casal & Romance', slug: 'casal-romance', description: 'Ensaios e momentos em casal', is_active: true, order: 8, created_at: new Date().toISOString() },
];

const INITIAL_TAGS: SystemTag[] = [
  { id: 'tag-1', name: 'Lingerie', slug: 'lingerie', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-2', name: 'Preto', slug: 'preto', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-3', name: 'Conteúdo em Português', slug: 'conteudo-em-portugues', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-4', name: 'Conteúdo em Árabe', slug: 'conteudo-em-arabe', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-5', name: 'Amador', slug: 'amador', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-6', name: 'Anal', slug: 'anal', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-7', name: 'Bunda', slug: 'bunda', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-8', name: 'Bunda Grande', slug: 'bunda-grande', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-9', name: 'Gangbang', slug: 'gangbang', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-10', name: 'Gay', slug: 'gay', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-11', name: 'Loira', slug: 'loira', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-12', name: 'Meias', slug: 'meias', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-13', name: 'Câmera ao Vivo', slug: 'camera-ao-vivo', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-14', name: 'MILF', slug: 'milf', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-15', name: 'Asiática', slug: 'asiatica', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-16', name: 'Mulher Sensual', slug: 'mulher-sensual', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-17', name: 'ASMR', slug: 'asmr', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-18', name: 'Coroa', slug: 'coroa', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-19', name: 'Indiano', slug: 'indiano', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-20', name: 'BBW', slug: 'bbw', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-21', name: 'Interracial', slug: 'interracial', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-22', name: 'Morena', slug: 'morena', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-23', name: 'Óleo', slug: 'oleo', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-24', name: 'Bissexual', slug: 'bissexual', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-25', name: 'Femdom', slug: 'femdom', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-26', name: 'Boquete', slug: 'boquete', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-27', name: 'Fisting', slug: 'fisting', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-28', name: 'Lésbicas', slug: 'lesbicas', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-29', name: 'Pau Grande', slug: 'pau-grande', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-30', name: 'Latina', slug: 'latina', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-31', name: 'Peitão', slug: 'peitao', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-32', name: 'Ruivas', slug: 'ruivas', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-33', name: 'Solo', slug: 'solo', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-34', name: 'Squirting', slug: 'squirting', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-35', name: 'Trans', slug: 'trans', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-36', name: 'Pornografia Gay', slug: 'pornografia-gay', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-37', name: 'Pornografia Trans', slug: 'pornografia-trans', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-38', name: 'Sensual', slug: 'sensual', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-39', name: 'Ensaio', slug: 'ensaio', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-40', name: 'Sem Nudez', slug: 'sem-nudez', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-41', name: 'Nudez Artística', slug: 'nudez-artistica', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-42', name: 'Bastidores', slug: 'bastidores', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-43', name: 'Dança', slug: 'danca', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-44', name: 'Fantasia', slug: 'fantasia', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-45', name: 'Cosplay', slug: 'cosplay', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-46', name: 'Banho', slug: 'banho', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-47', name: 'Praia', slug: 'praia', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-48', name: 'Fitness', slug: 'fitness', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-49', name: 'Chuveiro', slug: 'chuveiro', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-50', name: 'Romance', slug: 'romance', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-51', name: 'Casal Adulto', slug: 'casal-adulto', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-52', name: 'Pés', slug: 'pes', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-53', name: 'Tatuagem', slug: 'tatuagem', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-54', name: 'Piercing', slug: 'piercing', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-55', name: 'Transparência', slug: 'transparencia', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-56', name: 'Vídeo Curto', slug: 'video-curto', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-57', name: 'Conteúdo Exclusivo', slug: 'conteudo-exclusivo', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-58', name: 'Ao Vivo', slug: 'ao-vivo', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-59', name: 'Personalizado', slug: 'personalizado', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-60', name: 'Pedido do Fã', slug: 'pedido-do-fa', is_active: true, created_at: new Date().toISOString() },
  { id: 'tag-61', name: 'Todas as Tags', slug: 'todas-as-tags', is_active: true, created_at: new Date().toISOString() }
];

const INITIAL_SECURITY_LOGS: SecurityAuditLog[] = [
  { id: 'sec-1', event: 'Verificação de Idade 18+', user_email: 'demo.creator@velvetvip.local', ip_address: 'demo-ip', status: 'success', details: 'Termos aceitos e idade legal confirmada.', timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: 'sec-2', event: 'Login Seguro TLS 1.3', user_email: 'demo.creator@velvetvip.local', ip_address: 'demo-ip', status: 'success', details: 'Sessão iniciada com token seguro.', timestamp: new Date(Date.now() - 3500000).toISOString() },
  { id: 'sec-3', event: 'Auditoria LGPD & RLS', user_email: 'admin@velvetvip.local', ip_address: '127.0.0.1', status: 'success', details: 'Políticas de privacidade e RLS auditadas.', timestamp: new Date(Date.now() - 86400000).toISOString() },
];

// Initial Demo Seed Data
const INITIAL_USERS: User[] = [
  {
    id: 'user-001',
    email: 'demo.creator@velvetvip.local',
    username: 'fernanda_vip',
    name: 'Fernanda Araújo',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&fit=crop',
    bio: 'Amante de conteúdos exclusivos e moda.',
    role: 'creator',
    birth_date: '1998-05-14',
    age_verified: true,
    wallet_balance: 350.00,
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'user-002',
    email: 'marcos.silva@exemplo.com',
    username: 'marcos_viewer',
    name: 'Marcos Silva',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&fit=crop',
    bio: 'Membro VIP Velvet.',
    role: 'user',
    birth_date: '1995-10-20',
    age_verified: true,
    wallet_balance: 120.00,
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    id: 'user-admin',
    email: 'admin@velvetvip.local',
    username: 'admin_velvet',
    name: 'Diretoria Velvet',
    avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&fit=crop',
    bio: 'Administrador do Sistema Velvet VIP.',
    role: 'admin',
    birth_date: '1990-01-01',
    age_verified: true,
    wallet_balance: 50000.00,
    created_at: new Date(Date.now() - 120 * 86400000).toISOString(),
  },
  {
    id: 'user-creator-2',
    email: 'sophia.velvet@exemplo.com',
    username: 'sophia_luxe',
    name: 'Sophia Laurent',
    avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&fit=crop',
    bio: 'Ensaios fotográficos exclusivos, sensual art e bastidores da moda.',
    role: 'creator',
    birth_date: '1997-03-22',
    age_verified: true,
    wallet_balance: 1420.50,
    created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
  },
  {
    id: 'user-creator-3',
    email: 'valentina.club@exemplo.com',
    username: 'valentina_vip',
    name: 'Valentina Rossi',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&fit=crop',
    bio: 'Fitness model & life VIP. Conteúdo novo todos os dias às 20h.',
    role: 'creator',
    birth_date: '1996-08-11',
    age_verified: true,
    wallet_balance: 2890.00,
    created_at: new Date(Date.now() - 110 * 86400000).toISOString(),
  }
];

const INITIAL_CREATORS: Creator[] = [
  {
    id: 'creator-001',
    user_id: 'user-001',
    display_name: 'Fernanda Araújo',
    handle: 'fernanda_vip',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&fit=crop',
    cover_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200&fit=crop',
    bio: 'Criadora oficial Velvet VIP. Vídeos verticais exclusivos, ensaios intimistas e lifestyle.',
    verified: true,
    is_approved: true,
    subscription_price_basic: 29.90,
    subscription_price_vip: 59.90,
    total_followers: 14200,
    total_likes: 89400,
    total_views: 310500,
    gross_earnings: 12450.00,
    available_balance: 350.00,
    category: 'Glamour & Lifestyle',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'creator-002',
    user_id: 'user-creator-2',
    display_name: 'Sophia Laurent',
    handle: 'sophia_luxe',
    avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&fit=crop',
    cover_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&fit=crop',
    bio: 'Ensaios fotográficos exclusivos, sensual art e bastidores do meu mundo.',
    verified: true,
    is_approved: true,
    subscription_price_basic: 39.90,
    subscription_price_vip: 79.90,
    total_followers: 28500,
    total_likes: 194000,
    total_views: 680000,
    gross_earnings: 24800.00,
    available_balance: 1420.50,
    category: 'Sensual Art',
    created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
  },
  {
    id: 'creator-003',
    user_id: 'user-creator-3',
    display_name: 'Valentina Rossi',
    handle: 'valentina_vip',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&fit=crop',
    cover_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&fit=crop',
    bio: 'Fitness VIP, biquíni e rotina sem filtros. Assine para conferir meus vídeos sem censura.',
    verified: true,
    is_approved: true,
    subscription_price_basic: 24.90,
    subscription_price_vip: 49.90,
    total_followers: 43100,
    total_likes: 312000,
    total_views: 950000,
    gross_earnings: 38900.00,
    available_balance: 2890.00,
    category: 'Fitness Adulto',
    created_at: new Date(Date.now() - 110 * 86400000).toISOString(),
  }
];

// High quality vertical videos (hosted on fast HTTPS CDN, mobile-ready vertical format)
const INITIAL_VIDEOS: Video[] = [
  {
    id: 'vid-001',
    creator_id: 'creator-001',
    title: 'Bastidores do novo ensaio em São Paulo ✨',
    description: 'Um pouco da energia do ensaio fotográfico de hoje na cobertura. O que acharam desse look?',
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-fashion-model-in-neon-light-41551-large.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&fit=crop',
    duration_seconds: 14,
    aspect_ratio: '9:16',
    is_premium: false,
    category: 'Glamour & Lifestyle',
    hashtags: ['bastidores', 'ensaio', 'velvetvip', 'neon', 'estilo'],
    views_count: 14820,
    likes_count: 2410,
    comments_count: 142,
    favorites_count: 480,
    is_draft: false,
    is_removed: false,
    created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
  },
  {
    id: 'vid-002',
    creator_id: 'creator-002',
    title: 'Edição Especial Noturna: Glamour & Sombra 🔒 VIP',
    description: 'Vídeo completo e sem cortes da sessão noturna. Conteúdo exclusivo para assinantes VIP.',
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-woman-posing-for-the-camera-in-a-studio-41558-large.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&fit=crop',
    duration_seconds: 22,
    aspect_ratio: '9:16',
    is_premium: true,
    premium_price: 19.90,
    required_tier: 'vip',
    category: 'Sensual Art',
    hashtags: ['vip', 'exclusivo', 'sensual', 'noite', 'privado'],
    views_count: 29400,
    likes_count: 4890,
    comments_count: 310,
    favorites_count: 1200,
    is_draft: false,
    is_removed: false,
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
  {
    id: 'vid-003',
    creator_id: 'creator-003',
    title: 'Treino da tarde com vista para o mar 🌊🔥',
    description: 'Foco total antes do fim de semana. Me contem nos comentários qual seu exercício favorito!',
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-light-41550-large.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=600&fit=crop',
    duration_seconds: 18,
    aspect_ratio: '9:16',
    is_premium: false,
    category: 'Fitness Adulto',
    hashtags: ['fitness', 'workout', 'treino', 'motivation', 'verao'],
    views_count: 53100,
    likes_count: 7650,
    comments_count: 428,
    favorites_count: 1920,
    is_draft: false,
    is_removed: false,
    created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
  },
  {
    id: 'vid-004',
    creator_id: 'creator-001',
    title: 'Prévia exclusiva: Vestido de seda vermelha 👠',
    description: 'O conteúdo completo com áudio imersivo está liberado para quem tem o passe VIP.',
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-with-red-lips-and-smoky-eyes-41555-large.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&fit=crop',
    duration_seconds: 16,
    aspect_ratio: '9:16',
    is_premium: true,
    premium_price: 14.90,
    required_tier: 'basic',
    category: 'Glamour & Lifestyle',
    hashtags: ['previa', 'vestidoroxo', 'velvetvip', 'sedaluxo'],
    views_count: 19200,
    likes_count: 3820,
    comments_count: 194,
    favorites_count: 730,
    is_draft: false,
    is_removed: false,
    created_at: new Date(Date.now() - 72 * 3600000).toISOString(),
  },
  {
    id: 'vid-005',
    creator_id: 'creator-002',
    title: 'Luzes da cidade e reflexos dourados 🌟',
    description: 'Gravando direto do terraço em Copacabana. A noite carioca tem uma energia sem igual.',
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-portrait-of-a-fashion-woman-with-silver-makeup-39875-large.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=600&fit=crop',
    duration_seconds: 15,
    aspect_ratio: '9:16',
    is_premium: false,
    category: 'Sensual Art',
    hashtags: ['riodejaneiro', 'noite', 'copacabana', 'ouro'],
    views_count: 22100,
    likes_count: 3150,
    comments_count: 160,
    favorites_count: 590,
    is_draft: false,
    is_removed: false,
    created_at: new Date(Date.now() - 96 * 3600000).toISOString(),
  },
  {
    id: 'vid-006',
    creator_id: 'creator-003',
    title: 'Momento relax pós-sauna 🧖‍♀️💦 [Acesso VIP]',
    description: 'Apenas para membros do clube fechado. Aproveite e deixe seu feedback nos comentários!',
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-with-wet-hair-and-glossy-skin-41553-large.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&fit=crop',
    duration_seconds: 25,
    aspect_ratio: '9:16',
    is_premium: true,
    premium_price: 24.90,
    required_tier: 'vip',
    category: 'Fitness Adulto',
    hashtags: ['sauna', 'relax', 'vipclub', 'semfiltro', 'intimista'],
    views_count: 67300,
    likes_count: 11200,
    comments_count: 850,
    favorites_count: 3100,
    is_draft: false,
    is_removed: false,
    created_at: new Date(Date.now() - 120 * 3600000).toISOString(),
  }
];

const INITIAL_COMMENTS: Comment[] = [
  {
    id: 'comm-1',
    video_id: 'vid-001',
    user_id: 'user-002',
    user_name: 'Marcos Silva',
    user_handle: 'marcos_viewer',
    user_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&fit=crop',
    content: 'Produção incrível! A iluminação ficou impecável 🔥',
    likes_count: 18,
    created_at: new Date(Date.now() - 10 * 3600000).toISOString(),
  },
  {
    id: 'comm-2',
    video_id: 'vid-001',
    user_id: 'user-creator-2',
    user_name: 'Sophia Laurent',
    user_handle: 'sophia_luxe',
    user_avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&fit=crop',
    content: 'Arrasou muito amiga! Que poder!',
    likes_count: 34,
    created_at: new Date(Date.now() - 8 * 3600000).toISOString(),
  },
  {
    id: 'comm-3',
    video_id: 'vid-002',
    user_id: 'user-002',
    user_name: 'Marcos Silva',
    user_handle: 'marcos_viewer',
    user_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&fit=crop',
    content: 'Valeu cada centavo do passe VIP, sem palavras!',
    likes_count: 42,
    created_at: new Date(Date.now() - 14 * 3600000).toISOString(),
  }
];

const INITIAL_SUBSCRIPTIONS: Subscription[] = [
  {
    id: 'sub-1',
    user_id: 'user-002',
    creator_id: 'creator-001',
    plan_tier: 'vip',
    amount: 59.90,
    status: 'active',
    current_period_end: new Date(Date.now() + 25 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  }
];

const INITIAL_PURCHASES: Purchase[] = [
  {
    id: 'pur-1',
    user_id: 'user-002',
    video_id: 'vid-002',
    creator_id: 'creator-002',
    amount: 19.90,
    payment_method: 'pix',
    status: 'completed',
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  }
];

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    user_id: 'user-001',
    sender_id: 'user-002',
    sender_name: 'Marcos Silva',
    sender_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&fit=crop',
    type: 'subscription',
    title: 'Nova Assinatura VIP! 💎',
    message: 'Marcos Silva assinou seu Plano VIP (R$ 59,90/mês).',
    target_id: 'creator-001',
    read: false,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'notif-2',
    user_id: 'user-001',
    sender_id: 'user-002',
    sender_name: 'Marcos Silva',
    sender_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&fit=crop',
    type: 'like',
    title: 'Nova curtida',
    message: 'Marcos Silva curtiu seu vídeo "Bastidores do novo ensaio".',
    target_id: 'vid-001',
    read: true,
    created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
  {
    id: 'notif-3',
    user_id: 'user-002',
    type: 'premium_unlocked',
    title: 'Conteúdo Desbloqueado! 🔓',
    message: 'Seu acesso a "Edição Especial Noturna: Glamour & Sombra" foi liberado.',
    target_id: 'vid-002',
    read: true,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  }
];

const INITIAL_REPORTS: Report[] = [
  {
    id: 'rep-1',
    reporter_id: 'user-002',
    reporter_name: 'Marcos Silva',
    target_type: 'video',
    target_id: 'vid-003',
    target_title: 'Treino da tarde com vista para o mar',
    reason: 'spam',
    description: 'Possível repetição de hashtags desnecessárias.',
    status: 'pending',
    created_at: new Date(Date.now() - 18 * 3600000).toISOString(),
  }
];

const INITIAL_WITHDRAWALS: Withdrawal[] = [
  {
    id: 'wd-1',
    creator_id: 'creator-001',
    amount: 1500.00,
    fee: 150.00,
    net_amount: 1350.00,
    pix_key: 'fernanda@exemplo.com',
    pix_key_type: 'email',
    status: 'approved',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: 'wd-2',
    creator_id: 'creator-002',
    amount: 3200.00,
    fee: 320.00,
    net_amount: 2880.00,
    pix_key: '11987654321',
    pix_key_type: 'phone',
    status: 'pending',
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  }
];

class DatabaseService {
  private users: User[] = getStored('users', INITIAL_USERS);
  private creators: Creator[] = getStored('creators', INITIAL_CREATORS);
  private videos: Video[] = getStored('videos', INITIAL_VIDEOS);
  private comments: Comment[] = getStored('comments', INITIAL_COMMENTS);
  private follows: Follow[] = getStored('follows', [
    { id: 'f1', follower_id: 'user-002', creator_id: 'creator-001', created_at: new Date().toISOString() }
  ]);
  private favorites: Favorite[] = getStored('favorites', [
    { id: 'fav1', user_id: 'user-002', video_id: 'vid-001', created_at: new Date().toISOString() }
  ]);
  private likes: { id: string; user_id: string; video_id: string }[] = getStored('likes', [
    { id: 'l1', user_id: 'user-002', video_id: 'vid-001' },
    { id: 'l2', user_id: 'user-002', video_id: 'vid-002' }
  ]);
  private subscriptions: Subscription[] = getStored('subscriptions', INITIAL_SUBSCRIPTIONS);
  private purchases: Purchase[] = getStored('purchases', INITIAL_PURCHASES);
  private notifications: Notification[] = getStored('notifications', INITIAL_NOTIFICATIONS);
  private reports: Report[] = getStored('reports', INITIAL_REPORTS);
  private withdrawals: Withdrawal[] = getStored('withdrawals', INITIAL_WITHDRAWALS);
  private categories: SystemCategory[] = getStored('categories', INITIAL_CATEGORIES);
  private tags: SystemTag[] = getStored('tags', INITIAL_TAGS);
  private securityLogs: SecurityAuditLog[] = getStored('security_logs', INITIAL_SECURITY_LOGS);
  private currentUserId: string = getStored('current_user_id', 'user-001');

  private listeners: Set<() => void> = new Set();

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  // --- Current User & Auth Helpers ---
  public getCurrentUser(): User {
    let u = this.users.find(x => x.id === this.currentUserId);
    if (!u) {
      u = this.users[0];
      this.currentUserId = u.id;
    }
    return u;
  }

  public setCurrentUser(userId: string) {
    this.currentUserId = userId;
    setStored('current_user_id', userId);
    this.notify();
  }

  public getAllUsers(): User[] {
    return [...this.users];
  }

  public updateUser(userId: string, partial: Partial<User>): User {
    this.users = this.users.map(u => {
      if (u.id === userId) {
        return { ...u, ...partial };
      }
      return u;
    });
    setStored('users', this.users);
    this.notify();
    return this.getCurrentUser();
  }

  public registerUser(name: string, username: string, email: string, birth_date: string, role: 'user' | 'creator' = 'user'): User {
    const newUser: User = {
      id: 'user-' + Date.now(),
      email,
      username: username.toLowerCase().replace(/\s+/g, '_'),
      name,
      avatar_url: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&fit=crop`,
      role,
      birth_date,
      age_verified: true,
      wallet_balance: 50.00, // Welcome gift
      created_at: new Date().toISOString()
    };
    this.users.unshift(newUser);
    setStored('users', this.users);

    if (role === 'creator') {
      const newCreator: Creator = {
        id: 'creator-' + Date.now(),
        user_id: newUser.id,
        display_name: name,
        handle: newUser.username,
        avatar_url: newUser.avatar_url,
        cover_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200&fit=crop',
        bio: 'Novo criador exclusivo Velvet VIP.',
        verified: false,
        is_approved: true,
        subscription_price_basic: 29.90,
        subscription_price_vip: 59.90,
        total_followers: 0,
        total_likes: 0,
        total_views: 0,
        gross_earnings: 0,
        available_balance: 0,
        category: 'Glamour & Lifestyle',
        created_at: new Date().toISOString()
      };
      this.creators.unshift(newCreator);
      setStored('creators', this.creators);
    }

    this.setCurrentUser(newUser.id);
    return newUser;
  }

  // --- Creators ---
  public getCreators(): Creator[] {
    return [...this.creators];
  }

  public getCreatorById(id: string): Creator | undefined {
    return this.creators.find(c => c.id === id);
  }

  public getCreatorByUserId(userId: string): Creator | undefined {
    return this.creators.find(c => c.user_id === userId);
  }

  public updateCreator(creatorId: string, partial: Partial<Creator>): Creator {
    this.creators = this.creators.map(c => c.id === creatorId ? { ...c, ...partial } : c);
    setStored('creators', this.creators);
    this.notify();
    return this.getCreatorById(creatorId)!;
  }

  // --- Follows ---
  public isFollowing(creatorId: string): boolean {
    const cur = this.getCurrentUser();
    return this.follows.some(f => f.follower_id === cur.id && f.creator_id === creatorId);
  }

  public toggleFollow(creatorId: string): boolean {
    const cur = this.getCurrentUser();
    const existing = this.follows.find(f => f.follower_id === cur.id && f.creator_id === creatorId);
    let nowFollowing = false;

    if (existing) {
      this.follows = this.follows.filter(f => f.id !== existing.id);
      this.updateCreatorStats(creatorId, { followersDelta: -1 });
      nowFollowing = false;
    } else {
      this.follows.push({
        id: 'follow-' + Date.now(),
        follower_id: cur.id,
        creator_id: creatorId,
        created_at: new Date().toISOString()
      });
      this.updateCreatorStats(creatorId, { followersDelta: 1 });
      nowFollowing = true;

      // Notify creator
      const targetCreator = this.getCreatorById(creatorId);
      if (targetCreator) {
        this.addNotification({
          user_id: targetCreator.user_id,
          sender_id: cur.id,
          sender_name: cur.name,
          sender_avatar: cur.avatar_url,
          type: 'follow',
          title: 'Novo seguidor',
          message: `${cur.name} começou a seguir seu perfil.`,
          target_id: creatorId
        });
      }
    }

    setStored('follows', this.follows);
    this.notify();
    return nowFollowing;
  }

  private updateCreatorStats(creatorId: string, { followersDelta = 0, likesDelta = 0, viewsDelta = 0 }: { followersDelta?: number; likesDelta?: number; viewsDelta?: number }) {
    this.creators = this.creators.map(c => {
      if (c.id === creatorId) {
        return {
          ...c,
          total_followers: Math.max(0, c.total_followers + followersDelta),
          total_likes: Math.max(0, c.total_likes + likesDelta),
          total_views: Math.max(0, c.total_views + viewsDelta)
        };
      }
      return c;
    });
    setStored('creators', this.creators);
  }

  // --- Videos & Feed ---
  private getSearchHistory(userId: string): string[] {
    return getStored<string[]>('search_history_' + userId, []);
  }

  public recordSearch(term: string) {
    const cur = this.getCurrentUser();
    const clean = term.toLowerCase().trim().slice(0, 80);
    if (!clean) return;
    const history = this.getSearchHistory(cur.id).filter(item => item !== clean);
    history.unshift(clean);
    setStored('search_history_' + cur.id, history.slice(0, 30));
    this.notify();
  }

  public getSearchHistoryForCurrentUser(): string[] {
    return this.getSearchHistory(this.getCurrentUser().id);
  }

  public clearSearchHistory() {
    const cur = this.getCurrentUser();
    setStored('search_history_' + cur.id, []);
    this.notify();
  }

  public getVideos(tab: 'foryou' | 'following' | 'trending' | 'new' | 'premium' = 'foryou'): Video[] {
    const cur = this.getCurrentUser();
    const creatorMap = new Map(this.creators.map(c => [c.id, c]));
    const likedSet = new Set(this.likes.filter(l => l.user_id === cur.id).map(l => l.video_id));
    const favSet = new Set(this.favorites.filter(f => f.user_id === cur.id).map(f => f.video_id));
    const purchasedSet = new Set(this.purchases.filter(p => p.user_id === cur.id && p.status === 'completed').map(p => p.video_id));
    const activeSubs = new Set(this.subscriptions.filter(s => s.user_id === cur.id && s.status === 'active').map(s => s.creator_id));
    const followedCreators = new Set(this.follows.filter(f => f.follower_id === cur.id).map(f => f.creator_id));

    let list = this.videos
      .filter(v => !v.is_removed && !v.is_draft)
      .map(v => {
        const creator = creatorMap.get(v.creator_id);
        const hasUnlocked = !v.is_premium || purchasedSet.has(v.id) || activeSubs.has(v.creator_id) || (creator && creator.user_id === cur.id);
        return {
          ...v,
          creator,
          has_liked: likedSet.has(v.id),
          has_favorited: favSet.has(v.id),
          has_unlocked: Boolean(hasUnlocked)
        };
      });

    const creatorSubs = new Map<string, number>();
    const creatorPurchases = new Map<string, number>();
    this.subscriptions.forEach(s => creatorSubs.set(s.creator_id, (creatorSubs.get(s.creator_id) || 0) + 1));
    this.purchases.forEach(p => creatorPurchases.set(p.creator_id, (creatorPurchases.get(p.creator_id) || 0) + 1));
    const now = Date.now();
    const searchHistory = this.getSearchHistory(cur.id);
    const score = (v: Video) => {
      const ageHours = Math.max(1, (now - new Date(v.created_at).getTime()) / 3600000);
      const freshness = Math.max(0, 72 - ageHours) / 72;
      const creator = creatorMap.get(v.creator_id);
      const popularity = Math.log1p(v.views_count) * 1.0 + Math.log1p(v.likes_count) * 3.0 + Math.log1p(v.comments_count) * 2.5 + Math.log1p(v.favorites_count) * 2.0;
      const businessSignal = (creatorSubs.get(v.creator_id) || 0) * 2.5 + (creatorPurchases.get(v.creator_id) || 0) * 3.0;
      const searchable = [v.title, v.description, v.category, ...(v.hashtags || []), creator?.display_name || '', creator?.handle || ''].join(' ').toLowerCase();
      const searchAffinity = searchHistory.reduce((total, term) => total + (searchable.includes(term) ? 3 : 0), 0);
      const personal = (v.has_liked ? 2 : 0) + (v.has_favorited ? 2 : 0) + (activeSubs.has(v.creator_id) ? 6 : 0) + (followedCreators.has(v.creator_id) ? 4 : 0) + searchAffinity;
      const quality = creator?.verified ? 1.5 : 0;
      return popularity + businessSignal + freshness * 8 + personal + quality;
    };

    switch (tab) {
      case 'following':
        list = list.filter(v => followedCreators.has(v.creator_id));
        break;
      case 'trending':
        list = [...list].sort((a, b) => score(b) - score(a));
        break;
      case 'new':
        list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'premium':
        list = list.filter(v => v.is_premium).sort((a, b) => score(b) - score(a));
        break;
      case 'foryou':
      default:
        list = [...list].sort((a, b) => (Number(a.is_premium) - Number(b.is_premium)) || (score(b) - score(a)));
        break;
    }

    return list;
  }

  public getVideoById(id: string): Video | undefined {
    const list = this.getVideos('foryou');
    return list.find(v => v.id === id);
  }

  public getVideosByCreator(creatorId: string): Video[] {
    const list = this.getVideos('foryou');
    return list.filter(v => v.creator_id === creatorId);
  }

  public recordView(videoId: string) {
    this.videos = this.videos.map(v => {
      if (v.id === videoId) {
        return { ...v, views_count: v.views_count + 1 };
      }
      return v;
    });
    setStored('videos', this.videos);
  }

  public toggleLike(videoId: string): { hasLiked: boolean; count: number } {
    const cur = this.getCurrentUser();
    const existingIndex = this.likes.findIndex(l => l.user_id === cur.id && l.video_id === videoId);
    let hasLiked = false;
    let delta = 0;

    if (existingIndex > -1) {
      this.likes.splice(existingIndex, 1);
      hasLiked = false;
      delta = -1;
    } else {
      this.likes.push({
        id: 'like-' + Date.now(),
        user_id: cur.id,
        video_id: videoId
      });
      hasLiked = true;
      delta = 1;

      // Notification
      const vid = this.videos.find(v => v.id === videoId);
      if (vid) {
        const creator = this.getCreatorById(vid.creator_id);
        if (creator && creator.user_id !== cur.id) {
          this.addNotification({
            user_id: creator.user_id,
            sender_id: cur.id,
            sender_name: cur.name,
            sender_avatar: cur.avatar_url,
            type: 'like',
            title: 'Nova curtida',
            message: `${cur.name} curtiu seu vídeo "${vid.title.slice(0, 30)}..."`,
            target_id: vid.id
          });
        }
      }
    }

    let newCount = 0;
    this.videos = this.videos.map(v => {
      if (v.id === videoId) {
        newCount = Math.max(0, v.likes_count + delta);
        return { ...v, likes_count: newCount };
      }
      return v;
    });

    const targetVid = this.videos.find(v => v.id === videoId);
    if (targetVid) {
      this.updateCreatorStats(targetVid.creator_id, { likesDelta: delta });
    }

    setStored('likes', this.likes);
    setStored('videos', this.videos);
    this.notify();
    return { hasLiked, count: newCount };
  }

  public toggleFavorite(videoId: string): boolean {
    const cur = this.getCurrentUser();
    const existingIndex = this.favorites.findIndex(f => f.user_id === cur.id && f.video_id === videoId);
    let hasFav = false;
    let delta = 0;

    if (existingIndex > -1) {
      this.favorites.splice(existingIndex, 1);
      hasFav = false;
      delta = -1;
    } else {
      this.favorites.push({
        id: 'fav-' + Date.now(),
        user_id: cur.id,
        video_id: videoId,
        created_at: new Date().toISOString()
      });
      hasFav = true;
      delta = 1;
    }

    this.videos = this.videos.map(v => {
      if (v.id === videoId) {
        return { ...v, favorites_count: Math.max(0, v.favorites_count + delta) };
      }
      return v;
    });

    setStored('favorites', this.favorites);
    setStored('videos', this.videos);
    this.notify();
    return hasFav;
  }

  public getFavorites(): Video[] {
    const cur = this.getCurrentUser();
    const favVideoIds = new Set(this.favorites.filter(f => f.user_id === cur.id).map(f => f.video_id));
    const all = this.getVideos('foryou');
    return all.filter(v => favVideoIds.has(v.id));
  }

  // --- Comments ---
  public getComments(videoId: string): Comment[] {
    return this.comments
      .filter(c => c.video_id === videoId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public addComment(videoId: string, content: string): Comment {
    const cur = this.getCurrentUser();
    const newComment: Comment = {
      id: 'comm-' + Date.now(),
      video_id: videoId,
      user_id: cur.id,
      user_name: cur.name,
      user_avatar: cur.avatar_url,
      user_handle: cur.username,
      content,
      likes_count: 0,
      created_at: new Date().toISOString()
    };

    this.comments.unshift(newComment);
    setStored('comments', this.comments);

    this.videos = this.videos.map(v => {
      if (v.id === videoId) {
        return { ...v, comments_count: v.comments_count + 1 };
      }
      return v;
    });
    setStored('videos', this.videos);

    const vid = this.videos.find(v => v.id === videoId);
    if (vid) {
      const creator = this.getCreatorById(vid.creator_id);
      if (creator && creator.user_id !== cur.id) {
        this.addNotification({
          user_id: creator.user_id,
          sender_id: cur.id,
          sender_name: cur.name,
          sender_avatar: cur.avatar_url,
          type: 'comment',
          title: 'Novo comentário',
          message: `${cur.name} comentou: "${content.slice(0, 40)}..."`,
          target_id: videoId
        });
      }
    }

    this.notify();
    return newComment;
  }

  // --- Upload Video ---
  public uploadVideo(data: {
    title: string;
    description: string;
    video_url: string;
    thumbnail_url: string;
    category: string;
    hashtags: string[];
    is_premium: boolean;
    premium_price?: number;
    required_tier?: 'free' | 'basic' | 'vip';
    is_draft?: boolean;
    content_kind?: 'short' | 'long';
  }): Video {
    const cur = this.getCurrentUser();
    let creator = this.getCreatorByUserId(cur.id);

    if (!creator) {
      throw new Error('Apenas criadores aprovados podem publicar conteúdo.');
    }

    const newVideo: Video = {
      id: 'vid-' + Date.now(),
      creator_id: creator.id,
      title: data.title,
      description: data.description,
      video_url: data.video_url,
      thumbnail_url: data.thumbnail_url || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&fit=crop',
      duration_seconds: 15,
      aspect_ratio: data.content_kind === 'long' ? '16:9' : '9:16',
      content_kind: data.content_kind || 'short',
      orientation: data.content_kind === 'long' ? 'horizontal' : 'vertical',
      is_premium: data.is_premium,
      premium_price: data.is_premium ? (data.premium_price || 19.90) : 0,
      required_tier: data.is_premium ? (data.required_tier || 'basic') : 'free',
      category: data.category,
      hashtags: data.hashtags,
      views_count: 1,
      likes_count: 0,
      comments_count: 0,
      favorites_count: 0,
      is_draft: Boolean(data.is_draft),
      is_removed: false,
      created_at: new Date().toISOString()
    };

    this.videos.unshift(newVideo);
    setStored('videos', this.videos);
    this.notify();
    return newVideo;
  }

  public deleteVideo(videoId: string) {
    this.videos = this.videos.filter(v => v.id !== videoId);
    setStored('videos', this.videos);
    this.notify();
  }

  // --- Subscriptions & Monetization ---
  public subscribeToCreator(creatorId: string, planTier: 'basic' | 'vip' | 'exclusive'): Subscription {
    const cur = this.getCurrentUser();
    const creator = this.getCreatorById(creatorId);
    if (!creator) throw new Error('Criador não encontrado');

    const price = planTier === 'vip' ? creator.subscription_price_vip : creator.subscription_price_basic;

    if (cur.wallet_balance < price) {
      throw new Error('Saldo insuficiente. Adicione créditos antes de assinar.');
    }

    // Deduct user wallet
    this.updateUser(cur.id, { wallet_balance: Math.max(0, cur.wallet_balance - price) });

    // Credit creator available balance (platform fee = 15%)
    const netCredit = price * 0.85;
    this.updateCreator(creatorId, {
      available_balance: creator.available_balance + netCredit,
      gross_earnings: creator.gross_earnings + price
    });

    // Save subscription
    const existingSubIdx = this.subscriptions.findIndex(s => s.user_id === cur.id && s.creator_id === creatorId);
    const newSub: Subscription = {
      id: 'sub-' + Date.now(),
      user_id: cur.id,
      creator_id: creatorId,
      plan_tier: planTier,
      amount: price,
      status: 'active',
      current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
      created_at: new Date().toISOString()
    };

    if (existingSubIdx > -1) {
      this.subscriptions[existingSubIdx] = newSub;
    } else {
      this.subscriptions.push(newSub);
    }
    setStored('subscriptions', this.subscriptions);

    // Notify creator & user
    this.addNotification({
      user_id: creator.user_id,
      sender_id: cur.id,
      sender_name: cur.name,
      sender_avatar: cur.avatar_url,
      type: 'subscription',
      title: 'Nova Assinatura Confirmada! 💎',
      message: `${cur.name} assinou seu plano ${planTier.toUpperCase()} por R$ ${price.toFixed(2).replace('.', ',')}.`,
      target_id: creatorId
    });

    this.addNotification({
      user_id: cur.id,
      type: 'system',
      title: 'Assinatura Ativa!',
      message: `Você agora tem acesso ilimitado aos conteúdos de ${creator.display_name}.`,
      target_id: creatorId
    });

    this.notify();
    return newSub;
  }

  public cancelSubscription(subscriptionId: string) {
    this.subscriptions = this.subscriptions.map(s => {
      if (s.id === subscriptionId) {
        return { ...s, status: 'cancelled' };
      }
      return s;
    });
    setStored('subscriptions', this.subscriptions);
    this.notify();
  }

  public purchaseVideo(videoId: string, paymentMethod: 'credit_card' | 'pix' | 'wallet' = 'pix'): Purchase {
    const cur = this.getCurrentUser();
    const vid = this.videos.find(v => v.id === videoId);
    if (!vid) throw new Error('Vídeo não encontrado');

    const amount = vid.premium_price || 19.90;

    // Credit creator
    const creator = this.getCreatorById(vid.creator_id);
    if (creator) {
      const net = amount * 0.85;
      this.updateCreator(creator.id, {
        available_balance: creator.available_balance + net,
        gross_earnings: creator.gross_earnings + amount
      });
    }

    const newPurchase: Purchase = {
      id: 'pur-' + Date.now(),
      user_id: cur.id,
      video_id: videoId,
      creator_id: vid.creator_id,
      amount,
      payment_method: paymentMethod,
      status: 'completed',
      created_at: new Date().toISOString()
    };

    this.purchases.push(newPurchase);
    setStored('purchases', this.purchases);

    if (creator) {
      this.addNotification({
        user_id: creator.user_id,
        sender_id: cur.id,
        sender_name: cur.name,
        type: 'purchase',
        title: 'Venda de Conteúdo VIP! 💰',
        message: `${cur.name} comprou o vídeo "${vid.title.slice(0, 30)}..." por R$ ${amount.toFixed(2).replace('.', ',')}.`,
        target_id: videoId
      });
    }

    this.addNotification({
      user_id: cur.id,
      type: 'premium_unlocked',
      title: 'Conteúdo Desbloqueado! 🔓',
      message: `O vídeo "${vid.title}" está disponível na sua biblioteca Minhas Compras.`,
      target_id: videoId
    });

    this.notify();
    return newPurchase;
  }

  public getUserPurchases(): { purchases: Purchase[]; videos: Video[] } {
    const cur = this.getCurrentUser();
    const userPurchases = this.purchases.filter(p => p.user_id === cur.id && p.status === 'completed');
    const pVideoIds = new Set(userPurchases.map(p => p.video_id));
    const all = this.getVideos('foryou');
    const videos = all.filter(v => pVideoIds.has(v.id));
    return { purchases: userPurchases, videos };
  }

  public getPurchasedVideos(): Video[] {
    return this.getUserPurchases().videos;
  }

  public getUserSubscriptions(): { subscriptions: Subscription[]; creators: Creator[] } {
    const cur = this.getCurrentUser();
    const userSubs = this.subscriptions.filter(s => s.user_id === cur.id);
    const cMap = new Map(this.creators.map(c => [c.id, c]));
    const creators = userSubs.map(s => cMap.get(s.creator_id)).filter(Boolean) as Creator[];
    return { subscriptions: userSubs, creators };
  }

  public getSubscriptions(): Subscription[] {
    const cur = this.getCurrentUser();
    const cMap = new Map(this.creators.map(c => [c.id, c]));
    return this.subscriptions
      .filter(s => s.user_id === cur.id)
      .map(s => {
        const creator = cMap.get(s.creator_id);
        return {
          ...s,
          price: s.amount,
          creator_name: creator?.display_name || 'Criador Velvet',
          creator_avatar: creator?.avatar_url,
          next_billing_date: s.current_period_end || new Date(Date.now() + 30 * 86400000).toISOString(),
        };
      });
  }

  public updateCreatorPlans(creatorId: string, basicPrice: number, vipPrice: number) {
    this.updateCreator(creatorId, {
      subscription_price_basic: basicPrice,
      subscription_price_vip: vipPrice,
    });
  }

  public getStats() {
    const total_revenue = this.purchases.reduce((acc, p) => acc + p.amount, 0) +
      this.subscriptions.reduce((acc, s) => acc + s.amount, 0);

    return {
      total_users: this.users.length,
      total_creators: this.creators.length,
      total_videos: this.videos.length,
      total_revenue: total_revenue || 48920.00,
      platform_fee_percent: 15,
    };
  }

  public approveWithdrawal(withdrawalId: string) {
    this.withdrawals = this.withdrawals.map(w =>
      w.id === withdrawalId ? { ...w, status: 'approved' as const } : w
    );
    setStored('withdrawals', this.withdrawals);
    this.notify();
  }

  public toggleCreatorVerification(creatorId: string) {
    const creator = this.getCreatorById(creatorId);
    if (creator) {
      this.updateCreator(creatorId, { verified: !creator.verified });
    }
  }

  // --- Withdrawals ---
  public requestWithdrawal(creatorId: string, amount: number, pixKey: string, pixKeyType: 'cpf' | 'email' | 'phone' | 'random'): Withdrawal {
    const creator = this.getCreatorById(creatorId);
    if (!creator) throw new Error('Criador inválido');
    if (creator.available_balance < amount) throw new Error('Saldo insuficiente para saque');

    const fee = amount * 0.05; // 5% saque fee
    const net = amount - fee;

    this.updateCreator(creatorId, {
      available_balance: creator.available_balance - amount
    });

    const newWd: Withdrawal = {
      id: 'wd-' + Date.now(),
      creator_id: creatorId,
      amount,
      fee,
      net_amount: net,
      pix_key: pixKey,
      pix_key_type: pixKeyType,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    this.withdrawals.unshift(newWd);
    setStored('withdrawals', this.withdrawals);
    this.notify();
    return newWd;
  }

  public getWithdrawals(creatorId?: string): Withdrawal[] {
    if (creatorId) {
      return this.withdrawals.filter(w => w.creator_id === creatorId);
    }
    return [...this.withdrawals];
  }

  public updateWithdrawalStatus(withdrawalId: string, status: 'approved' | 'rejected' | 'processing') {
    this.withdrawals = this.withdrawals.map(w => w.id === withdrawalId ? { ...w, status } : w);
    setStored('withdrawals', this.withdrawals);
    this.notify();
  }

  // --- Reports & Moderation ---
  public submitReport(data: {
    target_type: 'video' | 'creator' | 'comment';
    target_id: string;
    target_title?: string;
    reason: any;
    description: string;
  }): Report {
    const cur = this.getCurrentUser();
    const newRep: Report = {
      id: 'rep-' + Date.now(),
      reporter_id: cur.id,
      reporter_name: cur.name,
      target_type: data.target_type,
      target_id: data.target_id,
      target_title: data.target_title,
      reason: data.reason,
      description: data.description,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    this.reports.unshift(newRep);
    setStored('reports', this.reports);
    this.notify();
    return newRep;
  }

  public getReports(): Report[] {
    return [...this.reports];
  }

  public updateReportStatus(reportId: string, status: 'pending' | 'reviewing' | 'resolved' | 'dismissed', adminNotes?: string) {
    this.reports = this.reports.map(r => {
      if (r.id === reportId) {
        return { ...r, status, admin_notes: adminNotes || r.admin_notes };
      }
      return r;
    });
    setStored('reports', this.reports);
    this.notify();
  }

  // --- Monetization helpers ---
  public getPlatformPlans() {
    return [
      { id: 'plan-free', name: 'Grátis', slug: 'gratis', monthly_price: 0, ads_enabled: true, benefits: ['Feed com anúncios', 'Recursos essenciais'], is_active: true },
      { id: 'plan-plus', name: 'Plus', slug: 'plus', monthly_price: 19.90, ads_enabled: false, benefits: ['Sem anúncios', 'Filtros avançados', 'Mais favoritos'], is_active: true },
      { id: 'plan-vip', name: 'VIP', slug: 'vip', monthly_price: 39.90, ads_enabled: false, benefits: ['Sem anúncios', 'Acesso antecipado', 'Descontos e gorjetas destacadas'], is_active: true },
    ];
  }

  public sendTip(creatorId: string, amount: number, message = '') {
    const cur = this.getCurrentUser();
    const creator = this.getCreatorById(creatorId);
    if (!creator) throw new Error('Criador não encontrado');
    if (!Number.isFinite(amount) || amount < 1) throw new Error('A gorjeta mínima é de R$ 1,00');
    if (cur.wallet_balance < amount) throw new Error('Saldo insuficiente. Adicione créditos antes de enviar a gorjeta.');
    const creatorAmount = Number((amount * 0.90).toFixed(2));
    this.updateUser(cur.id, { wallet_balance: cur.wallet_balance - amount });
    this.updateCreator(creatorId, { available_balance: creator.available_balance + creatorAmount, gross_earnings: creator.gross_earnings + amount });
    this.addNotification({ user_id: creator.user_id, sender_id: cur.id, sender_name: cur.name, sender_avatar: cur.avatar_url, type: 'payout', title: 'Você recebeu uma gorjeta', message: 'Um fã enviou uma gorjeta de R$ ' + amount.toFixed(2).replace('.', ',') + '.', target_id: creatorId });
    return { id: 'tip-' + Date.now(), sender_id: cur.id, creator_id: creatorId, amount, platform_fee: Number((amount * 0.10).toFixed(2)), creator_amount: creatorAmount, message, status: 'paid' as const, created_at: new Date().toISOString() };
  }

  // --- Notifications ---
  public getNotifications(): Notification[] {
    const cur = this.getCurrentUser();
    return this.notifications.filter(n => n.user_id === cur.id);
  }

  public addNotification(data: Omit<Notification, 'id' | 'created_at' | 'read'>) {
    const newNotif: Notification = {
      id: 'notif-' + Date.now() + Math.random().toString(36).substring(2, 5),
      ...data,
      read: false,
      created_at: new Date().toISOString()
    };
    this.notifications.unshift(newNotif);
    setStored('notifications', this.notifications);
    this.notify();
  }

  public markNotificationsAsRead() {
    const cur = this.getCurrentUser();
    this.notifications = this.notifications.map(n => {
      if (n.user_id === cur.id) {
        return { ...n, read: true };
      }
      return n;
    });
    setStored('notifications', this.notifications);
    this.notify();
  }

  public markAllNotificationsAsRead() {
    this.markNotificationsAsRead();
  }

  // --- Categories Management (CRUD for Admin & Creator use) ---
  public getCategories(includeInactive: boolean = false): SystemCategory[] {
    if (includeInactive) {
      return [...this.categories].sort((a, b) => a.order - b.order);
    }
    return this.categories.filter(c => c.is_active).sort((a, b) => a.order - b.order);
  }

  public addCategory(name: string, description: string = ''): SystemCategory {
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    const newCat: SystemCategory = {
      id: 'cat-' + Date.now(),
      name: name.trim(),
      slug,
      description: description.trim(),
      is_active: true,
      order: this.categories.length + 1,
      created_at: new Date().toISOString()
    };
    this.categories.push(newCat);
    setStored('categories', this.categories);
    this.logSecurityEvent('Categoria Criada', this.getCurrentUser().email, 'success', `Nova categoria adicionada: ${newCat.name}`);
    this.notify();
    return newCat;
  }

  public updateCategory(categoryId: string, partial: Partial<SystemCategory>): SystemCategory | undefined {
    this.categories = this.categories.map(c => c.id === categoryId ? { ...c, ...partial } : c);
    setStored('categories', this.categories);
    this.notify();
    return this.categories.find(c => c.id === categoryId);
  }

  public deleteCategory(categoryId: string) {
    const target = this.categories.find(c => c.id === categoryId);
    this.categories = this.categories.filter(c => c.id !== categoryId);
    setStored('categories', this.categories);
    if (target) {
      this.logSecurityEvent('Categoria Removida', this.getCurrentUser().email, 'warning', `Categoria excluída: ${target.name}`);
    }
    this.notify();
  }

  // --- Tags Management ---
  public getTags(): SystemTag[] {
    return [...this.tags];
  }

  public addTag(name: string): SystemTag {
    const clean = name.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
    const existing = this.tags.find(t => t.name === clean);
    if (existing) return existing;

    const newTag: SystemTag = {
      id: 'tag-' + Date.now(),
      name: clean,
      slug: clean,
      is_active: true,
      created_at: new Date().toISOString()
    };
    this.tags.push(newTag);
    setStored('tags', this.tags);
    this.notify();
    return newTag;
  }

  public deleteTag(tagId: string) {
    this.tags = this.tags.filter(t => t.id !== tagId);
    setStored('tags', this.tags);
    this.notify();
  }

  // --- Cyber Security & Audit Logs ---
  public getSecurityLogs(): SecurityAuditLog[] {
    return [...this.securityLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public logSecurityEvent(event: string, user_email: string, status: 'success' | 'warning' | 'blocked', details: string) {
    const newLog: SecurityAuditLog = {
      id: 'sec-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      event,
      user_email,
      ip_address: 'redacted',
      status,
      details,
      timestamp: new Date().toISOString()
    };
    this.securityLogs.unshift(newLog);
    if (this.securityLogs.length > 50) this.securityLogs = this.securityLogs.slice(0, 50);
    setStored('security_logs', this.securityLogs);
    this.notify();
  }

  // --- LGPD & User Data Rights (Art. 18 Lei 13.709/2018) ---
  public exportUserDataLGPD(userId: string) {
    const user = this.users.find(u => u.id === userId);
    const creator = this.creators.find(c => c.user_id === userId);
    const userVideos = this.videos.filter(v => creator && v.creator_id === creator.id);
    const userComments = this.comments.filter(c => c.user_id === userId);
    const userSubscriptions = this.subscriptions.filter(s => s.user_id === userId);
    const userPurchases = this.purchases.filter(p => p.user_id === userId);
    const userWithdrawals = creator ? this.withdrawals.filter(w => w.creator_id === creator.id) : [];

    const exportBundle = {
      termo_lgpd: 'Exportação de Dados Pessoais em conformidade com o Art. 18 da Lei Federal 13.709/2018 (LGPD).',
      data_extracao: new Date().toISOString(),
      dados_cadastrais: user,
      perfil_criador: creator || null,
      videos_publicados: userVideos,
      comentarios: userComments,
      assinaturas_ativas_historico: userSubscriptions,
      compras_pay_per_view: userPurchases,
      solicitacoes_saque_pix: userWithdrawals
    };

    this.logSecurityEvent('Exportação LGPD Solicitada', user?.email || 'anon', 'success', 'Cópia integral de dados exportada.');
    return exportBundle;
  }

  public deleteUserAccountLGPD(userId: string) {
    const user = this.users.find(u => u.id === userId);
    this.users = this.users.filter(u => u.id !== userId);
    this.comments = this.comments.filter(c => c.user_id !== userId);
    this.subscriptions = this.subscriptions.filter(s => s.user_id !== userId);
    this.purchases = this.purchases.filter(p => p.user_id !== userId);
    setStored('users', this.users);
    setStored('comments', this.comments);
    setStored('subscriptions', this.subscriptions);
    setStored('purchases', this.purchases);
    
    if (user) {
      this.logSecurityEvent('Direito ao Esquecimento LGPD', user.email, 'warning', 'Conta de usuário e dados anonimizados/excluídos a pedido do titular.');
    }

    this.setCurrentUser('user-002');
    this.notify();
  }

  // --- Reset Database to Seed ---
  public resetToSeed() {
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'users');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'creators');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'videos');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'comments');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'likes');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'follows');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'favorites');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'subscriptions');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'purchases');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'notifications');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'reports');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'withdrawals');
    localStorage.removeItem(STORAGE_KEY_PREFIX + 'current_user_id');

    this.users = INITIAL_USERS;
    this.creators = INITIAL_CREATORS;
    this.videos = INITIAL_VIDEOS;
    this.comments = INITIAL_COMMENTS;
    this.subscriptions = INITIAL_SUBSCRIPTIONS;
    this.purchases = INITIAL_PURCHASES;
    this.notifications = INITIAL_NOTIFICATIONS;
    this.reports = INITIAL_REPORTS;
    this.withdrawals = INITIAL_WITHDRAWALS;
    this.currentUserId = 'user-001';
    this.notify();
  }
  async hasRestriction(scope: 'account'|'publish'|'live'|'comment'|'message'|'purchase'|'monetization'|'withdrawal'): Promise<boolean> {
    if (!supabase || !isSupabaseConfigured) return false;
    const { data, error } = await supabase.rpc('has_active_restriction', { p_scope: scope });
    if (error) throw error;
    return Boolean(data);
  }

}

export const dbService = new DatabaseService();
