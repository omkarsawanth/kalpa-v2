-- Kalpa v2 Phase 2 Schema: Quiz Questions, Skill Assessments, and Work Style Profiles
-- 100% Supabase Postgres with Row Level Security

-- 1. Add selected_career_path_id to profiles table
alter table public.profiles
  add column if not exists selected_career_path_id uuid references public.career_paths(id) on delete set null;

-- 2. Quiz Questions Table (Reference data: Public Read, Service-Write)
create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  career_path_id uuid references public.career_paths(id) on delete cascade,
  domain_title text,
  question_text text not null,
  question_type text not null default 'multiple_choice',
  options jsonb not null,
  difficulty_level text not null default 'beginner',
  wisdom_tip text,
  created_at timestamptz not null default now()
);

alter table public.quiz_questions enable row level security;

create policy "Quiz questions publicly readable"
  on public.quiz_questions
  for select
  to anon, authenticated
  using (true);

-- 3. Skill Assessments Table (User data: Owner-only RLS)
create table if not exists public.skill_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  career_path_id uuid references public.career_paths(id) on delete set null,
  question_id uuid references public.quiz_questions(id) on delete cascade,
  answer text not null,
  is_correct boolean not null default false,
  assessed_at timestamptz not null default now()
);

alter table public.skill_assessments enable row level security;

create policy "Skill assessments readable only by owner"
  on public.skill_assessments
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Skill assessments insertable only by owner"
  on public.skill_assessments
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Skill assessments updatable only by owner"
  on public.skill_assessments
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Skill assessments deletable only by owner"
  on public.skill_assessments
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- 4. Work Style Profiles Table (User data: Owner-only RLS)
create table if not exists public.work_style_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  learning_style text,
  motivation_driver text,
  feedback_preference text,
  collaboration_style text,
  updated_at timestamptz not null default now()
);

alter table public.work_style_profiles enable row level security;

create policy "Work style profiles readable only by owner"
  on public.work_style_profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Work style profiles insertable only by owner"
  on public.work_style_profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Work style profiles updatable only by owner"
  on public.work_style_profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Work style profiles deletable only by owner"
  on public.work_style_profiles
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- 5. Seed Real Quiz Questions for Culinary Arts, Teaching & Mentoring, and Technology
do $$
declare
  v_culinary_id uuid;
  v_teaching_id uuid;
  v_tech_id uuid;
