// Market Data Dashboard - Real-time data from Yahoo Finance

/**
 * CORS-safe daily quote for stock cards (stocks.js). Uses corsproxy.io + Yahoo chart 1d.
 * @returns {{ na: true } | { na: false, name: string, price: number, change: number, changePercent: number, volume: number }}
 */
function buildYahooChartUrl(ticker) {
  return (
    'https://query1.finance.yahoo.com/v8/finance/chart/' +
    encodeURIComponent(ticker) +
    '?interval=1d&range=1d'
  );
}

function buildCorsProxyYahooChartUrl(ticker) {
  return (
    'https://corsproxy.io/?https://query1.finance.yahoo.com/v8/finance/chart/' +
    encodeURIComponent(ticker) +
    '?interval=1d&range=1d'
  );
}

function buildYahooQuoteV7Url(ticker) {
  return (
    'https://query1.finance.yahoo.com/v7/finance/quote?symbols=' +
    encodeURIComponent(ticker)
  );
}

/** Smaller Yahoo payload; often works when chart v8 fails through proxies. */
function parseV7Quote(data, ticker) {
  if (!data || data.error) return null;
  const r = data?.quoteResponse?.result?.[0];
  if (!r) return null;

  const prev =
    r.regularMarketPreviousClose != null
      ? Number(r.regularMarketPreviousClose)
      : NaN;

  let price = NaN;
  if (r.regularMarketPrice != null) price = Number(r.regularMarketPrice);
  else if (r.postMarketPrice != null) price = Number(r.postMarketPrice);
  else if (r.preMarketPrice != null) price = Number(r.preMarketPrice);

  if (Number.isNaN(price) && !Number.isNaN(prev) && r.regularMarketChange != null) {
    price = prev + Number(r.regularMarketChange);
  }
  if (Number.isNaN(price)) return null;

  let changePercent =
    r.regularMarketChangePercent != null ? Number(r.regularMarketChangePercent) : NaN;
  let change = r.regularMarketChange != null ? Number(r.regularMarketChange) : NaN;

  if (Number.isNaN(changePercent) && !Number.isNaN(prev) && prev !== 0) {
    changePercent = ((price - prev) / prev) * 100;
  }
  if (Number.isNaN(change) && !Number.isNaN(prev)) {
    change = price - prev;
  }
  // Yahoo sometimes omits previousClose but includes change; derive % from implied prior close.
  if (Number.isNaN(changePercent) && !Number.isNaN(change) && !Number.isNaN(price)) {
    const impliedPrev = price - change;
    if (!Number.isNaN(impliedPrev) && impliedPrev !== 0) {
      changePercent = (change / impliedPrev) * 100;
    }
  }
  if (Number.isNaN(changePercent)) {
    changePercent = 0;
    if (Number.isNaN(change)) change = 0;
  }

  return {
    na: false,
    name: r.shortName || r.longName || r.displayName || r.symbol || ticker,
    price,
    change: Number.isNaN(change) ? 0 : change,
    changePercent,
    volume: r.regularMarketVolume || 0
  };
}

function parseChartMetaToQuote(data, ticker) {
  if (!data || data.error) return null;
  const result = data?.chart?.result?.[0];
  if (!result) return null;
  const meta = result.meta;
  if (!meta) return null;

  const quote = result.indicators?.quote?.[0];
  const closes = quote?.close || [];
  let lastBarClose = null;
  for (let i = closes.length - 1; i >= 0; i--) {
    if (closes[i] != null && !Number.isNaN(Number(closes[i]))) {
      lastBarClose = Number(closes[i]);
      break;
    }
  }

  const rawPrev =
    meta.chartPreviousClose != null
      ? meta.chartPreviousClose
      : meta.previousClose != null
        ? meta.previousClose
        : meta.regularMarketPreviousClose != null
          ? meta.regularMarketPreviousClose
          : null;
  let previousClose =
    rawPrev != null && rawPrev !== '' ? Number(rawPrev) : NaN;

  const priceCandidate =
    meta.regularMarketPrice != null
      ? Number(meta.regularMarketPrice)
      : meta.postMarketPrice != null
        ? Number(meta.postMarketPrice)
        : meta.preMarketPrice != null
          ? Number(meta.preMarketPrice)
          : lastBarClose != null
            ? lastBarClose
            : NaN;

  if (Number.isNaN(previousClose) || previousClose === 0) {
    const idx = [];
    for (let i = 0; i < closes.length; i++) {
      if (closes[i] != null && !Number.isNaN(Number(closes[i]))) idx.push(i);
    }
    if (idx.length >= 2) {
      const prevBar = Number(closes[idx[idx.length - 2]]);
      if (!Number.isNaN(prevBar) && prevBar !== 0) previousClose = prevBar;
    }
  }

  if (
    Number.isNaN(priceCandidate) ||
    Number.isNaN(previousClose) ||
    previousClose === 0
  ) {
    return null;
  }

  const percentChange =
    ((priceCandidate - previousClose) / previousClose) * 100;
  const change = priceCandidate - previousClose;

  return {
    na: false,
    name: meta.longName || meta.shortName || meta.symbol || ticker,
    price: priceCandidate,
    change,
    changePercent: percentChange,
    volume: meta.regularMarketVolume || 0
  };
}

