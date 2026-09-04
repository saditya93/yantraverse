// src/asyncWrapper.js
/**
 * Wraps an async route handler and forwards any error to Express's `next` function.
 * This eliminates the need for repetitive try/catch blocks in each handler.
 *
 * @param {function} handler - An async function with the signature (req, res, next)
 * @returns {function} Express compatible middleware that handles promise rejections
 */
function asyncWrapper (handler) {
  return function (req, res, next) {
    // Resolve the handler's return value (or thrown error) and forward rejections to `next`
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}

module.exports = asyncWrapper