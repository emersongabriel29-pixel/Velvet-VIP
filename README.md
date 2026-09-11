# Velvet VIP

Plataforma web de vídeos verticais com perfis de criadores, feed, exploração, assinaturas, compras, carteira, moderação e integração opcional com Supabase.

## Estado atual

O projeto possui duas camadas:

- **Modo local/demo:** dados persistidos no navegador para desenvolvimento e prototipação.
- **Supabase:** autenticação, PostgreSQL e RLS para ambiente real.

> O modo local não deve ser usado como mecanismo de autenticação ou cobrança em produção.

## Desenvolvimento

```bash
npm install
npm run typecheck
npm run build
npm run dev
```

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e configure:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY` quando os recursos de IA forem utilizados
- `APP_URL` quando houver backend/callbacks

Nunca publique `service_role`, chaves privadas de gateway ou outros segredos no frontend.

## Supabase

Execute `supabase/schema.sql` em um projeto novo e revise as políticas RLS antes de colocar dados reais em produção.

A camada de pagamentos deve ser processada no servidor/Edge Function e confirmada por webhook do provedor. O navegador nunca deve alterar saldo, pagamento, saque ou comissão diretamente.

## Checklist de produção

- [ ] Supabase configurado
- [ ] RLS revisado e testado com usuários anônimo/autenticado/criador/admin
- [ ] Gateway de pagamento configurado no backend
- [ ] Webhooks idempotentes
- [ ] Storage privado para conteúdo pago + URLs assinadas
- [ ] Moderação e fluxo de denúncias ativos
- [ ] Política de privacidade, termos e retenção de dados revisados juridicamente
- [ ] Monitoramento, logs e alertas configurados
- [ ] Backup e recuperação do banco testados
- [ ] Build e typecheck passando em CI
