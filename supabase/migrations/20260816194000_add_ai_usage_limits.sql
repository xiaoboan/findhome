-- Durable per-user screenshot parsing quota for serverless deployments.

create table if not exists public.ai_usage_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  minute_started_at timestamptz not null default now(),
  minute_count integer not null default 0 check (minute_count >= 0),
  day_started_at timestamptz not null default now(),
  day_count integer not null default 0 check (day_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.ai_usage_limits enable row level security;
revoke all on table public.ai_usage_limits from anon, authenticated;

create or replace function public.claim_screenshot_parse()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_usage public.ai_usage_limits%rowtype;
begin
  if v_user_id is null then
    return false;
  end if;

  insert into public.ai_usage_limits (user_id, minute_started_at, day_started_at, updated_at)
  values (v_user_id, v_now, v_now, v_now)
  on conflict (user_id) do nothing;

  select *
  into v_usage
  from public.ai_usage_limits
  where user_id = v_user_id
  for update;

  if v_usage.minute_started_at <= v_now - interval '1 minute' then
    v_usage.minute_started_at := v_now;
    v_usage.minute_count := 0;
  end if;

  if v_usage.day_started_at <= v_now - interval '1 day' then
    v_usage.day_started_at := v_now;
    v_usage.day_count := 0;
  end if;

  if v_usage.minute_count >= 5 or v_usage.day_count >= 50 then
    return false;
  end if;

  update public.ai_usage_limits
  set
    minute_started_at = v_usage.minute_started_at,
    minute_count = v_usage.minute_count + 1,
    day_started_at = v_usage.day_started_at,
    day_count = v_usage.day_count + 1,
    updated_at = v_now
  where user_id = v_user_id;

  return true;
end;
$$;

revoke all on function public.claim_screenshot_parse() from public;
grant execute on function public.claim_screenshot_parse() to authenticated;
