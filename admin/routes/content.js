const express = require('express');
const { getContent, saveContent } = require('../lib/github');
const router = express.Router();

// GET /content
router.get('/', async (req, res) => {
  try {
    const { data, sha } = await getContent();
    res.render('content', { data, sha, success: null, error: null });
  } catch (err) {
    res.render('content', { data: {}, sha: '', success: null, error: err.message });
  }
});

// POST /content
router.post('/', async (req, res) => {
  try {
    const { data, sha } = await getContent();
    const b = req.body;

    // Hero
    data.hero = {
      heading:      b.hero_heading,
      subheading:   b.hero_subheading,
      cta_primary:  b.hero_cta_primary,
      cta_secondary: b.hero_cta_secondary,
    };

    // Stats
    data.stats = {
      revenue_generated: b.stat_revenue,
      ad_spend_managed:  b.stat_ad_spend,
      creatives_tested:  b.stat_creatives,
      industries_scaled: b.stat_industries,
    };

    // Services (order preserved from form)
    data.services = data.services.map((svc) => ({
      ...svc,
      title:       b[`svc_title_${svc.key}`]       || svc.title,
      description: b[`svc_desc_${svc.key}`]        || svc.description,
    }));

    // Case studies
    data.case_studies = data.case_studies.map((cs) => ({
      ...cs,
      title:       b[`cs_title_${cs.key}`]         || cs.title,
      description: b[`cs_desc_${cs.key}`]          || cs.description,
    }));

    // Footer
    data.footer = {
      tagline:   b.footer_tagline,
      copyright: b.footer_copyright,
    };

    await saveContent(data, sha);
    const { data: fresh, sha: newSha } = await getContent();
    res.render('content', { data: fresh, sha: newSha, success: 'Content saved! GitHub Action will rebuild your site.', error: null });
  } catch (err) {
    res.render('content', { data: {}, sha: '', success: null, error: err.message });
  }
});

module.exports = router;
