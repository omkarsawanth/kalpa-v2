import { PGlite } from '@electric-sql/pglite'
import fs from 'node:fs'
import path from 'node:path'

async function verifyRLS() {
  console.log('===========================================================')
  console.log('       KALPA v2 — POSTGRES ROW LEVEL SECURITY VERIFICATION  ')
  console.log('===========================================================\n')

  const db = new PGlite()

  console.log('[1/4] Initializing Postgres engine and auth schema emulation...')
  // Emulate Supabase Postgres auth context and roles
  await db.exec(`
    create schema if not exists auth;
    create table if not exists auth.users (
      id uuid primary key,
      email text,
      raw_user_meta_data jsonb
    );

    create or replace function auth.uid()
    returns uuid
    language sql stable
    as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;

    do $$
    begin
      if not exists (select from pg_roles where rolname = 'anon') then
        create role anon;
      end if;
      if not exists (select from pg_roles where rolname = 'authenticated') then
        create role authenticated;
      end if;
    end
    $$;

    grant usage on schema public to anon, authenticated;
  `)

  console.log('[2/4] Executing Phase 1, Phase 2 & Phase 3 Migrations...')
  const m1Path = path.resolve('supabase/migrations/20260922000000_initial_schema.sql')
  const m1Sql = fs.readFileSync(m1Path, 'utf8')
  await db.exec(m1Sql)

  const m2Path = path.resolve('supabase/migrations/20260923000000_phase2_tables.sql')
  const m2Sql = fs.readFileSync(m2Path, 'utf8')
  await db.exec(m2Sql)

  const m3Path = path.resolve('supabase/migrations/20260923000001_streak_rpc.sql')
  const m3Sql = fs.readFileSync(m3Path, 'utf8')
  await db.exec(m3Sql)

  await db.exec(`
    grant all on all tables in schema public to anon, authenticated;
    insert into auth.users (id, email) values
      ('11111111-1111-1111-1111-111111111111', 'usera@example.com'),
      ('22222222-2222-2222-2222-222222222222', 'userb@example.com');
  `)
  console.log('✓ Both migrations executed cleanly. All tables, triggers, and RLS policies created.\n')

  console.log('[3/4] Running Security Tests against Postgres RLS Policies:\n')

  const userA_id = '11111111-1111-1111-1111-111111111111'
  const userB_id = '22222222-2222-2222-2222-222222222222'
  const userC_id = '33333333-3333-3333-3333-333333333333'

  let totalTests = 0
  let passedTests = 0

  async function testExpectation(name, executeFn, expectedResult) {
    totalTests++
    try {
      const result = await executeFn()
      if (expectedResult.type === 'error') {
        console.error(`✗ FAIL: ${name} — Expected error (${expectedResult.code}), but operation succeeded!`)
      } else if (expectedResult.type === 'rowCount') {
        if (result.rows.length === expectedResult.count) {
          console.log(`✓ PASS: ${name} [Rows: ${result.rows.length}]`)
          passedTests++
        } else if (expectedResult.minCount !== undefined && result.rows.length >= expectedResult.minCount) {
          console.log(`✓ PASS: ${name} [Rows: ${result.rows.length} >= ${expectedResult.minCount}]`)
          passedTests++
        } else {
          console.error(`✗ FAIL: ${name} — Expected ${expectedResult.count ?? expectedResult.minCount} rows, got ${result.rows.length}`)
        }
      } else if (expectedResult.type === 'affected') {
        if (result.affectedRows === expectedResult.count) {
          console.log(`✓ PASS: ${name} [Affected: ${result.affectedRows}]`)
          passedTests++
        } else {
          console.error(`✗ FAIL: ${name} — Expected ${expectedResult.count} affected, got ${result.affectedRows}`)
        }
      }
    } catch (err) {
      if (expectedResult.type === 'error') {
        const matchesCode = !expectedResult.code || err.code === expectedResult.code || err.message.includes(expectedResult.code)
        const matchesMessage = !expectedResult.message || err.message.toLowerCase().includes(expectedResult.message.toLowerCase())
        if (matchesCode && matchesMessage) {
          console.log(`✓ PASS: ${name}`)
          console.log(`        └─ Real Postgres Rejection: [${err.code || 'RLS'}] ${err.message}`)
          passedTests++
        } else {
          console.error(`✗ FAIL: ${name} — Unexpected error:`, err)
        }
      } else {
        console.error(`✗ FAIL: ${name} — Threw unexpected error:`, err.message)
      }
    }
  }

  // --- PHASE 1 TESTS ---

  // 1. Anon reading profiles
  await db.exec(`set role anon; set "request.jwt.claim.sub" = '';`)
  await testExpectation(
    'Anonymous user CANNOT read any profiles',
    () => db.query('select * from public.profiles;'),
    { type: 'rowCount', count: 0 }
  )

  // 2. Anon inserting profile
  await testExpectation(
    'Anonymous user CANNOT insert a profile row (RLS rejection)',
    () => db.query(`insert into public.profiles (id, display_name) values ('${userA_id}', 'Hacker');`),
    { type: 'error', code: '42501', message: 'violates row-level security policy' }
  )

  // 3. Trigger auto-provisioned User A's profile on signup
  await db.exec(`set role authenticated; set "request.jwt.claim.sub" = '${userA_id}';`)
  await testExpectation(
    "User A can read their own profile (auto-provisioned by trigger)",
    () => db.query(`select * from public.profiles where id = '${userA_id}';`),
    { type: 'rowCount', count: 1 }
  )

  // 4. User A updating their own profile (and selected_career_path_id)
  await testExpectation(
    "User A can update their own profile & selected_career_path_id",
    () => db.query(`update public.profiles set display_name = 'User A (Verified)' where id = '${userA_id}';`),
    { type: 'affected', count: 1 }
  )

  // 5. User C inserting their own profile
  await db.exec(`
    reset role;
    insert into auth.users (id, email) values ('${userC_id}', 'userc@example.com');
    delete from public.profiles where id = '${userC_id}';
    set role authenticated;
    set "request.jwt.claim.sub" = '${userC_id}';
  `)
  await testExpectation(
    "User C can manually insert their own profile (auth.uid = id)",
    () => db.query(`insert into public.profiles (id, display_name, email) values ('${userC_id}', 'User C', 'userc@example.com');`),
    { type: 'affected', count: 1 }
  )

  // 6. User B authenticated: attempts to read User A profile
  await db.exec(`set role authenticated; set "request.jwt.claim.sub" = '${userB_id}';`)
  await testExpectation(
    "User B CANNOT read User A's profile (Cross-user read blocked by RLS)",
    () => db.query(`select * from public.profiles where id = '${userA_id}';`),
    { type: 'rowCount', count: 0 }
  )

  // 7. User B authenticated: attempts to update User A profile
  await db.exec(`set role authenticated; set "request.jwt.claim.sub" = '${userB_id}';`)
  await testExpectation(
    "User B CANNOT update User A's profile (Cross-user update blocked by RLS)",
    () => db.query(`update public.profiles set display_name = 'Hacked by B' where id = '${userA_id}';`),
    { type: 'affected', count: 0 }
  )

  // 8. User B authenticated: attempts to insert with User A's id
  await testExpectation(
    "User B CANNOT impersonate User A on insert (RLS check rejection)",
    () => db.query(`insert into public.profiles (id, display_name) values ('${userA_id}', 'Impersonator B');`),
    { type: 'error', code: '42501', message: 'violates row-level security policy' }
  )

  // 9. Public read of career_paths
  await db.exec(`set role anon; set "request.jwt.claim.sub" = '';`)
  await testExpectation(
    "Anonymous user CAN read public career_paths",
    () => db.query('select * from public.career_paths;'),
    { type: 'rowCount', count: 8 }
  )

  // 10. Unauthorized write to career_paths by anon
  await testExpectation(
    "Anonymous user CANNOT write to career_paths (Service role only)",
    () => db.query("insert into public.career_paths (name, category) values ('Unapproved Path', 'tech');"),
    { type: 'error', code: '42501', message: 'violates row-level security policy' }
  )

  // 11. Unauthorized write to career_paths by authenticated user
  await db.exec(`set role authenticated; set "request.jwt.claim.sub" = '${userA_id}';`)
  await testExpectation(
    "Authenticated user CANNOT write to career_paths (Service role only)",
    () => db.query("insert into public.career_paths (name, category) values ('Unapproved Path', 'tech');"),
    { type: 'error', code: '42501', message: 'violates row-level security policy' }
  )

  // --- PHASE 2 TESTS: QUIZ QUESTIONS, SKILL ASSESSMENTS, WORK STYLE PROFILES ---

  // 12. Public read of quiz_questions by anon
  await db.exec(`set role anon; set "request.jwt.claim.sub" = '';`)
  await testExpectation(
    "Anonymous user CAN read public quiz_questions",
    () => db.query('select * from public.quiz_questions;'),
    { type: 'rowCount', minCount: 6 }
  )

  // 13. Unauthorized write to quiz_questions by anon
  await testExpectation(
    "Anonymous user CANNOT write to quiz_questions (Service role only)",
    () => db.query("insert into public.quiz_questions (question_text, options) values ('Fake question', '[]'::jsonb);"),
    { type: 'error', code: '42501', message: 'violates row-level security policy' }
  )

  // 14. Unauthorized write to quiz_questions by authenticated user
  await db.exec(`set role authenticated; set "request.jwt.claim.sub" = '${userA_id}';`)
  await testExpectation(
    "Authenticated user CANNOT write to quiz_questions (Service role only)",
    () => db.query("insert into public.quiz_questions (question_text, options) values ('Fake question', '[]'::jsonb);"),
    { type: 'error', code: '42501', message: 'violates row-level security policy' }
  )

  // Fetch a valid question_id for testing assessments
  const qResult = await db.query('select id, career_path_id from public.quiz_questions limit 1;')
  const testQuestionId = qResult.rows[0].id
  const testCareerPathId = qResult.rows[0].career_path_id

  // 15. Anonymous user CANNOT read skill_assessments
  await db.exec(`set role anon; set "request.jwt.claim.sub" = '';`)
  await testExpectation(
    "Anonymous user CANNOT read skill_assessments",
    () => db.query('select * from public.skill_assessments;'),
    { type: 'rowCount', count: 0 }
  )

  // 16. Anonymous user CANNOT insert skill_assessments
  await testExpectation(
    "Anonymous user CANNOT insert skill_assessments (RLS rejection)",
    () => db.query(`insert into public.skill_assessments (user_id, question_id, answer, is_correct) values ('${userA_id}', '${testQuestionId}', 'A', true);`),
    { type: 'error', code: '42501', message: 'violates row-level security policy' }
  )

  // 17. User A can insert their own skill_assessment
  await db.exec(`set role authenticated; set "request.jwt.claim.sub" = '${userA_id}';`)
  await testExpectation(
    "User A can insert their own skill_assessment (auth.uid = user_id)",
    () => db.query(`insert into public.skill_assessments (user_id, career_path_id, question_id, answer, is_correct) values ('${userA_id}', '${testCareerPathId}', '${testQuestionId}', 'A', true);`),
    { type: 'affected', count: 1 }
  )

  // 18. User A can read their own skill_assessment
  await testExpectation(
    "User A can read their own skill_assessment",
    () => db.query(`select * from public.skill_assessments where user_id = '${userA_id}';`),
    { type: 'rowCount', count: 1 }
  )

  // 19. User B CANNOT read User A's skill_assessment
  await db.exec(`set role authenticated; set "request.jwt.claim.sub" = '${userB_id}';`)
  await testExpectation(
    "User B CANNOT read User A's skill_assessment (Cross-user read blocked by RLS)",
    () => db.query(`select * from public.skill_assessments where user_id = '${userA_id}';`),
    { type: 'rowCount', count: 0 }
  )

  // 20. User B CANNOT update User A's skill_assessment
  await testExpectation(
    "User B CANNOT update User A's skill_assessment (Cross-user update blocked by RLS)",
    () => db.query(`update public.skill_assessments set answer = 'Hacked' where user_id = '${userA_id}';`),
    { type: 'affected', count: 0 }
  )

  // 21. Anonymous user CANNOT read work_style_profiles
  await db.exec(`set role anon; set "request.jwt.claim.sub" = '';`)
  await testExpectation(
    "Anonymous user CANNOT read work_style_profiles",
    () => db.query('select * from public.work_style_profiles;'),
    { type: 'rowCount', count: 0 }
  )

  // 22. User A can insert their own work_style_profile
  await db.exec(`set role authenticated; set "request.jwt.claim.sub" = '${userA_id}';`)
  await testExpectation(
    "User A can insert their own work_style_profile (auth.uid = user_id)",
    () => db.query(`insert into public.work_style_profiles (user_id, learning_style, motivation_driver, feedback_preference, collaboration_style) values ('${userA_id}', 'Visual / Hands-on', 'Creative Craftsmanship', 'Supportive coaching', 'Small supportive squad');`),
    { type: 'affected', count: 1 }
  )

  // 23. User A can read their own work_style_profile
  await testExpectation(
    "User A can read their own work_style_profile",
    () => db.query(`select * from public.work_style_profiles where user_id = '${userA_id}';`),
    { type: 'rowCount', count: 1 }
  )

  // 24. User B CANNOT read User A's work_style_profile
  await db.exec(`set role authenticated; set "request.jwt.claim.sub" = '${userB_id}';`)
  await testExpectation(
    "User B CANNOT read User A's work_style_profile (Cross-user read blocked by RLS)",
    () => db.query(`select * from public.work_style_profiles where user_id = '${userA_id}';`),
    { type: 'rowCount', count: 0 }
  )

  // 25. User B CANNOT update User A's work_style_profile
  await testExpectation(
    "User B CANNOT update User A's work_style_profile (Cross-user update blocked by RLS)",
    () => db.query(`update public.work_style_profiles set learning_style = 'Hacked' where user_id = '${userA_id}';`),
    { type: 'affected', count: 0 }
  )

  // --- PHASE 3 TESTS: ATOMIC STREAK RPC & EXPLOIT PREVENTION ---

  // 26. User A calls complete_daily_task()
  await db.exec(`set role authenticated; set "request.jwt.claim.sub" = '${userA_id}';`)
  await testExpectation(
    "User A can complete daily task atomically via RPC (streak initialized to 1)",
    async () => {
      const res = await db.query(`select public.complete_daily_task() as result;`)
      const data = res.rows[0].result
      if (data.current_streak === 1 && data.already_completed === false) {
        return { rows: [data] }
      }
      throw new Error(`Unexpected streak result: ${JSON.stringify(data)}`)
    },
    { type: 'rowCount', count: 1 }
  )

  // 27. User A calls complete_daily_task() again today (idempotent, already_completed = true)
  await testExpectation(
    "User A calling complete_daily_task() again today is idempotent (already_completed: true)",
    async () => {
      const res = await db.query(`select public.complete_daily_task() as result;`)
      const data = res.rows[0].result
      if (data.current_streak === 1 && data.already_completed === true) {
        return { rows: [data] }
      }
      throw new Error(`Unexpected streak result on second call: ${JSON.stringify(data)}`)
    },
    { type: 'rowCount', count: 1 }
  )

  // 28. User B attempts to call complete_daily_task for User A (Exploit prevention)
  await db.exec(`set role authenticated; set "request.jwt.claim.sub" = '${userB_id}';`)
  await testExpectation(
    "User B CANNOT call complete_daily_task for User A (Cross-user exploit blocked by Postgres)",
    () => db.query(`select public.complete_daily_task('${userA_id}');`),
    { type: 'error', code: '42501', message: 'Permission denied: cannot complete streak for another user' }
  )

  // 29. Anonymous user cannot call complete_daily_task
  await db.exec(`set role anon; set "request.jwt.claim.sub" = '';`)
  await testExpectation(
    "Anonymous user CANNOT call complete_daily_task (Permission denied / 42501)",
    () => db.query(`select public.complete_daily_task('${userA_id}');`),
    { type: 'error', code: '42501' }
  )

  // 30. Streak increments when last_completed_date was yesterday
  await db.exec(`
    reset role;
    update public.profiles set last_completed_date = current_date - 1 where id = '${userA_id}';
    set role authenticated;
    set "request.jwt.claim.sub" = '${userA_id}';
  `)
  await testExpectation(
    "User A completing task when last_completed was yesterday increments streak to 2",
    async () => {
      const res = await db.query(`select public.complete_daily_task() as result;`)
      const data = res.rows[0].result
      if (data.current_streak === 2 && data.already_completed === false) {
        return { rows: [data] }
      }
      throw new Error(`Expected streak 2, got: ${JSON.stringify(data)}`)
    },
    { type: 'rowCount', count: 1 }
  )

  console.log('\n[4/4] Verification Summary:')
  console.log(`      Total Security Tests: ${totalTests}`)
  console.log(`      Passed: ${passedTests}`)
  console.log(`      Failed: ${totalTests - passedTests}`)

  if (passedTests === totalTests) {
    console.log('\n>>> SUCCESS: ALL ROW LEVEL SECURITY POLICIES & RPC FUNCTIONS ARE ENFORCED AND VERIFIED. <<<\n')
  } else {
    console.error('\n>>> FAILURE: Some RLS/RPC security tests failed verification. <<<\n')
    process.exit(1)
  }
}

verifyRLS().catch((err) => {
  console.error('Fatal verification failure:', err)
  process.exit(1)
})
