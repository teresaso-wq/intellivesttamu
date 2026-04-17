/**
 * Live Tracker: indices + watchlist using window.MarketData (Yahoo Finance via proxies).
 */
(function initStockTracker() {
  const WATCH_KEY = 'intellivest_watchlist';

  // Use window.MarketData which is defined in market-data.js
  function getMarket() {
    return window.MarketData || null;
  }

  async function fetchQuote(sym) {
    const MD = getMarket();
    if (MD && typeof MD.fetchDailyStockQuote === 'function') {
      const q = await MD.fetchDailyStockQuote(sym);
      if (q && !q.na) return q;
    }
    return null;
  }

  function readWatchlist() {
    try {
      const raw = localStorage.getItem(WATCH_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length) return arr.map((s) => String(s).toUpperCase());
      }
    } catch (e) { /* ignore */ }
    return ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'JPM', 'TSLA'];
  }

  function saveWatchlist(symbols) {
    localStorage.setItem(WATCH_KEY, JSON.stringify([...new Set(symbols)]));
  }

  function formatMoney(n) {
    if (n == null || Number.isNaN(n)) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
  }

  async function updateIndices() {
    // Use ETF proxies — Finnhub supports these reliably without CORS issues
    // DIA ≈ Dow Jones, SPY ≈ S&P 500, QQQ ≈ Nasdaq 100
    const map = [
      ['dowPrice', 'dowChange', 'DIA'],
      ['sp500Price', 'sp500Change', 'SPY'],
      ['nasdaqPrice', 'nasdaqChange', 'QQQ'],
    ];
    for (const [priceId, chId, sym] of map) {
      try {
        const q = await fetchQuote(sym);
        const elP = document.getElementById(priceId);
        const elC = document.getElementById(chId);
        if (q && elP) elP.textContent = q.price >= 1000 ? q.price.toLocaleString('en-US', { maximumFractionDigits: 2 }) : formatMoney(q.price);
        if (q && elC) {
          const sign = q.changePercent >= 0 ? '+' : '';
          elC.textContent = `${sign}${q.changePercent.toFixed(2)}%`;
          elC.classList.remove('positive', 'negative');
          elC.classList.add(q.changePercent >= 0 ? 'positive' : 'negative');
        }
      } catch (e) {
        const elP = document.getElementById(priceId);
        if (elP) elP.textContent = '-';
      }
    }
  }

  async function renderWatchlist() {
    const container = document.getElementById('watchlistContainer');
    const lastUpdate = document.getElementById('lastUpdate');
    if (!container) return;

    const symbols = readWatchlist();
    container.innerHTML = '<div class="tracker-empty">Loading…</div>';

    const quotes = await Promise.all(symbols.map((s) => fetchQuote(s).catch(() => null)));
    container.innerHTML = '';

    quotes.forEach((q, i) => {
      const sym = symbols[i];
      const card = document.createElement('div');
      card.className = 'stock-card-category';

      const pct = q ? q.changePercent : null;
      const ch = q ? q.change : null;
      const up =
        ch != null && !Number.isNaN(ch)
          ? ch >= 0
          : pct != null && !Number.isNaN(pct) && pct >= 0;
      const pctLine =
        pct == null || Number.isNaN(pct)
          ? { cls: 'pct-na', html: 'N/A' }
          : up
            ? { cls: 'positive', html: `▲ +${pct.toFixed(2)}%` }
            : { cls: 'negative', html: `▼ ${pct.toFixed(2)}%` };

      const name = q ? (q.name || sym).slice(0, 32) : sym;
      const price = q ? formatMoney(q.price) : '--';

      card.innerHTML = `
        <div class="stock-card-header-category">
          <div class="stock-card-symbol">${sym}</div>
          <div class="stock-card-change ${pctLine.cls}">${pctLine.html}</div>
        </div>
        <div class="stock-card-name-category">${name}</div>
        <div class="stock-card-price-category">${price}</div>
        <button type="button" class="watchlist-remove-btn" data-remove="${sym}" aria-label="Remove ${sym} from watchlist">Remove</button>
      `;

      card.querySelector('[data-remove]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const next = readWatchlist().filter((x) => x !== sym);
        saveWatchlist(next);
        renderWatchlist();
      });
      card.style.cursor = 'pointer';
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-remove]')) return;
        window.location.href = './stocks.html?symbol=' + encodeURIComponent(sym);
      });
      container.appendChild(card);
    });

    if (container.children.length === 0) {
      container.innerHTML = '<div class="tracker-empty">Your watchlist is empty. Search for a stock above to add it.</div>';
    }

    if (lastUpdate) {
      lastUpdate.textContent = 'Updated ' + new Date().toLocaleTimeString();
    }
  }

  document.getElementById('addStockBtn')?.addEventListener('click', () => {
    const input = document.getElementById('stockSearch');
    const raw = (input?.value || '').trim().toUpperCase();
    if (!raw) return;
    const list = readWatchlist();
    if (!list.includes(raw)) {
      list.push(raw);
      saveWatchlist(list);
    }
    renderWatchlist();
    if (input) input.value = '';
  });

  document.getElementById('stockSearch')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('addStockBtn')?.click();
  });

  document.querySelectorAll('.tracker-chips .chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const input = document.getElementById('stockSearch');
      if (input) input.value = chip.dataset.symbol || '';
    });
  });

  // Init
  updateIndices();
  renderWatchlist();
})();
