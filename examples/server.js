'use strict';

const path = require('path');
const yantraverse = require('../index');
const { logger, cors, rateLimit, helmet, timeout } = require('../index');

const app = yantraverse();

app.use(helmet());
app.use(logger());
app.use(cors({ origins: '*' }));
app.use(timeout(10000));
app.use(rateLimit({ windowMs: 60_000, max: 100 }));

// Serve static files (logo1.png from src/)
app.static(path.join(__dirname, '../src'), '/');

// Home page
app.get('/', (req, res) => {
  res.html(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>yantraverse - Fast. Simple. Powerful.</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff;color:#1a1a1a;line-height:1.6}
html{scroll-behavior:smooth}
a{text-decoration:none;color:inherit}

/* NAV */
nav{display:flex;justify-content:space-between;align-items:center;padding:1rem 2rem;border-bottom:1px solid #f0f0f0;position:sticky;top:0;background:#fff;z-index:100}
.nav-logo{display:flex;align-items:center;gap:10px;font-size:15px;font-weight:600;color:#000}
.logo-mark{width:32px;height:32px;background:#000;border-radius:7px;display:flex;align-items:center;justify-content:center}
.logo-mark svg{width:16px;height:16px;fill:#fff}
.nav-links{display:flex;align-items:center;gap:2rem}
.nav-links a{font-size:13px;color:#666;transition:color 0.2s}
.nav-links a:hover{color:#000}
.nav-pill{font-size:12px;font-weight:600;background:#000;color:#fff;padding:6px 16px;border-radius:20px;transition:opacity 0.2s}
.nav-pill:hover{opacity:0.8}

/* HERO */
.hero{padding:6rem 2rem 4rem;text-align:center;max-width:900px;margin:0 auto}
.hero-badge{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:500;color:#555;border:1px solid #e8e8e8;border-radius:20px;padding:5px 14px;margin-bottom:2rem}
.badge-dot{width:6px;height:6px;border-radius:50%;background:#22c55e;flex-shrink:0}
.hero h1{font-size:4rem;font-weight:700;line-height:1.05;letter-spacing:-2.5px;color:#000;margin-bottom:1.25rem}
.hero h1 span{color:#999}
.hero-desc{font-size:1.05rem;color:#666;max-width:480px;margin:0 auto 2.5rem;line-height:1.75}
.hero-actions{display:flex;gap:10px;justify-content:center;margin-bottom:2.5rem;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:600;padding:10px 22px;border-radius:8px;cursor:pointer;transition:all 0.2s;font-family:'Inter',sans-serif}
.btn-dark{background:#000;color:#fff;border:1px solid #000}
.btn-dark:hover{background:#222}
.btn-ghost{background:#fff;color:#333;border:1px solid #e0e0e0}
.btn-ghost:hover{background:#f5f5f5;border-color:#ccc}
.install-box{display:inline-flex;align-items:center;gap:12px;background:#f7f7f7;border:1px solid #ebebeb;border-radius:10px;padding:10px 18px;font-family:'Monaco','Menlo',monospace;font-size:13px;color:#000}
.install-prompt{color:#bbb;user-select:none}
.copy-btn{font-size:11px;font-weight:600;color:#666;border:1px solid #e0e0e0;border-radius:5px;padding:3px 9px;cursor:pointer;background:#fff;font-family:'Inter',sans-serif;transition:all 0.2s}
.copy-btn:hover{background:#000;color:#fff;border-color:#000}

/* STATS */
.stats-row{display:flex;justify-content:center;gap:4rem;padding:2.5rem 2rem;border-top:1px solid #f0f0f0;border-bottom:1px solid #f0f0f0;flex-wrap:wrap}
.stat{text-align:center}
.stat-val{font-size:1.8rem;font-weight:700;color:#000;letter-spacing:-1px}
.stat-lbl{font-size:12px;color:#aaa;margin-top:3px}

/* FEATURES */
.section{padding:5rem 2rem}
.wrap{max-width:1100px;margin:0 auto}
.section-tag{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:#aaa;margin-bottom:1rem}
.section-title{font-size:2.2rem;font-weight:700;letter-spacing:-1px;color:#000;margin-bottom:0.75rem}
.section-sub{font-size:15px;color:#666;line-height:1.75;margin-bottom:3rem}
.features-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1px;border:1px solid #f0f0f0;border-radius:14px;overflow:hidden;background:#f0f0f0}
.feat{background:#fff;padding:2rem;transition:background 0.2s}
.feat:hover{background:#fafafa}
.feat-icon{width:38px;height:38px;border-radius:9px;border:1px solid #ebebeb;display:flex;align-items:center;justify-content:center;margin-bottom:1.25rem;font-size:17px}
.feat h3{font-size:14px;font-weight:600;color:#000;margin-bottom:6px}
.feat p{font-size:13px;color:#666;line-height:1.65}

/* CODE SECTION */
.code-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;align-items:start}
.code-block{background:#fafafa;border:1px solid #ebebeb;border-radius:12px;overflow:hidden}
.code-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #ebebeb;background:#f5f5f5}
.code-dots{display:flex;gap:6px}
.dot{width:10px;height:10px;border-radius:50%}
.code-title{font-size:12px;color:#aaa;font-family:'Monaco','Menlo',monospace}
.code-body{padding:1.5rem;font-family:'Monaco','Menlo','Ubuntu Mono',monospace;font-size:12.5px;line-height:1.75;overflow-x:auto;tab-size:2}
.kw{color:#7c3aed}.fn{color:#0369a1}.str{color:#15803d}.cmt{color:#aaa}.num{color:#b45309}

/* MIDDLEWARE LIST */
.mw-list{display:flex;flex-direction:column;gap:8px}
.mw-item{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border:1px solid #f0f0f0;border-radius:9px;background:#fff;transition:background 0.15s}
.mw-item:hover{background:#fafafa}
.mw-name{font-size:13px;font-weight:600;font-family:'Monaco','Menlo',monospace;color:#000;margin-bottom:2px}
.mw-desc{font-size:12px;color:#888}
.mw-badge{font-size:11px;font-weight:600;padding:3px 10px;border-radius:6px;white-space:nowrap}
.badge-built{background:#f0fdf4;color:#166534}
.badge-sec{background:#eff6ff;color:#1e40af}
.badge-perf{background:#fefce8;color:#854d0e}

/* CTA */
.cta-box{background:#f7f7f7;border:1px solid #ebebeb;border-radius:16px;padding:4rem 2rem;text-align:center}
.cta-box h2{font-size:2.2rem;font-weight:700;letter-spacing:-1px;color:#000;margin-bottom:0.75rem}
.cta-box p{font-size:15px;color:#666;margin-bottom:2rem}
.cta-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}

/* FOOTER */
footer{padding:2rem;border-top:1px solid #f0f0f0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;max-width:1100px;margin:0 auto}
.footer-left{font-size:12px;color:#bbb}
.footer-links{display:flex;gap:1.5rem}
.footer-links a{font-size:12px;color:#bbb;transition:color 0.2s}
.footer-links a:hover{color:#000}
.divider{border:none;border-top:1px solid #f0f0f0}

@media(max-width:768px){
  .hero h1{font-size:2.5rem}
  .nav-links{gap:1rem}
  .nav-links a:not(.nav-pill){display:none}
  .code-grid{grid-template-columns:1fr}
  .stats-row{gap:2rem}
}
</style>
</head>
<body>

<!-- NAV -->
<nav>
  <div class="nav-logo">
    <img src="/logo1.png" alt="yantraverse" style="width:48px;height:48px;object-fit:contain;background:#f5f5f5;padding:4px;border-radius:6px">
    <span>yantraverse</span>
  </div>
  <div class="nav-links">
    <a href="#features">Features</a>
    <a href="#quickstart">Quickstart</a>
    <a href="https://github.com" target="_blank">GitHub</a>
    <a href="https://www.npmjs.com/package/yantraverse" target="_blank" class="nav-pill">npm &uarr;</a>
  </div>
</nav>

<!-- HERO -->
<div class="hero">
  <div class="hero-badge"><span class="badge-dot"></span>v1.0 &mdash; Zero dependencies</div>
  <h1>The Node.js framework<br><span>built for speed.</span></h1>
  <p class="hero-desc">Express-like API with none of the bloat. Pure Node.js. Production-ready middleware built in.</p>
  <div class="hero-actions">
    <a href="#quickstart" class="btn btn-dark">Get started</a>
    <a href="https://github.com" target="_blank" class="btn btn-ghost">View on GitHub &rarr;</a>
  </div>
  <div class="install-box">
    <span class="install-prompt">$</span>
    <span>npm install yantraverse</span>
    <button class="copy-btn" onclick="navigator.clipboard.writeText('npm install yantraverse');this.textContent='Copied!';setTimeout(()=>this.textContent='Copy',1500)">Copy</button>
  </div>
</div>

<!-- STATS -->
<div class="stats-row">
  <div class="stat"><div class="stat-val">10K+</div><div class="stat-lbl">requests / sec</div></div>
  <div class="stat"><div class="stat-val">0</div><div class="stat-lbl">dependencies</div></div>
  <div class="stat"><div class="stat-val">~2KB</div><div class="stat-lbl">gzipped</div></div>
  <div class="stat"><div class="stat-val">100%</div><div class="stat-lbl">pure Node.js</div></div>
</div>

<hr class="divider">

<!-- FEATURES -->
<section class="section" id="features">
  <div class="wrap">
    <p class="section-tag">Why yantraverse</p>
    <h2 class="section-title">Everything you need, nothing you don't.</h2>
    <p class="section-sub">Production-grade features with an Express-like API, zero external dependencies, and minimal overhead.</p>
    <div class="features-grid">
      <div class="feat">
        <div class="feat-icon">&#9889;</div>
        <h3>Blazing fast</h3>
        <p>Built on Node.js native HTTP. Handles 10K+ requests/sec with minimal overhead &mdash; no abstraction tax.</p>
      </div>
      <div class="feat">
        <div class="feat-icon">&#128230;</div>
        <h3>Zero dependencies</h3>
        <p>Pure Node.js. No bloat, smaller bundle, faster installs, and fewer attack vectors in your supply chain.</p>
      </div>
      <div class="feat">
        <div class="feat-icon">&#127919;</div>
        <h3>Express-like API</h3>
        <p>Familiar <code style="font-size:11px;background:#f5f5f5;padding:1px 5px;border-radius:4px">app.get()</code>, <code style="font-size:11px;background:#f5f5f5;padding:1px 5px;border-radius:4px">app.use()</code>, <code style="font-size:11px;background:#f5f5f5;padding:1px 5px;border-radius:4px">req/res</code> patterns. Drop-in with minimal learning curve.</p>
      </div>
      <div class="feat">
        <div class="feat-icon">&#128274;</div>
        <h3>Production ready</h3>
        <p>Helmet, CORS, rate limiting, timeout, and logging &mdash; all built in. Secure by default out of the box.</p>
      </div>
      <div class="feat">
        <div class="feat-icon">&#128739;</div>
        <h3>Pattern routing</h3>
        <p>Named parameters, regex patterns, middleware chaining per-route. Advanced routing without a router package.</p>
      </div>
      <div class="feat">
        <div class="feat-icon">&#9881;</div>
        <h3>Simple middleware</h3>
        <p>Linear pipeline. Chain handlers globally or per-route with predictable execution order.</p>
      </div>
    </div>
  </div>
</section>

<hr class="divider">

<!-- QUICKSTART -->
<section class="section" id="quickstart">
  <div class="wrap">
    <p class="section-tag">Quickstart</p>
    <h2 class="section-title">Up in 30 seconds.</h2>
    <p class="section-sub">Clean, minimal code. Powerful results.</p>
    <div class="code-grid">
      <div class="code-block">
        <div class="code-header">
          <div class="code-dots">
            <div class="dot" style="background:#ff5f57"></div>
            <div class="dot" style="background:#ffbd2e"></div>
            <div class="dot" style="background:#28c840"></div>
          </div>
          <span class="code-title">server.js</span>
        </div>
        <div class="code-body"><span class="kw">const</span> yantraverse = <span class="fn">require</span>(<span class="str">'yantraverse'</span>);
<span class="kw">const</span> { logger, cors, helmet,
        rateLimit, timeout } = <span class="fn">require</span>(<span class="str">'yantraverse'</span>);

<span class="kw">const</span> app = <span class="fn">yantraverse</span>();

<span class="cmt">// Middleware stack</span>
app.<span class="fn">use</span>(<span class="fn">helmet</span>());
app.<span class="fn">use</span>(<span class="fn">logger</span>());
app.<span class="fn">use</span>(<span class="fn">cors</span>({ origins: <span class="str">'*'</span> }));
app.<span class="fn">use</span>(<span class="fn">timeout</span>(<span class="num">10000</span>));
app.<span class="fn">use</span>(<span class="fn">rateLimit</span>({ windowMs: <span class="num">60_000</span>, max: <span class="num">100</span> }));

<span class="cmt">// Routes</span>
app.<span class="fn">get</span>(<span class="str">'/'</span>, (req, res) =&gt; {
  res.<span class="fn">json</span>({ hello: <span class="str">'world'</span> });
});

app.<span class="fn">get</span>(<span class="str">'/users/:id'</span>, (req, res) =&gt; {
  res.<span class="fn">json</span>({ id: req.params.id });
});

app.<span class="fn">listen</span>(<span class="num">3000</span>);</div>
      </div>
      <div>
        <p style="font-size:13px;font-weight:600;color:#000;margin-bottom:1rem">Built-in middleware</p>
        <div class="mw-list">
          <div class="mw-item">
            <div>
              <div class="mw-name">helmet()</div>
              <div class="mw-desc">Secure HTTP headers</div>
            </div>
            <span class="mw-badge badge-sec">Security</span>
          </div>
          <div class="mw-item">
            <div>
              <div class="mw-name">cors()</div>
              <div class="mw-desc">Cross-origin resource sharing</div>
            </div>
            <span class="mw-badge badge-built">Built-in</span>
          </div>
          <div class="mw-item">
            <div>
              <div class="mw-name">rateLimit()</div>
              <div class="mw-desc">Request rate limiting</div>
            </div>
            <span class="mw-badge badge-perf">Perf</span>
          </div>
          <div class="mw-item">
            <div>
              <div class="mw-name">timeout()</div>
              <div class="mw-desc">Request timeout handling</div>
            </div>
            <span class="mw-badge badge-built">Built-in</span>
          </div>
          <div class="mw-item">
            <div>
              <div class="mw-name">logger()</div>
              <div class="mw-desc">HTTP request logging</div>
            </div>
            <span class="mw-badge badge-built">Built-in</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<hr class="divider">

<!-- CTA -->
<section class="section">
  <div class="wrap">
    <div class="cta-box">
      <h2>Start building today.</h2>
      <p>Install yantraverse and ship your first route in under a minute.</p>
      <div class="cta-actions">
        <a href="https://www.npmjs.com/package/yantraverse" target="_blank" class="btn btn-dark">View on npm &uarr;</a>
        <a href="https://github.com" target="_blank" class="btn btn-ghost">Documentation &rarr;</a>
      </div>
    </div>
  </div>
</section>

<!-- FOOTER -->
<footer>
  <span class="footer-left">&copy; 2026 yantraverse &mdash; built with &hearts; in India</span>
  <div class="footer-links">
    <a href="#features">Features</a>
    <a href="#quickstart">Quickstart</a>
    <a href="https://github.com" target="_blank">GitHub</a>
    <a href="https://www.npmjs.com/package/yantraverse" target="_blank">npm</a>
  </div>
</footer>

<script>
document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  e.preventDefault();
  const t = document.querySelector(a.getAttribute('href'));
  if (t) t.scrollIntoView({ behavior: 'smooth' });
}));
</script>

</body>
</html>`);
});

// Health check
app.get('/ping', (req, res) => res.json({ pong: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`\n  ⚡ yantraverse running → http://localhost:${PORT}\n`));