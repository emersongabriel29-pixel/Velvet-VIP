# Production Status — Velvet VIP

Atualizado em 18/09/2026. Este documento separa código versionado de serviços que precisam ser configurados e testados no ambiente real.

## Estado atual

| Área | Estado | Observação |
|---|---|---|
| Frontend React/Vite/TypeScript | Implementado | CI valida typecheck, testes e build |
| Autenticação Supabase | Parcial/real | Requer variáveis do projeto e políticas aplicadas |
| Banco e RLS | Implementado no código SQL | Executar as migrações 001–028 no projeto correto |
| Planos da plataforma | Implementado | Mensal, semestral, anual, benefícios, ativo/inativo |
| Planos dos criadores | Implementado | Persistidos em subscription_plans |
| Pagamentos Mercado Pago | Implementado no servidor | Exige credenciais, webhook público e testes de sandbox |
| Ledger e estados financeiros | Estruturado | PENDING, APPROVED, AVAILABLE, WITHDRAWN, REFUNDED, CHARGEBACK |
| Saques | Parcial | Fluxo de solicitação existe; repasse bancário e revisão antifraude precisam de operação |
| KYC/idade de criadores | Estrutura pronta | É necessário contratar/conectar um provedor de verificação |
| Moderação | Fila e regras estruturadas | Classificador de IA e revisão humana precisam de provedor/equipe |
| Upload privado | Estruturado | Upload real implementado no código; aplicar migrações/policies e validar em staging |
| Streaming HLS/CDN | Planejado/estrutura pronta | Media jobs existem; falta worker de transcodificação e CDN |
| Watermark | Campo e política prontos | Renderização dinâmica deve ser feita no pipeline de vídeo |
| Antifraude | Estrutura pronta | Requer regras de risco, webhooks de chargeback e revisão |
| Observabilidade | Eventos estruturados | Conectar Sentry/logs/alertas/uptime |
| LGPD e termos | Documentação inicial | Validar com jurídico antes do lançamento |
| Testes E2E | Ainda necessário | Fazer em ambiente de staging com pagamentos sandbox |

## Ordem de lançamento

1. Criar projeto Supabase de staging e aplicar as migrações 001–028.
2. Confirmar RLS, storage privado, função de URL assinada e usuário administrador.
3. Configurar Mercado Pago em sandbox e testar aprovação, falha, duplicidade, reembolso e chargeback.
4. Conectar KYC de criadores e bloquear publicação sem identidade verificada e direitos confirmados.
5. Conectar transcodificação HLS, thumbnails, watermark e CDN.
6. Configurar moderação automática antes da publicação e fila humana.
7. Configurar Sentry, logs, alertas, backup e monitoramento.
8. Executar testes E2E e teste de segurança em staging.
9. Validar LGPD, política de conteúdo, termos, suporte e plano de incidentes.
10. Só então habilitar produção e pagamentos reais.

## Critério de pronto

O lançamento só deve ser considerado pronto quando os fluxos acima forem testados com dados reais de staging, sem conteúdo ilegal, e houver responsável pela moderação, suporte financeiro, chargebacks e incidentes.

## Gate automatizado de staging

O workflow `Staging gate` executa contratos em todo PR. Os testes de integração real só executam quando os secrets `STAGING_*` estiverem configurados no GitHub. Ausência desses secrets gera aviso e **não constitui aprovação de staging**. O lançamento continua bloqueado até que os cenários de `SECURITY_E2E.md` sejam executados contra infraestrutura isolada real.
