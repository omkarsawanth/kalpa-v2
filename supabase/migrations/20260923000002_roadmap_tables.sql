-- Kalpa v2 Phase 4 Schema: Roadmap Milestones, Tasks, and User Progress
-- 100% Supabase Postgres with Row Level Security & Atomic Task-Linked Streak RPC

-- 1. Roadmap Milestones Table (Reference Data: Public Read, Service-Write)
create table if not exists public.roadmap_milestones (
  id uuid primary key default gen_random_uuid(),
  career_path_id uuid not null references public.career_paths(id) on delete cascade,
  title text not null,
  description text not null,
  order_index integer not null default 0,
  phase_number integer not null default 1,
  created_at timestamptz not null default now()
);

alter table public.roadmap_milestones enable row level security;

create policy "Roadmap milestones publicly readable"
  on public.roadmap_milestones
  for select
  to anon, authenticated
  using (true);


-- 2. Roadmap Tasks Table (Reference Data: Public Read, Service-Write)
create table if not exists public.roadmap_tasks (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.roadmap_milestones(id) on delete cascade,
  title text not null,
  description text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.roadmap_tasks enable row level security;

create policy "Roadmap tasks publicly readable"
  on public.roadmap_tasks
  for select
  to anon, authenticated
  using (true);


-- 3. User Roadmap Progress Table (User Data: Owner-only RLS)
create table if not exists public.user_roadmap_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.roadmap_tasks(id) on delete cascade,
  completed_at timestamptz not null default now(),
  constraint user_roadmap_progress_user_task_unique unique (user_id, task_id)
);

alter table public.user_roadmap_progress enable row level security;

create policy "User roadmap progress readable only by owner"
  on public.user_roadmap_progress
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "User roadmap progress insertable only by owner"
  on public.user_roadmap_progress
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "User roadmap progress updatable only by owner"
  on public.user_roadmap_progress
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "User roadmap progress deletable only by owner"
  on public.user_roadmap_progress
  for delete
  to authenticated
  using (auth.uid() = user_id);


-- 4. Atomic Task Completion and Streak RPC Function
create or replace function public.complete_roadmap_task(
  p_task_id uuid,
  target_user_id uuid default auth.uid()
)
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
  v_already_completed_today boolean := false;
  v_task_already_done boolean := false;
  v_task_exists boolean := false;
begin
  -- CRITICAL SECURITY ENFORCEMENT 1:
  -- Authentication is strictly required. Anonymous callers cannot complete tasks.
  if v_caller_id is null then
    raise exception 'Authentication required: no active user session'
      using errcode = '42501';
  end if;

  if p_task_id is null then
    raise exception 'Task ID is required'
      using errcode = '22023';
  end if;

  -- Determine target user (defaulting to the verified caller)
  if target_user_id is not null then
    v_effective_id := target_user_id;
  else
    v_effective_id := v_caller_id;
  end if;

  -- CRITICAL SECURITY ENFORCEMENT 2:
  -- A user cannot complete a task or manipulate streak on behalf of another user.
  if v_caller_id <> v_effective_id then
    raise exception 'Permission denied: cannot complete task for another user'
      using errcode = '42501';
  end if;

  -- Verify task exists
  select exists(select 1 from public.roadmap_tasks where id = p_task_id) into v_task_exists;
  if not v_task_exists then
    raise exception 'Task not found: %', p_task_id
      using errcode = 'P0002';
  end if;

  -- Row lock on user's profile
  select last_completed_date, coalesce(current_streak, 0)
  into v_last_date, v_current_streak
  from public.profiles
  where id = v_effective_id
  for update;

  if not found then
    raise exception 'Profile not found for user %', v_effective_id
      using errcode = 'P0002';
  end if;

  -- Check if this task was already completed by this user
  select exists(
    select 1 from public.user_roadmap_progress
    where user_id = v_effective_id and task_id = p_task_id
  ) into v_task_already_done;

  if v_task_already_done then
    return jsonb_build_object(
      'success', true,
      'task_id', p_task_id,
      'task_already_completed', true,
      'already_completed', (v_last_date = v_today),
      'current_streak', v_current_streak,
      'last_completed_date', v_last_date
    );
  end if;

  -- Insert progress record (handling unique constraint collision gracefully)
  insert into public.user_roadmap_progress (user_id, task_id, completed_at)
  values (v_effective_id, p_task_id, now())
  on conflict (user_id, task_id) do nothing;

  -- Evaluate daily streak progression
  if v_last_date = v_today then
    v_already_completed_today := true;
  elsif v_last_date = v_today - 1 then
    v_current_streak := v_current_streak + 1;
    v_last_date := v_today;
  else
    v_current_streak := 1;
    v_last_date := v_today;
  end if;

  -- Update profiles with atomic values
  update public.profiles
  set
    current_streak = v_current_streak,
    last_completed_date = v_last_date
  where id = v_effective_id;

  return jsonb_build_object(
    'success', true,
    'task_id', p_task_id,
    'task_already_completed', false,
    'already_completed', v_already_completed_today,
    'current_streak', v_current_streak,
    'last_completed_date', v_last_date
  );
