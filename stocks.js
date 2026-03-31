// Enhanced Stock Analysis - Universal Search + Predefined Categories
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
const STOCK_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA'];
const STOCK_NAMES = {
  'AAPL': 'Apple Inc.', 'MSFT': 'Microsoft Corporation', 'GOOGL': 'Alphabet Inc.',
  'AMZN': 'Amazon.com Inc.', 'NVDA': 'NVIDIA Corporation', 'META': 'Meta Platforms Inc.',
  'TSLA': 'Tesla Inc.'
};

// Predefined category symbols (most active by sector - sorted by volume when displayed)
const CATEGORY_SYMBOLS = {
  technology: [
    'AAPL', 'MSFT', 'GOOGL', 'NVDA', 'META', 'AMD', 'AVGO', 'CRM', 'ORCL', 'ADBE', 'NFLX', 'CSCO'
  ],
  financials: [
    'JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'BLK', 'SCHW', 'AXP', 'USB', 'PNC', 'BK', 'TFC', 'COF', 'AIG', 'MET'
  ],
  energy: [
    'XOM', 'CVX', 'COP', 'SLB', 'EOG', 'MPC', 'PSX', 'VLO', 'OXY', 'KMI', 'HAL', 'DVN', 'BKR', 'FANG', 'APA', 'PXD'
  ],
  industrials: [
    'CAT', 'DE', 'UNP', 'UPS', 'RTX', 'LMT', 'GE', 'HON', 'BA', 'NOC', 'MMM', 'WM', 'ITW', 'ETN', 'PH', 'EMR'
  ],
  healthcare: [
    'UNH', 'JNJ', 'LLY', 'ABBV', 'MRK', 'TMO', 'PFE', 'CVS', 'AMGN', 'GILD', 'ISRG', 'BMY'
  ],
  'consumer-discretionary': [
    'AMZN', 'TSLA', 'HD', 'MCD', 'NKE', 'SBUX', 'LOW', 'BKNG', 'TGT', 'MAR', 'CMG', 'RCL', 'GM', 'F', 'ROST', 'ORLY'
  ],
  'consumer-staples': [
    'WMT', 'PG', 'KO', 'PEP', 'COST', 'PM', 'MO', 'CL', 'KMB', 'MDLZ', 'GIS', 'KHC', 'KR', 'HSY', 'ADM', 'EL'
  ],
  minerals: [
    'BHP', 'RIO', 'VALE', 'FCX', 'NEM', 'GOLD', 'AA', 'ALB', 'MP', 'TECK',
    'SCCO', 'HL', 'PAAS', 'AG', 'WPM', 'SBSW', 'UUUU', 'DNN', 'UEC', 'NG'
  ]
};

function getSymbolsForFilter(filterKey) {
  if (filterKey === 'all') {
    const set = new Set();
    [
      'technology',
      'energy',
      'financials',
      'healthcare',
      'industrials',
      'consumer-discretionary',
      'consumer-staples',
      'minerals'
    ].forEach(function (k) {
      (CATEGORY_SYMBOLS[k] || []).forEach(function (s) {
        set.add(s);
      });
    });
    return Array.from(set);
  }
  if (filterKey === 'finance') return CATEGORY_SYMBOLS.financials || [];
  if (filterKey === 'consumer') {
    const set = new Set([
      ...(CATEGORY_SYMBOLS['consumer-discretionary'] || []),
      ...(CATEGORY_SYMBOLS['consumer-staples'] || [])
    ]);
    return Array.from(set);
  }
  if (filterKey === 'technology') return CATEGORY_SYMBOLS.technology || [];
  if (filterKey === 'healthcare') return CATEGORY_SYMBOLS.healthcare || [];
  if (filterKey === 'energy') return CATEGORY_SYMBOLS.energy || [];
  if (filterKey === 'minerals') return CATEGORY_SYMBOLS.minerals || [];
  return [];
}

let stockChart = null;
let currentSymbol = '';
let currentTimeframe = '1D';
let currentFilter = 'all';
let analysisPanelOpen = false;
let lastChartStockData = null;
let stockCardObserver = null;
let refreshIntervalId = null;
let batchIsRunning = false;
const visibleCardSymbols = new Set();
const pendingCardSymbols = [];
const CARD_BATCH_SIZE = 5;
const BATCH_DELAY_MS = 300;
const REFRESH_INTERVAL_MS = 180000;

const PROXIES = [
  'https://api.allorigins.win/get?url=',
  'https://corsproxy.io/?',
  'https://thingproxy.freeboard.io/fetch/'
];

function getCachedStock(ticker) {
  try {
    const raw = localStorage.getItem('stock_' + ticker);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.data || !parsed.timestamp) return null;
    const fiveMinutes = 5 * 60 * 1000;
    if (Date.now() - parsed.timestamp < fiveMinutes) return parsed.data;
    return null;
  } catch (e) {
    return null;
  }
}

