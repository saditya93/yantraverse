'use strict';

// JSON + form body parsing middleware

function bodyParser() {
  return (req, res, next) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        req.body = JSON.parse(body);
      } catch {
        req.body = body;
      }
      next();
    });
  };
}

module.exports = { bodyParser };
