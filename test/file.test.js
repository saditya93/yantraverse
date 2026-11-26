// test/file.test.js
/**
 * Unit tests for the validation middleware.
 * Uses Jest and SuperTest to simulate HTTP requests.
 */
import request from "supertest"
import express from "express"
import bodyParser from "body-parser"
import { validationMiddleware } from "../src/file.js"

// Helper to build an Express app with a single route
function buildApp (schema, handler) {
  const app = express()
  app.use(bodyParser.json())
  app.post(
    "/test",
    validationMiddleware(schema, { allErrors: true, strict: false }),
    handler
  )
  // error fallback – should never be hit because middleware handles errors
  app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message })
  })
  return app
}

describe("validationMiddleware", () => {
  const userSchema = {
    type: "object",
    properties: {
      name: { type: "string" },
      age: { type: "integer", minimum: 0 }
    },
    required: ["name", "age"],
    additionalProperties: false
  }

  test("valid JSON payload passes through and reaches handler", async () => {
    const handler = jest.fn((req, res) => res.status(200).json({ success: true }))
    const app = buildApp(userSchema, handler)
    const response = await request(app)
      .post("/test")
      .send({ name: "Alice", age: 30 })
      .expect(200)

    expect(response.body).toEqual({ success: true })
    expect(handler).toHaveBeenCalled()
  })

  test("invalid JSON payload returns 400 with detailed error message", async () => {
    const handler = jest.fn((req, res) => res.status(200).json({}))
    const app = buildApp(userSchema, handler)
    const response = await request(app)
      .post("/test")
      .send({ name: 123, age: -5 })
      .expect(400)

    expect(response.body.error).toBe("Invalid request payload")
    expect(Array.isArray(response.body.details)).toBe(true)
    expect(response.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "/name", message: expect.any(String) }),
        expect.objectContaining({ path: "/age", message: expect.any(String) })
      ])
    )
    expect(handler).not.toHaveBeenCalled()
  })

  test("missing required field triggers validation error", async () => {
    const handler = jest.fn()
    const app = buildApp(userSchema, handler)
    const response = await request(app)
      .post("/test")
      .send({ name: "Bob" })
      .expect(400)

    expect(response.body.error).toBe("Invalid request payload")
    const missingAge = response.body.details.find(d => d.path === "" && d.message.includes("age"))
    expect(missingAge).toBeDefined()
    expect(handler).not.toHaveBeenCalled()
  })

  test("extra unknown fields are flagged when additionalProperties is false", async () => {
    const handler = jest.fn()
    const app = buildApp(userSchema, handler)
    const response = await request(app)
      .post("/test")
      .send({ name: "Eve", age: 25, role: "admin" })
      .expect(400)

    const extraFieldError = response.body.details.find(d => d.message.includes("additional property"))
    expect(extraFieldError).toBeDefined()
    expect(handler).not.toHaveBeenCalled()
  })
})
