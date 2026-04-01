const express = require('express');
const { getContent, saveContent } = require('../lib/github');
const router = express.Router();

// GET /blog
router.get('/', async (req, res) => {
  try {
    const { data, sha } = await getContent();
    res.render('blog', { posts: data.blog || [], sha, success: null, error: null });
  } catch (err) {
    res.render('blog', { posts: [], sha: '', success: null, error: err.message });
  }
});

// POST /blog/new — create post
router.post('/new', async (req, res) => {
  try {
    const { data, sha } = await getContent();
    const { title, slug, excerpt, body, date } = req.body;
    data.blog = data.blog || [];
    data.blog.unshift({
      id:      Date.now().toString(),
      title,
      slug:    slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      excerpt,
      body,
      date:    date || new Date().toISOString().split('T')[0],
      published: true,
    });
    await saveContent(data, sha);
    res.redirect('/blog?success=Post+created');
  } catch (err) {
    res.redirect(`/blog?error=${encodeURIComponent(err.message)}`);
  }
});

// POST /blog/edit/:id — update post
router.post('/edit/:id', async (req, res) => {
  try {
    const { data, sha } = await getContent();
    const idx = data.blog.findIndex(p => p.id === req.params.id);
    if (idx === -1) throw new Error('Post not found');
    const { title, slug, excerpt, body, date, published } = req.body;
    data.blog[idx] = { ...data.blog[idx], title, slug, excerpt, body, date, published: published === 'on' };
    await saveContent(data, sha);
    res.redirect('/blog?success=Post+updated');
  } catch (err) {
    res.redirect(`/blog?error=${encodeURIComponent(err.message)}`);
  }
});

// POST /blog/delete/:id — delete post
router.post('/delete/:id', async (req, res) => {
  try {
    const { data, sha } = await getContent();
    data.blog = (data.blog || []).filter(p => p.id !== req.params.id);
    await saveContent(data, sha);
    res.redirect('/blog?success=Post+deleted');
  } catch (err) {
    res.redirect(`/blog?error=${encodeURIComponent(err.message)}`);
  }
});

module.exports = router;