function isBadProxyPayload(data) {
  if (!data || typeof data !== 'object') return true;
  // corsproxy.io: { error: "..." }; Yahoo chart: { chart: { error: ... } } still has chart
  if (
    data.error &&
    !data.chart &&
    data.quoteResponse === undefined &&
    data.quoteSummary === undefined
  ) {
    return true;
  }
  return false;
}

/** Returns parsed JSON from Yahoo (any endpoint) or null. */
async function fetchJsonThroughProxies(url) {
  async function fetchWithTimeout(resourceUrl) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      return await fetch(resourceUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }
  }

  async function fromTextResponse(response) {
    if (!response.ok) return null;
    const text = await response.text();
    if (!text || text.trim().startsWith('<')) return null;
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return null;
    }
    if (isBadProxyPayload(data)) return null;
    return data;
  }

  const attempts = [
    async () => {
      const u = 'https://api.allorigins.win/get?url=' + encodeURIComponent(url);
      const response = await fetchWithTimeout(u);
      if (!response.ok) return null;
      const wrapped = await response.json();
      if (!wrapped || !wrapped.contents) return null;
      let data;
      try {
        data = JSON.parse(wrapped.contents);
      } catch (e) {
        return null;
      }
      if (isBadProxyPayload(data)) return null;
      return data;
    },
    async () => {
      const proxied = 'https://corsproxy.io/?' + encodeURIComponent(url);
      const response = await fetchWithTimeout(proxied);
      return fromTextResponse(response);
    },
    async () => {
      const thingproxy =
        'https://thingproxy.freeboard.io/fetch/' + encodeURIComponent(url);
      const response = await fetchWithTimeout(thingproxy);
      return fromTextResponse(response);
    },
    async () => {
      const proxyUrl =
        'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
      const response = await fetchWithTimeout(proxyUrl);
      return fromTextResponse(response);
    },
    async () => {
      const response = await fetchWithTimeout(url);
      return fromTextResponse(response);
    }
  ];

  for (const fn of attempts) {
    try {
      const data = await fn();
      if (data) return data;
    } catch (e) {
      /* next */
    }
  }
  return null;
}

/**
 * Same-origin FastAPI `/api/stocks/price/{symbol}` (yfinance). Works when the UI is served with the backend; no-op on static-only hosts.
 */
async function fetchDailyStockQuoteFromBackend(ticker) {
  try {
    const url = '/api/stocks/price/' + encodeURIComponent(ticker);
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const j = await res.json();
    const price = Number(j.price);
    if (Number.isNaN(price)) return null;
    const prev =
      j.previous_close != null && j.previous_close !== ''
        ? Number(j.previous_close)
        : NaN;
    let changePercent =
      j.change_percent != null ? Number(j.change_percent) : NaN;
    let change = j.change != null ? Number(j.change) : NaN;
    if (Number.isNaN(changePercent) && !Number.isNaN(prev) && prev !== 0) {
      changePercent = ((price - prev) / prev) * 100;
    }
    if (Number.isNaN(change) && !Number.isNaN(prev)) {
      change = price - prev;
    }
    if (Number.isNaN(changePercent) && !Number.isNaN(change) && !Number.isNaN(price)) {
      const impliedPrev = price - change;
      if (!Number.isNaN(impliedPrev) && impliedPrev !== 0) {
        changePercent = (change / impliedPrev) * 100;
      }
    }
    if (Number.isNaN(changePercent)) {
      changePercent = 0;
      if (Number.isNaN(change)) change = 0;
    }
    return {
      na: false,
      name: j.symbol || ticker,
      price,
      change: Number.isNaN(change) ? 0 : change,
      changePercent,
      volume: j.volume != null ? Number(j.volume) : 0
    };
  } catch (e) {
    return null;
  }
}

