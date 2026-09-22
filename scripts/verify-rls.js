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

  console.log('[2/4] Executing migration: supabase/migrations/20260922000000_initial_schema.sql...')
  const migrationPath = path.resolve('supabase/migrations/20260922000000_initial_schema.sql')
  const migrationSql = fs.readFileSync(migrationPath, 'utf8')
  await db.exec(migrationSql)

  await db.exec(`
    grant all on all tables in schema public to anon, authenticated;
    insert into auth.users (id, email) values
      ('11111111-1111-1111-1111-111111111111', 'usera@example.com'),
      ('22222222-2222-2222-2222-222222222222', 'userb@example.com');
  `)
  console.log('✓ Migration executed. All tables, triggers, and RLS policies created.\n')

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
        } else {
          console.error(`✗ FAIL: ${name} — Expected ${expectedResult.count} rows, got ${result.rows.length}`)
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

  // --- TEST SUITE ---

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

  // 4. User A updating their own profile
  await testExpectation(
    "User A can update their own profile (auth.uid = id)",
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

  console.log('\n[4/4] Verification Summary:')
  console.log(`      Total Security Tests: ${totalTests}`)
  console.log(`      Passed: ${passedTests}`)
  console.log(`      Failed: ${totalTests - passedTests}`)

  if (passedTests === totalTests) {
    console.log('\n>>> SUCCESS: ALL ROW LEVEL SECURITY POLICIES ARE ENFORCED AND VERIFIED. <<<\n')
  } else {
    console.error('\n>>> FAILURE: Some RLS policies failed verification. <<<\n')
    process.exit(1)
  }
}

verifyRLS().catch((err) => {
  console.error('Fatal verification failure:', err)
  process.exit(1)
})
