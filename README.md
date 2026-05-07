<p align="center">
  <img src="./src/logo3.png" alt="Yantravese logo" width="180" />
</p>

<<<<<<< HEAD
<!-- STATS START -->
**Build**: 5/7/2026  
**Version**: 1.0.0  
**Commits**: 1  
**Last Updated**: 2026-05-07T09:11:09.896Z

**Performance**:
- 10000+ requests/sec
- <1ms avg latency
- 2.5MB memory usage

**Quality**:
- > yantravese@1.0.0 coverage
> echo 'Coverage tool not configured yet'
Coverage tool not configured yet test coverage
- 0 dependencies
- <50KB bundle size
<!-- STATS END -->


[![npm version](https://img.shields.io/npm/v/yantravese.svg)](https://www.npmjs.com/package/yantravese)
[![npm downloads](https://img.shields.io/npm/dm/yantravese.svg)](https://www.npmjs.com/package/yantravese)
[![license](https://img.shields.io/npm/l/yantravese.svg)](./LICENSE)
[![node](https://img.shields.io/node/v/yantravese.svg)](https://nodejs.org)
=======
<h1 align="center">Yantravese</h1>
>>>>>>> 230d56e (Update agent 3 logic)

<p align="center">
  A small, zero-dependency Node.js web framework for fast HTTP APIs, clean routing, middleware, JSON responses, and static files.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/yantravese"><img src="https://img.shields.io/npm/v/yantravese.svg" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/yantravese"><img src="https://img.shields.io/npm/dm/yantravese.svg" alt="npm downloads" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/npm/l/yantravese.svg" alt="license" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/node/v/yantravese.svg" alt="node version" /></a>
</p>

## Why Yantravese?

Yantravese gives you an Express-like developer experience while staying close to Node's native `http` module. It is intentionally lightweight, easy to read, and ready for practical API projects without pulling in a dependency tree.

- Zero runtime dependencies
- Familiar `app.get()`, `app.post()`, `app.put()`, `app.delete()`, and `app.use()` APIs
- Route parameters such as `/users/:id`
- Query string and JSON body parsing
- Built-in middleware for CORS, security headers, rate limiting, logging, and timeouts
- Static file serving
- Custom not-found and error handlers
- TypeScript declarations included
- CommonJS support

## Installation

```bash
npm install yantravese
```

## Quick Start

Create `server.js`:

```js
const yantravese = require('yantravese');

const app = yantravese();

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Yantravese' });
});

app.get('/users/:id', (req, res) => {
  res.json({
    id: req.params.id,
    query: req.query
  });
});

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
```

Run it:

```bash
node server.js
```

## Middleware

Register global middleware with `app.use()`.

```js
const yantravese = require('yantravese');
const { logger, cors, helmet, rateLimit, timeout } = require('yantravese');

const app = yantravese();

app.use(helmet());
app.use(logger());
app.use(cors({ origins: '*' }));
app.use(timeout(10000));
app.use(rateLimit({ windowMs: 60_000, max: 100 }));

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.listen(3000);
```

| Middleware | Purpose |
| --- | --- |
| `logger()` | Logs incoming requests |
| `cors(options)` | Adds CORS headers |
| `helmet()` | Adds common security headers |
| `rateLimit(options)` | Limits repeated requests |
| `timeout(ms)` | Applies a request timeout |

## Routing

Yantravese includes helpers for common HTTP methods.

```js
app.get('/posts', listPosts);
app.post('/posts', createPost);
app.put('/posts/:id', updatePost);
app.delete('/posts/:id', deletePost);
```

Route parameters are available on `req.params`.

```js
app.get('/teams/:teamId/members/:memberId', (req, res) => {
  res.json({
    teamId: req.params.teamId,
    memberId: req.params.memberId
  });
});
```

Query parameters are available on `req.query`.

```js
app.get('/search', (req, res) => {
  res.json({
    q: req.query.q,
    page: req.query.page || '1'
  });
});
```

## Route Groups

Use `group()` to organize routes under a shared prefix.

```js
app.group('/api/v1', (api) => {
  api.get('/status', (req, res) => {
    res.json({ status: 'ok' });
  });

  api.get('/users/:id', (req, res) => {
    res.json({ id: req.params.id });
  });
});
```

## Static Files

Serve a directory from a URL prefix.

```js
const path = require('path');

app.static(path.join(__dirname, 'public'), '/');
app.static(path.join(__dirname, 'assets'), '/assets');
```

## Responses

Yantravese adds convenience response methods.

```js
res.json({ ok: true });
res.json({ created: true }, 201);
res.html('<h1>Hello</h1>');
res.redirect('/login');
res.writeHead(204);
res.end();
```

## Error Handling

Provide custom not-found and error handlers when needed.

```js
app.notFound((req, res) => {
  res.json({ error: 'Route not found' }, 404);
});

app.onError((err, req, res) => {
  res.json({ error: err.message }, 500);
});
```

## TypeScript

Type declarations are included with the package.

```ts
import yantravese from 'yantravese';

const app = yantravese();

app.get('/ping', (req, res) => {
  res.json({ pong: true });
});
```

## Example

This repository includes a runnable example:

```bash
npm run example
```

Then open:

```text
http://localhost:3000
```

## Scripts

```bash
npm test          # Run the test suite
npm run example   # Start the example server
npm run coverage  # Coverage placeholder
npm run benchmark # Benchmark placeholder
```

## API Reference

### `yantravese()`

Creates a new application instance.

```js
const yantravese = require('yantravese');
const app = yantravese();
```

### `app.use(middleware)`

Registers global middleware.

### `app.get(pattern, handler)`

Registers a `GET` route.

### `app.post(pattern, handler)`

Registers a `POST` route.

### `app.put(pattern, handler)`

Registers a `PUT` route.

### `app.delete(pattern, handler)`

Registers a `DELETE` route.

### `app.group(prefix, callback)`

Creates a grouped route scope.

### `app.static(directory, prefix)`

Serves static files from a directory.

### `app.notFound(handler)`

Registers a custom 404 handler.

### `app.onError(handler)`

Registers a custom error handler.

### `app.listen(port, callback)`

Starts the HTTP server.

## Repository

- npm: [yantravese](https://www.npmjs.com/package/yantravese)
- GitHub: [Repository](https://github.com/saditya93/yantraverse)
- Issues: [GitHub Issues](https://github.com/saditya93/yantraverse/issues)

## License

MIT. See [LICENSE](./LICENSE) for details.