// ── Finnhub (fast, free, no CORS proxy needed) ──────────────────────────────
// Get your FREE API key at: https://finnhub.io/register (takes 30 seconds)
const FINNHUB_API_KEY = 'd7g4cehr01qqb8ria6r0d7g4cehr01qqb8ria6rg';

const FINNHUB_COMPANY_NAMES = {
  // Index ETFs
  'SPY':'S&P 500 ETF','DIA':'Dow Jones ETF','QQQ':'Nasdaq 100 ETF',
  'IWM':'Russell 2000 ETF','VXX':'Volatility ETF','GLD':'Gold ETF',
  // Stocks
  'AAPL':'Apple Inc.','MSFT':'Microsoft Corp.','NVDA':'NVIDIA Corp.',
  'GOOGL':'Alphabet Inc.','META':'Meta Platforms','AMZN':'Amazon.com',
  'TSLA':'Tesla Inc.','AMD':'Advanced Micro Devices','JPM':'JPMorgan Chase',
  'GS':'Goldman Sachs','V':'Visa Inc.','MA':'Mastercard','BLK':'BlackRock',
  'BAC':'Bank of America','XOM':'Exxon Mobil','CVX':'Chevron Corp.',
  'COP':'ConocoPhillips','SLB':'SLB (Schlumberger)','EOG':'EOG Resources',
  'OXY':'Occidental Petroleum','FCX':'Freeport-McMoRan','NEM':'Newmont Corp.',
  'BHP':'BHP Group','VALE':'Vale S.A.','GOLD':'Barrick Gold','ALB':'Albemarle',
  'LMT':'Lockheed Martin','RTX':'RTX Corp.','NOC':'Northrop Grumman',
  'BA':'Boeing Co.','GD':'General Dynamics','HII':'HII Inc.',
  'WMT':'Walmart Inc.','COST':'Costco Wholesale','HD':'Home Depot',
  'TGT':'Target Corp.','LOW':'Lowe\'s Companies'
};

async function fetchFinnhubQuote(ticker) {
  if (!FINNHUB_API_KEY || FINNHUB_API_KEY === 'YOUR_FINNHUB_API_KEY') return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      'https://finnhub.io/api/v1/quote?symbol=' + encodeURIComponent(ticker) + '&token=' + FINNHUB_API_KEY,
      { signal: controller.signal, headers: { Accept: 'application/json' } }
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const q = await res.json();
    const price = Number(q.c);
    const prev = Number(q.pc);
    if (!price || !prev) return null;
    const change = Number(q.d) || (price - prev);
    const changePercent = Number(q.dp) || (prev !== 0 ? ((change / prev) * 100) : 0);
    return {
      na: false,
      name: FINNHUB_COMPANY_NAMES[ticker.toUpperCase()] || ticker,
      price,
      change,
      changePercent,
      volume: Number(q.v) || 0
    };
  } catch (e) {
    return null;
  }
}
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Daily quote: Finnhub first (fast), then one corsproxy fallback.
 * Backend removed — site is GitHub Pages static only.
 */
async function fetchDailyStockQuote(ticker) {
  // 1. Finnhub — fastest, direct API, no CORS proxy
  const finnhub = await fetchFinnhubQuote(ticker);
  if (finnhub && !finnhub.na) return finnhub;

  // 2. Single corsproxy fallback (avoids the slow 5-proxy sequential chain)
  try {
    const response = await fetch(buildCorsProxyYahooChartUrl(ticker), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined
    });
    if (response.ok) {
      const data = await response.json();
      const chartOut = parseChartMetaToQuote(data, ticker);
      if (chartOut && !chartOut.na) return chartOut;
    }
  } catch (e) { /* ignore */ }

  return { na: true };
}

window.MarketData = window.MarketData || {};
window.MarketData.fetchDailyStockQuote = fetchDailyStockQuote;

