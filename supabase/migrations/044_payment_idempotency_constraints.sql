-- Make provider idempotency keys usable by PostgREST upsert.
drop index if exists public.financial_transactions_provider_ref_idx;
alter table public.financial_transactions drop constraint if exists financial_transactions_provider_reference_key;
alter table public.financial_transactions
  add constraint financial_transactions_provider_reference_key unique(provider,provider_reference);

alter table public.creator_tips drop constraint if exists creator_tips_payment_gateway_id_key;
alter table public.creator_tips
  add constraint creator_tips_payment_gateway_id_key unique(payment_gateway_id);
