/**
 * Meta Ads Daily Analysis - Agency Grade (14-Tab Professional Report)
 */

const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
const { generateDashboard } = require('./dashboard-generator');

// ─── LOAD CONFIG ─────────────────────────────────────────────────────────────
// Load config.env if it exists (local dev); GitHub Actions uses repo secrets as env vars
const CONFIG_PATH = process.env.CONFIG_PATH || require('path').join(__dirname, 'config.env');
try {
  fs.readFileSync(CONFIG_PATH, 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.trim().split('=');
    if (k && v.length && !process.env[k]) process.env[k] = v.join('=');
  });
} catch(e) {}

const META_TOKEN    = process.env.META_ACCESS_TOKEN    || 'EAAVdiFFGcQQBREKBP1eTrd9WoHM0Gvn5jCcVsTERZAVQlfdBwveTtE4vgvOfeZCJuwZCZBrJoRZAFepGaXLvZAtkRi43zWPPzw8a2gPFNXi6dH9ekur1ymxWKnXZAEbSAfh5yz2qHyC8f0OHxN4h69KXIS38lXJEhNfEGyXB9w4jHhMQ7ZByxR80czvmlLt9cAZDZD';
const AD_ACCOUNT    = process.env.META_AD_ACCOUNT_ID   || 'act_3959654920941231';
const GITHUB_TOKEN  = process.env.GITHUB_TOKEN         || '';
const GITHUB_REPO   = 'sagarchauhan7792-bot/index';
const GITHUB_BRANCH = 'master';
const SHOPIFY_STORE = process.env.SHOPIFY_STORE        || '';
const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN        || '';
const AMAZON_CLIENT_ID = process.env.AMAZON_CLIENT_ID || '';
const AMAZON_CLIENT_SECRET = process.env.AMAZON_CLIENT_SECRET || '';
const AMAZON_REFRESH_TOKEN = process.env.AMAZON_REFRESH_TOKEN || '';
const AMAZON_PROFILE_ID     = process.env.AMAZON_PROFILE_ID     || '2924755564335076';
const AMAZON_API_ENDPOINT   = process.env.AMAZON_API_ENDPOINT   || 'advertising-api-eu.amazon.com';

const REQUIRED_TABS = [
  '📊 Executive Dashboard',
  '🚨 Action Center',
  '📈 Campaign Performance',
  '🎯 Ad Set Intelligence',
  '🎨 Creative Performance',
  '👥 Audience Intelligence',
  '🌍 Geographic Performance',
  '📱 Device & Platform',
  '⏰ Hourly Performance',
  '🔻 Funnel Analysis',
  '🔄 Creative Fatigue Tracker',
  '📅 30-Day Trend Analysis',
  '💰 Budget & Pacing',
  '🏆 AI Analysis & Strategy',
  '📆 Weekly Report',
  '📅 Monthly Summary'
];

// ─── HTTP HELPERS ─────────────────────────────────────────────────────────────
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve(d); } });
    }).on('error', reject);
  });
}

function httpsPost(hostname, path, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const body = typeof data === 'string' ? data : JSON.stringify(data);
    const req = https.request({
      hostname, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), ...headers }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve(d); } });
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

// ─── GITHUB API ───────────────────────────────────────────────────────────────
async function pushToGitHub(localFilePath, repoPath, commitMessage) {
  const base64Content = fs.readFileSync(localFilePath).toString('base64');

  // Get current file SHA (required for updates)
  let sha = null;
  try {
    const getRes = await new Promise((resolve, reject) => {
      https.get(`https://api.github.com/repos/${GITHUB_REPO}/contents/${repoPath}?ref=${GITHUB_BRANCH}`, {
        headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'User-Agent': 'meta-ads-bot', 'Accept': 'application/vnd.github.v3+json' }
      }, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve({}); } });
      }).on('error', reject);
    });
    sha = getRes.sha || null;
  } catch(e) {}

  // PUT file to GitHub
  const body = JSON.stringify({
    message: commitMessage,
    content: base64Content,
    branch: GITHUB_BRANCH,
    ...(sha ? { sha } : {})
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_REPO}/contents/${repoPath}`,
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`, 'User-Agent': 'meta-ads-bot',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        const p = JSON.parse(d);
        if (p.message && !p.content) reject(new Error(`GitHub: ${p.message}`));
        else resolve(p);
      });
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

// ─── SHOPIFY API ──────────────────────────────────────────────────────────────
function shopifyGet(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SHOPIFY_STORE,
      path,
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_TOKEN,
        'Content-Type': 'application/json'
      }
    };
    https.get(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve({}); } });
    }).on('error', reject);
  });
}

// Full paginated fetch using page_info cursor
async function shopifyFetchAllPaged(path, key) {
  let all = [];
  const sep = path.includes('?') ? '&' : '?';
  let nextPath = path + sep + 'limit=250';
  while (nextPath) {
    const res = await new Promise((resolve, reject) => {
      const opts = {
        hostname: SHOPIFY_STORE, path: nextPath, method: 'GET',
        headers: { 'X-Shopify-Access-Token': SHOPIFY_TOKEN, 'Content-Type': 'application/json' }
      };
      const req = https.request(opts, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          try {
            const body = JSON.parse(d);
            // Extract next page_info from Link header
            const link = res.headers['link'] || '';
            let next = null;
            const m = link.match(/<[^>]*page_info=([^>&"]+)[^>]*>;\s*rel="next"/);
            if (m) next = m[1];
            resolve({ data: body[key] || [], nextPageInfo: next });
          } catch(e) { resolve({ data: [], nextPageInfo: null }); }
        });
      });
      req.on('error', reject); req.end();
    });
    all = all.concat(res.data);
    nextPath = res.nextPageInfo ? (path.split('?')[0] + '?limit=250&page_info=' + res.nextPageInfo) : null;
  }
  return all;
}

function processOrdersBatch(orders) {
  const active = orders.filter(o => !o.cancelled_at);
  const gmv = active.reduce((s, o) => s + parseFloat(o.total_price || 0), 0);
  const netRev = active.reduce((s, o) => s + parseFloat(o.subtotal_price || 0) - parseFloat(o.total_discounts || 0), 0);
  const discount = active.reduce((s, o) => s + parseFloat(o.total_discounts || 0), 0);
  const tax = active.reduce((s, o) => s + parseFloat(o.total_tax || 0), 0);
  const shipping = active.reduce((s, o) => s + parseFloat((o.shipping_lines||[]).reduce((ss,sl)=>ss+parseFloat(sl.price||0),0)), 0);
  const count = active.length;
  const aov = count > 0 ? gmv / count : 0;
  let units = 0, newCust = 0, retCust = 0;
  let codOrders = 0, prepaidOrders = 0;
  const productMap = {}, discountMap = {}, cityMap = {}, stateMap = {};
  active.forEach(o => {
    // Payment method
    const gateway = (o.payment_gateway || '').toLowerCase();
    if (gateway.includes('cod') || gateway.includes('cash')) codOrders++;
    else prepaidOrders++;
    // Customers
    if (o.customer && o.customer.orders_count <= 1) newCust++;
    else retCust++;
    // Products
    (o.line_items || []).forEach(item => {
      units += parseInt(item.quantity || 0);
      const pk = item.product_id || item.title;
      if (!productMap[pk]) productMap[pk] = { title: item.title, units: 0, revenue: 0, orders: 0 };
      productMap[pk].units += parseInt(item.quantity || 0);
      productMap[pk].revenue += parseFloat(item.price || 0) * parseInt(item.quantity || 0);
      productMap[pk].orders++;
    });
    // Discounts
    (o.discount_codes || []).forEach(dc => {
      const code = dc.code || 'UNKNOWN';
      if (!discountMap[code]) discountMap[code] = { code, uses: 0, amount: 0 };
      discountMap[code].uses++;
      discountMap[code].amount += parseFloat(dc.amount || 0);
    });
    // Geography
    const addr = o.shipping_address || o.billing_address || {};
    const city = addr.city || 'Unknown';
    const state = addr.province || addr.province_code || 'Unknown';
    if (!cityMap[city]) cityMap[city] = { city, orders: 0, revenue: 0 };
    cityMap[city].orders++; cityMap[city].revenue += parseFloat(o.total_price || 0);
    if (!stateMap[state]) stateMap[state] = { state, orders: 0, revenue: 0 };
    stateMap[state].orders++; stateMap[state].revenue += parseFloat(o.total_price || 0);
  });
  const cancelled = orders.filter(o => o.cancelled_at).length;
  const pending = active.filter(o => !o.fulfillment_status || o.fulfillment_status === 'partial').length;
  const fulfilled = active.filter(o => o.fulfillment_status === 'fulfilled').length;
  const withDiscount = active.filter(o => parseFloat(o.total_discounts || 0) > 0).length;
  const freeShipping = active.filter(o => (o.shipping_lines||[]).every(sl => parseFloat(sl.price||0) === 0)).length;
  return {
    active, count, gmv, netRev, discount, tax, shipping, aov, units,
    newCust, retCust, codOrders, prepaidOrders,
    cancelled, pending, fulfilled,
    withDiscount, freeShipping,
    topProducts: Object.values(productMap).sort((a,b)=>b.revenue-a.revenue).slice(0,15),
    allProducts: Object.values(productMap),
    topDiscounts: Object.values(discountMap).sort((a,b)=>b.uses-a.uses).slice(0,10),
    topCities: Object.values(cityMap).sort((a,b)=>b.orders-a.orders).slice(0,15),
    topStates: Object.values(stateMap).sort((a,b)=>b.orders-a.orders).slice(0,15),
  };
}

async function fetchShopifyData(todayStr, yesterdayStr) {
  try {
    const API = '/admin/api/2024-01';
    const PERIOD_START = '2026-04-01T00:00:00+05:30';
    const todayStart   = todayStr + 'T00:00:00+05:30';
    const yesterdayStart = yesterdayStr + 'T00:00:00+05:30';
    const nowISO = new Date().toISOString();

    const ORDER_FIELDS = 'id,created_at,total_price,subtotal_price,total_discounts,total_tax,shipping_lines,financial_status,fulfillment_status,customer,line_items,discount_codes,cancel_reason,cancelled_at,payment_gateway,shipping_address,billing_address';

    console.log('    📦 Fetching Shopify orders (Apr 1 → now)...');

    // Fetch all orders Apr 1 to now + abandoned checkouts in parallel
    const [allOrders, abandonedCheckouts] = await Promise.all([
      shopifyFetchAllPaged(`${API}/orders.json?status=any&created_at_min=${encodeURIComponent(PERIOD_START)}&created_at_max=${encodeURIComponent(nowISO)}&fields=${ORDER_FIELDS}`, 'orders'),
      shopifyFetchAllPaged(`${API}/checkouts.json?created_at_min=${encodeURIComponent(todayStart)}&fields=id,created_at,total_price,line_items,completed_at,email`, 'checkouts'),
    ]);

    console.log(`    ✅ ${allOrders.length} total orders fetched`);

    // Split into today / yesterday / period
    const todayOrders     = allOrders.filter(o => o.created_at >= todayStart);
    const yesterdayOrders = allOrders.filter(o => o.created_at >= yesterdayStart && o.created_at < todayStart);
    const periodOrders    = allOrders; // Apr 1 to now

    // Process each slice
    const today  = processOrdersBatch(todayOrders);
    const prev   = processOrdersBatch(yesterdayOrders);
    const period = processOrdersBatch(periodOrders);

    // ── Hourly breakdown (today, IST) ─────────────────────────────────────
    const hourlyOrders = {};
    for (let h = 0; h < 24; h++) hourlyOrders[h] = { orders: 0, revenue: 0 };
    today.active.forEach(o => {
      const h = new Date(new Date(o.created_at).getTime() + 5.5*3600000).getUTCHours();
      hourlyOrders[h].orders++;
      hourlyOrders[h].revenue += parseFloat(o.total_price || 0);
    });
    const peakHour = Object.entries(hourlyOrders).sort((a,b)=>b[1].orders-a[1].orders)[0];

    // ── Daily trend (Apr 1 to today) ─────────────────────────────────────
    const dailyMap = {};
    const ensureDay = d => {
      if (!dailyMap[d]) dailyMap[d] = { date:d, orders:0, gmv:0, newCust:0, retCust:0, units:0, discount:0, cod:0, prepaid:0, tax:0, shipping:0, fulfilled:0, freeShip:0, cancelled:0 };
    };
    periodOrders.filter(o => !o.cancelled_at).forEach(o => {
      const d = o.created_at.slice(0,10);
      ensureDay(d);
      dailyMap[d].orders++;
      dailyMap[d].gmv += parseFloat(o.total_price || 0);
      dailyMap[d].discount += parseFloat(o.total_discounts || 0);
      dailyMap[d].tax += parseFloat(o.total_tax || 0);
      dailyMap[d].shipping += (o.shipping_lines||[]).reduce((s,sl)=>s+parseFloat(sl.price||0),0);
      if (o.fulfillment_status === 'fulfilled') dailyMap[d].fulfilled++;
      if ((o.shipping_lines||[]).every(sl=>parseFloat(sl.price||0)===0)) dailyMap[d].freeShip++;
      const gw = (o.payment_gateway||'').toLowerCase();
      if (gw.includes('cod')||gw.includes('cash')) dailyMap[d].cod++;
      else dailyMap[d].prepaid++;
      if (o.customer && o.customer.orders_count <= 1) dailyMap[d].newCust++;
      else dailyMap[d].retCust++;
      (o.line_items||[]).forEach(item => { dailyMap[d].units += parseInt(item.quantity||0); });
    });
    periodOrders.filter(o => o.cancelled_at).forEach(o => {
      const d = o.created_at.slice(0,10);
      ensureDay(d);
      dailyMap[d].cancelled++;
    });
    const dailyTrend = Object.values(dailyMap).sort((a,b)=>a.date.localeCompare(b.date));

    // ── Abandoned checkouts ───────────────────────────────────────────────
    const openAbandoned = abandonedCheckouts.filter(c => !c.completed_at);
    const abandonedCount = openAbandoned.length;
    const abandonedValue = openAbandoned.reduce((s,c) => s + parseFloat(c.total_price||0), 0);
    const totalCheckouts = abandonedCheckouts.length;
    const checkoutCompleteRate = totalCheckouts > 0 ? ((totalCheckouts-abandonedCount)/totalCheckouts*100) : 0;

    // ── Order value buckets ───────────────────────────────────────────────
    const buckets = {'<500':0,'500-1k':0,'1k-2k':0,'2k-5k':0,'>5k':0};
    period.active.forEach(o => {
      const v = parseFloat(o.total_price||0);
      if (v < 500) buckets['<500']++;
      else if (v < 1000) buckets['500-1k']++;
      else if (v < 2000) buckets['1k-2k']++;
      else if (v < 5000) buckets['2k-5k']++;
      else buckets['>5k']++;
    });

    // ── Best / worst day in period ────────────────────────────────────────
    const bestDay  = [...dailyTrend].sort((a,b)=>b.gmv-a.gmv)[0];
    const worstDay = [...dailyTrend].filter(d=>d.orders>0).sort((a,b)=>a.gmv-b.gmv)[0];
    const avgDailyGmv    = dailyTrend.length > 0 ? period.gmv / dailyTrend.length : 0;
    const avgDailyOrders = dailyTrend.length > 0 ? period.count / dailyTrend.length : 0;

    // ── Cumulative GMV for sparkline ──────────────────────────────────────
    let cumGmv = 0;
    const cumulativeGmv = dailyTrend.map(d => { cumGmv += d.gmv; return { date: d.date, cumGmv }; });

    // ── Products with zero sales (from all period products) ───────────────
    // We can't know total catalogue here without extra API call — skip for now

    // ── Change % today vs yesterday ───────────────────────────────────────
    const gmvChange     = prev.gmv > 0     ? ((today.gmv - prev.gmv) / prev.gmv * 100) : 0;
    const ordersChange  = prev.count > 0   ? ((today.count - prev.count) / prev.count * 100) : 0;
    const aovChange     = prev.aov > 0     ? ((today.aov - prev.aov) / prev.aov * 100) : 0;
    const newCustChange = prev.newCust > 0 ? ((today.newCust - prev.newCust) / prev.newCust * 100) : 0;

    return {
      // ── TODAY ─────────────────────────────────────────────────────────
      orderCount:       today.count,
      gmv:              today.gmv,
      netRevenue:       today.netRev,
      aov:              today.aov,
      totalUnits:       today.units,
      totalDiscount:    today.discount,
      discountRate:     today.count > 0 ? (today.withDiscount / today.count * 100) : 0,
      newCustomers:     today.newCust,
      returningCustomers: today.retCust,
      pendingFulfillment: today.pending,
      fulfilledOrders:  today.fulfilled,
      cancelledToday:   today.cancelled,
      codOrders:        today.codOrders,
      prepaidOrders:    today.prepaidOrders,
      taxCollected:     today.tax,
      shippingRevenue:  today.shipping,
      freeShippingOrders: today.freeShipping,
      refundAmount:     0, // separate call removed for speed
      topProducts:      today.topProducts,
      topDiscounts:     today.topDiscounts,
      topCities:        today.topCities,
      topStates:        today.topStates,
      hourlyOrders,
      peakHour:         peakHour ? { hour: peakHour[0], orders: peakHour[1].orders, revenue: peakHour[1].revenue } : null,

      // ── ABANDONED ─────────────────────────────────────────────────────
      abandonedCount, abandonedValue, checkoutCompleteRate,

      // ── YESTERDAY COMPARISON ──────────────────────────────────────────
      prevGmv:    prev.gmv,
      prevCount:  prev.count,
      prevAov:    prev.aov,
      gmvChange, ordersChange, aovChange, newCustChange,

      // ── PERIOD (Apr 1 → today) ────────────────────────────────────────
      periodGmv:          period.gmv,
      periodOrders:       period.count,
      periodAov:          period.aov,
      periodUnits:        period.units,
      periodNetRev:       period.netRev,
      periodDiscount:     period.discount,
      periodTax:          period.tax,
      periodShipping:     period.shipping,
      periodNewCust:      period.newCust,
      periodRetCust:      period.retCust,
      periodCodOrders:    period.codOrders,
      periodPrepaid:      period.prepaidOrders,
      periodCancelled:    period.cancelled,
      periodTopProducts:  period.topProducts,
      periodTopDiscounts: period.topDiscounts,
      periodTopCities:    period.topCities,
      periodTopStates:    period.topStates,
      periodAllProducts:  period.allProducts,
      avgDailyGmv, avgDailyOrders,
      bestDay, worstDay,
      dailyTrend, cumulativeGmv,
      orderValueBuckets: buckets,
      periodDays:         dailyTrend.length,
      repeatRate:         period.count > 0 ? (period.retCust / period.count * 100) : 0,
      cancelRate:         (period.count + period.cancelled) > 0 ? (period.cancelled / (period.count + period.cancelled) * 100) : 0,
      codRate:            period.count > 0 ? (period.codOrders / period.count * 100) : 0,
      freeShipRate:       period.count > 0 ? (period.freeShipping / period.count * 100) : 0,
      avgDiscountPct:     period.gmv > 0 ? (period.discount / (period.gmv + period.discount) * 100) : 0,
    };
  } catch(e) {
    console.log('⚠️  Shopify fetch error:', e.message);
    return null;
  }
}

