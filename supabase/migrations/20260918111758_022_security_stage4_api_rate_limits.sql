-- Security stage 4: API throttling primitive for trusted Edge Functions.
create table if not exists public.api_rate_limits(
  bucket text not null,
  subject text not null,
  window_start timestamptz not null,
  hits integer not null default 1 check(hits>0),
  primary key(bucket,subject,window_start)
);
alter table public.api_rate_limits enable row level security;
-- No client policies: service-role/server only.

create or replace function public.consume_rate_limit(p_bucket text,p_subject text,p_limit integer,p_window_seconds integer)
returns boolean language plpgsql security definer set search_path=public as $$
declare w timestamptz; n integer;
begin
 if p_limit<1 or p_window_seconds<1 or char_length(p_subject)>200 then return false; end if;
 w:=to_timestamp(floor(extract(epoch from now())/p_window_seconds)*p_window_seconds);
 insert into public.api_rate_limits(bucket,subject,window_start,hits) values(p_bucket,p_subject,w,1)
 on conflict(bucket,subject,window_start) do update set hits=public.api_rate_limits.hits+1 returning hits into n;
 return n<=p_limit;
end $$;
revoke all on function public.consume_rate_limit(text,text,integer,integer) from public,anon,authenticated;