function setCachedStock(ticker, data) {
  try {
    localStorage.setItem(
      'stock_' + ticker,
      JSON.stringify({ data: data, timestamp: Date.now() })
    );
  } catch (e) {
    /* ignore quota errors */
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Daily % via market-data.js (Yahoo v7 quote + v8 chart fallbacks). */
async function fetchDailyChartQuote(symbol, forceRefresh = false) {
  if (!forceRefresh) {
    const cached = getCachedStock(symbol);
    if (cached) {
      return cached;
    }
  }
  const fetcher =
    typeof window.MarketData !== 'undefined' &&
    typeof window.MarketData.fetchDailyStockQuote === 'function'
      ? window.MarketData.fetchDailyStockQuote
      : null;
  if (!fetcher) {
    return {
      symbol,
      name: symbol,
      price: 0,
      change: 0,
      changePercent: NaN,
      volume: 0,
      error: true,
      percentNa: true
    };
  }
  const r = await fetcher(symbol);
  if (r.na) {
    return {
      symbol,
      name: symbol,
      price: 0,
      change: 0,
      changePercent: NaN,
      volume: 0,
      error: true,
      percentNa: true
    };
  }
  const out = {
    symbol,
    name: r.name,
    price: r.price,
    change: r.change,
    changePercent: r.changePercent,
    volume: r.volume,
    error: false
  };
  setCachedStock(symbol, out);
  return out;
}

function formatDailyPctHtml(stock) {
  if (stock.error || stock.percentNa || stock.changePercent == null || Number.isNaN(stock.changePercent)) {
    return { cls: 'pct-na', html: 'N/A' };
  }
  const isPositive = stock.change >= 0;
  const line =
    isPositive
      ? `▲ +${stock.changePercent.toFixed(2)}%`
      : `▼ ${stock.changePercent.toFixed(2)}%`;
  return { cls: isPositive ? 'positive' : 'negative', html: line };
}

function chartParamsForTimeframe(tf) {
  switch (tf) {
    case '1D':
      return { interval: '5m', range: '1d' };
    case '1W':
      return { interval: '1h', range: '5d' };
    case '1M':
      return { interval: '1d', range: '1mo' };
    case '3M':
      return { interval: '1d', range: '3mo' };
    case '6M':
      return { interval: '1d', range: '6mo' };
    case '1Y':
      return { interval: '1d', range: '1y' };
    default:
      return { interval: '1d', range: '1mo' };
  }
}

async function fetchWithFallback(url) {
  for (const proxy of PROXIES) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const response = await fetch(proxy + encodeURIComponent(url), {
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!response.ok) continue;

      if (proxy.includes('/get?url=')) {
        const wrapped = await response.json();
        if (!wrapped || !wrapped.contents) continue;
        return JSON.parse(wrapped.contents);
      }
      return await response.json();
    } catch (e) {
      /* try next proxy */
    }
  }
  return null;
}

/** Yahoo chart via corsproxy.io — used for analysis panel + chart ranges. */
async function fetchCorsChartStockData(symbol, timeframe) {
  const { interval, range } = chartParamsForTimeframe(timeframe);
  const yahooUrl =
    'https://query1.finance.yahoo.com/v8/finance/chart/' +
    encodeURIComponent(symbol) +
    '?interval=' +
    interval +
    '&range=' +
    range +
    '&includePrePost=false';
  const data = await fetchWithFallback(yahooUrl);
  if (!data) throw new Error('chart fetch failed');
  const result = data.chart?.result?.[0];
  if (!result) throw new Error('no chart data');
  const meta = result.meta;
  const quote = result.indicators?.quote?.[0];
  const timestamps = result.timestamp || [];
  const closes = quote?.close || [];
  const validData = [];
  for (let i = 0; i < timestamps.length; i++) {
    if (closes[i] != null && !Number.isNaN(Number(closes[i]))) {
      validData.push({ timestamp: timestamps[i], price: closes[i] });
    }
  }
  const lastPrice = validData.length ? validData[validData.length - 1].price : null;
  const currentPrice =
    meta.regularMarketPrice != null
      ? Number(meta.regularMarketPrice)
      : lastPrice != null
        ? Number(lastPrice)
        : NaN;
  const rawPrev = meta.previousClose != null ? meta.previousClose : meta.chartPreviousClose;
  const previousClose = rawPrev != null ? Number(rawPrev) : NaN;
  const change =
    !Number.isNaN(currentPrice) && !Number.isNaN(previousClose)
      ? currentPrice - previousClose
      : 0;
  const changePercent =
    !Number.isNaN(previousClose) && previousClose !== 0
      ? (change / previousClose) * 100
      : 0;
  return {
    symbol,
    name: meta.longName || meta.shortName || meta.symbol || symbol,
    price: currentPrice,
    change,
    changePercent,
    open: meta.regularMarketOpen != null ? Number(meta.regularMarketOpen) : previousClose,
    high: meta.regularMarketDayHigh != null ? Number(meta.regularMarketDayHigh) : null,
    low: meta.regularMarketDayLow != null ? Number(meta.regularMarketDayLow) : null,
    volume: meta.regularMarketVolume || 0,
    marketCap: meta.marketCap || 0,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh != null ? Number(meta.fiftyTwoWeekHigh) : null,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow != null ? Number(meta.fiftyTwoWeekLow) : null,
    trailingPE: meta.trailingPE != null ? Number(meta.trailingPE) : null,
    industry: meta.sector || meta.industry || '—',
    chartRangeScoped: true,
    timestamps: validData.map(d => d.timestamp),
    prices: validData.map(d => d.price)
  };
}

// API Cache - stores responses with configurable TTL
const apiCache = {
  data: new Map(),
  timestamps: new Map(),
  ttls: new Map(), // Store TTL per key
  defaultTTL: 5 * 60 * 1000, // 5 minutes default

  get(key) {
    const timestamp = this.timestamps.get(key);
    const ttl = this.ttls.get(key) || this.defaultTTL;
    if (timestamp && Date.now() - timestamp < ttl) {
      return this.data.get(key);
    }
    return null;
  },

  set(key, value, customTTL = null) {
    this.data.set(key, value);
    this.timestamps.set(key, Date.now());
    if (customTTL !== null) {
      this.ttls.set(key, customTTL);
    }
  },

  clear() {
    this.data.clear();
    this.timestamps.clear();
    this.ttls.clear();
  }
};

// Yahoo Finance search API - find any stock by name or ticker
async function searchYahooStocks(query) {
  if (!query || query.trim().length < 2) return [];
  const q = encodeURIComponent(query.trim());
  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${q}&quotesCount=15&newsCount=0`;
  try {
    const res = await fetch(CORS_PROXY + encodeURIComponent(url), {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) return [];
    const data = await res.json();
    const quotes = data?.quotes || [];
    return quotes
      .filter(q => q.quoteType === 'EQUITY' || q.quoteType === 'ETF' || q.quoteType === 'INDEX')
      .filter(q => q.symbol && !q.symbol.includes('.'))
      .slice(0, 12)
      .map(q => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        exchange: q.exchange || '',
        type: q.quoteType || ''
      }));
  } catch (e) {
    console.warn('Yahoo search failed:', e);
    return [];
  }
}

// Fetch extended financial data for filtering
async function fetchExtendedStockData(symbol, useCache = true) {
  const cacheKey = `extended_${symbol}`;
  if (useCache) {
    const cached = apiCache.get(cacheKey);
    if (cached) return cached;
  }

  try {
    // Fetch quoteSummary with multiple modules
    const summaryUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=summaryProfile,defaultKeyStatistics,financialData,earningsHistory,earningsTrend,recommendationTrend`;
    const proxySummaryUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(summaryUrl)}`;
    const summaryResponse = await fetch(proxySummaryUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!summaryResponse.ok) throw new Error('Summary fetch failed');

    const summaryData = await summaryResponse.json();
    const result = summaryData.quoteSummary?.result?.[0];
    if (!result) throw new Error('No data in result');

    // Get chart data for 1-year return calculation
    const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2y&includePrePost=false`;
    const proxyChartUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(chartUrl)}`;
    const chartResponse = await fetch(proxyChartUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    let oneYearReturn = null;
    if (chartResponse.ok) {
      const chartData = await chartResponse.json();
      const chartResult = chartData.chart?.result?.[0];
      if (chartResult) {
        const timestamps = chartResult.timestamp || [];
        const closes = chartResult.indicators?.quote?.[0]?.close || [];
        if (timestamps.length > 0 && closes.length > 0) {
          const oneYearAgo = Date.now() / 1000 - (365 * 24 * 60 * 60);
          const currentPrice = closes[closes.length - 1];
          let oneYearAgoPrice = null;
          
          for (let i = timestamps.length - 1; i >= 0; i--) {
            if (timestamps[i] <= oneYearAgo && closes[i] !== null && closes[i] !== undefined) {
              oneYearAgoPrice = closes[i];
              break;
            }
          }
          
          if (oneYearAgoPrice && oneYearAgoPrice > 0) {
            oneYearReturn = ((currentPrice - oneYearAgoPrice) / oneYearAgoPrice);
          }
        }
      }
    }

    const defaultKeyStats = result.defaultKeyStatistics || {};
    const financialData = result.financialData || {};
    const earningsTrend = result.earningsTrend || {};
    const summaryProfile = result.summaryProfile || {};

    // Extract metrics
    const extendedData = {
      symbol: symbol,
      averageVolume30Days: defaultKeyStats.averageDailyVolume10Day || defaultKeyStats.averageVolume || null,
      revenueGrowthYoY: financialData.revenueGrowth || null,
      earningsGrowthYoY: earningsTrend.trend?.[0]?.growth || null,
      forwardPE: defaultKeyStats.forwardPE || null,
      dividendYield: defaultKeyStats.dividendYield || summaryProfile.dividendYield || null,
      payoutRatio: defaultKeyStats.payoutRatio || null,
      oneYearReturn: oneYearReturn,
      volume: defaultKeyStats.averageVolume || null
    };

    if (useCache) {
      apiCache.set(cacheKey, extendedData);
    }

    return extendedData;
  } catch (error) {
    console.log(`Error fetching extended data for ${symbol}:`, error);
    return {
      symbol: symbol,
      averageVolume30Days: null,
      revenueGrowthYoY: null,
      earningsGrowthYoY: null,
      forwardPE: null,
      dividendYield: null,
      payoutRatio: null,
      oneYearReturn: null,
      volume: null
    };
  }
}

// Fetch S&P 500 benchmark return (cached for 24 hours)
async function fetchSP500Return(useCache = true) {
  const cacheKey = 'sp500_return';
  if (useCache) {
    const cached = apiCache.get(cacheKey);
    if (cached) return cached;
  }

  try {
    const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?interval=1d&range=2y&includePrePost=false`;
    const proxyChartUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(chartUrl)}`;
    const chartResponse = await fetch(proxyChartUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!chartResponse.ok) throw new Error('S&P 500 fetch failed');

    const chartData = await chartResponse.json();
    const chartResult = chartData.chart?.result?.[0];
    if (!chartResult) throw new Error('No S&P 500 data');

    const timestamps = chartResult.timestamp || [];
    const closes = chartResult.indicators?.quote?.[0]?.close || [];
    
    if (timestamps.length > 0 && closes.length > 0) {
      const oneYearAgo = Date.now() / 1000 - (365 * 24 * 60 * 60);
      const currentPrice = closes[closes.length - 1];
      let oneYearAgoPrice = null;
      
      for (let i = timestamps.length - 1; i >= 0; i--) {
        if (timestamps[i] <= oneYearAgo && closes[i] !== null && closes[i] !== undefined) {
          oneYearAgoPrice = closes[i];
          break;
        }
      }
      
      if (oneYearAgoPrice && oneYearAgoPrice > 0) {
        const returnValue = ((currentPrice - oneYearAgoPrice) / oneYearAgoPrice);
        // Cache for 24 hours
        apiCache.set(cacheKey, returnValue, 24 * 60 * 60 * 1000);
        return returnValue;
      }
    }
    
    throw new Error('Could not calculate S&P 500 return');
  } catch (error) {
    console.log('Error fetching S&P 500 return:', error);
    // Fallback to approximate S&P 500 average return (~10%)
    return 0.10;
  }
}

// Fetch stock data with caching
async function fetchStockData(symbol, useCache = true, options = {}) {
  const includeDetails = options.includeDetails !== false;
  const cacheKey = `stock_${symbol}_${includeDetails ? 'full' : 'fast'}`;
  // Check cache first
  if (useCache) {
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const methods = [
    async () => {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${includeDetails ? '1y' : '1mo'}&includePrePost=false&events=div%7Csplit%7Cearn&lang=en-US&region=US`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        mode: 'cors'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    },
    async () => {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${includeDetails ? '1y' : '1mo'}&includePrePost=false&events=div%7Csplit%7Cearn&lang=en-US&region=US`;
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    }
  ];

  for (let method of methods) {
    try {
      const data = await method();
      if (!data.chart || !data.chart.result || data.chart.result.length === 0) continue;
      
      const result = data.chart.result[0];
      const meta = result.meta;
      const quote = result.indicators.quote[0];
      
      const currentPrice = meta.regularMarketPrice || meta.previousClose || 0;
      const previousClose = meta.previousClose || currentPrice;
      const change = currentPrice - previousClose;
      const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;
      
      const timestamps = result.timestamp || [];
      const closes = quote.close || [];
      
      const validData = [];
      for (let i = 0; i < timestamps.length; i++) {
        if (closes[i] !== null && closes[i] !== undefined) {
          validData.push({ timestamp: timestamps[i], price: closes[i] });
        }
      }
      
      // Fetch additional details
      let marketCap = meta.marketCap || 0;
      let industry = meta.sector || meta.industry || 'N/A';
      let analystRating = meta.recommendationMean || null;
      
      // Try to get more details from quoteSummary only for full detail views
      if (includeDetails) {
        try {
          const summaryUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=summaryProfile,recommendationTrend`;
          const proxySummaryUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(summaryUrl)}`;
          const summaryResponse = await fetch(proxySummaryUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          });
          
          if (summaryResponse.ok) {
            const summaryData = await summaryResponse.json();
            const profile = summaryData.quoteSummary?.result?.[0]?.summaryProfile;
            if (profile) {
              industry = profile.industry || profile.sector || industry;
            }
            const recommendation = summaryData.quoteSummary?.result?.[0]?.recommendationTrend;
            if (recommendation?.trend) {
              const trends = recommendation.trend;
              const latest = trends[trends.length - 1];
              if (latest) {
                analystRating = latest.strongBuy || latest.buy || latest.hold || 'N/A';
              }
            }
          }
        } catch (e) {
          console.log('Could not fetch additional details:', e);
        }
      }
      
      const stockData = {
      symbol: symbol,
        name: STOCK_NAMES[symbol] || meta.longName || symbol,
        price: currentPrice,
      change: change,
      changePercent: changePercent,
        open: meta.regularMarketOpen || meta.previousClose || currentPrice,
        high: meta.regularMarketDayHigh || meta.previousClose || currentPrice,
        low: meta.regularMarketDayLow || meta.previousClose || currentPrice,
        volume: meta.regularMarketVolume || 0,
        marketCap: marketCap,
        industry: industry,
        analystRating: analystRating,
        chartRangeScoped: false,
        timestamps: validData.map(d => d.timestamp),
        prices: validData.map(d => d.price)
      };
      
      // Cache the result
      if (useCache) {
        apiCache.set(cacheKey, stockData, includeDetails ? 5 * 60 * 1000 : 10 * 60 * 1000);
      }
      return stockData;
    } catch (error) {
      console.log(`Method failed for ${symbol}:`, error.message);
    }
  }
  throw new Error(`Unable to fetch data for ${symbol}`);
}

// Reusable Stock Card Component
function createStockCard(stock, onClickHandler = null) {
  if (!stock) {
    return '';
  }
  const pct = formatDailyPctHtml(stock);
  const onClick = onClickHandler ? `onclick="selectStockFromCard('${stock.symbol}')"` : '';
  const priceLine =
    stock.error || !stock.price
      ? '—'
      : `$${stock.price.toFixed(2)}`;

  const selectedClass = currentSymbol && stock.symbol === currentSymbol ? ' stock-card-selected' : '';
  return `
    <div class="stock-card-category ${stock.error ? 'soft-error' : ''}${selectedClass}" ${onClick} data-symbol="${stock.symbol}">
      <div class="stock-card-header-category">
        <div class="stock-card-symbol">${stock.symbol}</div>
        <div class="stock-card-change ${pct.cls}">
          ${pct.html}
        </div>
      </div>
      <div class="stock-card-name-category">${stock.name || stock.symbol}</div>
      <div class="stock-card-price-category">${priceLine}</div>
    </div>
  `;
}

function createSkeletonCard(symbol) {
  return `
    <div class="stock-card-category stock-card-skeleton" data-symbol="${symbol}" onclick="selectStockFromCard('${symbol}')">
      <div class="skeleton skeleton-line skeleton-line-short"></div>
      <div class="skeleton skeleton-line skeleton-line-mid"></div>
      <div class="skeleton skeleton-line skeleton-line-price"></div>
    </div>
  `;
}

function renderLoadedCardIntoElement(el, stock) {
  const pct = formatDailyPctHtml(stock);
  const selectedClass = currentSymbol && stock.symbol === currentSymbol ? ' stock-card-selected' : '';
  const priceLine = stock.error || !stock.price ? '—' : `$${stock.price.toFixed(2)}`;
  el.className = `stock-card-category ${stock.error ? 'soft-error' : ''}${selectedClass}`;
  el.innerHTML = `
    <div class="stock-card-header-category">
      <div class="stock-card-symbol">${stock.symbol}</div>
      <div class="stock-card-change ${pct.cls}">${pct.html}</div>
    </div>
    <div class="stock-card-name-category">${stock.name || stock.symbol}</div>
    <div class="stock-card-price-category">${priceLine}</div>
  `;
}

async function loadAndRenderCardBySymbol(symbol, forceRefresh = false) {
  const container = document.getElementById('categoryStocks');
  if (!container) return;
  const card = container.querySelector(`.stock-card-category[data-symbol="${symbol}"]`);
  if (!card) return;
  const data = await fetchDailyChartQuote(symbol, forceRefresh).catch(() => ({
    symbol,
    name: symbol,
    price: 0,
    change: 0,
    changePercent: NaN,
    volume: 0,
    error: true,
    percentNa: true
  }));
  renderLoadedCardIntoElement(card, data);
}

async function fetchInBatches(tickers, batchSize = CARD_BATCH_SIZE, forceRefresh = false) {
  if (!tickers || tickers.length === 0) return;
  for (let i = 0; i < tickers.length; i += batchSize) {
    const batch = tickers.slice(i, i + batchSize);
    await Promise.all(batch.map(t => loadAndRenderCardBySymbol(t, forceRefresh)));
    if (i + batchSize < tickers.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }
}

function drainPendingBatches(forceRefresh = false) {
  if (batchIsRunning || pendingCardSymbols.length === 0) return;
  batchIsRunning = true;
  const symbols = Array.from(new Set(pendingCardSymbols.splice(0, pendingCardSymbols.length)));
  fetchInBatches(symbols, CARD_BATCH_SIZE, forceRefresh)
    .finally(() => {
      batchIsRunning = false;
      if (pendingCardSymbols.length > 0) {
        drainPendingBatches(forceRefresh);
      }
    });
}

function queueVisibleSymbol(symbol, forceRefresh = false) {
  if (!symbol) return;
  if (!pendingCardSymbols.includes(symbol)) pendingCardSymbols.push(symbol);
  drainPendingBatches(forceRefresh);
}

function setupCardIntersectionObserver() {
  if (stockCardObserver) stockCardObserver.disconnect();
  const cards = document.querySelectorAll('#categoryStocks .stock-card-category[data-symbol]');
  stockCardObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const sym = entry.target.dataset.symbol;
      if (!sym) return;
      if (entry.isIntersecting) {
        visibleCardSymbols.add(sym);
        queueVisibleSymbol(sym, false);
        stockCardObserver.unobserve(entry.target);
      }
    });
  }, { rootMargin: '100px 0px 150px 0px', threshold: 0.01 });
  cards.forEach(c => stockCardObserver.observe(c));
}

// Search for stocks - universal Yahoo Finance search
async function searchStock(query) {
  const resultsDiv = document.getElementById('searchResults');
  if (!query.trim()) {
    resultsDiv.innerHTML = '';
    window.lastStockSearchQuery = '';
    return;
  }
  window.lastStockSearchQuery = query.trim();
  resultsDiv.innerHTML = '<div class="search-loading">Searching Yahoo Finance...</div>';

  const suggestions = await searchYahooStocks(query);
  if (suggestions.length === 0) {
    resultsDiv.innerHTML = `<div class="search-error">No stocks found for "${query}". Try a ticker (e.g., AAPL) or company name.</div>`;
    return;
  }

  resultsDiv.innerHTML = '<div class="search-loading">Loading prices...</div>';
  const symbols = suggestions.map(s => s.symbol);
  const stockDataPromises = symbols.map(sym =>
    fetchDailyChartQuote(sym).then((d) => ({
      ...d,
      name: d.name && d.name !== sym ? d.name : (suggestions.find(q => q.symbol === sym)?.name || d.name)
    })).catch(() => ({ symbol: sym, name: suggestions.find(q => q.symbol === sym)?.name || sym, error: true }))
  );
  const stocks = await Promise.all(stockDataPromises);
  const valid = stocks.filter(s => !s.error && s.price > 0);
  if (valid.length === 0) {
    resultsDiv.innerHTML = `<div class="search-error">Found symbols but couldn't load data. Try: ${symbols.slice(0, 5).join(', ')}</div>`;
    return;
  }
  displaySearchResults(valid);
}