// ─── AMAZON API ───────────────────────────────────────────────────────────────
async function fetchAmazonData(dateStr) {
  if (!AMAZON_CLIENT_ID || !AMAZON_REFRESH_TOKEN) {
    console.log('  Amazon: no credentials, skipping');
    return null;
  }
  try {
    const AMZN_ENDPOINT = AMAZON_API_ENDPOINT || 'advertising-api-eu.amazon.com';
    const AMZN_PROFILE  = AMAZON_PROFILE_ID   || '2924755564335076';
    const HISTORY_START_AMZN = '2026-04-01';

    // 1. Get Access Token
    const authBody = 'grant_type=refresh_token&client_id=' + AMAZON_CLIENT_ID + '&client_secret=' + AMAZON_CLIENT_SECRET + '&refresh_token=' + AMAZON_REFRESH_TOKEN;
    const tokenRes = await new Promise((resolve, reject) => {
      const req = https.request({ hostname: 'api.amazon.com', path: '/auth/o2/token', method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(authBody) } }, res => {
        let d = ''; res.on('data', chunk => d += chunk); res.on('end', () => resolve(JSON.parse(d)));
      });
      req.on('error', reject); req.write(authBody); req.end();
    });
    if (!tokenRes.access_token) { console.log('  Amazon token failed'); return null; }
    const amznToken = tokenRes.access_token;

    const amznHdrs = { 'Authorization': 'Bearer ' + amznToken, 'Amazon-Advertising-API-ClientId': AMAZON_CLIENT_ID, 'Amazon-Advertising-API-Scope': AMZN_PROFILE, 'Content-Type': 'application/json' };
    function amznReq(method, path, body) {
      return new Promise((resolve, reject) => {
        const b = body ? JSON.stringify(body) : null;
        const hdrs = Object.assign({}, amznHdrs);
        if (b) hdrs['Content-Length'] = Buffer.byteLength(b);
        const r = https.request({ hostname: AMZN_ENDPOINT, path, method, headers: hdrs }, res => {
          let d = ''; res.on('data', chunk => d += chunk); res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve({}); } });
        });
        r.on('error', reject); if (b) r.write(b); r.end();
      });
    }

    // 2. Request SP + SD reports (async reporting API)
    const [spRes, sdRes] = await Promise.all([
      amznReq('POST', '/reporting/reports', { name: 'sp_daily', startDate: HISTORY_START_AMZN, endDate: dateStr, configuration: { adProduct: 'SPONSORED_PRODUCTS', groupBy: ['campaign'], columns: ['date','campaignName','impressions','clicks','cost','purchases14d','sales14d'], reportTypeId: 'spCampaigns', timeUnit: 'DAILY', format: 'GZIP_JSON' } }),
      amznReq('POST', '/reporting/reports', { name: 'sd_daily', startDate: HISTORY_START_AMZN, endDate: dateStr, configuration: { adProduct: 'SPONSORED_DISPLAY', groupBy: ['campaign'], columns: ['date','campaignName','impressions','clicks','cost','sales','unitsSold','detailPageViews'], reportTypeId: 'sdCampaigns', timeUnit: 'DAILY', format: 'GZIP_JSON' } }),
    ]);
    const spReportId = spRes.reportId, sdReportId = sdRes.reportId;
    console.log('  Amazon SP reportId: ' + (spReportId || 'FAIL') + ' | SD: ' + (sdReportId || 'FAIL'));

    // 3. Poll until COMPLETED (max 5min, 10s intervals)
    async function pollReport(reportId, label) {
      if (!reportId) return [];
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 10000));
        const status = await amznReq('GET', '/reporting/reports/' + reportId);
        if (status.status === 'COMPLETED' && status.url) {
          const zlib = require('zlib');
          const rows = await new Promise((resolve, reject) => {
            https.get(status.url, res => {
              const gunzip = zlib.createGunzip();
              res.pipe(gunzip);
              let d = ''; gunzip.on('data', chunk => d += chunk);
              gunzip.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve([]); } });
            }).on('error', reject);
          });
          console.log('  Amazon ' + label + ': ' + rows.length + ' rows downloaded');
          return rows;
        }
        if (status.status === 'FAILED') { console.log('  Amazon ' + label + ' FAILED'); return []; }
      }
      console.log('  Amazon ' + label + ' timed out'); return [];
    }
    const [spRows, sdRows] = await Promise.all([pollReport(spReportId, 'SP'), pollReport(sdReportId, 'SD')]);

    // 4. Aggregate per-day
    const allDailyAmzn = {};
    spRows.forEach(row => {
      const d = row.date;
      if (!allDailyAmzn[d]) allDailyAmzn[d] = { spend:0, revenue:0, orders:0, impressions:0, clicks:0 };
      allDailyAmzn[d].spend += parseFloat(row.cost||0); allDailyAmzn[d].revenue += parseFloat(row.sales14d||0);
      allDailyAmzn[d].orders += parseFloat(row.purchases14d||0); allDailyAmzn[d].impressions += parseInt(row.impressions||0); allDailyAmzn[d].clicks += parseInt(row.clicks||0);
    });
    sdRows.forEach(row => {
      const d = row.date;
      if (!allDailyAmzn[d]) allDailyAmzn[d] = { spend:0, revenue:0, orders:0, impressions:0, clicks:0 };
      allDailyAmzn[d].spend += parseFloat(row.cost||0); allDailyAmzn[d].revenue += parseFloat(row.sales||0);
      allDailyAmzn[d].impressions += parseInt(row.impressions||0); allDailyAmzn[d].clicks += parseInt(row.clicks||0);
    });

    // 5. Campaign summary
    const campMap = {};
    spRows.forEach(row => {
      const k = row.campaignName || 'Unknown';
      if (!campMap[k]) campMap[k] = { name:k, spend:0, revenue:0, orders:0, impressions:0, clicks:0 };
      campMap[k].spend += parseFloat(row.cost||0); campMap[k].revenue += parseFloat(row.sales14d||0);
      campMap[k].orders += parseFloat(row.purchases14d||0); campMap[k].impressions += parseInt(row.impressions||0); campMap[k].clicks += parseInt(row.clicks||0);
    });
    const campaigns = Object.values(campMap).map(camp => ({ ...camp, roas: camp.spend>0&&camp.revenue>0?camp.revenue/camp.spend:0, cpa: camp.orders>0?camp.spend/camp.orders:0, ctr: camp.impressions>0?camp.clicks/camp.impressions*100:0 })).sort((a,b)=>b.spend-a.spend);

    const totalSpend = Object.values(allDailyAmzn).reduce((s,d)=>s+(d.spend||0),0);
    const totalRevenue = Object.values(allDailyAmzn).reduce((s,d)=>s+(d.revenue||0),0);
    const totalOrders = Object.values(allDailyAmzn).reduce((s,d)=>s+(d.orders||0),0);
    const todayData = allDailyAmzn[dateStr] || {};

    return {
      connected: true,
      spend: todayData.spend||0, revenue: todayData.revenue||0, orders: todayData.orders||0,
      roas: (todayData.spend>0&&todayData.revenue>0) ? todayData.revenue/todayData.spend : 0,
      impressions: todayData.impressions||0, clicks: todayData.clicks||0,
      totalSpend, totalRevenue, totalOrders,
      totalRoas: totalSpend>0&&totalRevenue>0 ? totalRevenue/totalSpend : 0,
      campaigns, allDailyAmzn, marketplace: 'Amazon.in', currency: 'INR',
    };
  } catch(e) {
    console.log('Amazon fetch error:', e.message);
    return null;
  }
}

// Google Sheets removed — stub kept to avoid reference errors in unreachable code
async function getGoogleToken() { return null; }

// ─── META API ─────────────────────────────────────────────────────────────────
const CORE_FIELDS = [
  'spend','impressions','reach','frequency','clicks','unique_clicks',
  'ctr','unique_ctr','cpc','cpm','cpp',
  'actions','action_values','cost_per_action_type',
  'outbound_clicks','outbound_clicks_ctr','cost_per_outbound_click',
  'inline_link_clicks','inline_link_click_ctr',
  'video_avg_time_watched_actions','video_p25_watched_actions',
  'video_p50_watched_actions','video_p75_watched_actions','video_p100_watched_actions',
  'video_play_actions',
  'quality_ranking','engagement_rate_ranking','conversion_rate_ranking',
  'objective','buying_type','optimization_goal',
  'account_name','campaign_name','campaign_id','adset_name','adset_id',
  'ad_name','ad_id','date_start','date_stop'
].join(',');

async function metaFetch(level, breakdowns, datePreset, extraParams = '') {
  let allData = [];
  let url = `https://graph.facebook.com/v21.0/${AD_ACCOUNT}/insights?access_token=${META_TOKEN}&fields=${CORE_FIELDS}&level=${level}${datePreset ? '&date_preset=' + datePreset : ''}&limit=500${breakdowns ? '&breakdowns=' + breakdowns : ''}${extraParams}`;
  while (url) {
    const res = await httpsGet(url);
    if (res.error) { console.error('Meta API error:', res.error.message); break; }
    if (res.data) allData = allData.concat(res.data);
    url = res.paging && res.paging.next ? res.paging.next : null;
  }
  return allData;
}

function getAction(actions, type) {
  if (!actions) return '0';
  const a = actions.find(x => x.action_type === type);
  return a ? a.value : '0';
}

// ─── FORMAT HELPERS ───────────────────────────────────────────────────────────
const USD_TO_INR = 1;
const fmt = n => parseInt(n || 0).toLocaleString();
const fmtD = (n, d = 2) => parseFloat(n || 0).toFixed(d);
const dollar = n => `₹${parseFloat(n || 0).toFixed(2)}`;
const roasStr = r => r > 0 ? `${r.toFixed(2)}x` : '0x';

function campAction(c) {
  if (c.spend > 50 && c.purchases === 0 && c.leads === 0) return '🛑 PAUSE - No Conversions';
  if (c.roas >= 3.0) return '🚀 SCALE UP - High ROAS';
  if (c.roas >= 2.0) return '📈 SCALE UP';
  if (c.roas >= 1.0) return '✅ MONITOR';
  if (c.roas > 0 && c.roas < 1.0) return '⚠️ OPTIMIZE / CUT BUDGET';
  if (c.frequency > 4.0) return '🔄 REFRESH CREATIVE';
  if (c.spend < 10) return '👀 TESTING';
  return '✅ MONITOR';
}

function creativeStatus(a) {
  const freq = parseFloat(a.frequency || 0);
  const roas = parseFloat(a.spend || 0) > 0 && getAction(a.action_values, 'purchase') > 0
    ? parseFloat(getAction(a.action_values, 'purchase')) / parseFloat(a.spend) : 0;
  const qr = a.quality_ranking || '';
  if (freq > 4.0) return '⚠️ CREATIVE FATIGUE';
  if (roas >= 2.0) return '🏆 TOP PERFORMER';
  if (qr === 'ABOVE_AVERAGE') return '✅ GOOD QUALITY';
  if (qr && qr.includes('BELOW_AVERAGE')) return '❌ LOW QUALITY';
  if (parseFloat(a.spend || 0) < 10) return '👀 TESTING';
  return '✅ ACTIVE';
}

function fatigueScore(freq, ctr, avgCtr) {
  const freqScore = Math.min(freq / 5 * 50, 50);
  const ctrDecay = avgCtr > 0 ? Math.max(0, (1 - ctr / avgCtr) * 50) : 0;
  return Math.round(freqScore + ctrDecay);
}

function daysUntilBurnout(freq) {
  if (freq >= 5) return 'BURNED OUT NOW';
  if (freq >= 4) return '1-3 days';
  if (freq >= 3) return '3-7 days';
  if (freq >= 2) return '7-14 days';
  return '14+ days';
}

function benchmarkGap(value, good, label) {
  if (value >= good) return `✅ ${label}: ${(value / good * 100).toFixed(0)}% of benchmark`;
  return `⚠️ ${label}: ${((good - value) / good * 100).toFixed(0)}% BELOW benchmark`;
}

// ─── GOOGLE SHEETS API ────────────────────────────────────────────────────────
async function setupSpreadsheet(token, title) {
  const id = MASTER_SPREADSHEET_ID;
  const info = await httpsGet(`https://sheets.googleapis.com/v4/spreadsheets/${id}?fields=sheets.properties&access_token=${token}`);
  const existing = (info.sheets || []).map(s => s.properties);
  const existingTitles = existing.map(s => s.title);

  const requests = [];

  // Step 1: Add all required tabs that are missing (need them before deleting, to avoid "last sheet" error)
  for (const tab of REQUIRED_TABS) {
    if (!existingTitles.includes(tab)) {
      requests.push({ addSheet: { properties: { title: tab } } });
    }
  }

  // Step 2: Delete any tabs NOT in REQUIRED_TABS (old tabs, Sheet2, etc.)
  for (const sheet of existing) {
    if (!REQUIRED_TABS.includes(sheet.title)) {
      requests.push({ deleteSheet: { sheetId: sheet.sheetId } });
    }
  }

  if (requests.length) await sheetsStructuralUpdate(token, id, requests);

  // Step 3: Update spreadsheet title
  await httpsPost('sheets.googleapis.com', `/v4/spreadsheets/${id}:batchUpdate`,
    { requests: [{ updateSpreadsheetProperties: { properties: { title }, fields: 'title' } }] },
    { Authorization: 'Bearer ' + token }
  );

  // Step 4: Clear all data from the required tabs
  const final = await httpsGet(`https://sheets.googleapis.com/v4/spreadsheets/${id}?fields=sheets.properties&access_token=${token}`);
  const finalSheets = (final.sheets || []).map(s => s.properties);
  if (finalSheets.length) {
    await httpsPost('sheets.googleapis.com', `/v4/spreadsheets/${id}/values:batchClear`,
      { ranges: finalSheets.map(s => `'${s.title}'!A1:ZZ10000`) },
      { Authorization: 'Bearer ' + token }
    );
  }

  const sheetMap = {};
  finalSheets.forEach(s => { sheetMap[s.title] = s.sheetId; });

  console.log(`✅ Spreadsheet ready with ${Object.keys(sheetMap).length} tabs`);
  return { id, sheetMap };
}

async function batchUpdate(token, spreadsheetId, data) {
  const res = await httpsPost('sheets.googleapis.com', `/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    { valueInputOption: 'RAW', data },
    { Authorization: 'Bearer ' + token }
  );
  if (res.error) console.error('Batch write error:', JSON.stringify(res.error));
  return res;
}

async function sheetsStructuralUpdate(token, spreadsheetId, requests) {
  const res = await httpsPost('sheets.googleapis.com', `/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    { requests }, { Authorization: 'Bearer ' + token }
  );
  if (res.error) console.error('Structural update error:', JSON.stringify(res.error));
  return res;
}