begin
  select id into v_culinary_id from public.career_paths where category = 'cooking' limit 1;
  select id into v_teaching_id from public.career_paths where category = 'teaching' limit 1;
  select id into v_tech_id from public.career_paths where category = 'tech' limit 1;

  -- Culinary Arts Questions
  if v_culinary_id is not null then
    insert into public.quiz_questions (career_path_id, domain_title, question_text, question_type, options, difficulty_level, wisdom_tip)
    values
    (
      v_culinary_id,
      'Flavor Chemistry & Balance',
      'You are preparing a rich tomato basil sauce for a family dinner, but after simmering, it tastes slightly too acidic and sharp. What is your instinct to balance it out?',
      'multiple_choice',
      '[
        {"id": "A", "label": "Classic Instinct", "text": "Fold in a knob of cold butter or a pinch of brown sugar to soften acidity and round the mouthfeel.", "is_correct": true},
        {"id": "B", "label": "Direct Acidity", "text": "Add a splash of red wine vinegar to heighten the acidic contrast.", "is_correct": false},
        {"id": "C", "label": "Dilution", "text": "Dilute with two cups of water and boil rapidly on high heat.", "is_correct": false},
        {"id": "D", "label": "Cheese Finish", "text": "Grate in mild pecorino cheese and simmer for 5 extra minutes.", "is_correct": false}
      ]'::jsonb,
      'beginner',
      'Kitchen Wisdom: Acidity, fat, and subtle sweetness work as a dynamic sensory triangle to harmonize savory sauces without blunting fresh herbal notes.'
    ),
    (
      v_culinary_id,
      'Knife Craft & Station Rhythm',
      'You are prepping vegetables for a hearty stir-fry alongside two other cooks. What is the foundation of safe and efficient knife work on a busy cutting board?',
      'multiple_choice',
      '[
        {"id": "A", "label": "The Claw Grip", "text": "Curl non-knife fingertips into a protective claw against the flat of the blade while rocking smoothly.", "is_correct": true},
        {"id": "B", "label": "Speed First", "text": "Chop as rapidly as possible with outstretched fingers to maintain velocity.", "is_correct": false},
        {"id": "C", "label": "Direct Pressure", "text": "Press down hard with your palm directly on the knife spine.", "is_correct": false},
        {"id": "D", "label": "Loose Station", "text": "Keep ingredients spread loosely across the whole table without small prep bowls.", "is_correct": false}
      ]'::jsonb,
      'beginner',
      'Chef Insight: Mise en place isn’t just organization—it is the mental calm that allows intuition to flow freely in a bustling kitchen.'
    ),
    (
      v_culinary_id,
      'Searing & Pan Temperature',
      'When searing fresh mushrooms in a cast iron skillet, they begin releasing water and steaming instead of developing a golden crust. What is the gentle adjustment?',
      'multiple_choice',
      '[
        {"id": "A", "label": "Space & Patience", "text": "Avoid overcrowding the pan; give each piece breathing room and let the moisture evaporate without stirring constantly.", "is_correct": true},
        {"id": "B", "label": "Cover Skillet", "text": "Place a tight lid over the skillet immediately to trap moisture.", "is_correct": false},
        {"id": "C", "label": "Lower Flame", "text": "Turn the flame down to lowest simmer and add more cold oil.", "is_correct": false},
        {"id": "D", "label": "Rapid Stirring", "text": "Whisk and stir continuously every two seconds.", "is_correct": false}
      ]'::jsonb,
      'beginner',
      'Culinary Wisdom: Caramelization and the Maillard reaction require dry heat and space. Patience is the secret ingredient to golden depth.'
    );
  end if;

  -- Teaching & Mentoring Questions
  if v_teaching_id is not null then
    insert into public.quiz_questions (career_path_id, domain_title, question_text, question_type, options, difficulty_level, wisdom_tip)
    values
    (
      v_teaching_id,
      'Explaining Metaphors & Imagery',
      'A 14-year-old student tells you Shakespeare''s metaphors feel like a foreign language they cannot understand. What is your welcoming approach?',
      'multiple_choice',
      '[
        {"id": "A", "label": "Relatable Bridge", "text": "Connect the verse to lyrics of a song or movie scene they love today, demonstrating that metaphors are just emotional shortcuts.", "is_correct": true},
        {"id": "B", "label": "Dictionary Lookup", "text": "Ask them to look up every single archaic word in a printed glossary before reading.", "is_correct": false},
        {"id": "C", "label": "Skip Poetry", "text": "Advise them that poetry isn''t practical and skip directly to the plot summary.", "is_correct": false},
        {"id": "D", "label": "Memorization Drill", "text": "Have them repeat the stanza ten times until it sounds familiar.", "is_correct": false}
      ]'::jsonb,
      'beginner',
      'Daily Affirmation: Patience & curiosity make great teachers. Meeting learners in their world creates the bridge to deeper horizons.'
    ),
    (
      v_culinary_id, -- fallback / tag
      'Classroom Atmosphere & Safe Space',
      'During a group conversation, a quiet learner hesitates to share their thought. How do you warmly open the circle?',
      'multiple_choice',
      '[
        {"id": "A", "label": "Gentle Invitation", "text": "Pause the room with a warm smile, validate the discussion so far, and offer: ''We would love to hear what you are thinking whenever you feel ready.''", "is_correct": true},
        {"id": "B", "label": "Cold Call", "text": "Immediately put them on the spot by demanding they answer the next question.", "is_correct": false},
        {"id": "C", "label": "Move On", "text": "Ignore their hesitation completely and let only the loudest students speak.", "is_correct": false},
        {"id": "D", "label": "Grade Penalty", "text": "Dock participation points aloud in front of the group.", "is_correct": false}
      ]'::jsonb,
      'beginner',
      'Teaching Wisdom: Psychological safety is the soil in which curiosity and courageous thinking bloom.'
    ),
    (
      v_teaching_id,
      'Constructive Growth Feedback',
      'A student submits a draft with tremendous creative passion, but the paragraph organization is confusing. What is the most empowering feedback style?',
      'multiple_choice',
      '[
        {"id": "A", "label": "Strengths Anchor", "text": "First celebrate their unique voice and imaginative spark, then offer one clear structural tool to help their ideas shine even brighter.", "is_correct": true},
        {"id": "B", "label": "Red Ink Rewrite", "text": "Rewrite the essay for them so they see how a finished paper should look.", "is_correct": false},
        {"id": "C", "label": "Brief Critique", "text": "Simply write ''Unorganized'' at the top without highlighting what worked well.", "is_correct": false},
        {"id": "D", "label": "Grade Without Notes", "text": "Assign a grade without explanatory guidance to encourage them to guess.", "is_correct": false}
      ]'::jsonb,
      'beginner',
      'Mentor Mindset: True feedback does not extinguish flame; it guides the draft toward clarity while honoring the author''s intent.'
    );
  end if;

  -- Technology & Creative Digital Tools Questions
  if v_tech_id is not null then
    insert into public.quiz_questions (career_path_id, domain_title, question_text, question_type, options, difficulty_level, wisdom_tip)
    values
    (
      v_tech_id,
      'Human-Centered Problem Deconstruction',
      'A family member mentions that their simple digital photo album is taking forever to open. What is your first friendly problem-solving thought?',
      'multiple_choice',
      '[
        {"id": "A", "label": "Curious Inquiry", "text": "Ask gently what changed recently, check whether high-resolution photos are being loaded all at once, and break down the flow step-by-step.", "is_correct": true},
        {"id": "B", "label": "Reboot Everything", "text": "Tell them their phone is obsolete and they must purchase a new device.", "is_correct": false},
        {"id": "C", "label": "Jargon Overload", "text": "Explain memory buffer allocation and CPU caching using complex technical terminology.", "is_correct": false},
        {"id": "D", "label": "Dismiss Concern", "text": "Say loading speeds do not matter for casual photo browsing.", "is_correct": false}
      ]'::jsonb,
      'beginner',
      'Technologist Wisdom: Great engineering begins with empathy. Understanding the person behind the screen is more important than memorizing syntax.'
    ),
    (
      v_tech_id,
      'Gentle Debugging Mindset',
      'When something in an interactive project behaves differently than you expected, what mindset turns confusion into discovery?',
      'multiple_choice',
      '[
        {"id": "A", "label": "Detective Story", "text": "Treat the unexpected result as a friendly clue in a detective story—trace the path step-by-step to see what the computer was thinking.", "is_correct": true},
        {"id": "B", "label": "Self-Doubt", "text": "Assume you are not cut out for building tools and walk away.", "is_correct": false},
        {"id": "C", "label": "Random Tweaking", "text": "Change ten different things at once without checking which one altered the outcome.", "is_correct": false},
        {"id": "D", "label": "Ignore Bug", "text": "Pretend the behavior is intentional and hide it from users.", "is_correct": false}
      ]'::jsonb,
      'beginner',
      'Sanctuary Motto: In Kalpa, there are no failures—only feedback loops that illuminate how systems connect.'
    );
  end if;
end $$;
