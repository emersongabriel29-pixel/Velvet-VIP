# Pagamentos reais

O cliente chama a Edge Function `create-checkout`; o navegador nunca recebe o token do Mercado Pago. Publique as funções `supabase/functions/create-checkout` e `supabase/functions/payment-webhook`.

Configure no projeto Supabase:

- `MERCADOPAGO_ACCESS_TOKEN`
- `PUBLIC_APP_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (somente como secret da Edge Function)

Execute as migrações em ordem, incluindo `010_payment_events.sql`. O webhook consulta o pagamento no Mercado Pago antes de marcar a sessão como paga e grava `payment_events` com chave única para impedir crédito duplicado.

Sem Supabase configurado, a aplicação permanece em modo local e não simula pagamento, assinatura ou gorjeta aprovada.