// Using ETF proxies — Finnhub supports these directly without CORS proxies
const MARKET_INDICES = [
  { symbol: 'SPY',  name: 'S&P 500',      type: 'index' },
  { symbol: 'DIA',  name: 'Dow Jones',    type: 'index' },
  { symbol: 'QQQ',  name: 'Nasdaq 100',   type: 'index' },
  { symbol: 'IWM',  name: 'Russell 2000', type: 'index' },
  { symbol: 'VXX',  name: 'Volatility',   type: 'index' },
  { symbol: 'GLD',  name: 'Gold',         type: 'commodity' }
];

// Fetch market data using Finnhub (fast, no CORS proxy needed)
async function fetchMarketData(symbol) {
  const q = await fetchFinnhubQuote(symbol);
  if (q && !q.na) {
    return {
      symbol: symbol,
      name: q.name || symbol,
      price: q.price,
      change: q.change,
      changePercent: q.changePercent,
      prices: [] // mini chart not used for index cards
    };
  }
  throw new Error('Unable to fetch data for ' + symbol);
}

// Single shared fetch — all 3 sections (gainers, losers, active) reuse one batch
const MOVER_SYMBOLS = [
  'AAPL','MSFT','NVDA','GOOGL','META','AMZN','TSLA','AMD','JPM','V',
  'NFLX','CRM','ORCL','INTC','BAC','XOM','GS','MA','WMT','COST'
];

let _moverCache = null;
let _moverCacheTime = 0;
const MOVER_CACHE_MS = 5 * 60 * 1000; // 5 minutes — reduces API hammering

// Stagger requests 60ms apart to avoid bursting Finnhub's free-tier rate limit
async function fetchAllMovers() {
  const now = Date.now();
  if (_moverCache && now - _moverCacheTime < MOVER_CACHE_MS) return _moverCache;

  const results = [];
  for (let i = 0; i < MOVER_SYMBOLS.length; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, 60)); // 60ms stagger ≈ 16/sec, well under 60/min
    try {
      const r = await fetchMarketData(MOVER_SYMBOLS[i]);
      if (r) results.push(r);
    } catch (e) { /* skip failed symbol */ }
  }
  _moverCache = results;
  _moverCacheTime = now;
  return _moverCache;
}

async function fetchMarketMovers(type = 'gainers') {
  try {
    const stocks = await fetchAllMovers();
    if (type === 'gainers') return [...stocks].sort((a, b) => b.changePercent - a.changePercent).slice(0, 5);
    if (type === 'losers')  return [...stocks].sort((a, b) => a.changePercent - b.changePercent).slice(0, 5);
    if (type === 'active')  return [...stocks].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)).slice(0, 5);
    return stocks.slice(0, 5);
  } catch (e) {
    console.error('Error fetching market movers:', e);
    return [];
  }
}

