// src/bodyParser.js
/**
 * Middleware to parse request bodies for JSON and URL‑encoded data.
 * Attaches the parsed object to `req.body`.
 * On malformed JSON, responds with 400 and an error message.
 *
 * @returns {function(req, res, next)} Express‑style middleware
 */
function bodyParser () {
  const querystring = require('querystring')
  return function (req, res, next) {
    const contentType = req.headers['content-type'] || ''
    const isJSON = contentType.includes('application/json')
    const isUrlEncoded = contentType.includes('application/x-www-form-urlencoded')
    if (!isJSON && !isUrlEncoded) {
      // Not a supported type, skip parsing
      return next()
    }

    let rawData = ''
    req.on('data', chunk => {
      rawData += chunk
    })
    req.on('end', () => {
      if (!rawData) {
        req.body = {}
        return next()
      }
      try {
        if (isJSON) {
          req.body = JSON.parse(rawData)
        } else {
          req.body = querystring.parse(rawData)
        }
        next()
      } catch (err) {
        res.statusCode = 400
        res.setHeader('Content-Type', 'application/json')
        const message = isJSON ? 'Invalid JSON payload' : 'Invalid URL‑encoded payload'
        const payload = JSON.stringify({ error: message })
        res.end(payload)
      }
    })
    req.on('error', err => {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Error reading request body' }))
    })
  }
}

module.exports = bodyParser