// ─── FORMATTING ───────────────────────────────────────────────────────────────
async function applyFormatting(token, spreadsheetId, sheetMap, trendRowCount, campRowCount) {
  const requests = [];

  const DARK_BG = { red: 0.18, green: 0.18, blue: 0.22 };
  const WHITE = { red: 1, green: 1, blue: 1 };
  const GREEN_BG = { red: 0.78, green: 0.94, blue: 0.80 };
  const YELLOW_BG = { red: 1, green: 0.95, blue: 0.70 };
  const RED_BG = { red: 1, green: 0.78, blue: 0.78 };

  for (const [title, sheetId] of Object.entries(sheetMap)) {
    if (sheetId === undefined || sheetId === null) continue;

    // Freeze row 1
    requests.push({
      updateSheetProperties: {
        properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
        fields: 'gridProperties.frozenRowCount'
      }
    });

    // Header row: dark background + white bold text
    requests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 26 },
        cell: {
          userEnteredFormat: {
            backgroundColor: DARK_BG,
            textFormat: { foregroundColor: WHITE, bold: true, fontSize: 10 },
            horizontalAlignment: 'CENTER',
            wrapStrategy: 'CLIP'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,wrapStrategy)'
      }
    });

    // Header row height
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
        properties: { pixelSize: 32 },
        fields: 'pixelSize'
      }
    });

    // Column A width
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 },
        properties: { pixelSize: 220 },
        fields: 'pixelSize'
      }
    });

    // Column B width
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 },
        properties: { pixelSize: 200 },
        fields: 'pixelSize'
      }
    });
  }

  // Conditional formatting for Campaign Performance (ROAS col F = index 5)
  const campId = sheetMap['📈 Campaign Performance'];
  if (campId !== undefined && campId !== null) {
    requests.push({ addConditionalFormatRule: { rule: {
      ranges: [{ sheetId: campId, startRowIndex: 1, endRowIndex: 500, startColumnIndex: 5, endColumnIndex: 6 }],
      booleanRule: { condition: { type: 'NUMBER_GREATER_THAN_EQ', values: [{ userEnteredValue: '2' }] }, format: { backgroundColor: GREEN_BG } }
    }, index: 0 }});
    requests.push({ addConditionalFormatRule: { rule: {
      ranges: [{ sheetId: campId, startRowIndex: 1, endRowIndex: 500, startColumnIndex: 5, endColumnIndex: 6 }],
      booleanRule: { condition: { type: 'NUMBER_BETWEEN', values: [{ userEnteredValue: '1' }, { userEnteredValue: '1.99' }] }, format: { backgroundColor: YELLOW_BG } }
    }, index: 1 }});
    requests.push({ addConditionalFormatRule: { rule: {
      ranges: [{ sheetId: campId, startRowIndex: 1, endRowIndex: 500, startColumnIndex: 5, endColumnIndex: 6 }],
      booleanRule: { condition: { type: 'NUMBER_LESS', values: [{ userEnteredValue: '1' }] }, format: { backgroundColor: RED_BG } }
    }, index: 2 }});
  }

  // Conditional formatting for Ad Set Intelligence (ROAS col F = index 5)
  const adsetId = sheetMap['🎯 Ad Set Intelligence'];
  if (adsetId !== undefined && adsetId !== null) {
    requests.push({ addConditionalFormatRule: { rule: {
      ranges: [{ sheetId: adsetId, startRowIndex: 1, endRowIndex: 500, startColumnIndex: 5, endColumnIndex: 6 }],
      booleanRule: { condition: { type: 'NUMBER_GREATER_THAN_EQ', values: [{ userEnteredValue: '2' }] }, format: { backgroundColor: GREEN_BG } }
    }, index: 0 }});
    requests.push({ addConditionalFormatRule: { rule: {
      ranges: [{ sheetId: adsetId, startRowIndex: 1, endRowIndex: 500, startColumnIndex: 5, endColumnIndex: 6 }],
      booleanRule: { condition: { type: 'NUMBER_LESS', values: [{ userEnteredValue: '1' }] }, format: { backgroundColor: RED_BG } }
    }, index: 1 }});
  }

  // Chart: 30-Day Trend line chart
  const trendId = sheetMap['📅 30-Day Trend Analysis'];
  if (trendId !== undefined && trendId !== null && trendRowCount > 0) {
    const endRow = trendRowCount + 4;
    requests.push({ addChart: { chart: {
      spec: {
        title: '30-Day Spend & ROAS Trend',
        basicChart: {
          chartType: 'LINE',
          legendPosition: 'BOTTOM_LEGEND',
          axis: [
            { position: 'BOTTOM_AXIS', title: 'Date' },
            { position: 'LEFT_AXIS', title: 'Daily Spend ($)' },
            { position: 'RIGHT_AXIS', title: 'ROAS (x)' }
          ],
          domains: [{
            domain: { sourceRange: { sources: [{ sheetId: trendId, startRowIndex: 3, endRowIndex: endRow, startColumnIndex: 0, endColumnIndex: 1 }] } }
          }],
          series: [
            { series: { sourceRange: { sources: [{ sheetId: trendId, startRowIndex: 3, endRowIndex: endRow, startColumnIndex: 1, endColumnIndex: 2 }] } }, targetAxis: 'LEFT_AXIS', color: { red: 0.27, green: 0.51, blue: 0.91 } },
            { series: { sourceRange: { sources: [{ sheetId: trendId, startRowIndex: 3, endRowIndex: endRow, startColumnIndex: 3, endColumnIndex: 4 }] } }, targetAxis: 'RIGHT_AXIS', color: { red: 0.18, green: 0.72, blue: 0.42 } }
          ],
          headerCount: 1
        }
      },
      position: { overlayPosition: {
        anchorCell: { sheetId: trendId, rowIndex: endRow + 2, columnIndex: 0 },
        widthPixels: 900, heightPixels: 400
      }}
    }}});
  }

  // Chart: Campaign Performance bar chart (ROAS by campaign)
  if (campId !== undefined && campId !== null && campRowCount > 0) {
    const endRow = Math.min(campRowCount + 1, 12);
    requests.push({ addChart: { chart: {
      spec: {
        title: 'ROAS by Campaign (Top 10)',
        basicChart: {
          chartType: 'BAR',
          legendPosition: 'NO_LEGEND',
          axis: [
            { position: 'BOTTOM_AXIS', title: 'ROAS' },
            { position: 'LEFT_AXIS', title: 'Campaign' }
          ],
          domains: [{
            domain: { sourceRange: { sources: [{ sheetId: campId, startRowIndex: 1, endRowIndex: endRow, startColumnIndex: 1, endColumnIndex: 2 }] } }
          }],
          series: [{
            series: { sourceRange: { sources: [{ sheetId: campId, startRowIndex: 1, endRowIndex: endRow, startColumnIndex: 5, endColumnIndex: 6 }] } },
            targetAxis: 'BOTTOM_AXIS',
            color: { red: 0.27, green: 0.51, blue: 0.91 }
          }],
          headerCount: 0
        }
      },
      position: { overlayPosition: {
        anchorCell: { sheetId: campId, rowIndex: campRowCount + 3, columnIndex: 0 },
        widthPixels: 800, heightPixels: 380
      }}
    }}});
  }

  // Chart: Funnel Analysis column chart
  const funnelId = sheetMap['🔻 Funnel Analysis'];
  if (funnelId !== undefined && funnelId !== null) {
    requests.push({ addChart: { chart: {
      spec: {
        title: 'Conversion Funnel Volume',
        basicChart: {
          chartType: 'COLUMN',
          legendPosition: 'NO_LEGEND',
          axis: [{ position: 'BOTTOM_AXIS', title: 'Stage' }, { position: 'LEFT_AXIS', title: 'Volume' }],
          domains: [{ domain: { sourceRange: { sources: [{ sheetId: funnelId, startRowIndex: 6, endRowIndex: 12, startColumnIndex: 0, endColumnIndex: 1 }] } } }],
          series: [{ series: { sourceRange: { sources: [{ sheetId: funnelId, startRowIndex: 6, endRowIndex: 12, startColumnIndex: 1, endColumnIndex: 2 }] } }, targetAxis: 'LEFT_AXIS', color: { red: 0.27, green: 0.51, blue: 0.91 } }],
          headerCount: 0
        }
      },
      position: { overlayPosition: {
        anchorCell: { sheetId: funnelId, rowIndex: 14, columnIndex: 0 },
        widthPixels: 700, heightPixels: 350
      }}
    }}});
  }

  // Chart: Device & Platform pie chart
  const deviceId = sheetMap['📱 Device & Platform'];
  if (deviceId !== undefined && deviceId !== null) {
    requests.push({ addChart: { chart: {
      spec: {
        title: 'Spend Share by Platform',
        pieChart: {
          legendPosition: 'RIGHT_LEGEND',
          domain: { sourceRange: { sources: [{ sheetId: deviceId, startRowIndex: 4, endRowIndex: 14, startColumnIndex: 1, endColumnIndex: 2 }] } },
          series: { sourceRange: { sources: [{ sheetId: deviceId, startRowIndex: 4, endRowIndex: 14, startColumnIndex: 4, endColumnIndex: 5 }] } },
          threeDimensional: false
        }
      },
      position: { overlayPosition: {
        anchorCell: { sheetId: deviceId, rowIndex: 18, columnIndex: 0 },
        widthPixels: 600, heightPixels: 350
      }}
    }}});
  }

  if (requests.length) {
    console.log(`🎨 Applying ${requests.length} formatting/chart requests...`);
    await sheetsStructuralUpdate(token, spreadsheetId, requests);
    console.log('✅ Formatting applied');
  }
}

