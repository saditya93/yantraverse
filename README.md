# yantraverse

> A lightweight, zero-dependency Node.js web framework. Fast routing, real middleware, static file serving — nothing more, nothing less.

[![npm version](https://img.shields.io/npm/v/yantraverse.svg)](https://npmjs.com/package/yantraverse)
[![license](https://img.shields.io/npm/l/yantraverse.svg)](./LICENSE)
[![node](https://img.shields.io/node/v/yantraverse.svg)](https://nodejs.org)

---

## Features

- **Zero dependencies** — pure Node.js `http` module, nothing else
- **~4kb gzipped** — load instantly, stay fast
- **Expressive routing** — named params, optional params, wildcards, route groups
- **Middleware pipeline** — global and per-route, composable
- **Body parsing** — JSON, URL-encoded forms, raw buffers out of the box
- **Static file serving** — ETag, Cache-Control, directory index, MIME types
- **Built-in middleware** — logger, CORS, rate limiter, helmet, timeout, gzip
- **TypeScript support** — full `.d.ts` declarations included
- **Enhanced req/res** — `res.json()`, `res.html()`, `res.redirect()`, `req.query`, `req.params`, `req.ip`

---

## Installation

```bash
npm install yantraverse
```

Requires Node.js ≥ 14.

---

## Quick start

```js
const yantraverse = require('yantraverse');
const { logger, cors } = require('yantraverse');

const app = yantraverse();

app.use(logger());
app.use(cors());

app.get('/', (req, res) => {
  res.json({ message: 'hello, yantraverse' });
});

app.listen(3000);
// → [yantraverse] listening on http://localhost:3000
```

---

## Routing

### Basic routes

```js
app.get('/users', (req, res) => { ... });
app.post('/users', (req, res) => { ... });
app.put('/users/:id', (req, res) => { ... });
app.patch('/users/:id', (req, res) => { ... });
app.delete('/users/:id', (req, res) => { ... });
```

### Route params

```js
app.get('/users/:id', (req, res) => {
  res.json({ userId: req.params.id });
});

// /users/42 → { userId: '42' }
```

### Multiple params

```js
app.get('/users/:uid/posts/:pid', (req, res) => {
  const { uid, pid } = req.params;
  res.json({ uid, pid });
});
```

### Wildcard params (greedy)

```js
app.get('/files/:name*', (req, res) => {
  res.json({ file: req.params.name }); // captures /files/a/b/c → 'a/b/c'
});
```

### Query strings

```js
app.get('/search', (req, res) => {
  const { q, page = 1 } = req.query;
  res.json({ q, page });
});
// GET /search?q=hello&page=2
```

### Route groups (prefix)

```js
app.group('/api/v1', (r) => {
  r.get('/users', listUsers);
  r.post('/users', createUser);
  r.get('/users/:id', getUser);
});
```

---

## Middleware

### Global middleware

```js
app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});
```

### Per-route middleware

```js
function auth(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.json({ error: 'Unauthorized' }, 401);
  next();
}

app.get('/admin', auth, (req, res) => {
  res.json({ secret: true });
});
```

### Chaining multiple handlers

```js
app.post('/items', validate, auth, createItem);
```

---

## Built-in middleware

### logger

Colorized request logs with method, path, status code, and response time.

```js
const { logger } = require('yantraverse');

app.use(logger());

// options:
app.use(logger({
  skip: (req) => req.path === '/health', // skip health checks
}));
```

### cors

```js
const { cors } = require('yantraverse');

app.use(cors());                          // allow all origins
app.use(cors({ origins: 'https://myapp.com' }));
app.use(cors({ origins: ['https://a.com', 'https://b.com'], credentials: true }));
```

Options:

| Option | Default | Description |
|---|---|---|
| `origins` | `'*'` | Allowed origin(s) |
| `methods` | `'GET,HEAD,PUT,PATCH,POST,DELETE'` | Allowed methods |
| `headers` | `'Content-Type,Authorization'` | Allowed headers |
| `credentials` | `false` | Allow credentials |
| `maxAge` | `86400` | Preflight cache (seconds) |

### rateLimit

```js
const { rateLimit } = require('yantraverse');

app.use(rateLimit({
  windowMs: 60_000,   // 1 minute window
  max: 100,           // max 100 requests per window per IP
  message: 'Slow down!',
}));
```

Returns `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers. Custom key function:

```js
app.use(rateLimit({
  keyBy: (req) => req.headers['x-api-key'] || req.ip,
}));
```

### helmet

Sets security-relevant HTTP headers.

```js
const { helmet } = require('yantraverse');

app.use(helmet());
// sets: Content-Security-Policy, X-Content-Type-Options,
//       X-Frame-Options, Referrer-Policy, Strict-Transport-Security
```

### timeout

```js
const { timeout } = require('yantraverse');

app.use(timeout(5000)); // 5s timeout → 408 Request Timeout
```

### compress

Gzip compression for responses.

```js
const { compress } = require('yantraverse');

app.use(compress());
```

---

## Static files

```js
app.static('./public');         // serves public/ at /
app.static('./assets', '/s');   // serves assets/ at /s/...
```

Supports: ETag caching, `If-None-Match` (304 responses), `Cache-Control`, directory index (`index.html`), 40+ MIME types.

---

## res methods

```js
res.json({ data: 1 });           // 200 application/json
res.json({ error: 'bad' }, 400); // 400 application/json
res.html('<h1>Hi</h1>');         // 200 text/html
res.send('ok', 200);             // 200 text/plain
res.redirect('/login');          // 302
res.redirect('/login', 301);     // 301
res.cookie('token', 'abc', { httpOnly: true, maxAge: 3600 });
res.clearCookie('token');
```

---

## req properties

```js
req.params   // { id: '42' }          — named route params
req.query    // { page: '2' }         — parsed query string
req.body     // { name: 'Alice' }     — parsed request body
req.ip       // '1.2.3.4'             — client IP (x-forwarded-for aware)
req.path     // '/users/42'           — path without query string
```

---

## Error handling

```js
// global error handler
app.onError((err, req, res) => {
  console.error(err);
  res.json({ error: err.message }, 500);
});

// custom 404
app.notFound((req, res) => {
  res.json({ error: 'Not found', path: req.path }, 404);
});
```

---

## Full example

```js
const yantraverse = require('yantraverse');
const { logger, cors, rateLimit, helmet, timeout } = require('yantraverse');

const app = yantraverse();

app.use(helmet());
app.use(logger());
app.use(cors({ origins: 'https://myapp.com' }));
app.use(timeout(10_000));
app.use(rateLimit({ windowMs: 60_000, max: 60 }));

app.static('./public');

app.group('/api', (r) => {
  r.get('/health', (req, res) => res.json({ status: 'ok' }));

  r.post('/login', async (req, res) => {
    const { email, password } = req.body;
    // ... authenticate ...
    res.cookie('session', 'token', { httpOnly: true });
    res.json({ ok: true });
  });
});

app.notFound((req, res) => res.json({ error: 'not found' }, 404));
app.onError((err, req, res) => res.json({ error: err.message }, 500));

app.listen(3000);
```

---

## TypeScript

```ts
import yantraverse, { YanRequest, YanResponse, Middleware } from 'yantraverse';

const app = yantraverse();

const auth: Middleware = (req, res, next) => {
  if (!req.headers.authorization) return res.json({ error: 'Unauthorized' }, 401);
  next();
};

app.get('/me', auth, (req: YanRequest, res: YanResponse) => {
  res.json({ user: 'alice' });
});

app.listen(3000);
```

---

## License

MIT
