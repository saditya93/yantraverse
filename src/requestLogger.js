// src/requestLogger.js
/**
 * Request logger middleware creator.
 * Logs each incoming HTTP request with method, url, status and response time.
 * Configurable log level and output format.
 *
 * @param {Object} [options]
 * @param {string} [options.logLevel='info'] - One of 'info', 'warn', 'error'.
 * @param {string} [options.format='pretty'] - One of 'pretty', 'json'.
 * @returns {function} Express middleware function
 */
function createRequestLogger (options = {}) {
  const {
    logLevel = 'info',
    format = 'pretty'
  } = options

  const levelPriority = {
    info: 0,
    warn: 1,
    error: 2
  }

  const shouldLog = (status) => {
    if (logLevel === 'info') return true
    if (logLevel === 'warn') return status >= 400
    if (logLevel === 'error') return status >= 500
    return true
  }

  const formatMessage = (info) => {
    if (format === 'json') {
      return JSON.stringify(info)
    }
    // pretty format
    return `${info.method} ${info.url} ${info.status} ${info.responseTime}ms`
  }

  return function requestLogger (req, res, next) {
    const start = process.hrtime()
    // Ensure next is called even if request object is malformed
    try {
      next()
    } catch (err) {
      // Propagate error after logging
      const diff = process.hrtime(start)
      const responseTime = Math.round((diff[0] * 1e3) + (diff[1] / 1e6))
      const info = {
        method: req?.method || 'UNKNOWN',
        url: req?.originalUrl || req?.url || 'UNKNOWN',
        status: res?.statusCode || 500,
        responseTime,
        error: err.message
      }
      if (shouldLog(info.status)) {
        console.log(formatMessage(info))
      }
      throw err
    }

    // Listen for the finish event to log after response is sent
    res.on('finish', () => {
      const diff = process.hrtime(start)
      const responseTime = Math.round((diff[0] * 1e3) + (diff[1] / 1e6))
      const info = {
        method: req?.method || 'UNKNOWN',
        url: req?.originalUrl || req?.url || 'UNKNOWN',
        status: res?.statusCode || 0,
        responseTime
      }
      if (shouldLog(info.status)) {
        console.log(formatMessage(info))
      }
    })
  }
}

module.exports = { createRequestLogger }
