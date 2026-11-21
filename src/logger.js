// src/logger.js
/**
 * Middleware that assigns a unique request identifier and logs request details
 * in a structured JSON format. The identifier is also exposed via the
 * `X-Request-Id` response header and the `req.id` property.
 *
 * The middleware is deliberately lightweight and has no external runtime
 * dependencies. It uses the built‑in `crypto` module for UUID generation and
 * `process.hrtime.bigint` for high‑resolution timing.
 *
 * @returns {function} Express compatible middleware
 */
function logger () {
  return function (req, res, next) {
    // generate a request id – reuse if already present (e.g. upstream proxy)
    const crypto = require('crypto')
    const generatedId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex')
    const requestId = req.id || generatedId
    req.id = requestId
    // expose the id to the client
    res.setHeader('X-Request-Id', requestId)

    const start = process.hrtime.bigint()
    // `finish` fires when the response is sent and the underlying socket is closed
    res.once('finish', () => {
      const end = process.hrtime.bigint()
      const durationMs = Number(end - start) / 1e6
      const logEntry = {
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs: Math.round(durationMs),
        requestId: requestId
      }
      // Defensive: ensure logging never throws the request handling flow
      try {
        console.log(JSON.stringify(logEntry))
      } catch (_) {}
    })

    // continue to the next middleware / route handler
    next()
  }
}

module.exports = logger
