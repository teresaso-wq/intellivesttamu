/* Paper Portfolio — hypothetical trading tracker, localStorage-backed */
(function () {
  'use strict';

  var FINNHUB_KEY = 'd7g4cehr01qqb8ria6r0d7g4cehr01qqb8ria6rg';
  var STORAGE_KEY  = 'iv_paper_portfolio_v2';
  var CACHE_KEY    = 'iv_pp_price_cache_v2';
  var CACHE_TTL    = 5 * 60 * 1000;   // 5 min
  var DEFAULT_BAL  = 10000;

  // ── State ─────────────────────────────────────────────────────────────────
  var portfolio  = null;   // { cash, startingBalance, holdings: [] }
  var priceCache = {};     // { TICKER: { current, w1, m1, y1, ts } }

  function loadPortfolio() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && Array.isArray(p.holdings)) return p;
      }
    } catch (e) {}
    return { cash: DEFAULT_BAL, startingBalance: DEFAULT_BAL, holdings: [] };
  }

  function savePortfolio() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio)); } catch (e) {}
  }

  function loadCache() {
    try { priceCache = JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; } catch (e) {}
  }

  function saveCache() {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(priceCache)); } catch (e) {}
  }

  // ── API helpers ───────────────────────────────────────────────────────────
  function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  async function fetchJson(url) {
    try {
      var ctrl = new AbortController();
      var tid  = setTimeout(function () { ctrl.abort(); }, 6000);
      var res  = await fetch(url, { signal: ctrl.signal });
      clearTimeout(tid);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) { return null; }
  }

  async function fetchCurrentPrice(ticker) {
    var data = await fetchJson(
      'https://finnhub.io/api/v1/quote?symbol=' + encodeURIComponent(ticker) +
      '&token=' + FINNHUB_KEY
    );
    return (data && data.c > 0) ? data.c : null;
  }

  // One weekly-candle call covers 1W, 1M, and 1Y in a single request
  async function fetchHistoricalPrices(ticker) {
    var now      = Math.floor(Date.now() / 1000);
    var fromTs   = now - 400 * 86400; // ~13 months back
    var data = await fetchJson(
      'https://finnhub.io/api/v1/stock/candle?symbol=' + encodeURIComponent(ticker) +
      '&resolution=W&from=' + fromTs + '&to=' + now + '&token=' + FINNHUB_KEY
    );
    if (!data || data.s !== 'ok' || !data.t || !data.c || !data.c.length) {
      return { w1: null, m1: null, y1: null };
    }
    function closest(targetTs) {
      var bestIdx = 0, bestDiff = Infinity;
      for (var i = 0; i < data.t.length; i++) {
        var d = Math.abs(data.t[i] - targetTs);
        if (d < bestDiff) { bestDiff = d; bestIdx = i; }
      }
      return data.c[bestIdx];
    }
    return {
      w1: closest(now - 7  * 86400),
      m1: closest(now - 30 * 86400),
      y1: closest(now - 365 * 86400)
    };
  }

  async function refreshPrices() {
    var tickers = uniqueTickers();
    if (!tickers.length) return;
    var now = Date.now();
    for (var i = 0; i < tickers.length; i++) {
      if (i > 0) await sleep(70);
      var t = tickers[i];
      var cached = priceCache[t];

      // Skip only if cache is fresh AND historical data is present
      var histOk = cached && cached.w1 != null && cached.m1 != null && cached.y1 != null;
      if (cached && (now - cached.ts) < CACHE_TTL && histOk) continue;

      var current = await fetchCurrentPrice(t);
      await sleep(70);
      var hist = await fetchHistoricalPrices(t);

      priceCache[t] = {
        current: current || (cached && cached.current) || null,
        w1: hist.w1, m1: hist.m1, y1: hist.y1,
        ts: Date.now()
      };
    }
    saveCache();
    render();
  }

  function uniqueTickers() {
    var seen = {}, out = [];
    portfolio.holdings.forEach(function (h) {
      if (!seen[h.ticker]) { seen[h.ticker] = true; out.push(h.ticker); }
    });
    return out;
  }

  // ── Buy / Sell ────────────────────────────────────────────────────────────
  async function buyStock(ticker, dollarAmount) {
    var btn = document.getElementById('ppBuyBtn');
    btn.textContent = 'Fetching price…';
    btn.disabled = true;

    var price = await fetchCurrentPrice(ticker);

    btn.textContent = 'Buy';
    btn.disabled = false;

    if (!price) {
      showMsg('Could not fetch a price for "' + ticker + '". Double-check the symbol.', 'error');
      return;
    }
    if (dollarAmount > portfolio.cash + 0.01) {
      showMsg('Not enough cash — you have ' + fmtUsd(portfolio.cash) + ' available.', 'error');
      return;
    }

    var shares = dollarAmount / price;
    portfolio.holdings.push({
      ticker:       ticker,
      shares:       shares,
      buyPrice:     price,
      buyDate:      Date.now(),
      dollarAmount: dollarAmount
    });
    portfolio.cash -= dollarAmount;

    // Seed cache so current price shows immediately
    if (!priceCache[ticker]) priceCache[ticker] = {};
    priceCache[ticker].current = price;
    priceCache[ticker].ts = Date.now() - CACHE_TTL + 20000; // re-fetch hist soon

    savePortfolio();
    saveCache();
    render();
    showMsg('Bought ' + fmtShares(shares) + ' shares of ' + ticker + ' at ' + fmtUsd(price) + '.', 'success');

    // Fetch weekly historical data in the background
    fetchHistoricalPrices(ticker).then(function (hist) {
      if (!priceCache[ticker]) priceCache[ticker] = {};
      Object.assign(priceCache[ticker], hist);
      priceCache[ticker].ts = Date.now();
      saveCache();
      render();
    });

    // Clear inputs
    document.getElementById('ppTickerInput').value  = '';
    document.getElementById('ppAmountInput').value  = '';
  }

  async function sellHolding(index) {
    var h     = portfolio.holdings[index];
    var cached = priceCache[h.ticker];
    var price  = (cached && cached.current) || h.buyPrice;
    var proceeds = h.shares * price;

    portfolio.holdings.splice(index, 1);
    portfolio.cash += proceeds;
    savePortfolio();
    render();
    showMsg('Sold ' + h.ticker + ' for ' + fmtUsd(proceeds) + '.', 'success');
  }

  // ── Formatting ────────────────────────────────────────────────────────────
  function fmtUsd(n) {
    if (!isFinite(n)) return '—';
    return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtShares(n) {
    if (!isFinite(n)) return '—';
    return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }

  function fmtPct(n) {
    if (!isFinite(n)) return '—';
    return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
  }

  function gainClass(n) {
    if (!isFinite(n)) return '';
    return n >= 0 ? 'pp-gain' : 'pp-loss';
  }

  function pctChange(from, to) {
    if (!from || !to || !isFinite(from) || !isFinite(to) || from === 0) return NaN;
    return ((to - from) / from) * 100;
  }

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = String(s);
    return d.innerHTML;
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function render() {
    renderSummary();
    renderHoldings();
  }

  function renderSummary() {
    var totalValue = portfolio.cash;
    portfolio.holdings.forEach(function (h) {
      var c = priceCache[h.ticker];
      totalValue += h.shares * ((c && c.current) || h.buyPrice);
    });

    var pnl    = totalValue - portfolio.startingBalance;
    var pnlPct = (pnl / portfolio.startingBalance) * 100;

    var elVal  = document.getElementById('ppTotalValue');
    var elPnl  = document.getElementById('ppTotalPnl');
    var elCash = document.getElementById('ppCashDisplay');

    if (elVal)  elVal.textContent  = fmtUsd(totalValue);
    if (elCash) elCash.textContent = fmtUsd(portfolio.cash);
    if (elPnl) {
      elPnl.textContent = (pnl >= 0 ? '+' : '') + fmtUsd(pnl) + ' (' + fmtPct(pnlPct) + ')';
      elPnl.className   = 'pp-balance-pnl ' + gainClass(pnl);
    }
  }

  function renderHoldings() {
    var elEmpty     = document.getElementById('ppEmpty');
    var elTable     = document.getElementById('ppTable');
    var elTbody     = document.getElementById('ppTableBody');
    var elFooterPnl = document.getElementById('ppFooterPnl');

    if (!elTbody) return;

    if (!portfolio.holdings.length) {
      if (elEmpty) elEmpty.hidden = false;
      if (elTable) elTable.hidden = true;
      return;
    }

    if (elEmpty) elEmpty.hidden = true;
    if (elTable) elTable.hidden = false;

    var totalPnl = 0;

    elTbody.innerHTML = portfolio.holdings.map(function (h, i) {
      var c          = priceCache[h.ticker] || {};
      var curPrice   = c.current || h.buyPrice;
      var curValue   = h.shares * curPrice;
      var pnl        = curValue - h.dollarAmount;
      var pnlPct     = pctChange(h.dollarAmount, curValue);
      var w1Pct      = pctChange(c.w1,  curPrice);
      var m1Pct      = pctChange(c.m1,  curPrice);
      var y1Pct      = pctChange(c.y1,  curPrice);
      var dateStr    = new Date(h.buyDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      totalPnl += pnl;

      function pctCell(val) {
        return '<td class="pp-pct-cell ' + gainClass(val) + '">' +
          (isFinite(val) ? fmtPct(val) : '<em class="pp-loading">…</em>') + '</td>';
      }

      return (
        '<tr>' +
        '<td><div class="pp-ticker">' + esc(h.ticker) + '</div>' +
            '<div class="pp-buy-date">since ' + esc(dateStr) + '</div></td>' +
        '<td>' + esc(fmtShares(h.shares)) + '</td>' +
        '<td>' + esc(fmtUsd(h.buyPrice)) + '</td>' +
        '<td>' + (c.current ? esc(fmtUsd(c.current)) : '<em class="pp-loading">loading…</em>') + '</td>' +
        pctCell(w1Pct) +
        pctCell(m1Pct) +
        pctCell(y1Pct) +
        '<td><div class="' + gainClass(pnl) + ' pp-pnl-dollar">' + esc((pnl >= 0 ? '+' : '') + fmtUsd(pnl)) + '</div>' +
            '<div class="pp-pnl-pct ' + gainClass(pnlPct) + '">' + esc(fmtPct(pnlPct)) + '</div></td>' +
        '<td><button type="button" class="pp-sell-btn" data-idx="' + i + '">Sell</button></td>' +
        '</tr>'
      );
    }).join('');

    elTbody.querySelectorAll('.pp-sell-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-idx'), 10);
        var h   = portfolio.holdings[idx];
        if (confirm('Sell all ' + fmtShares(h.shares) + ' shares of ' + h.ticker + '?')) {
          sellHolding(idx);
        }
      });
    });

    if (elFooterPnl) {
      elFooterPnl.textContent = (totalPnl >= 0 ? '+' : '') + fmtUsd(totalPnl);
      elFooterPnl.className   = 'pp-footer-pnl ' + gainClass(totalPnl);
    }
  }

  // ── Messages ──────────────────────────────────────────────────────────────
  var _msgTimer = null;
  function showMsg(text, type) {
    var el = document.getElementById('ppFormMsg');
    if (!el) return;
    if (!text) { el.hidden = true; return; }
    el.textContent = text;
    el.className   = 'pp-form-msg pp-form-msg--' + (type || 'info');
    el.hidden = false;
    clearTimeout(_msgTimer);
    if (type !== 'error') _msgTimer = setTimeout(function () { el.hidden = true; }, 5000);
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    var section = document.getElementById('paperPortfolioSection');
    if (!section) return;

    portfolio = loadPortfolio();
    loadCache();

    // Evict any cache entries where historical data is missing (force re-fetch)
    Object.keys(priceCache).forEach(function (t) {
      var c = priceCache[t];
      if (!c || c.w1 == null || c.m1 == null || c.y1 == null) {
        delete priceCache[t];
      }
    });

    var elStartBal = document.getElementById('ppStartingBalance');
    if (elStartBal) elStartBal.value = portfolio.startingBalance;

    // Buy button
    document.getElementById('ppBuyBtn').addEventListener('click', function () {
      var ticker = (document.getElementById('ppTickerInput').value || '').toUpperCase().replace(/[^A-Z.]/g, '');
      var amount = parseFloat(document.getElementById('ppAmountInput').value);
      if (!ticker)            { showMsg('Enter a ticker symbol (e.g. NVDA).', 'error'); return; }
      if (!amount || amount <= 0) { showMsg('Enter a positive dollar amount.', 'error'); return; }
      buyStock(ticker, amount);
    });

    // Enter key on inputs
    ['ppTickerInput', 'ppAmountInput'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') document.getElementById('ppBuyBtn').click();
      });
    });

    // Reset button
    document.getElementById('ppResetBtn').addEventListener('click', function () {
      var bal = parseFloat(document.getElementById('ppStartingBalance').value) || DEFAULT_BAL;
      if (!confirm('Reset your paper portfolio to ' + fmtUsd(bal) + '? This will erase all holdings.')) return;
      portfolio  = { cash: bal, startingBalance: bal, holdings: [] };
      priceCache = {};
      savePortfolio();
      saveCache();
      render();
      showMsg('Portfolio reset — you have ' + fmtUsd(bal) + ' ready to invest.', 'success');
    });

    render();
    refreshPrices();
    setInterval(refreshPrices, 5 * 60 * 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