// Display multiple search results with price, % change, daily movement
function displaySearchResults(stocks) {
  const resultsDiv = document.getElementById('searchResults');
  resultsDiv.innerHTML = `
    <div class="search-results-header">Found ${stocks.length} stock(s)</div>
    <div class="search-results-grid">
      ${stocks.map(stock => {
        const pct = formatDailyPctHtml(stock);
        const move =
          stock.error || stock.percentNa || Number.isNaN(stock.change)
            ? '—'
            : `${stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)} today`;
        const moveCls =
          stock.error || stock.percentNa
            ? 'pct-na'
            : stock.change >= 0
              ? 'positive'
              : 'negative';
        return `
          <div class="search-result-card" onclick="selectStockFromSearch('${stock.symbol}')">
            <div class="search-result-card-header">
              <div class="search-result-symbol">${stock.symbol}</div>
              <span class="search-result-change ${pct.cls}">
                ${pct.html}
              </span>
            </div>
            <div class="search-result-name">${(stock.name || stock.symbol).slice(0, 35)}${(stock.name || '').length > 35 ? '…' : ''}</div>
            <div class="search-result-price">${stock.price > 0 ? `$${stock.price.toFixed(2)}` : '—'}</div>
            <div class="search-result-movement ${moveCls}">
              ${move}
            </div>
            <button class="btn primary btn-sm" onclick="event.stopPropagation(); selectStockFromSearch('${stock.symbol}')">View Details</button>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Format market cap
