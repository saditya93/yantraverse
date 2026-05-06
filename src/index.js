'use strict';

const http = require('http');
const url = require('url');
const querystring = require('querystring');
const { matchRoute } = require('./router');
const { serveStatic } = require('./static');
const { logger, cors, rateLimit, helmet, timeout } = require('./middleware');

module.exports = yantraverse;
module.exports.logger = logger;
module.exports.cors = cors;
module.exports.rateLimit = rateLimit;
module.exports.helmet = helmet;
module.exports.timeout = timeout;

function yantraverse() {
  const routes = [];
  const middlewares = [];

  const app = {
    use(fn) {
      middlewares.push(fn);
      return app;
    },
    get(pattern, handler) {
      routes.push({ method: 'GET', pattern, handler });
      return app;
    },
    post(pattern, handler) {
      routes.push({ method: 'POST', pattern, handler });
      return app;
    },
    put(pattern, handler) {
      routes.push({ method: 'PUT', pattern, handler });
      return app;
    },
    delete(pattern, handler) {
      routes.push({ method: 'DELETE', pattern, handler });
      return app;
    },
    group(prefix, fn) {
      const groupApp = yantraverse();
      fn(groupApp);
      return app;
    },
    static(dir, prefix = '/') {
      middlewares.push((req, res, next) => {
        if (serveStatic(req, res, req.path, dir, prefix)) return;
        next();
      });
      return app;
    },
    notFound(handler) {
      app._notFound = handler;
      return app;
    },
    onError(handler) {
      app._onError = handler;
      return app;
    },
    listen(port, callback) {
      const server = http.createServer(async (req, res) => {
        try {
          const parsedUrl = url.parse(req.url, true);
          const pathname = parsedUrl.pathname;
          const query = parsedUrl.query;

          // Parse request body
          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });

          req.on('end', async () => {
            try {
              // Add properties to req
              req.path = pathname;
              req.query = query;
              req.params = {};

              // Try to parse body as JSON
              if (body) {
                try {
                  req.body = JSON.parse(body);
                } catch {
                  req.body = body;
                }
              } else {
                req.body = null;
              }

              // Add res methods
              let responseSent = false;

              res.json = (data, status = 200) => {
                if (responseSent) return;
                responseSent = true;
                res.writeHead(status, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(data));
              };

              res.html = (html, status = 200) => {
                if (responseSent) return;
                responseSent = true;
                res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(html);
              };

              res.redirect = (location, status = 302) => {
                if (responseSent) return;
                responseSent = true;
                res.writeHead(status, { 'Location': location });
                res.end();
              };

              // Track if response was sent
              const originalWriteHead = res.writeHead;
              res.writeHead = function(...args) {
                responseSent = true;
                return originalWriteHead.apply(res, args);
              };

              // Middleware pipeline
              let middlewareIndex = 0;

              const runMiddleware = () => {
                if (responseSent) return; // Response already sent by middleware
                
                if (middlewareIndex < middlewares.length) {
                  const middleware = middlewares[middlewareIndex++];
                  middleware(req, res, runMiddleware);
                } else {
                  routeRequest();
                }
              };

              const routeRequest = () => {
                if (responseSent) return; // Response already sent
                
                // Find matching route
                for (const route of routes) {
                  if (route.method !== req.method) continue;

                  const params = matchRoute(route.pattern, pathname);
                  if (params !== null) {
                    req.params = params;
                    return route.handler(req, res);
                  }
                }

                // No route found - call notFound handler
                if (app._notFound) {
                  app._notFound(req, res);
                } else {
                  res.json({ error: 'Not Found' }, 404);
                }
              };

              runMiddleware();
            } catch (err) {
              if (app._onError) {
                app._onError(err, req, res);
              } else {
                res.json({ error: err.message }, 500);
              }
            }
          });
        } catch (err) {
          if (app._onError) {
            app._onError(err, req, res);
          } else {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal Server Error' }));
          }
        }
      });

      if (callback) {
        server.listen(port, () => {
          const actualPort = server.address().port;
          callback(actualPort);
        });
      } else {
        server.listen(port);
      }

      return server;
    }
  };

  return app;
}
