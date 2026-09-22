-- Kalpa v2 Initial Database Schema & Row Level Security
-- Sole database: Supabase (Postgres)

-- 1. Profiles Table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  created_at timestamptz not null default now(),
  current_streak integer not null default 0 check (current_streak >= 0),
  last_completed_date date
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Profiles policies: users can only select, insert, update, or delete their own profile
create policy "Profiles readable only by owner"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "Profiles insertable only by owner"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Profiles updatable only by owner"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Profiles deletable only by owner"
  on public.profiles
  for delete
  to authenticated
  using (auth.uid() = id);


-- 2. Career Paths Table
create table if not exists public.career_paths (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (
    category in (
      'tech',
      'management',
      'law',
      'cooking',
      'research',
      'teaching',
      'finance',
      'art/creativity'
    ) or length(category) > 0
  ),
  description text,
  created_at timestamptz not null default now()
);

-- Enable RLS on career_paths
alter table public.career_paths enable row level security;

-- Career paths policies: publicly readable, writable only via service role
create policy "Career paths publicly readable"
  on public.career_paths
  for select
  to anon, authenticated
  using (true);


-- 3. Skills Table
create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  description text,
  created_at timestamptz not null default now()
);

-- Enable RLS on skills
alter table public.skills enable row level security;

-- Skills policies: publicly readable, writable only via service role
create policy "Skills publicly readable"
  on public.skills
  for select
  to anon, authenticated
  using (true);


-- 4. Career Path Skills (Many-to-Many Junction)
create table if not exists public.career_path_skills (
  career_path_id uuid not null references public.career_paths(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  importance_weight numeric not null default 1.0 check (importance_weight >= 0),
  is_core_skill boolean not null default false,
  primary key (career_path_id, skill_id)
);

-- Enable RLS on career_path_skills
alter table public.career_path_skills enable row level security;

-- Career path skills policies: publicly readable, writable only via service role
create policy "Career path skills publicly readable"
  on public.career_path_skills
  for select
  to anon, authenticated
  using (true);


-- 5. Learning Resources Table
create table if not exists public.learning_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  type text not null,
  skill_id uuid references public.skills(id) on delete cascade,
  difficulty_level text not null,
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- Enable RLS on learning_resources
alter table public.learning_resources enable row level security;

-- Learning resources policies: publicly readable, writable only via service role
create policy "Learning resources publicly readable"
  on public.learning_resources
  for select
  to anon, authenticated
  using (true);


-- 6. Trigger to automatically provision profiles row on user signup / OAuth login
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email, created_at, current_streak)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    now(),
    0
  )
  on conflict (id) do update set
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    email = coalesce(excluded.email, public.profiles.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 7. Seed initial career paths across supported domains
insert into public.career_paths (name, category, description)
values
  ('Software Engineering', 'tech', 'Full-stack, systems, and distributed application development'),
  ('Product Management', 'management', 'Strategic product discovery, roadmapping, and cross-functional leadership'),
  ('Corporate Law', 'law', 'Legal advisory, compliance, corporate governance, and contract negotiation'),
  ('Culinary Arts', 'cooking', 'Gastronomy, professional kitchen management, and menu development'),
  ('Scientific Research', 'research', 'Hypothesis formulation, experimental design, and empirical discovery'),
  ('Higher Education Teaching', 'teaching', 'Curriculum design, instructional delivery, and student mentorship'),
  ('Quantitative Finance', 'finance', 'Algorithmic trading, financial modeling, and risk assessment'),
  ('Digital Art & UI Design', 'art/creativity', 'Visual identity, creative design, and interface crafting')
on conflict do nothing;