function formatMarketCap(marketCap) {
  if (!marketCap || marketCap === 0) return 'N/A';
  if (marketCap >= 1000000000000) {
    return '$' + (marketCap / 1000000000000).toFixed(2) + 'T';
  } else if (marketCap >= 1000000000) {
    return '$' + (marketCap / 1000000000).toFixed(2) + 'B';
  } else if (marketCap >= 1000000) {
    return '$' + (marketCap / 1000000).toFixed(2) + 'M';
  }
  return '$' + marketCap.toFixed(0);
}

// Load category stocks with dynamic filtering
async function loadCategoryStocks(filterKey) {
  currentFilter = filterKey;
  const container = document.getElementById('categoryStocks');
  if (!container) return;

  const symbols = getSymbolsForFilter(filterKey);
  visibleCardSymbols.clear();
  pendingCardSymbols.splice(0, pendingCardSymbols.length);

  if (symbols.length === 0) {
    container.innerHTML = '<div class="category-loading">No stocks available for this category right now.</div>';
    return;
  }

  container.innerHTML = symbols.map(sym => createSkeletonCard(sym)).join('');
  setupCardIntersectionObserver();
}

function openAnalysisPanel() {
  const panel = document.getElementById('stockAnalysisPanel');
  const hint = document.getElementById('stockSelectionHint');
  const body = document.getElementById('analysisPanelBody');
  if (panel) panel.classList.add('is-open');
  if (hint) hint.classList.add('is-hidden');
  if (body) body.hidden = false;
  if (panel || body) analysisPanelOpen = true;
}

