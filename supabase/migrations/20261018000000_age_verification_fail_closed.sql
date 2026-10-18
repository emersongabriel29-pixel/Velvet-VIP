-- Fail closed: a self-declared birth date is not proof of age.
-- Until a real age-verification provider callback is configured, do not grant adult-content access.
begin;

alter table public.profiles alter column age_verified set default false;

update public.profiles
   set age_verified = false,
       age_verified_at = null
 where age_verified is distinct from false
    or age_verified_at is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text := coalesce(new.raw_user_meta_data->>'requested_role', 'user');
  safe_role text := case when requested_role = 'creator' then 'creator' else 'user' end;
  birth date := nullif(new.raw_user_meta_data->>'birth_date', '')::date;
  safe_username text := coalesce(nullif(new.raw_user_meta_data->>'username', ''), split_part(coalesce(new.email,''), '@', 1));
  safe_name text := coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(coalesce(new.email,''), '@', 1));
begin
  if birth is null or birth > current_date - interval '18 years' then
    raise exception 'User must be at least 18 years old';
  end if;

  insert into public.profiles
    (id, username, name, birth_date, role, age_verified, age_verified_at)
  values
    (new.id, safe_username, safe_name, birth, safe_role, false, null);

  if safe_role = 'creator' then
    insert into public.creators
      (user_id, display_name, handle, avatar_url, is_approved)
    values
      (new.id, safe_name, safe_username,
       'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&fit=crop', false);
  end if;

  return new;
end;
$$;

comment on column public.profiles.age_verified is
  'Must be set only after trusted age-verification evidence; a user-supplied birth date is not verification.';

commit;
