// ============================================================
// REVNOX LIVE DATA LAYER
// Replaces all hardcoded _SH_* and _OV_META_DAILY constants
// with live Supabase data + Realtime subscriptions.
//
// HOW TO USE:
//   1. Add to dashboard.html <head> BEFORE any other scripts:
//      <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
//      <script src="live-data.js"></script>
//   2. Set your Supabase credentials in the CONFIG block below.
//   3. Remove all _SH_DAILY, _SH_PRODUCTS, etc. const declarations
//      from dashboard.html (they will be set by this file).
// ============================================================

// ── CONFIG — update these with your Supabase project details ─
const REVNOX_CONFIG = {
  SUPABASE_URL:  'https://hxtzzrxbkoaqdivcpayl.supabase.co',
  SUPABASE_ANON: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4dHp6cnhia29hcWRpdmNwYXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MTkxNzcsImV4cCI6MjA5MzA5NTE3N30.BuGhFBDu_1HGmEIIGzje6tgnr43WmI7jEF8zYp2plGQ',
}

// ── Init Supabase client ──────────────────────────────────────
const _sb = supabase.createClient(REVNOX_CONFIG.SUPABASE_URL, REVNOX_CONFIG.SUPABASE_ANON)

// ── Global data stores (same names as old hardcoded constants) ─
window._SH_DAILY     = []
window._SH_HOURLY    = {}
window._SH_BUCKETS   = {"<500":0,"500-1k":0,"1k-2k":0,"2k-5k":0,">5k":0}
window._SH_PRODUCTS  = []
window._SH_STATES    = []
window._SH_CITIES    = []
window._SH_DISCOUNTS = []
window._SH_TODAY     = { gmv:0, orders:0, aov:0, netRev:0, units:0, discount:0,
                          newCust:0, retCust:0, cod:0, prepaid:0, cancelled:0,
                          fulfilled:0, pending:0, tax:0, shipping:0, freeShip:0,
                          abandoned:0, abandonedVal:0, checkoutRate:0, discountRate:0,
                          peakHour:null, prevGmv:0, prevOrders:0, gmvChange:0, ordersChange:0 }
window._OV_META_DAILY = {}

// Last loaded dates for display
window._SH_DATE_MAX  = new Date().toISOString().slice(0,10)
window._SH_DATE_MIN  = new Date().toISOString().slice(0,10)

// ── Loading state helpers ─────────────────────────────────────
function _showLoadingBanner() {
  const el = document.getElementById('sh-true-roas-banner')
  if (el) el.innerHTML = `
    <div style="background:rgba(30,41,59,0.4);border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:14px 20px;display:flex;align-items:center;gap:12px">
      <div style="width:20px;height:20px;border:2px solid #3b82f6;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite"></div>
      <span style="font-size:13px;color:#64748b">Loading live data from Supabase...</span>
    </div>`
}

function _updateRefreshBadge(status = 'live') {
  const el = document.getElementById('nav-last-refreshed') || document.getElementById('liveTimer')
  if (!el) return
  const now = new Date()
  const time = now.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true })
  if (status === 'live') {
    el.textContent = `Live · Updated ${time} IST`
    el.style.color = '#10b981'
  } else if (status === 'error') {
    el.textContent = `⚠ Data load failed`
    el.style.color = '#ef4444'
  }
}