// Update market indices section
async function updateMarketIndices() {
  const container = document.getElementById('marketIndices');
  if (!container) return;
  
  container.innerHTML = '<div class="market-loading">Loading market data...</div>';
  
  try {
    const indices = [];
    for (let i = 0; i < MARKET_INDICES.length; i++) {
      if (i > 0) await new Promise(r => setTimeout(r, 60));
      try {
        const d = await fetchMarketData(MARKET_INDICES[i].symbol);
        indices.push(d);
      } catch (e) {
        indices.push({ ...MARKET_INDICES[i], price: 0, change: 0, changePercent: 0, prices: [], error: true });
      }
    }
    
    container.innerHTML = indices.map(index => {
      if (index.error) {
        return `
          <div class="market-card error">
            <div class="market-name">${index.name}</div>
            <div class="market-price">Error</div>
          </div>
        `;
      }
      
      const isPositive = index.change >= 0;
      const miniChart = generateMiniChart(index.prices, isPositive);
      
      return `
        <div class="market-card">
          <div class="market-name">${index.name}</div>
          <div class="market-chart">${miniChart}</div>
          <div class="market-price">${index.price.toFixed(2)}</div>
          <div class="market-change ${isPositive ? 'positive' : 'negative'}">
            ${isPositive ? '+' : ''}${index.change.toFixed(2)} (${isPositive ? '+' : ''}${index.changePercent.toFixed(2)}%)
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Error updating market indices:', error);
    container.innerHTML = '<div class="market-loading">Unable to load market data</div>';
  }
}

// Generate mini chart SVG
function generateMiniChart(prices, isPositive) {
  if (!prices || prices.length < 2) {
    return '<svg width="60" height="20"><line x1="0" y1="10" x2="60" y2="10" stroke="currentColor" stroke-width="1"/></svg>';
  }
  
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const width = 60;
  const height = 20;
  const padding = 2;
  
  const points = prices.map((price, i) => {
    const x = (i / (prices.length - 1)) * (width - padding * 2) + padding;
    const y = height - padding - ((price - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');
  
  const color = isPositive ? '#10b981' : '#ef4444';
  
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
}

// Update top gainers
async function updateTopGainers() {
  const container = document.getElementById('topGainers');
  if (!container) return;
  
  container.innerHTML = '<div class="market-loading">Loading...</div>';
  
  try {
    const gainers = await fetchMarketMovers('gainers');
    container.innerHTML = gainers.map(stock => {
      const miniChart = generateMiniChart(stock.prices, true);
      return `
        <div class="mover-card">
          <div class="mover-info">
            <div class="mover-symbol">${stock.symbol}</div>
            <div class="mover-name">${stock.name}</div>
          </div>
          <div class="mover-chart">${miniChart}</div>
          <div class="mover-price">${stock.price.toFixed(2)}</div>
          <div class="mover-change positive">+${stock.change.toFixed(2)} (+${stock.changePercent.toFixed(2)}%)</div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Error updating top gainers:', error);
    container.innerHTML = '<div class="market-loading">Unable to load data</div>';
  }
}

// Update top losers
async function updateTopLosers() {
  const container = document.getElementById('topLosers');
  if (!container) return;
  
  container.innerHTML = '<div class="market-loading">Loading...</div>';
  
  try {
    const losers = await fetchMarketMovers('losers');
    container.innerHTML = losers.map(stock => {
      const miniChart = generateMiniChart(stock.prices, false);
      return `
        <div class="mover-card">
          <div class="mover-info">
            <div class="mover-symbol">${stock.symbol}</div>
            <div class="mover-name">${stock.name}</div>
          </div>
          <div class="mover-chart">${miniChart}</div>
          <div class="mover-price">${stock.price.toFixed(2)}</div>
          <div class="mover-change negative">${stock.change.toFixed(2)} (${stock.changePercent.toFixed(2)}%)</div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Error updating top losers:', error);
    container.innerHTML = '<div class="market-loading">Unable to load data</div>';
  }
}

// Update most active
async function updateMostActive() {
  const container = document.getElementById('mostActive');
  if (!container) return;
  
  container.innerHTML = '<div class="market-loading">Loading...</div>';
  
  try {
    const active = await fetchMarketMovers('active');
    container.innerHTML = active.map(stock => {
      const isPositive = stock.change >= 0;
      const miniChart = generateMiniChart(stock.prices, isPositive);
      return `
        <div class="mover-card">
          <div class="mover-info">
            <div class="mover-symbol">${stock.symbol}</div>
            <div class="mover-name">${stock.name}</div>
          </div>
          <div class="mover-chart">${miniChart}</div>
          <div class="mover-price">${stock.price.toFixed(2)}</div>
          <div class="mover-change ${isPositive ? 'positive' : 'negative'}">
            ${isPositive ? '+' : ''}${stock.change.toFixed(2)} (${isPositive ? '+' : ''}${stock.changePercent.toFixed(2)}%)
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Error updating most active:', error);
    container.innerHTML = '<div class="market-loading">Unable to load data</div>';
  }
}

// Initialize market dashboard — pre-fetch movers once, then render all 4 sections in parallel
(function initMarketDashboard() {
  function refreshAll() {
    // Don't clear _moverCache here — let the 5-min TTL handle expiry.
    // Running all 4 in sequence avoids a simultaneous burst of API calls.
    updateMarketIndices()
      .then(() => updateTopGainers())
      .then(() => updateTopLosers())
      .then(() => updateMostActive());
  }

  refreshAll();
  setInterval(refreshAll, 5 * 60 * 1000); // re-fetch every 5 minutes
})();

// Export for use in other pages (fetchDailyStockQuote was set earlier)
Object.assign(window.MarketData, {
  updateIndices: updateMarketIndices,
  updateGainers: updateTopGainers,
  updateLosers: updateTopLosers,
  updateActive: updateMostActive
});




