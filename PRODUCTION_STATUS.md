# Production status — Velvet VIP

Verificado em 19/09/2026 contra o repositório (base `667ce08`) e o projeto Supabase `kdhcczkhsxjfhfyhmxht`. Este registro distingue código, implantação e operação comprovada.

## Conferido antes desta revisão

- `comment_likes` já constava no banco (`20260919120144`); não foi reaplicada.
- Destaques, parâmetros administrativos, helpers privados, proteções financeiras, índices e ajustes RLS já estavam aplicados.
- Player `hls.js` já existia. Isso não comprova transcodificação, CDN ou ingestão de lives.
- Os seis endpoints anteriores estavam ativos; não havia worker de transcodificação no repositório.

## Alterações desta revisão

| Área | Entrega | Evidência / limite |
|---|---|---|
| Compras | Consulta compras e assinaturas da conta autenticada, resolve thumbnails privados | Não anuncia renovação automática: checkout atual compra um período |
| Notificações | Leitura e marcação no Supabase, contador real | RLS continua limitando por proprietário |
| Explorar / categorias | Catálogo real de vídeos, criadores aprovados e categorias administrativas | Lista limitada aos 100 vídeos mais recentes; busca local nessa lista |
| Denúncias | Envio para `safety_reports`, a fila usada pelo Admin | Sucesso exibido somente após confirmação do banco |
| Exportação da conta | Exporta registros próprios com paginação | Escopo informado no JSON; não representa auditoria jurídica ou todos os dados internos |
| Planos de criador | Um editor real, dentro da aba Planos | Formulário duplicado que gravava só local foi retirado |
| Demonstração | Instância local só existe com `VITE_DEMO_MODE` explícito; chamadas locais bloqueadas fora do demo | Código legado permanece para demonstração |
| Upload | Fonte não é apagada se o cadastro existir e o enfileiramento falhar | Worker usa lease, heartbeat, retry e limite de três tentativas |
| Reprodução | Valida publicação/moderação/processamento; assinatura não libera PPV separado | URLs já emitidas permanecem válidas por até 120 segundos |
| Mídia | Worker FFmpeg cria ladder sem upscale, MP4, HLS e thumbnail; fila usa `SKIP LOCKED` | Container ainda precisa ser executado em infraestrutura persistente |
| HLS | Manifesto e segmentos ficam privados; gateway valida token curto e assina segmentos diretamente no Storage | Falta carga longa e validação em aparelhos reais antes de certificar operação |
| Pagamento | Liquidação atômica, atribuição do acesso ao checkout, reembolso sem revogar recompra posterior | Testes de banco; não transação real no Mercado Pago |
| Webhook | Confere ID assinado versus pagamento consultado; falhas retornam 503 para retry | Não confirma recebimento quando a liquidação falhou |
| Dependências | Lockfile npm e `npm ci` nos workflows | Auditoria local: zero vulnerabilidades reportadas |
| Staging | Testes reais de login/RLS e bloqueio de RPC financeira | Ausência de secrets agora reprova o gate; contratos verdes não significam staging validado |

## Banco e Edge Functions

Aplicadas as migrations `20260919162845_atomic_payment_settlement.sql` e `20260919165758_media_worker_leases.sql`.
A função `settle_verified_payment` é `SECURITY INVOKER` e executável somente por `service_role` (além do proprietário do banco). Anon e authenticated não têm EXECUTE.

Atualizações implantadas nesta revisão: `payment-webhook` v5, `create-checkout` v3, `get-video-url` v6 e `get-hls-playlist` v1. A reprodução pública usa autenticação no corpo da função: somente conteúdo gratuito, sensual, publicado, aprovado e pronto dispensa login. Conteúdo restrito exige sessão e autorização; o gateway HLS aceita apenas tokens curtos emitidos após essa decisão. Os endpoints legados de pagamento foram preservados para compatibilidade e não foram certificados nesta revisão.

## Verificações executadas

- TypeScript e build Vite aprovados.
- 76 testes Node aprovados, incluindo execução dos handlers HTTP, gateway HLS privado e a restrição do banco local ao modo demo.
- 2 testes de integração FFmpeg aprovados com fontes reais em paisagem e retrato, validando MP4, playlists e segmentos HLS.
- Smoke HTTP das funções implantadas: token HLS inválido retorna 401 e pedido de vídeo sem ID retorna 400.
- `tests/sql/payment-settlement.sql` executado no banco real dentro de transação com ROLLBACK: valor adulterado, aprovação, duplicidade, evento atrasado, reembolso, recompra, falha parcial, retry, assinatura e chargeback.
- `tests/sql/core-flows.sql` executado no banco real dentro de transação com ROLLBACK: cadastro, papel, idade, aprovação de criador, RLS entre usuários, campos privilegiados, denúncia urgente, fila, lease e preservação da moderação.
- Fixtures SQL foram desfeitas; não houve cobrança, transferência ou reembolso real.
- Smoke HTTP após implantação: vídeo sem ID retorna 400, checkout sem sessão retorna 401; webhook retorna 503 "Webhook não configurado", comprovando ausência de pelo menos uma credencial necessária (`MERCADOPAGO_ACCESS_TOKEN`/`MERCADOPAGO_WEBHOOK_SECRET`).
- Advisor de segurança sem novos alertas de banco; permanece `Leaked Password Protection Disabled`.

## Pendências para lançamento público

| Pendência | O que falta |
|---|---|
| Senhas vazadas | Organização no Free; recurso nativo exige Pro ou superior. Nenhum upgrade contratado |
| Vídeo 360p–4K/HLS | Executar e monitorar o worker em servidor persistente; carga e reprodução longa em aparelhos reais |
| Lives | Ingestão, distribuição, reconexão, gravação e moderação ao vivo em provedor real |
| Mercado Pago | Credenciais/ambiente de teste, compra até webhook, concorrência real, recusa e estorno no gateway |
| Plataforma paga | Vigência/renovação do plano geral ainda precisa de ciclo completo; não há recorrência automática certificada |
| Saques | Repasse bancário real, conciliação e operação antifraude |
| Staging/E2E | Projeto isolado, contas e secrets `STAGING_*`; fixtures de mídia/pagamento; teste mobile em aparelhos |
| KYC | Provedor de identidade e idade com callbacks verificados |
| Observabilidade | Destino externo de alertas, monitoramento, responsáveis e teste de incidente |
| Operação | Restauração de backup, pentest externo, jurídico/LGPD, moderação e suporte responsáveis |

**Decisão: NO-GO para lançamento público.** Só então habilitar produção comercial: após comprovar as pendências acima conforme `LAUNCH_GATE.md`. Atualizar código/backend não equivale a autorizar clientes e dinheiro reais.
