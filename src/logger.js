// src/logger.js
/**
 * Built‑in request/response logging middleware.
 * Logs a single line JSON object to stdout for each request.
 *
 * @param {Object} [options={}] Configuration options
 * @param {boolean} [options.enabled=true] Enable or disable logging
 * @param {function(Object):string} [options.format] Custom formatter that receives the log object and returns a string
 * @returns {function} Express middleware function
 */
function logger (options = {}) {
  const {
    enabled = true,
    format
  } = options

  // If logging is disabled, return a no‑op middleware
  if (!enabled) {
    return function noOp (req, res, next) {
      next()
    }
  }

  return function middleware (req, res, next) {
    const start = process.hrtime()
    const { method, originalUrl } = req
    const ip = req.ip || req.connection?.remoteAddress || ''

    // When response finishes, calculate duration and log
    const onFinish = () => {
      const diff = process.hrtime(start)
      const responseTime = (diff[0] * 1e3) + (diff[1] / 1e6) // ms with fractions
      const logEntry = {
        timestamp: new Date().toISOString(),
        method,
        url: originalUrl,
        status: res.statusCode,
        responseTime: Number(responseTime.toFixed(3)),
        ip
      }

      let output
      try {
        output = typeof format === 'function' ? format(logEntry) : JSON.stringify(logEntry)
      } catch (e) {
        // Fallback to JSON if custom formatter throws
        output = JSON.stringify(logEntry)
      }

      // Ensure a newline for line‑delimited logs
      process.stdout.write(output + '\n')
    }

    res.on('finish', onFinish)
    // In case of error, also log when the response is closed
    res.on('close', onFinish)
    next()
  }
}

module.exports = logger