function closeAnalysisPanel() {
  const panel = document.getElementById('stockAnalysisPanel');
  const hint = document.getElementById('stockSelectionHint');
  const body = document.getElementById('analysisPanelBody');
  if (panel) panel.classList.remove('is-open');
  if (hint) hint.classList.remove('is-hidden');
  if (body) body.hidden = true;
  analysisPanelOpen = false;
  currentSymbol = '';
  highlightSelectedStockCard(null);
  const stockSelect = document.getElementById('stockSelect');
  if (stockSelect) stockSelect.value = '';
  lastChartStockData = null;
  if (stockChart) {
    stockChart.destroy();
    stockChart = null;
  }
}

// Select stock from card or search
window.selectStockFromCard = function(symbol) {
  if (!symbol) return;
  if (currentSymbol === symbol && analysisPanelOpen) {
    closeAnalysisPanel();
    return;
  }
  currentSymbol = symbol;
  highlightSelectedStockCard(symbol);
  const stockSelect = document.getElementById('stockSelect');
  if (stockSelect) stockSelect.value = symbol;
  openAnalysisPanel();
  updateStockDetails(symbol);
};

window.selectStockFromSearch = function(symbol) {
  if (!symbol) return;
  currentSymbol = symbol;
  highlightSelectedStockCard(symbol);
  const stockSelect = document.getElementById('stockSelect');
  if (stockSelect) stockSelect.value = symbol;
  openAnalysisPanel();
  updateStockDetails(symbol);
};

