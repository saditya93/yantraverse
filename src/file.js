// src/file.js
/**
 * Validation middleware factory using AJV.
 * Generates an Express middleware that validates the request body against a JSON schema.
 * If validation fails, a 400 response with a detailed error object is sent.
 *
 * @param {object} schema - JSON schema definition for the request body.
 * @param {object} [options] - AJV options (e.g., allErrors, strict).
 * @returns {function} Express middleware (req, res, next).
 */
import Ajv from "ajv"

const defaultAjvOptions = {
  allErrors: true,
  strict: false
}

export function createValidator (schema, options = {}) {
  if (!schema || typeof schema !== "object") {
    throw new Error("A valid JSON schema object must be provided")
  }
  const ajv = new Ajv({ ...defaultAjvOptions, ...options })
  const validate = ajv.compile(schema)

  return function validationMiddleware (req, res, next) {
    // Expect body parser to have populated req.body
    if (req.body === undefined) {
      return res.status(400).json({
        error: "Request body is missing",
        details: []
      })
    }
    const valid = validate(req.body)
    if (valid) {
      return next()
    }
    const formatted = (validate.errors || []).map(err => {
      const path = err.instancePath ? err.instancePath : ""
      return {
        message: err.message,
        path: path
      }
    })
    return res.status(400).json({
      error: "Invalid request payload",
      details: formatted
    })
  }
}

/**
 * Convenience wrapper that caches compiled validators per schema.
 * Use this when the same schema is applied to many routes.
 *
 * @param {object} schema - JSON schema for the request body.
 * @param {object} [options] - AJV options.
 * @returns {function} Express middleware.
 */
export const validationMiddleware = (() => {
  const cache = new Map()
  return function (schema, options) {
    const key = JSON.stringify({ schema, options })
    if (cache.has(key)) {
      return cache.get(key)
    }
    const middleware = createValidator(schema, options)
    cache.set(key, middleware)
    return middleware
  }
})()
