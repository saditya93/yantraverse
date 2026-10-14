// src/server.js
/**
 * Simple HTTP server with graceful shutdown support.
 * The server tracks active requests and, upon receiving SIGINT or SIGTERM,
 * stops accepting new connections, waits up to 30 seconds for in‑flight
 * requests to finish, then closes and exits with code 0.
 */
const http = require('http')

/**
 * Starts the HTTP server on the given port.
 * @param {number} port - Port number to listen on.
 * @param {function(req, res): void} [requestHandler] - Optional custom request handler.
 * @returns {http.Server} The created server instance.
 */
function startServer (port, requestHandler) {
  let activeRequests = 0
  const server = http.createServer((req, res) => {
    activeRequests++
    // Ensure the request count is decremented when the response finishes or errors
    const cleanup = () => {
      activeRequests--
    }
    res.on('finish', cleanup)
    res.on('close', cleanup)
    // Default handler if none provided
    if (requestHandler) {
      requestHandler(req, res)
    } else {
      // Simulate some work to allow testing of draining
      setTimeout(() => {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('OK')
      }, 100)
    }
  })

  // Helper to attempt graceful shutdown
  const initiateShutdown = () => {
    // Stop accepting new connections immediately
    server.close(() => {
      // Server closed, no more connections will be accepted
    })
    // Wait for active requests to finish or timeout after 30 seconds
    const timeout = setTimeout(() => {
      process.exit(0)
    }, 30000)
    const checkInterval = setInterval(() => {
      if (activeRequests === 0) {
        clearTimeout(timeout)
        clearInterval(checkInterval)
        process.exit(0)
      }
    }, 100)
  }

  // Register signal handlers only once per process
  if (!process.__gracefulShutdownRegistered) {
    process.on('SIGINT', initiateShutdown)
    process.on('SIGTERM', initiateShutdown)
    process.__gracefulShutdownRegistered = true
  }

  server.listen(port)
  return server
}

module.exports = { startServer }
