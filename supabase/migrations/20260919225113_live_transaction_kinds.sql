alter table public.financial_transactions drop constraint if exists financial_transactions_kind_check;
alter table public.financial_transactions add constraint financial_transactions_kind_check
  check (kind in ('subscription','tip','ppv','live_solo','live_offer','refund','chargeback','payout'));
