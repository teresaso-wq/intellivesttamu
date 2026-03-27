// Live Stock Tracker - Real-time data from Yahoo Finance
let watchlist = [];
let updateInterval = null;

// Load watchlist from localStorage
function loadWatchlist() {
  const saved = localStorage.getItem('intellivest_watchlist');
  if (saved) {
    watchlist = JSON.parse(saved);
  } else {
    // Default watchlist
    watchlist = ['AAPL', 'MSFT', 'GOOGL', 'TSLA'];
  }
}

// Save watchlist to localStorage
function saveWatchlist() {
  localStorage.setItem('intellivest_watchlist', JSON.stringify(watchlist));
}

// Fetch stock data from Yahoo Finance
async function fetchStockData(symbol) {
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
      
      const currentPrice = meta.regularMarketPrice || meta.previousClose || 0;
      const previousClose = meta.previousClose || currentPrice;
      const change = currentPrice - previousClose;
      const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;
      
      return {
        symbol: symbol,
        name: meta.longName || symbol,
        price: currentPrice,
        change: change,
        changePercent: changePercent,
        open: meta.regularMarketOpen || previousClose,
        high: meta.regularMarketDayHigh || currentPrice,
        low: meta.regularMarketDayLow || currentPrice,
        volume: meta.regularMarketVolume || 0,
        marketCap: meta.marketCap || 0,
        peRatio: meta.trailingPE || null,
        dividendYield: meta.dividendYield ? meta.dividendYield * 100 : null,
        yearHigh: meta.fiftyTwoWeekHigh || currentPrice,
        yearLow: meta.fiftyTwoWeekLow || currentPrice
      };
    } catch (error) {
      console.log(`Method failed for ${symbol}:`, error.message);
    }
  }
  throw new Error(`Unable to fetch data for ${symbol}`);
}

// Update market summary (Dow, S&P 500, Nasdaq)
async function updateMarketSummary() {
  const indices = [
    { symbol: '^DJI', id: 'dow' },
    { symbol: '^GSPC', id: 'sp500' },
    { symbol: '^IXIC', id: 'nasdaq' }
  ];

  for (let index of indices) {
    try {
      const data = await fetchStockData(index.symbol);
      const priceEl = document.getElementById(`${index.id}Price`);
      const changeEl = document.getElementById(`${index.id}Change`);
      
      if (priceEl) priceEl.textContent = data.price.toFixed(2);
      if (changeEl) {
        const isPositive = data.change >= 0;
        changeEl.textContent = `${isPositive ? '+' : ''}${data.change.toFixed(2)} (${isPositive ? '+' : ''}${data.changePercent.toFixed(2)}%)`;
        changeEl.className = `change ${isPositive ? 'positive' : 'negative'}`;
      }
    } catch (error) {
      console.error(`Error updating ${index.id}:`, error);
    }
  }
}