// ── Fetch all Shopify data from Supabase ──────────────────────
async function _loadShopifyData() {
  const [daily, products, states, cities, discounts, hourly] = await Promise.all([
    _sb.from('shopify_daily').select('*').order('date', { ascending: true }),
    _sb.from('shopify_products').select('*').order('revenue', { ascending: false }),
    _sb.from('shopify_states').select('*').order('revenue', { ascending: false }),
    _sb.from('shopify_cities').select('*').order('revenue', { ascending: false }),
    _sb.from('shopify_discounts').select('*').order('amount', { ascending: false }),
    _sb.from('shopify_hourly').select('*')
       .eq('date', new Date(Date.now() + 5.5*3600000).toISOString().slice(0,10))
       .order('hour', { ascending: true }),
  ])

  if (daily.error) throw new Error('shopify_daily: ' + daily.error.message)

  // Map daily data to match old format
  window._SH_DAILY = (daily.data || []).map(d => ({
    date:      d.date,
    orders:    d.orders,
    gmv:       parseFloat(d.gmv),
    newCust:   d.new_cust,
    retCust:   d.ret_cust,
    units:     d.units,
    discount:  parseFloat(d.discount),
    cod:       d.cod,
    prepaid:   d.prepaid,
    tax:       parseFloat(d.tax),
    shipping:  parseFloat(d.shipping),
    fulfilled: d.fulfilled,
    freeShip:  d.free_ship,
    cancelled: d.cancelled,
  }))

  if (window._SH_DAILY.length > 0) {
    window._SH_DATE_MIN = window._SH_DAILY[0].date
    window._SH_DATE_MAX = window._SH_DAILY[window._SH_DAILY.length - 1].date
  }

  // Products
  window._SH_PRODUCTS = (products.data || []).map(p => ({
    title:   p.title,
    units:   p.units,
    revenue: parseFloat(p.revenue),
    orders:  p.orders,
  }))

  // States
  window._SH_STATES = (states.data || []).map(s => ({
    state:   s.state,
    orders:  s.orders,
    revenue: parseFloat(s.revenue),
  }))

  // Cities
  window._SH_CITIES = (cities.data || []).map(c => ({
    city:    c.city,
    orders:  c.orders,
    revenue: parseFloat(c.revenue),
  }))

  // Discounts
  window._SH_DISCOUNTS = (discounts.data || []).map(d => ({
    code:   d.code,
    uses:   d.uses,
    amount: parseFloat(d.amount),
  }))

  // Hourly (keyed by hour number, same as old _SH_HOURLY format)
  const hourlyMap = {}
  ;(hourly.data || []).forEach(h => {
    hourlyMap[h.hour] = { orders: h.orders, revenue: parseFloat(h.revenue) }
  })
  window._SH_HOURLY = hourlyMap

  // Build _SH_TODAY from the last day in daily
  const todayStr  = window._SH_DATE_MAX
  const todayData = window._SH_DAILY.find(d => d.date === todayStr)
  const yestData  = window._SH_DAILY.find(d => d.date < todayStr)

  if (todayData) {
    const gmv    = todayData.gmv
    const orders = todayData.orders
    const aov    = orders > 0 ? gmv / orders : 0
    const netRev = gmv - todayData.discount

    // Find peak hour
    let peakHour = null
    let peakOrders = 0
    Object.entries(hourlyMap).forEach(([h, v]) => {
      if (v.orders > peakOrders) {
        peakOrders = v.orders
        peakHour = { hour: h, orders: v.orders, revenue: v.revenue }
      }
    })

    window._SH_TODAY = {
      gmv, orders, aov, netRev,
      units:        todayData.units,
      discount:     todayData.discount,
      newCust:      todayData.newCust,
      retCust:      todayData.retCust,
      cod:          todayData.cod,
      prepaid:      todayData.prepaid,
      cancelled:    todayData.cancelled,
      fulfilled:    todayData.fulfilled,
      pending:      Math.max(0, orders - todayData.fulfilled),
      tax:          todayData.tax,
      shipping:     todayData.shipping,
      freeShip:     todayData.freeShip,
      abandoned:    0,   // requires Shopify Admin API — set via separate endpoint
      abandonedVal: 0,
      checkoutRate: 0,
      discountRate: orders > 0 ? (todayData.cod === 0 ? 100 : (1 - todayData.cod/orders)*100) : 0,
      peakHour,
      prevGmv:      yestData?.gmv || 0,
      prevOrders:   yestData?.orders || 0,
      gmvChange:    yestData?.gmv > 0 ? (gmv - yestData.gmv) / yestData.gmv * 100 : 0,
      ordersChange: yestData?.orders > 0 ? (orders - yestData.orders) / yestData.orders * 100 : 0,
      prevAov:      yestData && yestData.orders > 0 ? yestData.gmv / yestData.orders : 0,
    }
  }
}

