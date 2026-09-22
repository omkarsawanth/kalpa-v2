import { ApiError, sanitizeError } from '../server/utils/errorHandler.js'

function runTests() {
  console.log('--- Testing Global Error Handler Sanitization ---')
  let passed = 0
  let failed = 0

  function assert(condition, name) {
    if (condition) {
      console.log(`✓ ${name}`)
      passed++
    } else {
      console.error(`✗ ${name}`)
      failed++
    }
  }

  // 1. Raw unexpected runtime error with stack trace
  const rawError = new Error('FATAL: pg_hba.conf rejects connection for host "10.0.0.1", user "postgres", database "kalpa", SSL off')
  rawError.stack = 'Error: FATAL at PostgresConnection.connect (/secret/path/db.js:42:15)'
  const sanitizedRaw = sanitizeError(rawError)

  assert(sanitizedRaw.statusCode === 500, 'Raw error returns HTTP 500')
  assert(sanitizedRaw.payload.success === false, 'Payload includes success: false')
  assert(sanitizedRaw.payload.error.code === 'INTERNAL_SERVER_ERROR', 'Payload code is INTERNAL_SERVER_ERROR')
  assert(!sanitizedRaw.payload.error.message.includes('pg_hba.conf'), 'Raw message is completely hidden')
  assert(!JSON.stringify(sanitizedRaw.payload).includes('stack'), 'Stack trace is not leaked')
  assert(!JSON.stringify(sanitizedRaw.payload).includes('secret'), 'Path details are not leaked')

  // 2. Postgres unique violation (23505)
  const uniqueError = {
    code: '23505',
    detail: 'Key (email)=(user@example.com) already exists in table "profiles".',
    table: 'profiles',
  }
  const sanitizedUnique = sanitizeError(uniqueError)
  assert(sanitizedUnique.statusCode === 409, 'Unique violation returns HTTP 409')
  assert(sanitizedUnique.payload.error.code === 'ALREADY_EXISTS', 'Returns ALREADY_EXISTS code')
  assert(!sanitizedUnique.payload.error.message.includes('profiles'), 'Internal table name is not leaked')

  // 3. Postgres RLS violation (42501)
  const rlsError = {
    code: '42501',
    message: 'new row violates row-level security policy for table "profiles"',
  }
  const sanitizedRls = sanitizeError(rlsError)
  assert(sanitizedRls.statusCode === 403, 'RLS violation returns HTTP 403')
  assert(sanitizedRls.payload.error.code === 'FORBIDDEN_RLS', 'Returns FORBIDDEN_RLS code')

  // 4. Operational ApiError
  const apiErr = ApiError.rateLimited('Gemini API limit reached for today')
  const sanitizedApi = sanitizeError(apiErr)
  assert(sanitizedApi.statusCode === 429, 'Rate limit error returns HTTP 429')
  assert(sanitizedApi.payload.error.code === 'RATE_LIMITED', 'Returns RATE_LIMITED code')

  console.log(`\nResult: ${passed} passed, ${failed} failed.\n`)
  if (failed > 0) process.exit(1)
}

runTests()
