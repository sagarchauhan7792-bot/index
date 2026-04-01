const express = require('express');
const { getContent, saveContent } = require('../lib/github');
const router = express.Router();

// GET /seo — show SEO editor form
router.get('/', async (req, res) => {
  try {
    const { data, sha } = await getContent();
    res.render('seo', { seo: data.seo, sha, success: null, error: null });
  } catch (err) {
    res.render('seo', { seo: {}, sha: '', success: null, error: err.message });
  }
});

// POST /seo — save SEO fields
router.post('/', async (req, res) => {
  try {
    const { data, sha } = await getContent();
    const { title, description, keywords, canonical,
            og_title, og_description, og_image, og_url,
            twitter_card, twitter_title, twitter_description, twitter_image } = req.body;

    data.seo = {
      title, description, keywords, canonical,
      og_title, og_description, og_image, og_url,
      twitter_card, twitter_title, twitter_description, twitter_image,
    };

    await saveContent(data, sha);
    const { data: fresh, sha: newSha } = await getContent();
    res.render('seo', { seo: fresh.seo, sha: newSha, success: 'SEO saved! GitHub Action will rebuild your site.', error: null });
  } catch (err) {
    res.render('seo', { seo: req.body, sha: req.body.sha || '', success: null, error: err.message });
  }
});

module.exports = router;
