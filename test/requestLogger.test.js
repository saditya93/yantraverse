// test/requestLogger.test.js
const request = require('supertest')
const express = require('express')
const { createRequestLogger } = require('../src/requestLogger')

/**
 * Helper to capture console.log output
 * @returns {{logs: string[], restore: function}}
 */
function captureConsole () {
  const original = console.log
  const logs = []
  console.log = (msg) => {
    logs.push(msg)
  }
  const restore = () => {
    console.log = original
  }
  return { logs, restore }
}

describe('Request Logger Middleware', () => {
  let app
  beforeEach(() => {
    app = express()
    // simple route for testing
    app.get('/test', (req, res) => {
      res.status(200).send('ok')
    })
    // route that returns an error status
    app.get('/error', (req, res) => {
      res.status(500).send('error')
    })
    // static-like route
    app.get('/static/file.js', (req, res) => {
      res.status(200).send('js')
    })
  })

  test('logs method, url, status and response time in default format', async () => {
    const { logs, restore } = captureConsole()
    app.use(createRequestLogger())
    await request(app).get('/test')
    restore()
    expect(logs.length).toBe(1)
    const log = logs[0]
    expect(log).toMatch(/^GET \/test 200 \d+ms$/)
  })

  test('respects custom logLevel="error" and only logs error responses', async () => {
    const { logs, restore } = captureConsole()
    app.use(createRequestLogger({ logLevel: 'error' }))
    await request(app).get('/test')
    await request(app).get('/error')
    restore()
    expect(logs.length).toBe(1)
    const log = logs[0]
    expect(log).toMatch(/^GET \/error 500 \d+ms$/)
  })

  test('outputs JSON when format="json" with expected fields', async () => {
    const { logs, restore } = captureConsole()
    app.use(createRequestLogger({ format: 'json' }))
    await request(app).get('/static/file.js')
    restore()
    expect(logs.length).toBe(1)
    const parsed = JSON.parse(logs[0])
    expect(parsed).toHaveProperty('method', 'GET')
    expect(parsed).toHaveProperty('url', '/static/file.js')
    expect(parsed).toHaveProperty('status', 200)
    expect(parsed).toHaveProperty('responseTime')
    expect(typeof parsed.responseTime).toBe('number')
  })

  test('does not crash on malformed request objects', async () => {
    const { logs, restore } = captureConsole()
    // Middleware that mutates req to undefined before logger runs
    app.use((req, res, next) => {
      req.method = undefined
      req.url = undefined
      next()
    })
    app.use(createRequestLogger())
    await request(app).get('/test')
    restore()
    expect(logs.length).toBe(1)
    const log = logs[0]
    expect(log).toMatch(/^UNKNOWN UNKNOWN 200 \d+ms$/)
  })
})
