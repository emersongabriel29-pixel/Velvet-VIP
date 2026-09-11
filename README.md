# Velvet VIP

Plataforma web de vídeos verticais 18+ com feed, criadores, exploração, assinaturas, compras, carteira, denúncias, administração e pagamentos.

## Arquitetura

- **Frontend:** React + Vite + TypeScript + Tailwind.
- **Produção:** Supabase Auth + PostgreSQL + RLS + Storage privado + Edge Functions.
- **Pagamentos:** Mercado Pago Checkout Pro, com preferência criada no servidor e confirmação por webhook assinado.
- **Demo:** quando Supabase não está configurado, o app mantém o modo local para prototipação. Esse modo não é autenticação real e não deve processar dinheiro.

## Desenvolvimento

```bash
npm install
npm run typecheck
npm run build
npm run dev
```

## Configuração do frontend

Copie `.env.example` para `.env.local` e preencha:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `APP_URL`
- `GEMINI_API_KEY` somente se as funções de IA forem utilizadas

Nunca coloque `SUPABASE_SERVICE_ROLE_KEY`, `MERCADOPAGO_ACCESS_TOKEN` ou `MERCADOPAGO_WEBHOOK_SECRET` em variáveis `VITE_*`.

## Banco Supabase

Em um projeto Supabase novo, execute nesta ordem:

1. `supabase/schema.sql`
2. `supabase/001_hardening.sql`
3. `supabase/002_production.sql`
4. `supabase/003_catalog_moderation.sql`
5. `supabase/004_monetization.sql`
6. `supabase/005_entertainment.sql`
7. `supabase/006_content_access.sql`
8. `supabase/007_progression_referrals.sql`
9. `supabase/008_creator_plans.sql`
10. `supabase/009_safety_moderation.sql
- `010_payment_events.sql
- `011_moderation_enforcement.sql` — enforcement server-side e revisão de uploads

- Planejamento futuro de armazenamento e streaming: [`VIDEO_STORAGE_ROADMAP.md`](./VIDEO_STORAGE_ROADMAP.md)` — sessões de checkout e idempotência de webhooks`

A segunda migração endurece RLS e impede alterações client-side em campos financeiros/administrativos. A terceira cria o provisionamento de perfil após signup, ledger financeiro, idempotência de webhooks, auditoria e bucket privado de mídia.

O signup real exige data de nascimento de maioridade; a trigger de banco valida 18+ antes de criar o perfil.

## Edge Functions

Funções incluídas:

- `create-payment-preference`: valida a sessão, valida o item/preço no banco e cria uma preferência do Mercado Pago no servidor.
- `mercadopago-webhook`: valida `x-signature` via HMAC-SHA256, registra eventos de forma idempotente e liquida compra/assinatura/crédito.
- `get-video-url`: valida 18+, compra/assinatura e entrega URL assinada para mídia privada.

Configure os secrets no Supabase, não no frontend:

```bash
supabase secrets set MERCADOPAGO_ACCESS_TOKEN=...
supabase secrets set MERCADOPAGO_WEBHOOK_SECRET=...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
supabase secrets set APP_URL=https://seu-dominio.com
supabase secrets set CREATOR_SHARE_PERCENT=85
```

Depois, faça o deploy das funções:

```bash
supabase functions deploy create-payment-preference
supabase functions deploy mercadopago-webhook --no-verify-jwt
supabase functions deploy get-video-url
```

No painel do Mercado Pago, configure o webhook de pagamentos apontando para:

`https://SEU-PROJETO.supabase.co/functions/v1/mercadopago-webhook`

Use HTTPS e a chave secreta gerada pelo Mercado Pago para `MERCADOPAGO_WEBHOOK_SECRET`.

## Mídia

Conteúdo premium novo deve ser enviado para o bucket privado `velvet-media`. Em `videos.video_url`, use `storage://caminho/do/arquivo.mp4`. A função `get-video-url` converte esse caminho em URL assinada temporária depois de verificar a autorização.

Não publique originais pagos em buckets públicos.

## Segurança financeira

O navegador não pode editar `wallet_balance`, comissão, `creator_balance`, pagamentos ou saques. Alterações financeiras são realizadas por código confiável/server-side. O ledger fornece rastreabilidade e `webhook_events` impede processamento duplicado do mesmo evento externo.

## CI

O workflow `.github/workflows/ci.yml` executa `npm install`, `npm run typecheck` e `npm run build` em pushes/PRs para `main`.

## Checklist antes de abrir para o público

- [ ] Configurar Supabase real e executar as três migrations.
- [ ] Configurar Auth, domínio e e-mails de confirmação/reset.
- [ ] Configurar secrets das Edge Functions.
- [ ] Criar aplicação Mercado Pago e configurar webhook assinado.
- [ ] Testar pagamento aprovado, pendente, rejeitado e reenvio do mesmo webhook.
- [ ] Testar compra, assinatura, depósito e saldo do criador.
- [ ] Configurar Storage privado e testar URL assinada/expiração.
- [ ] Revisar RLS com anon, usuário, criador e admin.
- [ ] Configurar moderação, denúncias, bloqueios e auditoria.
- [ ] Revisar LGPD, termos 18+, retenção e política de conteúdo com profissional jurídico.
- [ ] Configurar domínio HTTPS, monitoramento, backups e alertas.
- [ ] Rodar typecheck/build e testes de navegador antes do lançamento.

## Importante

A integração de pagamento está preparada no código, mas **credenciais de produção, configuração da conta Mercado Pago, domínio HTTPS, secrets do Supabase e execução das migrations precisam ser feitos no projeto/contas reais**. Sem essas etapas externas, não existe cobrança real apenas por publicar o repositório.


## Catálogo e moderação

A plataforma utiliza catálogo de categorias e tags com foco em conteúdo adulto consensual. Termos que possam indicar menores de idade, incesto, abuso, coerção ou ausência de consentimento são proibidos e devem ser bloqueados na publicação.

Antes do lançamento, configure verificação real de identidade e maioridade dos criadores, revisão de uploads, denúncias prioritárias, remoção rápida, proteção contra redistribuição de mídia e auditoria de acesso. A confirmação de idade por checkbox, isoladamente, não é suficiente para operação comercial.

O modo local é somente demonstração. Ele não deve ser usado para autenticação, pagamentos ou armazenamento de conteúdo real.
