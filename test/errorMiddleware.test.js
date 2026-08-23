// test/errorMiddleware.test.js
const request = require('supertest')
const express = require('express')
const { HttpError, errorHandler } = require('../src/errorMiddleware')

/**
 * Helper to create an Express app with a route that throws the supplied error.
 * @param {Error} errToThrow - Error that the route will throw.
 * @returns {import('express').Application}
 */
function createApp (errToThrow) {
  const app = express()
  // route that always throws
  app.get('/test', (req, res, next) => {
    throw errToThrow
  })
  // error handling middleware must be after routes
  app.use(errorHandler)
  return app
}

describe('Unified error handling middleware', () => {
  const originalEnv = process.env.NODE_ENV

  afterAll(() => {
    process.env.NODE_ENV = originalEnv
  })

  test('HttpError with status 404 returns correct JSON and status', async () => {
    const app = createApp(new HttpError(404, 'Not Found'))
    const response = await request(app).get('/test')
    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: { status: 404, message: 'Not Found' } })
  })

  test('generic Error results in 500 with generic message in production', async () => {
    process.env.NODE_ENV = 'production'
    const app = createApp(new Error('Something went wrong'))
    const response = await request(app).get('/test')
    expect(response.status).toBe(500)
    expect(response.body).toEqual({ error: { status: 500, message: 'Internal Server Error' } })
    // Ensure stack trace is not leaked
    expect(response.body.error).not.toHaveProperty('stack')
  })

  test('generic Error returns actual message when not in production', async () => {
    process.env.NODE_ENV = 'development'
    const app = createApp(new Error('Bad things'))
    const response = await request(app).get('/test')
    expect(response.status).toBe(500)
    expect(response.body).toEqual({ error: { status: 500, message: 'Bad things' } })
  })
})
