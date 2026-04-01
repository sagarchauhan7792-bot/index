require('dotenv').config();
const express      = require('express');
const session      = require('express-session');
const path         = require('path');
const ejs          = require('ejs');

const authRoutes    = require('./routes/auth');
const seoRoutes     = require('./routes/seo');
const contentRoutes = require('./routes/content');
const blogRoutes    = require('./routes/blog');
const imageRoutes   = require('./routes/images');

const app  = express();
const PORT = process.env.PORT || 3000;
const VIEWS = path.join(__dirname, 'views');
const LAYOUT = path.join(VIEWS, 'layout.ejs');

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'change-me-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000 },
}));

// ── Auth guard ────────────────────────────────────────────────────────────────
function requireLogin(req, res, next) {
  if (req.session.loggedIn) return next();
  res.redirect('/login');
}

// ── Layout helper middleware — only applied to authenticated routes ───────────
function withLayout(req, res, next) {
  res.renderPage = function(page, locals = {}) {
    const partialPath = path.join(VIEWS, `${page}.ejs`);
    ejs.renderFile(partialPath, { ...locals, page }, {}, (err, bodyHtml) => {
      if (err) return next(err);
      ejs.renderFile(LAYOUT, { body: bodyHtml, page }, {}, (err2, html) => {
        if (err2) return next(err2);
        res.send(html);
      });
    });
  };
  // Override res.render so sub-router calls automatically use the layout
  const _render = res.render.bind(res);
  res.render = function(view, locals, cb) {
    if (typeof cb === 'function') return _render(view, locals, cb);
    res.renderPage(view, locals);
  };
  next();
}

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/', authRoutes);  // login/logout — no layout
app.get('/', requireLogin, withLayout, (req, res) => res.renderPage('dashboard'));
app.use('/seo',     requireLogin, withLayout, seoRoutes);
app.use('/content', requireLogin, withLayout, contentRoutes);
app.use('/blog',    requireLogin, withLayout, blogRoutes);
app.use('/images',  requireLogin, withLayout, imageRoutes);

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✓ Revnox CMS running at http://localhost:${PORT}`);
  console.log(`  Login and start managing your site!\n`);
});
