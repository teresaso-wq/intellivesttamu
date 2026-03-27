// Enhanced Stock Analysis - Modular with Search, Categories, and Caching
const STOCK_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA'];
const STOCK_NAMES = {
  'AAPL': 'Apple Inc.',
  'MSFT': 'Microsoft Corporation',
  'GOOGL': 'Alphabet Inc.',
  'AMZN': 'Amazon.com Inc.',
  'NVDA': 'NVIDIA Corporation',
  'META': 'Meta Platforms Inc.',
  'TSLA': 'Tesla Inc.'
};

// Stock categories with curated lists
const STOCK_CATEGORIES = {
  'most-active': ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'NFLX', 'AMD', 'INTC', 'CRM', 'ORCL'],
  'high-growth': ['NVDA', 'AMD', 'TSLA', 'META', 'NFLX', 'SNOW', 'CRWD', 'ZM', 'DOCN', 'UPST', 'RBLX', 'HOOD'],
  'dividend': ['AAPL', 'MSFT', 'JNJ', 'PG', 'KO', 'PEP', 'VZ', 'T', 'XOM', 'CVX', 'JPM', 'BAC'],
  'outperform': ['NVDA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'AMD', 'NFLX', 'CRM', 'ADBE', 'AVGO']
};

let stockChart = null;
let currentSymbol = 'AAPL';
let currentTimeframe = '1D';
let currentCategory = 'most-active';

// API Cache - stores responses for 5 minutes
const apiCache = {
  data: new Map(),
  timestamps: new Map(),
  TTL: 5 * 60 * 1000, // 5 minutes

  get(key) {
    const timestamp = this.timestamps.get(key);
    if (timestamp && Date.now() - timestamp < this.TTL) {
      return this.data.get(key);
    }
    return null;
  },

  set(key, value) {
    this.data.set(key, value);
    this.timestamps.set(key, Date.now());
  },

  clear() {
    this.data.clear();
    this.timestamps.clear();
  }
};

