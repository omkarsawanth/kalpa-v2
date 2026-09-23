-- Kalpa v2 Phase 3: Atomic Streak Management via RPC
-- Single atomic Postgres transaction with row lock and caller validation

create or replace function public.complete_daily_task(target_user_id uuid default auth.uid())
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_effective_id uuid;
  v_last_date date;
  v_current_streak integer;
  v_today date := current_date;
  v_already_completed boolean := false;
begin
  -- CRITICAL SECURITY ENFORCEMENT 1:
  -- Authentication is strictly required. Anonymous callers cannot invoke streak tasks.
  if v_caller_id is null then
    raise exception 'Authentication required: no active user session'
      using errcode = '42501';
  end if;

  -- Determine target user (defaulting to the verified caller)
  if target_user_id is not null then
    v_effective_id := target_user_id;
  else
    v_effective_id := v_caller_id;
  end if;

  -- CRITICAL SECURITY ENFORCEMENT 2:
  -- A user cannot increment or manipulate another user's streak.
  if v_caller_id <> v_effective_id then
    raise exception 'Permission denied: cannot complete streak for another user'
      using errcode = '42501';
  end if;

  -- Atomic row lock on the user's profile
  select last_completed_date, coalesce(current_streak, 0)
  into v_last_date, v_current_streak
  from public.profiles
  where id = v_effective_id
  for update;

  if not found then
    raise exception 'Profile not found for user %', v_effective_id
      using errcode = 'P0002';
  end if;

  -- Evaluate streak state
  if v_last_date = v_today then
    -- Already completed today: keep current streak, flag already_completed
    v_already_completed := true;
  elsif v_last_date = v_today - 1 then
    -- Completed yesterday: streak increment
    v_current_streak := v_current_streak + 1;
    v_last_date := v_today;
  else
    -- First time or streak broken (older than yesterday or null): reset to 1
    v_current_streak := 1;
    v_last_date := v_today;
  end if;

  -- Atomic update
  update public.profiles
  set
    current_streak = v_current_streak,
    last_completed_date = v_last_date
  where id = v_effective_id;

  return jsonb_build_object(
    'success', true,
    'current_streak', v_current_streak,
    'last_completed_date', v_last_date,
    'already_completed', v_already_completed
  );
end;
$$;

-- Revoke default public/anon access and grant strictly to authenticated
revoke all on function public.complete_daily_task(uuid) from public;
grant execute on function public.complete_daily_task(uuid) to authenticated;
