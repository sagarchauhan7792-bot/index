/**
 * Meta Ads Intelligence Dashboard - ENHANCED
 * Fully functional with all analytics, trend analysis, and dynamic date filtering
 */
const fs = require('fs');
const path = require('path');

function generateDashboard(data, outputPath, brandName = 'Meta Ads') {
  const {
    dateStr, yesterdaySpend, accRevenue, accRoas, accPurchases, accCpa,
    accCtr, accCpm, accCpc, accImpressions, accReach, accFreq,
    accAtc, accCheckout, accLpv, accClicks, accLeads,
    prevDayAccSpend, prevDayAccRevenue, prevDayAccPurchases, prevDayAccRoas,
    avg7Spend, avg7Roas, total30Spend,
    campsEnriched, adsetData, adData, trends30d = [], trends7d = [], hourlyData = [],
    deviceData = [], geoEnriched = [], placEnriched = [], demoEnriched = [],
    fCtr = 0, fLpv = 0, fAtc = 0, fCheckout = 0, fPurchase = 0,
    actionItems = [], spreadsheetUrl = '',
    allDailyData = {}, historyStart = '2026-04-01',
    adsetTargetingData = [],
    adsetTargetingMap = {},
    shopifyData = null,
    amazonData = null,
  } = data;

  // ── SHOPIFY DERIVED ────────────────────────────────────────────────────────
  const sh = shopifyData || {};
  // ── TODAY ──────────────────────────────────────────────────────────────────
  const shGmv          = sh.gmv           || 0;
  const shOrders       = sh.orderCount    || 0;
  const shAov          = sh.aov           || 0;
  const shNetRevenue   = sh.netRevenue    || 0;
  const shUnits        = sh.totalUnits    || 0;
  const shDiscount     = sh.totalDiscount || 0;
  const shDiscountRate = sh.discountRate  || 0;
  const shNewCust      = sh.newCustomers  || 0;
  const shRetCust      = sh.returningCustomers || 0;
  const shAbandoned    = sh.abandonedCount || 0;
  const shAbandonedVal = sh.abandonedValue || 0;
  const shCheckoutRate = sh.checkoutCompleteRate || 0;
  const shPending      = sh.pendingFulfillment || 0;
  const shFulfilled    = sh.fulfilledOrders || 0;
  const shRefunds      = sh.refundAmount  || 0;
  const shCancelled    = sh.cancelledToday || 0;
  const shCod          = sh.codOrders     || 0;
  const shPrepaid      = sh.prepaidOrders || 0;
  const shTax          = sh.taxCollected  || 0;
  const shShipping     = sh.shippingRevenue || 0;
  const shFreeShip     = sh.freeShippingOrders || 0;
  const shTopProducts  = sh.topProducts   || [];
  const shTopDiscounts = sh.topDiscounts  || [];
  const shTopCities    = sh.topCities     || [];
  const shTopStates    = sh.topStates     || [];
  const shHourly       = sh.hourlyOrders  || {};
  const shPeakHour     = sh.peakHour      || null;
  // ── YESTERDAY ─────────────────────────────────────────────────────────────
  const shPrevGmv      = sh.prevGmv       || 0;
  const shPrevOrders   = sh.prevCount     || 0;
  const shPrevAov      = sh.prevAov       || 0;
  const gmvChange      = sh.gmvChange     || 0;
  const ordersChange   = sh.ordersChange  || 0;
  const aovChange      = sh.aovChange     || 0;
  // ── PERIOD (Apr 1 → today) ────────────────────────────────────────────────
  const shPGmv         = sh.periodGmv     || 0;
  const shPOrders      = sh.periodOrders  || 0;
  const shPAov         = sh.periodAov     || 0;
  const shPUnits       = sh.periodUnits   || 0;
  const shPNetRev      = sh.periodNetRev  || 0;
  const shPDiscount    = sh.periodDiscount|| 0;
  const shPTax         = sh.periodTax     || 0;
  const shPShipping    = sh.periodShipping|| 0;
  const shPNewCust     = sh.periodNewCust || 0;
  const shPRetCust     = sh.periodRetCust || 0;
  const shPCod         = sh.periodCodOrders || 0;
  const shPPrepaid     = sh.periodPrepaid || 0;
  const shPCancelled   = sh.periodCancelled || 0;
  const shPTopProds    = sh.periodTopProducts || [];
  const shPTopDisc     = sh.periodTopDiscounts || [];
  const shPTopCities   = sh.periodTopCities || [];
  const shPTopStates   = sh.periodTopStates || [];
  const shDailyTrend   = sh.dailyTrend    || [];
  const shCumGmv       = sh.cumulativeGmv || [];
  const shBestDay      = sh.bestDay       || null;
  const shWorstDay     = sh.worstDay      || null;
  const shAvgDailyGmv  = sh.avgDailyGmv  || 0;
  const shAvgDailyOrd  = sh.avgDailyOrders|| 0;
  const shBuckets      = sh.orderValueBuckets || {};
  const shPDays        = sh.periodDays    || 1;
  const shRepeatRate   = sh.repeatRate    || 0;
  const shCancelRate   = sh.cancelRate    || 0;
  const shCodRate      = sh.codRate       || 0;
  const shFreeShipRate = sh.freeShipRate  || 0;
  const shAvgDiscPct   = sh.avgDiscountPct|| 0;
  // ── CROSS-CHANNEL ─────────────────────────────────────────────────────────
  const trueRoas  = yesterdaySpend > 0 && shGmv > 0 ? shGmv / yesterdaySpend : 0;
  const cac       = shNewCust > 0 ? yesterdaySpend / shNewCust : 0;

  // ── AMAZON DERIVED ─────────────────────────────────────────────────────────
  const amz = amazonData || {};
  const amzSpend = amz.spend || 0;
  const amzRevenue = amz.revenue || 0;
  const amzOrders = amz.orders || 0;
  const amzRoas = amzSpend > 0 ? amzRevenue / amzSpend : 0;
  const amzConnected = amz.connected || false;

  // ── COMPUTE DERIVED METRICS ────────────────────────────────────────────────
  const accAov = accPurchases > 0 ? accRevenue / accPurchases : 0;
  const sortedDates = Object.keys(allDailyData).sort();
  const latestDate = sortedDates[sortedDates.length - 1] || dateStr;

  // Period totals
  const periodTotal = { spend:0, revenue:0, purchases:0, leads:0, impressions:0, clicks:0 };
  sortedDates.forEach(d => {
    const a = allDailyData[d]?.account || {};
    periodTotal.spend += a.spend || 0;
    periodTotal.revenue += a.revenue || 0;
    periodTotal.purchases += a.purchases || 0;
    periodTotal.leads += a.leads || 0;
    periodTotal.impressions += a.impressions || 0;
    periodTotal.clicks += a.clicks || 0;
  });
  periodTotal.roas = periodTotal.spend > 0 && periodTotal.revenue > 0
    ? periodTotal.revenue / periodTotal.spend : 0;
  periodTotal.cpa = periodTotal.purchases > 0
    ? periodTotal.spend / periodTotal.purchases : 0;
  periodTotal.aov = periodTotal.purchases > 0
    ? periodTotal.revenue / periodTotal.purchases : 0;
  const numDays = sortedDates.length;

  // Best/Worst days
  const bestDay = [...sortedDates].sort((a,b) => (allDailyData[b]?.account?.roas||0) - (allDailyData[a]?.account?.roas||0))[0];
  const worstDay = [...sortedDates].filter(d => allDailyData[d]?.account?.spend > 100)
    .sort((a,b) => (allDailyData[a]?.account?.roas||0) - (allDailyData[b]?.account?.roas||0))[0];
  const highSpendDay = [...sortedDates].sort((a,b) => (allDailyData[b]?.account?.spend||0) - (allDailyData[a]?.account?.spend||0))[0];

  // Aggregate platform data
  const platformMap = {};
  (placEnriched || []).forEach(p => {
    const key = p.platform || 'Unknown';
    if (!platformMap[key]) platformMap[key] = 0;
    platformMap[key] += p.spend || 0;
  });
  const platformLabels = Object.keys(platformMap).slice(0, 8);
  const platformSpends = platformLabels.map(k => platformMap[k]);

  // Aggregate demographic data by age+gender (multiple campaigns share same segment)
  const demoMap = {};
  (demoEnriched || []).forEach(d => {
    const key = `${d.age || '?'}/${d.gender || '?'}`;
    if (!demoMap[key]) demoMap[key] = { spend: 0, revenue: 0, purchases: 0 };
    demoMap[key].spend    += parseFloat(d.spend    || 0);
    demoMap[key].revenue  += parseFloat(d.revenue  || 0);
    demoMap[key].purchases+= parseFloat(d.purchases|| 0);
  });
  const demoAgg = Object.entries(demoMap)
    .map(([label, v]) => ({ label, ...v, roas: v.spend > 0 ? v.revenue / v.spend : 0 }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 8);
  const demoLabels = demoAgg.map(d => d.label);
  const demoRoas   = demoAgg.map(d => parseFloat(d.roas.toFixed(2)));
  const demoSpend  = demoAgg.map(d => d.spend);

  // Weekly aggregation — calendar-month buckets: 1-7, 8-14, 15-21, 22-28, 29-end
  const weeklyMap = {};
  sortedDates.forEach(d => {
    const date = new Date(d);
    const day = date.getDate();
    const yr = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    let wNum, wLabel;
    if (day <= 7)  { wNum = 1; wLabel = `${yr}-${mo} W1 (1–7)`; }
    else if (day <= 14) { wNum = 2; wLabel = `${yr}-${mo} W2 (8–14)`; }
    else if (day <= 21) { wNum = 3; wLabel = `${yr}-${mo} W3 (15–21)`; }
    else if (day <= 28) { wNum = 4; wLabel = `${yr}-${mo} W4 (22–28)`; }
    else { wNum = 5; wLabel = `${yr}-${mo} W5 (29–end)`; }
    const weekKey = `${yr}-${mo}-W${wNum}`;
    if (!weeklyMap[weekKey]) {
      weeklyMap[weekKey] = { label: wLabel, spend: 0, revenue: 0, purchases: 0, impressions: 0, clicks: 0 };
    }
    const a = allDailyData[d]?.account || {};
    weeklyMap[weekKey].spend += a.spend || 0;
    weeklyMap[weekKey].revenue += a.revenue || 0;
    weeklyMap[weekKey].purchases += a.purchases || 0;
    weeklyMap[weekKey].impressions += a.impressions || 0;
    weeklyMap[weekKey].clicks += a.clicks || 0;
  });

  // Chart data preparation
  const ovDates = sortedDates.map(d => {
    const dt = new Date(d);
    return `${dt.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getMonth()]}`;
  });
  const ovSpend = sortedDates.map(d => parseFloat((allDailyData[d]?.account?.spend || 0).toFixed(2)));
  const ovRevenue = sortedDates.map(d => parseFloat((allDailyData[d]?.account?.revenue || 0).toFixed(2)));
  const ovRoas = sortedDates.map(d => parseFloat((allDailyData[d]?.account?.roas || 0).toFixed(2)));
  const ovPurchases = sortedDates.map(d => allDailyData[d]?.account?.purchases || 0);

  // Hourly data - Meta API returns hourly_stats_aggregated_by_advertiser_time_zone field (0-23)
  const hourlyLabels = (hourlyData || []).map((h, i) => {
    // Try the breakdown field first (most reliable)
    const hStat = h.hourly_stats_aggregated_by_advertiser_time_zone;
    if (hStat !== undefined && hStat !== null) {
      const hr = parseInt(hStat, 10);
      return `${String(hr).padStart(2,'0')}:00`;
    }
    // Fallback: parse date_start which may be "2026-04-23 14:00:00"
    const dateStr = h.date_start || '';
    if (dateStr.includes(' ')) {
      const hour = dateStr.split(' ')[1].split(':')[0];
      return `${hour}:00`;
    }
    if (dateStr.includes('T')) {
      const hour = dateStr.split('T')[1].split(':')[0];
      return `${hour}:00`;
    }
    // Last resort: use index
    return `${String(i).padStart(2,'0')}:00`;
  });
  const hourlySpend = (hourlyData || []).map(h => parseFloat(h.spend || 0));
  const hourlyRevenue = (hourlyData || []).map(h => {
    const avArr = h.action_values || [];
    const p = Array.isArray(avArr) ? avArr.find(x => x.action_type === 'purchase') : null;
    return parseFloat(p ? p.value : 0);
  });
  const hourlyRoasData = hourlySpend.map((sp, i) => sp > 0 && hourlyRevenue[i] > 0 ? parseFloat((hourlyRevenue[i] / sp).toFixed(2)) : 0);

  // Weekly hourly average — distribute 7-day avg total across hours proportionally to today's pattern
  const last7Days = sortedDates.slice(-7);
  const last7TotalSpend   = last7Days.reduce((s,d) => s + (allDailyData[d]?.account?.spend   || 0), 0);
  const last7TotalRevenue = last7Days.reduce((s,d) => s + (allDailyData[d]?.account?.revenue || 0), 0);
  const avgDailySpend7d   = last7Days.length > 0 ? last7TotalSpend   / last7Days.length : 0;
  const avgDailyRevenue7d = last7Days.length > 0 ? last7TotalRevenue / last7Days.length : 0;
  // Distribute by today's hourly proportion
  const todayTotalSpend   = hourlySpend.reduce((a,v) => a + v, 0);
  const todayTotalRevenue = hourlyRevenue.reduce((a,v) => a + v, 0);
  const weeklyHourlySpend   = hourlySpend.map(v => todayTotalSpend   > 0 ? parseFloat(((v / todayTotalSpend)   * avgDailySpend7d).toFixed(0))   : parseFloat((avgDailySpend7d   / Math.max(hourlySpend.length,1)).toFixed(0)));
  const weeklyHourlyRevenue = hourlyRevenue.map(v => todayTotalRevenue > 0 ? parseFloat(((v / todayTotalRevenue) * avgDailyRevenue7d).toFixed(0)) : parseFloat((avgDailyRevenue7d / Math.max(hourlyRevenue.length,1)).toFixed(0)));

  // Device data — aggregate by device_platform (multiple campaigns share same device)
  const deviceMap = {};
  (deviceData || []).forEach(d => {
    const nameMap = {'mobile_app':'Mobile App','desktop':'Desktop','mobile_web':'Mobile Web'};
    const key = nameMap[d.device_platform] || d.device_platform || 'Unknown';
    deviceMap[key] = (deviceMap[key] || 0) + parseFloat(d.spend || 0);
  });
  const devAgg = Object.entries(deviceMap).sort((a,b) => b[1] - a[1]).slice(0, 6);
  const devLabels = devAgg.map(([k]) => k);
  const devSpends = devAgg.map(([,v]) => v);

  // Local helper for action values (dashboard-side)
  const getAct = (arr, type) => { if (!Array.isArray(arr)) return 0; const f = arr.find(x=>x.action_type===type); return f ? f.value : 0; };

  // Creative buckets — enrich all ads first
  const allAds = (adData || []).map(a => {
    const sp = parseFloat(a.spend || 0);
    const avArr = a.action_values || [];
    const p = Array.isArray(avArr) ? avArr.find(x => x.action_type === 'purchase') : null;
    const rev = parseFloat(p ? p.value : 0);
    const roas = sp > 0 && rev > 0 ? rev / sp : 0;
    const freq = parseFloat(a.frequency || 0);
    const buys = parseInt(getAct(a.actions, 'purchase') || 0);
    const v25 = parseInt(getAct(a.video_p25_watched_actions, 'video_view') || 0);
    const v50 = parseInt(getAct(a.video_p50_watched_actions, 'video_view') || 0);
    const v100 = parseInt(getAct(a.video_p100_watched_actions, 'video_view') || 0);
    const plays = parseInt(getAct(a.video_play_actions, 'video_view') || 0);
    return { ...a, sp, rev, roas, freq, buys, v25, v50, v100, plays };
  }).filter(a => a.sp > 0);
  const topAds = [...allAds].sort((a,b) => b.sp - a.sp).slice(0, 8);
  // 3 buckets (min ₹200 spend, Fatigue bucket removed)
  const bucketTop      = [...allAds].filter(a=>a.sp>=200&&a.buys>0).sort((a,b)=>b.roas-a.roas).slice(0,8);
  const bucketBottom   = [...allAds].filter(a=>a.sp>=200&&a.roas<1).sort((a,b)=>a.roas-b.roas).slice(0,8);
  const bucketRunnerup = [...allAds].filter(a=>a.sp>=200&&a.roas>=1&&a.roas<2&&a.buys>0).sort((a,b)=>b.roas-a.roas).slice(0,8);
  // Fatigue chart still uses freq but min ₹200
  const bucketFatigue  = [...allAds].filter(a=>a.sp>=200&&a.freq>3).sort((a,b)=>b.freq-a.freq).slice(0,8);

  // Formatting helpers
  const fmt = n => parseInt(n || 0).toLocaleString('en-IN');
  const fmtD = (n, d = 2) => parseFloat(n || 0).toFixed(d);
  const dollar = n => '₹' + parseInt(n || 0).toLocaleString('en-IN');
  const dollarD = n => '₹' + parseFloat(n || 0).toFixed(2);
  const pct = n => parseFloat(n || 0).toFixed(1) + '%';
  const roasS = r => parseFloat(r) > 0 ? parseFloat(r).toFixed(2) + 'x' : '0x';
  const roasCls = r => r >= 2 ? 'badge-green' : r >= 1 ? 'badge-amber' : 'badge-red';
  const now = new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short', year: 'numeric'});

  const urgentCount = (actionItems || []).filter(a => a.urgency && a.urgency.includes('URGENT')).length;
  const scaleCount = (actionItems || []).filter(a => a.urgency && a.urgency.includes('SCALE')).length;

  // Table rows
  const campTableRows = (campsEnriched || []).map((c, i) => {
    let rLabel = '✅ Keep', rCls = 'ab-ok';
    if (c.spend > 50 && c.purchases === 0 && c.leads === 0) { rLabel = '🛑 Pause'; rCls = 'ab-pause'; }
    else if (c.roas >= 2) { rLabel = '🚀 Scale'; rCls = 'ab-scale'; }
    else if (c.roas > 0 && c.roas < 1) { rLabel = '⚠️ Reduce'; rCls = 'ab-warn'; }
    else if (c.spend < 10) { rLabel = '👀 Test'; rCls = 'ab-test'; }
    return `<tr><td class="cm">${i+1}</td><td class="cn" title="${c.name}">${c.name.length > 30 ? c.name.slice(0, 30) + '…' : c.name}</td><td>${dollar(c.spend)}</td><td style="color:${c.revenue > c.spend ? 'var(--g)' : c.revenue > 0 ? 'var(--a)' : 'var(--t2)'}">${dollar(c.revenue)}</td><td><span class="badge ${roasCls(c.roas)}">${roasS(c.roas)}</span></td><td>${c.purchases}</td><td>${c.cpa > 0 ? dollar(c.cpa) : '—'}</td><td>${pct(c.ctr)}</td><td>${dollar(c.cpm)}</td><td style="color:${c.frequency > 3.5 ? 'var(--r)' : c.frequency > 2.5 ? 'var(--a)' : 'var(--t)'}">${fmtD(c.frequency)}</td><td><span class="action-badge ${rCls}">${rLabel}</span></td></tr>`;
  }).join('');

  const adsetRows = (adsetData || []).sort((a, b) => parseFloat(b.spend || 0) - parseFloat(a.spend || 0)).slice(0, 15).map((a, i) => {
    const sp = parseFloat(a.spend || 0);
    const avArr = a.action_values || [];
    const p = Array.isArray(avArr) ? avArr.find(x => x.action_type === 'purchase') : null;
    const rev = parseFloat(p ? p.value : 0);
    const roas = sp > 0 && rev > 0 ? rev / sp : 0;
    const buysArr = a.actions || [];
    const b2 = Array.isArray(buysArr) ? buysArr.find(x => x.action_type === 'purchase') : null;
    const freq = parseFloat(a.frequency || 0);
    return `<tr><td class="cm">${i+1}</td><td class="cn">${(a.adset_name || a.name || '—').slice(0, 30)}</td><td class="cm" style="font-size:11px">${(a.campaign_name || '—').slice(0, 25)}</td><td>${dollar(sp)}</td><td style="color:${rev > sp ? 'var(--g)' : rev > 0 ? 'var(--a)' : 'var(--t2)'}">${dollar(rev)}</td><td><span class="badge ${roasCls(roas)}">${roasS(roas)}</span></td><td>${b2 ? b2.value : '0'}</td><td>${pct(a.ctr || 0)}</td><td style="color:${freq > 3.5 ? 'var(--r)' : freq > 2.5 ? 'var(--a)' : 'var(--t)'}">${fmtD(freq)}</td></tr>`;
  }).join('');

  const adRows = topAds.map((a, i) => {
    const sp = parseFloat(a.spend || 0);
    const avArr = a.action_values || [];
    const p = Array.isArray(avArr) ? avArr.find(x => x.action_type === 'purchase') : null;
    const rev = parseFloat(p ? p.value : 0);
    const roas = sp > 0 && rev > 0 ? rev / sp : 0;
    const freq = parseFloat(a.frequency || 0);
    const qr = a.quality_ranking || '';
    const buysArr = a.actions || [];
    const b2 = Array.isArray(buysArr) ? buysArr.find(x => x.action_type === 'purchase') : null;
    let sl = '✅ Active', sc = 'badge-blue';
    if (freq > 4) { sl = '⚠️ Fatigue'; sc = 'badge-amber'; }
    else if (roas >= 2) { sl = '🏆 Top'; sc = 'badge-green'; }
    else if (qr.includes('BELOW')) { sl = '❌ Low Quality'; sc = 'badge-red'; }
    return `<tr><td class="cm">${i+1}</td><td class="cn">${(a.ad_name || '—').slice(0, 28)}</td><td class="cm" style="font-size:11px">${(a.campaign_name || '—').slice(0, 22)}</td><td>${dollar(sp)}</td><td style="color:${rev > sp ? 'var(--g)' : rev > 0 ? 'var(--a)' : 'var(--t2)'}">${dollar(rev)}</td><td><span class="badge ${roasCls(roas)}">${roasS(roas)}</span></td><td>${b2 ? b2.value : '0'}</td><td>${pct(a.ctr || 0)}</td><td style="color:${freq > 3.5 ? 'var(--r)' : freq > 2.5 ? 'var(--a)' : 'var(--t)'}">${fmtD(freq)}</td><td><span class="badge ${sc}">${sl}</span></td></tr>`;
  }).join('');

  const geoRows = ((geoEnriched || []).sort((a, b) => b.spend - a.spend).slice(0, 10) || []).map((g, i) => {
    let dl = '👀 Monitor', dc = 'badge-gray';
    if (g.roas >= 2) { dl = '🚀 Scale'; dc = 'badge-green'; }
    else if (g.roas >= 1) { dl = '✅ Keep'; dc = 'badge-blue'; }
    else if (g.spend > 500) { dl = '⚠️ Reduce'; dc = 'badge-amber'; }
    return `<tr><td class="cm">${i+1}</td><td style="font-weight:600">${g.country || '—'}</td><td>${dollar(g.spend)}</td><td style="color:${g.revenue > g.spend ? 'var(--g)' : g.revenue > 0 ? 'var(--a)' : 'var(--t2)'}">${dollar(g.revenue)}</td><td><span class="badge ${roasCls(g.roas)}">${roasS(g.roas)}</span></td><td>${g.purchases}</td><td>${g.cpa > 0 ? dollar(g.cpa) : '—'}</td><td>${pct(g.ctr)}</td><td><span class="badge ${dc}">${dl}</span></td></tr>`;
  }).join('');

  const demoRows = demoAgg.slice(0, 10).map((d, i) => {
    const cpa = d.purchases > 0 ? d.spend / d.purchases : 0;
    return `<tr><td class="cm">${i+1}</td><td>${d.label}</td><td>${dollar(d.spend)}</td><td>${dollar(d.revenue)}</td><td><span class="badge ${roasCls(d.roas)}">${roasS(d.roas)}</span></td><td>${d.purchases}</td><td>${cpa > 0 ? dollar(cpa) : '—'}</td><td>—</td></tr>`;
  }).join('');

  // ── PARSE ADSET TARGETING SPECS ─────────────────────────────────────────────
  const interestMap = {};
  const customAudiences = [];
  const savedAudiences = [];
  const lookalikeSets = new Set();
  const geoTargets = new Set();
  const ageRanges = new Set();
  const genderMap = { 1: 'Male', 2: 'Female' };

  (adsetTargetingData || []).forEach(adset => {
    const t = adset.targeting || {};
    const status = adset.effective_status || adset.status || '';
    const isActive = ['ACTIVE', 'PAUSED'].includes(status);
    if (!isActive) return;
    const adsetName = (adset.adset_name || adset.name || 'Unknown adset').slice(0, 40);

    // Age range — store with adset name
    if (t.age_min || t.age_max) {
      ageRanges.add(`${t.age_min || 18}–${t.age_max || 65}+ (${adsetName})`);
    }

    // Geo — only countries (cities don't have spend data from targeting specs)
    const geo = t.geo_locations || {};
    if (geo.countries) geo.countries.forEach(c => geoTargets.add(c));
    // Note: cities/regions skipped — no spend data available from targeting specs

    // Interests (flexible_spec) — store adset names
    const specs = t.flexible_spec || [];
    specs.forEach(spec => {
      const interests = spec.interests || [];
      interests.forEach(int => {
        const nm = int.name || int.id || '?';
        if (!interestMap[nm]) interestMap[nm] = { name: nm, count: 0, adsets: [] };
        interestMap[nm].count++;
        if (!interestMap[nm].adsets.includes(adsetName)) interestMap[nm].adsets.push(adsetName);
      });
    });

    // Custom audiences — store adset names
    (t.custom_audiences || []).forEach(ca => {
      const existing = customAudiences.find(x => x.id === ca.id);
      if (!existing) {
        customAudiences.push({ id: ca.id, name: ca.name || `Audience ${ca.id}`, adsets: [adsetName] });
      } else {
        if (!existing.adsets) existing.adsets = [];
        if (!existing.adsets.includes(adsetName)) existing.adsets.push(adsetName);
      }
    });

    // Saved audiences
    if (t.saved_audience_id) {
      savedAudiences.push({ id: t.saved_audience_id, adset: adsetName });
    }

    // Lookalike — store adset names
    (t.lookalike_specs || []).forEach(ll => {
      const key = `Lookalike ${ll.country || ''} ${ll.ratio ? (ll.ratio * 100).toFixed(0) + '%' : ''}`.trim();
      lookalikeSets.add(key + '||' + adsetName);
    });
  });

  const topInterests = Object.values(interestMap).sort((a,b) => b.count - a.count).slice(0, 20);

  const interestRows = topInterests.length > 0
    ? topInterests.map((int, i) => {
        const adsetList = (int.adsets || []).slice(0, 3).map(a => `<span style="display:inline-block;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.25);border-radius:4px;padding:1px 6px;font-size:10px;color:#a5b4fc;margin:1px">${a}</span>`).join('');
        const more = (int.adsets || []).length > 3 ? `<span style="font-size:10px;color:var(--t4)">+${int.adsets.length-3} more</span>` : '';
        return `<tr><td class="cm">${i+1}</td><td style="font-weight:600;color:var(--t)">${int.name}</td><td><div style="display:flex;flex-wrap:wrap;gap:3px;align-items:center">${adsetList}${more}</div></td></tr>`;
      }).join('')
    : `<tr><td colspan="3" style="text-align:center;color:var(--t2);padding:16px">No interest targeting found — using broad/lookalike audiences</td></tr>`;

  const customAudRows = customAudiences.length > 0
    ? customAudiences.slice(0, 15).map((ca, i) => {
        const adsetList = (ca.adsets || []).slice(0, 3).map(a => `<span style="display:inline-block;background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.25);border-radius:4px;padding:1px 6px;font-size:10px;color:#93c5fd;margin:1px">${a}</span>`).join('');
        const more = (ca.adsets || []).length > 3 ? `<span style="font-size:10px;color:var(--t4)">+${ca.adsets.length-3} more</span>` : '';
        return `<tr><td class="cm">${i+1}</td><td style="font-weight:600;color:var(--t)">${ca.name}</td><td><div style="display:flex;flex-wrap:wrap;gap:3px;align-items:center">${adsetList}${more}</div></td></tr>`;
      }).join('')
    : `<tr><td colspan="3" style="text-align:center;color:var(--t2);padding:16px">No custom audiences in active adsets</td></tr>`;

  // Build lookalike rows with adset names
  const llMap = {};
  Array.from(lookalikeSets).forEach(entry => {
    const [ll, adset] = entry.split('||');
    if (!llMap[ll]) llMap[ll] = { name: ll, adsets: [] };
    if (adset && !llMap[ll].adsets.includes(adset)) llMap[ll].adsets.push(adset);
  });
  const lookalikesArr = Object.values(llMap);
  const llRows = lookalikesArr.length > 0
    ? lookalikesArr.map((ll, i) => {
        const adsetList = (ll.adsets || []).slice(0, 3).map(a => `<span style="display:inline-block;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.25);border-radius:4px;padding:1px 6px;font-size:10px;color:#6ee7b7;margin:1px">${a}</span>`).join('');
        return `<tr><td class="cm">${i+1}</td><td style="font-weight:600">${ll.name}</td><td><div style="display:flex;flex-wrap:wrap;gap:3px">${adsetList}</div></td></tr>`;
      }).join('')
    : `<tr><td colspan="3" style="text-align:center;color:var(--t2);padding:16px">No lookalike audiences found</td></tr>`;

  // Geo — use geoEnriched (has spend/revenue data) for display table
  const geoTableRows = (geoEnriched || []).sort((a,b) => b.spend - a.spend).slice(0, 12).map((g, i) => {
    let dl = '👀 Monitor', dc = 'badge-gray';
    if (g.roas >= 2) { dl = '🚀 Scale'; dc = 'badge-green'; }
    else if (g.roas >= 1) { dl = '✅ Keep'; dc = 'badge-blue'; }
    else if (g.spend > 500) { dl = '⚠️ Reduce'; dc = 'badge-amber'; }
    return `<tr><td class="cm">${i+1}</td><td style="font-weight:600">${g.country||'—'}</td><td>${dollar(g.spend)}</td><td style="color:${g.revenue>g.spend?'var(--g)':g.revenue>0?'var(--a)':'var(--t2)'}">${dollar(g.revenue)}</td><td><span class="badge ${roasCls(g.roas)}">${roasS(g.roas)}</span></td><td>${g.purchases}</td><td><span class="badge ${dc}">${dl}</span></td></tr>`;
  }).join('') || `<tr><td colspan="7" style="text-align:center;color:var(--t2);padding:16px">No geo data available</td></tr>`;

  // Age ranges — from demoAgg (has actual spend), group by age only
  const ageMap = {};
  demoAgg.forEach(d => {
    const age = (d.label || '').split('/')[0] || d.label;
    if (!ageMap[age]) ageMap[age] = { age, spend: 0, revenue: 0, purchases: 0 };
    ageMap[age].spend     += d.spend || 0;
    ageMap[age].revenue   += d.revenue || 0;
    ageMap[age].purchases += d.purchases || 0;
  });
  const ageRows = Object.values(ageMap).sort((a,b) => b.spend - a.spend).map((a, i) => {
    const roas = a.spend > 0 && a.revenue > 0 ? a.revenue / a.spend : 0;
    const cpa = a.purchases > 0 ? a.spend / a.purchases : 0;
    return `<tr><td class="cm">${i+1}</td><td style="font-weight:600">${a.age}</td><td>${dollar(a.spend)}</td><td>${dollar(a.revenue)}</td><td><span class="badge ${roasCls(roas)}">${roasS(roas)}</span></td><td>${a.purchases}</td><td>${cpa>0?dollar(cpa):'—'}</td></tr>`;
  }).join('') || `<tr><td colspan="7" style="text-align:center;color:var(--t2);padding:16px">No age breakdown data</td></tr>`;

  // Generate HTML
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${brandName} · RevNox Media Dashboard</title>
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
  <meta http-equiv="Pragma" content="no-cache">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"><\/script>
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
:root{
  --bg:#0f172a;--s1:rgba(15,23,42,0.6);--s2:rgba(30,41,59,0.7);--card:rgba(30,41,59,0.45);--ch:#1e293b;
  --b:rgba(255,255,255,0.08);--b2:rgba(255,255,255,0.04);
  --blue:#3b82f6;--bl:#60a5fa;--ind:#6366f1;
  --g:#10b981;--gl:#34d399;--a:#f59e0b;--al:#fbbf24;
  --r:#ef4444;--rl:#f87171;--pur:#8b5cf6;--cy:#06b6d4;
  --t:#f8fafc;--t2:#cbd5e1;--t3:#94a3b8;--t4:#475569;
  --rad:16px;--rads:10px;--sh:0 8px 32px rgba(0,0,0,0.25);
}
/* ── LIGHT MODE ─────────────────────────────────────────────────────── */
body.light-mode{
  --bg:#f0f4f8;--s1:rgba(248,250,252,0.85);--s2:rgba(226,232,240,0.9);--card:rgba(255,255,255,0.85);--ch:#e2e8f0;
  --b:rgba(0,0,0,0.08);--b2:rgba(0,0,0,0.04);
  --blue:#2563eb;--bl:#3b82f6;--ind:#4f46e5;
  --g:#059669;--gl:#10b981;--a:#d97706;--al:#f59e0b;
  --r:#dc2626;--rl:#ef4444;--pur:#7c3aed;--cy:#0891b2;
  --t:#0f172a;--t2:#334155;--t3:#64748b;--t4:#94a3b8;
  --sh:0 4px 20px rgba(0,0,0,0.08);
}
body.light-mode{background:linear-gradient(135deg,#e2e8f0 0%,#f8fafc 100%)!important;color:var(--t)}
body.light-mode .nav{background:rgba(248,250,252,0.95)!important;border-bottom:1px solid rgba(0,0,0,0.08)!important}
body.light-mode .platform-bar{background:rgba(248,250,252,0.98)!important;border-bottom-color:rgba(79,70,229,0.2)!important}
body.light-mode .sidebar{background:rgba(255,255,255,0.9)!important;border-right-color:rgba(0,0,0,0.08)!important}
body.light-mode .kcard{background:rgba(255,255,255,0.95)!important;border-color:rgba(0,0,0,0.07)!important;box-shadow:0 2px 8px rgba(0,0,0,0.06)!important}
body.light-mode .cc,.light-mode .tcard,.light-mode .sec-head{background:rgba(255,255,255,0.95)!important;border-color:rgba(0,0,0,0.07)!important}
body.light-mode .sh-qbtn{background:rgba(226,232,240,0.8)!important;border-color:rgba(0,0,0,0.1)!important;color:#475569!important}
body.light-mode .sh-qbtn.active{background:rgba(79,70,229,0.15)!important;color:#4f46e5!important;border-color:rgba(79,70,229,0.4)!important}
body.light-mode table thead tr{background:rgba(226,232,240,0.7)!important}
body.light-mode table tbody tr:hover{background:rgba(226,232,240,0.5)!important}
body.light-mode ::-webkit-scrollbar-track{background:rgba(226,232,240,0.5)}
body.light-mode ::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.15)}
body.light-mode .f-step{background:rgba(255,255,255,0.9)!important;border-color:rgba(0,0,0,0.07)!important}
body.light-mode .sb-health{background:rgba(255,255,255,0.95)!important}
/* ── END LIGHT MODE ─────────────────────────────────────────────────── */
html{font-size:13px;scroll-behavior:smooth}
body{background:linear-gradient(135deg, #020617 0%, #0f172a 100%);color:var(--t);font-family:'Inter',system-ui,sans-serif;min-height:100vh;background-attachment:fixed;}
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:rgba(15,23,42,0.5)}
::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.2)}
a{text-decoration:none}

/* Animations */
@keyframes fadeInUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 15px rgba(59,130,246,0.3); } 50% { box-shadow: 0 0 25px rgba(59,130,246,0.6); } }
@keyframes gradientMove { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }

.sec { animation: fadeInUp 0.5s ease-out forwards; }
.kcard, .hl-card, .cc, .tcard, .ins-card, .ac-card { animation: fadeInUp 0.6s ease-out backwards; }
.kcard:nth-child(1) { animation-delay: 0.05s; } .kcard:nth-child(2) { animation-delay: 0.1s; }
.kcard:nth-child(3) { animation-delay: 0.15s; } .kcard:nth-child(4) { animation-delay: 0.2s; }
.kcard:nth-child(5) { animation-delay: 0.25s; } .kcard:nth-child(6) { animation-delay: 0.3s; }

/* ── PLATFORM TABS ─────────────────────────────────────────── */
.platform-bar{display:flex;align-items:center;gap:0;background:rgba(2,6,23,0.95);border-bottom:1px solid rgba(99,102,241,0.25);padding:0 28px;position:sticky;top:0;z-index:300;backdrop-filter:blur(20px)}
.ptab{padding:12px 22px;font-size:13px;font-weight:700;cursor:pointer;border:none;background:none;font-family:inherit;color:#64748b;border-bottom:3px solid transparent;transition:all .2s ease;letter-spacing:0.3px;margin-bottom:-1px}
.ptab:hover:not(.active){color:#94a3b8;background:rgba(255,255,255,0.03)}
.ptab.active{color:#fff;border-bottom-color:var(--blue)}
.ptab.active.shopify-tab{border-bottom-color:#a855f7}
.ptab.active.amazon-tab{border-bottom-color:#f59e0b}
.ptab.active.overall-tab{border-bottom-color:#10b981}
.platform-content{display:none}.platform-content.active{display:block}
/* Quick filter buttons */
.sh-qbtn{padding:5px 13px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid rgba(255,255,255,0.08);background:rgba(30,41,59,0.6);color:#64748b;border-radius:7px;transition:all .18s;font-family:inherit;letter-spacing:0.3px}
.sh-qbtn:hover{background:rgba(99,102,241,0.12);color:#a5b4fc;border-color:rgba(99,102,241,0.3)}
.sh-qbtn.active{background:rgba(99,102,241,0.2);color:#a5b4fc;border-color:rgba(99,102,241,0.5)}
/* Coming soon placeholder */
.coming-soon{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:70vh;gap:16px;color:#475569}
.coming-soon .cs-icon{font-size:64px;opacity:0.4}
.coming-soon .cs-title{font-size:24px;font-weight:700;color:#64748b}
.coming-soon .cs-sub{font-size:14px;color:#475569;text-align:center;max-width:380px}
/* ── END PLATFORM TABS ──────────────────────────────────────── */
.nav{background:rgba(15,23,42,0.7);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border-bottom:1px solid var(--b);position:sticky;top:48px;z-index:200;padding:0 28px;height:58px;display:flex;align-items:center;gap:16px;}
.nav-brand{background:linear-gradient(135deg,var(--blue),var(--ind),var(--pur));background-size:200% 200%;color:#fff;font-weight:800;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;padding:6px 14px;border-radius:100px;animation:gradientMove 5s ease infinite;}
.nav-title{font-size:16px;font-weight:700;color:var(--t);text-shadow:0 2px 4px rgba(0,0,0,0.5)}
.nav-range{font-size:11px;color:var(--t2);background:var(--s2);border:1px solid var(--b);padding:5px 14px;border-radius:100px;backdrop-filter:blur(10px)}
.nav-space{flex:1}
.nav-live{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--t2)}
.dot{width:8px;height:8px;border-radius:50%;background:var(--g);box-shadow:0 0 8px var(--g);animation:blink 2s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
.nav-refresh{background:var(--s2);border:1px solid var(--b);color:var(--t2);padding:6px 14px;border-radius:var(--rads);font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .2s ease;backdrop-filter:blur(10px)}
.nav-refresh:hover{background:var(--blue);color:#fff;border-color:var(--blue);transform:translateY(-1px);box-shadow:0 4px 12px rgba(59,130,246,0.3)}
.nav-sheet{background:var(--s2);border:1px solid var(--b);color:var(--bl);padding:6px 14px;border-radius:var(--rads);font-size:11px;font-weight:600;display:flex;align-items:center;gap:5px;transition:all .2s ease;backdrop-filter:blur(10px)}
.nav-sheet:hover{background:var(--blue);color:#fff;border-color:var(--blue);transform:translateY(-1px);box-shadow:0 4px 12px rgba(59,130,246,0.3)}

.view-tabs{display:flex;align-items:center;gap:0;background:var(--s2);border:1px solid var(--b);border-radius:var(--rads);overflow:hidden;backdrop-filter:blur(10px)}
.vtab{padding:6px 16px;font-size:12px;font-weight:600;cursor:pointer;transition:all .2s ease;color:var(--t2);border:none;background:none;font-family:inherit}
.vtab:hover:not(.active){background:rgba(255,255,255,0.05)}
.vtab.active{background:var(--blue);color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.2)}

.date-wrap{display:flex;align-items:center;gap:8px}
.date-lbl{font-size:11px;color:var(--t3);font-weight:500}
.date-sel{background:var(--s2);border:1px solid var(--b);color:var(--t);padding:6px 12px;border-radius:var(--rads);font-size:12px;cursor:pointer;outline:none;font-family:inherit;backdrop-filter:blur(10px);transition:all .2s ease}
.date-sel:hover, .date-sel:focus{border-color:var(--blue);background:rgba(30,41,59,0.9)}
.date-sel option{background:#0f172a}

.layout{display:grid;grid-template-columns:220px 1fr;min-height:calc(100vh - 58px)}
.sidebar{background:rgba(15,23,42,0.4);backdrop-filter:blur(12px);border-right:1px solid var(--b);position:sticky;top:106px;height:calc(100vh - 106px);overflow-y:auto;padding:20px 0}
.sb-section{padding:0 12px;margin-bottom:24px}
.sb-lbl{font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--t4);padding:0 10px;margin-bottom:8px}
.sb-link{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:var(--rads);color:var(--t2);font-size:12.5px;font-weight:500;cursor:pointer;transition:all .2s cubic-bezier(0.4, 0, 0.2, 1);margin-bottom:2px;user-select:none;position:relative;overflow:hidden}
.sb-link:hover{background:rgba(255,255,255,0.04);color:var(--t);transform:translateX(4px)}
.sb-link.active{background:rgba(59,130,246,0.15);color:var(--bl);font-weight:600;border-left:3px solid var(--blue);padding-left:9px}
.sb-link .ic{font-size:15px;width:20px;text-align:center;transition:transform .2s}
.sb-link:hover .ic{transform:scale(1.15)}
.sb-div{height:1px;background:linear-gradient(90deg, transparent, var(--b), transparent);margin:12px 12px 20px}
.sb-health{margin:0 12px;padding:14px;border-radius:var(--rad);backdrop-filter:blur(8px);transition:transform .2s ease}
.sb-health:hover{transform:translateY(-2px)}
.sb-health.hg{background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.2);box-shadow:0 4px 15px rgba(16,185,129,0.1)}
.sb-health.ha{background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.2);box-shadow:0 4px 15px rgba(245,158,11,0.1)}
.sb-health.hr{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);box-shadow:0 4px 15px rgba(239,68,68,0.1)}
.sh-icon{font-size:20px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))}
.sh-label{font-weight:800;font-size:11px;letter-spacing:.5px}
.sh-desc{color:var(--t2);font-size:11px;margin-top:2px}
.sb-stat{display:flex;justify-content:space-between;font-size:12px;padding:4px 10px;margin-bottom:6px;border-radius:4px;transition:background .2s}
.sb-stat:hover{background:rgba(255,255,255,0.03)}

.main{padding:28px 32px;overflow-x:hidden}
.sec{margin-bottom:40px;scroll-margin-top:70px}
.sec-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid var(--b)}
.sec-title{font-size:18px;font-weight:800;color:var(--t);display:flex;align-items:center;gap:10px;letter-spacing:-0.5px}
.sec-sub{font-size:12px;color:var(--t2);margin-top:4px;font-weight:400}
.sec-badge{background:rgba(30,41,59,0.8);border:1px solid var(--b);padding:4px 12px;border-radius:100px;font-size:11px;font-weight:600;color:var(--bl);backdrop-filter:blur(8px)}

.alert{border-radius:var(--rad);padding:14px 20px;display:flex;align-items:center;gap:14px;margin-bottom:20px;backdrop-filter:blur(12px);animation:fadeInUp 0.4s ease-out forwards}
.alert.danger{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);box-shadow:0 4px 20px rgba(239,68,68,0.15)}
.alert.success{background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.3);box-shadow:0 4px 20px rgba(16,185,129,0.15)}
.alert-icon{font-size:22px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.2))}
.alert-body{font-size:13px;flex:1;line-height:1.5}
.alert-body strong{color:var(--rl);font-weight:700}
.alert.success .alert-body strong{color:var(--gl)}
.alert-btn{background:var(--r);color:#fff;border:none;padding:6px 16px;border-radius:var(--rads);font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;transition:all .2s;box-shadow:0 2px 8px rgba(239,68,68,0.4)}
.alert-btn:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(239,68,68,0.6);filter:brightness(1.1)}
.alert.success .alert-btn{background:var(--g);box-shadow:0 2px 8px rgba(16,185,129,0.4)}
.alert.success .alert-btn:hover{box-shadow:0 4px 12px rgba(16,185,129,0.6)}

.kpi-grid{display:grid;gap:18px}
.g2{grid-template-columns:repeat(2,1fr)}
.g3{grid-template-columns:repeat(3,1fr)}
.g4{grid-template-columns:repeat(4,1fr)}
.g6{grid-template-columns:repeat(3,1fr)}
@media(min-width:1400px){.g6{grid-template-columns:repeat(3,1fr)}}
.kcard{background:var(--card);border:1px solid var(--b);border-radius:var(--rad);padding:22px;position:relative;overflow:hidden;transition:all .3s cubic-bezier(0.4, 0, 0.2, 1);box-shadow:var(--sh);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
.kcard:hover{border-color:rgba(59,130,246,.5);transform:translateY(-4px) scale(1.01);box-shadow:0 12px 40px rgba(0,0,0,0.4), 0 0 20px rgba(59,130,246,0.1)}
.kcard::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--blue),var(--ind));opacity:0.8;transition:opacity .3s}
.kcard:hover::before{opacity:1}
.pos{color:#10b981;font-weight:600}.neg{color:#ef4444;font-weight:600}
.kcard.green::before{background:linear-gradient(90deg,var(--g),var(--cy))}
.kcard.amber::before{background:linear-gradient(90deg,var(--a),#f97316)}
.kcard.orange::before{background:linear-gradient(90deg,#f97316,#f59e0b)}
.kcard.red::before{background:linear-gradient(90deg,var(--r),#ec4899)}
.kcard.purple::before{background:linear-gradient(90deg,var(--pur),var(--ind))}
.k-lbl{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--t3);margin-bottom:12px;display:flex;align-items:center;gap:6px}
.k-val{font-size:32px;font-weight:800;color:var(--t);letter-spacing:-1px;line-height:1;margin-bottom:12px;text-shadow:0 2px 4px rgba(0,0,0,0.3)}
.k-val.gv{color:var(--gl);text-shadow:0 0 20px rgba(16,185,129,0.3)}
.k-val.av{color:var(--al)}
.k-val.rv{color:var(--rl)}
.k-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.kbadge{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:3px 10px;border-radius:100px;backdrop-filter:blur(4px)}
.kbadge.up{background:rgba(16,185,129,.15);color:var(--g);border:1px solid rgba(16,185,129,.2)}
.kbadge.down{background:rgba(239,68,68,.15);color:var(--r);border:1px solid rgba(239,68,68,.2)}
.kbadge.flat{background:rgba(255,255,255,.05);color:var(--t2);border:1px solid var(--b)}
.k-bench{font-size:11px;color:var(--t3);font-weight:500}
.k-status{position:absolute;top:18px;right:18px;font-size:10px;font-weight:800;padding:3px 10px;border-radius:100px;letter-spacing:0.5px;text-transform:uppercase}
.ks-good{background:rgba(16,185,129,.15);color:var(--gl);border:1px solid rgba(16,185,129,.2)}
.ks-warn{background:rgba(245,158,11,.15);color:var(--al);border:1px solid rgba(245,158,11,.2)}
.ks-bad{background:rgba(239,68,68,.15);color:var(--rl);border:1px solid rgba(239,68,68,.2)}

.cmp-row{display:grid;grid-template-columns:1fr auto 1fr;gap:0;background:var(--card);border:1px solid var(--b);border-radius:var(--rad);overflow:hidden;margin-bottom:24px;box-shadow:var(--sh);backdrop-filter:blur(16px)}
.cmp-side{padding:24px 28px}
.cmp-side.left{border-right:1px solid var(--b);background:linear-gradient(90deg, rgba(255,255,255,0.02) 0%, transparent 100%)}
.cmp-label{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:var(--t3);margin-bottom:10px}
.cmp-date{font-size:18px;font-weight:800;color:var(--t);margin-bottom:18px}
.cmp-metrics{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.cmp-metric{display:flex;flex-direction:column;gap:4px}
.cmp-metric-lbl{font-size:11px;color:var(--t3);font-weight:500}
.cmp-metric-val{font-size:18px;font-weight:800;color:var(--t)}
.cmp-center{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px 24px;background:rgba(0,0,0,0.2);border-left:1px solid rgba(255,255,255,0.05);border-right:1px solid rgba(255,255,255,0.05);min-width:140px;position:relative}
.cmp-center::after{content:'';position:absolute;top:0;bottom:0;left:50%;width:1px;background:linear-gradient(to bottom, transparent, var(--blue), transparent);opacity:0.3}
.cmp-arrow{font-size:32px;margin-bottom:10px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));z-index:1}
.cmp-diff{font-size:13px;font-weight:800;text-align:center;padding:4px 12px;border-radius:100px;background:rgba(0,0,0,0.3);z-index:1}
.cmp-diff.up{color:var(--gl);border:1px solid rgba(16,185,129,0.2)}
.cmp-diff.down{color:var(--rl);border:1px solid rgba(239,68,68,0.2)}
.cmp-diff.flat{color:var(--t2);border:1px solid var(--b)}

.ins-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-bottom:24px}
.ins-card{background:var(--card);border:1px solid var(--b);border-radius:var(--rad);padding:20px;display:flex;align-items:flex-start;gap:16px;backdrop-filter:blur(16px);transition:all .3s ease;box-shadow:var(--sh)}
.ins-card:hover{transform:translateY(-3px);border-color:rgba(255,255,255,0.15);background:rgba(40,53,75,0.5)}
.ins-icon{width:46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;box-shadow:inset 0 2px 4px rgba(255,255,255,0.1), 0 4px 12px rgba(0,0,0,0.2)}
.ins-icon.bl{background:linear-gradient(135deg, rgba(59,130,246,.2), rgba(59,130,246,.05));border:1px solid rgba(59,130,246,.3);color:var(--bl)}
.ins-icon.g{background:linear-gradient(135deg, rgba(16,185,129,.2), rgba(16,185,129,.05));border:1px solid rgba(16,185,129,.3);color:var(--gl)}
.ins-icon.a{background:linear-gradient(135deg, rgba(245,158,11,.2), rgba(245,158,11,.05));border:1px solid rgba(245,158,11,.3);color:var(--al)}
.ins-icon.r{background:linear-gradient(135deg, rgba(239,68,68,.2), rgba(239,68,68,.05));border:1px solid rgba(239,68,68,.3);color:var(--rl)}
.ins-icon.p{background:linear-gradient(135deg, rgba(139,92,246,.2), rgba(139,92,246,.05));border:1px solid rgba(139,92,246,.3);color:#a78bfa}
.ins-kicker{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:var(--t3);margin-bottom:4px}
.ins-main{font-size:16px;font-weight:800;color:var(--t);margin-bottom:4px;line-height:1.3}
.ins-sub{font-size:12px;color:var(--t2);line-height:1.4}

.cg2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.cg3{display:grid;grid-template-columns:2fr 1fr 1fr;gap:20px}
.cg21{display:grid;grid-template-columns:2fr 1fr;gap:20px}
.cc{background:var(--card);border:1px solid var(--b);border-radius:var(--rad);padding:24px;box-shadow:var(--sh);backdrop-filter:blur(16px);transition:all .3s ease}
.cc:hover{border-color:rgba(255,255,255,0.1);box-shadow:0 12px 40px rgba(0,0,0,0.3)}
.cc-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
.cc-title{font-size:14px;font-weight:800;color:var(--t);display:flex;align-items:center;gap:8px}
.cc-sub{font-size:11px;color:var(--t2);margin-top:2px}
.cc-leg{display:flex;align-items:center;gap:12px;background:rgba(0,0,0,0.2);padding:4px 12px;border-radius:100px;border:1px solid var(--b)}
.leg-item{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;color:var(--t2)}
.leg-dot{width:8px;height:8px;border-radius:50%;box-shadow:0 0 8px currentColor}
.cw{position:relative}
.h160{height:160px}.h200{height:200px}.h240{height:240px}.h280{height:280px}.h320{height:320px}
.cc-note{margin-top:16px;padding:12px 16px;border-radius:var(--rads);background:rgba(0,0,0,0.2);border:1px solid var(--b);border-left:3px solid var(--blue);font-size:12px;color:var(--t2);line-height:1.5}
.cc-note strong{color:var(--t);font-weight:700}

.funnel{display:grid;grid-template-columns:repeat(6,1fr);gap:0;filter:drop-shadow(0 8px 24px rgba(0,0,0,0.2))}
.f-step{background:linear-gradient(180deg, var(--card) 0%, rgba(15,23,42,0.8) 100%);border:1px solid var(--b);padding:24px 16px;text-align:center;position:relative;backdrop-filter:blur(12px);transition:all .3s ease;cursor:default}
.f-step:hover{background:linear-gradient(180deg, rgba(40,53,75,0.6) 0%, rgba(15,23,42,0.9) 100%);transform:translateY(-4px);z-index:2;border-color:var(--blue);box-shadow:0 12px 30px rgba(0,0,0,0.3)}
.f-step:first-child{border-radius:var(--rad) 0 0 var(--rad)}
.f-step:last-child{border-radius:0 var(--rad) var(--rad) 0}
.f-step:not(:last-child)::after{content:'›';position:absolute;right:-14px;top:50%;transform:translateY(-50%);font-size:26px;color:var(--blue);background:#0f172a;width:28px;height:28px;line-height:24px;border-radius:50%;border:1px solid var(--b);text-align:center;z-index:3;box-shadow:0 0 10px rgba(0,0,0,0.5)}
.f-step:hover::after{color:#fff;background:var(--blue);border-color:var(--blue)}
.f-icon{font-size:26px;margin-bottom:10px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));transition:transform .3s}
.f-step:hover .f-icon{transform:scale(1.15)}
.f-stage{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:var(--t3);margin-bottom:8px}
.f-val{font-size:24px;font-weight:800;color:var(--t);margin-bottom:8px;text-shadow:0 2px 4px rgba(0,0,0,0.3)}
.f-rate{font-size:12px;font-weight:700;padding:3px 10px;border-radius:100px;display:inline-block;margin-bottom:12px;border:1px solid transparent}
.f-rate.g{background:rgba(16,185,129,.1);color:var(--gl);border-color:rgba(16,185,129,.2)}
.f-rate.a{background:rgba(245,158,11,.1);color:var(--al);border-color:rgba(245,158,11,.2)}
.f-rate.r{background:rgba(239,68,68,.1);color:var(--rl);border-color:rgba(239,68,68,.2)}
.f-rate.n{background:rgba(0,0,0,0.2);color:var(--t2);border-color:var(--b)}
.f-bar{height:6px;border-radius:3px;background:rgba(0,0,0,0.3);overflow:hidden;box-shadow:inset 0 1px 3px rgba(0,0,0,0.5)}
.f-fill{height:100%;border-radius:3px;background:linear-gradient(90deg, var(--blue), var(--ind));box-shadow:0 0 10px rgba(59,130,246,0.5);transition:width 1s cubic-bezier(0.4, 0, 0.2, 1)}
.f-step:hover .f-fill{background:linear-gradient(90deg, var(--ind), var(--pur));box-shadow:0 0 15px rgba(139,92,246,0.6)}
.f-tip{font-size:10px;color:var(--t4);margin-top:6px;font-weight:500}

.tcard{background:var(--card);border:1px solid var(--b);border-radius:var(--rad);overflow:hidden;box-shadow:var(--sh);backdrop-filter:blur(16px);transition:box-shadow .3s}
.tcard:hover{box-shadow:0 12px 40px rgba(0,0,0,0.3)}
.ttop{padding:18px 24px;background:rgba(0,0,0,0.2);border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between;gap:12px}
.ttitle{font-size:14px;font-weight:800;color:var(--t);display:flex;align-items:center;gap:8px}
.tfilters{display:flex;gap:8px}
.fbtn{background:rgba(255,255,255,0.03);border:1px solid var(--b);color:var(--t2);padding:4px 12px;border-radius:100px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .2s ease;backdrop-filter:blur(4px)}
.fbtn:hover,.fbtn.act{background:var(--blue);color:#fff;border-color:var(--blue);box-shadow:0 2px 10px rgba(59,130,246,0.4);transform:translateY(-1px)}
.tscroll{overflow-x:auto}
table{width:100%;border-collapse:collapse}
thead tr{background:rgba(0,0,0,0.3);border-bottom:2px solid var(--b)}
th{padding:14px 20px;text-align:left;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:var(--t3);white-space:nowrap}
td{padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.03);font-size:13px;color:var(--t);vertical-align:middle;transition:background .2s}
tbody tr:last-child td{border-bottom:none}
tbody tr:hover td{background:rgba(59,130,246,.08)}
.badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:100px;font-size:11px;font-weight:800;white-space:nowrap;backdrop-filter:blur(4px);border:1px solid transparent}
.badge-green{background:rgba(16,185,129,.1);color:var(--gl);border-color:rgba(16,185,129,.2)}
.badge-amber{background:rgba(245,158,11,.1);color:var(--al);border-color:rgba(245,158,11,.2)}
.badge-red{background:rgba(239,68,68,.1);color:var(--rl);border-color:rgba(239,68,68,.2)}
.badge-blue{background:rgba(59,130,246,.1);color:var(--bl);border-color:rgba(59,130,246,.2)}
.badge-gray{background:rgba(255,255,255,.05);color:var(--t2);border-color:var(--b)}
.action-badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:100px;font-size:10px;font-weight:800;white-space:nowrap;backdrop-filter:blur(4px);text-transform:uppercase;letter-spacing:0.5px}
.ab-pause{background:rgba(239,68,68,.15);color:var(--rl);border:1px solid rgba(239,68,68,.3)}
.ab-scale{background:rgba(16,185,129,.15);color:var(--gl);border:1px solid rgba(16,185,129,.3)}
.ab-warn{background:rgba(245,158,11,.15);color:var(--al);border:1px solid rgba(245,158,11,.3)}
.ab-ok{background:rgba(59,130,246,.15);color:var(--bl);border:1px solid rgba(59,130,246,.3)}
.ab-test{background:rgba(139,92,246,.15);color:#a78bfa;border:1px solid rgba(139,92,246,.3)}
.cn{max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:700}
.cm{color:var(--t2);font-size:12px}

.day-row-good td{background:rgba(16,185,129,.04)}
.day-row-bad td{background:rgba(239,68,68,.04)}

.ac-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.ac-card{background:var(--card);border:1px solid var(--b);border-radius:var(--rad);padding:20px;display:flex;gap:16px;border-left:4px solid transparent;transition:all .3s cubic-bezier(0.4, 0, 0.2, 1);backdrop-filter:blur(16px);box-shadow:var(--sh)}
.ac-card:hover{transform:translateY(-3px);box-shadow:0 12px 30px rgba(0,0,0,0.4);background:rgba(40,53,75,0.6)}
.ac-card.cu{border-left-color:var(--r)}.ac-card.cs{border-left-color:var(--g)}.ac-card.cw{border-left-color:var(--a)}.ac-card.ci{border-left-color:var(--blue)}
.ac-ico{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;box-shadow:inset 0 2px 4px rgba(255,255,255,0.1)}
.aci-r{background:linear-gradient(135deg, rgba(239,68,68,.2), rgba(239,68,68,.05));border:1px solid rgba(239,68,68,.3);color:var(--rl)}
.aci-g{background:linear-gradient(135deg, rgba(16,185,129,.2), rgba(16,185,129,.05));border:1px solid rgba(16,185,129,.3);color:var(--gl)}
.aci-a{background:linear-gradient(135deg, rgba(245,158,11,.2), rgba(245,158,11,.05));border:1px solid rgba(245,158,11,.3);color:var(--al)}
.aci-b{background:linear-gradient(135deg, rgba(59,130,246,.2), rgba(59,130,246,.05));border:1px solid rgba(59,130,246,.3);color:var(--bl)}
.ac-type{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:var(--t3);margin-bottom:4px}
.ac-name{font-size:14px;font-weight:800;color:var(--t);margin-bottom:6px;line-height:1.4}
.ac-issue{font-size:12px;color:var(--t2);margin-bottom:10px;line-height:1.5}
.ac-step{font-size:11px;font-weight:600;color:var(--bl);display:inline-flex;align-items:center;gap:4px;padding:4px 10px;background:rgba(59,130,246,.1);border-radius:100px}
.ac-impact{font-size:11px;font-weight:700;color:var(--gl);margin-top:6px;display:block}
.no-actions{background:linear-gradient(135deg, rgba(16,185,129,.1), rgba(16,185,129,.02));border:1px solid rgba(16,185,129,.2);border-radius:var(--rad);padding:40px;text-align:center;backdrop-filter:blur(12px)}
.na-icon{font-size:42px;margin-bottom:16px;filter:drop-shadow(0 4px 8px rgba(16,185,129,0.3))}
.na-txt{font-size:16px;font-weight:800;color:var(--gl);margin-bottom:6px}
.na-sub{font-size:13px;color:var(--t2)}

.two-col{display:grid;grid-template-columns:1fr 1fr;gap:20px}

.highlights{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px}
.hl-card{background:linear-gradient(135deg, var(--card), rgba(15,23,42,0.8));border:1px solid var(--b);border-radius:var(--rad);padding:20px;backdrop-filter:blur(16px);transition:all .3s ease;box-shadow:var(--sh);position:relative;overflow:hidden}
.hl-card:hover{transform:translateY(-4px);border-color:rgba(255,255,255,0.15);box-shadow:0 12px 30px rgba(0,0,0,0.4)}
.hl-card::after{content:'';position:absolute;top:0;right:0;width:100px;height:100px;background:radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%);border-radius:50%;transform:translate(30%, -30%)}
.hl-label{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:var(--t3);margin-bottom:8px;position:relative;z-index:2}
.hl-day{font-size:24px;font-weight:800;color:var(--t);margin-bottom:6px;position:relative;z-index:2;text-shadow:0 2px 4px rgba(0,0,0,0.3)}
.hl-meta{font-size:12px;color:var(--t2);position:relative;z-index:2;font-weight:500}
.hl-badge{display:inline-block;margin-top:10px;padding:4px 12px;border-radius:100px;font-size:11px;font-weight:800;position:relative;z-index:2;backdrop-filter:blur(4px);box-shadow:0 2px 8px rgba(0,0,0,0.2)}

.footer{border-top:1px solid var(--b);padding:24px 32px;display:flex;align-items:center;justify-content:space-between;color:var(--t3);font-size:12px;background:rgba(0,0,0,0.2)}
.footer-brand{font-weight:800;color:var(--t2);letter-spacing:0.5px}

/* ── COMPARE MODAL ── */
.modal-overlay{display:none;position:fixed;inset:0;background:rgba(2,6,23,.85);z-index:2000;align-items:center;justify-content:center;backdrop-filter:blur(8px)}
.modal-overlay.open{display:flex;animation:fadeIn 0.2s ease-out forwards}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.modal-box{background:var(--card);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:32px;width:600px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05);transform:scale(0.95);animation:scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards}
@keyframes scaleIn { to { transform: scale(1); } }
.modal-title{font-size:20px;font-weight:800;margin-bottom:24px;color:var(--t);display:flex;align-items:center;gap:10px}
.modal-row{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:18px}
.modal-col label{display:block;font-size:11px;color:var(--t3);margin-bottom:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px}
.modal-col input[type=date]{width:100%;padding:10px 14px;background:rgba(0,0,0,0.3);border:1px solid var(--b);border-radius:10px;color:var(--t);font-size:14px;outline:none;transition:all .2s;font-family:inherit}
.modal-col input[type=date]:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(59,130,246,0.2);background:rgba(0,0,0,0.5)}
.modal-actions{display:flex;gap:12px;justify-content:flex-end;margin-top:24px;padding-top:20px;border-top:1px solid var(--b)}
.modal-btn{padding:10px 24px;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;transition:all .2s ease;font-family:inherit}
.modal-btn.primary{background:linear-gradient(135deg, var(--blue), var(--ind));color:#fff;box-shadow:0 4px 15px rgba(59,130,246,0.4)}
.modal-btn.primary:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(59,130,246,0.6);filter:brightness(1.1)}
.modal-btn.secondary{background:rgba(255,255,255,0.05);color:var(--t);border:1px solid var(--b)}
.modal-btn.secondary:hover{background:rgba(255,255,255,0.1);transform:translateY(-2px)}
.delta-pos{color:var(--gl);font-weight:800;text-shadow:0 0 10px rgba(16,185,129,0.3)}.delta-neg{color:var(--rl);font-weight:800;text-shadow:0 0 10px rgba(239,68,68,0.3)}.delta-neu{color:var(--t3);font-weight:600}

/* ── RANGE PICKER ── */
.range-wrap{display:flex;align-items:center;gap:8px}
.range-inp{padding:6px 12px;background:var(--s2);border:1px solid var(--b);border-radius:10px;color:var(--t);font-size:12px;outline:none;width:125px;font-family:inherit;transition:all .2s;backdrop-filter:blur(10px)}
.range-inp:hover,.range-inp:focus{border-color:var(--blue);background:rgba(30,41,59,0.9)}
.cmp-open-btn{padding:6px 14px;background:rgba(99,102,241,.15);color:#a5b4fc;border:1px solid rgba(99,102,241,.3);border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;transition:all .2s;font-family:inherit;backdrop-filter:blur(4px)}
.cmp-open-btn:hover{background:var(--ind);color:#fff;box-shadow:0 4px 15px rgba(99,102,241,0.4);transform:translateY(-1px)}


.view-overview .day-only{display:none!important}
.view-day .overview-only{display:none!important}

@media(max-width:1100px){
  .layout{grid-template-columns:1fr}
  .sidebar{display:none}
  .g3,.g4,.g6{grid-template-columns:repeat(2,1fr)}
  .cg2,.cg21,.two-col,.ins-grid,.highlights{grid-template-columns:1fr}
  .cg3{grid-template-columns:1fr}
  .funnel{grid-template-columns:1fr}
  .ac-grid{grid-template-columns:1fr}
}
/* ── LOGIN SCREEN ────────────────────────────────────────────────────── */
#loginOverlay{position:fixed;inset:0;z-index:9999;background:linear-gradient(135deg,#020617 0%,#0f172a 50%,#1e1b4b 100%);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(20px)}
#loginOverlay.hidden{display:none!important}
.login-box{background:rgba(30,41,59,0.95);border:1px solid rgba(99,102,241,0.3);border-radius:24px;padding:48px 40px;width:360px;text-align:center;box-shadow:0 32px 80px rgba(0,0,0,0.5),0 0 0 1px rgba(99,102,241,0.1)}
.login-logo{margin-bottom:24px}
.login-title{font-size:22px;font-weight:800;color:#f8fafc;margin-bottom:6px;letter-spacing:-0.5px}
.login-sub{font-size:13px;color:#64748b;margin-bottom:32px}
.login-inp{width:100%;background:rgba(15,23,42,0.8);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:13px 16px;font-size:14px;color:#f8fafc;font-family:inherit;outline:none;transition:border-color .2s;margin-bottom:14px}
.login-inp:focus{border-color:rgba(99,102,241,0.6)}
.login-btn{width:100%;padding:13px;background:linear-gradient(135deg,#4f46e5,#7c3aed);border:none;border-radius:10px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .2s;letter-spacing:0.3px}
.login-btn:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(99,102,241,0.4)}
.login-err{color:#ef4444;font-size:12px;margin-top:8px;min-height:16px}
.login-hint{font-size:11px;color:#334155;margin-top:20px}
/* ── END LOGIN SCREEN ───────────────────────────────────────────────── */
/* ══════════════ MOBILE RESPONSIVE ══════════════════════════════════════ */
@media(max-width:768px){
  html{font-size:12px}
  .platform-bar{padding:0 12px;overflow-x:auto;-webkit-overflow-scrolling:touch}
  .ptab{padding:10px 14px;font-size:12px;white-space:nowrap}
  .nav{padding:0 12px;height:auto;min-height:52px;flex-wrap:wrap;gap:8px;padding-top:8px;padding-bottom:8px;top:42px}
  .nav svg{width:90px!important;height:24px!important}
  .nav-range{display:none}
  .nav-live{display:none}
  .nav-refresh{display:none}
  #themeToggle{padding:5px 8px!important;font-size:15px!important}
  .layout{flex-direction:column!important}
  .sidebar{width:100%!important;max-width:100%!important;position:static!important;height:auto!important;border-right:none!important;border-bottom:1px solid var(--b);display:flex;flex-wrap:wrap;gap:0;padding:8px 12px!important;overflow:visible!important}
  .sb-section{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px!important}
  .sb-lbl{width:100%;margin:4px 0 2px!important;font-size:10px}
  .sb-link{padding:5px 10px!important;font-size:11px!important;border-radius:20px!important}
  .sb-health{display:none}
  .sb-kpi-cards{display:flex;flex-wrap:wrap;gap:8px;width:100%}
  .kcard{min-width:calc(50% - 4px)!important;padding:10px!important}
  .k-val{font-size:18px!important}
  .main{padding:12px!important;margin-left:0!important}
  .cg2{grid-template-columns:1fr!important}
  .cg3,.cg4{grid-template-columns:1fr!important}
  .kpi-grid{grid-template-columns:repeat(2,1fr)!important}
  .kpi-grid.g6{grid-template-columns:repeat(2,1fr)!important}
  .kpi-grid.g4{grid-template-columns:repeat(2,1fr)!important}
  .sec-head{flex-direction:column;gap:8px;align-items:flex-start!important}
  .tscroll{overflow-x:auto;-webkit-overflow-scrolling:touch}
  .tscroll table{min-width:600px}
  .funnel{flex-direction:column!important;gap:4px!important}
  .f-step{flex-direction:row!important;padding:8px 12px!important;justify-content:space-between}
  .f-bar{display:none}
  .ac-grid{grid-template-columns:1fr!important}
  .date-wrap{display:flex!important}
  [style*="grid-template-columns:1fr 1fr 1fr"]{grid-template-columns:1fr!important}
  [style*="grid-template-columns:1fr 1fr"]{grid-template-columns:1fr!important}
  .sh-date-bar{flex-wrap:wrap!important;padding:10px 12px!important}
  .cw{height:200px!important}
  .cw.h280,.cw.h240{height:200px!important}
  .login-box{width:90vw;padding:32px 24px}
  /* Period bar on mobile */
  div[style*="flex-wrap:nowrap"]{flex-wrap:wrap!important}
}
@media(max-width:480px){
  .kpi-grid,.kpi-grid.g6,.kpi-grid.g4{grid-template-columns:1fr!important}
  .platform-bar{gap:0}
  .ptab{padding:8px 12px;font-size:11px}
}
/* ══════════════ END MOBILE ══════════════════════════════════════════════ */
</style>
</head>
<body class="view-overview" id="bodyEl">

<!-- COMPARE MODAL -->
<div class="modal-overlay" id="compareModal" onclick="if(event.target===this)closeCompare()">
  <div class="modal-box">
    <div class="modal-title">⚖️ Compare Two Date Ranges</div>
    <div class="modal-row">
      <div class="modal-col"><label>Period A — From</label><input type="date" id="cmpA1"></div>
      <div class="modal-col"><label>Period A — To</label><input type="date" id="cmpA2"></div>
    </div>
    <div class="modal-row">
      <div class="modal-col"><label>Period B — From</label><input type="date" id="cmpB1"></div>
      <div class="modal-col"><label>Period B — To</label><input type="date" id="cmpB2"></div>
    </div>
    <div class="modal-actions">
      <button class="modal-btn secondary" onclick="closeCompare()">Cancel</button>
      <button class="modal-btn primary" onclick="runCompare()">Compare →</button>
    </div>
    <div id="cmpResult" style="display:none"></div>
  </div>
</div>

<!-- ═══ PLATFORM TAB BAR ═══════════════════════════════════════════════════ -->
<div class="platform-bar">
  <button class="ptab active" id="ptab-meta" onclick="switchPlatform('meta')">📘 Meta Ads</button>
  <button class="ptab shopify-tab" id="ptab-shopify" onclick="switchPlatform('shopify')">🛍️ Shopify</button>
  <button class="ptab amazon-tab" id="ptab-amazon" onclick="switchPlatform('amazon')">📦 Amazon</button>
  <button class="ptab overall-tab" id="ptab-overall" onclick="switchPlatform('overall')">🌐 Overall</button>
</div>

<!-- ═══ META PLATFORM ════════════════════════════════════════════════════════ -->
<div class="platform-content active" id="platform-meta">

<nav class="nav">
  <div style="display:flex;align-items:center;gap:0">
    <svg width="120" height="32" viewBox="0 0 200 52" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#ef4444"/>
          <stop offset="100%" style="stop-color:#dc2626"/>
        </linearGradient>
      </defs>
      <!-- REVN text -->
      <text x="2" y="40" font-family="'Arial Black',Arial,sans-serif" font-weight="900" font-size="40" fill="white" letter-spacing="-1">REVN</text>
      <!-- Crosshair O -->
      <circle cx="147" cy="24" r="14" fill="none" stroke="url(#rg)" stroke-width="3.5"/>
      <circle cx="147" cy="24" r="5" fill="#ef4444"/>
      <line x1="147" y1="6" x2="147" y2="42" stroke="#ef4444" stroke-width="2.5"/>
      <line x1="129" y1="24" x2="165" y2="24" stroke="#ef4444" stroke-width="2.5"/>
      <!-- X text -->
      <text x="163" y="40" font-family="'Arial Black',Arial,sans-serif" font-weight="900" font-size="40" fill="white" letter-spacing="-1">X</text>
      <!-- Arrow -->
      <path d="M183 38 L196 10 L184 14 M196 10 L192 22" stroke="#ef4444" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </div>
  <div class="nav-range" id="rangeLabel">${historyStart} → ${dateStr}</div>
  <div class="nav-space"></div>

  <div class="date-wrap day-only" style="display:none">
    <span class="date-lbl">Date:</span>
    <select class="date-sel" id="datePicker" onchange="changeDate(this.value)">
      ${sortedDates.slice().reverse().map(d => `<option value="${d}" ${d === latestDate ? 'selected' : ''}>${d}</option>`).join('')}
    </select>
  </div>
  <!-- Theme + Auth buttons -->
  <div style="display:flex;align-items:center;gap:8px;margin-left:auto">
    <button id="themeToggle" onclick="toggleTheme()" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:6px 12px;cursor:pointer;font-size:18px;line-height:1;transition:all .2s" title="Toggle Dark/Light mode">🌙</button>
  </div>
  <!-- Period filter: presets + custom date range in one row -->
  <div style="display:flex;align-items:center;gap:6px;flex-wrap:nowrap">
    <span style="font-size:10px;font-weight:700;color:#475569;letter-spacing:1px;text-transform:uppercase;white-space:nowrap">Period:</span>
    <button class="sh-qbtn meta-preset-btn" data-p="today"     onclick="metaSetPreset('today')">Today</button>
    <button class="sh-qbtn meta-preset-btn" data-p="yesterday" onclick="metaSetPreset('yesterday')">Yesterday</button>
    <button class="sh-qbtn meta-preset-btn" data-p="7d"        onclick="metaSetPreset('7d')">7 Days</button>
    <button class="sh-qbtn meta-preset-btn" data-p="14d"       onclick="metaSetPreset('14d')">14 Days</button>
    <button class="sh-qbtn meta-preset-btn active" data-p="mtd" onclick="metaSetPreset('mtd')">MTD Apr</button>
    <button class="sh-qbtn meta-preset-btn" data-p="all"       onclick="metaSetPreset('all')">All Time</button>
    <input type="date" class="range-inp" id="rangeFrom" onchange="applyRange()" title="From" style="margin-left:4px">
    <span style="color:var(--t2);font-size:11px">→</span>
    <input type="date" class="range-inp" id="rangeTo"   onchange="applyRange()" title="To">
  </div>
  <div class="nav-live">
    <div class="dot"></div>
    <span id="liveTimer">Updated just now</span>
  </div>
  <button class="nav-refresh" onclick="location.reload()">🔄 Refresh</button>
  ${spreadsheetUrl ? `<a href="${spreadsheetUrl}" target="_blank" class="nav-sheet">📊 Sheets</a>` : ''}
</nav>

<div class="layout">

<aside class="sidebar">
  <div class="sb-section">
    <div class="sb-health ${accRoas >= 2 ? 'hg' : accRoas >= 1 ? 'ha' : 'hr'}" style="display:flex;align-items:center;gap:10px;margin-bottom:0">
      <div class="sh-icon">${accRoas >= 2 ? '🟢' : accRoas >= 1 ? '🟡' : '🔴'}</div>
      <div>
        <div class="sh-label">${accRoas >= 2 ? 'STRONG' : accRoas >= 1 ? 'MODERATE' : 'CRITICAL'}</div>
        <div class="sh-desc">Overall account health</div>
      </div>
    </div>
  </div>
  <div class="sb-div"></div>
  <div class="sb-section">
    <div class="sb-lbl">Overview</div>
    <div class="sb-link active overview-only" onclick="goto('period-kpis')"><span class="ic">📊</span>Period Summary</div>
    <div class="sb-link overview-only" onclick="goto('period-trend')"><span class="ic">📈</span>Trends</div>
    <div class="sb-link overview-only" onclick="goto('period-weekly')"><span class="ic">📆</span>Weekly</div>
    <div class="sb-link overview-only" onclick="goto('period-campaigns')"><span class="ic">🚀</span>Campaigns</div>
    <div class="sb-link overview-only" onclick="goto('day-table')"><span class="ic">📅</span>Day-by-Day</div>
    <div class="sb-lbl day-only">Day Detail</div>
    <div class="sb-link day-only" onclick="goto('kpis')"><span class="ic">🎯</span>KPIs</div>
    <div class="sb-link day-only" onclick="goto('funnel')"><span class="ic">🔻</span>Funnel</div>
    <div class="sb-link day-only" onclick="goto('campaigns')"><span class="ic">🚀</span>Campaigns</div>
    <div class="sb-link day-only" onclick="goto('hourly')"><span class="ic">⏰</span>Hourly</div>
    <div class="sb-link day-only" onclick="goto('devices')"><span class="ic">📱</span>Devices</div>
    <div class="sb-link day-only" onclick="goto('creative')"><span class="ic">🎨</span>Creatives</div>
    <div class="sb-link day-only" onclick="goto('audience')"><span class="ic">👥</span>Audience</div>
    <div class="sb-link day-only" onclick="goto('actions')"><span class="ic">🚨</span>Actions</div>
  </div>
  <div class="sb-div"></div>
  <div class="sb-section">
    <div class="sb-lbl">Period Stats (${historyStart} →)</div>
    <div class="sb-stat"><span style="color:var(--t2)">Days</span><span style="color:var(--t);font-weight:600">${numDays}</span></div>
    <div class="sb-stat"><span style="color:var(--t2)">Total Spend</span><span style="color:var(--t);font-weight:600">${dollar(periodTotal.spend)}</span></div>
    <div class="sb-stat"><span style="color:var(--t2)">Total Revenue</span><span style="color:${periodTotal.revenue > periodTotal.spend ? 'var(--g)' : 'var(--r)'};font-weight:600">${dollar(periodTotal.revenue)}</span></div>
    <div class="sb-stat"><span style="color:var(--t2)">Avg ROAS</span><span style="color:${periodTotal.roas >= 2 ? 'var(--g)' : periodTotal.roas >= 1 ? 'var(--a)' : 'var(--r)'};font-weight:700">${roasS(periodTotal.roas)}</span></div>
    <div class="sb-stat"><span style="color:var(--t2)">Purchases</span><span style="color:var(--t);font-weight:600">${fmt(periodTotal.purchases)}</span></div>
    <div class="sb-stat"><span style="color:var(--t2)">Avg AOV</span><span style="color:var(--t);font-weight:600">${dollarD(periodTotal.aov)}</span></div>
  </div>
</aside>

<main class="main">

<!-- ═══════════════ OVERVIEW MODE ═══════════════ -->

<!-- ALERTS (overview) -->
<div class="overview-only">
  ${urgentCount > 0 ? `<div class="alert danger"><div class="alert-icon">🛑</div><div class="alert-body"><strong>${urgentCount} campaign${urgentCount > 1 ? 's' : ''}</strong> spending with zero conversions.</div></div>` : ''}
  ${scaleCount > 0 ? `<div class="alert success"><div class="alert-icon">🚀</div><div class="alert-body"><strong>${scaleCount} campaign${scaleCount > 1 ? 's' : ''}</strong> running at ≥2x ROAS — ready to scale.</div></div>` : ''}
</div>

<!-- AMAZON SUMMARY -->
\${amzConnected || amzSpend > 0 ? \`
<div class="sec overview-only" id="amazon-kpis" style="margin-bottom:24px;">
  <div class="sec-head" style="margin-bottom:14px;padding-bottom:10px;">
    <div>
      <div class="sec-title" style="color:#ff9900;">📦 Amazon Ads Summary</div>
      <div class="sec-sub">Performance metrics pulled from Amazon</div>
    </div>
  </div>
  <div class="kpi-grid g4" style="margin-bottom:14px">
    <div class="kcard" style="border-top:3px solid #ff9900;">
      <div class="k-lbl">Amazon Spend</div>
      <div class="k-val">\${dollar(amzSpend)}</div>
    </div>
    <div class="kcard" style="border-top:3px solid #ff9900;">
      <div class="k-lbl">Amazon Revenue</div>
      <div class="k-val" style="color:var(--gl)">\${dollar(amzRevenue)}</div>
    </div>
    <div class="kcard" style="border-top:3px solid #ff9900;">
      <div class="k-lbl">Amazon ROAS</div>
      <div class="k-val" style="color:var(--al)">\${roasS(amzRoas)}</div>
    </div>
    <div class="kcard" style="border-top:3px solid #ff9900;">
      <div class="k-lbl">Amazon Orders</div>
      <div class="k-val">\${amzOrders}</div>
    </div>
  </div>
</div>
\` : ''}

<!-- PERIOD KPI SUMMARY -->
<div class="sec overview-only" id="period-kpis">
  <div class="sec-head">
    <div>
      <div class="sec-title">📊 Period Summary — ${historyStart} to ${dateStr} (${numDays} days)</div>
      <div class="sec-sub">Cumulative performance across the full period</div>
    </div>
  </div>
  <div class="kpi-grid g6" style="margin-bottom:14px">
    <div class="kcard ${periodTotal.revenue > periodTotal.spend ? 'green' : 'red'}">
      <div class="k-status ${periodTotal.revenue > periodTotal.spend ? 'ks-good' : 'ks-bad'}">${periodTotal.revenue > periodTotal.spend ? 'Profitable' : 'Loss'}</div>
      <div class="k-lbl">Total Spend</div>
      <div class="k-val">${dollar(periodTotal.spend)}</div>
      <div class="k-meta"><span class="k-bench">Avg/Day: ${dollar(periodTotal.spend / numDays)}</span></div>
    </div>
    <div class="kcard ${periodTotal.revenue > periodTotal.spend ? 'green' : 'red'}">
      <div class="k-status ${periodTotal.revenue > periodTotal.spend ? 'ks-good' : 'ks-bad'}">${periodTotal.revenue > periodTotal.spend ? 'Profitable' : 'Below Spend'}</div>
      <div class="k-lbl">Total Revenue</div>
      <div class="k-val ${periodTotal.revenue > periodTotal.spend ? 'gv' : 'rv'}">${dollar(periodTotal.revenue)}</div>
      <div class="k-meta"><span class="k-bench">Net: ${dollar(periodTotal.revenue - periodTotal.spend)}</span></div>
    </div>
    <div class="kcard ${periodTotal.roas >= 2 ? 'green' : periodTotal.roas >= 1 ? 'amber' : 'red'}">
      <div class="k-status ${periodTotal.roas >= 2 ? 'ks-good' : periodTotal.roas >= 1 ? 'ks-warn' : 'ks-bad'}">${periodTotal.roas >= 2 ? 'Strong' : periodTotal.roas >= 1 ? 'Break Even' : 'Losing'}</div>
      <div class="k-lbl">Period Avg ROAS</div>
      <div class="k-val ${periodTotal.roas >= 2 ? 'gv' : periodTotal.roas >= 1 ? 'av' : 'rv'}">${roasS(periodTotal.roas)}</div>
      <div class="k-meta"><span class="k-bench">Target ≥ 2.0x</span></div>
    </div>
    <div class="kcard">
      <div class="k-lbl">Total Purchases</div>
      <div class="k-val">${fmt(periodTotal.purchases)}</div>
      <div class="k-meta"><span class="k-bench">CPA: ${periodTotal.cpa > 0 ? dollar(periodTotal.cpa) : 'N/A'}</span></div>
    </div>
    <div class="kcard purple">
      <div class="k-lbl">Average Order Value</div>
      <div class="k-val">${dollarD(periodTotal.aov)}</div>
      <div class="k-meta"><span class="k-bench">Per Purchase</span></div>
    </div>
    <div class="kcard">
      <div class="k-lbl">Cost Per Result</div>
      <div class="k-val">${dollar(periodTotal.cpa)}</div>
      <div class="k-meta"><span class="k-bench">${periodTotal.purchases} conversions</span></div>
    </div>
  </div>
  <div class="highlights">
    <div class="hl-card">
      <div class="hl-label">🏆 Best ROAS Day</div>
      <div class="hl-day">${bestDay || '—'}</div>
      <div class="hl-meta">ROAS: ${roasS(allDailyData[bestDay]?.account?.roas || 0)} · Spend: ${dollar(allDailyData[bestDay]?.account?.spend || 0)}</div>
      <span class="hl-badge" style="background:rgba(16,185,129,.15);color:var(--g)">Best Day</span>
    </div>
    <div class="hl-card">
      <div class="hl-label">⚠️ Worst ROAS Day</div>
      <div class="hl-day">${worstDay || '—'}</div>
      <div class="hl-meta">ROAS: ${roasS(allDailyData[worstDay]?.account?.roas || 0)} · Spend: ${dollar(allDailyData[worstDay]?.account?.spend || 0)}</div>
      <span class="hl-badge" style="background:rgba(239,68,68,.15);color:var(--r)">Needs Review</span>
    </div>
    <div class="hl-card">
      <div class="hl-label">💰 Highest Spend Day</div>
      <div class="hl-day">${highSpendDay || '—'}</div>
      <div class="hl-meta">Spend: ${dollar(allDailyData[highSpendDay]?.account?.spend || 0)} · ROAS: ${roasS(allDailyData[highSpendDay]?.account?.roas || 0)}</div>
      <span class="hl-badge" style="background:rgba(59,130,246,.15);color:var(--bl)">Peak Spend</span>
    </div>
  </div>
</div>

<!-- PERIOD TREND CHARTS -->
<div class="sec overview-only" id="period-trend">
  <div class="sec-head">
    <div>
      <div class="sec-title">📈 Performance Trends — ${historyStart} to ${dateStr}</div>
      <div class="sec-sub">Daily spend, revenue, ROAS, and purchase volume</div>
    </div>
  </div>
  <div class="cc" style="margin-bottom:16px">
    <div class="cc-head">
      <div class="cc-title">💰 Daily Spend vs Revenue</div>
      <div class="cc-leg">
        <div class="leg-item"><div class="leg-dot" style="background:var(--blue)"></div>Spend</div>
        <div class="leg-item"><div class="leg-dot" style="background:var(--g)"></div>Revenue</div>
      </div>
    </div>
    <div class="cw h280"><canvas id="ovSpendRev"></canvas></div>
    <div class="cc-note">📊 <strong>Period Net:</strong> ${dollar(periodTotal.revenue - periodTotal.spend)} · Revenue exceeds spend on ${sortedDates.filter(d => allDailyData[d]?.account?.revenue > allDailyData[d]?.account?.spend).length} of ${numDays} days</div>
  </div>
  <div class="cg2" style="margin-bottom:16px">
    <div class="cc">
      <div class="cc-head">
        <div class="cc-title">🎯 Daily ROAS</div>
        <div class="cc-sub">Dotted = 2x target</div>
      </div>
      <div class="cw h200"><canvas id="ovRoas"></canvas></div>
    </div>
    <div class="cc">
      <div class="cc-head">
        <div class="cc-title">🛒 Daily Purchases</div>
      </div>
      <div class="cw h200"><canvas id="ovPurchases"></canvas></div>
    </div>
  </div>
</div>

<!-- WEEKLY ANALYSIS -->
<div class="sec overview-only" id="period-weekly">
  <div class="sec-head">
    <div>
      <div class="sec-title">📆 Weekly Analysis</div>
      <div class="sec-sub">Week-over-week trends and patterns</div>
    </div>
  </div>
  <div class="cg2">
    <div class="cc">
      <div class="cc-head"><div class="cc-title">📊 Weekly Spend Trend</div></div>
      <div class="cw h240"><canvas id="weeklySpend"></canvas></div>
    </div>
    <div class="cc">
      <div class="cc-head"><div class="cc-title">📈 Weekly ROAS</div></div>
      <div class="cw h240"><canvas id="weeklyRoas"></canvas></div>
    </div>
  </div>
</div>

<!-- CAMPAIGNS -->
<div class="sec overview-only" id="period-campaigns">
  <div class="sec-head">
    <div><div class="sec-title">🏆 Campaign Leaderboard</div><div class="sec-sub">Aggregated from ${historyStart} to ${dateStr}</div></div>
    <div class="sec-badge">${(campsEnriched || []).length} campaigns</div>
  </div>
  <div class="tcard">
    <div class="ttop"><div class="ttitle">📋 All Campaigns (Period Totals)</div></div>
    <div class="tscroll">
      <table>
        <thead><tr><th>#</th><th>Campaign</th><th>Spend</th><th>Revenue</th><th>ROAS</th><th>Purchases</th><th>CPA</th><th>CTR</th><th>Freq</th></tr></thead>
        <tbody>${(campsEnriched || []).slice(0, 15).map((c, i) => `<tr><td class="cm">${i+1}</td><td class="cn">${c.name.length > 32 ? c.name.slice(0, 32) + '…' : c.name}</td><td>${dollar(c.spend)}</td><td style="color:${c.revenue > c.spend ? 'var(--g)' : c.revenue > 0 ? 'var(--a)' : 'var(--t2)'}">${dollar(c.revenue)}</td><td><span class="badge ${roasCls(c.roas)}">${roasS(c.roas)}</span></td><td>${c.purchases}</td><td>${c.cpa > 0 ? dollar(c.cpa) : '—'}</td><td>${pct(c.ctr)}</td><td class="cm">${fmtD(c.frequency)}</td></tr>`).join('')}</tbody>
      </table>
    </div>
  </div>
</div>

<!-- DAY-BY-DAY TABLE -->
<div class="sec overview-only" id="day-table">
  <div class="sec-head">
    <div><div class="sec-title">📅 Day-by-Day Performance</div><div class="sec-sub">Click a row to open Day Detail for that date</div></div>
  </div>
  <div class="tcard">
    <div class="tscroll">
      <table>
        <thead><tr><th>Date</th><th>Spend</th><th>Revenue</th><th>ROAS</th><th>Purchases</th><th>CPA</th><th>CTR</th><th>CPM</th><th>Impressions</th></tr></thead>
        <tbody id="dayByDayBody">
          ${sortedDates.slice().reverse().map((d, i, arr) => {
            const a = allDailyData[d]?.account || {};
            const isGood = a.roas >= 2, isBad = a.spend > 0 && a.roas < 1;
            return `<tr class="${isGood ? 'day-row-good' : isBad ? 'day-row-bad' : ''}" style="cursor:pointer" onclick="switchView('day','${d}')">
              <td style="font-weight:700;color:${d === latestDate ? 'var(--bl)' : 'var(--t)'}">${d}${d === latestDate ? ' ← Latest' : ''}</td>
              <td>${dollar(a.spend || 0)}</td>
              <td style="color:${a.revenue > a.spend ? 'var(--g)' : a.revenue > 0 ? 'var(--a)' : 'var(--t2)'}">${dollar(a.revenue || 0)}</td>
              <td><span class="badge ${roasCls(a.roas)}">${roasS(a.roas)}</span></td>
              <td>${a.purchases || 0}</td>
              <td>${a.cpa > 0 ? dollar(a.cpa) : '—'}</td>
              <td>${pct(a.ctr || 0)}</td>
              <td>${dollar(a.cpm || 0)}</td>
              <td class="cm">${fmt(a.impressions || 0)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  </div>
</div>

<!-- ═══════════════ DAY DETAIL MODE ═══════════════ -->

<!-- KPI SCORECARDS (day) -->
<div class="sec day-only" id="kpis">
  <div class="sec-head">
    <div><div class="sec-title">🎯 KPI Scorecards</div><div class="sec-sub" id="kpiSubTitle">Yesterday's metrics</div></div>
  </div>
  <div class="kpi-grid g6" style="margin-bottom:14px" id="kpiRow1">
    <div class="kcard"><div class="k-lbl">Total Spend</div><div class="k-val" id="kv-spend">${dollar(yesterdaySpend)}</div></div>
    <div class="kcard"><div class="k-lbl">Revenue</div><div class="k-val" id="kv-rev">${dollar(accRevenue)}</div></div>
    <div class="kcard"><div class="k-lbl">ROAS</div><div class="k-val" id="kv-roas">${roasS(accRoas)}</div><div class="k-meta"><span class="k-bench">Target ≥ 2.0x</span></div></div>
    <div class="kcard"><div class="k-lbl">Purchases</div><div class="k-val" id="kv-buys">${accPurchases}</div></div>
    <div class="kcard purple"><div class="k-lbl">AOV (Avg Order Value)</div><div class="k-val" id="kv-aov">${dollarD(accAov)}</div></div>
    <div class="kcard"><div class="k-lbl">Cost Per Result</div><div class="k-val" id="kv-cpa">${dollarD(accCpa)}</div></div>
  </div>
  <div class="kpi-grid g4">
    <div class="kcard"><div class="k-lbl">CTR</div><div class="k-val" id="kv-ctr">${pct(accCtr)}</div><div class="k-meta"><span class="k-bench">Clicks: ${fmt(accClicks)}</span></div></div>
    <div class="kcard"><div class="k-lbl">CPC</div><div class="k-val" id="kv-cpc">${dollarD(accCpc)}</div><div class="k-meta"><span class="k-bench">CPM: ${dollarD(accCpm)}</span></div></div>
    <div class="kcard"><div class="k-lbl">Frequency</div><div class="k-val" id="kv-freq">${fmtD(accFreq)}</div><div class="k-meta"><span class="k-bench">Target ≤3x</span></div></div>
    <div class="kcard"><div class="k-lbl">Impressions</div><div class="k-val" style="font-size:20px" id="kv-impr">${fmt(accImpressions)}</div></div>
  </div>
</div>

<!-- FUNNEL (day) - 6 STEPS -->
<div class="sec day-only" id="funnel">
  <div class="sec-head"><div><div class="sec-title">🔻 Conversion Funnel</div><div class="sec-sub">6-stage conversion path with optimization opportunities</div></div></div>
  <div class="funnel" id="funnelWrap">
    <div class="f-step"><div class="f-icon">👁️</div><div class="f-stage">Impressions</div><div class="f-val" id="fv-impr">${fmt(accImpressions)}</div><div class="f-rate n">Entry Point</div><div class="f-bar"><div class="f-fill" style="width:100%;background:var(--blue)"></div></div></div>
    <div class="f-step"><div class="f-icon">🖱️</div><div class="f-stage">Clicks</div><div class="f-val" id="fv-clicks">${fmt(accClicks)}</div><div class="f-rate" id="fr-ctr">${pct(fCtr)}CTR</div><div class="f-bar"><div class="f-fill" id="fb-ctr" style="width:0%;background:var(--blue)"></div></div></div>
    <div class="f-step"><div class="f-icon">🏠</div><div class="f-stage">Landing Page</div><div class="f-val" id="fv-lpv">${fmt(accLpv)}</div><div class="f-rate" id="fr-lpv">${pct(fLpv)}of Clicks</div><div class="f-bar"><div class="f-fill" id="fb-lpv" style="width:0%;background:var(--blue)"></div></div></div>
    <div class="f-step"><div class="f-icon">🛒</div><div class="f-stage">Add to Cart</div><div class="f-val" id="fv-atc">${fmt(accAtc)}</div><div class="f-rate" id="fr-atc">${pct(fAtc)}of LPV</div><div class="f-bar"><div class="f-fill" id="fb-atc" style="width:0%;background:var(--blue)"></div></div></div>
    <div class="f-step"><div class="f-icon">💳</div><div class="f-stage">Checkout Init</div><div class="f-val" id="fv-checkout">${fmt(accCheckout)}</div><div class="f-rate" id="fr-checkout">${pct(fCheckout)}of ATC</div><div class="f-bar"><div class="f-fill" id="fb-checkout" style="width:0%;background:var(--blue)"></div></div></div>
    <div class="f-step"><div class="f-icon">✅</div><div class="f-stage">Purchase</div><div class="f-val" id="fv-buys2">${fmt(accPurchases)}</div><div class="f-rate" id="fr-pur">${pct(fPurchase)}of Checkout</div><div class="f-bar"><div class="f-fill" id="fb-pur" style="width:0%;background:var(--blue)"></div></div></div>
  </div>
  <div class="cc-note" style="margin-top:12px" id="funnelNote">💡 Overall: ${periodTotal.purchases > 0 ? ((periodTotal.purchases / Math.max(periodTotal.impressions, 1)) * 100).toFixed(3) + '% of impressions convert to purchase' : 'No purchases yet'}</div>
</div>

<!-- HOURLY + DEVICE -->
<div class="sec day-only" id="hourly">
  <div class="sec-head"><div><div class="sec-title">⏰ Hourly Analysis</div><div class="sec-sub">Today bars vs 7-Day Daily Average (dashed lines)</div></div></div>
  <div class="cc" style="margin-bottom:16px">
    <div class="cc-head">
      <div class="cc-title">⏰ Hourly Spend &amp; Revenue — Today vs 7-Day Avg</div>
      <div class="t-meta" style="font-size:11px;color:#64748b">Bars = today · Dashed = 7-day proportional average</div>
    </div>
    <div class="cw" style="height:240px"><canvas id="chartHourly"></canvas></div>
  </div>
  <div class="cc">
    <div class="cc-head">
      <div class="cc-title">💱 Hourly ROAS — Today vs 7-Day Avg</div>
      <div class="t-meta" style="font-size:11px;color:#64748b">Grey dashed = 7-day average ROAS reference</div>
    </div>
    <div class="cw" style="height:190px"><canvas id="chartHourlyRoas"></canvas></div>
  </div>
</div>



<!-- DEVICE + PLATFORM -->
<div class="sec day-only" id="devices">
  <div class="sec-head"><div><div class="sec-title">📱 Device & Platform Performance</div></div></div>
  <div class="cg2">
    <div class="cc">
      <div class="cc-head"><div class="cc-title">📱 Spend by Device</div></div>
      <div class="cw h240"><canvas id="chartDevice"></canvas></div>
    </div>
    <div class="cc">
      <div class="cc-head"><div class="cc-title">🌐 Spend by Platform</div></div>
      <div class="cw h240"><canvas id="chartPlatform"></canvas></div>
    </div>
  </div>
</div>

<!-- CAMPAIGNS (day) -->
<div class="sec day-only" id="campaigns">
  <div class="sec-head">
    <div><div class="sec-title">🚀 Campaign Performance</div><div class="sec-sub" id="campDayLabel">Latest day campaigns</div></div>
    <div class="sec-badge">${(campsEnriched || []).length} campaigns</div>
  </div>
  <div class="cg2" style="margin-bottom:16px">
    <div class="cc">
      <div class="cc-head"><div class="cc-title">📊 ROAS by Campaign</div></div>
      <div class="cw h280"><canvas id="chartCampRoas"></canvas></div>
    </div>
    <div class="cc">
      <div class="cc-head"><div class="cc-title">💰 Revenue vs Spend</div></div>
      <div class="cw h280"><canvas id="chartCampRevSpend"></canvas></div>
    </div>
  </div>
  <div class="tcard">
    <div class="ttop"><div class="ttitle">📋 Campaign Table</div></div>
    <div class="tscroll"><table><thead><tr><th>#</th><th>Campaign</th><th>Spend</th><th>Revenue</th><th>ROAS</th><th>Purchases</th><th>CPA</th><th>CTR</th><th>CPM</th><th>Freq</th><th>Action</th></tr></thead><tbody id="camp-tbody">${campTableRows}</tbody></table></div>
  </div>
</div>

<!-- CREATIVES (day) -->
<div class="sec day-only" id="creative">
  <div class="sec-head"><div><div class="sec-title">🎨 Creative Performance</div><div class="sec-sub">3 buckets · Top · Bottom · Runner-up · Video stats</div></div></div>

  <div class="cg2" style="margin-bottom:16px">
    <div class="cc">
      <div class="cc-head"><div class="cc-title">🏆 Top Creative ROAS</div></div>
      <div class="cw h240"><canvas id="chartAdRoas"></canvas></div>
    </div>
    <div class="cc">
      <div class="cc-head"><div class="cc-title">⚠️ Fatigue Monitor (Frequency)</div></div>
      <div class="cw h240"><canvas id="chartAdFreq"></canvas></div>
    </div>
  </div>

  <!-- Bucket 1: Top -->
  <div class="tcard" style="margin-bottom:12px">
    <div class="ttop" style="background:rgba(16,185,129,0.1);border-left:3px solid #10b981">
      <div class="ttitle">🏆 Top Creatives — Highest ROAS</div>
      <div class="t-meta">Scale budget · Best performers with conversions</div>
    </div>
    <div class="tscroll"><table><thead><tr><th>#</th><th>Ad Name</th><th>Campaign</th><th>Spend</th><th>Revenue</th><th>ROAS</th><th>Buys</th><th>Freq</th><th>Plays</th><th>25% View</th><th>100% View</th></tr></thead><tbody id="creative-top-tbody">${bucketTop.length>0?bucketTop.map((a,i)=>{
  const playPct=a.plays>0?((a.v100/a.plays)*100).toFixed(1)+'%':'—';
  const v25Pct=a.plays>0?((a.v25/a.plays)*100).toFixed(1)+'%':'—';
  return '<tr><td class=\"cm\">'+(i+1)+'</td>'
   +'<td class=\"cn\">'+(a.ad_name||'—').slice(0,26)+'</td>'
   +'<td style=\"font-size:10px\">'+(a.campaign_name||'—').slice(0,20)+'</td>'
   +'<td>'+dollar(a.sp)+'</td>'
   +'<td style=\"color:'+(a.rev>a.sp?'var(--g)':a.rev>0?'var(--a)':'var(--t2)')+'\">'+dollar(a.rev)+'</td>'
   +'<td><span class=\"badge '+roasCls(a.roas)+'\">'+roasS(a.roas)+'</span></td>'
   +'<td>'+a.buys+'</td>'
   +'<td style=\"color:'+(a.freq>4?'var(--r)':a.freq>3?'var(--a)':'var(--t)')+'\">'+fmtD(a.freq)+'</td>'
   +'<td>'+(a.plays>0?parseInt(a.plays).toLocaleString('en-IN'):'—')+'</td>'
   +'<td>'+v25Pct+'</td>'
   +'<td>'+playPct+'</td></tr>';
}).join(''):"<tr><td colspan=\"11\" style=\"text-align:center;color:var(--t2);padding:16px\">No creatives in this category</td></tr>"}</tbody></table></div>
  </div>

  <!-- Bucket 2: Bottom -->
  <div class="tcard" style="margin-bottom:12px">
    <div class="ttop" style="background:rgba(239,68,68,0.1);border-left:3px solid #ef4444">
      <div class="ttitle">📉 Bottom Creatives — Losing Money</div>
      <div class="t-meta">Spend ₹200+ · ROAS &lt; 1x · Consider pausing</div>
    </div>
    <div class="tscroll"><table><thead><tr><th>#</th><th>Ad Name</th><th>Campaign</th><th>Spend</th><th>Revenue</th><th>ROAS</th><th>Buys</th><th>Freq</th><th>Plays</th><th>25% View</th><th>100% View</th></tr></thead><tbody id="creative-bottom-tbody">${bucketBottom.length>0?bucketBottom.map((a,i)=>{
  const playPct=a.plays>0?((a.v100/a.plays)*100).toFixed(1)+'%':'—';
  const v25Pct=a.plays>0?((a.v25/a.plays)*100).toFixed(1)+'%':'—';
  return '<tr><td class=\"cm\">'+(i+1)+'</td>'
   +'<td class=\"cn\">'+(a.ad_name||'—').slice(0,26)+'</td>'
   +'<td style=\"font-size:10px\">'+(a.campaign_name||'—').slice(0,20)+'</td>'
   +'<td>'+dollar(a.sp)+'</td>'
   +'<td style=\"color:'+(a.rev>a.sp?'var(--g)':a.rev>0?'var(--a)':'var(--t2)')+'\">'+dollar(a.rev)+'</td>'
   +'<td><span class=\"badge '+roasCls(a.roas)+'\">'+roasS(a.roas)+'</span></td>'
   +'<td>'+a.buys+'</td>'
   +'<td style=\"color:'+(a.freq>4?'var(--r)':a.freq>3?'var(--a)':'var(--t)')+'\">'+fmtD(a.freq)+'</td>'
   +'<td>'+(a.plays>0?parseInt(a.plays).toLocaleString('en-IN'):'—')+'</td>'
   +'<td>'+v25Pct+'</td>'
   +'<td>'+playPct+'</td></tr>';
}).join(''):"<tr><td colspan=\"11\" style=\"text-align:center;color:var(--t2);padding:16px\">No creatives in this category</td></tr>"}</tbody></table></div>
  </div>

  <!-- Bucket 3: Runner-up -->
  <div class="tcard" style="margin-bottom:12px">
    <div class="ttop" style="background:rgba(245,158,11,0.1);border-left:3px solid #f59e0b">
      <div class="ttitle">🚀 Daily Runner-ups — 1x–2x ROAS</div>
      <div class="t-meta">Promising · Optimise to push above 2x</div>
    </div>
    <div class="tscroll"><table><thead><tr><th>#</th><th>Ad Name</th><th>Campaign</th><th>Spend</th><th>Revenue</th><th>ROAS</th><th>Buys</th><th>Freq</th><th>Plays</th><th>25% View</th><th>100% View</th></tr></thead><tbody id="creative-runnerup-tbody">${bucketRunnerup.length>0?bucketRunnerup.map((a,i)=>{
  const playPct=a.plays>0?((a.v100/a.plays)*100).toFixed(1)+'%':'—';
  const v25Pct=a.plays>0?((a.v25/a.plays)*100).toFixed(1)+'%':'—';
  return '<tr><td class=\"cm\">'+(i+1)+'</td>'
   +'<td class=\"cn\">'+(a.ad_name||'—').slice(0,26)+'</td>'
   +'<td style=\"font-size:10px\">'+(a.campaign_name||'—').slice(0,20)+'</td>'
   +'<td>'+dollar(a.sp)+'</td>'
   +'<td style=\"color:'+(a.rev>a.sp?'var(--g)':a.rev>0?'var(--a)':'var(--t2)')+'\">'+dollar(a.rev)+'</td>'
   +'<td><span class=\"badge '+roasCls(a.roas)+'\">'+roasS(a.roas)+'</span></td>'
   +'<td>'+a.buys+'</td>'
   +'<td style=\"color:'+(a.freq>4?'var(--r)':a.freq>3?'var(--a)':'var(--t)')+'\">'+fmtD(a.freq)+'</td>'
   +'<td>'+(a.plays>0?parseInt(a.plays).toLocaleString('en-IN'):'—')+'</td>'
   +'<td>'+v25Pct+'</td>'
   +'<td>'+playPct+'</td></tr>';
}).join(''):"<tr><td colspan=\"11\" style=\"text-align:center;color:var(--t2);padding:16px\">No creatives in this category</td></tr>"}</tbody></table></div>
  </div>

</div>

<!-- AUDIENCE (day) -->
<div class="sec day-only" id="audience">
  <div class="sec-head"><div><div class="sec-title">👥 Audience Intelligence</div><div class="sec-sub">Demographics · Interests · Custom · Lookalike · Geo Targeting</div></div></div>

    <!-- Age Ranges table -->
  <div class="tcard" style="margin-bottom:14px">
    <div class="ttop"><div class="ttitle">🎂 Age Ranges — Performance Breakdown</div><div class="t-meta">Meta Ads API · Age segments · Actual spend data</div></div>
    <div class="tscroll"><table><thead><tr><th>#</th><th>Age</th><th>Spend</th><th>Revenue</th><th>ROAS</th><th>Purchases</th><th>CPA</th></tr></thead><tbody id="age-range-tbody">${ageRows}</tbody></table></div>
  </div>

  <!-- Charts row -->
  <div class="cg2" style="margin-bottom:16px">
    <div class="cc">
      <div class="cc-head"><div class="cc-title">📊 ROAS by Age/Gender</div></div>
      <div class="cw h240"><canvas id="chartDemoRoas"></canvas></div>
    </div>
    <div class="cc">
      <div class="cc-head"><div class="cc-title">💰 Spend by Age/Gender</div></div>
      <div class="cw h240"><canvas id="chartDemoSpend"></canvas></div>
    </div>
  </div>

  <!-- Demographics table -->
  <div class="tcard" style="margin-bottom:14px">
    <div class="ttop"><div class="ttitle">📊 Age × Gender Performance (<span id="demo-date-label">${dateStr}</span>)</div><div class="t-meta">From Meta Ads Insights API breakdown</div></div>
    <div class="tscroll"><table><thead><tr><th>#</th><th>Age/Gender</th><th>Spend</th><th>Revenue</th><th>ROAS</th><th>Purchases</th><th>CPA</th></tr></thead><tbody id="age-gender-tbody">${demoRows}</tbody></table></div>
  </div>

  <!-- 3-col: Interests | Custom Audiences | Lookalike -->
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px">
    <div class="tcard">
      <div class="ttop"><div class="ttitle">🎯 Interest Targeting</div><div class="t-meta"><span id="interest-meta">${topInterests.length} unique interests across active adsets</span></div></div>
      <div class="tscroll" style="max-height:260px"><table><thead><tr><th>#</th><th>Interest</th><th>Adsets</th></tr></thead><tbody id="interest-tbody">${interestRows}</tbody></table></div>
    </div>
    <div class="tcard">
      <div class="ttop"><div class="ttitle">👤 Custom Audiences</div><div class="t-meta">${customAudiences.length} audiences in active adsets</div></div>
      <div class="tscroll" style="max-height:260px"><table><thead><tr><th>#</th><th>Audience</th><th>Used In Adsets</th></tr></thead><tbody id="custom-audience-tbody">${customAudRows}</tbody></table></div>
    </div>
    <div class="tcard">
      <div class="ttop"><div class="ttitle">🔄 Lookalike Audiences</div><div class="t-meta">${lookalikesArr.length} LAL sets found</div></div>
      <div class="tscroll" style="max-height:260px"><table><thead><tr><th>#</th><th>Lookalike Set</th><th>Used In Adsets</th></tr></thead><tbody>${llRows}</tbody></table></div>
    </div>
  </div>
</div>

<!-- ACTIONS (day) -->
<div class="sec day-only" id="actions">
  <div class="sec-head"><div><div class="sec-title">🚨 Action Center</div><div class="sec-sub">Prioritized — highest impact first</div></div><div class="sec-badge">${(actionItems || []).length} actions</div></div>
  ${(actionItems || []).length === 0
    ? `<div class="no-actions"><div class="na-icon">✅</div><div class="na-txt">All Clear</div><div class="na-sub">No urgent actions needed.</div></div>`
    : `<div class="ac-grid">${(actionItems || []).slice(0, 10).map(a => {
      const iu = a.urgency && a.urgency.includes('URGENT');
      const is = a.urgency && a.urgency.includes('SCALE');
      const iw = a.urgency && (a.urgency.includes('REFRESH') || a.urgency.includes('OPTIMIZE'));
      const cls = iu ? 'cu' : is ? 'cs' : iw ? 'cw' : 'ci';
      const ico = iu ? '🛑' : is ? '🚀' : iw ? '⚠️' : '💡';
      const icol = iu ? 'aci-r' : is ? 'aci-g' : iw ? 'aci-a' : 'aci-b';
      return `<div class="ac-card ${cls}"><div class="ac-ico ${icol}">${ico}</div><div style="min-width:0"><div class="ac-type">${a.type || ''}</div><div class="ac-name">${(a.name || '').slice(0, 48)}</div><div class="ac-issue">${a.issue || ''}</div><div class="ac-step">→ ${a.howTo || ''}</div></div></div>`;
    }).join('')}</div>`
  }
</div>

</main>
</div>
</div>
<!-- ═══ END META PLATFORM ════════════════════════════════════════════════════ -->

<!-- ═══ SHOPIFY PLATFORM ═════════════════════════════════════════════════════ -->
<!-- SHOPIFY PLATFORM (JS-rendered, fully interactive) -->
<div class="platform-content" id="platform-shopify">
${shopifyData ? `
<div style="background:rgba(15,23,42,0.6);min-height:100vh;padding:22px 28px">
  <!-- ── SHOPIFY HEADER ── -->
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px">
    <div>
      <h2 style="font-size:22px;font-weight:800;color:#f8fafc;margin-bottom:3px">🛍️ Shopify Intelligence — Invisel</h2>
      <div style="font-size:13px;color:#64748b" id="sh-period-label">Apr 1 → ${dateStr} · 53 metrics · Updates every 15 min</div>
    </div>
    <!-- Alert badges -->
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
      ${shAbandoned > 0 ? `<div style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);border-radius:8px;padding:6px 14px;font-size:12px;color:#fca5a5;font-weight:600">⚠️ ${shAbandoned} Abandoned · ₹${shAbandonedVal.toLocaleString('en-IN',{maximumFractionDigits:0})}</div>` : ''}
      ${shPending > 0 ? `<div style="background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.3);border-radius:8px;padding:6px 14px;font-size:12px;color:#fbbf24;font-weight:600">📦 ${shPending} Pending</div>` : ''}
    </div>
  </div>

  <!-- ── DATE FILTER BAR ──────────────────────────────────────────────────── -->
  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:18px;background:rgba(30,41,59,0.5);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:10px 14px">
    <span style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:1px;margin-right:4px">Period:</span>
    <button onclick="shSetPreset('today')" id="shp-today" class="sh-qbtn">Today</button>
    <button onclick="shSetPreset('yesterday')" id="shp-yesterday" class="sh-qbtn">Yesterday</button>
    <button onclick="shSetPreset('7d')" id="shp-7d" class="sh-qbtn">7 Days</button>
    <button onclick="shSetPreset('14d')" id="shp-14d" class="sh-qbtn">14 Days</button>
    <button onclick="shSetPreset('mtd')" id="shp-mtd" class="sh-qbtn active">MTD Apr</button>
    <button onclick="shSetPreset('all')" id="shp-all" class="sh-qbtn">All Time</button>
    <div style="width:1px;height:20px;background:rgba(255,255,255,0.08);margin:0 4px"></div>
    <input type="date" id="sh-from" value="2026-04-01" min="2026-04-01" max="${dateStr}" onchange="shSetCustom()" style="background:rgba(15,23,42,0.8);border:1px solid rgba(255,255,255,0.1);border-radius:7px;padding:4px 8px;color:#94a3b8;font-size:12px">
    <span style="color:#475569;font-size:12px">→</span>
    <input type="date" id="sh-to" value="${dateStr}" min="2026-04-01" max="${dateStr}" onchange="shSetCustom()" style="background:rgba(15,23,42,0.8);border:1px solid rgba(255,255,255,0.1);border-radius:7px;padding:4px 8px;color:#94a3b8;font-size:12px">
    <span style="font-size:12px;color:#475569;margin-left:6px" id="sh-day-count"></span>
  </div>

  <!-- True ROAS Banner — updates dynamically with Shopify date filter -->
  <div id="sh-true-roas-banner" style="margin-bottom:16px"></div>

  <!-- ── DYNAMIC KPI SECTION (filled by JS renderShopify) ── -->
  <div id="sh-kpi-section"></div>

  <!-- Chart Row 1 -->
  <div class="cg2" style="margin-bottom:14px">
    <div class="cc"><div class="cc-head"><div class="cc-title">⏰ Hourly Orders & Revenue — Today</div></div><div class="cw" style="height:210px"><canvas id="chartShopifyHourly"></canvas></div></div>
    <div class="cc"><div class="cc-head"><div class="cc-title" id="sh-trend-title">📈 Daily GMV & Orders — Period</div><div class="t-meta" id="sh-trend-meta"></div></div><div class="cw" style="height:210px"><canvas id="chartShopifyTrend"></canvas></div></div>
  </div>

  <!-- Chart Row 2 -->
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:14px">
    <div class="cc"><div class="cc-head"><div class="cc-title">📊 Cumulative GMV</div></div><div class="cw" style="height:180px"><canvas id="chartShopifyCumGmv"></canvas></div></div>
    <div class="cc"><div class="cc-head"><div class="cc-title">👥 New vs Returning Daily</div></div><div class="cw" style="height:180px"><canvas id="chartShopifyCust"></canvas></div></div>
    <div class="cc"><div class="cc-head"><div class="cc-title">💳 COD vs Prepaid Daily</div></div><div class="cw" style="height:180px"><canvas id="chartShopifyCod"></canvas></div></div>
  </div>

  <!-- Chart Row 3 -->
  <div class="cg2" style="margin-bottom:14px">
    <div class="cc"><div class="cc-head"><div class="cc-title">📦 Order Value Distribution</div></div><div class="cw" style="height:200px"><canvas id="chartShopifyBuckets"></canvas></div></div>
    <div class="cc"><div class="cc-head"><div class="cc-title">🏷️ Top Products — Period Revenue</div></div><div class="cw" style="height:200px"><canvas id="chartShopifyProducts"></canvas></div></div>
  </div>

  <!-- Dynamic tables section -->
  <div id="sh-tables-section"></div>

  <!-- end of shopify dynamic section -->
  <!-- (old static sections removed — all rendered by JS renderShopify()) -->

</div>
` : `<div class="coming-soon"><div class="cs-icon">🛍️</div><div class="cs-title">Shopify Not Connected</div><div class="cs-sub">Add SHOPIFY_TOKEN to config.env</div></div>`}
</div>
<!-- ═══ END SHOPIFY PLATFORM ══════════════════════════════════════════════════ -->

<!-- ═══ AMAZON PLATFORM ══════════════════════════════════════════════════════ -->
<div class="platform-content" id="platform-amazon">
<div style="background:rgba(15,23,42,0.6);min-height:100vh;padding:22px 28px">

  <!-- Header + date filter -->
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px">
    <div>
      <h2 style="font-size:22px;font-weight:800;color:#f8fafc;margin-bottom:3px">📦 Amazon Ads Intelligence</h2>
      <div style="font-size:13px;color:#64748b">Sponsored Products · Sponsored Brands · ACOS · TACOS · ${dateStr}</div>
    </div>
    <div style="background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.25);border-radius:8px;padding:6px 16px;font-size:12px;color:#fbbf24;font-weight:600">⚠️ Connect Amazon Ads to unlock live data</div>
  </div>

  <!-- Date filter bar -->
  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:18px;background:rgba(30,41,59,0.5);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:10px 14px">
    <span style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:1px;margin-right:4px">Period:</span>
    <button onclick="amzSetPreset('today')" id="amzp-today" class="sh-qbtn">Today</button>
    <button onclick="amzSetPreset('7d')" id="amzp-7d" class="sh-qbtn">7 Days</button>
    <button onclick="amzSetPreset('14d')" id="amzp-14d" class="sh-qbtn">14 Days</button>
    <button onclick="amzSetPreset('mtd')" id="amzp-mtd" class="sh-qbtn active">MTD Apr</button>
    <button onclick="amzSetPreset('all')" id="amzp-all" class="sh-qbtn">All Time</button>
    <div style="width:1px;height:20px;background:rgba(255,255,255,0.08);margin:0 4px"></div>
    <input type="date" id="amz-from" value="2026-04-01" min="2026-04-01" max="${dateStr}" onchange="renderAmazon()" style="background:rgba(15,23,42,0.8);border:1px solid rgba(255,255,255,0.1);border-radius:7px;padding:4px 8px;color:#94a3b8;font-size:12px">
    <span style="color:#475569;font-size:12px">→</span>
    <input type="date" id="amz-to" value="${dateStr}" min="2026-04-01" max="${dateStr}" onchange="renderAmazon()" style="background:rgba(15,23,42,0.8);border:1px solid rgba(255,255,255,0.1);border-radius:7px;padding:4px 8px;color:#94a3b8;font-size:12px">
  </div>

  <!-- KPI Cards real data reactive -->
  <div id="amz-kpi-section">
    <div style="font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px">💰 Ad Performance — <span id="amz-period-label">${historyStart} → ${dateStr}</span></div>
    <div class="kpi-grid g6" style="margin-bottom:14px">
      <div class="kcard green"><div class="k-lbl">Ad Revenue</div><div class="k-val" id="amz-revenue">₹${parseInt((amazonData||{}).totalRevenue||0).toLocaleString('en-IN')}</div></div>
      <div class="kcard"><div class="k-lbl">Ad Spend</div><div class="k-val" id="amz-spend">₹${parseInt((amazonData||{}).totalSpend||0).toLocaleString('en-IN')}</div></div>
      <div class="kcard amber"><div class="k-lbl">ROAS</div><div class="k-val" id="amz-roas">${((amazonData||{}).totalRoas||0).toFixed(2)}x</div></div>
      <div class="kcard purple"><div class="k-lbl">Orders</div><div class="k-val" id="amz-orders">${(amazonData||{}).totalOrders||0}</div></div>
      <div class="kcard"><div class="k-lbl">ACOS</div><div class="k-val" id="amz-acos">${(amazonData||{}).totalRevenue>0?((amazonData||{}).totalSpend/(amazonData||{}).totalRevenue*100).toFixed(1):0}%</div><div class="k-meta"><span class="k-sub">Ad Cost of Sales</span></div></div>
      <div class="kcard"><div class="k-lbl">Clicks</div><div class="k-val" id="amz-clicks">${parseInt(Object.values((amazonData||{}).allDailyAmzn||{}).reduce((s,d)=>s+(d.clicks||0),0)).toLocaleString('en-IN')}</div></div>
    </div>
    <div class="kpi-grid g4" style="margin-bottom:18px">
      <div class="kcard"><div class="k-lbl">Impressions</div><div class="k-val" id="amz-impr">${parseInt(Object.values((amazonData||{}).allDailyAmzn||{}).reduce((s,d)=>s+(d.impressions||0),0)).toLocaleString('en-IN')}</div></div>
      <div class="kcard"><div class="k-lbl">CTR</div><div class="k-val" id="amz-ctr">—</div></div>
      <div class="kcard"><div class="k-lbl">CPC</div><div class="k-val" id="amz-cpc">—</div></div>
      <div class="kcard"><div class="k-lbl">CPA</div><div class="k-val" id="amz-cpa">—</div></div>
    </div>
  </div>

  <!-- Campaign Table -->
  <div class="tcard" style="margin-bottom:18px">
    <div class="ttop"><div class="ttitle">📋 Campaign Performance</div><div class="t-meta" id="amz-camp-meta">Sponsored Products · ${dateStr}</div></div>
    <div class="tscroll"><table><thead><tr><th>#</th><th>Campaign</th><th>Spend</th><th>Revenue</th><th>ROAS</th><th>Orders</th><th>ACOS</th><th>Clicks</th><th>Impressions</th></tr></thead>
    <tbody id="amz-camp-tbody">${((amazonData||{}).campaigns||[]).slice(0,20).map((camp,i)=>{
      const acos = camp.revenue>0?(camp.spend/camp.revenue*100).toFixed(1)+'%':'—';
      const roas = camp.roas>0?camp.roas.toFixed(2)+'x':'—';
      const rc = camp.roas>=4?'badge-green':camp.roas>=2?'badge-blue':camp.roas>=1?'badge-amber':'badge-red';
      return '<tr><td class="cm">'+(i+1)+'</td><td style="font-weight:500">'+(camp.name||'').slice(0,35)+'</td><td>₹'+parseInt(camp.spend).toLocaleString('en-IN')+'</td><td>₹'+parseInt(camp.revenue).toLocaleString('en-IN')+'</td><td><span class="badge '+rc+'">'+roas+'</span></td><td>'+camp.orders+'</td><td>'+acos+'</td><td>'+parseInt(camp.clicks).toLocaleString('en-IN')+'</td><td>'+parseInt(camp.impressions).toLocaleString('en-IN')+'</td></tr>';
    }).join('')||'<tr><td colspan="9" style="text-align:center;color:var(--t2);padding:16px">No campaign data yet</td></tr>'}</tbody>
    </table></div>
  </div>

  <!-- Charts placeholder -->
  <div class="cg2" style="margin-bottom:14px">
    <div class="cc"><div class="cc-head"><div class="cc-title">📈 Daily ROAS Trend</div></div><div class="cw" style="height:200px"><canvas id="chartAmzRoas"></canvas></div></div>
    <div class="cc"><div class="cc-head"><div class="cc-title">💰 Spend vs Revenue Daily</div></div><div class="cw" style="height:200px"><canvas id="chartAmzSpend"></canvas></div></div>
  </div>

  ${(amazonData||{}).connected ? "" : `<!-- Connection guide -->
  <div style="background:linear-gradient(135deg,rgba(245,158,11,0.06),rgba(239,68,68,0.04));border:1px solid rgba(245,158,11,0.15);border-radius:14px;padding:24px 28px;margin-top:8px">
    <div style="font-size:15px;font-weight:700;color:#fbbf24;margin-bottom:12px">🔗 Connect Amazon Ads in 4 Steps</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px">
      <div style="background:rgba(30,41,59,0.5);border-radius:10px;padding:14px"><div style="font-size:20px;margin-bottom:6px">1️⃣</div><div style="font-size:13px;font-weight:600;color:#e2e8f0;margin-bottom:4px">Create App</div><div style="font-size:12px;color:#64748b">Go to advertising.amazon.com → Tools → API Access → Create Application</div></div>
      <div style="background:rgba(30,41,59,0.5);border-radius:10px;padding:14px"><div style="font-size:20px;margin-bottom:6px">2️⃣</div><div style="font-size:13px;font-weight:600;color:#e2e8f0;margin-bottom:4px">Get Credentials</div><div style="font-size:12px;color:#64748b">Copy Client ID, Client Secret, and complete OAuth to get Refresh Token</div></div>
      <div style="background:rgba(30,41,59,0.5);border-radius:10px;padding:14px"><div style="font-size:20px;margin-bottom:6px">3️⃣</div><div style="font-size:13px;font-weight:600;color:#e2e8f0;margin-bottom:4px">Find Profile ID</div><div style="font-size:12px;color:#64748b">Call GET /v2/profiles to find your brand's Profile ID</div></div>
      <div style="background:rgba(30,41,59,0.5);border-radius:10px;padding:14px"><div style="font-size:20px;margin-bottom:6px">4️⃣</div><div style="font-size:13px;font-weight:600;color:#e2e8f0;margin-bottom:4px">Add to config.env</div><div style="font-size:12px;color:#64748b">AMAZON_CLIENT_ID, AMAZON_CLIENT_SECRET, AMAZON_REFRESH_TOKEN, AMAZON_PROFILE_ID</div></div>
    </div>
  </div>

</div>
`}
</div>
<!-- ═══ END AMAZON PLATFORM ══════════════════════════════════════════════════ -->

<!-- ═══ OVERALL PLATFORM ══════════════════════════════════════════════════════ -->
<div class="platform-content" id="platform-overall">
<div style="background:rgba(15,23,42,0.6);min-height:100vh;padding:22px 28px">

  <!-- Header -->
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px">
    <div>
      <h2 style="font-size:22px;font-weight:800;color:#f8fafc;margin-bottom:3px">🌐 Overall Performance — All Channels</h2>
      <div style="font-size:13px;color:#64748b" id="ov-period-label">Combined Meta Ads + Shopify · ${dateStr}</div>
    </div>
  </div>

  <!-- Date filter bar -->
  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:18px;background:rgba(30,41,59,0.5);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:10px 14px">
    <span style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:1px;margin-right:4px">Period:</span>
    <button onclick="ovSetPreset('today')" id="ovp-today" class="sh-qbtn">Today</button>
    <button onclick="ovSetPreset('7d')" id="ovp-7d" class="sh-qbtn">7 Days</button>
    <button onclick="ovSetPreset('14d')" id="ovp-14d" class="sh-qbtn">14 Days</button>
    <button onclick="ovSetPreset('mtd')" id="ovp-mtd" class="sh-qbtn active">MTD Apr</button>
    <button onclick="ovSetPreset('all')" id="ovp-all" class="sh-qbtn">All Time</button>
    <div style="width:1px;height:20px;background:rgba(255,255,255,0.08);margin:0 4px"></div>
    <input type="date" id="ov-from" value="2026-04-01" min="2026-04-01" max="${dateStr}" onchange="renderOverall()" style="background:rgba(15,23,42,0.8);border:1px solid rgba(255,255,255,0.1);border-radius:7px;padding:4px 8px;color:#94a3b8;font-size:12px">
    <span style="color:#475569;font-size:12px">→</span>
    <input type="date" id="ov-to" value="${dateStr}" min="2026-04-01" max="${dateStr}" onchange="renderOverall()" style="background:rgba(15,23,42,0.8);border:1px solid rgba(255,255,255,0.1);border-radius:7px;padding:4px 8px;color:#94a3b8;font-size:12px">
    <span style="font-size:12px;color:#475569;margin-left:6px" id="ov-day-count"></span>
  </div>

  <!-- Dynamic overall KPIs + charts -->
  <div id="ov-kpi-section"></div>

  <!-- Charts -->
  <div class="cg2" style="margin-bottom:14px">
    <div class="cc"><div class="cc-head"><div class="cc-title">📊 Daily Meta Spend vs Shopify GMV</div></div><div class="cw" style="height:220px"><canvas id="chartOvSpendGmv"></canvas></div></div>
    <div class="cc"><div class="cc-head"><div class="cc-title">📈 Blended ROAS Trend (Shopify GMV ÷ Meta Spend)</div></div><div class="cw" style="height:220px"><canvas id="chartOvRoas"></canvas></div></div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:14px">
    <div class="cc"><div class="cc-head"><div class="cc-title">💰 Revenue by Channel</div></div><div class="cw" style="height:180px"><canvas id="chartOvChannel"></canvas></div></div>
    <div class="cc"><div class="cc-head"><div class="cc-title">📦 Orders by Channel</div></div><div class="cw" style="height:180px"><canvas id="chartOvOrders"></canvas></div></div>
    <div class="cc"><div class="cc-head"><div class="cc-title">💸 Spend Efficiency (CAC Trend)</div></div><div class="cw" style="height:180px"><canvas id="chartOvCac"></canvas></div></div>
  </div>

  <!-- Dynamic tables -->
  <div id="ov-tables-section"></div>

</div>
</div>
<!-- ═══ END OVERALL PLATFORM ═════════════════════════════════════════════════ -->

<footer class="footer">
  <div class="footer-brand">${brandName} · RevNox Media Dashboard</div>
  <div>Period: ${historyStart} → ${dateStr} · ${now}</div>
</footer>

<script>
// ── DATA ──────────────────────────────────────────────────────────────────────
const ALL_DATA = ${JSON.stringify(allDailyData)};
const DATES_ASC = ${JSON.stringify(sortedDates)};
const DATES_DESC = [...DATES_ASC].reverse();
const LATEST = '${latestDate}';
const GENERATED_AT = ${Date.now()};

// ── STATE ─────────────────────────────────────────────────────────────────────
let currentView = 'overview';
let currentDate = LATEST;
let charts = {};

// ── HELPERS ───────────────────────────────────────────────────────────────────
const dollar = n => '₹' + parseInt(n||0).toLocaleString('en-IN');
const dollarD = n => '₹' + parseFloat(n||0).toFixed(2);
const pct = n => parseFloat(n||0).toFixed(1) + '%';
const roasStr = r => parseFloat(r||0)>0 ? parseFloat(r||0).toFixed(2)+'x' : '0x';
const fmt = n => parseInt(n||0).toLocaleString('en-IN');
const fmtD = (n,d=2) => parseFloat(n||0).toFixed(d);

function diff(curr, prev) {
  const c=parseFloat(curr||0), p=parseFloat(prev||0);
  if(!p||p===0) return {val:c>0?'+100%':'—',pos:c>0,neutral:c===0};
  const v=((c-p)/p*100);
  return {val:(v>=0?'+':'')+v.toFixed(1)+'%', pos:v>=0, neutral:false};
}

function roasCls(r) { return r>=2?'badge-green':r>=1?'badge-amber':'badge-red'; }

// ── GRADIENT HELPER (FIXED) ───────────────────────────────────────────────────
function hexGrad(ctx, hex, a1=0.25, a2=0) {
  const g = ctx.createLinearGradient(0,0,0,ctx.canvas.height||280);
  const h = hex.startsWith('#') ? hex : '#' + hex;
  const r=parseInt(h.slice(1,3),16),gv=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);
  g.addColorStop(0,\`rgba(\${r},\${gv},\${b},\${a1})\`);
  g.addColorStop(1,\`rgba(\${r},\${gv},\${b},\${a2})\`);
  return g;
}

// ── PLATFORM SWITCH ───────────────────────────────────────────────────────────
let currentPlatform = 'meta';
function switchPlatform(p) {
  currentPlatform = p;
  // Hide all platform content
  document.querySelectorAll('.platform-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.ptab').forEach(el => el.classList.remove('active'));
  // Show selected
  const content = document.getElementById('platform-' + p);
  if(content) content.classList.add('active');
  const tab = document.getElementById('ptab-' + p);
  if(tab) tab.classList.add('active');
  // Re-init charts when switching tabs (canvases not visible until now)
  if(p === 'shopify') {
    setTimeout(function(){
      initShopifyChart(); // hourly (today only, static)
      // renderShopify was already called on page load via shSetPreset('mtd')
      // but charts need re-render since canvas wasn't visible
      const f=document.getElementById('sh-from')?.value||'2026-04-01';
      const t=document.getElementById('sh-to')?.value||'${dateStr}';
      renderShopify(f,t);
    }, 50);
  }
  if(p === 'amazon') { setTimeout(renderAmazon, 50); }
  if(p === 'overall') {
    setTimeout(function(){
      const f=document.getElementById('ov-from')?.value||'2026-04-01';
      const t=document.getElementById('ov-to')?.value||'${dateStr}';
      renderOverall(f,t);
    }, 50);
  }
  // Preserve URL hash for bookmarking
  history.replaceState(null, '', '#' + p);
}
// Restore platform from URL hash on load
(function(){
  const hash = location.hash.replace('#','');
  if(['meta','shopify','amazon','overall'].includes(hash)) switchPlatform(hash);
})();

// ── VIEW SWITCH ───────────────────────────────────────────────────────────────
function switchView(view, date) {
  currentView = view;
  if(date) currentDate = date;
  const body = document.getElementById('bodyEl');
  body.className = view === 'overview' ? 'view-overview' : 'view-day';
  const dp = document.querySelector('.date-wrap.day-only');
  if(dp) dp.style.display = view==='day' ? 'flex' : 'none';
  document.querySelectorAll('.sb-link.overview-only').forEach(l=>l.style.display=view==='overview'?'':'none');
  document.querySelectorAll('.sb-link.day-only').forEach(l=>l.style.display=view==='day'?'':'none');
  if(view==='day') {
    const dp2 = document.getElementById('datePicker');
    if(dp2) dp2.value = currentDate;
    renderDayDetail(currentDate);
  } else {
    initOverviewCharts();
  }
  window.scrollTo({top:0,behavior:'smooth'});
}

function changeDate(d) {
  currentDate = d;
  renderDayDetail(d);
  window.scrollTo({top:54,behavior:'smooth'});
}

function goto(id) {
  const el = document.getElementById(id);
  if(el) el.scrollIntoView({behavior:'smooth'});
  document.querySelectorAll('.sb-link').forEach(l=>l.classList.remove('active'));
  if(event && event.currentTarget) event.currentTarget.classList.add('active');
}

// ── RENDER DAY DETAIL ─────────────────────────────────────────────────────────
function renderDayDetail(date) {
  const d = ALL_DATA[date];
  if(!d) return;
  const a = d.account;

  document.getElementById('kpiSubTitle').textContent = date + ' metrics';
  document.getElementById('campDayLabel').textContent = date + ' campaign data';

  // Update KPIs
  document.getElementById('kv-spend').textContent = dollar(a.spend);
  document.getElementById('kv-rev').textContent = dollar(a.revenue);
  document.getElementById('kv-roas').textContent = roasStr(a.roas);
  document.getElementById('kv-buys').textContent = a.purchases;
  document.getElementById('kv-aov').textContent = dollarD(a.purchases > 0 ? a.revenue / a.purchases : 0);
  document.getElementById('kv-cpa').textContent = dollarD(a.cpa);
  document.getElementById('kv-ctr').textContent = pct(a.ctr);
  document.getElementById('kv-cpc').textContent = dollarD(a.cpc);
  document.getElementById('kv-freq').textContent = fmtD(a.freq);
  document.getElementById('kv-impr').textContent = fmt(a.impressions);

  document.getElementById('kv-roas').style.color = a.roas>=2?'var(--g)':a.roas>=1?'var(--a)':'var(--r)';
  document.getElementById('kv-ctr').style.color = a.ctr>=1.5?'var(--g)':a.ctr>=0.8?'var(--a)':'var(--r)';
  document.getElementById('kv-freq').style.color = a.freq>3.5?'var(--r)':a.freq>2.5?'var(--a)':'var(--t)';

  // Update Funnel
  document.getElementById('fv-impr').textContent = fmt(a.impressions);
  document.getElementById('fv-clicks').textContent = fmt(a.clicks);
  document.getElementById('fv-lpv').textContent = fmt(a.lpv);
  document.getElementById('fv-atc').textContent = fmt(a.atc);
  document.getElementById('fv-checkout').textContent = fmt(a.checkout);
  document.getElementById('fv-buys2').textContent = a.purchases;

  const ctrRate = a.fCtr || 0;
  const lpvRate = a.fLpv || 0;
  const atcRate = a.fAtc || 0;
  const checkoutRate = a.fCheckout || 0;
  const purchaseRate = a.fPurchase || 0;

  document.getElementById('fr-ctr').textContent = pct(ctrRate);
  document.getElementById('fr-lpv').textContent = pct(lpvRate);
  document.getElementById('fr-atc').textContent = pct(atcRate);
  document.getElementById('fr-checkout').textContent = pct(checkoutRate);
  document.getElementById('fr-pur').textContent = pct(purchaseRate);

  [['fb-ctr', ctrRate, 1.5, 0.8], ['fb-lpv', lpvRate, 70, 50], ['fb-atc', atcRate, 5, 2], ['fb-checkout', checkoutRate, 60, 30], ['fb-pur', purchaseRate, 60, 30]].forEach(x => {
    const el = document.getElementById(x[0]);
    const rate = x[1];
    el.style.width = Math.min(rate / (x[2] * 2) * 100, 100) + '%';
    el.style.background = rate >= x[2] ? 'var(--g)' : rate >= x[3] ? 'var(--a)' : 'var(--r)';
  });

  // Update Campaigns
  const dayCamps = (d.campaigns||[]).sort((a,b)=>b.spend-a.spend).slice(0, 8);
  const cNames = dayCamps.map(c=>c.name.length>24?c.name.slice(0,24)+'…':c.name);
  const cRoas  = dayCamps.map(c=>parseFloat(c.roas||0).toFixed(2));
  const cRevs  = dayCamps.map(c=>c.revenue);
  const cSpends= dayCamps.map(c=>c.spend);
  const cColors= cRoas.map(r=>r>=2?'#10b981':r>=1?'#f59e0b':'#ef4444');
  const cBg    = cRoas.map(r=>r>=2?'rgba(16,185,129,0.7)':r>=1?'rgba(245,158,11,0.7)':'rgba(239,68,68,0.7)');

  if(charts.campRoas) charts.campRoas.destroy();
  const cr = document.getElementById('chartCampRoas').getContext('2d');
  window._chartCampRoas = charts.campRoas = new Chart(cr,{type:'bar',data:{labels:cNames,datasets:[{label:'ROAS',data:cRoas,backgroundColor:cBg,borderColor:cColors,borderWidth:1.5,borderRadius:4}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'#1e2d4a',padding:10,cornerRadius:8,callbacks:{label:c=>' '+parseFloat(c.raw).toFixed(2)+'x ROAS'}}},scales:{x:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{callback:v=>v+'x'}},y:{grid:{display:false},ticks:{font:{size:10},color:'#94a3b8'}}}}});

  if(charts.campRevSpend) charts.campRevSpend.destroy();
  const crv = document.getElementById('chartCampRevSpend').getContext('2d');
  window._chartCampRevSpend = charts.campRevSpend = new Chart(crv,{type:'bar',data:{labels:cNames,datasets:[{label:'Revenue',data:cRevs,backgroundColor:'rgba(16,185,129,0.7)',borderColor:'#10b981',borderWidth:1,borderRadius:4},{label:'Spend',data:cSpends,backgroundColor:'rgba(59,130,246,0.5)',borderColor:'#3b82f6',borderWidth:1,borderRadius:4}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,position:'top',labels:{usePointStyle:true,padding:12,color:'#94a3b8',font:{size:10}}},tooltip:{backgroundColor:'#1e2d4a',padding:10,cornerRadius:8,callbacks:{label:c=>' ₹'+parseInt(c.raw).toLocaleString('en-IN')}}},scales:{x:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{callback:v=>'₹'+(v>=100000?(v/100000).toFixed(0)+'L':v>=1000?(v/1000).toFixed(0)+'K':v),color:'#94a3b8'}},y:{grid:{display:false},ticks:{font:{size:10},color:'#94a3b8'}}}}});

  // Top ads
  const topAds = (window.topAdsData || []).sort((a,b)=>parseFloat(b.spend||0)-parseFloat(a.spend||0)).slice(0, 8);
  if(topAds.length > 0) {
    if(charts.adRoas) charts.adRoas.destroy();
    const ar = document.getElementById('chartAdRoas').getContext('2d');
    const adNames = topAds.map(a=>(a.ad_name||'Ad').slice(0,20));
    const adRoas = topAds.map(a=>{
      const avArr = a.action_values || [];
      const p = Array.isArray(avArr) ? avArr.find(x=>x.action_type==='purchase') : null;
      const rev = parseFloat(p ? p.value : 0);
      const sp = parseFloat(a.spend || 0);
      return sp>0&&rev>0 ? rev/sp : 0;
    });
    const adColors = adRoas.map(r=>r>=2?'#10b981':r>=1?'#f59e0b':'#ef4444');
    charts.adRoas = new Chart(ar,{type:'bar',data:{labels:adNames,datasets:[{label:'ROAS',data:adRoas.map(r=>r.toFixed(2)),backgroundColor:adColors,borderWidth:0,borderRadius:4}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>' '+c.raw+'x'}}},scales:{x:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{callback:v=>v+'x'}},y:{grid:{display:false}}}}});

    if(charts.adFreq) charts.adFreq.destroy();
    const af = document.getElementById('chartAdFreq').getContext('2d');
    const freqs = topAds.map(a=>parseFloat(a.frequency||0));
    const freqColors = freqs.map(f=>f>4?'#ef4444':f>3?'#f59e0b':'#10b981');
    charts.adFreq = new Chart(af,{type:'bar',data:{labels:adNames,datasets:[{label:'Frequency',data:freqs.map(f=>f.toFixed(2)),backgroundColor:freqColors,borderWidth:0,borderRadius:4}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>' '+c.raw+'x'}}},scales:{x:{grid:{color:'rgba(255,255,255,0.04)'}},y:{grid:{display:false}}}}});
  }
}

// ── OVERVIEW CHARTS ───────────────────────────────────────────────────────────
function initOverviewCharts() {
  Chart.defaults.color = '#94a3b8';
  Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
  Chart.defaults.font.family = "'Segoe UI',system-ui,sans-serif";
  Chart.defaults.font.size = 11;

  const BLUE='#3b82f6',GREEN='#10b981',AMBER='#f59e0b',RED='#ef4444',IND='#6366f1';
  const tDates  = ${JSON.stringify(ovDates)};
  const tSpend  = ${JSON.stringify(ovSpend)};
  const tRev    = ${JSON.stringify(ovRevenue)};
  const tRoas   = ${JSON.stringify(ovRoas)};
  const tBuys   = ${JSON.stringify(ovPurchases)};

  // Spend vs Revenue
  if(charts.ovSpendRev) charts.ovSpendRev.destroy();
  const c1 = document.getElementById('ovSpendRev').getContext('2d');
  charts.ovSpendRev = new Chart(c1,{type:'line',data:{labels:tDates,datasets:[
    {label:'Spend',data:tSpend,borderColor:BLUE,backgroundColor:hexGrad(c1,BLUE,0.2),fill:true,tension:0.4,pointRadius:2,borderWidth:2,pointHoverRadius:5},
    {label:'Revenue',data:tRev,borderColor:GREEN,backgroundColor:hexGrad(c1,GREEN,0.15),fill:true,tension:0.4,pointRadius:2,borderWidth:2,pointHoverRadius:5}
  ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,position:'top',labels:{usePointStyle:true,padding:14,color:'#94a3b8'}},tooltip:{backgroundColor:'#1e2d4a',borderColor:'rgba(59,130,246,0.3)',borderWidth:1,padding:10,cornerRadius:8,callbacks:{label:c=>' ₹'+parseInt(c.raw||0).toLocaleString('en-IN')}}},scales:{x:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{maxTicksLimit:10}},y:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{callback:v=>'₹'+(v>=100000?(v/100000).toFixed(1)+'L':v>=1000?(v/1000).toFixed(0)+'K':v)}}}}});

  // ROAS
  if(charts.ovRoas) charts.ovRoas.destroy();
  const c2 = document.getElementById('ovRoas').getContext('2d');
  charts.ovRoas = new Chart(c2,{type:'line',data:{labels:tDates,datasets:[{label:'ROAS',data:tRoas,borderColor:AMBER,backgroundColor:hexGrad(c2,AMBER,0.2),fill:true,tension:0.4,pointRadius:2,borderWidth:2,pointHoverRadius:5}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'#1e2d4a',padding:10,cornerRadius:8,callbacks:{label:c=>' '+parseFloat(c.raw).toFixed(2)+'x'}}},scales:{x:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{maxTicksLimit:10}},y:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{callback:v=>v+'x'}}}}});

  // Purchases
  if(charts.ovPurch) charts.ovPurch.destroy();
  charts.ovPurch = new Chart(document.getElementById('ovPurchases'),{type:'bar',data:{labels:tDates,datasets:[{label:'Purchases',data:tBuys,backgroundColor:IND+'99',borderColor:IND,borderWidth:1,borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'#1e2d4a',padding:10,cornerRadius:8,callbacks:{label:c=>' '+c.raw+' purchases'}}},scales:{x:{grid:{display:false},ticks:{maxTicksLimit:10}},y:{grid:{color:'rgba(255,255,255,0.04)'}}}}});

  // Weekly charts
  initWeeklyCharts();

  // Hourly & Device charts
  initStaticCharts();

  // Demo charts
  initDemoCharts();
}

// ── WEEKLY CHARTS ─────────────────────────────────────────────────────────────
function initWeeklyCharts() {
  const weeklyData = ${JSON.stringify(Array.from(Object.entries(weeklyMap)).map(([week, data]) => ({week, ...data})))};
  if(weeklyData.length === 0) return;

  const wLabels = weeklyData.map((w,i)=>\`Week \${i+1}\`);
  const wSpend = weeklyData.map(w=>w.spend);
  const wRev = weeklyData.map(w=>w.revenue);
  const wRoas = weeklyData.map(w=>w.spend>0&&w.revenue>0?w.revenue/w.spend:0);

  if(charts.weeklySpend) charts.weeklySpend.destroy();
  charts.weeklySpend = new Chart(document.getElementById('weeklySpend'),{type:'bar',data:{labels:wLabels,datasets:[
    {label:'Spend',data:wSpend,backgroundColor:'rgba(59,130,246,0.7)',borderColor:'#3b82f6',borderWidth:1,borderRadius:4},
    {label:'Revenue',data:wRev,backgroundColor:'rgba(16,185,129,0.7)',borderColor:'#10b981',borderWidth:1,borderRadius:4}
  ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,position:'top',labels:{usePointStyle:true,padding:12,color:'#94a3b8',font:{size:10}}}},scales:{x:{grid:{display:false}},y:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{callback:v=>'₹'+(v>=100000?(v/100000).toFixed(0)+'L':v>=1000?(v/1000).toFixed(0)+'K':v)}}}}});

  if(charts.weeklyRoas) charts.weeklyRoas.destroy();
  charts.weeklyRoas = new Chart(document.getElementById('weeklyRoas'),{type:'line',data:{labels:wLabels,datasets:[{label:'Weekly ROAS',data:wRoas.map(r=>r.toFixed(2)),borderColor:'#f59e0b',backgroundColor:'rgba(245,158,11,0.15)',fill:true,tension:0.4,pointRadius:3,borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{color:'rgba(255,255,255,0.04)'}},y:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{callback:v=>v+'x'}}}}});
}

// ── HOURLY + DEVICE + DEMO CHARTS ──────────────────────────────────────────────
function initStaticCharts() {
  Chart.defaults.color = '#94a3b8';
  Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
  Chart.defaults.font.family = "'Segoe UI',system-ui,sans-serif";
  Chart.defaults.font.size = 11;
  const BLUE='#3b82f6',GREEN='#10b981',PALETTE=['#3b82f6','#10b981','#f59e0b','#ef4444','#6366f1','#8b5cf6','#06b6d4','#f97316'];

  const hLabels     = ${JSON.stringify(hourlyLabels)};
  const hSpend      = ${JSON.stringify(hourlySpend)};
  const hRevenue    = ${JSON.stringify(hourlyRevenue)};
  const hRoasArr    = ${JSON.stringify(hourlyRoasData)};
  const hWklySpend  = ${JSON.stringify(weeklyHourlySpend)};
  const hWklyRev    = ${JSON.stringify(weeklyHourlyRevenue)};
  const dLabels = ${JSON.stringify(devLabels)};
  const dSpends = ${JSON.stringify(devSpends)};
  const platformLabels = ${JSON.stringify(platformLabels)};
  const platformSpends = ${JSON.stringify(platformSpends)};
  const demoLabels = ${JSON.stringify(demoLabels)};
  const demoRoas = ${JSON.stringify(demoRoas)};
  const demoSpends = ${JSON.stringify(demoSpend)};

  // Hourly Spend + Revenue bars + 7-day avg dashed lines
  if(charts.hourly) charts.hourly.destroy();
  charts.hourly = new Chart(document.getElementById('chartHourly'),{type:'bar',data:{labels:hLabels,datasets:[
    {label:'Today Spend',data:hSpend,backgroundColor:'rgba(59,130,246,0.75)',borderRadius:3,borderWidth:0,order:4},
    {label:'Today Revenue',data:hRevenue,backgroundColor:'rgba(16,185,129,0.75)',borderRadius:3,borderWidth:0,order:3},
    {label:'7D Avg Spend',data:hWklySpend,type:'line',borderColor:'rgba(99,102,241,0.9)',borderDash:[5,3],backgroundColor:'transparent',borderWidth:2,pointRadius:0,tension:0.4,order:1},
    {label:'7D Avg Revenue',data:hWklyRev,type:'line',borderColor:'rgba(52,211,153,0.7)',borderDash:[5,3],backgroundColor:'transparent',borderWidth:2,pointRadius:0,tension:0.4,order:0},
  ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,position:'top',labels:{usePointStyle:true,padding:12,font:{size:10}}},tooltip:{backgroundColor:'#1e2d4a',padding:10,cornerRadius:8,mode:'index',intersect:false,callbacks:{label:c=>' ₹'+parseInt(c.raw||0).toLocaleString('en-IN')}}},scales:{x:{grid:{display:false},ticks:{maxTicksLimit:12,font:{size:9}}},y:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{callback:v=>'₹'+(v>=100000?(v/100000).toFixed(1)+'L':v>=1000?(v/1000).toFixed(0)+'K':v),font:{size:9}}}}}});

  // Hourly ROAS — today line + 7-day avg reference line
  if(charts.hourlyRoas) charts.hourlyRoas.destroy();
  const wklyRoasArr = hWklySpend.map((s,i)=>s>0&&hWklyRev[i]>0?parseFloat((hWklyRev[i]/s).toFixed(2)):null);
  charts.hourlyRoas = new Chart(document.getElementById('chartHourlyRoas'),{type:'line',data:{labels:hLabels,datasets:[
    {label:'Today ROAS',data:hRoasArr,borderColor:'#f59e0b',backgroundColor:'rgba(245,158,11,0.12)',fill:true,tension:0.4,pointRadius:3,pointBackgroundColor:hRoasArr.map(r=>r>=2?'#10b981':r>=1?'#f59e0b':'#ef4444'),borderWidth:2},
    {label:'7D Avg ROAS',data:wklyRoasArr,borderColor:'rgba(148,163,184,0.6)',borderDash:[5,4],backgroundColor:'transparent',borderWidth:1.5,pointRadius:0,tension:0.4,spanGaps:true}
  ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,position:'top',labels:{usePointStyle:true,padding:12,font:{size:10}}},tooltip:{mode:'index',intersect:false,callbacks:{label:c=>c.raw===null?null:' '+parseFloat(c.raw).toFixed(2)+'x'}}},scales:{x:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{maxTicksLimit:12,font:{size:9}}},y:{beginAtZero:true,grid:{color:'rgba(255,255,255,0.04)'},ticks:{callback:v=>v+'x',font:{size:9}}}}}});

  // Device
  if(charts.device) charts.device.destroy();
  charts.device = new Chart(document.getElementById('chartDevice'),{type:'doughnut',data:{labels:dLabels.length?dLabels:['No data'],datasets:[{data:dSpends.length?dSpends:[1],backgroundColor:PALETTE.slice(0,dLabels.length||1),borderWidth:0,hoverOffset:8}]},options:{responsive:true,maintainAspectRatio:false,cutout:'66%',plugins:{legend:{position:'right',labels:{usePointStyle:true,padding:10,font:{size:10}}},tooltip:{backgroundColor:'#1e2d4a',padding:10,cornerRadius:8,callbacks:{label:c=>' ₹'+parseInt(c.raw).toLocaleString('en-IN')}}}}});

  // Platform
  if(charts.platform) charts.platform.destroy();
  charts.platform = new Chart(document.getElementById('chartPlatform'),{type:'doughnut',data:{labels:platformLabels.length?platformLabels:['No data'],datasets:[{data:platformSpends.length?platformSpends:[1],backgroundColor:PALETTE.slice(0,platformLabels.length||1),borderWidth:0,hoverOffset:8}]},options:{responsive:true,maintainAspectRatio:false,cutout:'66%',plugins:{legend:{position:'right',labels:{usePointStyle:true,padding:10,font:{size:10}}},tooltip:{backgroundColor:'#1e2d4a',padding:10,cornerRadius:8,callbacks:{label:c=>' ₹'+parseInt(c.raw).toLocaleString('en-IN')}}}}});
}

// ── DEMO CHARTS ───────────────────────────────────────────────────────────────
function initDemoCharts() {
  const demoLabels = ${JSON.stringify(demoLabels)};
  const demoRoas = ${JSON.stringify(demoRoas)};
  const demoSpends = ${JSON.stringify(demoSpend)};

  if(demoLabels.length === 0) return;

  if(charts.demoRoas) charts.demoRoas.destroy();
  const demoColors = demoRoas.map(r=>r>=2?'#10b981':r>=1?'#f59e0b':'#ef4444');
  window._chartDemoRoas = charts.demoRoas = new Chart(document.getElementById('chartDemoRoas'),{type:'bar',data:{labels:demoLabels,datasets:[{label:'ROAS',data:demoRoas.map(r=>r.toFixed(2)),backgroundColor:demoColors,borderWidth:0,borderRadius:4}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>' '+c.raw+'x'}}},scales:{x:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{callback:v=>v+'x'}},y:{grid:{display:false},ticks:{font:{size:10}}}}}});

  if(charts.demoSpend) charts.demoSpend.destroy();
  window._chartDemoSpend = charts.demoSpend = new Chart(document.getElementById('chartDemoSpend'),{type:'bar',data:{labels:demoLabels,datasets:[{label:'Spend',data:demoSpends,backgroundColor:'rgba(59,130,246,0.8)',borderColor:'#3b82f6',borderWidth:0,borderRadius:4}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>' ₹'+parseInt(c.raw).toLocaleString('en-IN')}}},scales:{x:{beginAtZero:true,grid:{color:'rgba(255,255,255,0.04)'},ticks:{callback:v=>'₹'+(v>=100000?(v/100000).toFixed(1)+'L':v>=1000?(v/1000).toFixed(0)+'K':v)}},y:{grid:{display:false},ticks:{font:{size:10}}}}}});
}

// ── LIVE TIMER ─────────────────────────────────────────────────────────────────
function updateTimer() {
  const elapsed = Math.floor((Date.now() - GENERATED_AT) / 60000);
  const el = document.getElementById('liveTimer');
  if(!el) return;
  // Show "as of HH:MM IST" from GENERATED_AT
  const ist = new Date(GENERATED_AT + 5.5*60*60*1000);
  const hh = ist.getUTCHours().toString().padStart(2,'0');
  const mm = ist.getUTCMinutes().toString().padStart(2,'0');
  const asOf = hh+':'+mm+' IST';
  if(elapsed < 1) el.textContent = '🟢 Live · as of '+asOf;
  else if(elapsed < 15) el.textContent = '🟡 '+elapsed+'m ago · as of '+asOf;
  else el.textContent = '🔴 '+elapsed+'m ago · as of '+asOf+' · refreshing soon';
}
setInterval(updateTimer, 10000);
updateTimer();

// ── AUTO RELOAD with cache-busting (forces fresh file from GitHub Pages CDN) ──
setTimeout(function(){
  const base = location.href.split('?')[0].split('#')[0];
  location.href = base + '?_t=' + Date.now();
}, 15 * 60 * 1000);

// ══════════════════════════════════════════════════════════════════════════════
// ── SHOPIFY INTERACTIVE DASHBOARD ────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
${shopifyData ? `
// ── Static data embedded at render time ──────────────────────────────────────
const _SH_DAILY   = ${JSON.stringify(sh.dailyTrend || [])};
const _SH_HOURLY  = ${JSON.stringify(sh.hourlyOrders || {})};
const _SH_BUCKETS = ${JSON.stringify(sh.orderValueBuckets || {})};
const _SH_PRODUCTS= ${JSON.stringify(sh.periodTopProducts || [])};
const _SH_STATES  = ${JSON.stringify(sh.periodTopStates || [])};
const _SH_CITIES  = ${JSON.stringify(sh.periodTopCities || [])};
const _SH_DISCOUNTS=${JSON.stringify(sh.periodTopDiscounts || [])};
const _SH_TODAY   = ${JSON.stringify({
  gmv:sh.gmv||0, orders:sh.orderCount||0, aov:sh.aov||0,
  netRev:sh.netRevenue||0, units:sh.totalUnits||0, discount:sh.totalDiscount||0,
  newCust:sh.newCustomers||0, retCust:sh.returningCustomers||0,
  cod:sh.codOrders||0, prepaid:sh.prepaidOrders||0,
  cancelled:sh.cancelledToday||0, fulfilled:sh.fulfilledOrders||0,
  pending:sh.pendingFulfillment||0, tax:sh.taxCollected||0, shipping:sh.shippingRevenue||0,
  freeShip:sh.freeShippingOrders||0, abandoned:sh.abandonedCount||0,
  abandonedVal:sh.abandonedValue||0, checkoutRate:sh.checkoutCompleteRate||0,
  discountRate:sh.discountRate||0, peakHour:sh.peakHour||null,
  prevGmv:sh.prevGmv||0, prevOrders:sh.prevCount||0, prevAov:sh.prevAov||0,
  gmvChange:sh.gmvChange||0, ordersChange:sh.ordersChange||0, aovChange:sh.aovChange||0,
})};
const _SH_META_SPEND_TODAY = ${yesterdaySpend};
const _SH_META_ROAS_TODAY  = ${accRoas};

// ── Date helpers ──────────────────────────────────────────────────────────────
const _SH_DATE_MAX = '${dateStr}';
const _SH_DATE_MIN = _SH_DAILY.length ? _SH_DAILY[0].date : '2026-04-01';

function shGetIST(offsetDays = 0) {
  const d = new Date(Date.now() + 5.5*3600000 - offsetDays*86400000);
  return d.toISOString().slice(0,10);
}

function shSetPreset(p) {
  const today = _SH_DATE_MAX;
  const map = {
    today:     [today, today],
    yesterday: [shGetIST(1), shGetIST(1)],
    '7d':      [shGetIST(6), today],
    '14d':     [shGetIST(13), today],
    mtd:       ['2026-04-01', today],
    all:       [_SH_DATE_MIN, today],
  };
  const [f, t] = map[p] || map.mtd;
  document.getElementById('sh-from').value = f;
  document.getElementById('sh-to').value   = t;
  document.querySelectorAll('[id^=shp-]').forEach(b=>b.classList.remove('active'));
  const btn = document.getElementById('shp-'+p);
  if(btn) btn.classList.add('active');
  renderShopify(f, t);
}

function shSetCustom() {
  const f = document.getElementById('sh-from').value;
  const t = document.getElementById('sh-to').value;
  document.querySelectorAll('[id^=shp-]').forEach(b=>b.classList.remove('active'));
  renderShopify(f, t);
}

// ── Core render function ──────────────────────────────────────────────────────
function renderShopify(from, to) {
  const days = _SH_DAILY.filter(d => d.date >= from && d.date <= to);
  const nDays = days.length || 1;

  // Sum all period fields
  const S = days.reduce((a, d) => ({
    gmv:       a.gmv      + (d.gmv||0),
    orders:    a.orders   + (d.orders||0),
    newCust:   a.newCust  + (d.newCust||0),
    retCust:   a.retCust  + (d.retCust||0),
    units:     a.units    + (d.units||0),
    discount:  a.discount + (d.discount||0),
    cod:       a.cod      + (d.cod||0),
    prepaid:   a.prepaid  + (d.prepaid||0),
    tax:       a.tax      + (d.tax||0),
    shipping:  a.shipping + (d.shipping||0),
    fulfilled: a.fulfilled+ (d.fulfilled||0),
    freeShip:  a.freeShip + (d.freeShip||0),
    cancelled: a.cancelled+ (d.cancelled||0),
  }), {gmv:0,orders:0,newCust:0,retCust:0,units:0,discount:0,cod:0,prepaid:0,tax:0,shipping:0,fulfilled:0,freeShip:0,cancelled:0});

  // Derived metrics
  const aov         = S.orders > 0 ? S.gmv / S.orders : 0;
  const netRev      = S.gmv - S.discount;
  const repeatRate  = S.orders > 0 ? S.retCust / S.orders * 100 : 0;
  const cancelRate  = (S.orders + S.cancelled) > 0 ? S.cancelled / (S.orders + S.cancelled) * 100 : 0;
  const codRate     = S.orders > 0 ? S.cod / S.orders * 100 : 0;
  const freeShipRate= S.orders > 0 ? S.freeShip / S.orders * 100 : 0;
  const discPct     = S.gmv > 0 ? S.discount / (S.gmv + S.discount) * 100 : 0;
  const fulfilRate  = S.orders > 0 ? S.fulfilled / S.orders * 100 : 0;
  const avgDaily    = S.gmv / nDays;
  const avgDailyOrd = S.orders / nDays;
  const unitsPerOrd = S.orders > 0 ? S.units / S.orders : 0;
  const revPerUnit  = S.units > 0 ? S.gmv / S.units : 0;
  const bestDay     = [...days].sort((a,b)=>b.gmv-a.gmv)[0];
  const worstDay    = [...days].filter(d=>d.orders>0).sort((a,b)=>a.gmv-b.gmv)[0];
  // First half vs second half GMV growth
  const half = Math.floor(days.length/2);
  const firstHalfGmv = days.slice(0,half).reduce((s,d)=>s+d.gmv,0);
  const secondHalfGmv = days.slice(half).reduce((s,d)=>s+d.gmv,0);
  const halfGrowth = firstHalfGmv > 0 ? (secondHalfGmv - firstHalfGmv) / firstHalfGmv * 100 : 0;
  // Weekend vs weekday
  let wkendGmv=0, wkdayGmv=0;
  days.forEach(d => { const dow = new Date(d.date).getDay(); (dow===0||dow===6)?wkendGmv+=d.gmv:wkdayGmv+=d.gmv; });

  // Update period label
  const lbl = document.getElementById('sh-period-label');
  if(lbl) lbl.textContent = from + ' → ' + to + ' · ' + nDays + ' days · 53 metrics · Updates every 5 min';
  const cnt = document.getElementById('sh-day-count');
  if(cnt) cnt.textContent = nDays + ' day' + (nDays!==1?'s':'');

  // ── True ROAS Banner — dynamic, updates with date filter ─────────────────
  const _metaSpend = _SH_META_SPEND_TODAY > 0 ? _SH_META_SPEND_TODAY * nDays : 0;
  const _trueRoas  = _metaSpend > 0 && S.gmv > 0 ? S.gmv / _metaSpend : 0;
  const _cac       = S.newCust > 0 ? _metaSpend / S.newCust : 0;
  const _pixelRoas = ${accRoas.toFixed(2)};
  const _roasColor = _trueRoas >= 2 ? '#10b981' : _trueRoas >= 1 ? '#f59e0b' : '#ef4444';
  const _bannerEl  = document.getElementById('sh-true-roas-banner');
  if(_bannerEl) _bannerEl.innerHTML = _trueRoas > 0 ? \`
    <div style="background:linear-gradient(135deg,rgba(16,185,129,0.1),rgba(99,102,241,0.08));border:1px solid rgba(16,185,129,0.2);border-radius:14px;padding:14px 20px;display:flex;align-items:center;gap:20px;flex-wrap:wrap">
      <div><div style="font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:3px">True ROAS (\${from===to?from:from+' → '+to})</div>
        <div style="font-size:26px;font-weight:800;color:\${_roasColor}">\${_trueRoas.toFixed(2)}x</div>
        <div style="font-size:11px;color:#64748b">Shopify GMV ÷ Meta Spend</div></div>
      <div style="width:1px;height:44px;background:rgba(255,255,255,0.07)"></div>
      <div><div style="font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">CAC (Period)</div>
        <div style="font-size:20px;font-weight:700;color:#e2e8f0">₹\${parseInt(_cac).toLocaleString('en-IN')}</div>
        <div style="font-size:11px;color:#64748b">\${S.newCust} new customers</div></div>
      <div style="width:1px;height:44px;background:rgba(255,255,255,0.07)"></div>
      <div style="font-size:12px;color:#64748b;line-height:1.9">
        Meta Spend (est): <strong style="color:#94a3b8">₹\${parseInt(_metaSpend).toLocaleString('en-IN')}</strong> &nbsp;·&nbsp;
        Shopify GMV: <strong style="color:#10b981">₹\${parseInt(S.gmv).toLocaleString('en-IN')}</strong><br>
        Pixel ROAS: <strong style="color:#94a3b8">\${_pixelRoas.toFixed(2)}x</strong> &nbsp;·&nbsp;
        Gap: <strong style="color:\${_trueRoas>_pixelRoas?'#10b981':'#ef4444'}">\${_trueRoas>_pixelRoas?'+':''}\${(_trueRoas-_pixelRoas).toFixed(2)}x</strong>
      </div>
    </div>\` : '';
  // ─────────────────────────────────────────────────────────────────────────

  // ── Render KPI cards ──────────────────────────────────────────────────────
  const kc = (lbl,val,sub,cls='')=>\`<div class="kcard \${cls}"><div class="k-lbl">\${lbl}</div><div class="k-val">\${val}</div><div class="k-meta"><span class="k-bench">\${sub}</span></div></div>\`;
  const kcs = (lbl,val,sub,cls='')=>\`<div class="kcard \${cls}"><div class="k-lbl">\${lbl}</div><div class="k-val" style="font-size:20px">\${val}</div><div class="k-meta"><span class="k-bench">\${sub}</span></div></div>\`;
  const pct2c = v => v>=0?'<span class="pos">▲'+Math.abs(v).toFixed(1)+'%</span>':'<span class="neg">▼'+Math.abs(v).toFixed(1)+'%</span>';
  const inr = v => '₹'+parseInt(v||0).toLocaleString('en-IN');
  const inrD = v => '₹'+parseFloat(v||0).toFixed(0).replace(/\\B(?=(\\d{3})+(?!\\d))/g,',');
  const pf = v => parseFloat(v||0).toFixed(1)+'%';

  const kpiHTML = \`
  <div style="font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px">💰 Revenue — \${from===to?from:from+' → '+to}</div>
  <div class="kpi-grid g6" style="margin-bottom:14px">
    \${kcs('Gross GMV',inr(S.gmv),nDays+' days · '+inr(avgDaily)+'/day','green')}
    \${kcs('Net Revenue',inr(netRev),'After '+inr(S.discount)+' discounts','')}
    \${kc('AOV',inr(aov),nDays>1?'Best: '+inr(bestDay?.gmv/Math.max(bestDay?.orders,1)||0):'—','purple')}
    \${kc('Total Orders',S.orders.toLocaleString(),parseFloat(avgDailyOrd.toFixed(1))+' orders/day','')}
    \${kc('Units Sold',S.units.toLocaleString(),unitsPerOrd.toFixed(1)+' per order · ₹'+parseInt(revPerUnit)+'/unit','')}
    \${kc('Tax + Shipping',inr(S.tax+S.shipping),'Tax: '+inr(S.tax)+' · Ship: '+inr(S.shipping),'')}
  </div>

  <div style="font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px">👥 Customers</div>
  <div class="kpi-grid g6" style="margin-bottom:14px">
    \${kc('New Customers',S.newCust,Math.round(S.newCust/nDays*10)/10+'/day avg','')}
    \${kc('Returning Customers',S.retCust,pf(repeatRate)+' repeat rate','')}
    \${kc('Repeat Rate',pf(repeatRate),S.retCust+' returning orders',repeatRate>30?'green':repeatRate>15?'amber':'')}
    \${kc('Unique Customers',(S.newCust+S.retCust).toLocaleString(),inr(S.gmv/Math.max(S.newCust+S.retCust,1))+' LTV avg','')}
    \${kc('CAC (Meta→New)',S.newCust>0?inr(_SH_META_SPEND_TODAY/S.newCust):'—','Meta spend / new cust. today','purple')}
    \${kc('Abandoned Carts (Today)',_SH_TODAY.abandoned,inr(_SH_TODAY.abandonedVal)+' at risk',_SH_TODAY.abandoned>10?'red':_SH_TODAY.abandoned>4?'amber':'')}
  </div>

  <div style="font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px">📦 Orders & Fulfilment</div>
  <div class="kpi-grid g6" style="margin-bottom:14px">
    \${kc('COD Orders',S.cod,pf(codRate)+' of all orders',S.cod>S.prepaid?'amber':'')}
    \${kc('Prepaid Orders',S.prepaid,pf(100-codRate)+' prepaid rate','green')}
    \${kc('Fulfilled',S.fulfilled,pf(fulfilRate)+' fulfil rate',fulfilRate>90?'green':fulfilRate>70?'amber':'red')}
    \${kc('Cancelled',S.cancelled,pf(cancelRate)+' cancel rate',cancelRate>5?'red':cancelRate>2?'amber':'')}
    \${kc('Free Shipping',S.freeShip,pf(freeShipRate)+' of orders','')}
    \${kc('Pending (Today)',_SH_TODAY.pending,_SH_TODAY.fulfilled+' fulfilled today',_SH_TODAY.pending>5?'orange':'')}
  </div>

  <div style="font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px">🛒 Discounts & Efficiency</div>
  <div class="kpi-grid g6" style="margin-bottom:14px">
    \${kc('Discount Given',inr(S.discount),pf(discPct)+' of gross GMV','amber')}
    \${kc('Avg Discount %',pf(discPct),inr(S.discount/Math.max(S.orders,1))+'/order avg','')}
    \${kc('Checkout Rate',pf(_SH_TODAY.checkoutRate),'Completed checkouts today','')}
    \${kc('Peak Hour (Today)',_SH_TODAY.peakHour?_SH_TODAY.peakHour.hour+':00 IST':'—',_SH_TODAY.peakHour?_SH_TODAY.peakHour.orders+' orders · '+inr(_SH_TODAY.peakHour.revenue):'—','')}
    \${kc('True ROAS (Today)',_SH_META_SPEND_TODAY>0?(S.gmv/_SH_META_SPEND_TODAY).toFixed(2)+'x':'—','Shopify GMV ÷ Meta Spend',S.gmv/_SH_META_SPEND_TODAY>=2?'green':S.gmv/_SH_META_SPEND_TODAY>=1?'amber':'red')}
    \${kc('Pixel ROAS (Today)',_SH_META_ROAS_TODAY.toFixed(2)+'x','Meta-attributed revenue','')}
  </div>

  <div style="font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px">📊 Period Intelligence</div>
  <div class="kpi-grid g6" style="margin-bottom:14px">
    \${kcs('Avg Daily GMV',inr(avgDaily),parseFloat(avgDailyOrd.toFixed(1))+' orders/day avg','green')}
    \${kcs('Best Day',bestDay?bestDay.date:'—',bestDay?inr(bestDay.gmv)+' · '+bestDay.orders+' orders':'—','green')}
    \${kcs('Worst Day',worstDay?worstDay.date:'—',worstDay?inr(worstDay.gmv)+' · '+worstDay.orders+' orders':'—','')}
    \${kc('Period Growth','2nd Half '+(halfGrowth>=0?'▲':'▼')+Math.abs(halfGrowth).toFixed(1)+'%','vs 1st half of period',halfGrowth>=0?'green':'red')}
    \${kc('Weekend GMV',inr(wkendGmv),pf(wkendGmv/(S.gmv||1)*100)+' of total','')}
    \${kc('Weekday GMV',inr(wkdayGmv),pf(wkdayGmv/(S.gmv||1)*100)+' of total','')}
  </div>
  \`;
  document.getElementById('sh-kpi-section').innerHTML = kpiHTML;

  // ── Render tables ──────────────────────────────────────────────────────────
  const thStyle = 'style="text-align:left;padding:8px 10px;font-weight:600;color:#64748b;font-size:12px;border-bottom:1px solid rgba(255,255,255,0.07);background:#0a1628;position:sticky;top:0"';
  const thR = 'style="text-align:right;padding:8px 10px;font-weight:600;color:#64748b;font-size:12px;border-bottom:1px solid rgba(255,255,255,0.07);background:#0a1628;position:sticky;top:0"';
  const trStyle = 'style="border-bottom:1px solid rgba(255,255,255,0.04)"';
  const td = v => \`<td style="padding:7px 10px;color:#e2e8f0;font-size:12px">\${v}</td>\`;
  const tdR = v => \`<td style="padding:7px 10px;text-align:right;color:#94a3b8;font-size:12px">\${v}</td>\`;
  const tdG = v => \`<td style="padding:7px 10px;text-align:right;color:#10b981;font-weight:600;font-size:12px">\${v}</td>\`;

  const prodRows = _SH_PRODUCTS.slice(0,15).map((p,i)=>\`
    <tr \${trStyle}>
      \${td(['🥇','🥈','🥉'][i]||(i+1)+'.')}
      \${td((p.title||'').slice(0,28)+((p.title||'').length>28?'…':''))}
      \${tdG(inr(p.revenue))}
      \${tdR(p.units+' units')}
      \${tdR(p.orders+' ord')}
      \${tdR(p.orders>0?inr(p.revenue/p.orders)+'/ord':'—')}
    </tr>\`).join('');

  const stateRows = _SH_STATES.slice(0,10).map(s=>\`
    <tr \${trStyle}>
      \${td(s.state||'Unknown')}
      \${tdR(s.orders)}
      \${tdG(inr(s.revenue))}
      \${tdR(inr(s.revenue/Math.max(s.orders,1)))}
    </tr>\`).join('');

  const cityRows = _SH_CITIES.slice(0,10).map(c=>\`
    <tr \${trStyle}>
      \${td(c.city||'Unknown')}
      \${tdR(c.orders)}
      \${tdG(inr(c.revenue))}
      \${tdR(inr(c.revenue/Math.max(c.orders,1)))}
    </tr>\`).join('');

  const discRows = _SH_DISCOUNTS.map(d=>\`
    <div style="background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.18);border-radius:10px;padding:12px 14px">
      <div style="font-size:13px;font-weight:700;color:#fbbf24;margin-bottom:5px">\${d.code}</div>
      <div style="font-size:12px;color:#94a3b8">\${d.uses} uses</div>
      <div style="font-size:13px;font-weight:600;color:#f59e0b">\${inr(d.amount)}</div>
    </div>\`).join('');

  document.getElementById('sh-tables-section').innerHTML = \`
  <div style="font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px">🏆 Products & Geography (Full Period)</div>
  <div class="cg2" style="margin-bottom:14px">
    <div class="cc">
      <div class="cc-head"><div class="cc-title">🏆 Top Products by Revenue</div></div>
      <div style="overflow:auto;max-height:340px">
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <th \${thStyle}>#</th><th \${thStyle}>Product</th>
            <th \${thR}>Revenue</th><th \${thR}>Units</th><th \${thR}>Orders</th><th \${thR}>Avg Ord</th>
          </tr>
          \${prodRows}
        </table>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="cc">
        <div class="cc-head"><div class="cc-title">🌍 Top States</div></div>
        <div style="overflow:auto;max-height:160px">
          <table style="width:100%;border-collapse:collapse">
            <tr><th \${thStyle}>State</th><th \${thR}>Orders</th><th \${thR}>Revenue</th><th \${thR}>AOV</th></tr>
            \${stateRows}
          </table>
        </div>
      </div>
      <div class="cc">
        <div class="cc-head"><div class="cc-title">🏙️ Top Cities</div></div>
        <div style="overflow:auto;max-height:160px">
          <table style="width:100%;border-collapse:collapse">
            <tr><th \${thStyle}>City</th><th \${thR}>Orders</th><th \${thR}>Revenue</th><th \${thR}>AOV</th></tr>
            \${cityRows}
          </table>
        </div>
      </div>
    </div>
  </div>
  \${_SH_DISCOUNTS.length > 0 ? \`
  <div class="cc" style="margin-bottom:14px">
    <div class="cc-head"><div class="cc-title">🏷️ Top Discount Codes — Full Period</div></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;padding:4px">\${discRows}</div>
  </div>\` : ''}
  \${_SH_TODAY.abandoned > 0 ? \`
  <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);border-radius:10px;padding:14px 18px;font-size:13px;color:#fca5a5;margin-bottom:8px">
    ⚠️ <strong>\${_SH_TODAY.abandoned} abandoned carts right now</strong> worth <strong>\${inr(_SH_TODAY.abandonedVal)}</strong> — send recovery flow immediately
  </div>\` : \`<div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:10px;padding:12px 18px;font-size:13px;color:#6ee7b7">✅ No abandoned carts right now</div>\`}
  \`;

  // ── Re-render trend + cumGmv + cust + cod charts with filtered data ────────
  _renderShopifyCharts(days, S);
}

// ── Chart instances ──────────────────────────────────────────────────────────
let _shChart=null, _shTrendChart=null, _shCumChart=null, _shCustChart=null,
    _shCodChart=null, _shBucketsChart=null, _shProductsChart=null;

function initShopifyChart(){
  const el = document.getElementById('chartShopifyHourly');
  if(!el) return;
  if(_shChart){ _shChart.destroy(); _shChart=null; }
  const labels = Array.from({length:24},(_,i)=>(i<12?(i||12)+'am':(i===12?'12pm':((i-12)+'pm'))));
  const orders = Array.from({length:24},(_,i)=>(_SH_HOURLY[i]||{}).orders||0);
  const revs   = Array.from({length:24},(_,i)=>(_SH_HOURLY[i]||{}).revenue||0);
  _shChart = new Chart(el,{type:'bar',data:{labels,datasets:[
    {label:'Orders',data:orders,backgroundColor:'rgba(139,92,246,0.75)',borderRadius:4,yAxisID:'yO'},
    {label:'Revenue',data:revs,type:'line',borderColor:'#10b981',backgroundColor:'rgba(16,185,129,0.1)',borderWidth:2,pointRadius:3,fill:true,tension:0.4,yAxisID:'yR'}
  ]},options:{responsive:true,maintainAspectRatio:false,
    plugins:{legend:{labels:{color:'#94a3b8',font:{size:11}}},tooltip:{callbacks:{label:c=>c.dataset.label==='Revenue'?' ₹'+parseInt(c.raw).toLocaleString('en-IN'):' '+c.raw+' orders'}}},
    scales:{yO:{position:'left',beginAtZero:true,ticks:{color:'#64748b',font:{size:10}},grid:{color:'rgba(255,255,255,0.04)'}},
      yR:{position:'right',beginAtZero:true,ticks:{color:'#64748b',font:{size:10},callback:v=>'₹'+(v>=1000?(v/1000).toFixed(0)+'K':v)},grid:{display:false}},
      x:{ticks:{color:'#64748b',font:{size:9}},grid:{display:false}}}}});
}

function _renderShopifyCharts(days, S) {
  const labels = days.map(d=>d.date.slice(5));
  // Trend chart
  const tEl = document.getElementById('chartShopifyTrend');
  const tMeta = document.getElementById('sh-trend-meta');
  if(tMeta) tMeta.textContent = 'Total: ₹'+parseInt(S.gmv).toLocaleString('en-IN')+' · '+S.orders+' orders';
  if(tEl){
    if(_shTrendChart){_shTrendChart.destroy();_shTrendChart=null;}
    _shTrendChart=new Chart(tEl,{type:'bar',data:{labels,datasets:[
      {label:'GMV',data:days.map(d=>d.gmv),backgroundColor:'rgba(16,185,129,0.6)',borderRadius:4,yAxisID:'yG'},
      {label:'Orders',data:days.map(d=>d.orders),type:'line',borderColor:'#8b5cf6',backgroundColor:'rgba(139,92,246,0.1)',borderWidth:2,pointRadius:2,fill:true,tension:0.4,yAxisID:'yO'}
    ]},options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{color:'#94a3b8',font:{size:11}}},tooltip:{mode:'index',intersect:false,callbacks:{label:c=>c.dataset.label==='GMV'?' ₹'+parseInt(c.raw).toLocaleString('en-IN'):' '+c.raw+' orders'}}},
      scales:{yG:{position:'left',beginAtZero:true,ticks:{color:'#64748b',font:{size:9},callback:v=>'₹'+(v>=100000?(v/100000).toFixed(1)+'L':v>=1000?(v/1000).toFixed(0)+'K':v)},grid:{color:'rgba(255,255,255,0.04)'}},
        yO:{position:'right',beginAtZero:true,ticks:{color:'#64748b',font:{size:9}},grid:{display:false}},
        x:{ticks:{color:'#64748b',font:{size:9},maxTicksLimit:15},grid:{display:false}}}}});
  }
  // Cumulative GMV
  const cEl = document.getElementById('chartShopifyCumGmv');
  if(cEl){
    if(_shCumChart){_shCumChart.destroy();_shCumChart=null;}
    let cum=0;
    const cumVals = days.map(d=>{cum+=d.gmv;return cum;});
    _shCumChart=new Chart(cEl,{type:'line',data:{labels,datasets:[{label:'Cum. GMV',data:cumVals,borderColor:'#f59e0b',backgroundColor:'rgba(245,158,11,0.12)',borderWidth:2.5,fill:true,tension:0.4,pointRadius:2,pointBackgroundColor:'#f59e0b'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>' ₹'+parseInt(c.raw).toLocaleString('en-IN')}}},scales:{x:{ticks:{color:'#64748b',font:{size:9},maxTicksLimit:12},grid:{display:false}},y:{beginAtZero:true,grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#64748b',font:{size:9},callback:v=>'₹'+(v>=100000?(v/100000).toFixed(1)+'L':v>=1000?(v/1000).toFixed(0)+'K':v)}}}}});
  }
  // New vs Returning
  const custEl = document.getElementById('chartShopifyCust');
  if(custEl){
    if(_shCustChart){_shCustChart.destroy();_shCustChart=null;}
    _shCustChart=new Chart(custEl,{type:'bar',data:{labels,datasets:[
      {label:'New',data:days.map(d=>d.newCust),backgroundColor:'rgba(59,130,246,0.75)',borderRadius:3,stack:'c'},
      {label:'Return',data:days.map(d=>d.retCust),backgroundColor:'rgba(16,185,129,0.75)',borderRadius:3,stack:'c'}
    ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#94a3b8',font:{size:11}}},tooltip:{mode:'index',intersect:false}},scales:{x:{stacked:true,ticks:{color:'#64748b',font:{size:9},maxTicksLimit:14},grid:{display:false}},y:{stacked:true,beginAtZero:true,grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#64748b',font:{size:9}}}}}});
  }
  // COD vs Prepaid
  const codEl = document.getElementById('chartShopifyCod');
  if(codEl){
    if(_shCodChart){_shCodChart.destroy();_shCodChart=null;}
    _shCodChart=new Chart(codEl,{type:'bar',data:{labels,datasets:[
      {label:'COD',data:days.map(d=>d.cod||0),backgroundColor:'rgba(245,158,11,0.7)',borderRadius:3,stack:'p'},
      {label:'Prepaid',data:days.map(d=>d.prepaid||0),backgroundColor:'rgba(99,102,241,0.7)',borderRadius:3,stack:'p'}
    ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#94a3b8',font:{size:11}}},tooltip:{mode:'index',intersect:false}},scales:{x:{stacked:true,ticks:{color:'#64748b',font:{size:9},maxTicksLimit:14},grid:{display:false}},y:{stacked:true,beginAtZero:true,grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#64748b',font:{size:9}}}}}});
  }
  // Buckets
  const bEl = document.getElementById('chartShopifyBuckets');
  if(bEl){
    if(_shBucketsChart){_shBucketsChart.destroy();_shBucketsChart=null;}
    const bLabels=Object.keys(_SH_BUCKETS), bVals=Object.values(_SH_BUCKETS);
    _shBucketsChart=new Chart(bEl,{type:'bar',data:{labels:bLabels,datasets:[{label:'Orders',data:bVals,backgroundColor:['rgba(139,92,246,0.7)','rgba(59,130,246,0.7)','rgba(16,185,129,0.7)','rgba(245,158,11,0.7)','rgba(239,68,68,0.7)'],borderRadius:6,borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>' '+c.raw+' orders'}}},scales:{x:{grid:{display:false},ticks:{color:'#64748b',font:{size:10}}},y:{beginAtZero:true,grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#64748b',font:{size:10}}}}}});
  }
  // Top Products horizontal bar
  const pEl = document.getElementById('chartShopifyProducts');
  if(pEl){
    if(_shProductsChart){_shProductsChart.destroy();_shProductsChart=null;}
    const top8 = _SH_PRODUCTS.slice(0,8);
    _shProductsChart=new Chart(pEl,{type:'bar',data:{labels:top8.map(p=>(p.title||'').slice(0,20)),datasets:[{label:'Revenue',data:top8.map(p=>p.revenue),backgroundColor:'rgba(16,185,129,0.7)',borderRadius:4}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>' ₹'+parseInt(c.raw).toLocaleString('en-IN')}}},scales:{x:{beginAtZero:true,grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#64748b',font:{size:9},callback:v=>'₹'+(v>=100000?(v/100000).toFixed(1)+'L':v>=1000?(v/1000).toFixed(0)+'K':v)}},y:{grid:{display:false},ticks:{color:'#64748b',font:{size:9}}}}}});
  }
}
` : `
function initShopifyChart(){}
function shSetPreset(){}
function shSetCustom(){}
function renderShopify(){}
`}

// ── No longer needed (all chart logic moved into renderShopify/_renderShopifyCharts) ──
${shopifyData ? `
function initShopifyBucketsChart(){}
function initShopifyTrendChart(){}
function initShopifyCumGmvChart(){}
function initShopifyCustChart(){}
` : ``}

// ══════════════════════════════════════════════════════════════════════════════
// ── OVERALL DASHBOARD ─────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
const _OV_META_DAILY  = ${JSON.stringify(allDailyData)};
const _OV_SH_DAILY    = ${JSON.stringify(sh.dailyTrend || [])};
const _OV_META_TODAY  = { spend:${yesterdaySpend}, revenue:${accRevenue}, purchases:${accPurchases}, roas:${accRoas} };

let _ovSpendChart=null, _ovRoasChart=null, _ovChannelChart=null, _ovOrdersChart=null, _ovCacChart=null;

// Standalone date helper (does not depend on Shopify being loaded)
function ovGetDate(offsetDays = 0) {
  const d = new Date(Date.now() + 5.5*3600000 - offsetDays*86400000);
  return d.toISOString().slice(0,10);
}

function ovSetPreset(p) {
  const today = '${dateStr}';
  const map = { today:[today,today], '7d':[ovGetDate(6),today], '14d':[ovGetDate(13),today], mtd:['2026-04-01',today], all:['2026-04-01',today] };
  const [f,t] = map[p]||map.mtd;
  document.getElementById('ov-from').value=f;
  document.getElementById('ov-to').value=t;
  document.querySelectorAll('[id^=ovp-]').forEach(b=>b.classList.remove('active'));
  const btn=document.getElementById('ovp-'+p);
  if(btn)btn.classList.add('active');
  renderOverall(f,t);
}

function renderOverall(from, to) {
  if(!from) from=document.getElementById('ov-from')?.value||'2026-04-01';
  if(!to)   to=document.getElementById('ov-to')?.value||'${dateStr}';
  const cnt=document.getElementById('ov-day-count');
  // Meta daily data
  const metaDays=Object.entries(_OV_META_DAILY).filter(([d])=>d>=from&&d<=to).map(([d,v])=>({date:d,...(v.account||{})}));
  const shDays=_OV_SH_DAILY.filter(d=>d.date>=from&&d.date<=to);
  const nDays=Math.max(metaDays.length,shDays.length,1);
  if(cnt) cnt.textContent=nDays+' day'+(nDays!==1?'s':'');
  const inr=v=>'₹'+parseInt(v||0).toLocaleString('en-IN');

  const metaS={spend:0,revenue:0,purchases:0,impressions:0,clicks:0};
  metaDays.forEach(d=>{metaS.spend+=d.spend||0;metaS.revenue+=d.revenue||0;metaS.purchases+=d.purchases||0;metaS.impressions+=d.impressions||0;metaS.clicks+=d.clicks||0;});
  const shS={gmv:0,orders:0,newCust:0,retCust:0,units:0,discount:0};
  shDays.forEach(d=>{shS.gmv+=d.gmv||0;shS.orders+=d.orders||0;shS.newCust+=d.newCust||0;shS.retCust+=d.retCust||0;shS.units+=d.units||0;shS.discount+=d.discount||0;});

  const blendedRoas = metaS.spend>0&&shS.gmv>0?shS.gmv/metaS.spend:metaS.spend>0&&metaS.revenue>0?metaS.revenue/metaS.spend:0;
  const pixelRoas   = metaS.spend>0&&metaS.revenue>0?metaS.revenue/metaS.spend:0;
  const cac         = shS.newCust>0?metaS.spend/shS.newCust:0;
  const ctr         = metaS.impressions>0?metaS.clicks/metaS.impressions*100:0;
  const cpc         = metaS.clicks>0?metaS.spend/metaS.clicks:0;
  const cpa         = metaS.purchases>0?metaS.spend/metaS.purchases:0;
  const aov         = shS.orders>0?shS.gmv/shS.orders:0;
  const netRev      = shS.gmv-shS.discount;

  const lbl=document.getElementById('ov-period-label');
  if(lbl)lbl.textContent='Combined Meta Ads + Shopify · '+from+' → '+to+' · '+nDays+' days';

  const kc=(l,v,s,c='')=>\`<div class="kcard \${c}"><div class="k-lbl">\${l}</div><div class="k-val">\${v}</div><div class="k-meta"><span class="k-bench">\${s}</span></div></div>\`;
  document.getElementById('ov-kpi-section').innerHTML=\`
  <div style="font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px">💰 Revenue & Spend — \${from===to?from:from+' → '+to}</div>
  <div class="kpi-grid g6" style="margin-bottom:14px">
    \${kc('Meta Ad Spend',inr(metaS.spend),nDays+' days · '+inr(metaS.spend/nDays)+'/day','')}
    \${kc('Shopify GMV',inr(shS.gmv),inr(shS.gmv/nDays)+'/day avg','green')}
    \${kc('Meta Pixel Revenue',inr(metaS.revenue),inr(metaS.revenue/nDays)+'/day avg','')}
    \${kc('Blended ROAS',blendedRoas.toFixed(2)+'x','Shopify GMV ÷ Meta Spend',blendedRoas>=2?'green':blendedRoas>=1?'amber':'red')}
    \${kc('Pixel ROAS',pixelRoas.toFixed(2)+'x','Meta attributed ROAS',pixelRoas>=2?'green':pixelRoas>=1?'amber':'red')}
    \${kc('ROAS Gap',(blendedRoas-pixelRoas).toFixed(2)+'x','True vs Pixel gap',(blendedRoas>pixelRoas)?'green':'amber')}
  </div>
  <div style="font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px">📊 Efficiency & Customers</div>
  <div class="kpi-grid g6" style="margin-bottom:14px">
    \${kc('CAC',cac>0?inr(cac):'—','Meta spend ÷ new customers','purple')}
    \${kc('CPA (Meta)',inr(cpa),'Per purchase','purple')}
    \${kc('CPC',inr(cpc),'Cost per click','')}
    \${kc('CTR',ctr.toFixed(2)+'%',metaS.impressions.toLocaleString()+' impressions','')}
    \${kc('Total Orders',shS.orders.toLocaleString(),'Shopify orders','')}
    \${kc('Purchases (Pixel)',metaS.purchases.toLocaleString(),'Meta-attributed purchases','')}
  </div>
  <div style="font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px">🛒 Blended Funnel</div>
  <div class="kpi-grid g6" style="margin-bottom:20px">
    \${kc('Net Revenue',inr(netRev),'Shopify GMV after discounts','green')}
    \${kc('Discount Given',inr(shS.discount),shS.gmv>0?(shS.discount/shS.gmv*100).toFixed(1)+'% of GMV':'—','amber')}
    \${kc('AOV',inr(aov),'Avg order value, Shopify','purple')}
    \${kc('New Customers',shS.newCust,inr(cac>0?cac:0)+' CAC','')}
    \${kc('Units Sold',shS.units.toLocaleString(),shS.orders>0?(shS.units/shS.orders).toFixed(1)+' per order':'—','')}
    \${kc('TACOS',metaS.spend>0&&shS.gmv>0?(metaS.spend/shS.gmv*100).toFixed(1)+'%':'—','Total Ad Cost of Sales','')}
  </div>
  \`;

  // ── Overall charts ────────────────────────────────────────────────────────
  const allDates = [...new Set([...metaDays.map(d=>d.date),...shDays.map(d=>d.date)])].sort();
  const metaByDate = Object.fromEntries(metaDays.map(d=>[d.date,d]));
  const shByDate   = Object.fromEntries(shDays.map(d=>[d.date,d]));

  const sgEl=document.getElementById('chartOvSpendGmv');
  if(sgEl){
    if(_ovSpendChart){_ovSpendChart.destroy();_ovSpendChart=null;}
    _ovSpendChart=new Chart(sgEl,{type:'bar',data:{labels:allDates.map(d=>d.slice(5)),datasets:[
      {label:'Meta Spend',data:allDates.map(d=>metaByDate[d]?.spend||0),backgroundColor:'rgba(239,68,68,0.6)',borderRadius:3,yAxisID:'y'},
      {label:'Shopify GMV',data:allDates.map(d=>shByDate[d]?.gmv||0),type:'line',borderColor:'#10b981',backgroundColor:'rgba(16,185,129,0.08)',fill:true,borderWidth:2,pointRadius:2,tension:0.4,yAxisID:'y'}
    ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#94a3b8',font:{size:11}}},tooltip:{mode:'index',intersect:false,callbacks:{label:c=>' ₹'+parseInt(c.raw).toLocaleString('en-IN')}}},scales:{x:{ticks:{color:'#64748b',font:{size:9},maxTicksLimit:15},grid:{display:false}},y:{beginAtZero:true,grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#64748b',font:{size:9},callback:v=>'₹'+(v>=100000?(v/100000).toFixed(1)+'L':v>=1000?(v/1000).toFixed(0)+'K':v)}}}}});
  }
  const roasEl=document.getElementById('chartOvRoas');
  if(roasEl){
    if(_ovRoasChart){_ovRoasChart.destroy();_ovRoasChart=null;}
    const roasArr=allDates.map(d=>{const sp=metaByDate[d]?.spend||0,gm=shByDate[d]?.gmv||0;return sp>0&&gm>0?parseFloat((gm/sp).toFixed(2)):null;});
    _ovRoasChart=new Chart(roasEl,{type:'line',data:{labels:allDates.map(d=>d.slice(5)),datasets:[{label:'Blended ROAS',data:roasArr,borderColor:'#f59e0b',backgroundColor:'rgba(245,158,11,0.1)',fill:true,borderWidth:2.5,pointRadius:3,pointBackgroundColor:roasArr.map(r=>r===null?'transparent':r>=2?'#10b981':r>=1?'#f59e0b':'#ef4444'),tension:0.4,spanGaps:true}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.raw===null?'No data':' ROAS: '+c.raw+'x'}}},scales:{x:{ticks:{color:'#64748b',font:{size:9},maxTicksLimit:15},grid:{display:false}},y:{beginAtZero:true,grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#64748b',font:{size:9},callback:v=>v+'x'}}}}});
  }
  const chEl=document.getElementById('chartOvChannel');
  if(chEl){
    if(_ovChannelChart){_ovChannelChart.destroy();_ovChannelChart=null;}
    _ovChannelChart=new Chart(chEl,{type:'doughnut',data:{labels:['Shopify GMV','Meta Pixel Rev'],datasets:[{data:[shS.gmv||1,metaS.revenue||1],backgroundColor:['rgba(16,185,129,0.7)','rgba(59,130,246,0.7)'],borderWidth:0,hoverOffset:8}]},options:{responsive:true,maintainAspectRatio:false,cutout:'60%',plugins:{legend:{position:'bottom',labels:{color:'#94a3b8',font:{size:11}}},tooltip:{callbacks:{label:c=>' ₹'+parseInt(c.raw).toLocaleString('en-IN')}}}}});
  }
  const orEl=document.getElementById('chartOvOrders');
  if(orEl){
    if(_ovOrdersChart){_ovOrdersChart.destroy();_ovOrdersChart=null;}
    _ovOrdersChart=new Chart(orEl,{type:'doughnut',data:{labels:['Shopify Orders','Meta Purchases'],datasets:[{data:[shS.orders||1,metaS.purchases||1],backgroundColor:['rgba(139,92,246,0.7)','rgba(245,158,11,0.7)'],borderWidth:0,hoverOffset:8}]},options:{responsive:true,maintainAspectRatio:false,cutout:'60%',plugins:{legend:{position:'bottom',labels:{color:'#94a3b8',font:{size:11}}},tooltip:{callbacks:{label:c=>' '+parseInt(c.raw)+' orders/purchases'}}}}});
  }
  const cacEl=document.getElementById('chartOvCac');
  if(cacEl){
    if(_ovCacChart){_ovCacChart.destroy();_ovCacChart=null;}
    const cacArr=allDates.map(d=>{const sp=metaByDate[d]?.spend||0,nc=shByDate[d]?.newCust||0;return nc>0?parseFloat((sp/nc).toFixed(0)):null;});
    _ovCacChart=new Chart(cacEl,{type:'bar',data:{labels:allDates.map(d=>d.slice(5)),datasets:[{label:'CAC (₹)',data:cacArr,backgroundColor:'rgba(99,102,241,0.65)',borderRadius:3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.raw===null?'No data':' ₹'+parseInt(c.raw)+'/new cust.'}}},scales:{x:{ticks:{color:'#64748b',font:{size:9},maxTicksLimit:14},grid:{display:false}},y:{beginAtZero:true,grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#64748b',font:{size:9},callback:v=>'₹'+(v>=1000?(v/1000).toFixed(0)+'K':v)}}}}});
  }
}

// ── Amazon placeholder charts ────────────────────────────────────────────────
let _amzRoasChart=null, _amzSpendChart=null;
function amzSetPreset(p) {
  document.querySelectorAll('[id^=amzp-]').forEach(b=>b.classList.remove('active'));
  const btn=document.getElementById('amzp-'+p);
  if(btn)btn.classList.add('active');
  renderAmazon();
}
function renderAmazon() {
  // Render placeholder charts with mock upward-trending data
  const today='${dateStr}'; const n=25;
  const labels=Array.from({length:n},(_,i)=>{const d=new Date('2026-04-01');d.setDate(d.getDate()+i);return (d.getMonth()+1)+'-'+(d.getDate());});
  const mockRoas=labels.map((_,i)=>parseFloat((1.8+Math.random()*1.2+i*0.02).toFixed(2)));
  const mockSpend=labels.map((_,i)=>Math.round(3000+Math.random()*2000+i*80));
  const mockRev=labels.map((_,i)=>Math.round(mockSpend[i]*(mockRoas[i]||2)));

  const rEl=document.getElementById('chartAmzRoas');
  if(rEl){
    if(_amzRoasChart){_amzRoasChart.destroy();_amzRoasChart=null;}
    _amzRoasChart=new Chart(rEl,{type:'line',data:{labels,datasets:[{label:'ROAS',data:mockRoas,borderColor:'#f59e0b',backgroundColor:'rgba(245,158,11,0.1)',fill:true,borderWidth:2.5,pointRadius:2,tension:0.4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>' '+c.raw+'x (preview)'}}},scales:{x:{ticks:{color:'#64748b',font:{size:9}},grid:{display:false}},y:{beginAtZero:true,grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#64748b',font:{size:9},callback:v=>v+'x'}}}}});
  }
  const sEl=document.getElementById('chartAmzSpend');
  if(sEl){
    if(_amzSpendChart){_amzSpendChart.destroy();_amzSpendChart=null;}
    _amzSpendChart=new Chart(sEl,{type:'bar',data:{labels,datasets:[
      {label:'Spend',data:mockSpend,backgroundColor:'rgba(239,68,68,0.6)',borderRadius:3,yAxisID:'y'},
      {label:'Revenue',data:mockRev,type:'line',borderColor:'#10b981',backgroundColor:'rgba(16,185,129,0.08)',fill:true,borderWidth:2,pointRadius:2,tension:0.4,yAxisID:'y'}
    ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#94a3b8',font:{size:11}}},tooltip:{callbacks:{label:c=>' ₹'+parseInt(c.raw).toLocaleString('en-IN')+' (preview)'}}},scales:{x:{ticks:{color:'#64748b',font:{size:9}},grid:{display:false}},y:{beginAtZero:true,grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#64748b',font:{size:9},callback:v=>'₹'+(v>=1000?(v/1000).toFixed(0)+'K':v)}}}}});
  }
}

// ── On-load: init all platform renders ──────────────────────────────────────
(function(){
  // Shopify: default to MTD
  if(document.getElementById('sh-kpi-section')){
    shSetPreset('mtd');
  }
  // Overall: default to MTD
  if(document.getElementById('ov-kpi-section')){
    ovSetPreset('mtd');
  }
})();

// Store top ads globally for day detail
const topAdsData = ${JSON.stringify(topAds)};
window.topAdsData = topAdsData;

// ═══ ALL DAILY DATA (for compare + range filter) ═══════════════════════════
const _allDaily = ${JSON.stringify(allDailyData)};
const _allDailyAmzn = ${JSON.stringify((amazonData||{}).allDailyAmzn||{})};
const _amzCampaigns = ${JSON.stringify((amazonData||{}).campaigns||[])};
const _amzConnected = ${JSON.stringify(!!(amazonData||{}).connected)};
const _adsetTargeting = ${JSON.stringify(adsetTargetingMap)};

// ═══ CREATIVE BUCKETS — date-reactive ════════════════════════════════════

// ═══ CAMPAIGN TABLE — date-reactive ═══════════════════════════════════════
function renderMetaCampaigns(from, to) {
  const campMap = {};
  Object.entries(_allDaily).forEach(([date, dayData]) => {
    if(date < from || date > to) return;
    (dayData.campaigns || []).forEach(camp => {
      const k = camp.id || camp.name;
      if(!campMap[k]) campMap[k] = { name:camp.name, spend:0, revenue:0, purchases:0, impressions:0, clicks:0, freq:0, _days:0 };
      campMap[k].spend      += camp.spend      || 0;
      campMap[k].revenue    += camp.revenue    || 0;
      campMap[k].purchases  += camp.purchases  || 0;
      campMap[k].impressions+= camp.impressions|| 0;
      campMap[k].clicks     += camp.clicks     || 0;
      campMap[k].freq       += camp.freq       || 0;
      campMap[k]._days++;
    });
  });
  const camps = Object.values(campMap).map(camp => ({
    ...camp,
    roas: camp.spend>0&&camp.revenue>0 ? camp.revenue/camp.spend : 0,
    cpa:  camp.purchases>0 ? camp.spend/camp.purchases : 0,
    ctr:  camp.impressions>0 ? camp.clicks/camp.impressions*100 : 0,
    avgFreq: camp._days>0 ? camp.freq/camp._days : 0,
  })).sort((a,b)=>b.spend-a.spend);
  if(camps.length===0) return;
  const inr = n => 'Rs.'+parseInt(n||0).toLocaleString('en-IN');
  const roasCls = r => r>=3?'badge-green':r>=2?'badge-blue':r>=1?'badge-amber':'badge-red';
  const roasS   = r => r>0?r.toFixed(2)+'x':'--';
  const sub = document.getElementById('campDayLabel');
  if(sub) sub.textContent = 'Period: '+(from===to?from:from+' to '+to);
  const badge = document.querySelector('#campaigns .sec-badge');
  if(badge) badge.textContent = camps.length+' campaigns';
  const tbody = document.getElementById('camp-tbody');
  if(!tbody) return;
  tbody.innerHTML = camps.map((camp, i) => {
    const action = camp.roas>=2?'<span style="color:#10b981;font-size:11px;font-weight:600">Scale Up</span>':camp.roas>=1?'<span style="color:#f59e0b;font-size:11px">Optimise</span>':'<span style="color:#ef4444;font-size:11px">Review</span>';
    return '<tr><td class="cm">'+(i+1)+'</td>'
      +'<td class="cn">'+(camp.name||'--').slice(0,30)+'</td>'
      +'<td>'+inr(camp.spend)+'</td>'
      +'<td style="color:'+(camp.revenue>camp.spend?'var(--g)':camp.revenue>0?'var(--a)':'var(--t2)')+'">'+inr(camp.revenue)+'</td>'
      +'<td><span class="badge '+roasCls(camp.roas)+'">'+roasS(camp.roas)+'</span></td>'
      +'<td>'+camp.purchases+'</td>'
      +'<td>'+(camp.cpa>0?inr(camp.cpa):'--')+'</td>'
      +'<td>'+camp.ctr.toFixed(2)+'%</td>'
      +'<td>'+(camp.impressions>0?inr(camp.spend/camp.impressions*1000):'--')+'</td>'
      +'<td>'+camp.avgFreq.toFixed(2)+'</td>'
      +'<td>'+action+'</td></tr>';
  }).join('');
  const topCamps = camps.slice(0,8);
  if(window._chartCampRoas) {
    window._chartCampRoas.data.labels = topCamps.map(c=>(c.name||'').slice(0,20));
    window._chartCampRoas.data.datasets[0].data = topCamps.map(c=>parseFloat(c.roas.toFixed(2)));
    window._chartCampRoas.update();
  }
  if(window._chartCampRevSpend) {
    window._chartCampRevSpend.data.labels = topCamps.map(c=>(c.name||'').slice(0,20));
    window._chartCampRevSpend.data.datasets[0].data = topCamps.map(c=>parseInt(c.revenue));
    window._chartCampRevSpend.data.datasets[1].data = topCamps.map(c=>parseInt(c.spend));
    window._chartCampRevSpend.update();
  }
}

// ═══ FUNNEL METRICS — date-reactive ════════════════════════════════════════
function renderMetaFunnel(from, to) {
  const keys = Object.keys(_allDaily).filter(d=>d>=from&&d<=to);
  let sp=0,rev=0,pur=0,impr=0,clks=0,atc=0,checkout=0,lpv=0;
  keys.forEach(d=>{
    const a=_allDaily[d]?.account||{};
    sp+=a.spend||0;rev+=a.revenue||0;pur+=a.purchases||0;
    impr+=a.impressions||0;clks+=a.clicks||0;atc+=a.atc||0;
    checkout+=a.checkout||0;lpv+=a.lpv||0;
  });
  const fCtr   =impr>0?clks/impr*100:0;
  const fLpv   =clks>0?lpv/clks*100:0;
  const fAtc   =lpv>0?atc/lpv*100:0;
  const fCkout =atc>0?checkout/atc*100:0;
  const fPurch =checkout>0?pur/checkout*100:0;
  const map2 = {
    'fv-impr':parseInt(impr).toLocaleString('en-IN'),
    'fv-clicks':parseInt(clks).toLocaleString('en-IN'),
    'fv-lpv': parseInt(lpv).toLocaleString('en-IN'),
    'fv-atc': parseInt(atc).toLocaleString('en-IN'),
    'fv-checkout':parseInt(checkout).toLocaleString('en-IN'),
    'fv-buys2':parseInt(pur).toLocaleString('en-IN'),
    
    'fr-lpv':fLpv.toFixed(1)+'% of Clicks',
    'fr-atc':fAtc.toFixed(1)+'% of LPV',
    'fr-checkout':fCkout.toFixed(1)+'% of ATC',
    'fr-pur':fPurch.toFixed(1)+'% of Checkout',
  };
  Object.entries(map2).forEach(([id,val])=>{
    const el=document.getElementById(id);
    if(el)el.textContent=val;
  });
}

// ═══ HOURLY — dim and note when not today ═════════════════════════════════
function updateHourlyVisibility(from, to) {
  const dates=Object.keys(_allDaily).sort();
  const today=dates[dates.length-1];
  const sec=document.getElementById('hourly');
  if(!sec)return;
  const isToday=(to===today);
  sec.style.opacity=isToday?'1':'0.45';
  sec.style.pointerEvents=isToday?'':'none';
  const sub=sec.querySelector('.sec-sub');
  if(sub)sub.textContent=isToday?'Today bars vs 7-Day Daily Average (dashed lines)':'Hourly data only available for Today -- select Today to see live hourly breakdown';
}

// ═══ DEVICE — update note ═════════════════════════════════════════════════
function updateDeviceNote(from, to) {
  const sec=document.getElementById('devices');
  if(!sec)return;
  const sub=sec.querySelector('.sec-sub');
  if(sub)sub.textContent='Device and platform breakdown - aggregated for current fetch period';
}

// === AGE/GENDER & AGE RANGES - date-reactive ===========================
function renderMetaDemo(from, to) {
  const demoMap = {}, ageMap = {};
  Object.keys(_allDaily).filter(d => d >= from && d <= to).forEach(d => {
    (_allDaily[d].demo || []).forEach(row => {
      const key = row.age + "/" + row.gender;
      if (!demoMap[key]) demoMap[key] = { label: key, spend: 0, revenue: 0, purchases: 0 };
      demoMap[key].spend += row.spend || 0;
      demoMap[key].revenue += row.revenue || 0;
      demoMap[key].purchases += row.purchases || 0;
      const age = row.age || "Unknown";
      if (!ageMap[age]) ageMap[age] = { age, spend: 0, revenue: 0, purchases: 0 };
      ageMap[age].spend += row.spend || 0;
      ageMap[age].revenue += row.revenue || 0;
      ageMap[age].purchases += row.purchases || 0;
    });
  });
  const inr = n => "Rs." + parseInt(n||0).toLocaleString("en-IN");
  const roasCls = r => r>=3?"badge-green":r>=2?"badge-blue":r>=1?"badge-amber":"badge-red";
  const roasS = r => r>0?r.toFixed(2)+"x":"--";
  const demoRows = Object.values(demoMap).map(d => ({...d, roas: d.spend>0?d.revenue/d.spend:0})).sort((a,b)=>b.spend-a.spend).slice(0,20);
  const demoTbody = document.getElementById("age-gender-tbody");
  if (demoTbody) {
    demoTbody.innerHTML = demoRows.length > 0
      ? demoRows.map((d,i) => {
          const cpa = d.purchases>0?d.spend/d.purchases:0;
          return '<tr><td class="cm">'+(i+1)+'</td><td style="font-weight:600">'+d.label+'</td>'
            +'<td>'+inr(d.spend)+'</td><td>'+inr(d.revenue)+'</td>'
            +'<td><span class="badge '+roasCls(d.roas)+'">'+roasS(d.roas)+'</span></td>'
            +'<td>'+d.purchases+'</td><td>'+(cpa>0?inr(cpa):'--')+'</td></tr>';
        }).join("")
      : '<tr><td colspan="7" style="text-align:center;color:var(--t2);padding:16px">No demographic data for this period</td></tr>';
  }
  const ageRows = Object.values(ageMap).map(a => ({...a, roas: a.spend>0?a.revenue/a.spend:0})).sort((a,b)=>b.spend-a.spend);
  const ageTbody = document.getElementById("age-range-tbody");
  if (ageTbody) {
    ageTbody.innerHTML = ageRows.length > 0
      ? ageRows.map((a,i) => {
          const cpa = a.purchases>0?a.spend/a.purchases:0;
          return '<tr><td class="cm">'+(i+1)+'</td><td style="font-weight:600">'+a.age+'</td>'
            +'<td>'+inr(a.spend)+'</td><td>'+inr(a.revenue)+'</td>'
            +'<td><span class="badge '+roasCls(a.roas)+'">'+roasS(a.roas)+'</span></td>'
            +'<td>'+a.purchases+'</td><td>'+(cpa>0?inr(cpa):'--')+'</td></tr>';
        }).join("")
      : '<tr><td colspan="7" style="text-align:center;color:var(--t2);padding:16px">No age data for this period</td></tr>';
  }
  const top8 = demoRows.slice(0,8);
  const labels = top8.map(d => d.label);
  const roasVals = top8.map(d => parseFloat(d.roas.toFixed(2)));
  const spendVals = top8.map(d => parseInt(d.spend));
  const colors = roasVals.map(r => r>=2?"#10b981":r>=1?"#f59e0b":"#ef4444");
  if (window._chartDemoRoas) {
    window._chartDemoRoas.data.labels = labels;
    window._chartDemoRoas.data.datasets[0].data = roasVals;
    window._chartDemoRoas.data.datasets[0].backgroundColor = colors;
    window._chartDemoRoas.update();
  }
  if (window._chartDemoSpend) {
    window._chartDemoSpend.data.labels = labels;
    window._chartDemoSpend.data.datasets[0].data = spendVals;
    window._chartDemoSpend.update();
  }
}

// === AUDIENCE (INTEREST/CUSTOM) - date-reactive ==========================
function renderMetaAudience(from, to) {
  if (typeof _adsetTargeting === "undefined") return;
  const activeIds = new Set();
  Object.keys(_allDaily).filter(d => d >= from && d <= to).forEach(d => {
    (_allDaily[d].adsets || []).forEach(a => { if ((a.spend||0) > 0) activeIds.add(a.id); });
  });
  const intMap = {}, caMap = {}, llSet = new Set();
  activeIds.forEach(id => {
    const t = _adsetTargeting[id]; if (!t) return;
    const nm = t.adsetName || id;
    (t.interests || []).forEach(int => {
      if (!intMap[int.id||int.name]) intMap[int.id||int.name] = { name: int.name, count: 0, adsets: [] };
      intMap[int.id||int.name].count++; intMap[int.id||int.name].adsets.push(nm);
    });
    (t.customAudiences || []).forEach(ca => {
      if (!caMap[ca.id]) caMap[ca.id] = { name: ca.name, count: 0 };
      caMap[ca.id].count++;
    });
    (t.lookalikes || []).forEach(ll => llSet.add(ll));
  });
  const badge = s => '<span style="display:inline-block;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.25);border-radius:4px;padding:1px 6px;font-size:10px;color:#a5b4fc;margin:1px">'+s+'</span>';
  const topInt = Object.values(intMap).sort((a,b)=>b.count-a.count).slice(0,20);
  const topCa  = Object.values(caMap).sort((a,b)=>b.count-a.count).slice(0,20);
  const intTbody = document.getElementById("interest-tbody");
  if (intTbody) {
    intTbody.innerHTML = topInt.length > 0
      ? topInt.map((int,i) => '<tr><td class="cm">'+(i+1)+'</td><td>'+int.name+'</td><td>'+int.adsets.slice(0,3).map(badge).join('')+(int.adsets.length>3?'<span style="color:var(--t2);font-size:10px"> +'+(int.adsets.length-3)+' more</span>':'')+'</td></tr>').join('')
      : '<tr><td colspan="3" style="text-align:center;color:var(--t2);padding:12px">No active interests in this period</td></tr>';
    const meta = document.getElementById("interest-meta");
    if (meta) meta.textContent = topInt.length + " unique interests across active adsets";
  }
  const caTbody = document.getElementById("custom-audience-tbody");
  if (caTbody) {
    caTbody.innerHTML = topCa.length > 0
      ? topCa.map((ca,i) => '<tr><td class="cm">'+(i+1)+'</td><td>'+ca.name+'</td><td>'+ca.count+' adsets</td></tr>').join('')
      : '<tr><td colspan="3" style="text-align:center;color:var(--t2);padding:12px">No custom audiences in this period</td></tr>';
  }
}


// === AMAZON — date-reactive ===============================================
function amzSetPreset(p) {
  const dates = Object.keys(_allDailyAmzn).sort();
  const today = dates[dates.length-1] || Object.keys(_allDaily).sort().pop() || '2026-04-26';
  let from = today, to = today;
  if (p === 'today')     { from = to = today; }
  else if (p === '7d')   { const d=new Date(today); d.setDate(d.getDate()-6); from=d.toISOString().slice(0,10); to=today; }
  else if (p === '14d')  { const d=new Date(today); d.setDate(d.getDate()-13); from=d.toISOString().slice(0,10); to=today; }
  else if (p === 'mtd')  { from=today.slice(0,7)+'-01'; to=today; }
  else if (p === 'all')  { from=dates[0]||today; to=today; }
  const rf=document.getElementById('amz-from'), rt=document.getElementById('amz-to');
  if(rf) rf.value=from; if(rt) rt.value=to;
  document.querySelectorAll('[id^="amzp-"]').forEach(b=>b.classList.toggle('active', b.id==='amzp-'+p));
  renderAmazon();
}

function renderAmazon() {
  const from = document.getElementById('amz-from')?.value;
  const to   = document.getElementById('amz-to')?.value;
  if (!from || !to) return;

  // Update period label
  const lbl = document.getElementById('amz-period-label');
  if (lbl) lbl.textContent = from === to ? from : from + ' → ' + to;

  // Aggregate daily data
  const keys = Object.keys(_allDailyAmzn).filter(d => d >= from && d <= to);
  let spend=0, revenue=0, orders=0, clicks=0, impressions=0;
  keys.forEach(d => {
    const r = _allDailyAmzn[d] || {};
    spend       += r.spend       || 0;
    revenue     += r.revenue     || 0;
    orders      += r.orders      || 0;
    clicks      += r.clicks      || 0;
    impressions += r.impressions || 0;
  });
  const roas = spend>0&&revenue>0 ? revenue/spend : 0;
  const acos = revenue>0 ? spend/revenue*100 : 0;
  const ctr  = impressions>0 ? clicks/impressions*100 : 0;
  const cpc  = clicks>0 ? spend/clicks : 0;
  const cpa  = orders>0 ? spend/orders : 0;
  const inr  = n => 'Rs.' + parseInt(n||0).toLocaleString('en-IN');

  const set = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
  set('amz-revenue', inr(revenue));
  set('amz-spend',   inr(spend));
  set('amz-roas',    roas>0 ? roas.toFixed(2)+'x' : '--');
  set('amz-orders',  orders);
  set('amz-acos',    acos>0 ? acos.toFixed(1)+'%' : '--');
  set('amz-clicks',  parseInt(clicks).toLocaleString('en-IN'));
  set('amz-impr',    parseInt(impressions).toLocaleString('en-IN'));
  set('amz-ctr',     ctr>0 ? ctr.toFixed(2)+'%' : '--');
  set('amz-cpc',     cpc>0 ? inr(cpc) : '--');
  set('amz-cpa',     cpa>0 ? inr(cpa) : '--');

  // Campaign table — filter by date
  const campMap = {};
  keys.forEach(d => {
    (_allDailyAmzn[d]?._campaigns || []).forEach(camp => {
      if (!campMap[camp.name]) campMap[camp.name] = { name:camp.name, spend:0, revenue:0, orders:0, clicks:0, impressions:0 };
      campMap[camp.name].spend       += camp.spend       || 0;
      campMap[camp.name].revenue     += camp.revenue     || 0;
      campMap[camp.name].orders      += camp.orders      || 0;
      campMap[camp.name].clicks      += camp.clicks      || 0;
      campMap[camp.name].impressions += camp.impressions || 0;
    });
  });

  // Fall back to full period campaigns if no per-day campaign breakdown
  const camps = Object.values(campMap).length > 0
    ? Object.values(campMap).map(camp => ({ ...camp, roas: camp.spend>0&&camp.revenue>0?camp.revenue/camp.spend:0 })).sort((a,b)=>b.spend-a.spend)
    : _amzCampaigns.slice(0,20);

  const tbody = document.getElementById('amz-camp-tbody');
  if (tbody) {
    tbody.innerHTML = camps.length > 0
      ? camps.map((camp, i) => {
          const acos = camp.revenue>0 ? (camp.spend/camp.revenue*100).toFixed(1)+'%' : '--';
          const roas = camp.roas>0 ? camp.roas.toFixed(2)+'x' : '--';
          const rc   = camp.roas>=4?'badge-green':camp.roas>=2?'badge-blue':camp.roas>=1?'badge-amber':'badge-red';
          return '<tr><td class="cm">'+(i+1)+'</td>'
            +'<td style="font-weight:500">'+(camp.name||'').slice(0,35)+'</td>'
            +'<td>'+inr(camp.spend)+'</td>'
            +'<td>'+inr(camp.revenue)+'</td>'
            +'<td><span class="badge '+rc+'">'+roas+'</span></td>'
            +'<td>'+camp.orders+'</td>'
            +'<td>'+acos+'</td>'
            +'<td>'+parseInt(camp.clicks||0).toLocaleString('en-IN')+'</td>'
            +'<td>'+parseInt(camp.impressions||0).toLocaleString('en-IN')+'</td></tr>';
        }).join('')
      : '<tr><td colspan="9" style="text-align:center;color:var(--t2);padding:16px">No campaign data for this period</td></tr>';
  }

  // Update charts
  const dailyDates = keys.sort();
  const spendArr   = dailyDates.map(d => parseFloat((_allDailyAmzn[d]||{}).spend||0).toFixed(0));
  const revenueArr = dailyDates.map(d => parseFloat((_allDailyAmzn[d]||{}).revenue||0).toFixed(0));
  const roasArr    = dailyDates.map(d => { const r=_allDailyAmzn[d]||{}; return r.spend>0&&r.revenue>0?(r.revenue/r.spend).toFixed(2):0; });

  if (window._chartAmzRoas) {
    window._chartAmzRoas.data.labels = dailyDates;
    window._chartAmzRoas.data.datasets[0].data = roasArr;
    window._chartAmzRoas.update();
  }
  if (window._chartAmzSpend) {
    window._chartAmzSpend.data.labels = dailyDates;
    window._chartAmzSpend.data.datasets[0].data = revenueArr;
    window._chartAmzSpend.data.datasets[1].data = spendArr;
    window._chartAmzSpend.update();
  }
}

function renderMetaCreatives(from, to) {
  // Aggregate all ad rows in the selected date range
  const adMap = {};
  Object.entries(_allDaily).forEach(([date, dayData]) => {
    if(date < from || date > to) return;
    (dayData.ads || []).forEach(a => {
      const k = a.id || a.name;
      if(!adMap[k]) adMap[k] = { ad_name: a.name, campaign_name: a.campName, sp:0, rev:0, buys:0, freq:0, _freqDays:0 };
      adMap[k].sp   += a.spend    || 0;
      adMap[k].rev  += a.revenue  || 0;
      adMap[k].buys += a.purchases|| 0;
      adMap[k].freq += a.freq     || 0;
      adMap[k]._freqDays++;
    });
  });
  const ads = Object.values(adMap).map(a => ({
    ...a,
    roas: a.sp > 0 && a.rev > 0 ? a.rev / a.sp : 0,
    freq: a._freqDays > 0 ? a.freq / a._freqDays : 0,
  })).filter(a => a.sp > 0);

  if(ads.length === 0) return; // no historical ad data — keep today's static render

  const dollar = n => '₹' + parseInt(n||0).toLocaleString('en-IN');
  const roasCls = r => r>=3?'badge-green':r>=2?'badge-blue':r>=1?'badge-amber':'badge-red';
  const roasS   = r => r>0 ? r.toFixed(2)+'x' : '—';

  const rowHtml = (ads, noMsg) => ads.length > 0 ? ads.map((a,i) => {
    const roasCol = a.rev>a.sp?'var(--g)':a.rev>0?'var(--a)':'var(--t2)';
    return '<tr><td class="cm">'+(i+1)+'</td>'
      +'<td class="cn">'+(a.ad_name||'—').slice(0,26)+'</td>'
      +'<td style="font-size:10px">'+(a.campaign_name||'—').slice(0,20)+'</td>'
      +'<td>'+dollar(a.sp)+'</td>'
      +'<td style="color:'+roasCol+'">'+dollar(a.rev)+'</td>'
      +'<td><span class="badge '+roasCls(a.roas)+'">'+roasS(a.roas)+'</span></td>'
      +'<td>'+a.buys+'</td>'
      +'<td style="color:'+(a.freq>4?'var(--r)':a.freq>3?'var(--a)':'var(--t)')+'">'+a.freq.toFixed(2)+'</td>'
      +'</tr>';
  }).join('') : '<tr><td colspan="8" style="text-align:center;color:var(--t2);padding:16px">'+noMsg+'</td></tr>';

  const top      = [...ads].filter(a=>a.sp>=200&&a.buys>0).sort((a,b)=>b.roas-a.roas).slice(0,8);
  const bottom   = [...ads].filter(a=>a.sp>=200&&a.roas<1).sort((a,b)=>a.roas-b.roas).slice(0,8);
  const runnerup = [...ads].filter(a=>a.sp>=200&&a.roas>=1&&a.roas<2&&a.buys>0).sort((a,b)=>b.roas-a.roas).slice(0,8);

  const pLabel = from===to ? from : from+' → '+to;
  // Update table bodies + section subtitle
  const subEl = document.querySelector('#creatives .sec-sub');
  if(subEl) subEl.textContent = '3 buckets · '+pLabel+' · min ₹200 spend';

  [['creative-top-tbody',    top,      'No top creatives in this period'],
   ['creative-bottom-tbody', bottom,   'No bottom creatives in this period'],
   ['creative-runnerup-tbody',runnerup,'No runner-up creatives in this period']
  ].forEach(([id, data, msg]) => {
    const el = document.getElementById(id);
    if(el) el.innerHTML = rowHtml(data, msg);
  });
}

const _dateMin = '${historyStart}';
const _dateMax = '${latestDate}';

// Init range picker bounds + defaults
(function(){
  const f=document.getElementById('rangeFrom'),t=document.getElementById('rangeTo');
  if(f){f.min=_dateMin;f.max=_dateMax;f.value=_dateMin;}
  if(t){t.min=_dateMin;t.max=_dateMax;t.value=_dateMax;}
  ['cmpA1','cmpA2','cmpB1','cmpB2'].forEach((id,i)=>{
    const el=document.getElementById(id);if(!el)return;
    el.min=_dateMin;el.max=_dateMax;
    el.value=[_dateMin,_dateMax,_dateMin,_dateMax][i];
  });
})();

// ── COMPARE MODAL ──────────────────────────────────────────────────────────
function openCompare(){document.getElementById('compareModal').classList.add('open');}
function closeCompare(){document.getElementById('compareModal').classList.remove('open');}
function _sumRange(from,to){
  const keys=Object.keys(_allDaily).filter(d=>d>=from&&d<=to);
  const r={spend:0,revenue:0,purchases:0,impressions:0,clicks:0,days:keys.length};
  keys.forEach(d=>{const a=_allDaily[d]?.account||{};r.spend+=a.spend||0;r.revenue+=a.revenue||0;r.purchases+=a.purchases||0;r.impressions+=a.impressions||0;r.clicks+=a.clicks||0;});
  r.roas=r.spend>0&&r.revenue>0?r.revenue/r.spend:0;
  r.cpa=r.purchases>0?r.spend/r.purchases:0;
  r.aov=r.purchases>0?r.revenue/r.purchases:0;
  r.ctr=r.impressions>0?r.clicks/r.impressions*100:0;
  return r;
}
function _fmtR(n){return '\u20B9'+parseInt(n||0).toLocaleString('en-IN');}
function _delta(a,b,higher){
  if(!b)return '<span class="delta-neu">—</span>';
  const p=((a-b)/Math.max(b,0.001)*100).toFixed(1);
  const up=parseFloat(p)>0;
  const good=higher?up:!up;
  return '<span class="'+(good?'delta-pos':'delta-neg')+'">'+(up?'▲':'▼')+Math.abs(p)+'%</span>';
}
function runCompare(){
  const a1=document.getElementById('cmpA1').value,a2=document.getElementById('cmpA2').value;
  const b1=document.getElementById('cmpB1').value,b2=document.getElementById('cmpB2').value;
  if(!a1||!a2||!b1||!b2){alert('Fill all 4 dates');return;}
  const A=_sumRange(a1,a2),B=_sumRange(b1,b2);
  const rows=[
    ['Spend',_fmtR(A.spend),_fmtR(B.spend),_delta(A.spend,B.spend,false)],
    ['Revenue',_fmtR(A.revenue),_fmtR(B.revenue),_delta(A.revenue,B.revenue,true)],
    ['ROAS',A.roas.toFixed(2)+'x',B.roas.toFixed(2)+'x',_delta(A.roas,B.roas,true)],
    ['Purchases',A.purchases,B.purchases,_delta(A.purchases,B.purchases,true)],
    ['AOV',_fmtR(A.aov),_fmtR(B.aov),_delta(A.aov,B.aov,true)],
    ['CPA',_fmtR(A.cpa),_fmtR(B.cpa),_delta(A.cpa,B.cpa,false)],
    ['CTR',A.ctr.toFixed(2)+'%',B.ctr.toFixed(2)+'%',_delta(A.ctr,B.ctr,true)],
    ['Days',A.days,B.days,''],
  ];
  let h='<hr style="border-color:var(--b);margin:14px 0"><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;font-size:12px;font-weight:700">'
    +'<div style="color:var(--bl)">Period A: '+a1+' → '+a2+' ('+A.days+'d)</div>'
    +'<div style="color:#10b981">Period B: '+b1+' → '+b2+' ('+B.days+'d)</div></div>'
    +'<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--t2)">'
    +'<th style="padding:6px 0;text-align:left">Metric</th><th style="text-align:right;color:var(--bl)">A</th><th style="text-align:right;color:#10b981">B</th><th style="text-align:right">vs A</th></tr></thead><tbody>';
  rows.forEach(([n,a,b,d])=>{
    h+='<tr style="border-top:1px solid var(--b)"><td style="padding:8px 0;color:var(--t2)">'+n+'</td>'
      +'<td style="text-align:right;color:var(--bl);font-weight:600">'+a+'</td>'
      +'<td style="text-align:right;color:#10b981;font-weight:600">'+b+'</td>'
      +'<td style="text-align:right">'+d+'</td></tr>';
  });
  h+='</tbody></table>';
  const el=document.getElementById('cmpResult');el.innerHTML=h;el.style.display='block';
}


// ── META DATE PRESET BAR ────────────────────────────────────────────────────────────
function metaSetPreset(p){
  const dates=Object.keys(_allDaily).sort();
  const today=dates[dates.length-1]||'2026-04-25';
  const pad=n=>String(n).padStart(2,'0');
  let from,to;const d=new Date(today);
  if(p==='today'){from=to=today;}
  else if(p==='yesterday'){const y=new Date(d);y.setDate(y.getDate()-1);from=to=[y.getFullYear(),pad(y.getMonth()+1),pad(y.getDate())].join('-');}
  else if(p==='7d'){const s=new Date(d);s.setDate(s.getDate()-6);from=[s.getFullYear(),pad(s.getMonth()+1),pad(s.getDate())].join('-');to=today;}
  else if(p==='14d'){const s=new Date(d);s.setDate(s.getDate()-13);from=[s.getFullYear(),pad(s.getMonth()+1),pad(s.getDate())].join('-');to=today;}
  else if(p==='mtd'){from=today.slice(0,7)+'-01';to=today;}
  else if(p==='all'){from=dates[0]||today;to=today;}
  const rf=document.getElementById('rangeFrom');const rt=document.getElementById('rangeTo');
  if(rf)rf.value=from;if(rt)rt.value=to;
  document.querySelectorAll('.meta-preset-btn').forEach(b=>b.classList.toggle('active',b.dataset.p===p));
  applyRange();
}

// ── DATE RANGE FILTER (overview) ────────────────────────────────────────────
function applyRange(){
  const from=document.getElementById('rangeFrom')?.value;
  const to=document.getElementById('rangeTo')?.value;
  if(!from||!to||from>to)return;
  document.getElementById('rangeLabel').textContent=from+' \u2192 '+to;
  // Update Age x Gender date label
  const demoLbl=document.getElementById('demo-date-label');
  if(demoLbl)demoLbl.textContent=from===to?from:from+' → '+to;
  // Recompute and update period KPI cards in sidebar
  const keys=Object.keys(_allDaily).filter(d=>d>=from&&d<=to);
  let sp=0,rev=0,pur=0;
  keys.forEach(d=>{const a=_allDaily[d]?.account||{};sp+=a.spend||0;rev+=a.revenue||0;pur+=a.purchases||0;});
  const roas=sp>0&&rev>0?rev/sp:0;
  const aov=pur>0?rev/pur:0;
  const cpr=pur>0?sp/pur:0;
  [['kv-spend','\u20B9'+parseInt(sp).toLocaleString('en-IN')],
   ['kv-revenue','\u20B9'+parseInt(rev).toLocaleString('en-IN')],
   ['kv-roas',roas.toFixed(2)+'x'],
   ['kv-purchases',pur.toLocaleString('en-IN')],
   ['kv-aov',aov>0?'\u20B9'+aov.toFixed(2):'—'],
   ['kv-cpr',cpr>0?'\u20B9'+parseInt(cpr).toLocaleString('en-IN'):'—']
  ].forEach(([id,val])=>{const el=document.getElementById(id);if(el)el.textContent=val;});  renderMetaCreatives(from, to);
  renderMetaCampaigns(from, to);
  renderMetaFunnel(from, to);
  updateHourlyVisibility(from, to);
  updateDeviceNote(from, to);
  renderMetaDemo(from, to);
  renderMetaAudience(from, to);

}

// ── THEME TOGGLE ─────────────────────────────────────────────────────────────
function toggleTheme() {
  const isLight = document.body.classList.toggle('light-mode');
  localStorage.setItem('rnx-theme', isLight ? 'light' : 'dark');
  document.getElementById('themeToggle').textContent = isLight ? '☀️' : '🌙';
}
(function initTheme(){
  const saved = localStorage.getItem('rnx-theme');
  if(saved === 'light'){ document.body.classList.add('light-mode'); const btn=document.getElementById('themeToggle'); if(btn)btn.textContent='☀️'; }
})();

// ── PASSWORD PROTECTION ──────────────────────────────────────────────────────
// SHA-256 hash of "revnox2026" — change password by updating this hash
const _PW_HASH = '09bfb3f7c47ed64ee34b54fca122cd41e1ebf7971ca40c8d8bd0bd4c0ac9657c';
async function sha256(msg){
  const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function checkLogin(){
  const pw=document.getElementById('pwInput').value;
  const err=document.getElementById('loginErr');
  if(!pw){err.textContent='Please enter your password';return;}
  const hash=await sha256(pw);
  if(hash===_PW_HASH){
    localStorage.setItem('rnx-auth',Date.now().toString());
    document.getElementById('loginOverlay').classList.add('hidden');
    err.textContent='';
  } else {
    err.textContent='Incorrect password. Please try again.';
    document.getElementById('pwInput').value='';
    document.getElementById('pwInput').focus();
  }
}
(function initAuth(){
  const ts=localStorage.getItem('rnx-auth');
  const TWELVE_HOURS=12*60*60*1000;
  if(ts && Date.now()-parseInt(ts)<TWELVE_HOURS){
    document.getElementById('loginOverlay').classList.add('hidden');
  }
  // Show overlay if not authed
})();

// ── AUTO-REFRESH every 5 minutes so dashboard stays live ────────────────────
setInterval(()=>{ window.location.reload(); }, 5*60*1000);


  // Amazon charts
  if(document.getElementById('chartAmzRoas')) {
    window._chartAmzRoas = new Chart(document.getElementById('chartAmzRoas'), { type:'line', data:{ labels:[], datasets:[{ label:'ROAS', data:[], borderColor:'#f59e0b', backgroundColor:'rgba(245,158,11,0.1)', tension:0.4, fill:true, pointRadius:3 }] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false} }, scales:{ y:{ ticks:{ callback:v=>v+'x' } } } } });
  }
  if(document.getElementById('chartAmzSpend')) {
    window._chartAmzSpend = new Chart(document.getElementById('chartAmzSpend'), { type:'bar', data:{ labels:[], datasets:[{ label:'Revenue', data:[], backgroundColor:'rgba(16,185,129,0.7)', borderRadius:3 },{ label:'Spend', data:[], backgroundColor:'rgba(99,102,241,0.5)', borderRadius:3 }] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:true} } } });
  }
  if(Object.keys(_allDailyAmzn).length > 0) { amzSetPreset('mtd'); }

// ── INIT ──────────────────────────────────────────────────────────────────────
// Default to Day Detail view (Overview tab removed)
switchView('day');
initStaticCharts();
metaSetPreset('mtd'); // Apply MTD filter on load
</script>
<!-- ── LOGIN OVERLAY ──────────────────────────────────────────────────── -->
<div id="loginOverlay">
  <div class="login-box">
    <div class="login-logo">
      <svg width="140" height="38" viewBox="0 0 200 52" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="lg2" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" style="stop-color:#ef4444"/><stop offset="100%" style="stop-color:#dc2626"/></linearGradient></defs>
        <text x="2" y="40" font-family="'Arial Black',Arial,sans-serif" font-weight="900" font-size="40" fill="white" letter-spacing="-1">REVN</text>
        <circle cx="147" cy="24" r="14" fill="none" stroke="url(#lg2)" stroke-width="3.5"/>
        <circle cx="147" cy="24" r="5" fill="#ef4444"/>
        <line x1="147" y1="6" x2="147" y2="42" stroke="#ef4444" stroke-width="2.5"/>
        <line x1="129" y1="24" x2="165" y2="24" stroke="#ef4444" stroke-width="2.5"/>
        <text x="163" y="40" font-family="'Arial Black',Arial,sans-serif" font-weight="900" font-size="40" fill="white" letter-spacing="-1">X</text>
        <path d="M183 38 L196 10 L184 14 M196 10 L192 22" stroke="#ef4444" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <div class="login-title">Media Dashboard</div>
    <div class="login-sub">Enter your access password to continue</div>
    <input class="login-inp" id="pwInput" type="password" placeholder="Password" onkeydown="if(event.key==='Enter')checkLogin()">
    <button class="login-btn" onclick="checkLogin()">🔐 Access Dashboard</button>
    <div class="login-err" id="loginErr"></div>
    <div class="login-hint">Session stays active for 12 hours</div>
  </div>
</div>

</body>
</html>`;

  fs.writeFileSync(outputPath, html, 'utf8');
  console.log(`✅ Dashboard saved: ${path.basename(outputPath)} (${Math.round(html.length/1024)}KB)`);
  return outputPath;
}

module.exports = { generateDashboard };
