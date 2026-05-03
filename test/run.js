'use strict';

const http = require('http');
const assert = require('assert');
const yantraverse = require('../index');
const { cors, helmet } = require('../index');

let passed = 0;
let failed = 0;
let server;
let PORT;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}: ${e.message}`);
    failed++;
  }
}

// Let OS assign port — no race condition possible
function startServer(app) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server did not start within 5s')), 5000);

    // Listen on port 0 = OS picks a free port automatically
    const srv = app.listen(0);

    srv.once('listening', () => {
      clearTimeout(timer);
      PORT = srv.address().port;
      resolve(srv);
    });

    srv.once('error', e => {
      clearTimeout(timer);
      reject(new Error(`Server error: ${e.message}`));
    });
  });
}

function request(method, path, opts = {}) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout on ${method} ${path} — server not responding`)),
      5000
    );

    const req = http.request({
      hostname: '127.0.0.1',
      port: PORT,
      method,
      path,
      headers: opts.headers || {},
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        clearTimeout(timer);
        let json;
        try { json = JSON.parse(body); } catch { json = body; }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', e => {
      clearTimeout(timer);
      reject(new Error(`Request failed: ${e.message}`));
    });

    if (opts.body) req.write(JSON.stringify(opts.body));
    req.end();
  });
}

async function runTests() {
  console.log('\n  yantraverse test suite\n');

  // ── Unit tests — no server needed ─────────────────────────────────────
  const { matchRoute } = require('../src/router');

  test('exact route matches', () => {
    assert.deepStrictEqual(matchRoute('/hello', '/hello'), {});
  });
  test('named param matches', () => {
    assert.deepStrictEqual(matchRoute('/users/:id', '/users/42'), { id: '42' });
  });
  test('multiple params', () => {
    assert.deepStrictEqual(
      matchRoute('/users/:uid/posts/:pid', '/users/1/posts/99'),
      { uid: '1', pid: '99' }
    );
  });
  test('no match returns null', () => {
    assert.strictEqual(matchRoute('/users/:id', '/other/42'), null);
  });
  test('wildcard param', () => {
    const p = matchRoute('/files/:name*', '/files/a/b/c');
    assert.ok(p && p.name === 'a/b/c');
  });

  console.log('');

  // ── Build app ──────────────────────────────────────────────────────────
  const app = yantraverse();
  app.use(helmet());
  app.use(cors());

  app.get('/',          (req, res) => res.json({ ok: true }));
  app.get('/echo',      (req, res) => res.json({ q: req.query }));
  app.get('/users/:id', (req, res) => res.json({ id: req.params.id }));
  app.get('/redirect',  (req, res) => res.redirect('/'));
  app.post('/data',     (req, res) => res.json({ received: req.body }, 201));
  app.notFound(         (req, res) => res.json({ error: 'not found' }, 404));

  // ── Start — OS assigns port, zero race condition ────────────────────────
  try {
    server = await startServer(app);
    console.log(`  Server on port ${PORT} — running HTTP tests\n`);
  } catch (e) {
    console.error(`  ✗ ${e.message}`);
    process.exit(1);
  }

  // ── HTTP tests ─────────────────────────────────────────────────────────
  const r1 = await request('GET', '/');
  test('GET / returns 200', () => {
    assert.strictEqual(r1.status, 200);
    assert.strictEqual(r1.body.ok, true);
  });

  const r2 = await request('GET', '/users/99');
  test('route param :id extracted', () => {
    assert.strictEqual(r2.body.id, '99');
  });

  const r3 = await request('GET', '/echo?foo=bar&n=42');
  test('query string parsed', () => {
    assert.strictEqual(r3.body.q.foo, 'bar');
    assert.strictEqual(r3.body.q.n, '42');
  });

  const r4 = await request('POST', '/data', {
    headers: { 'Content-Type': 'application/json' },
    body: { hello: 'world' },
  });
  test('POST body parsed as JSON', () => {
    assert.strictEqual(r4.status, 201);
    assert.strictEqual(r4.body.received.hello, 'world');
  });

  const r5 = await request('GET', '/notexist');
  test('custom 404 handler fires', () => {
    assert.strictEqual(r5.status, 404);
    assert.ok(r5.body.error);
  });

  const r6 = await request('GET', '/');
  test('helmet sets X-Frame-Options', () => {
    assert.ok(r6.headers['x-frame-options']);
  });

  const r7 = await request('OPTIONS', '/');
  test('CORS preflight returns 204', () => {
    assert.strictEqual(r7.status, 204);
  });

  const r8 = await request('GET', '/redirect');
  test('redirect sends 302', () => {
    assert.strictEqual(r8.status, 302);
  });

  console.log(`\n  ${passed} passed, ${failed} failed\n`);
  server.close();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => {
  console.error('\n  Fatal:', e.message, '\n');
  if (server) server.close();
  process.exit(1);
});