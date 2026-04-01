const express = require('express');
const multer  = require('multer');
const path    = require('path');
const { uploadImage, getContent, saveContent } = require('../lib/github');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter(req, file, cb) {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// GET /images
router.get('/', (req, res) => {
  res.render('images', { success: null, error: null, url: null });
});

// POST /images/upload — upload image and optionally set as og:image
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) throw new Error('No valid image file uploaded (jpg/png/gif/webp/svg, max 5MB).');
    const filename = `${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;
    const url = await uploadImage(filename, req.file.buffer);

    // Optionally update og:image if checkbox was checked
    if (req.body.set_og_image === 'on') {
      const { data, sha } = await getContent();
      data.seo.og_image      = url;
      data.seo.twitter_image = url;
      await saveContent(data, sha);
    }

    res.render('images', { success: `Image uploaded successfully.`, url, error: null });
  } catch (err) {
    res.render('images', { success: null, error: err.message, url: null });
  }
});

module.exports = router;
