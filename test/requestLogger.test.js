// test/requestLogger.test.js
/**
 * Unit tests for the requestIdAndLogger middleware.
 * Uses Jest and SuperTest to simulate HTTP requests against an Express app.
 */
const express = require('express')
const request = require('supertest')
const requestIdAndLogger = require('../src/requestLogger')

describe('requestIdAndLogger middleware', () => {
  let app
  let consoleSpy

  beforeEach(() => {
    app = express()
    // attach middleware early so it wraps all routes
    app.use(requestIdAndLogger())
    // simple route that returns the request id for verification
    app.get('/ping', (req, res) => {
      res.json({ id: req.id })
    })
    // route that triggers an error response
    app.get('/error', (req, res) => {
      res.status(400).json({ error: 'bad request' })
    })
    // route that ends response early without calling next()
    app.get('/early', (req, res) => {
      res.send('early')
    })
    // capture console.log output for log verification
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  test('attaches a UUID v4 request ID to req.id and sets X-Request-Id header', async () => {
    const response = await request(app).get('/ping')
    expect(response.headers['x-request-id']).toBeDefined()
    // the body should contain the same id that the middleware generated
    expect(response.body.id).toBe(response.headers['x-request-id'])
    // basic UUID v4 format check (8-4-4-4-12 hex characters)
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    expect(uuidV4Regex.test(response.body.id)).toBe(true)
  })

  test('logs a JSON object with method, url, status, duration, and requestId for successful requests', async () => {
    const response = await request(app).get('/ping')
    // wait a tick to ensure on-finished callback executed
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(consoleSpy).toHaveBeenCalledTimes(1)
    const logged = JSON.parse(consoleSpy.mock.calls[0][0])
    expect(logged).toMatchObject({
      requestId: response.headers['x-request-id'],
      method: 'GET',
      url: '/ping',
      status: 200
    })
    expect(typeof logged.durationMs).toBe('number')
  })

  test('logs error responses and includes the request ID', async () => {
    const response = await request(app).get('/error')
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(consoleSpy).toHaveBeenCalledTimes(1)
    const logged = JSON.parse(consoleSpy.mock.calls[0][0])
    expect(logged).toMatchObject({
      requestId: response.headers['x-request-id'],
      method: 'GET',
      url: '/error',
      status: 400
    })
  })

  test('does not interfere with routes that send response early (no next())', async () => {
    const response = await request(app).get('/early')
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(response.text).toBe('early')
    expect(consoleSpy).toHaveBeenCalledTimes(1)
    const logged = JSON.parse(consoleSpy.mock.calls[0][0])
    expect(logged).toMatchObject({
      requestId: response.headers['x-request-id'],
      method: 'GET',
      url: '/early',
      status: 200
    })
  })
})
