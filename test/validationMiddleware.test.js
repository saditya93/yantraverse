// test/validationMiddleware.test.js
const express = require('express')
const request = require('supertest')
const { validateRequest } = require('../src/validationMiddleware')

/**
 * Helper to create an Express app with the supplied middleware and a test handler.
 * @param {Function} middleware
 * @returns {Express.Application}
 */
function createApp (middleware) {
  const app = express()
  app.use(express.json())
  app.use(middleware)
  app.post('/test/:id', (req, res) => {
    res.json({ success: true, received: req.body })
  })
  return app
}

describe('validateRequest middleware', () => {
  test('passes valid request through to handler', async () => {
    const schema = {
      body: {
        name: { type: 'string', required: true },
        age: { type: 'number' }
      },
      params: {
        id: { type: 'string', required: true }
      }
    }
    const app = createApp(validateRequest(schema))
    await request(app)
      .post('/test/123')
      .send({ name: 'Alice', age: 30 })
      .expect(200)
      .expect(res => {
        if (!res.body.success) throw new Error('handler not reached')
        if (res.body.received.name !== 'Alice') throw new Error('incorrect body')
      })
  })

  test('returns 400 with error details for invalid body', async () => {
    const schema = {
      body: {
        email: { type: 'string', required: true, validator: v => /@/.test(v) ? null : 'invalid email' },
        count: { type: 'number', required: true }
      }
    }
    const app = createApp(validateRequest(schema))
    await request(app)
      .post('/test/abc')
      .send({ email: 'not-an-email', count: 'ten' })
      .expect(400)
      .expect(res => {
        const errors = res.body.errors
        if (!Array.isArray(errors)) throw new Error('errors not array')
        const emailError = errors.find(e => e.field === 'email')
        const countError = errors.find(e => e.field === 'count')
        if (!emailError || emailError.message !== 'invalid email') throw new Error('email error missing')
        if (!countError || countError.message !== 'expected number') throw new Error('count error missing')
      })
  })

  test('ignores optional fields when missing', async () => {
    const schema = {
      body: {
        optionalField: { type: 'string' }
      }
    }
    const app = createApp(validateRequest(schema))
    await request(app)
      .post('/test/xyz')
      .send({})
      .expect(200)
  })
})
