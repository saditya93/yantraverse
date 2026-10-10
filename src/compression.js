// src/compression.js
/**
 * Compression middleware that gzips response bodies larger than a threshold
 * when the client indicates support via the Accept‑Encoding header.
 *
 * @param {Object} [options]
 * @param {number} [options.threshold=1024] Minimum response size in bytes to trigger compression
 * @returns {function(req: import('http').IncomingMessage, res: import('http').ServerResponse, next: function): void}
 */
function compression (options) {
  const opts = Object.assign({ threshold: 1024 }, options)

  return function (req, res, next) {
    // Do not attempt compression for HEAD requests or when client does not accept gzip
    const acceptEncoding = req.headers['accept-encoding'] || ''
    if (req.method === 'HEAD' || !/gzip/.test(acceptEncoding)) {
      return next()
    }

    // Preserve original methods
    const _write = res.write
    const _end = res.end
    const _writeHead = res.writeHead

    // Buffer to accumulate response chunks
    const chunks = []
    let totalLength = 0
    let headersSent = false
    let statusCode = 200

    // Intercept writeHead to capture status code without sending headers yet
    res.writeHead = function (code) {
      statusCode = code
      // Defer sending headers until we know whether to compress
    }

    // Override write to buffer data
    res.write = function (chunk, encoding, callback) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding)
      chunks.push(buffer)
      totalLength += buffer.length
      if (typeof callback === 'function') callback()
      return true
    }

    // Override end to decide on compression and flush the response
    res.end = function (chunk, encoding, callback) {
      if (chunk) {
        res.write(chunk, encoding)
      }

      // Determine if we should compress
      const shouldCompress =
        totalLength >= opts.threshold &&
        statusCode >= 200 && statusCode < 300 &&
        !res.getHeader('Content-Encoding') &&
        !res.getHeader('Content-Range') &&
        !(statusCode === 204 || statusCode === 304)

      if (shouldCompress) {
        // Set appropriate headers
        res.setHeader('Content-Encoding', 'gzip')
        // Remove Content-Length because it will change after compression
        res.removeHeader('Content-Length')
        // Send headers now
        _writeHead.call(res, statusCode)
        const zlib = require('zlib')
        const gzip = zlib.createGzip()
        // Pipe buffered data through gzip and write to original response
        const { PassThrough } = require('stream')
        const source = new PassThrough()
        source.end(Buffer.concat(chunks))
        source.pipe(gzip).pipe(res)
        // When compression finishes, invoke callback if provided
        gzip.on('end', () => {
          if (typeof callback === 'function') callback()
        })
      } else {
        // No compression – send original data
        // Restore original headers
        _writeHead.call(res, statusCode)
        const body = Buffer.concat(chunks)
        _write.call(res, body)
        _end.call(res, null, null, callback)
      }
    }

    next()
  }
}

module.exports = compression

// test/compression.test.js
const request = require('supertest')
const express = require('express')
const compression = require('../src/compression')
const zlib = require('zlib')

/**
 * Helper to create an app with the compression middleware and a test route
 *
 * @param {number} size Size of the response payload in bytes
 * @returns {express.Express}
 */
function createApp (size) {
  const app = express()
  app.use(compression({ threshold: 1024 }))
  app.get('/test', (req, res) => {
    const payload = 'a'.repeat(size)
    res.send(payload)
  })
  return app
}

describe('compression middleware', () => {
  test('compresses when payload exceeds threshold and client accepts gzip', async () => {
    const app = createApp(2000)
    const response = await request(app)
      .get('/test')
      .set('Accept-Encoding', 'gzip')
      .expect(200)
    expect(response.headers['content-encoding']).toBe('gzip')
    // Decompress body and verify content
    const decompressed = zlib.gunzipSync(response.body)
    expect(decompressed.toString()).toBe('a'.repeat(2000))
  })

  test('does not compress when payload is below threshold', async () => {
    const app = createApp(500)
    const response = await request(app)
      .get('/test')
      .set('Accept-Encoding', 'gzip')
      .expect(200)
    expect(response.headers['content-encoding']).toBeUndefined()
    expect(response.text).toBe('a'.repeat(500))
  })

  test('does not compress when client does not support gzip', async () => {
    const app = createApp(2000)
    const response = await request(app)
      .get('/test')
      .expect(200)
    expect(response.headers['content-encoding']).toBeUndefined()
    expect(response.text).toBe('a'.repeat(2000))
  })

  test('does not compress non‑200 responses', async () => {
    const app = express()
    app.use(compression({ threshold: 1024 }))
    app.get('/nocontent', (req, res) => {
      res.status(204).end()
    })
    const response = await request(app)
      .get('/nocontent')
      .set('Accept-Encoding', 'gzip')
      .expect(204)
    expect(response.headers['content-encoding']).toBeUndefined()
  })
})
