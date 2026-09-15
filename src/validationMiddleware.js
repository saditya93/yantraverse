// src/validationMiddleware.js
/**
 * Simple request validation middleware for Express.
 * Supports validation of request body, query and params against a lightweight schema.
 * The schema format is:
 * {
 *   body: { fieldName: { type: 'string'|'number'|'boolean', required: true|false } },
 *   query: { ... },
 *   params: { ... }
 * }
 *
 * Each field definition may include:
 *   - type: expected JavaScript primitive type (string, number, boolean)
 *   - required: whether the field must be present (default false)
 *   - validator: optional custom function (value) => string|null returning error message or null
 *
 * The middleware returns a 400 response with a JSON payload describing all validation errors.
 *
 * @param {Object} schema Validation schema
 * @returns {Function} Express middleware function
 */
function validateRequest (schema = {}) {
  const locations = ['body', 'query', 'params']

  return function (req, res, next) {
    const errors = []

    locations.forEach(loc => {
      if (!schema[loc]) return
      const definition = schema[loc]
      const source = req[loc] || {}

      Object.keys(definition).forEach(field => {
        const rules = definition[field]
        const value = source[field]
        const hasValue = Object.prototype.hasOwnProperty.call(source, field)

        if (rules.required && !hasValue) {
          errors.push({ location: loc, field, message: 'required' })
          return
        }

        if (!hasValue) return // skip further checks for optional missing fields

        if (rules.type && typeof value !== rules.type) {
          errors.push({ location: loc, field, message: `expected ${rules.type}` })
          return
        }

        if (typeof rules.validator === 'function') {
          const customMsg = rules.validator(value)
          if (typeof customMsg === 'string' && customMsg) {
            errors.push({ location: loc, field, message: customMsg })
          }
        }
      })
    })

    if (errors.length) {
      res.status(400).json({ errors })
    } else {
      next()
    }
  }
}

module.exports = { validateRequest }
