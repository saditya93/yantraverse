// test/logger.test.js
const express = require('express')
const request = require('supertest')
const logger = require('../src/logger')

/**
 * Helper to capture stdout writes.
 * Returns a function that restores the original write method.
 */
function captureStdout () {
  const writes = []
  const originalWrite = process.stdout.write
  // eslint-disable-next-line no-param-reassign
  process.stdout.write = function (chunk, encoding, callback) {
    writes.push(chunk.toString())
    if (typeof callback === 'function') callback()
    return true
  }
  return {
    writes,
    restore () {
      process.stdout.write = originalWrite
    }
  }
}

describe('logger middleware', () => {
  let app
  beforeEach(() => {
    app = express()
    // Simple endpoint for testing
    app.get('/test', (req, res) => {
      res.status(201).json({ ok: true })
    })
  })

  test('logs method, url and timestamp for a GET request', async () => {
    const { writes, restore } = captureStdout()
    app.use(logger())
    await request(app).get('/test')
    restore()
    expect(writes.length).toBeGreaterThan(0)
    const log = JSON.parse(writes[0])
    expect(log.method).toBe('GET')
    expect(log.url).toBe('/test')
    expect(log).toHaveProperty('timestamp')
  })

  test('logs response status and elapsed time after response is sent', async () => {
    const { writes, restore } = captureStdout()
    app.use(logger())
    await request(app).get('/test')
    restore()
    const log = JSON.parse(writes[0])
    expect(log.status).toBe(201)
    expect(log).toHaveProperty('responseTime')
    expect(typeof log.responseTime).toBe('number')
  })

  test('respects user‑provided options to disable logging', async () => {
    const { writes, restore } = captureStdout()
    app.use(logger({ enabled: false }))
    await request(app).get('/test')
    restore()
    expect(writes.length).toBe(0)
  })

  test('allows custom log format function', async () => {
    const customFormat = entry => `METHOD=${entry.method} URL=${entry.url} STATUS=${entry.status}`
    const { writes, restore } = captureStdout()
    app.use(logger({ format: customFormat }))
    await request(app).get('/test')
    restore()
    expect(writes.length).toBe(1)
    const line = writes[0].trim()
    expect(line).toMatch(/^METHOD=GET URL=\/test STATUS=201$/)
  })
})
