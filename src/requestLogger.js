// src/requestLogger.js
/**
 * Middleware that generates a unique request ID, attaches it to the request,
 * adds it to the response header and logs request/response details in a
 * structured JSON format.
 *
 * The middleware is safe for async route handlers and does not modify the
 * response body. It logs after the response is finished, regardless of the
 * outcome (success or error).
 *
 * @returns {import('express').RequestHandler}
 */
function requestIdAndLogger () {
  const onFinished = require('on-finished')
  const crypto = require('crypto')

  return function (req, res, next) {
    // generate a UUID v4 request id – fallback to random bytes if unavailable
    const requestId = (typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : crypto.randomBytes(16).toString('hex')
    // expose on request object for downstream handlers
    req.id = requestId
    // expose on response header for clients / tracing tools
    res.setHeader('X-Request-Id', requestId)

    const start = process.hrtime.bigint()
    // ensure logging runs after response is sent (including early responses)
    onFinished(res, () => {
      const end = process.hrtime.bigint()
      const durationMs = Number(end - start) / 1e6
      const logEntry = {
        requestId,
        method: req.method,
        url: req.originalUrl || req.url,
        status: res.statusCode,
        durationMs: Number(durationMs.toFixed(2))
      }
      // structured log – stringified JSON for easy ingestion by log systems
      console.log(JSON.stringify(logEntry))
    })

    // continue to next middleware / route handler
    try {
      next()
    } catch (err) {
      // synchronous errors – let Express handle them after logging
      next(err)
    }
  }
}

module.exports = requestIdAndLogger
