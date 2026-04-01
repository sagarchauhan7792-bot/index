#!/usr/bin/env node
/**
 * build.js — Revnox CMS Build Script
 * Reads index.html, injects SEO meta tags from content.json,
 * and replaces known text markers in the HTML.
 */

const fs = require('fs');
const path = require('path');

const contentPath = path.join(__dirname, 'content.json');
const inputPath  = path.join(__dirname, 'index.html');
const outputPath = path.join(__dirname, 'index.html');

if (!fs.existsSync(contentPath)) {
  console.error('ERROR: content.json not found');
  process.exit(1);
}
if (!fs.existsSync(inputPath)) {
  console.error('ERROR: index.html not found');
  process.exit(1);
}

const content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
let html = fs.readFileSync(inputPath, 'utf8');

// ─── 1. Replace <title> ──────────────────────────────────────────────────────
html = html.replace(
  /<title>.*?<\/title>/is,
  `<title>${escapeHtml(content.seo.title)}</title>`
);

// ─── 2. Remove old injected meta block (if any) ──────────────────────────────
html = html.replace(/<!-- CMS:SEO_START -->[\s\S]*?<!-- CMS:SEO_END -->\n?/g, '');

// ─── 3. Build and inject SEO meta tags after <title> ─────────────────────────
const { seo } = content;
const metaTags = `<!-- CMS:SEO_START -->
  <meta name="description" content="${escapeAttr(seo.description)}">
  <meta name="keywords" content="${escapeAttr(seo.keywords)}">
  <link rel="canonical" href="${escapeAttr(seo.canonical)}">
  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeAttr(seo.og_title)}">
  <meta property="og:description" content="${escapeAttr(seo.og_description)}">
  <meta property="og:image" content="${escapeAttr(seo.og_image)}">
  <meta property="og:url" content="${escapeAttr(seo.og_url)}">
  <!-- Twitter Card -->
  <meta name="twitter:card" content="${escapeAttr(seo.twitter_card)}">
  <meta name="twitter:title" content="${escapeAttr(seo.twitter_title)}">
  <meta name="twitter:description" content="${escapeAttr(seo.twitter_description)}">
  <meta name="twitter:image" content="${escapeAttr(seo.twitter_image)}">
<!-- CMS:SEO_END -->`;

html = html.replace(/(<\/title>)/, `$1\n  ${metaTags}`);

// ─── 4. Inject blog posts as JSON for the page (optional future use) ─────────
const blogScript = `<script id="cms-blog-data" type="application/json">${JSON.stringify(content.blog)}</script>`;
// Remove old blog data script if present
html = html.replace(/<script id="cms-blog-data"[^>]*>[\s\S]*?<\/script>\n?/g, '');
// Inject before </body>
html = html.replace(/<\/body>/i, `  ${blogScript}\n</body>`);

// ─── 5. Write output ──────────────────────────────────────────────────────────
fs.writeFileSync(outputPath, html, 'utf8');
console.log('✓ build.js: index.html updated with SEO meta tags from content.json');

// ─── Helpers ─────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
function escapeAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;');
}
