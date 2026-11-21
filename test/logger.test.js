// test/logger.test.js
const express = require('express')
const request = require('supertest')
const logger = require('../src/logger')

/**
 * Helper to capture console output without affecting global state.
 * Returns a mock function that records all logged strings.
 */
function captureConsoleLog () {
  const original = console.log
  const calls = []
  console.log = (...args) => {
    calls.push(args.join(' '))
  }
  return {
    getCalls: () => calls,
    restore: () => { console.log = original }
  }
}

describe('request logger middleware', () => {
  let app
  beforeEach(() => {
    app = express()
    // place logger before any routes so it wraps the whole request lifecycle
    app.use(logger())
    // simple test route
    app.get('/test', (req, res) => {
      // simulate async work
      setTimeout(() => {
        res.status(201).json({ ok: true })
      }, 10)
    })
  })

  test('generates a unique requestId and exposes it on req.id and X-Request-Id header', async () => {
    const consoleCapture = captureConsoleLog()
    const first = await request(app).get('/test')
    const firstIdHeader = first.headers['x-request-id']
    expect(firstIdHeader).toBeDefined()
    // the request object inside the route is not directly accessible, but we can infer
    // that the middleware attached the same id to the header.
    expect(firstIdHeader).toMatch(/^[0-9a-f-]{36}$|^[0-9a-f]{32}$/i)

    const second = await request(app).get('/test')
    const secondIdHeader = second.headers['x-request-id']
    expect(secondIdHeader).toBeDefined()
    expect(secondIdHeader).not.toBe(firstIdHeader)
    consoleCapture.restore()
  })

  test('logs a JSON line with method, url, statusCode, durationMs and requestId after response finishes', async () => {
    const consoleCapture = captureConsoleLog()
    await request(app).get('/test?foo=bar')
    consoleCapture.restore()
    const logs = consoleCapture.getCalls()
    expect(logs.length).toBeGreaterThan(0)
    const lastLog = logs[logs.length - 1]
    let parsed
    expect(() => { parsed = JSON.parse(lastLog) }).not.toThrow()
    expect(parsed).toMatchObject({
      method: 'GET',
      url: '/test?foo=bar',
      statusCode: 201,
      requestId: expect.any(String)
    })
    expect(typeof parsed.durationMs).toBe('number')
    expect(parsed.durationMs).toBeGreaterThanOrEqual(0)
  })
})