function highlightSelectedStockCard(symbol) {
  const cards = document.querySelectorAll('.stock-card-category[data-symbol]');
  cards.forEach(card => {
    if (symbol && card.dataset.symbol === symbol) card.classList.add('stock-card-selected');
    else card.classList.remove('stock-card-selected');
  });
}

// Update stock details (Yahoo chart via corsproxy.io)
async function updateStockDetails(symbol) {
  if (!symbol) return;
  currentSymbol = symbol;

  const priceElement = document.getElementById('stockPrice');
  if (priceElement) priceElement.textContent = 'Loading…';

  try {
    const stockData = await fetchCorsChartStockData(symbol, currentTimeframe);
    lastChartStockData = stockData;

    const nameElement = document.getElementById('selectedStockName');
    const symbolElement = document.getElementById('selectedStockSymbol');
    const priceEl = document.getElementById('stockPrice');

    if (nameElement) nameElement.textContent = stockData.name;
    if (symbolElement) symbolElement.textContent = stockData.symbol;
    if (priceEl && !Number.isNaN(stockData.price)) priceEl.textContent = `$${stockData.price.toFixed(2)}`;

    const isPositive = stockData.change >= 0;
    const changeElement = document.getElementById('priceChange');
    if (changeElement) {
      changeElement.textContent = `${isPositive ? '▲' : '▼'} ${isPositive ? '+' : ''}${stockData.change.toFixed(2)} (${isPositive ? '+' : ''}${stockData.changePercent.toFixed(2)}%)`;
      changeElement.className = `price-change ${isPositive ? 'positive' : 'negative'}`;
    }

    const marketCapEl = document.getElementById('statMarketCap');
    const volumeEl = document.getElementById('statVolume');
    const hi52 = document.getElementById('stat52High');
    const lo52 = document.getElementById('stat52Low');
    const peEl = document.getElementById('statPE');

    if (marketCapEl) marketCapEl.textContent = formatMarketCap(stockData.marketCap);
    if (volumeEl) volumeEl.textContent = formatVolume(stockData.volume || 0);
    if (hi52) {
      hi52.textContent =
        stockData.fiftyTwoWeekHigh != null && !Number.isNaN(stockData.fiftyTwoWeekHigh)
          ? `$${stockData.fiftyTwoWeekHigh.toFixed(2)}`
          : '—';
    }
    if (lo52) {
      lo52.textContent =
        stockData.fiftyTwoWeekLow != null && !Number.isNaN(stockData.fiftyTwoWeekLow)
          ? `$${stockData.fiftyTwoWeekLow.toFixed(2)}`
          : '—';
    }
    if (peEl) {
      peEl.textContent =
        stockData.trailingPE != null && !Number.isNaN(stockData.trailingPE)
          ? stockData.trailingPE.toFixed(2)
          : 'N/A';
    }

    const chartPlaceholder = document.getElementById('stockChartPlaceholder');
    if (chartPlaceholder) chartPlaceholder.style.display = 'none';
    updateChart(stockData);
  } catch (error) {
    console.error('Error updating stock details:', error);
    const priceEl = document.getElementById('stockPrice');
    if (priceEl) priceEl.textContent = 'Error';
    alert(`Unable to load data for ${symbol}. Please try again later.`);
  }
}

