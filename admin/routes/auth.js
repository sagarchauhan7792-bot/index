const express = require('express');
const bcrypt  = require('bcryptjs');
const ejs     = require('ejs');
const path    = require('path');
const router  = express.Router();

const LOGIN_VIEW = path.join(__dirname, '../views/login.ejs');

function renderLogin(res, error) {
  ejs.renderFile(LOGIN_VIEW, { error }, {}, (err, html) => {
    if (err) return res.status(500).send(err.message);
    res.send(html);
  });
}

// GET /login
router.get('/login', (req, res) => {
  if (req.session.loggedIn) return res.redirect('/');
  renderLogin(res, null);
});

// POST /login
router.post('/login', async (req, res) => {
  const { password } = req.body;
  const hash = process.env.ADMIN_PASSWORD_HASH;

  if (!hash) return renderLogin(res, 'Server misconfigured: ADMIN_PASSWORD_HASH not set.');

  const match = await bcrypt.compare(password, hash);
  if (match) {
    req.session.loggedIn = true;
    return res.redirect('/');
  }
  renderLogin(res, 'Incorrect password. Try again.');
});

// POST /logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

module.exports = router;
