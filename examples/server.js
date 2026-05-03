'use strict';

const yantraverse = require('../index');
const { logger, cors, rateLimit, helmet, timeout } = require('../index');

const app = yantraverse();

// ── Global middleware ──────────────────────────────────────────────────────
app.use(helmet());
app.use(logger());
app.use(cors({ origins: '*' }));
app.use(timeout(10000));
app.use(rateLimit({ windowMs: 60_000, max: 100 }));

// ── Static files ───────────────────────────────────────────────────────────
// app.static('./public', '/');

// ── Basic routes ───────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to yantraverse!', version: '1.0.0' });
});

// ── Route params + query ───────────────────────────────────────────────────
app.get('/users/:id', (req, res) => {
  res.json({ userId: req.params.id, query: req.query });
});

// ── POST with body ─────────────────────────────────────────────────────────
app.post('/users', (req, res) => {
  const { name, email } = req.body || {};
  if (!name || !email) {
    return res.json({ error: 'name and email required' }, 400);
  }
  res.json({ id: Date.now(), name, email }, 201);
});

// ── Route groups ───────────────────────────────────────────────────────────
app.group('/api/v1', (r) => {
  r.get('/health', (req, res) => res.json({ status: 'ok' }));
  r.get('/items', (req, res) => res.json({ items: [] }));
  r.post('/items', (req, res) => res.json({ created: req.body }, 201));
});

// ── Auth middleware example ────────────────────────────────────────────────
function auth(req, res, next) {
  const token = req.headers['authorization'];
  if (!token || !token.startsWith('Bearer ')) {
    return res.json({ error: 'Unauthorized' }, 401);
  }
  req.user = { id: 'user_123' }; // decode token here in real app
  next();
}

app.get('/protected', auth, (req, res) => {
  res.json({ message: 'Secret data', user: req.user });
});

// ── Wildcard / catch-all ───────────────────────────────────────────────────
app.get('/files/:filename*', (req, res) => {
  res.json({ file: req.params.filename });
});

// ── Custom 404 & error handler ─────────────────────────────────────────────
app.notFound((req, res) => {
  res.json({ error: 'Route not found', path: req.path }, 404);
});

app.onError((err, req, res) => {
  console.error(err);
  res.json({ error: err.message }, 500);
});

// ── Start ──────────────────────────────────────────────────────────────────
app.listen(3000, (port) => {
  console.log(`\n  yantraverse running → http://localhost:${port}\n`);
});
