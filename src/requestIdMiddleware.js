// src/requestIdMiddleware.js
/**
 * Middleware that generates a UUIDv4 request ID, attaches it to the request and response,
 * and logs request details in a structured JSON format.
 *
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next middleware function
 */
const crypto = require('crypto')

function requestIdMiddleware (req, res, next) {
  try {
    const id = crypto.randomUUID()
    // expose the id on the request for downstream handlers
    req.id = id
    // add header to the response
    res.setHeader('X-Request-Id', id)
    const start = Date.now()
    // log when the response finishes
    res.on('finish', () => {
      const duration = Date.now() - start
      const logEntry = {
        requestId: id,
        method: req.method,
        url: req.originalUrl || req.url,
        status: res.statusCode,
        duration
      }
      // using console.log for simplicity; replace with a proper logger in production
      console.log(JSON.stringify(logEntry))
    })
    next()
  } catch (err) {
    // forward unexpected errors to Express error handling
    next(err)
  }
}

module.exports = requestIdMiddleware
