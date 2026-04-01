#!/usr/bin/env node
const fs=require('fs'),path=require('path');
const contentPath=path.join(__dirname,'content.json');
const inputPath=path.join(__dirname,'revnox-media-v4.html');
const outputPath=path.join(__dirname,'revnox-media-v4.html');
if(!fs.existsSync(contentPath)){console.error('ERROR: content.json not found');process.exit(1);}
if(!fs.existsSync(inputPath)){console.error('ERROR: revnox-media-v4.html not found');process.exit(1);}
const content=JSON.parse(fs.readFileSync(contentPath,'utf8'));
let html=fs.readFileSync(inputPath,'utf8');

const ORIG_SVC_TITLE={performance_marketing:'Performance Marketing',creative_intelligence:'Creative Intelligence',ecommerce_infrastructure:'Ecommerce Infrastructure',ai_automation:'AI Automation',influencer_marketing:'Influencer Marketing',data_intelligence:'Data Intelligence'};
const ORIG_SVC_DESC={performance_marketing:'High-performance acquisition systems across Meta and Google \u2014 structured to identify scalable audiences and unlock consistent revenue growth.',creative_intelligence:'Structured creative testing frameworks that rapidly identify winning ad concepts, messaging angles, and storytelling formats.',ecommerce_infrastructure:'Shopify stores, high-converting landing pages, and optimized customer journeys that transform traffic into revenue for D2C brands.',ai_automation:'AI-assisted workflows that streamline marketing operations, creative generation, reporting, and campaign management.',influencer_marketing:'Creator programs aligned with performance marketing goals \u2014 expanding brand reach while maintaining measurable ROI.',data_intelligence:'Analytics systems and dashboards that translate campaign performance into actionable insights for continuous optimization.'};
const ORIG_CS_TITLE={case_1:'\u20b940L \u2192 \u20b92Cr/month',case_2:'3.8x Return on Ad Spend',case_3:'42% CPA Reduction'};
const ORIG_CS_DESC={case_1:'Restructured the advertising account, introduced a creative testing framework, and optimized the landing page funnel. Revenue scaled 5x.',case_2:'Implemented a systematic creative testing pipeline that resolved creative fatigue and drove a consistent 3.8x ROAS across all campaigns.',case_3:'Built a demand generation framework combining paid media, landing page optimization, and lead qualification systems for enterprise clients.'};

function ea(s){return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;');}
function eh(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

// 1. title
html=html.replace(/<title>.*?<\/title>/is,`<title>${eh(content.seo.title)}</title>`);

// 2. strip old blocks
html=html.replace(/<!-- CMS:SEO_START -->[\s\S]*?<!-- CMS:SEO_END -->\n?/g,'');
html=html.replace(/<!-- CMS:INJECTOR_START -->[\s\S]*?<!-- CMS:INJECTOR_END -->\n?/g,'');
html=html.replace(/<script id="cms-(?:blog|content)-data"[^>]*>[\s\S]*?<\/script>\n?/g,'');

// 3. SEO tags
const s=content.seo;
const seoBlock=`<!-- CMS:SEO_START -->
  <meta name="description" content="${ea(s.description)}">
  <meta name="keywords" content="${ea(s.keywords)}">
  <link rel="canonical" href="${ea(s.canonical)}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${ea(s.og_title)}">
  <meta property="og:description" content="${ea(s.og_description)}">
  <meta property="og:image" content="${ea(s.og_image)}">
  <meta property="og:url" content="${ea(s.og_url)}">
  <meta name="twitter:card" content="${ea(s.twitter_card)}">
  <meta name="twitter:title" content="${ea(s.twitter_title)}">
  <meta name="twitter:description" content="${ea(s.twitter_description)}">
  <meta name="twitter:image" content="${ea(s.twitter_image)}">
<!-- CMS:SEO_END -->`;
html=html.replace(/(<\/title>)/,`$1\n  ${seoBlock}`);

// 4. text replacements
const pairs=[];
if(content.hero){
  pairs.push(['Revenue Growth Infrastructure',content.hero.heading]);
  pairs.push(['Marketing should translate into measurable business impact. Every Revnox engagement is engineered around the metrics that determine long-term growth.',content.hero.subheading]);
}
(content.services||[]).forEach(svc=>{
  if(ORIG_SVC_TITLE[svc.key])pairs.push([ORIG_SVC_TITLE[svc.key],svc.title]);
  if(ORIG_SVC_DESC[svc.key])pairs.push([ORIG_SVC_DESC[svc.key],svc.description]);
});
(content.case_studies||[]).forEach(cs=>{
  if(ORIG_CS_TITLE[cs.key])pairs.push([ORIG_CS_TITLE[cs.key],cs.title]);
  if(ORIG_CS_DESC[cs.key])pairs.push([ORIG_CS_DESC[cs.key],cs.description]);
});
if(content.footer)pairs.push(['\u00a9 2025 Revnox Media. All rights reserved.',content.footer.copyright]);
for(const[o,n]of pairs){if(o&&n&&o!==n)html=html.split(o).join(n);}

// 5. runtime injector
const st=content.stats||{};
const inj=`<!-- CMS:INJECTOR_START -->
  <script id="cms-content-data" type="application/json">${JSON.stringify(content)}</script>
  <script id="cms-blog-data" type="application/json">${JSON.stringify(content.blog||[])}</script>
  <script>
  (function(){try{
    var d=JSON.parse(document.getElementById('cms-content-data').textContent);
    if(d.seo&&d.seo.title)document.title=d.seo.title;
    if(d.stats){
      var m={'${st.revenue_generated||'120 Crore+'}':d.stats.revenue_generated,'${st.ad_spend_managed||'30 Crore+'}':d.stats.ad_spend_managed,'${st.creatives_tested||'1500'}':d.stats.creatives_tested,'${st.industries_scaled||'12'}':d.stats.industries_scaled};
      var w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),n;
      while((n=w.nextNode())){var t=n.textContent.trim();if(m[t]!==undefined)n.parentElement.textContent=m[t];}
    }
  }catch(e){}}());
  </script>
<!-- CMS:INJECTOR_END -->`;
html=html.replace(/<\/body>/i,`  ${inj}\n</body>`);

// 6. write
fs.writeFileSync(outputPath,html,'utf8');
console.log('\u2713 build.js: revnox-media-v4.html updated (SEO + content replacements)');
