'use strict';

// Middleware index - logger, cors, rateLimit, helmet, timeout

function logger() {
  return (req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  };
}

function cors(opts = {}) {
  return (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', opts.origins || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': opts.origins || '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      });
      res.end();
      return; // Don't call next
    }

    next();
  };
}

function rateLimit(opts = {}) {
  return (req, res, next) => {
    next();
  };
}

function helmet() {
  return (req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    next();
  };
}

function timeout(ms) {
  return (req, res, next) => {
    next();
  };
}

module.exports = { logger, cors, rateLimit, helmet, timeout };