// Update chart based on timeframe
function updateChart(stockData) {
  const ctx = document.getElementById('stockChart');
  if (!ctx || typeof Chart === 'undefined') return;
  
  if (!stockData.timestamps || !stockData.prices || stockData.timestamps.length === 0) {
    console.error('No valid chart data available');
    return;
  }
  
  let dataPoints = [];
  let labels = [];
  
  const timestamps = stockData.timestamps;
  const prices = stockData.prices;

  let filteredData = timestamps.map((ts, i) => ({ ts, price: prices[i] }))
    .filter(item => item.price !== null && item.price !== undefined && !isNaN(item.price));

  if (!stockData.chartRangeScoped) {
    const now = Date.now() / 1000;
    let daysBack = 1;
    switch (currentTimeframe) {
      case '1D': daysBack = 1; break;
      case '1W': daysBack = 7; break;
      case '1M': daysBack = 30; break;
      case '3M': daysBack = 90; break;
      case '6M': daysBack = 180; break;
      case '1Y': daysBack = 365; break;
    }
    const cutoffTime = now - daysBack * 86400;
    filteredData = filteredData.filter(item => item.ts >= cutoffTime);
  }
  
  if (filteredData.length === 0) {
    console.error('No data points after filtering');
    return;
  }
  
  labels = filteredData.map(item => {
    const date = new Date(item.ts * 1000);
    if (currentTimeframe === '1D') {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  });
  
  dataPoints = filteredData.map(item => item.price);
  
  const isPositive = stockData.change >= 0;
  const chartColor = isPositive ? '#10b981' : '#ef4444';
  
  if (stockChart) {
    stockChart.destroy();
  }
  
  stockChart = new Chart(ctx, {
      type: 'line',
      data: {
      labels: labels,
        datasets: [{
        label: stockData.symbol,
        data: dataPoints,
        borderColor: chartColor,
        backgroundColor: chartColor + '20',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
        legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleFont: { size: 14, weight: '600' },
          bodyFont: { size: 13 },
          callbacks: {
            label: function(context) {
              return `$${context.parsed.y.toFixed(2)}`;
            }
          }
          }
        },
        scales: {
          x: {
          grid: { display: false },
          ticks: { maxTicksLimit: 8, font: { size: 11 } }
          },
          y: {
          grid: { color: 'rgba(0, 0, 0, 0.05)' },
          ticks: {
            callback: function(value) {
              return '$' + value.toFixed(0);
            },
            font: { size: 11 }
            }
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      }
    });
  }

// Format volume
function formatVolume(volume) {
  if (volume >= 1000000000) {
    return (volume / 1000000000).toFixed(2) + 'B';
  } else if (volume >= 1000000) {
    return (volume / 1000000).toFixed(2) + 'M';
  } else if (volume >= 1000) {
    return (volume / 1000).toFixed(2) + 'K';
  }
  return volume.toString();
}

function showEmptyChartState() {
  closeAnalysisPanel();
  const chartPlaceholder = document.getElementById('stockChartPlaceholder');
  if (chartPlaceholder) chartPlaceholder.style.display = 'block';
  if (stockChart) {
    stockChart.destroy();
    stockChart = null;
  }
}

function refreshVisibleCards() {
  if (document.hidden) return;
  const symbols = Array.from(visibleCardSymbols);
  if (symbols.length === 0) return;
  symbols.forEach(sym => queueVisibleSymbol(sym, true));
}

function startRefresh() {
  if (refreshIntervalId) return;
  refreshIntervalId = setInterval(refreshVisibleCards, REFRESH_INTERVAL_MS);
}

function stopRefresh() {
  if (!refreshIntervalId) return;
  clearInterval(refreshIntervalId);
  refreshIntervalId = null;
}

// Update stock ticker
async function updateStockTicker() {
  const tickerContainer = document.getElementById('stocksTicker');
  if (!tickerContainer) return;
  
  tickerContainer.innerHTML = '<div class="ticker-loading">Loading stocks...</div>';
  
  try {
    const stockDataPromises = STOCK_SYMBOLS.map(async (symbol) => {
      try {
        return await fetchDailyChartQuote(symbol);
      } catch (error) {
        console.error(`Failed to load ${symbol}:`, error);
        return {
          symbol: symbol,
          name: STOCK_NAMES[symbol] || symbol,
          price: 0,
          change: 0,
          changePercent: NaN,
          error: true,
          percentNa: true
        };
      }
    });
    
    const stocksData = await Promise.all(stockDataPromises);
    
    tickerContainer.innerHTML = stocksData.map(stock => {
      const pct = formatDailyPctHtml(stock);
      const priceLine = stock.error || !stock.price ? '—' : `$${stock.price.toFixed(2)}`;
      return `
        <div class="stock-card ${stock.error ? 'soft-error' : ''}" data-symbol="${stock.symbol}">
          <div class="stock-card-header">
            <div class="stock-card-symbol">${stock.symbol}</div>
            <div class="stock-card-change ${pct.cls}">
              ${pct.html}
            </div>
          </div>
          <div class="stock-card-price">${priceLine}</div>
          <div class="stock-card-name">${stock.name}</div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Error updating stock ticker:', error);
    tickerContainer.innerHTML = '<div class="ticker-loading">Unable to load stock data. Please refresh the page.</div>';
  }
}

// Initialize stocks page
(function initStocksPage() {
  const stockSelect = document.getElementById('stockSelect');
  const timeframeButtons = document.querySelectorAll('.timeframe-btn');
  const tickerContainer = document.getElementById('stocksTicker');
  const searchInput = document.getElementById('stockSearchInput');
  const searchBtn = document.getElementById('searchStockBtn');
  const filterTabs = document.querySelectorAll('#stockFilterTabs .category-tab');

  // Timeframe buttons — refetch chart range via corsproxy
  if (timeframeButtons.length > 0) {
    timeframeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        timeframeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTimeframe = btn.dataset.timeframe;
        if (currentSymbol) {
          updateStockDetails(currentSymbol);
        }
      });
    });
  }

  // Category filter tabs
  if (filterTabs.length > 0) {
    filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        closeAnalysisPanel();
        loadCategoryStocks(tab.dataset.filter);
      });
    });
  }

  const addWl = document.getElementById('addToWatchlistBtn');
  if (addWl) {
    addWl.addEventListener('click', () => {
      const sym = currentSymbol;
      if (!sym) return;
      let wl = [];
      try {
        wl = JSON.parse(localStorage.getItem('intellivest_watchlist') || '[]');
      } catch (e) {
        wl = [];
      }
      if (!Array.isArray(wl)) wl = [];
      if (!wl.includes(sym)) {
        wl.push(sym);
        localStorage.setItem('intellivest_watchlist', JSON.stringify(wl));
      }
      const prev = addWl.textContent;
      addWl.textContent = 'Added ✓';
      setTimeout(() => {
        addWl.textContent = prev;
      }, 1600);
    });
  }

  // Search functionality
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      const query = searchInput.value.trim();
      if (query) {
        searchStock(query);
      }
    });
  }
  
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
          searchStock(query);
        }
      }
    });
  }
  
  if (stockSelect) {
    const urlParams = new URLSearchParams(window.location.search);
    const symbolParam = urlParams.get('symbol');
    if (symbolParam) {
      const sym = symbolParam.toUpperCase();
      stockSelect.value = sym;
      openAnalysisPanel();
      currentSymbol = sym;
      highlightSelectedStockCard(sym);
      updateStockDetails(sym);
    } else {
      stockSelect.value = '';
    }
  }

  loadCategoryStocks('all');
  startRefresh();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopRefresh();
    else {
      startRefresh();
      refreshVisibleCards();
    }
  });
  
  // Update ticker if container exists
  if (tickerContainer) {
    updateStockTicker();
    setInterval(() => {
      if (!document.hidden) updateStockTicker();
    }, REFRESH_INTERVAL_MS);
    
    tickerContainer.addEventListener('click', (e) => {
      const stockCard = e.target.closest('.stock-card');
      if (stockCard && !stockCard.classList.contains('error')) {
        const symbol = stockCard.dataset.symbol;
        window.location.href = `./stocks.html?symbol=${symbol}`;
      }
    });
  }
})();

// Export for use in other pages
window.StockTicker = {
  update: updateStockTicker,
  fetchData: fetchStockData,
  fetchDaily: fetchDailyChartQuote
};