// Fetch stock data with caching
async function fetchStockData(symbol, useCache = true) {
  // Check cache first
  if (useCache) {
    const cached = apiCache.get(`stock_${symbol}`);
    if (cached) {
      return cached;
    }
  }

  const methods = [
    async () => {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1y&includePrePost=false&events=div%7Csplit%7Cearn&lang=en-US&region=US`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        mode: 'cors'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    },
    async () => {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1y&includePrePost=false&events=div%7Csplit%7Cearn&lang=en-US&region=US`;
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
      
      // Try to get more details from quoteSummary
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
        timestamps: validData.map(d => d.timestamp),
        prices: validData.map(d => d.price)
      };
      
      // Cache the result
      if (useCache) {
        apiCache.set(`stock_${symbol}`, stockData);
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
  if (!stock || stock.error) {
    return `
      <div class="stock-card-category error">
        <div class="stock-card-symbol">${stock?.symbol || 'N/A'}</div>
        <div class="stock-card-price">Error</div>
      </div>
    `;
  }
  
  const isPositive = stock.change >= 0;
  const onClick = onClickHandler ? `onclick="selectStockFromCard('${stock.symbol}')"` : '';
  
  return `
    <div class="stock-card-category" ${onClick} data-symbol="${stock.symbol}">
      <div class="stock-card-header-category">
        <div class="stock-card-symbol">${stock.symbol}</div>
        <div class="stock-card-change ${isPositive ? 'positive' : 'negative'}">
          ${isPositive ? '+' : ''}${stock.changePercent.toFixed(2)}%
        </div>
      </div>
      <div class="stock-card-name-category">${stock.name}</div>
      <div class="stock-card-price-category">$${stock.price.toFixed(2)}</div>
    </div>
  `;
}

// Search for stocks
async function searchStock(query) {
  const upperQuery = query.trim().toUpperCase();
  const resultsDiv = document.getElementById('searchResults');
  
  if (!query.trim()) {
    resultsDiv.innerHTML = '';
    return;
  }
  
  resultsDiv.innerHTML = '<div class="search-loading">Searching...</div>';
  
  // Check if it's a known symbol
  if (STOCK_NAMES[upperQuery]) {
    try {
      const stockData = await fetchStockData(upperQuery);
      displaySearchResult(stockData);
    } catch (error) {
      resultsDiv.innerHTML = `<div class="search-error">Unable to find stock: ${query}</div>`;
    }
    return;
  }
  
  // Try to search by symbol directly
  try {
    const stockData = await fetchStockData(upperQuery);
    displaySearchResult(stockData);
  } catch (error) {
    // Search in known stocks by name
    const matches = Object.entries(STOCK_NAMES).filter(([symbol, name]) => 
      name.toLowerCase().includes(query.toLowerCase()) || symbol.includes(upperQuery)
    );
    
    if (matches.length > 0) {
      try {
        const stockData = await fetchStockData(matches[0][0]);
        displaySearchResult(stockData);
      } catch (error) {
        resultsDiv.innerHTML = `<div class="search-error">Stock found but unable to load data. Try: ${matches.map(m => m[0]).join(', ')}</div>`;
      }
    } else {
      resultsDiv.innerHTML = `<div class="search-error">No stock found matching "${query}". Try searching by ticker symbol (e.g., AAPL, MSFT).</div>`;
    }
  }
}

// Display search result
function displaySearchResult(stock) {
  const resultsDiv = document.getElementById('searchResults');
  const isPositive = stock.change >= 0;
  
  resultsDiv.innerHTML = `
    <div class="search-result-card">
      <div class="search-result-header">
        <div>
          <h3>${stock.name}</h3>
          <div class="search-result-symbol">${stock.symbol}</div>
        </div>
        <button class="btn primary" onclick="selectStockFromSearch('${stock.symbol}')">View Details</button>
      </div>
      <div class="search-result-details">
        <div class="search-result-item">
          <span class="label">Current Price:</span>
          <span class="value">$${stock.price.toFixed(2)}</span>
        </div>
        <div class="search-result-item">
          <span class="label">Daily Change:</span>
          <span class="value ${isPositive ? 'positive' : 'negative'}">
            ${isPositive ? '+' : ''}${stock.change.toFixed(2)} (${isPositive ? '+' : ''}${stock.changePercent.toFixed(2)}%)
          </span>
        </div>
        <div class="search-result-item">
          <span class="label">Market Cap:</span>
          <span class="value">${formatMarketCap(stock.marketCap)}</span>
        </div>
        <div class="search-result-item">
          <span class="label">Industry:</span>
          <span class="value">${stock.industry}</span>
        </div>
        <div class="search-result-item">
          <span class="label">Analyst Rating:</span>
          <span class="value">${stock.analystRating || 'N/A'}</span>
        </div>
      </div>
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

// Load category stocks
async function loadCategoryStocks(category) {
  currentCategory = category;
  const container = document.getElementById('categoryStocks');
  if (!container) return;
  
  container.innerHTML = '<div class="category-loading">Loading stocks...</div>';
  
  const symbols = STOCK_CATEGORIES[category] || [];
  
  try {
    const stockDataPromises = symbols.map(symbol => 
      fetchStockData(symbol).catch(err => ({
        symbol: symbol,
        name: STOCK_NAMES[symbol] || symbol,
        price: 0,
        change: 0,
        changePercent: 0,
        error: true
      }))
    );
    
    const stocks = await Promise.all(stockDataPromises);
    
    container.innerHTML = stocks.map(stock => createStockCard(stock, true)).join('');
  } catch (error) {
    console.error('Error loading category stocks:', error);
    container.innerHTML = '<div class="category-loading">Unable to load stocks. Please try again.</div>';
  }
}

// Select stock from card or search
window.selectStockFromCard = function(symbol) {
  document.getElementById('stockSelect').value = symbol;
  updateStockDetails(symbol);
  // Scroll to analysis section
  document.querySelector('.stocks-analysis-section').scrollIntoView({ behavior: 'smooth' });
};

window.selectStockFromSearch = function(symbol) {
  document.getElementById('stockSelect').value = symbol;
  updateStockDetails(symbol);
  // Scroll to analysis section
  document.querySelector('.stocks-analysis-section').scrollIntoView({ behavior: 'smooth' });
};

// Update stock details (enhanced version)
async function updateStockDetails(symbol) {
  currentSymbol = symbol;
  
  const priceElement = document.getElementById('stockPrice');
  if (priceElement) priceElement.textContent = 'Loading...';
  
  try {
    const stockData = await fetchStockData(symbol);
    
    const nameElement = document.getElementById('selectedStockName');
    const symbolElement = document.getElementById('selectedStockSymbol');
    const priceEl = document.getElementById('stockPrice');
    
    if (nameElement) nameElement.textContent = stockData.name;
    if (symbolElement) symbolElement.textContent = stockData.symbol;
    if (priceEl) priceEl.textContent = `$${stockData.price.toFixed(2)}`;
    
    const isPositive = stockData.change >= 0;
    const changeElement = document.getElementById('priceChange');
    if (changeElement) {
      changeElement.textContent = `${isPositive ? '+' : ''}${stockData.change.toFixed(2)} (${isPositive ? '+' : ''}${stockData.changePercent.toFixed(2)}%)`;
      changeElement.className = `price-change ${isPositive ? 'positive' : 'negative'}`;
    }
    
    // Update all stats
    const marketCapEl = document.getElementById('statMarketCap');
    const industryEl = document.getElementById('statIndustry');
    const openEl = document.getElementById('statOpen');
    const highEl = document.getElementById('statHigh');
    const lowEl = document.getElementById('statLow');
    const volumeEl = document.getElementById('statVolume');
    const ratingEl = document.getElementById('statRating');
    
    if (marketCapEl) marketCapEl.textContent = formatMarketCap(stockData.marketCap);
    if (industryEl) industryEl.textContent = stockData.industry;
    if (openEl) openEl.textContent = `$${stockData.open.toFixed(2)}`;
    if (highEl) highEl.textContent = `$${stockData.high.toFixed(2)}`;
    if (lowEl) lowEl.textContent = `$${stockData.low.toFixed(2)}`;
    if (volumeEl) volumeEl.textContent = formatVolume(stockData.volume);
    if (ratingEl) ratingEl.textContent = stockData.analystRating || 'N/A';
    
    // Update chart
    updateChart(stockData);
  } catch (error) {
    console.error('Error updating stock details:', error);
    const priceEl = document.getElementById('stockPrice');
    if (priceEl) priceEl.textContent = 'Error loading data';
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
  
  const now = Date.now() / 1000;
  let daysBack = 1;
  
  switch (currentTimeframe) {
    case '1D': daysBack = 1; break;
    case '1W': daysBack = 7; break;
    case '1M': daysBack = 30; break;
    case '3M': daysBack = 90; break;
    case '1Y': daysBack = 365; break;
  }
  
  const cutoffTime = now - (daysBack * 86400);
  const filteredData = timestamps.map((ts, i) => ({ ts, price: prices[i] }))
    .filter(item => item.ts >= cutoffTime && item.price !== null && item.price !== undefined && !isNaN(item.price));
  
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

// Update stock ticker
async function updateStockTicker() {
  const tickerContainer = document.getElementById('stocksTicker');
  if (!tickerContainer) return;
  
  tickerContainer.innerHTML = '<div class="ticker-loading">Loading stocks...</div>';
  
  try {
    const stockDataPromises = STOCK_SYMBOLS.map(async (symbol) => {
      try {
        return await fetchStockData(symbol);
      } catch (error) {
        console.error(`Failed to load ${symbol}:`, error);
        return {
          symbol: symbol,
          name: STOCK_NAMES[symbol] || symbol,
          price: 0,
          change: 0,
          changePercent: 0,
          error: true
        };
      }
    });
    
    const stocksData = await Promise.all(stockDataPromises);
    
    tickerContainer.innerHTML = stocksData.map(stock => {
      if (stock.error) {
        return `
          <div class="stock-card error" data-symbol="${stock.symbol}">
            <div class="stock-card-header">
              <div class="stock-card-symbol">${stock.symbol}</div>
            </div>
            <div class="stock-card-price">Error loading</div>
            <div class="stock-card-name">${stock.name}</div>
          </div>
        `;
      }
      
      const isPositive = stock.change >= 0;
      return `
        <div class="stock-card" data-symbol="${stock.symbol}">
          <div class="stock-card-header">
            <div class="stock-card-symbol">${stock.symbol}</div>
            <div class="stock-card-change ${isPositive ? 'positive' : 'negative'}">
              ${isPositive ? '+' : ''}${stock.changePercent.toFixed(2)}%
            </div>
          </div>
          <div class="stock-card-price">$${stock.price.toFixed(2)}</div>
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
  const categoryTabs = document.querySelectorAll('.category-tab');
  
  // Stock selector
  if (stockSelect) {
    stockSelect.addEventListener('change', (e) => {
      updateStockDetails(e.target.value);
    });
  }
  
  // Timeframe buttons
  if (timeframeButtons.length > 0) {
    timeframeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        timeframeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTimeframe = btn.dataset.timeframe;
        updateStockDetails(currentSymbol);
      });
    });
  }
  
  // Category tabs
  if (categoryTabs.length > 0) {
    categoryTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        categoryTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        loadCategoryStocks(tab.dataset.category);
      });
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
  
  // Initialize with default stock
  if (stockSelect) {
    const urlParams = new URLSearchParams(window.location.search);
    const symbolParam = urlParams.get('symbol');
    if (symbolParam && STOCK_SYMBOLS.includes(symbolParam.toUpperCase())) {
      currentSymbol = symbolParam.toUpperCase();
      stockSelect.value = currentSymbol;
    }
    updateStockDetails(currentSymbol);
  }
  
  // Load initial category
  loadCategoryStocks('most-active');
  
  // Update ticker if container exists
  if (tickerContainer) {
    updateStockTicker();
    setInterval(() => {
      updateStockTicker();
    }, 30000);
    
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
  fetchData: fetchStockData
};