// ── Fetch Meta data from Supabase ─────────────────────────────
async function _loadMetaData() {
  // Fetch daily metrics + campaigns in parallel
  const [dailyRes, campaignsRes] = await Promise.all([
    _sb.from('meta_daily').select('*').order('date', { ascending: true }),
    _sb.from('meta_campaigns').select('*').order('date', { ascending: true }),
  ])

  if (dailyRes.error) throw new Error('meta_daily: ' + dailyRes.error.message)

  const dailyRows    = dailyRes.data    || []
  const campaignRows = campaignsRes.data || []   // non-fatal if campaigns table missing

  // Group campaigns by date
  const campaignsByDate = {}
  campaignRows.forEach(c => {
    if (!campaignsByDate[c.date]) campaignsByDate[c.date] = []
    campaignsByDate[c.date].push({
      id:          c.campaign_id   || c.id,
      name:        c.campaign_name || c.name || 'Campaign',
      spend:       parseFloat(c.spend)      || 0,
      revenue:     parseFloat(c.revenue)    || 0,
      purchases:   parseFloat(c.purchases)  || 0,
      roas:        parseFloat(c.roas)       || 0,
      impressions: c.impressions            || 0,
      clicks:      c.clicks                 || 0,
      ctr:         parseFloat(c.ctr)        || 0,
      cpc:         parseFloat(c.cpc)        || 0,
      status:      c.status                 || 'ACTIVE',
    })
  })

  // Build a fully-populated object matching _allDaily's account structure:
  // { spend, revenue, purchases, leads, roas, cpa, impressions, clicks, reach,
  //   ctr, cpc, cpm, freq, atc, checkout, lpv,
  //   fCtr, fLpv, fAtc, fCheckout, fPurchase,
  //   link_clicks, add_to_cart, initiate_checkout }
  // + campaigns[] array per day
  const fresh = {}
  dailyRows.forEach(row => {
    const spend     = parseFloat(row.spend)             || 0
    const revenue   = parseFloat(row.revenue)           || 0
    const purchases = parseFloat(row.purchases)         || 0
    const impr      = row.impressions                   || 0
    const clicks    = row.clicks                        || 0
    const linkClk   = row.link_clicks                   || clicks
    const reach     = row.reach                         || impr
    const lpv       = row.landing_page_views            || 0
    const atc       = row.add_to_cart                   || 0
    const checkout  = row.initiate_checkout             || 0
    const ctr       = parseFloat(row.ctr)               || 0
    const cpc       = parseFloat(row.cpc)               || 0
    const cpm       = parseFloat(row.cpm)               || 0
    const roas      = parseFloat(row.roas)              || 0
    const cpa       = purchases > 0 ? spend / purchases : 0
    const freq      = reach     > 0 ? impr  / reach     : 1

    fresh[row.date] = {
      account: {
        spend, revenue, purchases, leads: 0,
        roas, cpa,
        impressions: impr, clicks, reach,
        ctr, cpc, cpm, freq,
        atc, checkout, lpv,
        link_clicks:       linkClk,
        add_to_cart:       atc,
        initiate_checkout: checkout,
        // Funnel conversion rates (%)
        fCtr:      impr     > 0 ? clicks    / impr     * 100 : 0,
        fLpv:      linkClk  > 0 ? lpv       / linkClk  * 100 : 0,
        fAtc:      lpv      > 0 ? atc       / lpv      * 100 : 0,
        fCheckout: atc      > 0 ? checkout  / atc      * 100 : 0,
        fPurchase: checkout > 0 ? purchases / checkout * 100 : 0,
      },
      campaigns: campaignsByDate[row.date] || [],
    }
  })

  // ── 1. Update window._OV_META_DAILY (used by Overall tab) ────
  window._OV_META_DAILY = fresh

  // ── 2. Mutate const _allDaily (hardcoded in dashboard.html) ──
  //    Classic-script consts ARE accessible by name but live on the
  //    script's scope, not on window — we can't reassign them but
  //    CAN mutate via delete+assign.
  if (typeof _allDaily !== 'undefined') {
    try {
      Object.keys(_allDaily).forEach(k => delete _allDaily[k])
      Object.assign(_allDaily, fresh)
    } catch (e) { console.warn('_allDaily mutate:', e) }
  }

  // ── 3. Mutate const _OV_META_DAILY (hardcoded in dashboard.html) ─
  if (typeof _OV_META_DAILY !== 'undefined') {
    try {
      Object.keys(_OV_META_DAILY).forEach(k => delete _OV_META_DAILY[k])
      Object.assign(_OV_META_DAILY, fresh)
    } catch (e) { console.warn('_OV_META_DAILY mutate:', e) }
  }

  // ── 4. Update _OV_META_TODAY with the latest day's data ───────
  const sortedDates = Object.keys(fresh).sort()
  if (sortedDates.length > 0) {
    const latestDate = sortedDates[sortedDates.length - 1]
    const prevDate   = sortedDates.length > 1 ? sortedDates[sortedDates.length - 2] : null
    const acc  = fresh[latestDate].account
    const prev = prevDate ? fresh[prevDate].account : null

    const todayObj = {
      spend:       acc.spend,
      revenue:     acc.revenue,
      purchases:   acc.purchases,
      roas:        acc.roas,
      cpa:         acc.cpa,
      ctr:         acc.ctr,
      cpc:         acc.cpc,
      cpm:         acc.cpm,
      impressions: acc.impressions,
      clicks:      acc.clicks,
      reach:       acc.reach,
      freq:        acc.freq,
      atc:         acc.atc,
      checkout:    acc.checkout,
      lpv:         acc.lpv,
      prevSpend:   prev?.spend   || 0,
      prevRev:     prev?.revenue || 0,
      prevRoas:    prev?.roas    || 0,
      spendChange: prev?.spend   > 0 ? (acc.spend   - prev.spend)   / prev.spend   * 100 : 0,
      revChange:   prev?.revenue > 0 ? (acc.revenue - prev.revenue) / prev.revenue * 100 : 0,
      roasChange:  prev?.roas    > 0 ? (acc.roas    - prev.roas)    / prev.roas    * 100 : 0,
    }

    window._OV_META_TODAY = todayObj
    if (typeof _OV_META_TODAY !== 'undefined') {
      try {
        Object.keys(_OV_META_TODAY).forEach(k => delete _OV_META_TODAY[k])
        Object.assign(_OV_META_TODAY, todayObj)
      } catch (e) { console.warn('_OV_META_TODAY mutate:', e) }
    }
  }

  console.log(`   Meta: ${Object.keys(fresh).length} days loaded (${sortedDates[0]} → ${sortedDates[sortedDates.length-1]})`)
}

