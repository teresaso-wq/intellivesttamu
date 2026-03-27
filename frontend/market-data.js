// Market Data Dashboard - Real-time data from Yahoo Finance
const MARKET_INDICES = [
  { symbol: 'ES=F', name: 'S&P Futures', type: 'futures' },
  { symbol: 'YM=F', name: 'Dow Futures', type: 'futures' },
  { symbol: 'NQ=F', name: 'Nasdaq Futures', type: 'futures' },
  { symbol: 'RTY=F', name: 'Russell 2000', type: 'futures' },
  { symbol: '^VIX', name: 'VIX', type: 'index' },
  { symbol: 'GC=F', name: 'Gold', type: 'commodity' }
];

// Fetch market data using Yahoo Finance API with CORS proxy
async function fetchMarketData(symbol) {
  const methods = [
    async () => {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d&includePrePost=false`;
      const response = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' }, mode: 'cors' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    },
    async () => {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d&includePrePost=false`;
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl, { method: 'GET', headers: { 'Accept': 'application/json' } });
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
      
      // Get price history for mini chart
      const closes = quote.close || [];
      const validPrices = closes.filter(p => p !== null && p !== undefined).slice(-20); // Last 20 data points
      
      return {
        symbol: symbol,
        name: meta.longName || symbol,
        price: currentPrice,
        change: change,
        changePercent: changePercent,
        prices: validPrices
      };
    } catch (error) {
      console.log(`Failed to fetch ${symbol}:`, error.message);
    }
  }
  throw new Error(`Unable to fetch data for ${symbol}`);
}

// Fetch top gainers/losers/most active
async function fetchMarketMovers(type = 'gainers') {
  // Yahoo Finance doesn't have a direct API for this, so we'll use a curated list of popular stocks
  const popularStocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'NFLX', 'AMD', 'INTC', 'CRM', 'ORCL'];
  
  try {
    const stockDataPromises = popularStocks.map(symbol => fetchMarketData(symbol).catch(() => null));
    const results = await Promise.all(stockDataPromises);
    const validStocks = results.filter(r => r !== null);
    
    // Sort by change percent
    if (type === 'gainers') {
      return validStocks.sort((a, b) => b.changePercent - a.changePercent).slice(0, 5);
    } else if (type === 'losers') {
      return validStocks.sort((a, b) => a.changePercent - b.changePercent).slice(0, 5);
    } else if (type === 'active') {
      // Sort by absolute change (volume proxy)
      return validStocks.sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 5);
    }
    return validStocks.slice(0, 5);
  } catch (error) {
    console.error('Error fetching market movers:', error);
    return [];
  }
}

// Update market indices section
async function updateMarketIndices() {
  const container = document.getElementById('marketIndices');
  if (!container) return;
  
  container.innerHTML = '<div class="market-loading">Loading market data...</div>';
  
  try {
    const indicesPromises = MARKET_INDICES.map(index => 
      fetchMarketData(index.symbol).catch(err => ({
        ...index,
        price: 0,
        change: 0,
        changePercent: 0,
        prices: [],
        error: true
      }))
    );
    
    const indices = await Promise.all(indicesPromises);
    
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

// Initialize market dashboard
(function initMarketDashboard() {
  // Update all sections
  updateMarketIndices();
  updateTopGainers();
  updateTopLosers();
  updateMostActive();
  
  // Refresh every 30 seconds
  setInterval(() => {
    updateMarketIndices();
    updateTopGainers();
    updateTopLosers();
    updateMostActive();
  }, 30000);
})();

// Export for use in other pages
window.MarketData = {
  updateIndices: updateMarketIndices,
  updateGainers: updateTopGainers,
  updateLosers: updateTopLosers,
  updateActive: updateMostActive
};