// ─── DRIVE PERMISSION GRANT ───────────────────────────────────────────────────
async function grantDrivePermission(token, fileId, email, role = 'writer') {
  return new Promise((resolve, reject) => {
    const isOwner = role === 'owner';
    const qs = isOwner
      ? '?transferOwnership=true&sendNotificationEmail=true'
      : '?sendNotificationEmail=false';
    const body = JSON.stringify({ role, type: 'user', emailAddress: email });
    const req = https.request({
      hostname: 'www.googleapis.com',
      path: `/drive/v3/files/${fileId}/permissions${qs}`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve(d); } });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  const now = new Date();
  // Use IST (UTC+5:30) — if before 1am IST fall back to yesterday to avoid empty data
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  const istHour = istNow.getUTCHours();
  const useToday = istHour >= 1; // after 1am IST we have meaningful today data

  const todayDate = new Date(now); todayDate.setUTCHours(0,0,0,0);
  const yesterdayDate = new Date(todayDate); yesterdayDate.setDate(todayDate.getDate() - 1);

  const dateStr      = (useToday ? todayDate : yesterdayDate).toISOString().split('T')[0];
  const prevDayStr   = (useToday ? yesterdayDate : new Date(yesterdayDate.getTime() - 86400000)).toISOString().split('T')[0];
  const activeDatePreset = useToday ? 'today' : 'yesterday';

  const reportTitle = `Meta Ads Live Report - ${dateStr} ${istNow.getUTCHours().toString().padStart(2,'0')}:${istNow.getUTCMinutes().toString().padStart(2,'0')} IST`;
  console.log(`\n🚀 Starting Real-Time Meta Ads Report — ${dateStr} (${activeDatePreset})\n`);

  console.log('📊 Fetching Meta Ads data (12 API calls in parallel)...');
  const prevDayRange = `&time_range={"since":"${prevDayStr}","until":"${prevDayStr}"}`;
  const [
    accountData, campaignData, adsetData, adData,
    demoAgeGender, demoCountry, placements, deviceData,
    trends7d, trends30d, hourlyData,
    accountData7d, accountData30d, campaignData7d, campaignData30d,
    prevDayCampaignData, prevDayAccountData
  ] = await Promise.all([
    metaFetch('account', '', activeDatePreset),
    metaFetch('campaign', '', activeDatePreset),
    metaFetch('adset', '', activeDatePreset),
    metaFetch('ad', '', activeDatePreset),
    metaFetch('ad', 'age,gender', activeDatePreset),
    metaFetch('campaign', 'country', activeDatePreset),
    metaFetch('campaign', 'publisher_platform,platform_position,impression_device', activeDatePreset),
    metaFetch('campaign', 'device_platform', activeDatePreset),
    metaFetch('account', '', 'last_7d', '&time_increment=1'),
    metaFetch('account', '', 'last_30d', '&time_increment=1'),
    metaFetch('account', 'hourly_stats_aggregated_by_advertiser_time_zone', activeDatePreset),
    metaFetch('account', '', 'last_7d'),
    metaFetch('account', '', 'last_30d'),
    metaFetch('campaign', '', 'last_7d'),
    metaFetch('campaign', '', 'last_30d'),
    metaFetch('campaign', '', null, prevDayRange),
    metaFetch('account', '', null, prevDayRange),
  ]);
  console.log(`✅ Data: ${campaignData.length} campaigns, ${adsetData.length} ad sets, ${adData.length} ads, ${hourlyData.length} hourly points\n`);

  // ── SHOPIFY DATA ──────────────────────────────────────────────────────────
  console.log('🛍️  Fetching Shopify data...');
  const shopifyData = await fetchShopifyData(dateStr, prevDayStr);
  if (shopifyData) {
    console.log(`✅ Shopify: ${shopifyData.orderCount} orders, GMV ₹${shopifyData.gmv.toFixed(0)}, ${shopifyData.abandonedCount} abandoned\n`);
  } else {
    console.log('⚠️  Shopify data unavailable — continuing with Meta only\n');
  }

  // ── AMAZON DATA ───────────────────────────────────────────────────────────
  console.log('📦 Fetching Amazon data...');
  const amazonData = await fetchAmazonData(dateStr);
  if (amazonData) {
    console.log(`✅ Amazon: ${amazonData.orders} orders, Revenue ₹${amazonData.revenue}, Spend ₹${amazonData.spend}\n`);
  } else {
    console.log('⚠️  Amazon data unavailable\n');
  }

  const spreadsheetUrl = '';  // Sheets removed; kept for generateDashboard() param compatibility

  // ── SHARED CALCULATIONS ───────────────────────────────────────────────────
  const acc = accountData[0] || {};
  const accPurchases = parseFloat(getAction(acc.actions, 'purchase') || 0);
  const accRevenue = parseFloat(getAction(acc.action_values, 'purchase') || 0);
  const accLeads = parseFloat(getAction(acc.actions, 'lead') || 0);
  const accLpv = parseFloat(getAction(acc.actions, 'landing_page_view') || 0);
  const accAtc = parseFloat(getAction(acc.actions, 'add_to_cart') || 0);
  const accCheckout = parseFloat(getAction(acc.actions, 'initiate_checkout') || 0);
  const accClicks = parseInt(acc.clicks || 0);
  const accImpressions = parseInt(acc.impressions || 0);
  const accReach = parseInt(acc.reach || 0);
  const yesterdaySpend = parseFloat(acc.spend || 0);
  const accRoas = yesterdaySpend > 0 && accRevenue > 0 ? accRevenue / yesterdaySpend : 0;
  const accCpa = accPurchases > 0 ? yesterdaySpend / accPurchases : 0;
  const accFreq = parseFloat(acc.frequency || 0);
  const accCtr = parseFloat(acc.ctr || 0);
  const accCpc = parseFloat(acc.cpc || 0);
  const accCpm = parseFloat(acc.cpm || 0);

  // ── PREV DAY (2 days ago) ─────────────────────────────────────────────────
  const prevDayAccData = prevDayAccountData[0] || {};
  const prevDayAccSpend = parseFloat(prevDayAccData.spend || 0);
  const prevDayAccRevenue = parseFloat(getAction(prevDayAccData.action_values, 'purchase') || 0);
  const prevDayAccPurchases = parseFloat(getAction(prevDayAccData.actions, 'purchase') || 0);
  const prevDayAccRoas = prevDayAccSpend > 0 && prevDayAccRevenue > 0 ? prevDayAccRevenue / prevDayAccSpend : 0;
  const prevDayCampMap = {};
  prevDayCampaignData.forEach(c => {
    const spend = parseFloat(c.spend || 0);
    const revenue = parseFloat(getAction(c.action_values, 'purchase') || 0);
    const purchases = parseFloat(getAction(c.actions, 'purchase') || 0);
    const roas = spend > 0 && revenue > 0 ? revenue / spend : 0;
    prevDayCampMap[c.campaign_id] = { spend, revenue, purchases, roas };
  });
  const dayDiff = (curr, prev) => {
    if (!prev || prev === 0) return curr > 0 ? '+100%' : '—';
    const pct = ((curr - prev) / prev * 100).toFixed(1);
    return `${pct > 0 ? '+' : ''}${pct}%`;
  };

  const total7Spend = trends7d.reduce((s, d) => s + parseFloat(d.spend || 0), 0);
  const avg7Spend = total7Spend / (trends7d.length || 1);
  const total30Spend = trends30d.reduce((s, d) => s + parseFloat(d.spend || 0), 0);
  const avg30Spend = total30Spend / (trends30d.length || 1);
  const spendVsAvg7 = avg7Spend > 0 ? ((yesterdaySpend - avg7Spend) / avg7Spend * 100).toFixed(1) : '0';

  const avg7Roas = (() => {
    let totalRev = 0, totalSpend = 0;
    trends7d.forEach(d => { totalRev += parseFloat(getAction(d.action_values, 'purchase') || 0); totalSpend += parseFloat(d.spend || 0); });
    return totalSpend > 0 ? (totalRev / totalSpend).toFixed(2) : '0';
  })();

  const campsEnriched = campaignData.map(c => {
    const purchases = parseFloat(getAction(c.actions, 'purchase') || 0);
    const revenue = parseFloat(getAction(c.action_values, 'purchase') || 0);
    const spend = parseFloat(c.spend || 0);
    const leads = parseFloat(getAction(c.actions, 'lead') || 0);
    const roas = spend > 0 && revenue > 0 ? revenue / spend : 0;
    const cpa = purchases > 0 ? spend / purchases : 0;
    return {
      id: c.campaign_id, name: c.campaign_name, objective: c.objective || '',
      spend, revenue, purchases, leads, roas, cpa,
      impressions: parseInt(c.impressions || 0), reach: parseInt(c.reach || 0),
      frequency: parseFloat(c.frequency || 0), clicks: parseInt(c.clicks || 0),
      ctr: parseFloat(c.ctr || 0), cpc: parseFloat(c.cpc || 0), cpm: parseFloat(c.cpm || 0),
      lpv: parseFloat(getAction(c.actions, 'landing_page_view') || 0),
      atc: parseFloat(getAction(c.actions, 'add_to_cart') || 0),
      checkout: parseFloat(getAction(c.actions, 'initiate_checkout') || 0),
      linkClicks: parseInt(getAction(c.actions, 'link_click') || 0),
      qualityRank: c.quality_ranking || 'N/A',
      engRank: c.engagement_rate_ranking || 'N/A',
      convRank: c.conversion_rate_ranking || 'N/A',
      buyingType: c.buying_type || 'N/A', date: c.date_start
    };
  }).sort((a, b) => b.spend - a.spend);

  const bestRoas = [...campsEnriched].sort((a, b) => b.roas - a.roas)[0];
  const highSpendNoConv = campsEnriched.filter(c => c.spend > 50 && c.purchases === 0 && c.leads === 0);
  const scaleUp = campsEnriched.filter(c => c.roas >= 2.0);
  const scaleDown = campsEnriched.filter(c => c.roas > 0 && c.roas < 1.0 && c.spend > 20);
  const highFreqCamps = campsEnriched.filter(c => c.frequency > 3.0);

  const fCtr = accImpressions > 0 ? accClicks / accImpressions * 100 : 0;
  const fLpv = accClicks > 0 ? accLpv / accClicks * 100 : 0;
  const fAtc = accLpv > 0 ? accAtc / accLpv * 100 : 0;
  const fCheckout = accAtc > 0 ? accCheckout / accAtc * 100 : 0;
  const fPurchase = accCheckout > 0 ? accPurchases / accCheckout * 100 : 0;

  const demoEnriched = demoAgeGender.map(d => {
    const purchases = parseFloat(getAction(d.actions, 'purchase') || 0);
    const revenue = parseFloat(getAction(d.action_values, 'purchase') || 0);
    const spend = parseFloat(d.spend || 0);
    const roas = spend > 0 && revenue > 0 ? revenue / spend : 0;
    const cpa = purchases > 0 ? spend / purchases : 0;
    return { age: d.age || '', gender: d.gender || '', campaign: d.campaign_name, spend, revenue, purchases, roas, cpa, clicks: parseInt(d.clicks || 0), ctr: parseFloat(d.ctr || 0), impressions: parseInt(d.impressions || 0) };
  });
  const bestDemo = [...demoEnriched].sort((a, b) => b.roas - a.roas)[0];
  const worstDemo = [...demoEnriched].filter(d => d.spend > 20).sort((a, b) => a.roas - b.roas)[0];

  const geoEnriched = demoCountry.map(d => {
    const purchases = parseFloat(getAction(d.actions, 'purchase') || 0);
    const revenue = parseFloat(getAction(d.action_values, 'purchase') || 0);
    const spend = parseFloat(d.spend || 0);
    const roas = spend > 0 && revenue > 0 ? revenue / spend : 0;
    const cpa = purchases > 0 ? spend / purchases : 0;
    return { country: d.country || '', campaign: d.campaign_name, spend, revenue, purchases, roas, cpa, clicks: parseInt(d.clicks || 0), ctr: parseFloat(d.ctr || 0), cpm: parseFloat(d.cpm || 0) };
  });
  const totalRevenue = geoEnriched.reduce((s, g) => s + g.revenue, 0);

  const placEnriched = placements.map(p => {
    const purchases = parseFloat(getAction(p.actions, 'purchase') || 0);
    const revenue = parseFloat(getAction(p.action_values, 'purchase') || 0);
    const spend = parseFloat(p.spend || 0);
    const roas = spend > 0 && revenue > 0 ? revenue / spend : 0;
    const cpa = purchases > 0 ? spend / purchases : 0;
    return { platform: p.publisher_platform || '', position: p.platform_position || '', device: p.impression_device || '', campaign: p.campaign_name, spend, revenue, purchases, roas, cpa, clicks: parseInt(p.clicks || 0), ctr: parseFloat(p.ctr || 0), cpm: parseFloat(p.cpm || 0) };
  });
  const totalPlacSpend = placEnriched.reduce((s, p) => s + p.spend, 0);

  const avgAdCtr = adData.length > 0 ? adData.reduce((s, a) => s + parseFloat(a.ctr || 0), 0) / adData.length : 1;

  const roasStatus = accRoas >= 2 ? '✅ STRONG (>=2x)' : accRoas >= 1 ? '⚠️ BREAK EVEN (1-2x)' : '🛑 LOSING MONEY (<1x)';
  const spendStatus = parseFloat(spendVsAvg7) > 20 ? '⚠️ ABOVE 7D AVG' : parseFloat(spendVsAvg7) < -20 ? '⚠️ BELOW 7D AVG' : '✅ ON TRACK';
  const freqStatus = accFreq > 4 ? '🛑 CRITICAL - Refresh Creatives' : accFreq > 3 ? '⚠️ WARNING' : '✅ HEALTHY';
  const ctrStatus = accCtr >= 1.5 ? '✅ STRONG (>=1.5%)' : accCtr >= 0.8 ? '⚠️ AVERAGE' : '🛑 LOW - Fix Creative';
  const cpaStatus = accCpa > 0 ? (accCpa < 50 ? '✅ GOOD (<$50)' : accCpa < 100 ? '⚠️ WATCH' : '🛑 HIGH (>$100)') : 'N/A';

  // ── TAB 1: Executive Dashboard ────────────────────────────────────────────
  const execDashboard = [
    ['📊 META ADS EXECUTIVE DASHBOARD', dateStr, '', 'ACCOUNT: ' + (acc.account_name || AD_ACCOUNT), '', '', ''],
    ['━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '', '', '', '', '', ''],
    [],
    ['💰 REVENUE & SPEND SCORECARD', '', '', '', '', '', '', ''],
    ['Metric', 'Yesterday', 'Prev Day', 'Day-over-Day', '7-Day Avg', 'vs 7D Avg', 'Status', 'Benchmark'],
    ['Total Spend', dollar(yesterdaySpend), dollar(prevDayAccSpend), dayDiff(yesterdaySpend, prevDayAccSpend), dollar(avg7Spend), `${parseFloat(spendVsAvg7) > 0 ? '+' : ''}${spendVsAvg7}%`, spendStatus, 'Track vs budget'],
    ['Total Revenue', dollar(accRevenue), dollar(prevDayAccRevenue), dayDiff(accRevenue, prevDayAccRevenue), '', '', accRevenue > yesterdaySpend ? '✅ Profitable' : '⚠️ Below Spend', ''],
    ['ROAS', roasStr(accRoas), roasStr(prevDayAccRoas), dayDiff(accRoas, prevDayAccRoas), `${avg7Roas}x`, '', roasStatus, '>=2.0x = Scale, >=1.0x = Keep'],
    ['CPA (Cost / Purchase)', accCpa > 0 ? dollar(accCpa) : 'N/A', '', '', '', '', cpaStatus, 'Depends on your AOV'],
    ['Purchases', accPurchases, prevDayAccPurchases, dayDiff(accPurchases, prevDayAccPurchases), '', '', '', ''],
    ['Leads', accLeads, '', '', '', '', '', ''],
    [],
    ['📊 TRAFFIC & ENGAGEMENT', '', '', '', '', '', ''],
    ['Metric', 'Value', 'Status', 'Benchmark', 'What It Means', '', ''],
    ['Impressions', fmt(accImpressions), '', '', 'Total times your ads were shown', '', ''],
    ['Reach', fmt(accReach), '', '', 'Unique people who saw your ads', '', ''],
    ['Frequency', fmtD(accFreq), freqStatus, '< 3.0 is Good', 'Avg times each person saw your ad', '', ''],
    ['CTR (Click-Through Rate)', `${fmtD(accCtr)}%`, ctrStatus, '>=1.5% is Strong', 'How often people click after seeing ad', '', ''],
    ['CPC (Cost per Click)', dollar(accCpc), accCpc < 1 ? '✅ LOW' : accCpc < 3 ? '⚠️ AVERAGE' : '🛑 HIGH', '< $1.00 is Great', '', '', ''],
    ['CPM (Cost per 1000 Impressions)', dollar(accCpm), accCpm < 10 ? '✅ LOW' : accCpm < 25 ? '⚠️ AVERAGE' : '🛑 HIGH', '< $15 is Good', '', '', ''],
    ['Landing Page Views', fmt(accLpv), '', '', '', '', ''],
    ['Add to Cart', fmt(accAtc), '', '', '', '', ''],
    ['Checkout Started', fmt(accCheckout), '', '', '', '', ''],
    [],
    ['🔻 FUNNEL SUMMARY', '', '', '', '', '', ''],
    ['Stage', 'Volume', 'Conv Rate', 'Benchmark', 'Status', 'Fix if Low', ''],
    ['Impressions -> Clicks', fmt(accClicks), `${fmtD(fCtr)}%`, '>=1.5%', fCtr >= 1.5 ? '✅' : '⚠️ LOW', fCtr < 1.5 ? 'Improve ad creative, hook, headline' : '', ''],
    ['Clicks -> Landing Page', fmt(accLpv), `${fmtD(fLpv)}%`, '>=70%', fLpv >= 70 ? '✅' : '⚠️ LOW', fLpv < 70 ? 'Fix page speed, mobile experience' : '', ''],
    ['LPV -> Add to Cart', fmt(accAtc), `${fmtD(fAtc)}%`, '>=5%', fAtc >= 5 ? '✅' : '⚠️ LOW', fAtc < 5 ? 'Improve product page, pricing, offers' : '', ''],
    ['ATC -> Checkout', fmt(accCheckout), `${fmtD(fCheckout)}%`, '>=60%', fCheckout >= 60 ? '✅' : '⚠️ LOW', fCheckout < 60 ? 'Reduce friction, add urgency' : '', ''],
    ['Checkout -> Purchase', fmt(accPurchases), `${fmtD(fPurchase)}%`, '>=60%', fPurchase >= 60 ? '✅' : '⚠️ LOW', fPurchase < 60 ? 'Trust badges, payment options, retarget' : '', ''],
    [],
    ['🎯 TOP 5 PRIORITY ACTIONS TODAY', '', '', '', '', '', ''],
    ['#', 'Priority', 'Action Required', 'Affected Campaigns', 'Why', 'Expected Impact', ''],
    ...([
      highSpendNoConv.length > 0 ? ['1', '🛑 URGENT', 'PAUSE CAMPAIGNS', highSpendNoConv.slice(0, 3).map(c => c.name).join(' | '), 'Spending with ZERO conversions', `Stop ${dollar(highSpendNoConv.reduce((s, c) => s + c.spend, 0))}/day waste`, ''] : null,
      scaleUp.length > 0 ? ['2', '🚀 HIGH VALUE', 'INCREASE BUDGET 20-30%', scaleUp.slice(0, 2).map(c => `${c.name} (${c.roas.toFixed(1)}x)`).join(' | '), 'High ROAS - more budget = more profit', 'Proportional revenue increase', ''] : null,
      highFreqCamps.length > 0 ? ['3', '⚠️ IMPORTANT', 'REFRESH AD CREATIVES', highFreqCamps.slice(0, 2).map(c => `${c.name} (freq ${c.frequency.toFixed(1)})`).join(' | '), 'Audience seeing same ad too often', 'Prevent CTR decline + burnout', ''] : null,
      scaleDown.length > 0 ? ['4', '⚠️ IMPORTANT', 'CUT BUDGET 30-50%', scaleDown.slice(0, 2).map(c => `${c.name} (${c.roas.toFixed(1)}x ROAS)`).join(' | '), 'ROAS < 1x: losing money each day', `Save ${dollar(scaleDown.reduce((s, c) => s + c.spend, 0) * 0.3)}/day`, ''] : null,
      bestDemo ? ['5', '📊 GROWTH', `SCALE ${bestDemo.age}/${bestDemo.gender}`, `Best segment: ${bestDemo.roas.toFixed(2)}x ROAS`, 'Highest-returning audience', 'Scale winning demographic', ''] : null,
    ].filter(Boolean).map((r, i) => { r[0] = String(i + 1); return r; })),
    [],
    ['📈 CAMPAIGN QUICK SNAPSHOT', '', '', '', '', '', ''],
    ['Campaign', 'Spend', 'Revenue', 'ROAS', 'Purchases', 'CPA', 'Action'],
    ...campsEnriched.slice(0, 15).map(c => [c.name, dollar(c.spend), dollar(c.revenue), roasStr(c.roas), c.purchases, c.cpa > 0 ? dollar(c.cpa) : 'N/A', campAction(c)])
  ];

  // ── TAB 2: Action Center ──────────────────────────────────────────────────
  const actionItems = [];

  highSpendNoConv.forEach(c => actionItems.push({
    urgency: '🛑 URGENT', type: 'PAUSE CAMPAIGN', name: c.name,
    spend: dollar(c.spend), revenue: dollar(c.revenue), roas: roasStr(c.roas), purchases: c.purchases,
    issue: `Spent ${dollar(c.spend)} with ZERO conversions`,
    howTo: 'Ads Manager -> Campaigns -> Toggle OFF this campaign',
    impact: `Stop ${dollar(c.spend)}/day waste`, sort: 1
  }));
  scaleUp.forEach(c => actionItems.push({
    urgency: '🚀 SCALE', type: 'INCREASE BUDGET', name: c.name,
    spend: dollar(c.spend), revenue: dollar(c.revenue), roas: roasStr(c.roas), purchases: c.purchases,
    issue: `ROAS ${c.roas.toFixed(2)}x - Strong performer`,
    howTo: 'Ads Manager -> Campaign -> Edit -> Increase daily budget by 20-30%',
    impact: 'Proportional revenue increase expected', sort: 2
  }));
  highFreqCamps.forEach(c => actionItems.push({
    urgency: '⚠️ REFRESH', type: 'NEW CREATIVE NEEDED', name: c.name,
    spend: dollar(c.spend), revenue: dollar(c.revenue), roas: roasStr(c.roas), purchases: c.purchases,
    issue: `Frequency ${c.frequency.toFixed(1)} - audience fatigued`,
    howTo: 'Upload 3-5 new ad creatives. Pause existing ads with freq > 4',
    impact: 'Prevent CTR drop + audience fatigue', sort: 3
  }));
  scaleDown.forEach(c => actionItems.push({
    urgency: '⚠️ OPTIMIZE', type: 'CUT BUDGET 30-50%', name: c.name,
    spend: dollar(c.spend), revenue: dollar(c.revenue), roas: roasStr(c.roas), purchases: c.purchases,
    issue: `ROAS ${c.roas.toFixed(2)}x - losing money on every dollar`,
    howTo: 'Ads Manager -> Campaign -> Edit -> Reduce daily budget by 30-50%',
    impact: `Save ~${dollar(c.spend * 0.35)}/day`, sort: 4
  }));
  actionItems.sort((a, b) => a.sort - b.sort);

  const actionCenter = [
    ['🚨 ACTION CENTER — EVERYTHING THAT NEEDS ACTION TODAY', dateStr, '', '', '', '', '', '', '', ''],
    ['━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '', '', '', '', '', '', '', '', ''],
    [],
    ['Urgency', 'Action Type', 'Campaign / Ad Name', 'Spend', 'Revenue', 'ROAS', 'Purchases', 'Issue', 'Exact Step to Fix', 'Expected Impact'],
    ...actionItems.map(a => [a.urgency, a.type, a.name, a.spend, a.revenue, a.roas, a.purchases, a.issue, a.howTo, a.impact]),
    ...(actionItems.length === 0 ? [['✅ NO URGENT ACTIONS TODAY', 'All campaigns performing within acceptable ranges', '', '', '', '', '', '', '', '']] : []),
    [],
    ['📋 AD SET LEVEL ACTIONS', '', '', '', '', '', '', '', '', ''],
    ['Urgency', 'Action', 'Ad Set', 'Campaign', 'Spend', 'ROAS', 'Purchases', 'Issue', 'How to Fix', ''],
    ...adsetData.sort((a, b) => parseFloat(b.spend || 0) - parseFloat(a.spend || 0)).slice(0, 30).map(a => {
      const purchases = parseFloat(getAction(a.actions, 'purchase') || 0);
      const revenue = parseFloat(getAction(a.action_values, 'purchase') || 0);
      const spend = parseFloat(a.spend || 0);
      const leads = parseFloat(getAction(a.actions, 'lead') || 0);
      const roas = spend > 0 && revenue > 0 ? revenue / spend : 0;
      let urg = '✅ OK', action = 'MONITOR', issue = 'Performing normally', fix = 'No action needed';
      if (spend > 50 && purchases === 0 && leads === 0) { urg = '🛑 URGENT'; action = 'PAUSE ADSET'; issue = 'High spend, zero results'; fix = 'Ads Manager -> Ad Sets -> Toggle OFF'; }
      else if (roas >= 2) { urg = '🚀 SCALE'; action = 'SCALE UP 20%'; issue = `Strong ROAS ${roas.toFixed(2)}x`; fix = 'Increase ad set budget 20%'; }
      else if (roas > 0 && roas < 1 && spend > 20) { urg = '⚠️ CUT'; action = 'REDUCE BUDGET'; issue = `Low ROAS ${roas.toFixed(2)}x`; fix = 'Reduce budget 30%, test new audiences'; }
      return [urg, action, a.adset_name, a.campaign_name, dollar(spend), roasStr(roas), purchases, issue, fix, ''];
    })
  ];

  // ── TAB 3: Campaign Performance ──────────────────────────────────────────
  const campHeaders = [
    '⚡ ACTION', 'Campaign Name', 'Objective', 'Buying Type', 'Spend', 'Revenue', 'ROAS', 'CPA',
    'Purchases', 'Leads', 'Impressions', 'Reach', 'Frequency', 'Clicks', 'Link Clicks',
    'CTR', 'CPC', 'CPM', 'LPV', 'ATC', 'Checkout',
    'Quality Rank', 'Engagement Rank', 'Conv Rank',
    '📅 Spend vs Prev Day', '📅 ROAS vs Prev Day', '📅 Purchases vs Prev Day', 'Date'
  ];
  const campRows = campsEnriched.map(c => {
    const prev = prevDayCampMap[c.id] || {};
    return [
      campAction(c), c.name, c.objective, c.buyingType,
      dollar(c.spend), dollar(c.revenue), roasStr(c.roas), c.cpa > 0 ? dollar(c.cpa) : 'N/A',
      c.purchases, c.leads, fmt(c.impressions), fmt(c.reach), fmtD(c.frequency),
      fmt(c.clicks), fmt(c.linkClicks), `${fmtD(c.ctr)}%`, dollar(c.cpc), dollar(c.cpm),
      c.lpv, c.atc, c.checkout, c.qualityRank, c.engRank, c.convRank,
      dayDiff(c.spend, prev.spend), dayDiff(c.roas, prev.roas), dayDiff(c.purchases, prev.purchases),
      c.date
    ];
  });

  // ── TAB 4: Ad Set Intelligence ────────────────────────────────────────────
  const adsetHeaders = [
    '⚡ ACTION', 'Campaign', 'Ad Set Name', 'Spend', 'Revenue', 'ROAS', 'CPA',
    'Purchases', 'Leads', 'Impressions', 'Reach', 'Frequency', 'Clicks', 'CTR',
    'CPC', 'CPM', 'LPV', 'ATC', 'Checkout', 'Optimization Goal', 'Why This Action', 'Date'
  ];
  const adsetRows = adsetData.sort((a, b) => parseFloat(b.spend || 0) - parseFloat(a.spend || 0)).map(a => {
    const purchases = parseFloat(getAction(a.actions, 'purchase') || 0);
    const revenue = parseFloat(getAction(a.action_values, 'purchase') || 0);
    const spend = parseFloat(a.spend || 0);
    const roas = spend > 0 && revenue > 0 ? revenue / spend : 0;
    const cpa = purchases > 0 ? spend / purchases : 0;
    const leads = parseFloat(getAction(a.actions, 'lead') || 0);
    const freq = parseFloat(a.frequency || 0);
    let action = '✅ MONITOR', why = 'Performing within expected range';
    if (spend > 50 && purchases === 0 && leads === 0) { action = '🛑 PAUSE'; why = `Spent ${dollar(spend)} with zero results`; }
    else if (roas >= 3) { action = '🚀 SCALE UP'; why = `Exceptional ${roas.toFixed(2)}x ROAS - increase budget aggressively`; }
    else if (roas >= 2) { action = '📈 SCALE UP'; why = `Strong ${roas.toFixed(2)}x ROAS - increase budget 20-30%`; }
    else if (roas > 0 && roas < 1 && spend > 20) { action = '⚠️ OPTIMIZE'; why = `ROAS ${roas.toFixed(2)}x below break-even - test new audience or creative`; }
    else if (freq > 4) { action = '🔄 REFRESH CREATIVE'; why = `Frequency ${freq.toFixed(1)} - audience fatigued`; }
    else if (spend < 10) { action = '👀 TESTING'; why = 'Insufficient data - allow more spend before judging'; }
    return [
      action, a.campaign_name, a.adset_name,
      dollar(spend), dollar(revenue), roasStr(roas), cpa > 0 ? dollar(cpa) : 'N/A',
      purchases, leads, fmt(parseInt(a.impressions || 0)), fmt(parseInt(a.reach || 0)),
      fmtD(freq), fmt(parseInt(a.clicks || 0)), `${fmtD(parseFloat(a.ctr || 0))}%`,
      dollar(parseFloat(a.cpc || 0)), dollar(parseFloat(a.cpm || 0)),
      getAction(a.actions, 'landing_page_view'), getAction(a.actions, 'add_to_cart'),
      getAction(a.actions, 'initiate_checkout'), a.optimization_goal || '', why, a.date_start
    ];
  });

  // ── TAB 5: Creative Performance ───────────────────────────────────────────
  const adHeaders = [
    '⚡ ACTION', 'Creative Status', 'Campaign', 'Ad Set', 'Ad Name',
    'Spend', 'Revenue', 'ROAS', 'CPA', 'Purchases', 'Leads',
    'Impressions', 'Reach', 'Frequency', 'Clicks', 'CTR', 'CPC', 'CPM',
    'Hook Rate', 'Video Plays', 'Video 25%', 'Video 50%', 'Video 75%', 'Video 100%',
    'Quality Rank', 'Engagement Rank', 'Conv Rank', 'Date'
  ];
  const adRows = adData.sort((a, b) => parseFloat(b.spend || 0) - parseFloat(a.spend || 0)).slice(0, 200).map(a => {
    const purchases = parseFloat(getAction(a.actions, 'purchase') || 0);
    const revenue = parseFloat(getAction(a.action_values, 'purchase') || 0);
    const spend = parseFloat(a.spend || 0);
    const leads = parseFloat(getAction(a.actions, 'lead') || 0);
    const roas = spend > 0 && revenue > 0 ? revenue / spend : 0;
    const cpa = purchases > 0 ? spend / purchases : 0;
    const impressions = parseInt(a.impressions || 0);
    const videoPlays = parseFloat(getAction(a.video_play_actions, 'video_view') || 0);
    const hookRate = impressions > 0 ? (videoPlays / impressions * 100).toFixed(2) + '%' : 'N/A';
    let action = '✅ MONITOR';
    if (spend > 30 && purchases === 0 && leads === 0) action = '🛑 PAUSE - No Results';
    else if (roas >= 3) action = '🚀 WINNER - Scale Up';
    else if (roas >= 2) action = '📈 SCALE UP';
    else if (roas > 0 && roas < 1) action = '⚠️ OPTIMIZE';
    else if (parseFloat(a.frequency || 0) > 4) action = '🔄 FATIGUE - New Creative';
    else if (spend < 5) action = '👀 TESTING';
    return [
      action, creativeStatus(a), a.campaign_name, a.adset_name, a.ad_name,
      dollar(spend), dollar(revenue), roasStr(roas), purchases > 0 ? dollar(cpa) : 'N/A',
      purchases, leads, fmt(impressions), fmt(parseInt(a.reach || 0)),
      fmtD(parseFloat(a.frequency || 0)), fmt(parseInt(a.clicks || 0)),
      `${fmtD(parseFloat(a.ctr || 0))}%`, dollar(parseFloat(a.cpc || 0)), dollar(parseFloat(a.cpm || 0)),
      hookRate, fmt(videoPlays),
      getAction(a.video_p25_watched_actions, 'video_view') || '0',
      getAction(a.video_p50_watched_actions, 'video_view') || '0',
      getAction(a.video_p75_watched_actions, 'video_view') || '0',
      getAction(a.video_p100_watched_actions, 'video_view') || '0',
      a.quality_ranking || 'N/A', a.engagement_rate_ranking || 'N/A', a.conversion_rate_ranking || 'N/A',
      a.date_start
    ];
  });

  // ── TAB 6: Audience Intelligence ─────────────────────────────────────────
  const demoRows = demoEnriched.sort((a, b) => b.spend - a.spend).map(d => {
    const roasIndex = accRoas > 0 ? ((d.roas / accRoas - 1) * 100).toFixed(0) : '0';
    let action = '✅ MONITOR', why = 'Performing at account average';
    if (d.roas >= 2) { action = '🚀 SCALE - Best Segment'; why = 'Highest returns - build lookalike + increase budget'; }
    else if (d.roas >= 1) { action = '✅ KEEP'; why = 'Break-even or better - maintain targeting'; }
    else if (d.spend > 50 && d.roas === 0) { action = '🛑 EXCLUDE'; why = 'High spend, zero return - add to exclusion list'; }
    else if (d.roas > 0 && d.spend > 20) { action = '⚠️ REDUCE SPEND'; why = 'Losing money - reduce budget or exclude segment'; }
    return [
      action, d.campaign, d.age, d.gender,
      dollar(d.spend), dollar(d.revenue), roasStr(d.roas), d.cpa > 0 ? dollar(d.cpa) : 'N/A',
      d.purchases, fmt(d.impressions), fmt(d.clicks), `${fmtD(d.ctr)}%`,
      `${roasIndex > 0 ? '+' : ''}${roasIndex}% vs avg`, why
    ];
  });

  const audienceTab = [
    ['👥 AUDIENCE INTELLIGENCE', dateStr, '', '', '', '', '', '', '', '', '', '', '', ''],
    ['━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    [],
    ['🏆 BEST SEGMENT:', bestDemo ? `${bestDemo.age} / ${bestDemo.gender} - ${bestDemo.roas.toFixed(2)}x ROAS` : 'N/A', '', '⚠️ WORST SEGMENT:', worstDemo ? `${worstDemo.age} / ${worstDemo.gender} - ${worstDemo.roas.toFixed(2)}x ROAS` : 'N/A', '', '', '', '', '', '', '', ''],
    [],
    ['⚡ ACTION', 'Campaign', 'Age Group', 'Gender', 'Spend', 'Revenue', 'ROAS', 'CPA', 'Purchases', 'Impressions', 'Clicks', 'CTR', 'ROAS Index vs Avg', 'Why This Action'],
    ...demoRows,
    [], ['BY COUNTRY', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['─────────────────────────────────', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['⚡ ACTION', 'Country', 'Campaign', 'Spend', 'Revenue', 'ROAS', 'CPA', 'Purchases', 'Clicks', 'CTR', 'CPM', 'Revenue %', 'Market Index', 'Strategy'],
    ...geoEnriched.sort((a, b) => b.spend - a.spend).map(d => {
      const revPct = totalRevenue > 0 ? (d.revenue / totalRevenue * 100).toFixed(1) + '%' : '0%';
      const idx = accRoas > 0 ? ((d.roas / accRoas - 1) * 100).toFixed(0) : '0';
      let action = '✅ KEEP', strategy = 'Maintain current geo targeting';
      if (d.roas >= 2) { action = '🚀 SCALE GEO'; strategy = 'Create geo-specific campaign with more budget'; }
      else if (d.spend > 50 && d.roas === 0) { action = '🛑 EXCLUDE GEO'; strategy = 'Add to excluded locations in ad set settings'; }
      else if (d.roas > 0 && d.roas < 1 && d.spend > 20) { action = '⚠️ REDUCE'; strategy = 'Lower bid cap or exclude from broad campaigns'; }
      return [action, d.country, d.campaign, dollar(d.spend), dollar(d.revenue), roasStr(d.roas),
        d.cpa > 0 ? dollar(d.cpa) : 'N/A', d.purchases, fmt(d.clicks), `${fmtD(d.ctr)}%`,
        dollar(d.cpm), revPct, `${idx > 0 ? '+' : ''}${idx}%`, strategy];
    })
  ];

  // ── TAB 7: Geographic Performance ────────────────────────────────────────
  const geoTab = [
    ['🌍 GEOGRAPHIC PERFORMANCE', dateStr, '', '', '', '', '', '', '', '', '', ''],
    ['━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '', '', '', '', '', '', '', '', '', '', ''],
    [],
    ['⚡ ACTION', 'Country', 'Spend', 'Revenue', 'ROAS', 'CPA', 'Purchases', 'Clicks', 'CTR', 'CPM', 'Revenue Share', 'Market Strategy'],
    ...geoEnriched.sort((a, b) => b.spend - a.spend).map(d => {
      const revPct = totalRevenue > 0 ? (d.revenue / totalRevenue * 100).toFixed(1) + '%' : '0%';
      let action = '✅ KEEP', strategy = 'Maintain current allocation';
      if (d.roas >= 2) { action = '🚀 SCALE'; strategy = 'Geo-specific campaign, increase budget 30%'; }
      else if (d.spend > 50 && d.roas === 0) { action = '🛑 EXCLUDE'; strategy = 'Remove from location targeting'; }
      else if (d.roas > 0 && d.roas < 1 && d.spend > 20) { action = '⚠️ REDUCE'; strategy = 'Reduce bid cap for this location'; }
      return [action, d.country, dollar(d.spend), dollar(d.revenue), roasStr(d.roas),
        d.cpa > 0 ? dollar(d.cpa) : 'N/A', d.purchases, fmt(d.clicks),
        `${fmtD(d.ctr)}%`, dollar(d.cpm), revPct, strategy];
    })
  ];

  // ── TAB 8: Device & Platform ──────────────────────────────────────────────
  const platformTab = [
    ['📱 DEVICE & PLATFORM PERFORMANCE', dateStr, '', '', '', '', '', '', '', '', '', '', '', ''],
    ['━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    [],
    ['⚡ ACTION', 'Platform', 'Position', 'Device', 'Spend', 'Revenue', 'ROAS', 'CPA', 'Purchases', 'Clicks', 'CTR', 'CPM', 'Spend Share', 'Platform Strategy'],
    ...placEnriched.sort((a, b) => b.spend - a.spend).map(p => {
      const spendShare = totalPlacSpend > 0 ? (p.spend / totalPlacSpend * 100).toFixed(1) + '%' : '0%';
      let action = '✅ KEEP', strategy = 'Maintain current placement mix';
      if (p.roas >= 2) { action = '🚀 PRIORITIZE'; strategy = 'Switch to manual placements -> select only this one'; }
      else if (p.spend > 50 && p.roas === 0) { action = '🛑 DISABLE'; strategy = 'Edit ad set -> Placements -> Uncheck this placement'; }
      else if (p.roas > 0 && p.roas < 1 && p.spend > 20) { action = '⚠️ REDUCE'; strategy = 'Exclude in manual placements or lower bid'; }
      return [action, p.platform, p.position, p.device,
        dollar(p.spend), dollar(p.revenue), roasStr(p.roas),
        p.cpa > 0 ? dollar(p.cpa) : 'N/A', p.purchases, fmt(p.clicks),
        `${fmtD(p.ctr)}%`, dollar(p.cpm), spendShare, strategy];
    })
  ];

  // ── TAB 9: Hourly Performance ─────────────────────────────────────────────
  const hourlyRows = hourlyData.map(h => {
    const purchases = parseFloat(getAction(h.actions, 'purchase') || 0);
    const revenue = parseFloat(getAction(h.action_values, 'purchase') || 0);
    const spend = parseFloat(h.spend || 0);
    const roas = spend > 0 && revenue > 0 ? revenue / spend : 0;
    const cpa = purchases > 0 ? spend / purchases : 0;
    const hour = h.date_start || '';
    return [hour, dollar(spend), fmt(parseInt(h.impressions || 0)), fmt(parseInt(h.clicks || 0)),
      `${fmtD(parseFloat(h.ctr || 0))}%`, purchases, roas > 0 ? roasStr(roas) : '-',
      cpa > 0 ? dollar(cpa) : '-', dollar(parseFloat(h.cpm || 0))];
  });

  const hourlyTab = [
    ['⏰ HOURLY PERFORMANCE — YESTERDAY', dateStr, '', '', '', '', '', '', ''],
    ['━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '', '', '', '', '', '', '', ''],
    [],
    ['💡 TIP: Use this to set ad scheduling. Pause ads during low-CTR / high-CPA hours.', '', '', '', '', '', '', '', ''],
    [],
    ['Hour', 'Spend', 'Impressions', 'Clicks', 'CTR', 'Purchases', 'ROAS', 'CPA', 'CPM'],
    ...hourlyRows,
    ...(hourlyRows.length === 0 ? [['No hourly data available for yesterday', '', '', '', '', '', '', '', '']] : [])
  ];

  // ── TAB 10: Funnel Analysis ───────────────────────────────────────────────
  const funnelTab = [
    ['🔻 DEEP FUNNEL ANALYSIS', dateStr, '', '', '', '', ''],
    ['━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '', '', '', '', '', ''],
    [],
    ['💡 Each stage shows how many users move forward. Low conversion = problem at that stage.', '', '', '', '', '', ''],
    [],
    ['Funnel Stage', 'Volume', 'Conversion Rate', 'Industry Benchmark', 'vs Benchmark', 'Status', 'Fix This Stage'],
    ['Impressions', fmt(accImpressions), '—', '—', '—', '—', ''],
    ['  -> Clicks (CTR)', fmt(accClicks), `${fmtD(fCtr)}%`, '>=1.5%', benchmarkGap(fCtr, 1.5, 'CTR'), fCtr >= 1.5 ? '✅ GOOD' : '⚠️ LOW', fCtr < 1.5 ? 'Test new hooks, headlines, creative angles. Strong first 3s of video.' : 'Performing well'],
    ['  -> Landing Page Views', fmt(accLpv), `${fmtD(fLpv)}% of clicks`, '>=70%', benchmarkGap(fLpv, 70, 'LPV Rate'), fLpv >= 70 ? '✅ GOOD' : '⚠️ LOW', fLpv < 70 ? 'Improve page load speed (<3s). Optimize mobile layout. Match ad to landing page.' : 'Performing well'],
    ['  -> Add to Cart', fmt(accAtc), `${fmtD(fAtc)}% of LPVs`, '>=5%', benchmarkGap(fAtc, 5, 'ATC Rate'), fAtc >= 5 ? '✅ GOOD' : '⚠️ LOW', fAtc < 5 ? 'Improve product images, social proof, pricing clarity, offer strength.' : 'Performing well'],
    ['  -> Checkout Initiated', fmt(accCheckout), `${fmtD(fCheckout)}% of ATCs`, '>=60%', benchmarkGap(fCheckout, 60, 'Checkout Rate'), fCheckout >= 60 ? '✅ GOOD' : '⚠️ LOW', fCheckout < 60 ? 'Reduce checkout steps. Add trust badges, shipping clarity, urgency.' : 'Performing well'],
    ['  -> Purchase Completed', fmt(accPurchases), `${fmtD(fPurchase)}% of Checkouts`, '>=60%', benchmarkGap(fPurchase, 60, 'Purchase Rate'), fPurchase >= 60 ? '✅ GOOD' : '⚠️ LOW', fPurchase < 60 ? 'Add payment options, retarget abandoned checkouts, guarantee / risk reversal.' : 'Performing well'],
    [],
    ['📊 COST AT EACH STAGE', '', '', '', '', '', ''],
    ['Stage', 'Cost per Unit', '', '', '', '', ''],
    ['Cost per Click (CPC)', dollar(accCpc), '', '', '', '', ''],
    ['Cost per Landing Page View', accLpv > 0 ? dollar(yesterdaySpend / accLpv) : 'N/A', '', '', '', '', ''],
    ['Cost per Add to Cart', accAtc > 0 ? dollar(yesterdaySpend / accAtc) : 'N/A', '', '', '', '', ''],
    ['Cost per Checkout Started', accCheckout > 0 ? dollar(yesterdaySpend / accCheckout) : 'N/A', '', '', '', '', ''],
    ['Cost per Purchase (CPA)', accCpa > 0 ? dollar(accCpa) : 'N/A', '', '', '', '', ''],
    ['Overall ROAS', roasStr(accRoas), '', '', '', '', ''],
  ];

  // ── TAB 11: Creative Fatigue Tracker ──────────────────────────────────────
  const fatigueAds = adData
    .filter(a => parseFloat(a.frequency || 0) > 0)
    .sort((a, b) => parseFloat(b.frequency || 0) - parseFloat(a.frequency || 0))
    .slice(0, 100)
    .map(a => {
      const freq = parseFloat(a.frequency || 0);
      const ctr = parseFloat(a.ctr || 0);
      const spend = parseFloat(a.spend || 0);
      const roas = spend > 0 && getAction(a.action_values, 'purchase') > 0
        ? parseFloat(getAction(a.action_values, 'purchase')) / spend : 0;
      const fScore = fatigueScore(freq, ctr, avgAdCtr);
      const status = freq >= 5 ? '🔴 CRITICAL FATIGUE' : freq >= 4 ? '🟠 HIGH FATIGUE' : freq >= 3 ? '🟡 WATCH' : '🟢 HEALTHY';
      return [
        status, a.ad_name, a.campaign_name, a.adset_name,
        fmtD(freq), `${fmtD(ctr)}%`, roasStr(roas), dollar(spend),
        `${fScore}/100`, daysUntilBurnout(freq),
        freq >= 4 ? '🛑 Upload new creative NOW' : freq >= 3 ? '⚠️ Prepare new creative this week' : '✅ No action needed',
        a.quality_ranking || 'N/A'
      ];
    });

  const fatigueTab = [
    ['🔄 CREATIVE FATIGUE TRACKER', dateStr, '', '', '', '', '', '', '', '', '', ''],
    ['━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '', '', '', '', '', '', '', '', '', '', ''],
    [],
    ['💡 FATIGUE SCORE: 0-30 = Healthy | 31-60 = Watch | 61-100 = Critical. Combines frequency + CTR decay.', '', '', '', '', '', '', '', '', '', '', ''],
    [],
    ['Fatigue Status', 'Ad Name', 'Campaign', 'Ad Set', 'Frequency', 'CTR', 'ROAS', 'Spend', 'Fatigue Score', 'Days Until Burnout', 'Recommended Action', 'Quality Rank'],
    ...fatigueAds,
    ...(fatigueAds.length === 0 ? [['✅ No ads showing fatigue signals', '', '', '', '', '', '', '', '', '', '', '']] : [])
  ];

  // ── TAB 12: 30-Day Trend Analysis ─────────────────────────────────────────
  const trendRows30 = trends30d.map((d, i) => {
    const purchases = parseFloat(getAction(d.actions, 'purchase') || 0);
    const revenue = parseFloat(getAction(d.action_values, 'purchase') || 0);
    const spend = parseFloat(d.spend || 0);
    const roas = spend > 0 && revenue > 0 ? revenue / spend : 0;
    const cpa = purchases > 0 ? spend / purchases : 0;
    const avgRoas7 = (() => {
      const slice = trends30d.slice(Math.max(0, i - 6), i + 1);
      let r = 0, s = 0;
      slice.forEach(x => { r += parseFloat(getAction(x.action_values, 'purchase') || 0); s += parseFloat(x.spend || 0); });
      return s > 0 ? (r / s).toFixed(2) : '0';
    })();
    let signal = '—';
    if (i > 0) {
      const prev = trends30d[i - 1];
      const prevRoas = parseFloat(prev.spend || 0) > 0 && getAction(prev.action_values, 'purchase') > 0
        ? parseFloat(getAction(prev.action_values, 'purchase')) / parseFloat(prev.spend) : 0;
      const prevSpend = parseFloat(prev.spend || 0);
      if (roas > prevRoas * 1.2 && prevRoas > 0) signal = '📈 ROAS Up';
      else if (roas < prevRoas * 0.8 && prevRoas > 0) signal = '📉 ROAS Down';
      else if (spend > prevSpend * 1.3) signal = '💸 Spend Spike';
      else if (spend < prevSpend * 0.7 && prevSpend > 0) signal = '⬇️ Spend Drop';
      else signal = '➡️ Stable';
    }
    return [d.date_start, dollar(spend), dollar(revenue), roasStr(roas), cpa > 0 ? dollar(cpa) : 'N/A',
      purchases, fmt(parseInt(d.impressions || 0)), fmt(parseInt(d.reach || 0)),
      d.clicks || '0', `${fmtD(parseFloat(d.ctr || 0))}%`,
      dollar(parseFloat(d.cpc || 0)), dollar(parseFloat(d.cpm || 0)),
      `${avgRoas7}x`, signal];
  });

  const best30Day = trendRows30.length > 0 ? [...trendRows30].sort((a, b) => parseFloat(b[3]) - parseFloat(a[3]))[0] : null;
  const worst30Day = trendRows30.length > 0 ? [...trendRows30].filter(r => parseFloat(r[1].replace(/[$,]/g, '')) > 5).sort((a, b) => parseFloat(a[3]) - parseFloat(b[3]))[0] : null;

  const trendTab = [
    ['📅 30-DAY TREND ANALYSIS', dateStr, '', '', '', '', '', '', '', '', '', '', '', ''],
    ['━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    [],
    ['Date', 'Spend', 'Revenue', 'ROAS', 'CPA', 'Purchases', 'Impressions', 'Reach', 'Clicks', 'CTR', 'CPC', 'CPM', '7-Day Rolling ROAS', 'Trend Signal'],
    ...trendRows30,
    ...(trendRows30.length === 0 ? [['No trend data available', '', '', '', '', '', '', '', '', '', '', '', '', '']] : [])
  ];

  // ── TAB 13: Budget & Pacing ───────────────────────────────────────────────
  const monthlyRunRate = avg7Spend * 30;
  const weeklyRunRate = avg7Spend * 7;

  const budgetTab = [
    ['💰 BUDGET & PACING ANALYSIS', dateStr, '', '', '', ''],
    ['━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '', '', '', '', ''],
    [],
    ['📊 SPEND VELOCITY', '', '', '', '', ''],
    ['Metric', 'Value', 'vs Trend', 'Status', 'What It Means', ''],
    ['Yesterday Spend', dollar(yesterdaySpend), `${parseFloat(spendVsAvg7) > 0 ? '+' : ''}${spendVsAvg7}% vs 7d avg`, spendStatus, 'Daily budget consumption', ''],
    ['7-Day Average Daily Spend', dollar(avg7Spend), '', '', 'Your typical daily spend', ''],
    ['30-Day Average Daily Spend', dollar(avg30Spend), '', '', 'Your 30-day baseline', ''],
    ['Weekly Run Rate (at 7d avg)', dollar(weeklyRunRate), '', '', 'Projected spend next 7 days', ''],
    ['Monthly Run Rate (at 7d avg)', dollar(monthlyRunRate), '', '', 'Projected spend this month', ''],
    ['Monthly Run Rate (at yesterday rate)', dollar(yesterdaySpend * 30), '', yesterdaySpend > avg7Spend * 1.3 ? '⚠️ ABOVE TREND' : '✅ ON TRACK', 'If yesterday rate continues all month', ''],
    [],
    ['📈 REVENUE TRAJECTORY', '', '', '', '', ''],
    ['Metric', 'Value', '', '', '', ''],
    ['Yesterday Revenue', dollar(accRevenue), '', '', '', ''],
    ['Yesterday ROAS', roasStr(accRoas), '', '', '', ''],
    ['7-Day Avg ROAS', `${avg7Roas}x`, '', '', '', ''],
    ['Projected Monthly Revenue (7d avg ROAS x run rate)', dollar(monthlyRunRate * parseFloat(avg7Roas)), '', '', '', ''],
    [],
    ['⚡ CAMPAIGN SPEND BREAKDOWN', '', '', '', '', ''],
    ['Campaign', 'Spend Yesterday', 'ROAS', 'Spend Efficiency', 'Recommendation', ''],
    ...campsEnriched.map(c => {
      const spendShare = yesterdaySpend > 0 ? (c.spend / yesterdaySpend * 100).toFixed(1) + '% of total' : 'N/A';
      let rec = 'Maintain current budget';
      if (c.roas >= 2 && c.spend / yesterdaySpend < 0.4) rec = 'Increase budget - underinvested in top performer';
      else if (c.spend > 50 && c.purchases === 0) rec = '🛑 PAUSE - No returns on this spend';
      else if (c.roas >= 2) rec = '🚀 Scale up budget 20-30%';
      else if (c.roas > 0 && c.roas < 1) rec = '⚠️ Reduce budget 30-50%';
      return [c.name, dollar(c.spend), roasStr(c.roas), spendShare, rec, ''];
    })
  ];

  // ── TAB 14: AI Analysis & Strategy ───────────────────────────────────────
  const aiTab = [
    ['🏆 META ADS AGENCY ANALYSIS & STRATEGY REPORT', dateStr, '', ''],
    ['━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '', '', ''],
    [],
    ['SECTION 1: EXECUTIVE SUMMARY', '', '', ''],
    ['─────────────────────────────────────', '', '', ''],
    ['Point', 'Summary', 'Status', 'What to Do'],
    ['Spend', `${dollar(yesterdaySpend)} yesterday (${parseFloat(spendVsAvg7) > 0 ? '+' : ''}${spendVsAvg7}% vs 7d avg of ${dollar(avg7Spend)})`, spendStatus, parseFloat(spendVsAvg7) > 30 ? 'Investigate spend spike' : parseFloat(spendVsAvg7) < -30 ? 'Check for paused campaigns' : 'On track'],
    ['Revenue & ROAS', `${dollar(accRevenue)} revenue at ${roasStr(accRoas)}`, roasStatus, accRoas >= 2 ? 'Scale top performers' : accRoas >= 1 ? 'Optimize to improve ROAS' : '🛑 Immediate action required'],
    ['Top Campaign', bestRoas ? `${bestRoas.name} - ${roasStr(bestRoas.roas)} ROAS` : 'N/A', bestRoas && bestRoas.roas >= 2 ? '✅' : '⚠️', bestRoas && bestRoas.roas >= 2 ? 'Increase budget 20-30%' : 'Needs optimization'],
    ['Biggest Problem', highSpendNoConv.length > 0 ? `${highSpendNoConv.length} campaign(s) with ZERO conversions` : scaleDown.length > 0 ? `${scaleDown.length} campaign(s) with ROAS < 1x` : 'No critical issues', highSpendNoConv.length > 0 ? '🛑 URGENT' : scaleDown.length > 0 ? '⚠️ WATCH' : '✅ HEALTHY', highSpendNoConv.length > 0 ? 'Pause these campaigns NOW' : scaleDown.length > 0 ? 'Reduce budget or overhaul' : 'Continue monitoring'],
    ['Creative Health', `${highFreqCamps.length} campaign(s) with frequency > 3.0`, highFreqCamps.length > 0 ? '⚠️ FATIGUE RISK' : '✅ HEALTHY', highFreqCamps.length > 0 ? 'Refresh creatives this week' : 'Upload new creatives proactively'],
    [],
    ['SECTION 2: WHAT TO DO RIGHT NOW (Priority Order)', '', '', ''],
    ['─────────────────────────────────────', '', '', ''],
    ['Priority', 'Action', 'Campaigns Affected', 'Expected Result'],
    ...(highSpendNoConv.length > 0 ? [['🛑 URGENT #1', 'PAUSE CAMPAIGNS IMMEDIATELY', highSpendNoConv.map(c => c.name).join(' | '), `Stop ${dollar(highSpendNoConv.reduce((s, c) => s + c.spend, 0))}/day in wasted spend`]] : [['✅ GOOD', 'No campaigns to pause', 'All campaigns converting', 'Keep monitoring']]),
    ...(scaleUp.length > 0 ? [['🚀 HIGH VALUE', 'INCREASE BUDGET 20-30%', scaleUp.map(c => `${c.name} (${c.roas.toFixed(1)}x)`).join(' | '), 'Proportional revenue increase']] : []),
    ...(highFreqCamps.length > 0 ? [['⚠️ IMPORTANT', 'REFRESH AD CREATIVES', highFreqCamps.map(c => `${c.name} (freq ${c.frequency.toFixed(1)})`).join(' | '), 'Prevent CTR decline + audience burnout']] : []),
    ...(scaleDown.length > 0 ? [['⚠️ IMPORTANT', 'REDUCE BUDGET 30-50%', scaleDown.map(c => `${c.name} (${c.roas.toFixed(1)}x)`).join(' | '), 'Stop losing money below break-even']] : []),
    ...(bestDemo ? [['📊 GROWTH', `SCALE ${bestDemo.age}/${bestDemo.gender} AUDIENCE`, `${bestDemo.roas.toFixed(2)}x ROAS - best segment`, 'Build lookalike, increase bid for this demo']] : []),
    [],
    ['SECTION 3: CAMPAIGN PERFORMANCE BREAKDOWN', '', '', ''],
    ['─────────────────────────────────────', '', '', ''],
    ['Campaign', 'Spend | ROAS | Purchases', 'Decision', 'Reason & Next Step'],
    ...campsEnriched.map(c => [
      c.name, `${dollar(c.spend)} | ${roasStr(c.roas)} | ${c.purchases} purchases`, campAction(c),
      c.spend > 50 && c.purchases === 0 && c.leads === 0 ? 'Spending with no returns. Pause now. Investigate targeting and creative before relaunching.' :
        c.roas >= 3 ? 'Exceptional ROAS. Pour budget in. Duplicate this campaign and test higher budgets.' :
          c.roas >= 2 ? 'Strong performer. Increase budget 20-30% and monitor CPA closely.' :
            c.roas >= 1 ? 'Breaking even. Test new creatives, refine audience. Goal: get to 2x ROAS.' :
              c.roas > 0 ? `Losing ${dollar(c.spend - c.revenue)} per day. Reduce budget 50%. Overhaul creative and targeting.` :
                c.frequency > 4 ? `Audience fatigued (${c.frequency.toFixed(1)} freq). Upload 3+ fresh creatives immediately.` :
                  'Insufficient data. Allow more spend before judging performance.'
    ]),
    [],
    ['SECTION 4: FUNNEL — WHERE ARE YOU LOSING SALES?', '', '', ''],
    ['─────────────────────────────────────', '', '', ''],
    ['Funnel Stage', 'Performance', 'Benchmark', 'Status', 'Agency Fix'],
    ['Impressions -> Clicks (CTR)', `${fmtD(fCtr)}%`, '>=1.5%', fCtr >= 1.5 ? '✅ GOOD' : '⚠️ BELOW', fCtr < 1.5 ? 'Rewrite ad hooks. Test pattern-interrupt creative. Try UGC vs polished video. A/B test headlines.' : 'Maintain - test creatives to push CTR higher'],
    ['Clicks -> Landing Page (LPV%)', `${fmtD(fLpv)}%`, '>=70%', fLpv >= 70 ? '✅ GOOD' : '⚠️ BELOW', fLpv < 70 ? 'Audit page speed (target <3s). Ensure ad-to-page message match. Optimize mobile above-fold.' : 'Good landing page adherence'],
    ['LPV -> Add to Cart (ATC%)', `${fmtD(fAtc)}%`, '>=5%', fAtc >= 5 ? '✅ GOOD' : '⚠️ BELOW', fAtc < 5 ? 'A/B test product imagery. Add social proof (reviews, UGC). Clarify pricing. Create urgency.' : 'Strong product page performance'],
    ['ATC -> Checkout', `${fmtD(fCheckout)}%`, '>=60%', fCheckout >= 60 ? '✅ GOOD' : '⚠️ BELOW', fCheckout < 60 ? 'Add cart abandonment popup. Show shipping costs upfront. Reduce checkout steps to 2-3 max.' : 'Checkout conversion is healthy'],
    ['Checkout -> Purchase (CVR)', `${fmtD(fPurchase)}%`, '>=60%', fPurchase >= 60 ? '✅ GOOD' : '⚠️ BELOW', fPurchase < 60 ? 'Add payment methods (ApplePay, BNPL). Add money-back guarantee. Retarget abandoners within 1 hour.' : 'Great purchase completion rate'],
    [],
    ['SECTION 5: AUDIENCE INSIGHTS', '', '', ''],
    ['─────────────────────────────────────', '', '', ''],
    ['Segment', 'ROAS', 'Spend', 'Decision', 'Action'],
    ...(bestDemo ? [['BEST: ' + bestDemo.age + ' / ' + bestDemo.gender, roasStr(bestDemo.roas), dollar(bestDemo.spend), '🚀 SCALE', 'Create Lookalike from purchasers in this demo. Increase bid cap 20% for this age/gender.']] : []),
    ...(worstDemo && worstDemo !== bestDemo ? [['WORST: ' + worstDemo.age + ' / ' + worstDemo.gender, roasStr(worstDemo.roas), dollar(worstDemo.spend), '🛑 EXCLUDE', 'Add to excluded audiences in all ad set settings. Reallocate budget to best segment.']] : []),
    ...(() => {
      const topGeo = [...geoEnriched].sort((a, b) => b.roas - a.roas)[0];
      const worstGeo = [...geoEnriched].filter(g => g.spend > 20).sort((a, b) => a.roas - b.roas)[0];
      const rows = [];
      if (topGeo) rows.push(['TOP COUNTRY: ' + topGeo.country, roasStr(topGeo.roas), dollar(topGeo.spend), '🚀 GEO FOCUS', 'Create country-specific campaign. Use local market creative and messaging.']);
      if (worstGeo && worstGeo !== topGeo) rows.push(['WORST COUNTRY: ' + worstGeo.country, roasStr(worstGeo.roas), dollar(worstGeo.spend), '🛑 EXCLUDE GEO', 'Add to excluded locations in ad set settings.']);
      return rows;
    })(),
    [],
    ['SECTION 6: CREATIVE HEALTH REPORT', '', '', ''],
    ['─────────────────────────────────────', '', '', ''],
    ['Category', 'Count', 'Top Examples', 'Agency Recommendation'],
    ['🏆 Top Performers (ROAS >=2x)', String(adData.filter(a => parseFloat(a.spend || 0) > 5 && parseFloat(getAction(a.action_values, 'purchase') || 0) / parseFloat(a.spend || 0.001) >= 2).length), adData.filter(a => parseFloat(a.spend || 0) > 5 && parseFloat(getAction(a.action_values, 'purchase') || 0) / parseFloat(a.spend || 0.001) >= 2).slice(0, 3).map(a => a.ad_name).join(' | ') || 'None', 'Scale budgets. Create 3-5 variations of the same winning concept.'],
    ['⚠️ Fatigued Ads (Frequency > 4)', String(adData.filter(a => parseFloat(a.frequency || 0) > 4).length), adData.filter(a => parseFloat(a.frequency || 0) > 4).slice(0, 3).map(a => a.ad_name).join(' | ') || 'None', 'Pause immediately. Upload new creative within 48 hours or audience burnout accelerates.'],
    ['❌ Low Quality Ads', String(adData.filter(a => a.quality_ranking && a.quality_ranking.includes('BELOW_AVERAGE')).length), adData.filter(a => a.quality_ranking && a.quality_ranking.includes('BELOW_AVERAGE')).slice(0, 3).map(a => a.ad_name).join(' | ') || 'None', 'Pause or rework. Low quality increases CPM and hurts delivery. Fix: more relevant creative + better CTA.'],
    ['👀 In Testing (<$10 spend)', String(adData.filter(a => parseFloat(a.spend || 0) < 10).length), '', 'Allow to spend $20-50 before making judgement calls.'],
    [],
    ['SECTION 7: PLACEMENT OPTIMIZATION', '', '', ''],
    ['─────────────────────────────────────', '', '', ''],
    ['Placement', 'ROAS', 'Spend', 'Decision', 'How to Action in Ads Manager'],
    ...(() => {
      const best = [...placEnriched].sort((a, b) => b.roas - a.roas)[0];
      const worst = [...placEnriched].filter(p => p.spend > 20).sort((a, b) => a.roas - b.roas)[0];
      const rows = [];
      if (best) rows.push([[best.platform, best.position, best.device].filter(Boolean).join(' / '), roasStr(best.roas), dollar(best.spend), '🚀 PRIORITIZE', 'Edit Ad Set -> Placements -> Manual -> Select only this placement for a dedicated test campaign']);
      if (worst && worst !== best) rows.push([[worst.platform, worst.position, worst.device].filter(Boolean).join(' / '), roasStr(worst.roas), dollar(worst.spend), '🛑 DISABLE', 'Edit Ad Set -> Placements -> Manual Placements -> Uncheck this placement']);
      return rows;
    })(),
    [],
    ['SECTION 8: 30-DAY TREND ANALYSIS', '', '', ''],
    ['─────────────────────────────────────', '', '', ''],
    ['Metric', '7-Day Avg', '30-Day Avg', 'Trend', 'Signal'],
    ['Daily Spend', dollar(avg7Spend), dollar(avg30Spend), avg7Spend > avg30Spend ? 'Increasing' : 'Decreasing', avg7Spend > avg30Spend * 1.2 ? '⚠️ Significant spend increase' : avg7Spend < avg30Spend * 0.8 ? '⚠️ Significant spend decrease' : '✅ Stable'],
    ['Daily Purchases', fmtD(trends7d.reduce((s, d) => s + parseFloat(getAction(d.actions, 'purchase') || 0), 0) / Math.max(trends7d.length, 1)), fmtD(trends30d.reduce((s, d) => s + parseFloat(getAction(d.actions, 'purchase') || 0), 0) / Math.max(trends30d.length, 1)), '', ''],
    ['7-Day ROAS', avg7Roas + 'x', '', '', parseFloat(avg7Roas) >= 2 ? '✅ Strong' : parseFloat(avg7Roas) >= 1 ? '⚠️ Watch' : '🛑 Below break-even'],
    ...(best30Day ? [['Best 30-Day Performance', best30Day[0], `ROAS ${best30Day[3]}`, 'Study what worked this day', 'Replicate conditions (creative, budget, timing)']] : []),
    ...(worst30Day ? [['Worst 30-Day Performance', worst30Day[0], `ROAS ${worst30Day[3]}`, 'Study what went wrong', 'Avoid repeating conditions']] : []),
    [],
    ['SECTION 9: 90-DAY TESTING ROADMAP', '', '', ''],
    ['─────────────────────────────────────', '', '', ''],
    ['Timeframe', 'Test', 'Hypothesis', 'How to Set Up', 'Success Metric'],
    ['WEEK 1-2', 'New Ad Creatives', 'Fresh creative will reduce fatigue and improve CTR by 20%', 'Upload 3-5 new ads per fatigued campaign. Split test vs current winners.', 'CTR >1.5%, Frequency drops below 3'],
    ['WEEK 2-3', 'Audience Expansion', `Scaling ${bestDemo ? bestDemo.age + ' ' + bestDemo.gender : 'best demo'} with LAL will maintain ROAS at scale`, 'Create 1% Lookalike of purchasers from best demo. Test at 10% of winning budget.', 'ROAS >=1.5x at scale'],
    ['WEEK 3-4', 'Landing Page Test', 'Improving LPV-to-ATC rate will reduce CPA by 15-20%', 'A/B test current landing page vs variant with stronger offer/social proof.', 'ATC rate >5%, CPA decreases'],
    ['MONTH 2', 'Placement Testing', 'Manual placements on best platform will reduce CPM 20%', 'Duplicate best campaign. Set manual placements (best platform only). Compare CPA.', 'CPM -20%, CPA maintained'],
    ['MONTH 3', 'Geo Expansion', `Scaling top country with dedicated campaign`, 'Create geo-specific campaign with local market creative.', 'ROAS >= account average, CAC within target'],
    [],
    ['━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '', '', ''],
    ['Report Generated', new Date().toLocaleString(), '', ''],
    ['Spreadsheet', spreadsheetUrl, '', ''],
  ];

  // ── TAB 15: Weekly Report ─────────────────────────────────────────────────
  const acc7 = accountData7d[0] || {};
  const w7Spend  = parseFloat(acc7.spend || 0);
  const w7Rev    = parseFloat(getAction(acc7.action_values, 'purchase') || 0);
  const w7Buys   = parseFloat(getAction(acc7.actions, 'purchase') || 0);
  const w7Leads  = parseFloat(getAction(acc7.actions, 'lead') || 0);
  const w7Roas   = w7Spend > 0 && w7Rev > 0 ? w7Rev / w7Spend : 0;
  const w7Cpa    = w7Buys > 0 ? w7Spend / w7Buys : 0;
  const w7Impr   = parseInt(acc7.impressions || 0);
  const w7Clicks = parseInt(acc7.clicks || 0);
  const w7Ctr    = parseFloat(acc7.ctr || 0);
  const w7Cpm    = parseFloat(acc7.cpm || 0);
  const w7Cpc    = parseFloat(acc7.cpc || 0);
  const w7Freq   = parseFloat(acc7.frequency || 0);

  const campRows7 = campaignData7d.map(c => {
    const purchases = parseFloat(getAction(c.actions, 'purchase') || 0);
    const revenue   = parseFloat(getAction(c.action_values, 'purchase') || 0);
    const spend     = parseFloat(c.spend || 0);
    const leads     = parseFloat(getAction(c.actions, 'lead') || 0);
    const roas      = spend > 0 && revenue > 0 ? revenue / spend : 0;
    const cpa       = purchases > 0 ? spend / purchases : 0;
    let action = '✅ MONITOR';
    if (spend > 200 && purchases === 0 && leads === 0) action = '🛑 PAUSE';
    else if (roas >= 3) action = '🚀 SCALE UP';
    else if (roas >= 2) action = '📈 SCALE UP';
    else if (roas > 0 && roas < 1 && spend > 100) action = '⚠️ OPTIMIZE';
    return [action, c.campaign_name, dollar(spend), dollar(revenue), roasStr(roas),
      purchases > 0 ? dollar(cpa) : 'N/A', purchases, leads,
      fmt(parseInt(c.impressions || 0)), `${fmtD(parseFloat(c.ctr || 0))}%`,
      dollar(parseFloat(c.cpc || 0)), dollar(parseFloat(c.cpm || 0))];
  }).sort((a, b) => parseFloat(b[2].replace(/[₹,]/g,'')) - parseFloat(a[2].replace(/[₹,]/g,'')));

  const best7Day  = [...trends7d].sort((a,b) => {
    const ra = parseFloat(a.spend||0) > 0 ? parseFloat(getAction(a.action_values,'purchase')||0)/parseFloat(a.spend) : 0;
    const rb = parseFloat(b.spend||0) > 0 ? parseFloat(getAction(b.action_values,'purchase')||0)/parseFloat(b.spend) : 0;
    return rb - ra;
  })[0];
  const worst7Day = [...trends7d].filter(d => parseFloat(d.spend||0) > 10).sort((a,b) => {
    const ra = parseFloat(a.spend||0) > 0 ? parseFloat(getAction(a.action_values,'purchase')||0)/parseFloat(a.spend) : 0;
    const rb = parseFloat(b.spend||0) > 0 ? parseFloat(getAction(b.action_values,'purchase')||0)/parseFloat(b.spend) : 0;
    return ra - rb;
  })[0];

  const weeklyTab = [
    ['📆 WEEKLY PERFORMANCE REPORT', `Week ending ${dateStr}`, '', '', '', '', '', '', '', '', '', ''],
    ['━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '', '', '', '', '', '', '', '', '', '', ''],
    [],
    ['💰 ACCOUNT SUMMARY — LAST 7 DAYS', '', '', '', '', '', '', '', '', '', '', ''],
    ['Metric', 'Total (7 Days)', 'Daily Average', 'Status', '', '', '', '', '', '', '', ''],
    ['Total Spend (INR)', dollar(w7Spend), dollar(w7Spend / 7), w7Spend > avg7Spend * 7 * 1.1 ? '⚠️ Above Avg' : '✅ On Track', '', '', '', '', '', '', '', ''],
    ['Total Revenue (INR)', dollar(w7Rev), dollar(w7Rev / 7), w7Rev > w7Spend ? '✅ Profitable' : '⚠️ Below Spend', '', '', '', '', '', '', '', ''],
    ['ROAS', roasStr(w7Roas), '', w7Roas >= 2 ? '✅ STRONG' : w7Roas >= 1 ? '⚠️ BREAK EVEN' : '🛑 LOSING MONEY', '', '', '', '', '', '', '', ''],
    ['Total Purchases', w7Buys, fmtD(w7Buys / 7, 1) + '/day', '', '', '', '', '', '', '', '', ''],
    ['Total Leads', w7Leads, fmtD(w7Leads / 7, 1) + '/day', '', '', '', '', '', '', '', '', ''],
    ['CPA (Cost per Purchase)', w7Cpa > 0 ? dollar(w7Cpa) : 'N/A', '', w7Cpa > 0 && w7Cpa < 4200 ? '✅ GOOD (<₹4,200)' : w7Cpa < 8400 ? '⚠️ WATCH' : '🛑 HIGH', '', '', '', '', '', '', '', ''],
    ['Impressions', fmt(w7Impr), fmt(Math.round(w7Impr / 7)) + '/day', '', '', '', '', '', '', '', '', ''],
    ['Clicks', fmt(w7Clicks), fmt(Math.round(w7Clicks / 7)) + '/day', '', '', '', '', '', '', '', '', ''],
    ['CTR', `${fmtD(w7Ctr)}%`, '', w7Ctr >= 1.5 ? '✅ STRONG' : w7Ctr >= 0.8 ? '⚠️ AVERAGE' : '🛑 LOW', '', '', '', '', '', '', '', ''],
    ['CPM (INR)', dollar(w7Cpm), '', '', '', '', '', '', '', '', '', ''],
    ['CPC (INR)', dollar(w7Cpc), '', '', '', '', '', '', '', '', '', ''],
    ['Frequency', fmtD(w7Freq), '', w7Freq > 4 ? '🛑 CRITICAL' : w7Freq > 3 ? '⚠️ WATCH' : '✅ HEALTHY', '', '', '', '', '', '', '', ''],
    [],
    ['📈 CAMPAIGN BREAKDOWN — LAST 7 DAYS', '', '', '', '', '', '', '', '', '', '', ''],
    ['⚡ ACTION', 'Campaign', 'Spend (INR)', 'Revenue (INR)', 'ROAS', 'CPA (INR)', 'Purchases', 'Leads', 'Impressions', 'CTR', 'CPC', 'CPM'],
    ...campRows7,
    ...(campRows7.length === 0 ? [['No campaign data for last 7 days', '', '', '', '', '', '', '', '', '', '', '']] : []),
    [],
    ['📅 DAY-BY-DAY BREAKDOWN — LAST 7 DAYS', '', '', '', '', '', '', '', '', '', '', ''],
    ['Date', 'Spend (INR)', 'Revenue (INR)', 'ROAS', 'Purchases', 'Impressions', 'Clicks', 'CTR', 'CPM', 'CPC', 'Trend', ''],
    ...trends7d.map((d, i) => {
      const purchases = parseFloat(getAction(d.actions, 'purchase') || 0);
      const revenue   = parseFloat(getAction(d.action_values, 'purchase') || 0);
      const spend     = parseFloat(d.spend || 0);
      const roas      = spend > 0 && revenue > 0 ? revenue / spend : 0;
      let trend = '—';
      if (i > 0) {
        const prev = trends7d[i - 1];
        const prevRoas = parseFloat(prev.spend||0) > 0 ? parseFloat(getAction(prev.action_values,'purchase')||0)/parseFloat(prev.spend) : 0;
        if (roas > prevRoas * 1.15) trend = '📈 Up';
        else if (roas < prevRoas * 0.85 && prevRoas > 0) trend = '📉 Down';
        else trend = '➡️ Stable';
      }
      return [d.date_start, dollar(spend), dollar(revenue), roasStr(roas), purchases,
        fmt(parseInt(d.impressions||0)), d.clicks||'0', `${fmtD(parseFloat(d.ctr||0))}%`,
        dollar(parseFloat(d.cpm||0)), dollar(parseFloat(d.cpc||0)), trend, ''];
    }),
    [],
    ['🏆 WEEK HIGHLIGHTS', '', '', '', '', '', '', '', '', '', '', ''],
    ['Best Day of the Week', best7Day ? best7Day.date_start : 'N/A', best7Day ? `ROAS ${roasStr(parseFloat(best7Day.spend||0)>0?parseFloat(getAction(best7Day.action_values,'purchase')||0)/parseFloat(best7Day.spend):0)}` : '', '', '', '', '', '', '', '', '', ''],
    ['Worst Day of the Week', worst7Day ? worst7Day.date_start : 'N/A', worst7Day ? `ROAS ${roasStr(parseFloat(worst7Day.spend||0)>0?parseFloat(getAction(worst7Day.action_values,'purchase')||0)/parseFloat(worst7Day.spend):0)}` : '', '', '', '', '', '', '', '', '', ''],
    ['Best Campaign (7d)', campaignData7d.length > 0 ? [...campaignData7d].sort((a,b)=>{ const ra=parseFloat(a.spend||0)>0?parseFloat(getAction(a.action_values,'purchase')||0)/parseFloat(a.spend):0; const rb=parseFloat(b.spend||0)>0?parseFloat(getAction(b.action_values,'purchase')||0)/parseFloat(b.spend):0; return rb-ra; })[0]?.campaign_name||'N/A' : 'N/A', '', '', '', '', '', '', '', '', '', ''],
    ['Total Spend Wasted (0 conv)', dollar(campaignData7d.filter(c=>parseFloat(getAction(c.actions,'purchase')||0)===0&&parseFloat(getAction(c.actions,'lead')||0)===0&&parseFloat(c.spend||0)>200).reduce((s,c)=>s+parseFloat(c.spend||0),0)), '→ Review & pause these campaigns', '', '', '', '', '', '', '', '', ''],
  ];

  // ── TAB 16: Monthly Summary ────────────────────────────────────────────────
  const acc30 = accountData30d[0] || {};
  const m30Spend  = parseFloat(acc30.spend || 0);
  const m30Rev    = parseFloat(getAction(acc30.action_values, 'purchase') || 0);
  const m30Buys   = parseFloat(getAction(acc30.actions, 'purchase') || 0);
  const m30Leads  = parseFloat(getAction(acc30.actions, 'lead') || 0);
  const m30Roas   = m30Spend > 0 && m30Rev > 0 ? m30Rev / m30Spend : 0;
  const m30Cpa    = m30Buys > 0 ? m30Spend / m30Buys : 0;
  const m30Impr   = parseInt(acc30.impressions || 0);
  const m30Clicks = parseInt(acc30.clicks || 0);
  const m30Ctr    = parseFloat(acc30.ctr || 0);
  const m30Cpm    = parseFloat(acc30.cpm || 0);

  const campRows30 = campaignData30d.map(c => {
    const purchases = parseFloat(getAction(c.actions, 'purchase') || 0);
    const revenue   = parseFloat(getAction(c.action_values, 'purchase') || 0);
    const spend     = parseFloat(c.spend || 0);
    const leads     = parseFloat(getAction(c.actions, 'lead') || 0);
    const roas      = spend > 0 && revenue > 0 ? revenue / spend : 0;
    const cpa       = purchases > 0 ? spend / purchases : 0;
    const revShare  = m30Rev > 0 ? (revenue / m30Rev * 100).toFixed(1) + '%' : '0%';
    const spendShare = m30Spend > 0 ? (spend / m30Spend * 100).toFixed(1) + '%' : '0%';
    let action = '✅ KEEP';
    if (spend > 500 && purchases === 0 && leads === 0) action = '🛑 REVIEW';
    else if (roas >= 3) action = '🚀 TOP PERFORMER';
    else if (roas >= 2) action = '📈 STRONG';
    else if (roas > 0 && roas < 1 && spend > 500) action = '⚠️ UNDERPERFORMER';
    return [action, c.campaign_name, dollar(spend), spendShare, dollar(revenue), revShare,
      roasStr(roas), purchases > 0 ? dollar(cpa) : 'N/A', purchases, leads,
      fmt(parseInt(c.impressions || 0)), `${fmtD(parseFloat(c.ctr || 0))}%`];
  }).sort((a, b) => parseFloat(b[2].replace(/[₹,]/g,'')) - parseFloat(a[2].replace(/[₹,]/g,'')));

  // Week-by-week breakdown from trends30d
  const weeklyBreakdown = [];
  for (let w = 0; w < 4; w++) {
    const slice = trends30d.slice(w * 7, (w + 1) * 7);
    if (slice.length === 0) continue;
    const wSpend = slice.reduce((s,d) => s + parseFloat(d.spend||0), 0);
    const wRev   = slice.reduce((s,d) => s + parseFloat(getAction(d.action_values,'purchase')||0), 0);
    const wBuys  = slice.reduce((s,d) => s + parseFloat(getAction(d.actions,'purchase')||0), 0);
    const wRoas  = wSpend > 0 && wRev > 0 ? wRev / wSpend : 0;
    weeklyBreakdown.push([
      `Week ${w + 1}`, `${slice[0].date_start} → ${slice[slice.length-1].date_start}`,
      dollar(wSpend), dollar(wRev), roasStr(wRoas), wBuys,
      wBuys > 0 ? dollar(wSpend / wBuys) : 'N/A'
    ]);
  }

  const bestMonth = [...trends30d].sort((a,b)=>{
    const ra=parseFloat(a.spend||0)>0?parseFloat(getAction(a.action_values,'purchase')||0)/parseFloat(a.spend):0;
    const rb=parseFloat(b.spend||0)>0?parseFloat(getAction(b.action_values,'purchase')||0)/parseFloat(b.spend):0;
    return rb-ra;
  })[0];

  const monthlyTab = [
    ['📅 MONTHLY PERFORMANCE SUMMARY', `Last 30 Days ending ${dateStr}`, '', '', '', '', '', '', '', '', '', ''],
    ['━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '', '', '', '', '', '', '', '', '', '', ''],
    [],
    ['💰 ACCOUNT SUMMARY — LAST 30 DAYS', '', '', '', '', '', '', '', '', '', '', ''],
    ['Metric', 'Total (30 Days)', 'Daily Average', 'Weekly Average', 'Status', '', '', '', '', '', '', ''],
    ['Total Spend (INR)', dollar(m30Spend), dollar(m30Spend / 30), dollar(m30Spend / 4), m30Spend > 0 ? '✅' : '—', '', '', '', '', '', '', ''],
    ['Total Revenue (INR)', dollar(m30Rev), dollar(m30Rev / 30), dollar(m30Rev / 4), m30Rev > m30Spend ? '✅ Profitable' : '⚠️ Below Spend', '', '', '', '', '', '', ''],
    ['ROAS', roasStr(m30Roas), '', '', m30Roas >= 2 ? '✅ STRONG' : m30Roas >= 1 ? '⚠️ BREAK EVEN' : '🛑 LOSING MONEY', '', '', '', '', '', '', ''],
    ['Total Purchases', m30Buys, fmtD(m30Buys / 30, 1) + '/day', fmtD(m30Buys / 4, 0) + '/week', '', '', '', '', '', '', '', ''],
    ['Total Leads', m30Leads, fmtD(m30Leads / 30, 1) + '/day', '', '', '', '', '', '', '', '', ''],
    ['CPA (Cost per Purchase)', m30Cpa > 0 ? dollar(m30Cpa) : 'N/A', '', '', m30Cpa > 0 && m30Cpa < 4200 ? '✅ GOOD' : m30Cpa < 8400 ? '⚠️ WATCH' : '🛑 HIGH', '', '', '', '', '', '', ''],
    ['Total Impressions', fmt(m30Impr), fmt(Math.round(m30Impr / 30)) + '/day', '', '', '', '', '', '', '', '', ''],
    ['Total Clicks', fmt(m30Clicks), fmt(Math.round(m30Clicks / 30)) + '/day', '', '', '', '', '', '', '', '', ''],
    ['Avg CTR', `${fmtD(m30Ctr)}%`, '', '', m30Ctr >= 1.5 ? '✅ STRONG' : m30Ctr >= 0.8 ? '⚠️ AVERAGE' : '🛑 LOW', '', '', '', '', '', '', ''],
    ['Avg CPM (INR)', dollar(m30Cpm), '', '', '', '', '', '', '', '', '', ''],
    [],
    ['📊 WEEK-BY-WEEK BREAKDOWN', '', '', '', '', '', '', '', '', '', '', ''],
    ['Week', 'Date Range', 'Spend (INR)', 'Revenue (INR)', 'ROAS', 'Purchases', 'CPA (INR)', '', '', '', '', ''],
    ...weeklyBreakdown,
    [],
    ['📈 CAMPAIGN BREAKDOWN — LAST 30 DAYS', '', '', '', '', '', '', '', '', '', '', ''],
    ['⚡ STATUS', 'Campaign', 'Spend (INR)', 'Spend Share', 'Revenue (INR)', 'Rev Share', 'ROAS', 'CPA (INR)', 'Purchases', 'Leads', 'Impressions', 'CTR'],
    ...campRows30,
    ...(campRows30.length === 0 ? [['No campaign data for last 30 days', '', '', '', '', '', '', '', '', '', '', '']] : []),
    [],
    ['🏆 MONTHLY HIGHLIGHTS', '', '', '', '', '', '', '', '', '', '', ''],
    ['Best Performing Day', bestMonth ? bestMonth.date_start : 'N/A', bestMonth ? `ROAS ${roasStr(parseFloat(bestMonth.spend||0)>0?parseFloat(getAction(bestMonth.action_values,'purchase')||0)/parseFloat(bestMonth.spend):0)}` : '', '', '', '', '', '', '', '', '', ''],
    ['Top Campaign (30d)', campRows30.length > 0 ? campRows30.sort((a,b)=>parseFloat(b[6])-parseFloat(a[6]))[0][1] : 'N/A', campRows30.length > 0 ? `ROAS ${campRows30.sort((a,b)=>parseFloat(b[6])-parseFloat(a[6]))[0][6]}` : '', '', '', '', '', '', '', '', '', ''],
    ['Total Revenue Generated', dollar(m30Rev), '', '', '', '', '', '', '', '', '', ''],
    ['Total Ad Spend', dollar(m30Spend), '', '', '', '', '', '', '', '', '', ''],
    ['Net Profit from Ads', dollar(m30Rev - m30Spend), m30Rev > m30Spend ? '✅ Profitable' : '🛑 Loss', '', '', '', '', '', '', '', '', ''],
    ['Projected Annual Revenue (at current ROAS)', dollar(m30Rev / 30 * 365), '(if current performance holds)', '', '', '', '', '', '', '', '', ''],
  ];

  // ── WRITE ALL DATA ────────────────────────────────────────────────────────
  console.log('📝 Writing all data to 16 tabs...');
  const batchData = [
    { range: "'📊 Executive Dashboard'!A1", values: execDashboard },
    { range: "'🚨 Action Center'!A1", values: actionCenter },
    { range: "'📈 Campaign Performance'!A1", values: [campHeaders, ...campRows] },
    { range: "'🎯 Ad Set Intelligence'!A1", values: [adsetHeaders, ...adsetRows] },
    { range: "'🎨 Creative Performance'!A1", values: [adHeaders, ...adRows] },
    { range: "'👥 Audience Intelligence'!A1", values: audienceTab },
    { range: "'🌍 Geographic Performance'!A1", values: geoTab },
    { range: "'📱 Device & Platform'!A1", values: platformTab },
    { range: "'⏰ Hourly Performance'!A1", values: hourlyTab },
    { range: "'🔻 Funnel Analysis'!A1", values: funnelTab },
    { range: "'🔄 Creative Fatigue Tracker'!A1", values: fatigueTab },
    { range: "'📅 30-Day Trend Analysis'!A1", values: trendTab },
    { range: "'💰 Budget & Pacing'!A1", values: budgetTab },
    { range: "'🏆 AI Analysis & Strategy'!A1", values: aiTab },
    { range: "'📆 Weekly Report'!A1", values: weeklyTab },
    { range: "'📅 Monthly Summary'!A1", values: monthlyTab },
  ];

  // ── FETCH ADSET TARGETING SPECS ─────────────────────────────────────────
  console.log('🎯 Fetching adset targeting specs...');
  let adsetTargetingData = [];
  try {
    let tUrl = `https://graph.facebook.com/v21.0/${AD_ACCOUNT}/adsets?access_token=${META_TOKEN}&fields=id,name,status,effective_status,targeting,daily_budget,campaign_id,campaign_name&limit=200`;
    while (tUrl) {
      const tRes = await httpsGet(tUrl);
      if (tRes.error) { console.log('⚠️ Targeting fetch error:', tRes.error.message); break; }
      if (tRes.data) adsetTargetingData = adsetTargetingData.concat(tRes.data);
      tUrl = tRes.paging && tRes.paging.next ? tRes.paging.next : null;
    }
    console.log(`✅ Targeting: ${adsetTargetingData.length} adsets with targeting specs`);
  } catch(e) { console.log('⚠️ Targeting fetch failed:', e.message); }

  // ── FETCH HISTORICAL DATA (April 1 to yesterday) ─────────────────────────
  console.log('📅 Fetching historical data from April 1...');
  const HISTORY_START = '2026-04-01';
  const histRange = `&time_range={"since":"${HISTORY_START}","until":"${dateStr}"}&time_increment=1`;
  // Ad-level uses a smaller field set to avoid hitting API limits
  const histAdRange = `&time_range={"since":"${HISTORY_START}","until":"${dateStr}"}&time_increment=1&fields=ad_id,ad_name,campaign_name,adset_name,spend,frequency,action_values,actions&limit=500`;
  // Demo uses period total (no time_increment) to avoid "too much data" API error
  const histDemoRange = `&time_range={"since":"${HISTORY_START}","until":"${dateStr}"}&breakdowns=age,gender&fields=spend,action_values,actions&limit=500`;
  const [histAccData, histCampData, histAdsetData, histAdData, histDemoData] = await Promise.all([
    metaFetch('account', '', null, histRange),
    metaFetch('campaign', '', null, histRange),
    metaFetch('adset', '', null, histRange),
    metaFetch('ad', '', null, histAdRange).catch(() => []),
    metaFetch('account', '', null, histDemoRange).catch(() => []),
  ]);
  console.log(`✅ Historical: ${histAccData.length} days fetched, ${histAdData.length} ad-day rows`);

  const allDailyData = {};
  histAccData.forEach(d => {
    const sp = parseFloat(d.spend||0), rev = parseFloat(getAction(d.action_values,'purchase')||0);
    const buys = parseFloat(getAction(d.actions,'purchase')||0);
    const clicks = parseInt(d.clicks||0), impr = parseInt(d.impressions||0);
    const lpv = parseFloat(getAction(d.actions,'landing_page_view')||0);
    const atc = parseFloat(getAction(d.actions,'add_to_cart')||0);
    const checkout = parseFloat(getAction(d.actions,'initiate_checkout')||0);
    allDailyData[d.date_start] = {
      account: {
        spend:sp, revenue:rev, purchases:buys, leads:parseFloat(getAction(d.actions,'lead')||0),
        roas: sp>0&&rev>0?rev/sp:0, cpa: buys>0?sp/buys:0,
        impressions:impr, clicks, reach:parseInt(d.reach||0),
        ctr:parseFloat(d.ctr||0), cpc:parseFloat(d.cpc||0), cpm:parseFloat(d.cpm||0),
        freq:parseFloat(d.frequency||0), atc, checkout, lpv,
        fCtr: impr>0?clicks/impr*100:0, fLpv: clicks>0?lpv/clicks*100:0,
        fAtc: lpv>0?atc/lpv*100:0, fCheckout: atc>0?checkout/atc*100:0,
        fPurchase: checkout>0?buys/checkout*100:0,
      },
      campaigns:[], adsets:[], ads:[], demo:[]
    };
  });
  histCampData.forEach(d => {
    if (!allDailyData[d.date_start]) return;
    const sp=parseFloat(d.spend||0), rev=parseFloat(getAction(d.action_values,'purchase')||0), buys=parseFloat(getAction(d.actions,'purchase')||0);
    allDailyData[d.date_start].campaigns.push({
      id:d.campaign_id, name:d.campaign_name, spend:sp, revenue:rev, purchases:buys,
      leads:parseFloat(getAction(d.actions,'lead')||0),
      roas:sp>0&&rev>0?rev/sp:0, cpa:buys>0?sp/buys:0,
      impressions:parseInt(d.impressions||0), clicks:parseInt(d.clicks||0),
      ctr:parseFloat(d.ctr||0), cpm:parseFloat(d.cpm||0), freq:parseFloat(d.frequency||0),
    });
  });
  histAdsetData.forEach(d => {
    if (!allDailyData[d.date_start]) return;
    const sp=parseFloat(d.spend||0), rev=parseFloat(getAction(d.action_values,'purchase')||0), buys=parseFloat(getAction(d.actions,'purchase')||0);
    allDailyData[d.date_start].adsets.push({
      id:d.adset_id, name:d.adset_name, campName:d.campaign_name,
      spend:sp, revenue:rev, purchases:buys, roas:sp>0&&rev>0?rev/sp:0,
      ctr:parseFloat(d.ctr||0), freq:parseFloat(d.frequency||0), reach:parseInt(d.reach||0),
    });
  });

  histAdData.forEach(d => {
    if (!allDailyData[d.date_start]) return;
    const sp  = parseFloat(d.spend||0);
    const rev = parseFloat(getAction(d.action_values,'purchase')||0);
    const buys= parseFloat(getAction(d.actions,'purchase')||0);
    allDailyData[d.date_start].ads.push({
      id: d.ad_id, name: d.ad_name, campName: d.campaign_name, adsetName: d.adset_name,
      spend:sp, revenue:rev, purchases:buys,
      roas: sp>0&&rev>0 ? rev/sp : 0,
      freq: parseFloat(d.frequency||0),
    });
  });  // ── STORE DEMO (AGE/GENDER) PER DAY ──────────────────────────────────────
  (histDemoData||[]).forEach(d => {
    if (!allDailyData[d.date_start]) return;
    const sp  = parseFloat(d.spend||0);
    const rev = parseFloat(getAction(d.action_values,'purchase')||0);
    const buys= parseFloat(getAction(d.actions,'purchase')||0);
    allDailyData[d.date_start].demo.push({
      age: d.age||'Unknown', gender: d.gender||'Unknown',
      spend:sp, revenue:rev, purchases:buys,
    });
  });



  // ── GENERATE HTML DASHBOARD ───────────────────────────────────────────────
  const dashboardPath = require('path').join(__dirname, 'dashboard.html');
  try {
    // Build adsetTargetingMap for client-side reactivity
    const adsetTargetingMap = {};
    (adsetTargetingData || []).forEach(adset => {
      const t = adset.targeting || {};
      const interests = [];
      (t.flexible_spec || []).forEach(spec => {
        (spec.interests || []).forEach(int => interests.push({ id: int.id, name: int.name || int.id }));
      });
      const customAudiences = (t.custom_audiences || []).map(ca => ({ id: ca.id, name: ca.name || ca.id }));
      const lookalikes = (t.lookalike_spec ? [t.lookalike_spec] : []).map(ll => 'Lookalike ' + (ll.country || '') + ' ' + (ll.ratio ? (ll.ratio*100).toFixed(0)+'%' : '')).filter(Boolean);
      adsetTargetingMap[adset.id] = {
        adsetName: adset.name || adset.id,
        interests, customAudiences, lookalikes,
      };
    });

    generateDashboard({
      dateStr, yesterdaySpend, accRevenue, accRoas, accPurchases, accCpa,
      accCtr, accCpm, accCpc, accImpressions, accReach, accFreq,
      accAtc, accCheckout, accLpv, accClicks, accLeads,
      prevDayAccSpend, prevDayAccRevenue, prevDayAccPurchases, prevDayAccRoas,
      avg7Spend, avg7Roas, total30Spend,
      campsEnriched, adsetData, adData, trends30d, trends7d, hourlyData,
      deviceData, geoEnriched, placEnriched, demoEnriched,
      fCtr, fLpv, fAtc, fCheckout, fPurchase,
      actionItems, spreadsheetUrl, allDailyData,
      historyStart: HISTORY_START,
      adsetTargetingData,
      adsetTargetingMap,
      shopifyData,
      amazonData,
    }, dashboardPath, 'Logi5');
    console.log(`✅ Dashboard saved: ${dashboardPath}`);
  } catch(e) {
    console.log('⚠️  Dashboard generation error:', e.message);
  }

  // ── PUSH TO GITHUB PAGES ─────────────────────────────────────────────────
  const dashboardUrl = 'https://www.revnoxmedia.com/dashboard.html';
  // When running inside GitHub Actions, the workflow commits via git — skip API push
  const inCI = process.env.GITHUB_ACTIONS === 'true';
  if (!inCI && GITHUB_TOKEN) {
    console.log('🚀 Pushing dashboard to GitHub Pages...');
    try {
      await pushToGitHub(dashboardPath, 'dashboard.html', `Meta Ads report ${dateStr}`);
      console.log(`✅ Live in ~60s: ${dashboardUrl}`);
    } catch(e) {
      console.log('⚠️  GitHub push failed:', e.message);
    }
  } else if (inCI) {
    console.log(`✅ Dashboard ready for git commit: ${dashboardUrl}`);
  } else {
    console.log('⚠️  GITHUB_TOKEN not set — skipping push. Dashboard at: ' + dashboardPath);
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('✅  META ADS REPORT COMPLETE');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`📅  Date:      ${dateStr}`);
  console.log(`💰  Spend:     ${dollar(yesterdaySpend)}`);
  console.log(`📈  ROAS:      ${roasStr(accRoas)}`);
  console.log(`🛒  Purchases: ${accPurchases}`);
  console.log(`💵  Revenue:   ${dollar(accRevenue)}`);
  console.log(`💱  Currency:  INR (₹)`);
  console.log(`🌐  Website:   ${dashboardUrl}`);
  console.log('═══════════════════════════════════════════════════════');

  fs.appendFileSync('C:\\Users\\Sagar Chauhan\\Documents\\meta-ads-automation\\report-log.txt',
    `${dateStr} | ${reportTitle} | ${dashboardUrl}\n`);
}

main().catch(err => { console.error('❌ Error:', err.message || JSON.stringify(err)); process.exit(1); });