end;
$$;

revoke all on function public.complete_roadmap_task(uuid, uuid) from public;
grant execute on function public.complete_roadmap_task(uuid, uuid) to authenticated;


-- 5. Seed Real Milestones and Tasks for the 3 active career paths (cooking, teaching, tech)
do $$
declare
  v_culinary_id uuid;
  v_teaching_id uuid;
  v_tech_id uuid;
  v_m_id uuid;
begin
  select id into v_culinary_id from public.career_paths where category = 'cooking' limit 1;
  select id into v_teaching_id from public.career_paths where category = 'teaching' limit 1;
  select id into v_tech_id from public.career_paths where category = 'tech' limit 1;

  -- ========================================================
  -- A. Culinary Arts Milestones & Tasks
  -- ========================================================
  if v_culinary_id is not null then
    -- Milestone 1
    insert into public.roadmap_milestones (career_path_id, title, description, order_index, phase_number)
    values (
      v_culinary_id,
      'Essential Knife Skills & Station Rhythm',
      'Mastering balance, blade control, and seamless mise en place before the flame is lit.',
      1,
      1
    ) returning id into v_m_id;

    insert into public.roadmap_tasks (milestone_id, title, description, order_index)
    values
      (v_m_id, 'Master the Chef''s Claw Grip', 'Slice uniform celery and carrots using the non-knife knuckle guide.', 1),
      (v_m_id, 'Establish your Mise en Place workstation', 'Arrange cutting board, damp towel anchor, and separate ingredient prep bowls.', 2),
      (v_m_id, 'Execute uniform Brunoise and Julienne cuts', 'Practice fine 2mm vegetable cuts on shallots and bell peppers.', 3);

    -- Milestone 2
    insert into public.roadmap_milestones (career_path_id, title, description, order_index, phase_number)
    values (
      v_culinary_id,
      'Pan Temperature & Flavor Balance',
      'Understanding Maillard caramelization, dry heat, and harmonizing acidity and fat.',
      2,
      2
    ) returning id into v_m_id;

    insert into public.roadmap_tasks (milestone_id, title, description, order_index)
    values
      (v_m_id, 'Caramelize mushrooms without overcrowding', 'Master heat retention and moisture release in cast iron for deep browning.', 1),
      (v_m_id, 'Balance a reduction sauce with cold butter & acid', 'Calibrate taste memory using salt, acid, and fat adjustments.', 2),
      (v_m_id, 'Execute a gentle pan sear with aromatic basting', 'Baste with browned butter, thyme, and crushed garlic cloves.', 3);

    -- Milestone 3
    insert into public.roadmap_milestones (career_path_id, title, description, order_index, phase_number)
    values (
      v_culinary_id,
      'Service Coordination & Creative Plating',
      'Bringing timing, heat, and visual harmony together on the pass.',
      3,
      3
    ) returning id into v_m_id;

    insert into public.roadmap_tasks (milestone_id, title, description, order_index)
    values
      (v_m_id, 'Coordinate simultaneous timing for two dishes', 'Time hot pan searing with rested vegetable purée and warm sauce.', 1),
      (v_m_id, 'Compose a balanced plate with negative space', 'Apply sauce textures and herb placement for sensory elegance.', 2);
  end if;

  -- ========================================================
  -- B. Teaching & Mentoring Milestones & Tasks
  -- ========================================================
  if v_teaching_id is not null then
    -- Milestone 1
    insert into public.roadmap_milestones (career_path_id, title, description, order_index, phase_number)
    values (
      v_teaching_id,
      'Classroom Presence & Welcoming Norms',
      'Cultivating psychological safety and welcoming every learner into the shared circle.',
      1,
      1
    ) returning id into v_m_id;

    insert into public.roadmap_tasks (milestone_id, title, description, order_index)
    values
      (v_m_id, 'Design a 5-minute low-stakes opening spark', 'Create an inclusive question prompt that encourages shy voices to speak.', 1),
      (v_m_id, 'Establish shared classroom sanctuary norms', 'Co-create community agreements for active listening and constructive feedback.', 2),
      (v_m_id, 'Practice active listening & non-judgmental restatement', 'Restate learner contributions to validate their core perspective.', 3);

    -- Milestone 2
    insert into public.roadmap_milestones (career_path_id, title, description, order_index, phase_number)
    values (
      v_teaching_id,
      'Lesson Craft & Relatable Bridges',
      'Deconstructing complex ideas into emotional shortcuts, metaphors, and tactile steps.',
      2,
      2
    ) returning id into v_m_id;

    insert into public.roadmap_tasks (milestone_id, title, description, order_index)
    values
      (v_m_id, 'Craft an everyday metaphor for an abstract concept', 'Bridge complex theory to familiar daily experiences and music.', 1),
      (v_m_id, 'Structure a 15-minute micro-lesson outline', 'Design the hook, guided discovery, and independent reflection moments.', 2),
      (v_m_id, 'Build differentiated challenge tiers', 'Provide foundational scaffolding alongside open-ended exploration options.', 3);

    -- Milestone 3
    insert into public.roadmap_milestones (career_path_id, title, description, order_index, phase_number)
    values (
      v_teaching_id,
      'Empowering Feedback & Socratic Facilitation',
      'Guiding learners toward self-discovery through courageous questioning and strengths-first coaching.',
      3,
      3
    ) returning id into v_m_id;

    insert into public.roadmap_tasks (milestone_id, title, description, order_index)
    values
      (v_m_id, 'Draft a strengths-first coaching rubric', 'Anchor growth notes in what the learner did courageously first.', 1),
      (v_m_id, 'Facilitate a fishbowl discussion using open questions', 'Guide peer-to-peer inquiry without teacher-centric lecturing.', 2);
  end if;

  -- ========================================================
  -- C. Software Engineering (Technology) Milestones & Tasks
  -- ========================================================
  if v_tech_id is not null then
    -- Milestone 1
    insert into public.roadmap_milestones (career_path_id, title, description, order_index, phase_number)
    values (
      v_tech_id,
      'Interactive Thinking & Developer Environment',
      'Setting up a calm development sanctuary and understanding how programs breathe.',
      1,
      1
    ) returning id into v_m_id;

    insert into public.roadmap_tasks (milestone_id, title, description, order_index)
    values
      (v_m_id, 'Configure your editor sanctuary', 'Set up editor typography, linting rules, and comfortable keybindings.', 1),
      (v_m_id, 'Build an interactive CLI greeting with validation', 'Write a clean function that processes user prompts gently and reliably.', 2),
      (v_m_id, 'Trace program state with a debugger step-by-step', 'Follow variable mutations through loops without relying on console logs.', 3);

    -- Milestone 2
    insert into public.roadmap_milestones (career_path_id, title, description, order_index, phase_number)
    values (
      v_tech_id,
      'System Architecture & Data Flows',
      'Designing deterministic state transformations, API interfaces, and resilient contracts.',
      2,
      2
    ) returning id into v_m_id;

    insert into public.roadmap_tasks (milestone_id, title, description, order_index)
    values
      (v_m_id, 'Model relational tables with Row Level Security', 'Draft Postgres schemas with strict tenant isolation and foreign keys.', 1),
      (v_m_id, 'Construct an idempotent API endpoint with atomic transactions', 'Protect against concurrent race conditions with database row locks.', 2),
      (v_m_id, 'Write automated boundary tests for edge-case payloads', 'Verify sanitized error masking and HTTP status codes.', 3);

    -- Milestone 3
    insert into public.roadmap_milestones (career_path_id, title, description, order_index, phase_number)
    values (
      v_tech_id,
      'Production Hardening & User Delight',
      'Optimizing bundle velocity, accessibility, and resilient deployment pipelines.',
      3,
      3
    ) returning id into v_m_id;

    insert into public.roadmap_tasks (milestone_id, title, description, order_index)
    values
      (v_m_id, 'Audit client bundles and implement dynamic code-splitting', 'Eliminate monolithic chunks using React.lazy and manual chunking.', 1),
      (v_m_id, 'Verify WCAG AA keyboard navigation and screen reader tags', 'Ensure focus rings, aria-labels, and tab orders flow naturally.', 2);
  end if;
end $$;
