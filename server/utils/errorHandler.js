/**
 * Kalpa v2 — Global API Error Handler
 *
 * Architecture Rule: Never leak raw stack traces, database schema details,
 * or raw internal database error messages to the client. Always map to clean,
 * standardized error codes with generic user-facing messages.
 */

export class ApiError extends Error {
  constructor(statusCode, code, message) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
    this.isOperational = true
    Error.captureStackTrace?.(this, this.constructor)
  }

  static badRequest(message = 'Invalid request payload', code = 'BAD_REQUEST') {
    return new ApiError(400, code, message)
  }

  static unauthorized(message = 'Authentication required', code = 'UNAUTHORIZED') {
    return new ApiError(401, code, message)
  }

  static forbidden(message = 'Access denied', code = 'FORBIDDEN') {
    return new ApiError(403, code, message)
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND') {
    return new ApiError(404, code, message)
  }

  static conflict(message = 'Resource conflict', code = 'CONFLICT') {
    return new ApiError(409, code, message)
  }

  static rateLimited(message = 'Too many requests. Please try again later.', code = 'RATE_LIMITED') {
    return new ApiError(429, code, message)
  }

  static internal(message = 'An unexpected internal error occurred', code = 'INTERNAL_SERVER_ERROR') {
    return new ApiError(500, code, message)
  }
}

/**
 * Sanitizes any error (database, runtime, or operational) into a safe client response.
 * @param {Error|any} err
 * @returns {{ statusCode: number, payload: { success: false, error: { code: string, message: string } } }}
 */
export function sanitizeError(err) {
  // Operational API errors defined explicitly
  if (err instanceof ApiError) {
    return {
      statusCode: err.statusCode,
      payload: {
        success: false,
        error: {
          code: err.code,
          message: err.message,
        },
      },
    }
  }

  // Supabase / Postgres Database Error Sanitization
  const pgCode = err?.code || err?.pgCode
  if (pgCode) {
    // Known Postgres error code classifications
    switch (pgCode) {
      case '23505': // unique_violation
        return {
          statusCode: 409,
          payload: {
            success: false,
            error: {
              code: 'ALREADY_EXISTS',
              message: 'A record with this identifier already exists.',
            },
          },
        }
      case '23503': // foreign_key_violation
        return {
          statusCode: 400,
          payload: {
            success: false,
            error: {
              code: 'INVALID_REFERENCE',
              message: 'Referenced entity does not exist.',
            },
          },
        }
      case '42501': // insufficient_privilege / RLS violation
        return {
          statusCode: 403,
          payload: {
            success: false,
            error: {
              code: 'FORBIDDEN_RLS',
              message: 'You do not have permission to access or modify this record.',
            },
          },
        }
      case 'PGRST116': // Single row expected but none found
        return {
          statusCode: 404,
          payload: {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Requested record was not found.',
            },
          },
        }
      default:
        // Mask any other DB error codes (e.g. 42P01 syntax/table missing, etc.)
        return {
          statusCode: 500,
          payload: {
            success: false,
            error: {
              code: 'DATABASE_ERROR',
              message: 'A database error occurred while processing your request.',
            },
          },
        }
    }
  }

  // Fallback for unhandled unexpected runtime errors: NEVER return stack trace or raw message
  return {
    statusCode: 500,
    payload: {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred. Please try again later.',
      },
    },
  }
}

/**
 * Express / Connect Global Error Handler Middleware
 */
export function globalErrorHandler(err, _req, res, _next) {
  // Log internal details securely on server for diagnostics
  if (process.env.NODE_ENV !== 'production') {
    console.error('[Internal Error Diagnostic]:', err)
  }

  const { statusCode, payload } = sanitizeError(err)
  res.status(statusCode).json(payload)
}

/**
 * Serverless / Vercel Handler Wrapper
 * Wraps an async API route handler and catches any uncaught exceptions,
 * returning sanitized responses.
 */
export function withErrorHandler(handler) {
  return async (req, res) => {
    try {
      await handler(req, res)
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[Internal Error Diagnostic]:', err)
      }
      const { statusCode, payload } = sanitizeError(err)
      res.status(statusCode).json(payload)
    }
  }
}
