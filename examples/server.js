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
  res.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>yantraverse</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: #ffffff;
          color: #000000;
          line-height: 1.6;
          overflow-x: hidden;
        }

        /* Smooth scroll */
        html {
          scroll-behavior: smooth;
        }

        /* Hero Section - Centered */
        .hero {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 2rem;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        /* Animated background gradient */
        .hero::before {
          content: '';
          position: absolute;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(0,0,0,0.03) 0%, transparent 70%);
          border-radius: 50%;
          top: -200px;
          right: -200px;
          pointer-events: none;
        }

        .hero-content {
          position: relative;
          z-index: 2;
          max-width: 800px;
        }

        .logo {
          font-size: 3.5rem;
          font-weight: 700;
          letter-spacing: -1px;
          margin-bottom: 1.5rem;
          background: linear-gradient(135deg, #000 0%, #333 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .tagline {
          font-size: 1.25rem;
          color: #666;
          font-weight: 300;
          margin-bottom: 3rem;
          letter-spacing: -0.3px;
          line-height: 1.8;
        }

        .cta-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-bottom: 4rem;
          flex-wrap: wrap;
        }

        .btn {
          padding: 0.9rem 1.8rem;
          font-size: 0.95rem;
          font-weight: 500;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
          font-family: 'Inter', sans-serif;
          letter-spacing: -0.2px;
        }

        .btn-primary {
          background: #000;
          color: white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .btn-primary:hover {
          background: #1a1a1a;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
          transform: translateY(-1px);
        }

        .btn-secondary {
          background: transparent;
          color: #000;
          border: 1.5px solid #000;
        }

        .btn-secondary:hover {
          background: #000;
          color: white;
          transform: translateY(-1px);
        }

        /* Code Section */
        .code-section {
          background: #f8f8f8;
          padding: 6rem 2rem;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .code-container {
          max-width: 700px;
          width: 100%;
        }

        .code-title {
          font-size: 1.8rem;
          font-weight: 700;
          margin-bottom: 2rem;
          text-align: center;
          letter-spacing: -0.5px;
        }

        .code-block {
          background: #1a1a1a;
          color: #e8e8e8;
          padding: 2rem;
          border-radius: 12px;
          font-family: 'Courier New', 'Monaco', monospace;
          font-size: 0.85rem;
          line-height: 1.7;
          overflow-x: auto;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(0, 0, 0, 0.1);
        }

        .code-line {
          display: block;
          margin-bottom: 0.5rem;
        }

        .keyword { color: #ff79c6; }
        .string { color: #f1fa8c; }
        .function { color: #50fa7b; }
        .number { color: #bd93f9; }
        .comment { color: #6272a4; }
        .method { color: #8be9fd; }

        /* Features Grid - Minimal */
        .features {
          padding: 6rem 2rem;
          max-width: 1100px;
          margin: 0 auto;
        }

        .features-title {
          font-size: 2rem;
          font-weight: 700;
          text-align: center;
          margin-bottom: 4rem;
          letter-spacing: -0.5px;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 3rem;
        }

        .feature {
          text-align: center;
          padding: 1rem;
        }

        .feature-number {
          font-size: 2.5rem;
          font-weight: 700;
          color: #000;
          margin-bottom: 0.5rem;
        }

        .feature h3 {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 0.8rem;
          letter-spacing: -0.2px;
        }

        .feature p {
          color: #666;
          font-size: 0.9rem;
          line-height: 1.7;
        }

        /* Footer */
        footer {
          background: #000;
          color: white;
          padding: 3rem 2rem;
          text-align: center;
          border-top: 1px solid #333;
        }

        .footer-content {
          max-width: 1100px;
          margin: 0 auto;
        }

        .footer-links {
          display: flex;
          justify-content: center;
          gap: 2rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }

        .footer-links a {
          color: #999;
          text-decoration: none;
          font-size: 0.9rem;
          transition: color 0.3s;
        }

        .footer-links a:hover {
          color: white;
        }

        .footer-bottom {
          color: #666;
          font-size: 0.85rem;
          padding-top: 1.5rem;
          border-top: 1px solid #333;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .logo {
            font-size: 2.5rem;
          }

          .tagline {
            font-size: 1rem;
            margin-bottom: 2rem;
          }

          .cta-buttons {
            flex-direction: column;
            gap: 0.8rem;
          }

          .btn {
            width: 100%;
            justify-content: center;
          }

          .code-title {
            font-size: 1.3rem;
          }

          .code-block {
            font-size: 0.75rem;
            padding: 1.5rem;
          }

          .features-grid {
            grid-template-columns: 1fr;
            gap: 2rem;
          }
        }
      </style>
    </head>
    <body>
      <!-- Hero Section -->
      <section class="hero">
        <div class="hero-content">
          <h1 class="logo">⚡ yantraverse</h1>
          <p class="tagline">The modern web framework built for speed and simplicity.<br/>Zero dependencies, maximum performance.</p>
          
          <div class="cta-buttons">
            <button class="btn btn-primary" onclick="document.querySelector('.code-section').scrollIntoView()">View Code</button>
            <a href="https://github.com" class="btn btn-secondary">GitHub</a>
          </div>
        </div>
      </section>

      <!-- Code Section -->
      <section class="code-section">
        <div class="code-container">
          <h2 class="code-title">Simple & Elegant</h2>
          <div class="code-block">
<span class="code-line"><span class="keyword">const</span> yantraverse = <span class="function">require</span>(<span class="string">'yantraverse'</span>);</span>
<span class="code-line"><span class="keyword">const</span> app = <span class="function">yantraverse</span>();</span>
<span class="code-line"></span>
<span class="code-line"><span class="comment">// Add middleware</span></span>
<span class="code-line">app.<span class="method">use</span>(<span class="function">helmet</span>());</span>
<span class="code-line">app.<span class="method">use</span>(<span class="function">cors</span>());</span>
<span class="code-line"></span>
<span class="code-line"><span class="comment">// Define your routes</span></span>
<span class="code-line">app.<span class="method">get</span>(<span class="string">'/'</span>, (req, res) => {</span>
<span class="code-line">  res.<span class="method">json</span>({ message: <span class="string">'Hello World'</span> });</span>
<span class="code-line">});</span>
<span class="code-line"></span>
<span class="code-line"><span class="comment">// Handle dynamic routes</span></span>
<span class="code-line">app.<span class="method">get</span>(<span class="string">'/users/:id'</span>, (req, res) => {</span>
<span class="code-line">  res.<span class="method">json</span>({ userId: req.params.id });</span>
<span class="code-line">});</span>
<span class="code-line"></span>
<span class="code-line"><span class="comment">// Start the server</span></span>
<span class="code-line">app.<span class="method">listen</span>(<span class="number">3000</span>);</span>
          </div>
        </div>
      </section>

      <!-- Features Section -->
      <section class="features">
        <h2 class="features-title">Why yantraverse?</h2>
        <div class="features-grid">
          <div class="feature">
            <div class="feature-number">10K+</div>
            <h3>Requests/sec</h3>
            <p>Lightning-fast routing engine optimized for performance</p>
          </div>
          <div class="feature">
            <div class="feature-number">0</div>
            <h3>Dependencies</h3>
            <p>Pure Node.js. No bloat, no unnecessary packages</p>
          </div>
          <div class="feature">
            <div class="feature-number">&lt;50KB</div>
            <h3>Bundle Size</h3>
            <p>Lightweight framework you can trust</p>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer>
        <div class="footer-content">
          <div class="footer-links">
            <a href="#">Documentation</a>
            <a href="#">GitHub</a>
            <a href="#">Discord</a>
            <a href="#">Twitter</a>
          </div>
          <div class="footer-bottom">
            <p>&copy; 2026 yantraverse. Built for developers who value simplicity and speed.</p>
          </div>
        </div>
      </footer>
    </body>
    </html>
  `);
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
