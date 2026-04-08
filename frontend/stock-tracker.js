/**
 * Live Tracker: indices + tech watchlist using IntellivestMarket (Yahoo / demo fallback).
 */
(function initStockTracker() {
  const M = window.IntellivestMarket;
  const WATCH_KEY = 'intellivest_watchlist';

  const watchlistBtn = document.getElementById('watchlistBtn');
  const educationBtn = document.getElementById('educationBtn');
  const watchlistView = document.getElementById('watchlistView');
  const educationView = document.getElementById('educationView');

  function setView(view) {
    const isWatch = view === 'watchlist';
    if (watchlistBtn) watchlistBtn.classList.toggle('active', isWatch);
    if (educationBtn) educationBtn.classList.toggle('active', !isWatch);
    if (watchlistView) watchlistView.classList.toggle('active', isWatch);
    if (educationView) educationView.classList.toggle('active', !isWatch);
  }

  watchlistBtn?.addEventListener('click', () => setView('watchlist'));
  educationBtn?.addEventListener('click', () => setView('education'));

  function readWatchlist() {
    try {
      const raw = localStorage.getItem(WATCH_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length) return arr.map((s) => String(s).toUpperCase());
      }
    } catch (e) { /* ignore */ }
    return M ? M.TECH_SYMBOLS.slice(0, 8) : ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'AMZN'];
  }

  function saveWatchlist(symbols) {
    localStorage.setItem(WATCH_KEY, JSON.stringify([...new Set(symbols)]));
  }

  function formatMoney(n) {
    if (n == null || Number.isNaN(n)) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
  }

  async function updateIndices() {
    if (!M) return;
    const map = [
      ['dowPrice', 'dowChange', '^DJI'],
      ['sp500Price', 'sp500Change', '^GSPC'],
      ['nasdaqPrice', 'nasdaqChange', '^IXIC'],
    ];
    for (const [priceId, chId, sym] of map) {
      try {
        const q = await M.fetchQuote(sym);
        const elP = document.getElementById(priceId);
        const elC = document.getElementById(chId);
        if (elP) elP.textContent = q.price >= 1000 ? q.price.toLocaleString('en-US', { maximumFractionDigits: 2 }) : formatMoney(q.price);
        if (elC) {
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
    if (!container || !M) return;

    const symbols = readWatchlist();
    container.innerHTML = '<div class="tracker-empty">Loading…</div>';

    const quotes = await Promise.all(symbols.map((s) => M.fetchQuote(s).catch(() => null)));
    container.innerHTML = '';

    quotes.forEach((q, i) => {
      const sym = symbols[i];
      if (!q) return;
      const card = document.createElement('div');
      card.className = 'stock-card';
      const pct = q.changePercent;
      const pos = pct >= 0;
      card.innerHTML = `
        <div class="stock-card-header-category">
          <span class="stock-card-symbol">${sym}</span>
          <span class="stock-card-change ${pos ? 'positive' : 'negative'}">${pos ? '+' : ''}${pct.toFixed(2)}%</span>
        </div>
        <div class="stock-card-name-category">${(q.name || sym).slice(0, 32)}</div>
        <div class="stock-card-price-category">${formatMoney(q.price)}</div>
        <button type="button" class="btn secondary" style="margin-top:12px;width:100%;font-size:12px;padding:8px" data-remove="${sym}">Remove</button>
      `;
      card.querySelector('[data-remove]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const next = readWatchlist().filter((x) => x !== sym);
        saveWatchlist(next);
        renderWatchlist();
      });
      card.style.cursor = 'pointer';
      card.addEventListener('click', () => {
        window.location.href = './stocks.html?symbol=' + encodeURIComponent(sym);
      });
      container.appendChild(card);
    });

    if (container.children.length === 0) {
      container.innerHTML = '<div class="tracker-empty">Add tickers below to build your watchlist.</div>';
    }

    if (lastUpdate) {
      lastUpdate.textContent = 'Updated ' + new Date().toLocaleTimeString();
    }
  }

  document.getElementById('addStockBtn')?.addEventListener('click', () => {
    const input = document.getElementById('stockSearch');
    const raw = (input?.value || '').trim().toUpperCase();
    if (!raw || !M) return;
    const sym = M.resolveSymbolFromSearch(raw) || raw;
    const list = readWatchlist();
    if (!list.includes(sym)) {
      list.push(sym);
      saveWatchlist(list);
    }
    renderWatchlist();
    if (input) input.value = '';
  });

  document.querySelectorAll('.tracker-chips .chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const input = document.getElementById('stockSearch');
      if (input) input.value = chip.dataset.symbol || '';
    });
  });

  if (M) {
    updateIndices();
    renderWatchlist();
  }
})();
