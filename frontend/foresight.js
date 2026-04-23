// Foresight — conceptual ML outlook prototype for AAPL / META / NVDA.
// Intentionally high-level: no architecture, weights, or training details
// are exposed. This file only derives simple, label-based signals from
// public price history and headlines returned by the existing Intellivest API.
(function () {
  const SUPPORTED_TICKERS = ['AAPL', 'META', 'NVDA'];
  const COMPANY_NAMES = {
    AAPL: 'Apple',
    META: 'Meta',
    NVDA: 'Nvidia'
  };
  let currentTicker = 'AAPL';

  // Lightweight headline lexicon. Stands in for a production sentiment model
  // in this prototype; not used for live trading.
  const POSITIVE_WORDS = [
    'beat', 'beats', 'record', 'surge', 'surges', 'rally', 'rallies',
    'strong', 'growth', 'upgrade', 'outperform', 'gain', 'gains',
    'boost', 'boosts', 'win', 'wins', 'success', 'bullish', 'optimistic',
    'high', 'milestone', 'raised', 'raises', 'expand', 'expands',
    'breakthrough', 'demand', 'approve', 'approved'
  ];
  const NEGATIVE_WORDS = [
    'miss', 'misses', 'cut', 'cuts', 'fall', 'falls', 'drop', 'drops',
    'decline', 'declines', 'weak', 'downgrade', 'loss', 'losses', 'lose',
    'concern', 'concerns', 'lawsuit', 'probe', 'bearish', 'pressure',
    'slump', 'plunge', 'plunges', 'warning', 'warn', 'risk', 'risks',
    'layoff', 'layoffs', 'fine', 'fined'
  ];

  const section = document.getElementById('foresightSection');
  if (!section) return;

  const outlookEl = document.getElementById('foresightOutlook');
  const signalsEl = document.getElementById('foresightSignals');
  const reasoningEl = document.getElementById('foresightReasoning');
  const feedbackNote = document.getElementById('foresightFeedbackNote');
  const feedbackBtns = section.querySelectorAll('.foresight-feedback-btn');
  const tabs = section.querySelectorAll('.foresight-tab');

  // ── Thumbs up / down (per-ticker; stands in for a feedback pipeline) ──────
  function storageKey() { return 'foresight.feedback.' + currentTicker; }
  function loadVote() {
    try { return localStorage.getItem(storageKey()); } catch (_) { return null; }
  }
  function saveVote(v) {
    try { localStorage.setItem(storageKey(), v); } catch (_) { /* ignore */ }
  }
  function renderVote(v) {
    feedbackBtns.forEach(b => b.classList.toggle('is-active', b.dataset.vote === v));
    if (!feedbackNote) return;
    if (v === 'up') {
      feedbackNote.textContent = 'Thanks — recorded as a positive signal.';
    } else if (v === 'down') {
      feedbackNote.textContent = 'Thanks — recorded as a flag for review.';
    } else {
      feedbackNote.textContent = '';
    }
  }
  feedbackBtns.forEach(btn => btn.addEventListener('click', () => {
    const v = btn.dataset.vote;
    saveVote(v);
    renderVote(v);
  }));

  // ── Ticker switcher ───────────────────────────────────────────────────────
  tabs.forEach(tab => tab.addEventListener('click', () => {
    const t = tab.dataset.ticker;
    if (!t || !SUPPORTED_TICKERS.includes(t) || t === currentTicker) return;
    setActiveTicker(t);
  }));

  function setActiveTicker(t) {
    currentTicker = t;
    tabs.forEach(tab => {
      const isActive = tab.dataset.ticker === t;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    renderVote(loadVote());
    run();
  }

  // ── Data fetch (reuses existing Intellivest endpoints) ────────────────────
  async function fetchJson(url) {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(url + ' — ' + res.status);
    return res.json();
  }

  // Try the preferred range first, then progressively broader ranges so that
  // cached / latest-available bars are used if the live feed is unavailable.
  async function getHistory() {
    const ranges = ['1M', '1Y', 'MAX'];
    for (let i = 0; i < ranges.length; i++) {
      try {
        const j = await fetchJson('/api/stocks/history/' + currentTicker + '?range=' + ranges[i]);
        if (Array.isArray(j.data) && j.data.length) return j.data;
      } catch (_) { /* try next range */ }
    }
    return [];
  }

  async function getNews() {
    try {
      const j = await fetchJson('/api/news/' + currentTicker + '?limit=20');
      return Array.isArray(j.news) ? j.news : [];
    } catch (_) {
      try {
        const j2 = await fetchJson('/api/stocks/news/' + currentTicker + '?limit=20');
        return Array.isArray(j2.news) ? j2.news : [];
      } catch (__) {
        return [];
      }
    }
  }

  // ── Signal derivation (plain-English labels only) ─────────────────────────
  function pctChange(a, b) { return b !== 0 ? ((a - b) / b) * 100 : 0; }

  function momentumLabel(bars) {
    if (bars.length < 6) return { tier: 'Neutral', direction: 'flat', score: 0 };
    const closes = bars.map(b => b.close);
    const recent = closes.slice(-5).reduce((s, x) => s + x, 0) / 5;
    const base = closes.slice(-20, -5);
    const baseAvg = base.length ? base.reduce((s, x) => s + x, 0) / base.length : recent;
    const delta = pctChange(recent, baseAvg);
    if (delta >= 1.5) return { tier: 'Strong positive', direction: 'up', score: 2 };
    if (delta >= 0.4) return { tier: 'Mild positive', direction: 'up', score: 1 };
    if (delta <= -1.5) return { tier: 'Strong negative', direction: 'down', score: -2 };
    if (delta <= -0.4) return { tier: 'Mild negative', direction: 'down', score: -1 };
    return { tier: 'Neutral', direction: 'flat', score: 0 };
  }

  function volatilityLabel(bars) {
    if (bars.length < 6) return { tier: 'Moderate', score: 0 };
    const closes = bars.map(b => b.close);
    const rets = [];
    for (let i = 1; i < closes.length; i++) {
      if (closes[i - 1] !== 0) rets.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }
    if (!rets.length) return { tier: 'Moderate', score: 0 };
    const mean = rets.reduce((s, x) => s + x, 0) / rets.length;
    const variance = rets.reduce((s, x) => s + (x - mean) * (x - mean), 0) / rets.length;
    const stdPct = Math.sqrt(variance) * 100;
    if (stdPct <= 0.9) return { tier: 'Low', score: 1 };
    if (stdPct <= 1.8) return { tier: 'Moderate', score: 0 };
    return { tier: 'High', score: -1 };
  }

  function volumeLabel(bars) {
    if (bars.length < 6) return { tier: 'Near average', score: 0 };
    const vols = bars.map(b => b.volume || 0);
    const last = vols[vols.length - 1];
    const prior = vols.slice(0, -1);
    const avg = prior.length ? prior.reduce((s, x) => s + x, 0) / prior.length : 0;
    if (avg === 0) return { tier: 'Near average', score: 0 };
    const ratio = last / avg;
    if (ratio >= 1.3) return { tier: 'Elevated', score: 1 };
    if (ratio <= 0.7) return { tier: 'Below average', score: -1 };
    return { tier: 'Near average', score: 0 };
  }

  function sentimentLabel(news) {
    if (!news.length) return { tier: 'Neutral', score: 0, pos: 0, neg: 0, sample: 0 };
    let pos = 0, neg = 0, sample = 0;
    news.forEach(a => {
      const t = (a.title || '').toLowerCase();
      if (!t) return;
      sample++;
      POSITIVE_WORDS.forEach(w => { if (t.includes(w)) pos++; });
      NEGATIVE_WORDS.forEach(w => { if (t.includes(w)) neg++; });
    });
    const net = pos - neg;
    if (net >= 3) return { tier: 'Positive', score: 2, pos, neg, sample };
    if (net >= 1) return { tier: 'Leaning positive', score: 1, pos, neg, sample };
    if (net <= -3) return { tier: 'Negative', score: -2, pos, neg, sample };
    if (net <= -1) return { tier: 'Leaning negative', score: -1, pos, neg, sample };
    return { tier: 'Neutral', score: 0, pos, neg, sample };
  }

  // ── Composite outlook (details intentionally opaque) ──────────────────────
  function composeOutlook(mom, vol, volu, sent) {
    const raw = mom.score * 2 + sent.score * 1.5 + volu.score * 0.75 + vol.score * 0.5;
    const clamped = Math.max(-6, Math.min(6, raw));
    const score = Math.round(50 + (clamped / 6) * 40);

    let direction;
    if (score >= 58) direction = 'up';
    else if (score <= 42) direction = 'down';
    else direction = 'flat';

    const conviction = Math.abs(score - 50);
    let confidence;
    if (conviction >= 25) confidence = 'High';
    else if (conviction >= 12) confidence = 'Moderate';
    else confidence = 'Low';

    let risk;
    if (vol.tier === 'High') risk = 'Aggressive';
    else if (vol.tier === 'Low' && confidence !== 'Low') risk = 'Conservative';
    else risk = 'Balanced';

    const span = vol.tier === 'High' ? 3.5 : vol.tier === 'Moderate' ? 2.2 : 1.3;
    const center = direction === 'up' ? span * 0.35
                 : direction === 'down' ? -span * 0.35
                 : 0;
    const low = (center - span).toFixed(1);
    const high = (center + span).toFixed(1);

    return { score, direction, confidence, risk, returnLow: low, returnHigh: high };
  }

  // ── Rendering ─────────────────────────────────────────────────────────────
  const dirMeta = {
    up:   { label: 'Upward bias',   glyph: '\u25B2', modifier: 'up' },
    down: { label: 'Downward bias', glyph: '\u25BC', modifier: 'down' },
    flat: { label: 'Sideways',      glyph: '\u2192', modifier: 'flat' }
  };

  function parseBarDate(bar) {
    if (!bar || !bar.date) return null;
    const d = new Date(String(bar.date).replace(' ', 'T'));
    return isNaN(d.getTime()) ? null : d;
  }

  function formatDate(d) {
    try {
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (_) {
      return d.toISOString().slice(0, 10);
    }
  }

  function renderOutlook(out, staleNote) {
    const d = dirMeta[out.direction];
    outlookEl.innerHTML =
      '<div class="foresight-outlook-head">' +
        '<div class="foresight-eyebrow">5-day outlook · ' + currentTicker + '</div>' +
        '<span class="foresight-direction foresight-direction--' + d.modifier + '">' +
          '<span class="foresight-direction-glyph" aria-hidden="true">' + d.glyph + '</span>' +
          d.label +
        '</span>' +
      '</div>' +
      (staleNote ? '<div class="foresight-stale">' + staleNote + '</div>' : '') +
      '<div class="foresight-score">' +
        '<span class="foresight-score-value">' + out.score + '</span>' +
        '<span class="foresight-score-label">Foresight Score</span>' +
      '</div>' +
      '<dl class="foresight-metrics">' +
        '<div class="foresight-metric"><dt>Confidence</dt><dd>' + out.confidence + '</dd></div>' +
        '<div class="foresight-metric"><dt>Risk band</dt><dd>' + out.risk + '</dd></div>' +
        '<div class="foresight-metric"><dt>Est. return range</dt><dd>' + out.returnLow + '% to ' + out.returnHigh + '%</dd></div>' +
      '</dl>';
  }

  function accentFor(signalKey, obj) {
    if (signalKey === 'Momentum') return obj.direction;
    if (signalKey === 'Volatility') {
      if (obj.tier === 'High') return 'down';
      if (obj.tier === 'Low') return 'up';
      return 'flat';
    }
    if (signalKey === 'Volume') {
      if (obj.tier === 'Elevated') return 'up';
      if (obj.tier === 'Below average') return 'down';
      return 'flat';
    }
    if (signalKey === 'News sentiment') {
      if (obj.score > 0) return 'up';
      if (obj.score < 0) return 'down';
      return 'flat';
    }
    return 'flat';
  }

  function renderSignals(mom, vol, volu, sent) {
    const rows = [
      { key: 'Momentum',       data: mom },
      { key: 'Volatility',     data: vol },
      { key: 'Volume',         data: volu },
      { key: 'News sentiment', data: sent }
    ];
    signalsEl.innerHTML = rows.map(r =>
      '<li class="foresight-signal">' +
        '<span class="foresight-signal-key">' + r.key + '</span>' +
        '<span class="foresight-signal-pill foresight-signal-pill--' + accentFor(r.key, r.data) + '">' +
          r.data.tier +
        '</span>' +
      '</li>'
    ).join('');
  }

  function renderReasoning(mom, vol, volu, sent) {
    const company = COMPANY_NAMES[currentTicker] || currentTicker;
    const bullets = [];

    if (mom.direction === 'up') {
      bullets.push('Recent closes are trending above their short-term average, which is pulling the outlook upward.');
    } else if (mom.direction === 'down') {
      bullets.push('Recent closes are slipping under their short-term average, dragging the outlook down.');
    } else {
      bullets.push('Short-term price action is roughly flat, so momentum is contributing little signal.');
    }

    if (sent.score > 0) {
      bullets.push(company + '\u2019s recent headlines lean positive (' + sent.pos + ' supportive cues vs. ' + sent.neg + '), nudging the bias higher.');
    } else if (sent.score < 0) {
      bullets.push(company + '\u2019s recent headlines lean negative (' + sent.neg + ' cautious cues vs. ' + sent.pos + '), tempering the bias.');
    } else if (sent.sample) {
      bullets.push('Headline sentiment on ' + company + ' reads as mixed, so the outlook relies more on price behavior.');
    } else {
      bullets.push('No recent ' + company + ' headlines were available, so sentiment is not contributing to this outlook.');
    }

    if (vol.tier === 'High') {
      bullets.push('Daily swings have been wide, so the estimated return range is intentionally broader.');
    } else if (vol.tier === 'Low') {
      bullets.push('Daily swings have been narrow, which supports a tighter return range.');
    }

    if (volu.tier === 'Elevated') {
      bullets.push('Trading volume is running above its recent average, hinting at stronger conviction in the current move.');
    } else if (volu.tier === 'Below average') {
      bullets.push('Trading volume is running below its recent average, so the signal is weaker than it looks.');
    }

    reasoningEl.innerHTML = bullets.slice(0, 4).map(b => '<li>' + b + '</li>').join('');
  }

  function renderEmpty(msg) {
    outlookEl.innerHTML = '<div class="foresight-empty">' + msg + '</div>';
    signalsEl.innerHTML = '';
    reasoningEl.innerHTML = '';
  }

  function renderLoading() {
    outlookEl.innerHTML = '<div class="foresight-loading">Gathering signals for ' + currentTicker + '\u2026</div>';
    signalsEl.innerHTML = '';
    reasoningEl.innerHTML = '';
  }

  // ── Orchestration ─────────────────────────────────────────────────────────
  async function run() {
    renderLoading();
    try {
      const [bars, news] = await Promise.all([getHistory(), getNews()]);
      if (!bars.length) {
        renderEmpty('Foresight could not build an outlook for ' + currentTicker + ' right now. Please try again shortly.');
        return;
      }
      const mom = momentumLabel(bars);
      const vol = volatilityLabel(bars);
      const volu = volumeLabel(bars);
      const sent = sentimentLabel(news);
      const out = composeOutlook(mom, vol, volu, sent);

      // If the latest bar is materially older than today, surface a subtle
      // "as of" note so users know this is the latest cached snapshot.
      let staleNote = '';
      const latest = parseBarDate(bars[bars.length - 1]);
      if (latest) {
        const ageDays = (Date.now() - latest.getTime()) / (1000 * 60 * 60 * 24);
        if (ageDays > 2) {
          staleNote = 'Live feed unavailable — using latest data as of ' + formatDate(latest) + '.';
        }
      }

      renderOutlook(out, staleNote);
      renderSignals(mom, vol, volu, sent);
      renderReasoning(mom, vol, volu, sent);
    } catch (_) {
      renderEmpty('Foresight could not build an outlook for ' + currentTicker + ' right now. Please try again shortly.');
    }
  }

  renderVote(loadVote());
  run();
})();
