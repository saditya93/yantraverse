// test/bodyParser.test.js
const http = require('http')
const supertest = require('supertest')
const bodyParser = require('../src/bodyParser')

/**
 * Helper to create a server that uses the bodyParser middleware
 * and echoes back the parsed body.
 */
function createServer () {
  const middleware = bodyParser()
  const server = http.createServer((req, res) => {
    middleware(req, res, () => {
      res.setHeader('Content-Type', 'application/json')
      const response = { body: req.body || {} }
      res.end(JSON.stringify(response))
    })
  })
  return server
}

describe('bodyParser middleware', () => {
  let request
  beforeAll(() => {
    const server = createServer()
    request = supertest(server)
  })

  test('parses valid JSON payload', async () => {
    const payload = { name: 'Alice', age: 30 }
    const response = await request
      .post('/')
      .set('Content-Type', 'application/json')
      .send(payload)
    expect(response.status).toBe(200)
    expect(response.body.body).toEqual(payload)
  })

  test('parses valid URL‑encoded payload', async () => {
    const payload = 'city=Paris&country=France'
    const response = await request
      .post('/')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send(payload)
    expect(response.status).toBe(200)
    expect(response.body.body).toEqual({ city: 'Paris', country: 'France' })
  })

  test('returns 400 for malformed JSON', async () => {
    const malformed = '{ "invalid": true,'
    const response = await request
      .post('/')
      .set('Content-Type', 'application/json')
      .send(malformed)
    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty('error', 'Invalid JSON payload')
  })
})