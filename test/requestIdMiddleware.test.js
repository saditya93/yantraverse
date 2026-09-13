// test/requestIdMiddleware.test.js
const express = require('express')
const request = require('supertest')
const requestIdMiddleware = require('../src/requestIdMiddleware')

/**
 * Helper to capture console.log output
 */
function captureConsoleLog () {
  const originalLog = console.log
  const messages = []
  console.log = msg => messages.push(msg)
  return {
    restore: () => { console.log = originalLog },
    getMessages: () => messages
  }
}

describe('requestIdMiddleware', () => {
  let app
  beforeEach(() => {
    app = express()
    app.use(requestIdMiddleware)
    app.get('/test', (req, res) => {
      // ensure the request id is accessible in the handler
      res.json({ receivedId: req.id })
    })
  })

  test('assigns a UUIDv4 X-Request-Id header to every response', async () => {
    const response = await request(app).get('/test')
    const header = response.headers['x-request-id']
    expect(header).toBeDefined()
    // simple UUIDv4 regex validation
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    expect(uuidV4Regex.test(header)).toBe(true)
  })

  test('header value matches the id logged in the structured log entry', async () => {
    const consoleCapture = captureConsoleLog()
    const response = await request(app).get('/test')
    const header = response.headers['x-request-id']
    // wait for the response 'finish' event to trigger logging
    await new Promise(resolve => setTimeout(resolve, 10))
    consoleCapture.restore()
    const logs = consoleCapture.getMessages()
    expect(logs.length).toBe(1)
    const logObject = JSON.parse(logs[0])
    expect(logObject.requestId).toBe(header)
    expect(logObject.method).toBe('GET')
    expect(logObject.url).toBe('/test')
    expect(logObject.status).toBe(200)
  })

  test('propagates the request id through route handlers', async () => {
    const response = await request(app).get('/test')
    const header = response.headers['x-request-id']
    expect(response.body.receivedId).toBe(header)
  })

  test('generates a unique id per request', async () => {
    const first = await request(app).get('/test')
    const second = await request(app).get('/test')
    expect(first.headers['x-request-id']).not.toBe(second.headers['x-request-id'])
  })
})
