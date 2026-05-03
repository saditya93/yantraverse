'use strict';

const yantraverse = require('./src/index');
const middleware = require('./src/middleware/index');

module.exports = yantraverse;
module.exports.yantraverse = yantraverse;
module.exports.middleware = middleware;

// named exports for destructuring
module.exports.logger = middleware.logger;
module.exports.cors = middleware.cors;
module.exports.rateLimit = middleware.rateLimit;
module.exports.helmet = middleware.helmet;
module.exports.timeout = middleware.timeout;
module.exports.compress = middleware.compress;