// ── Subscribe to Realtime changes ─────────────────────────────
function _subscribeRealtime() {
  // Shopify daily changes → re-render Shopify tab
  _sb.channel('shopify-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shopify_daily' }, async (payload) => {
      console.log('🛍️ Shopify order update received', payload.new?.date)

      // Patch the in-memory array
      const updated = payload.new
      if (!updated) return
      const idx = window._SH_DAILY.findIndex(d => d.date === updated.date)
      const mapped = {
        date: updated.date, orders: updated.orders, gmv: parseFloat(updated.gmv),
        newCust: updated.new_cust, retCust: updated.ret_cust, units: updated.units,
        discount: parseFloat(updated.discount), cod: updated.cod, prepaid: updated.prepaid,
        tax: parseFloat(updated.tax), shipping: parseFloat(updated.shipping),
        fulfilled: updated.fulfilled, freeShip: updated.free_ship, cancelled: updated.cancelled,
      }
      if (idx >= 0) window._SH_DAILY[idx] = mapped
      else window._SH_DAILY.push(mapped)
      window._SH_DAILY.sort((a,b) => a.date.localeCompare(b.date))

      // Re-render if Shopify tab is active
      const f = document.getElementById('sh-from')?.value || window._SH_DATE_MIN
      const t = document.getElementById('sh-to')?.value   || window._SH_DATE_MAX
      if (typeof renderShopify === 'function') renderShopify(f, t)

      _updateRefreshBadge('live')
      _showLiveOrderToast(updated)
    })
    .subscribe()

  // Meta daily changes → refresh Meta tab
  _sb.channel('meta-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'meta_daily' }, async () => {
      console.log('📊 Meta data updated')
      await _loadMetaData()
      // Re-apply current range so KPIs and charts refresh with fresh data
      if (typeof applyRange === 'function') applyRange()
      if (document.querySelector('#ptab-meta.active') && typeof renderMeta === 'function') renderMeta()
      if (document.querySelector('#ptab-overall.active') && typeof renderOverall === 'function') renderOverall()
      _updateRefreshBadge('live')
    })
    .subscribe()

  // Hourly orders → update today's hourly chart live
  _sb.channel('hourly-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shopify_hourly' }, async (payload) => {
      const row = payload.new
      if (!row) return
      window._SH_HOURLY[row.hour] = { orders: row.orders, revenue: parseFloat(row.revenue) }
      if (typeof _shChart !== 'undefined' && _shChart) {
        _shChart.data.datasets[0].data[row.hour] = row.orders
        _shChart.data.datasets[1].data[row.hour] = parseFloat(row.revenue)
        _shChart.update('none')
      }
    })
    .subscribe()
}

