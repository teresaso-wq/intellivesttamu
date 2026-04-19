/* global investors page — FMP & Quiver feeds with fallback; follow; overlap; compare */
(function () {
  'use strict';

  var FMP_KEY = 'YOUR_FMP_API_KEY_HERE';
  var QUIVER_KEY = 'YOUR_QUIVER_KEY_HERE';

  var CACHE_FMP = 'iv_feed_fmp_v1';
  var CACHE_QUIVER = 'iv_feed_quiver_v1';
  var CACHE_META = 'iv_feed_last_updated';

  var FALLBACK_TRADES = [
    { period: '2026-04-03', name: 'Cathie Wood', action: 'BUY', ticker: 'TSLA', amount: '~$180M', slug: 'cathie-wood', type: 'buy' },
    { period: '2026-04-01', name: 'Ken Griffin', action: 'BUY', ticker: 'NVDA', amount: '~$520M', slug: 'ken-griffin', type: 'buy' },
    { period: '2026-03-28', name: 'Bill Ackman', action: 'BUY', ticker: 'NKE', amount: '~$1.4B', slug: 'bill-ackman', type: 'buy' },
    { period: '2026-03-21', name: 'Nancy Pelosi', action: 'BUY', ticker: 'NVDA', amount: '~$1-5M', slug: 'nancy-pelosi', type: 'buy' },
    { period: '2026-03-14', name: 'Warren Buffett', action: 'BUY', ticker: 'OXY', amount: '~$410M', slug: 'warren-buffett', type: 'buy' },
    { period: '2026-03-10', name: 'George Soros', action: 'BUY', ticker: 'PLTR', amount: '~$90M', slug: 'george-soros', type: 'buy' },
    { period: '2026-03-07', name: 'David Tepper', action: 'BUY', ticker: 'META', amount: '~$270M', slug: 'david-tepper', type: 'buy' },
    { period: '2026-03-03', name: 'Ray Dalio', action: 'BUY', ticker: 'GLD', amount: '~$200M', slug: 'ray-dalio', type: 'buy' },
    { period: '2026-02-25', name: 'Steve Cohen', action: 'BUY', ticker: 'AMZN', amount: '~$340M', slug: 'steve-cohen', type: 'buy' },
    { period: '2026-02-19', name: 'Cathie Wood', action: 'BUY', ticker: 'PLTR', amount: '~$215M', slug: 'cathie-wood', type: 'buy' },
    { period: '2026-02-14', name: 'Bill Ackman', action: 'BUY', ticker: 'GOOGL', amount: '~$680M', slug: 'bill-ackman', type: 'buy' },
    { period: '2026-02-10', name: 'Ken Griffin', action: 'BUY', ticker: 'MSFT', amount: '~$380M', slug: 'ken-griffin', type: 'buy' },
    { period: '2026-02-06', name: 'Warren Buffett', action: 'SELL', ticker: 'AAPL', amount: '~$3B reduction', slug: 'warren-buffett', type: 'sell' },
    { period: '2026-02-03', name: 'George Soros', action: 'BUY', ticker: 'NVDA', amount: '~$250M', slug: 'george-soros', type: 'buy' },
    { period: '2026-01-28', name: 'David Tepper', action: 'BUY', ticker: 'GOOGL', amount: '~$190M', slug: 'david-tepper', type: 'buy' }
  ];

  var PREVIEW_TRADES = {
    'Warren Buffett': [
      { t: 'Mar 2026 OXY Buy ~$410M' },
      { t: 'Feb 2026 AAPL Sell ~$3B' },
      { t: 'Q3 2024 BAC Sell ~$5B' }
    ],
    'Ray Dalio': [
      { t: 'Mar 2026 GLD Buy ~$200M' },
      { t: 'Q3 2024 SPY Buy ~$300M' },
      { t: 'Q2 2024 EEM Buy ~$200M' }
    ],
    'Cathie Wood': [
      { t: 'Apr 2026 TSLA Buy ~$180M' },
      { t: 'Feb 2026 PLTR Buy ~$215M' },
      { t: 'Q2 2024 NVDA Sell ~$500M' }
    ],
    'Bill Gates': [
      { t: 'Q3 2024 WM Buy ~$600M' },
      { t: 'Q2 2024 CAT Buy ~$800M' },
      { t: 'Hold MSFT large position' }
    ],
    'Peter Lynch': [
      { t: 'Historical Magellan era' },
      { t: 'Ten-baggers & GARP' },
      { t: 'Invest in what you know' }
    ],
    'Benjamin Graham': [
      { t: 'Deep value / margin of safety' },
      { t: 'The Intelligent Investor' },
      { t: 'Historical Graham-Newman' }
    ],
    'John Bogle (Legacy)': [
      { t: 'VOO / VTI index' },
      { t: 'Buy the haystack' },
      { t: 'Low fees forever' }
    ]
  };

  function slugify(name) {
    return String(name || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function getCached(key) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return null;
      var o = JSON.parse(raw);
      var oneDay = 24 * 60 * 60 * 1000;
      if (Date.now() - o.timestamp < oneDay) return o.data;
    } catch (e) {}
    return null;
  }

  function setCached(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify({ data: data, timestamp: Date.now() }));
    } catch (e) {}
  }

  function getFollowed() {
    try {
      var raw = localStorage.getItem('followed_investors');
      if (!raw) return [];
      var a = JSON.parse(raw);
      return Array.isArray(a) ? a : [];
    } catch (e) {
      return [];
    }
  }

  function setFollowed(arr) {
    localStorage.setItem('followed_investors', JSON.stringify(arr));
  }

  var ROOKIE_NAMES = {
    'Warren Buffett': true,
    'Peter Lynch': true,
    'Benjamin Graham': true,
    'John Bogle (Legacy)': true,
    'Ray Dalio': true,
    'Bill Gates': true
  };

  function isRookieName(name) {
    return !!ROOKIE_NAMES[name];
  }

  var OVERLAP_PAIRS = {};

  function addPair(a, b, html) {
    var k = [a, b].sort().join('|');
    OVERLAP_PAIRS[k] = html;
  }

  addPair('Warren Buffett', 'Bill Ackman',
    '<p><strong>Shared:</strong> None directly but both own quality consumer brands.</p><p>Buffett: KO, KHC · Ackman: CMG, QSR</p>');
  addPair('Warren Buffett', 'George Soros',
    '<p><strong>No direct overlap</strong> — different strategies entirely.</p>');
  addPair('Warren Buffett', 'Bill Gates',
    '<p><strong>Shared:</strong> BRK.B (Gates Foundation holds Berkshire as #1 position).</p>');
  addPair('George Soros', 'David Tepper',
    '<p><strong>Shared:</strong> NVDA, META, AMZN, GOOGL, MSFT — both heavy tech in Q3 2024.</p>');
  addPair('George Soros', 'Steve Cohen',
    '<p><strong>Shared:</strong> NVDA, META, AMZN, MSFT — AI / mega-cap tech.</p>');
  addPair('Ken Griffin', 'Steve Cohen',
    '<p><strong>Shared:</strong> NVDA, AAPL, MSFT, AMZN, META — quant / multi-strategy overlap.</p>');
  addPair('David Tepper', 'Steve Cohen',
    '<p><strong>Shared:</strong> NVDA, META, AMZN, GOOGL, MSFT — similar big-tech positioning.</p>');
  addPair('Cathie Wood', 'George Soros',
    '<p><strong>Shared:</strong> PLTR — both bought heavily Q3–Q4 2024.</p>');
  addPair('Bill Ackman', 'David Tepper',
    '<p><strong>Shared:</strong> GOOGL — both bought in 2024.</p>');
  addPair('Nancy Pelosi', 'George Soros',
    '<p><strong>Shared:</strong> NVDA — both bought heavily (disclosures vs. 13F).</p>');

  var COMPARE = {
    'Warren Buffett': { strategy: 'Value Investing', risk: 'Low–Medium', horizon: 'Forever', top: 'AAPL ~28%', ret: '~20%', size: '~$300B+', best: 'Beginners', rookie: true },
    'Ray Dalio': { strategy: 'All Weather', risk: 'Very Low', horizon: 'Long term', top: 'SPY ~20%', ret: '~10%', size: '~$150B', best: 'Stability', rookie: true },
    'Peter Lynch': { strategy: 'GARP', risk: 'Medium', horizon: 'Multi-year', top: 'Diversified', ret: '~29% (Magellan era)', size: 'N/A (retired)', best: 'Retail investors', rookie: true },
    'Michael Burry': { strategy: 'Deep Value / Short', risk: 'Very High', horizon: 'Quarters', top: 'Concentrated', ret: 'Variable', size: 'Scion', best: 'Contrarians', rookie: false },
    'George Soros': { strategy: 'Global Macro', risk: 'Very High', horizon: 'Tactical', top: 'Rotates', ret: '~30% (1970–2000 est.)', size: 'Soros Fund', best: 'Macro', rookie: false },
    'Bill Ackman': { strategy: 'Activist Value', risk: 'High', horizon: 'Years', top: 'CMG, HLT, NKE', ret: '~17%', size: 'Pershing', best: 'Concentrated bets', rookie: false },
    'Cathie Wood': { strategy: 'Innovation', risk: 'Very High', horizon: '5+ years', top: 'TSLA, COIN', ret: '~3% (ARKK since 2014)*', size: 'ARK', best: 'Thematic', rookie: false },
    'Ken Griffin': { strategy: 'Quant / Multi-strat', risk: 'High', horizon: 'Short–long', top: 'SPY, NVDA…', ret: '~26% (est.)', size: 'Citadel', best: 'Institutional', rookie: false },
    'Nancy Pelosi': { strategy: 'Disclosed trades', risk: 'n/a', horizon: 'n/a', top: 'Varies', ret: 'n/a', size: 'n/a', best: 'Tracking only', rookie: false },
    'Bill Gates': { strategy: 'Diversified Value', risk: 'Low–Medium', horizon: 'Long term', top: 'MSFT, BRK.B', ret: 'Varies', size: 'Foundation trust', best: 'Philanthropy + value', rookie: true },
    'Paul Tudor Jones': { strategy: 'Global Macro + TA', risk: 'High', horizon: 'Tactical', top: 'Gold, BTC, futures', ret: 'Varies', size: 'Tudor', best: 'Macro', rookie: false }
  };

  function defaultCompare(name) {
    return { strategy: 'See portfolio', risk: 'Varies', horizon: 'Varies', top: 'See 13F', ret: '—', size: '—', best: 'Diversified', rookie: isRookieName(name) };
  }

  function parseRetNum(s) {
    var m = String(s || '').match(/[\d.]+/);
    return m ? parseFloat(m[0]) : 0;
  }

  function perfRows() {
    return [
      { name: 'Warren Buffett', strategy: 'Value', ret: '~20% (60yr avg)', vs: '+14% better', pct: 95, good: true },
      { name: 'Peter Lynch', strategy: 'GARP', ret: '~29% (13yr)', vs: '+23% better', pct: 100, good: true },
      { name: 'Benjamin Graham', strategy: 'Deep Value', ret: '~17% (historical)', vs: '+11% better', pct: 85, good: true },
      { name: 'Ray Dalio', strategy: 'All Weather', ret: '~10% (30yr avg)', vs: '+4% better', pct: 55, good: true },
      { name: 'Bill Ackman', strategy: 'Activist', ret: '~17% (since 2004)', vs: '+11% better', pct: 85, good: true },
      { name: 'George Soros', strategy: 'Global Macro', ret: '~30% (1970–2000)', vs: '+24% better', pct: 100, good: true },
      { name: 'Ken Griffin', strategy: 'Quant/HFT', ret: '~26% (since 2001 est.)', vs: '+20% better', pct: 90, good: true },
      { name: 'Cathie Wood', strategy: 'Innovation', ret: '~3% (since 2014)*', vs: '−3% worse', pct: 25, good: false },
      { name: 'S&P 500', strategy: 'Benchmark', ret: '~10.5% (long term)', vs: 'baseline', pct: 50, good: true }
    ];
  }

  function buildPreviewLines(name) {
    if (PREVIEW_TRADES[name]) return PREVIEW_TRADES[name].map(function (x) { return x.t; });
    var slug = slugify(name);
    var lines = [];
    FALLBACK_TRADES.forEach(function (tr) {
      if (tr.slug === slug && lines.length < 3) lines.push(tr.period + ' ' + tr.ticker + ' ' + tr.action + ' ' + tr.amount);
    });
    while (lines.length < 3) lines.push('See latest 13F / disclosures');
    return lines.slice(0, 3);
  }

  function injectCardChrome() {
    document.querySelectorAll('#investorsGrid .investor-card').forEach(function (card) {
      var nameEl = card.querySelector('.investor-name');
      if (!nameEl) return;
      var name = nameEl.textContent.trim();
      var slug = slugify(name);
      card.id = 'investor-' + slug;
      card.setAttribute('data-investor-slug', slug);
      card.setAttribute('data-investor-name', name);
      var rookie = isRookieName(name);
      card.setAttribute('data-rookie', rookie ? 'true' : 'false');

      var inner = card.querySelector('.investor-card-inner');
      if (!inner || inner.querySelector('.investor-rookie-badge')) return;

      var badge = document.createElement('div');
      badge.className = 'investor-rookie-badge ' + (rookie ? 'is-rookie' : 'is-advanced');
      badge.textContent = rookie ? '✅ 🎓 Rookie Friendly' : '❌ ⚡ Advanced Only';
      inner.style.position = 'relative';
      inner.insertBefore(badge, inner.firstChild);

      var expand = card.querySelector('.investor-expand-btn');
      if (!expand || expand.closest('.investor-card-actions')) return;
      var wrap = document.createElement('div');
      wrap.className = 'investor-card-actions';
      var parent = expand.parentNode;
      var follow = document.createElement('button');
      follow.type = 'button';
      follow.className = 'btn secondary btn-sm investor-follow-btn';
      follow.setAttribute('data-follow-name', name);
      follow.setAttribute('aria-pressed', 'false');
      follow.textContent = '⭐ Follow';
      parent.insertBefore(wrap, expand);
      wrap.appendChild(follow);
      wrap.appendChild(expand);
    });
  }

  function syncFollowButtons() {
    var followed = getFollowed();
    document.querySelectorAll('.investor-follow-btn').forEach(function (btn) {
      var n = btn.getAttribute('data-follow-name');
      var on = followed.indexOf(n) !== -1;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.textContent = on ? '⭐ Following' : '⭐ Follow';
      btn.classList.toggle('is-following', on);
    });
  }

  function toggleFollow(name) {
    var f = getFollowed();
    var i = f.indexOf(name);
    if (i === -1) f.push(name); else f.splice(i, 1);
    setFollowed(f);
    syncFollowButtons();
    renderFollowedSection();
  }

  function renderFollowedSection() {
    var section = document.getElementById('followedInvestorsSection');
    var list = document.getElementById('followedInvestorsList');
    if (!section || !list) return;
    var f = getFollowed();
    if (f.length === 0) {
      section.hidden = true;
      list.innerHTML = '';
      return;
    }
    section.hidden = false;
    list.innerHTML = f.map(function (name) {
      var lines = buildPreviewLines(name);
      var slug = slugify(name);
      return (
        '<div class="followed-mini-card">' +
        '<div class="followed-mini-head"><strong>' + escapeHtml(name) + '</strong></div>' +
        '<ul class="followed-mini-trades">' +
        lines.map(function (l) { return '<li>' + escapeHtml(l) + '</li>'; }).join('') +
        '</ul>' +
        '<div class="followed-mini-actions">' +
        '<button type="button" class="btn secondary btn-sm" data-jump-slug="' + escapeHtml(slug) + '">View card</button>' +
        '<button type="button" class="btn secondary btn-sm followed-unfollow" data-unfollow-name="' + escapeHtml(name) + '">Unfollow</button>' +
        '</div></div>'
      );
    }).join('');

    list.querySelectorAll('.followed-unfollow').forEach(function (btn) {
      btn.addEventListener('click', function () {
        toggleFollow(btn.getAttribute('data-unfollow-name'));
      });
    });
    list.querySelectorAll('[data-jump-slug]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        scrollToInvestor(btn.getAttribute('data-jump-slug'));
      });
    });
  }

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function scrollToInvestor(slug) {
    var el = document.getElementById('investor-' + slug);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('is-expanded');
    var btn = el.querySelector('.investor-expand-btn');
    if (btn) {
      btn.setAttribute('aria-expanded', 'true');
      btn.textContent = 'Hide details';
    }
  }

  function timeAgo(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    var diff = Date.now() - d.getTime();
    var days = Math.floor(diff / 86400000);
    if (days < 1) return 'today';
    if (days === 1) return '1 day ago';
    if (days < 30) return days + ' days ago';
    var months = Math.floor(days / 30);
    if (months === 1) return '1 month ago';
    if (months < 12) return months + ' months ago';
    var years = Math.floor(months / 12);
    return years === 1 ? '1 year ago' : years + ' years ago';
  }

  function formatDate(dateStr) {
    if (!dateStr) return dateStr;
    // If already a nice string like "Q4 2024", return as-is
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    var d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function renderWhosBuyingFeed(trades, isStale) {
    var feed = document.getElementById('whosBuyingFeed');
    var meta = document.getElementById('whosBuyingMeta');
    if (!feed) return;
    feed.innerHTML = trades.map(function (tr) {
      var border = tr.type === 'sell' ? 'is-sell' : (tr.type === 'hold' || tr.type === 'new' ? 'is-hold' : 'is-buy');
      var ago = timeAgo(tr.period);
      var dateLabel = formatDate(tr.period);
      var dateHtml = '<div class="wbc-period">📅 ' + (tr.type === 'sell' ? 'Sold' : 'Bought') + ' on ' + escapeHtml(dateLabel) +
        (ago ? ' <span class="wbc-ago">(' + escapeHtml(ago) + ')</span>' : '') + '</div>';
      return (
        '<div class="whos-buying-card ' + border + '">' +
        '<div class="wbc-name">👤 ' + escapeHtml(tr.name) + '</div>' +
        '<div class="wbc-action">📈 ' + escapeHtml(tr.action) + ' ' + escapeHtml(tr.ticker) + '</div>' +
        '<div class="wbc-amt">💰 ' + escapeHtml(tr.amount) + '</div>' +
        dateHtml +
        '<button type="button" class="btn secondary btn-sm wbc-view" data-slug="' + escapeHtml(tr.slug) + '">View Investor</button>' +
        '</div>'
      );
    }).join('');

    feed.querySelectorAll('.wbc-view').forEach(function (btn) {
      btn.addEventListener('click', function () {
        scrollToInvestor(btn.getAttribute('data-slug'));
      });
    });

    if (meta) {
      var ts = localStorage.getItem(CACHE_META);
      var ago = 'recently';
      if (ts) {
        var sec = Math.floor((Date.now() - parseInt(ts, 10)) / 1000);
        if (sec < 60) ago = 'just now';
        else if (sec < 3600) ago = Math.floor(sec / 60) + ' min ago';
        else if (sec < 86400) ago = Math.floor(sec / 3600) + ' hours ago';
        else ago = Math.floor(sec / 86400) + ' days ago';
      }
      meta.textContent = 'Last updated: ' + ago + ' — Source: SEC 13F Filings & Capitol Trades' + (isStale ? ' · Showing last known data' : '');
    }
  }

  function normalizeFmpHolding(h, investorName, filedDate) {
    var ch = h.changeShares;
    var ticker = h.ticker || h.symbol || '—';
    var type = 'buy';
    var action = 'BUY / Added';
    if (typeof ch === 'number') {
      if (ch < 0) { type = 'sell'; action = 'SELL / Reduced'; }
      else if (ch === 0 && h.newPosition) { type = 'new'; action = 'NEW'; }
    }
    return {
      period: filedDate || 'Recent',
      name: investorName,
      action: action,
      ticker: ticker,
      amount: h.shares ? String(h.shares) + ' sh' : '—',
      slug: slugify(investorName),
      type: type
    };
  }

  async function fetchFmpTrades() {
    var cached = getCached(CACHE_FMP);
    if (cached) return cached;

    var ciks = [
      { cik: '0001067983', name: 'Warren Buffett' },
      { cik: '0001350694', name: 'Ray Dalio' },
      { cik: '0001336528', name: 'Bill Ackman' }
    ];
    var out = [];
    if (!FMP_KEY || FMP_KEY.indexOf('YOUR_') === 0) return out;

    for (var i = 0; i < ciks.length; i++) {
      try {
        var url = 'https://financialmodelingprep.com/api/v3/form-thirteen-f/' + ciks[i].cik + '?apikey=' + encodeURIComponent(FMP_KEY);
        var res = await fetch(url);
        if (!res.ok) continue;
        var data = await res.json();
        var arr = Array.isArray(data) ? data : (data && data.data) || [];
        var filed = (arr[0] && (arr[0].filingDate || arr[0].date)) || 'Recent';
        var slice = arr.slice(0, 8);
        slice.forEach(function (row) {
          var h = row || {};
          var ch = parseFloat(h.changeInShares || h.change || 0);
          var type = ch < 0 ? 'sell' : (ch > 0 ? 'buy' : 'new');
          var action = ch < 0 ? 'SELL' : (ch > 0 ? 'BUY' : 'NEW');
          out.push({
            period: String(filed).slice(0, 10),
            name: ciks[i].name,
            action: action,
            ticker: h.ticker || h.symbol || '—',
            amount: h.shares ? '~' + String(h.shares) + ' sh' : '—',
            slug: slugify(ciks[i].name),
            type: type === 'new' ? 'hold' : type
          });
        });
      } catch (e) {}
    }
    if (out.length) setCached(CACHE_FMP, out);
    return out;
  }

  async function fetchQuiverTrades() {
    var cached = getCached(CACHE_QUIVER);
    if (cached) return cached;
    if (!QUIVER_KEY || QUIVER_KEY.indexOf('YOUR_') === 0) return [];

    try {
      var res = await fetch('https://api.quiverquant.com/beta/live/congresstrading', {
        headers: { Authorization: 'Token ' + QUIVER_KEY }
      });
      if (!res.ok) return [];
      var data = await res.json();
      var arr = Array.isArray(data) ? data : [];
      var want = ['Pelosi', 'Nancy'];
      var out = [];
      arr.forEach(function (row) {
        var rep = (row.Representative || row.representative || row.name || '') + '';
        if (!want.some(function (w) { return rep.indexOf(w) !== -1; })) return;
        var tx = (row.Transaction || row.type || '').toLowerCase();
        var type = tx.indexOf('sale') !== -1 ? 'sell' : 'buy';
        out.push({
          period: row.TransactionDate || row.date || 'Recent',
          name: 'Nancy Pelosi',
          action: type === 'sell' ? 'SELL' : 'BUY',
          ticker: row.Ticker || row.ticker || '—',
          amount: row.Range || row.amount || '—',
          slug: 'nancy-pelosi',
          type: type
        });
      });
      if (out.length) setCached(CACHE_QUIVER, out);
      return out;
    } catch (e) {
      return [];
    }
  }

  async function loadWhosBuyingFeed() {
    var isStale = false;
    var merged = [];
    try {
      var a = await fetchFmpTrades();
      var b = await fetchQuiverTrades();
      merged = a.concat(b);
    } catch (e) {
      isStale = true;
    }
    if (!merged.length) {
      merged = FALLBACK_TRADES.slice();
      isStale = true;
    } else {
      merged = merged.slice(0, 20);
      try {
        localStorage.setItem(CACHE_META, String(Date.now()));
      } catch (e) {}
    }
    merged.sort(function (x, y) { return String(y.period).localeCompare(String(x.period)); });
    renderWhosBuyingFeed(merged.slice(0, 15), isStale);
  }

  function populateSelects() {
    var names = [];
    document.querySelectorAll('#investorsGrid .investor-name').forEach(function (el) {
      names.push(el.textContent.trim());
    });
    names.sort();
    ['overlapSelect1', 'overlapSelect2', 'compareSelect1', 'compareSelect2'].forEach(function (id) {
      var sel = document.getElementById(id);
      if (!sel) return;
      var first = sel.firstElementChild ? sel.firstElementChild.textContent : '';
      sel.innerHTML = '';
      var o0 = document.createElement('option');
      o0.value = '';
      o0.textContent = id.indexOf('overlap') === 0 ? 'Select Investor' : 'Investor';
      sel.appendChild(o0);
      names.forEach(function (n) {
        var o = document.createElement('option');
        o.value = n;
        o.textContent = n;
        sel.appendChild(o);
      });
    });
  }

  function renderPerformanceTable() {
    var tbody = document.getElementById('performanceTableBody');
    if (!tbody) return;
    tbody.innerHTML = perfRows().map(function (row) {
      var bar = '<span class="perf-bar"><span class="perf-bar-fill" style="width:' + row.pct + '%"></span></span>';
      var cls = row.good ? 'perf-vs-good' : 'perf-vs-bad';
      return '<tr><td>' + escapeHtml(row.name) + '</td><td>' + escapeHtml(row.strategy) + '</td><td>' + escapeHtml(row.ret) + '</td><td class="' + cls + '">' + escapeHtml(row.vs) + '</td><td>' + bar + '</td></tr>';
    }).join('');
    tbody.innerHTML += '<tr class="perf-note-row"><td colspan="5"><small>*Cathie Wood: includes 2022 crash (−67%). Up 150% in 2020 alone.</small></td></tr>';
  }

  function overlapKey(a, b) {
    return [a, b].sort().join('|');
  }

  function setupOverlap() {
    var s1 = document.getElementById('overlapSelect1');
    var s2 = document.getElementById('overlapSelect2');
    var box = document.getElementById('overlapResults');
    if (!s1 || !s2 || !box) return;
    function run() {
      var a = s1.value;
      var b = s2.value;
      if (!a || !b || a === b) {
        box.hidden = true;
        return;
      }
      box.hidden = false;
      box.style.opacity = '0';
      var k = overlapKey(a, b);
      var html = OVERLAP_PAIRS[k];
      if (!html) {
        html = '<p>These two investors have very different styles. No significant overlap in recent filings.</p>';
      }
      box.innerHTML = '<div class="overlap-results-inner"><h4 class="overlap-h">🤝 ' + escapeHtml(a) + ' &amp; ' + escapeHtml(b) + '</h4>' + html + '</div>';
      requestAnimationFrame(function () {
        box.style.transition = 'opacity 0.35s ease';
        box.style.opacity = '1';
      });
    }
    s1.addEventListener('change', run);
    s2.addEventListener('change', run);
  }

  function setupCompare() {
    var s1 = document.getElementById('compareSelect1');
    var s2 = document.getElementById('compareSelect2');
    var box = document.getElementById('compareResults');
    if (!s1 || !s2 || !box) return;
    function run() {
      var a = s1.value;
      var b = s2.value;
      if (!a || !b || a === b) {
        box.hidden = true;
        return;
      }
      var A = COMPARE[a] || defaultCompare(a);
      var B = COMPARE[b] || defaultCompare(b);
      var ar = parseRetNum(A.ret);
      var br = parseRetNum(B.ret);
      var winRet = ar > br ? 'L' : (br > ar ? 'R' : '');
      box.hidden = false;
      box.style.opacity = '0';
      box.innerHTML =
        '<table class="investors-compare-table">' +
        '<thead><tr><th>Category</th><th>' + escapeHtml(a) + '</th><th>' + escapeHtml(b) + '</th></tr></thead>' +
        '<tbody>' +
        row3('Strategy', A.strategy, B.strategy) +
        row3('Risk Level', A.risk, B.risk) +
        row3('Time Horizon', A.horizon, B.horizon) +
        row3('Top Holding', A.top, B.top) +
        rowAnnual('Annual Return', A.ret, B.ret, winRet) +
        row3('Portfolio Size', A.size, B.size) +
        row3('Best For', A.best, B.best) +
        row3('Rookie Friendly', A.rookie ? '✅ Yes' : '❌ No', B.rookie ? '✅ Yes' : '❌ No') +
        '</tbody></table>';
      requestAnimationFrame(function () {
        box.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
        box.style.transform = 'translateY(0)';
        box.style.opacity = '1';
      });
    }
    function row3(label, x, y) {
      return '<tr><td>' + escapeHtml(label) + '</td><td>' + escapeHtml(String(x)) + '</td><td>' + escapeHtml(String(y)) + '</td></tr>';
    }
    function rowAnnual(label, x, y, win) {
      var c1 = win === 'L' ? ' class="compare-gold"' : '';
      var c2 = win === 'R' ? ' class="compare-gold"' : '';
      return '<tr><td>' + escapeHtml(label) + '</td><td' + c1 + '>' + escapeHtml(String(x)) + '</td><td' + c2 + '>' + escapeHtml(String(y)) + '</td></tr>';
    }
    s1.addEventListener('change', run);
    s2.addEventListener('change', run);
  }

  function initPagination() {
    var activeCategory = 'all';
    var visibleCount = 6;
    var showMoreBtn = document.getElementById('investorsShowMore');
    var grid = document.getElementById('investorsGrid');
    var tabs = document.querySelectorAll('.category-tab');

    function cardMatchesCategory(card) {
      if (activeCategory === 'all') return true;
      if (activeCategory === 'rookie') return card.getAttribute('data-rookie') === 'true';
      return card.getAttribute('data-category') === activeCategory;
    }

    function updatePagination() {
      if (!grid) return;
      var cards = Array.prototype.slice.call(grid.querySelectorAll('.investor-card'));
      var visibleList = cards.filter(cardMatchesCategory);
      if (activeCategory === 'all') {
        cards.forEach(function (card, i) {
          var idx = visibleList.indexOf(card);
          var show = idx !== -1 && idx < visibleCount;
          card.style.display = show ? '' : 'none';
        });
        if (showMoreBtn) {
          showMoreBtn.hidden = visibleCount >= visibleList.length;
          showMoreBtn.style.display = visibleCount >= visibleList.length ? 'none' : 'inline-flex';
        }
      } else {
        cards.forEach(function (card) {
          card.style.display = cardMatchesCategory(card) ? '' : 'none';
        });
        if (showMoreBtn) {
          showMoreBtn.hidden = true;
          showMoreBtn.style.display = 'none';
        }
      }
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        activeCategory = tab.getAttribute('data-category') || 'all';
        if (activeCategory === 'all') visibleCount = 6;
        tabs.forEach(function (t) {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        updatePagination();
      });
    });

    if (showMoreBtn) {
      showMoreBtn.addEventListener('click', function () {
        visibleCount += 6;
        updatePagination();
      });
    }

    document.querySelectorAll('.investor-expand-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var card = btn.closest('.investor-card');
        if (!card) return;
        var open = !card.classList.contains('is-expanded');
        card.classList.toggle('is-expanded', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        btn.textContent = open ? 'Hide details' : 'View Portfolio';
      });
    });

    updatePagination();
  }

  function init() {
    injectCardChrome();
    syncFollowButtons();
    renderFollowedSection();
    populateSelects();
    renderPerformanceTable();
    setupOverlap();
    setupCompare();
    loadWhosBuyingFeed();

    document.addEventListener('click', function (e) {
      if (e.target.closest('.investor-follow-btn')) {
        var btn = e.target.closest('.investor-follow-btn');
        toggleFollow(btn.getAttribute('data-follow-name'));
      }
    });

    initPagination();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
