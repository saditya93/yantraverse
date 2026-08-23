// src/errorMiddleware.js
/**
 * Custom error class that represents HTTP errors.
 * @extends Error
 */
class HttpError extends Error {
  /**
   * Create an HttpError.
   * @param {number} status - HTTP status code.
   * @param {string} message - Error message.
   */
  constructor (status, message) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    // Maintains proper stack trace (only on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HttpError)
    }
  }
}

/**
 * Express error‑handling middleware that returns a structured JSON payload.
 * It maps known HttpError instances to their status codes and hides stack
 * traces in production.
 * @param {Error} err - The error thrown in the request pipeline.
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {Function} next - Express next function (unused).
 */
function errorHandler (err, req, res, next) {
  // Always log the error for observability
  console.error(err)

  const isHttpError = err instanceof HttpError && typeof err.status === 'number'
  const status = isHttpError ? err.status : 500

  // In production we never expose internal error details for 5xx
  const isProduction = process.env.NODE_ENV === 'production'
  const message = isProduction && status === 500
    ? 'Internal Server Error'
    : err.message || 'Error'

  res.status(status).json({ error: { status, message } })
}

module.exports = { HttpError, errorHandler }