// ── Live order toast notification ────────────────────────────
function _showLiveOrderToast(data) {
  const gmv    = parseFloat(data.gmv || 0)
  const orders = data.orders || 0
  // Show only if this is today's data
  const todayStr = new Date(Date.now() + 5.5*3600000).toISOString().slice(0,10)
  if (data.date !== todayStr) return

  const toast = document.createElement('div')
  toast.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:9999;
    background:linear-gradient(135deg,rgba(16,185,129,0.15),rgba(30,41,59,0.95));
    border:1px solid rgba(16,185,129,0.4);border-radius:12px;
    padding:12px 18px;min-width:220px;
    box-shadow:0 8px 32px rgba(0,0,0,0.4);
    animation:fadeInUp 0.3s ease-out;
    font-family:Inter,sans-serif;
  `
  toast.innerHTML = `
    <div style="font-size:11px;color:#10b981;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">🛒 New Order</div>
    <div style="font-size:15px;font-weight:700;color:#f8fafc">Today: ${orders} orders · ₹${parseInt(gmv).toLocaleString('en-IN')}</div>
    <div style="font-size:11px;color:#64748b;margin-top:2px">Live update · Supabase Realtime</div>
  `
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 4000)
}

// ── Bootstrap: load all data then render dashboard ───────────
async function _bootstrapRevnox() {
  _showLoadingBanner()

  try {
    await Promise.all([_loadShopifyData(), _loadMetaData()])
    _subscribeRealtime()
    _updateRefreshBadge('live')
    console.log('✅ Revnox live data loaded successfully')
    console.log(`   Shopify: ${window._SH_DAILY.length} days | Meta: ${Object.keys(window._OV_META_DAILY).length} days`)

    // Trigger initial render once live data is ready
    // Meta: apply MTD preset so KPIs recalculate from fresh _allDaily
    if (typeof metaSetPreset === 'function') metaSetPreset('mtd')
    else if (typeof applyRange === 'function') applyRange()

    // Shopify: apply MTD preset
    if (typeof shSetPreset === 'function') shSetPreset('mtd')

    // Switch to the correct platform tab
    if (typeof switchPlatform === 'function') {
      const hash = window.location.hash.replace('#','')
      switchPlatform(['meta','shopify','amazon','overall'].includes(hash) ? hash : 'meta')
    }

    // Auto-refresh Meta data every 15 min (fallback if pg_cron misses)
    setInterval(async () => {
      await _loadMetaData()
      if (typeof applyRange === 'function') applyRange()
      console.log('🔄 Meta data refreshed (15-min interval)')
    }, 15 * 60 * 1000)

  } catch (err) {
    console.error('❌ Revnox data load failed:', err)
    _updateRefreshBadge('error')
  }
}

// ── Start when DOM is ready ───────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _bootstrapRevnox)
} else {
  _bootstrapRevnox()
}