// Update watchlist display
async function updateWatchlist() {
  const container = document.getElementById('watchlistContainer');
  if (!container) return;
  
  if (watchlist.length === 0) {
    container.innerHTML = '<div class="empty-watchlist">Your watchlist is empty. Add stocks to get started!</div>';
    return;
  }
  
  container.innerHTML = '<div class="watchlist-loading">Loading stocks...</div>';
  
  try {
    const stockDataPromises = watchlist.map(symbol => 
      fetchStockData(symbol).catch(err => ({
        symbol: symbol,
        name: symbol,
        price: 0,
        change: 0,
        changePercent: 0,
        error: true
      }))
    );
    
    const stocks = await Promise.all(stockDataPromises);
    
    container.innerHTML = stocks.map(stock => {
      if (stock.error) {
        return `
          <div class="stock-card-tracker error">
            <div class="stock-card-header-tracker">
              <div class="stock-info-tracker">
                <div class="stock-symbol-tracker">${stock.symbol}</div>
                <div class="stock-name-tracker">Error loading</div>
              </div>
              <button class="remove-stock" data-symbol="${stock.symbol}">×</button>
            </div>
          </div>
        `;
      }
      
      const isPositive = stock.change >= 0;
      
      return `
        <div class="stock-card-tracker">
          <div class="stock-card-header-tracker">
            <div class="stock-info-tracker">
              <div class="stock-symbol-tracker">${stock.symbol}</div>
              <div class="stock-name-tracker">${stock.name}</div>
            </div>
            <button class="remove-stock" data-symbol="${stock.symbol}" aria-label="Remove ${stock.symbol}">×</button>
          </div>
          <div class="stock-price-tracker">$${stock.price.toFixed(2)}</div>
          <div class="stock-change-tracker ${isPositive ? 'positive' : 'negative'}">
            ${isPositive ? '+' : ''}${stock.change.toFixed(2)} (${isPositive ? '+' : ''}${stock.changePercent.toFixed(2)}%)
          </div>
          <div class="stock-details-tracker">
            <div class="detail-item">
              <span class="detail-label">Open</span>
              <span class="detail-value">$${stock.open.toFixed(2)}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">High</span>
              <span class="detail-value">$${stock.high.toFixed(2)}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Low</span>
              <span class="detail-value">$${stock.low.toFixed(2)}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Volume</span>
              <span class="detail-value">${formatVolume(stock.volume)}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    // Add remove button listeners
    container.querySelectorAll('.remove-stock').forEach(btn => {
      btn.addEventListener('click', () => {
        const symbol = btn.dataset.symbol;
        watchlist = watchlist.filter(s => s !== symbol);
        saveWatchlist();
        updateWatchlist();
      });
    });
    
    // Update last update time
    const lastUpdate = document.getElementById('lastUpdate');
    if (lastUpdate) {
      lastUpdate.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    }
  } catch (error) {
    console.error('Error updating watchlist:', error);
    container.innerHTML = '<div class="watchlist-loading">Unable to load stocks. Please try again.</div>';
  }
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

// Initialize
(function initStockTracker() {
  // Load watchlist
  loadWatchlist();
  
  // View switching
  const watchlistBtn = document.getElementById('watchlistBtn');
  const educationBtn = document.getElementById('educationBtn');
  const watchlistView = document.getElementById('watchlistView');
  const educationView = document.getElementById('educationView');
  
  if (watchlistBtn && educationBtn) {
    watchlistBtn.addEventListener('click', () => {
      watchlistBtn.classList.add('active');
      educationBtn.classList.remove('active');
      watchlistView.classList.add('active');
      educationView.classList.remove('active');
    });
    
    educationBtn.addEventListener('click', () => {
      educationBtn.classList.add('active');
      watchlistBtn.classList.remove('active');
      educationView.classList.add('active');
      watchlistView.classList.remove('active');
    });
  }
  
  // Search and add stock
  const stockSearch = document.getElementById('stockSearch');
  const addStockBtn = document.getElementById('addStockBtn');
  
  function addStock() {
    const symbol = stockSearch.value.trim().toUpperCase();
    if (!symbol) return;
    
    if (watchlist.includes(symbol)) {
      alert(`${symbol} is already in your watchlist.`);
      return;
    }
    
    watchlist.push(symbol);
    saveWatchlist();
    stockSearch.value = '';
    updateWatchlist();
  }
  
  if (addStockBtn) {
    addStockBtn.addEventListener('click', addStock);
  }
  
  if (stockSearch) {
    stockSearch.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addStock();
      }
    });
  }
  
  // Default stock chips
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const symbol = chip.dataset.symbol;
      if (!watchlist.includes(symbol)) {
        watchlist.push(symbol);
        saveWatchlist();
        updateWatchlist();
      }
    });
  });
  
  // Initial updates
  updateMarketSummary();
  updateWatchlist();
  
  // Auto-update every 60 seconds
  updateInterval = setInterval(() => {
    updateMarketSummary();
    updateWatchlist();
  }, 60000);
})();

