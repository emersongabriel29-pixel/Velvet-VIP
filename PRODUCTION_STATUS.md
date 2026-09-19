# Production Status — Velvet VIP

Atualizado em 19/09/2026. Código pronto, provedor configurado e fluxo comprovado são estados diferentes.

| Área | Estado atual | Gate restante |
|---|---|---|
| Frontend / Supabase / RLS | Endurecido no código | Aplicar as novas migrations após merge e rodar staging real |
| Cadastro / e-mail / 18+ | Fail-closed; e-mail confirmado separado de declaração 18+ | Teste E2E real de confirmação e recuperação |
| Criador / publicação | Aprovação exige KYC + direitos; publicação valida ambos | Conectar provedor KYC real |
| Vídeo longo | Fila, Cloudflare adapter, HLS protegido e níveis reais | Credenciais Cloudflare + transcodificação E2E |
| Lives | Ingest RTMPS/SRT, estado do provedor, HLS protegido | Credenciais Cloudflare + encoder/live E2E |
| Pagamentos | Checkout/webhook/ledger/refund hardening implementados | Ciclo Mercado Pago sandbox completo em PAYMENT_E2E_CHECKLIST.md |
| Saques | Solicitação e ledger estruturados | Operação de payout real, antifraude e conciliação |
| Denúncias/moderação | reports → caso → punição → restrição → auditoria | Aplicar migration e teste multiusuário |
| Observabilidade | Alertas + health snapshot no Admin | Serviço externo de uptime/erros e contatos operacionais |
| Auth password security | Código não controla setting hospedado | Ativar Leaked Password Protection no Supabase Auth |
| LGPD/jurídico | Base técnica/documental | Revisão jurídica externa |
| Pentest | Não executado | Pentest externo após infraestrutura final |

## Regra
Não habilitar grande lançamento público nem dinheiro real até que os itens externos acima tenham evidência. CI verde não substitui staging, sandbox financeiro, KYC, pentest ou revisão jurídica.
