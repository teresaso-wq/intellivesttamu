/**
 * Intellivest interactive visuals: tilt, risk explorer, ambient canvas, flip cards.
 * Respects prefers-reduced-motion.
 */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initTilt() {
    if (reduceMotion) return;
    document.querySelectorAll('[data-interactive-tilt]').forEach((wrap) => {
      const target = wrap.querySelector('.editorial-svg, svg') || wrap;
      wrap.addEventListener(
        'mousemove',
        (e) => {
          const r = wrap.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width - 0.5;
          const y = (e.clientY - r.top) / r.height - 0.5;
          target.style.transform =
            `perspective(880px) rotateY(${x * 14}deg) rotateX(${-y * 10}deg) translateZ(4px)`;
          target.style.transition = 'transform 0.05s ease-out';
        },
        { passive: true }
      );
      wrap.addEventListener('mouseleave', () => {
        target.style.transform = '';
        target.style.transition = 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)';
      });
    });
  }

  function initRiskReward() {
    const root = document.getElementById('riskRewardExplorer');
    if (!root) return;
    const slider = root.querySelector('.risk-reward-slider');
    const band = root.querySelector('.risk-reward-band');
    const label = root.querySelector('.risk-reward-label');
    const detail = root.querySelector('.risk-reward-detail');
    if (!slider || !band) return;

    const copy = [
      {
        l: 'Conservative',
        d: 'Narrower range of outcomes, stability emphasized. Typical of cash, high-quality bonds, and broad diversification.',
      },
      {
        l: 'Balanced',
        d: 'Moderate spread between upside and downside. Many diversified portfolios sit in this range over long horizons.',
      },
      {
        l: 'Growth-oriented',
        d: 'Wider outcome range: more upside potential alongside deeper drawdowns. Common with concentrated or equity-heavy strategies.',
      },
    ];

    function apply(t) {
      const r = t / 100;
      const midY = 96;
      const spread = 22 + r * 58;
      const uy = midY - spread * 0.55;
      const ly = midY + spread * 0.85;
      const d = `M 32 ${midY} C 140 ${midY - spread * 0.35}, 268 ${midY - spread * 0.42}, 392 ${uy} L 392 ${ly} C 268 ${midY + spread * 0.48}, 140 ${midY + spread * 0.42}, 32 ${midY} Z`;
      band.setAttribute('d', d);
      const idx = t < 34 ? 0 : t > 66 ? 2 : 1;
      if (label) label.textContent = copy[idx].l;
      if (detail) detail.textContent = copy[idx].d;
    }

    slider.addEventListener('input', () => apply(Number(slider.value)));
    apply(Number(slider.value));
  }

  function initAmbientCanvas() {
    const canvas = document.getElementById('ambientMarketCanvas');
    if (!canvas || reduceMotion) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let t0 = performance.now();
    const lines = [];

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      lines.length = 0;
      const n = Math.floor(8 + w / 120);
      for (let i = 0; i < n; i++) {
        lines.push({
          x: (i / n) * w + Math.random() * 40,
          phase: Math.random() * Math.PI * 2,
          speed: 0.15 + Math.random() * 0.25,
          amp: 12 + Math.random() * 28,
          hue: i % 2 === 0 ? '0,43,92' : '184,151,90',
        });
      }
    }

    resize();
    window.addEventListener('resize', resize, { passive: true });

    function draw(now) {
      if (w < 4 || h < 4) {
        requestAnimationFrame(draw);
        return;
      }
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, w, h);
      const isDark = document.documentElement.classList.contains('dark');
      ctx.globalAlpha = isDark ? 0.35 : 0.22;

      lines.forEach((L, i) => {
        ctx.beginPath();
        const steps = 48;
        for (let s = 0; s <= steps; s++) {
          const px = (s / steps) * w;
          const wave =
            Math.sin(px * 0.012 + L.phase + t * L.speed) * L.amp +
            Math.sin(px * 0.025 + t * 0.4 + i) * (L.amp * 0.35);
          const py = h * 0.55 + wave + (i - lines.length / 2) * 6;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = `rgba(${L.hue},${isDark ? 0.45 : 0.55})`;
        ctx.lineWidth = isDark ? 1.25 : 1;
        ctx.stroke();
      });

      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  function initFlipCards() {
    document.querySelectorAll('.content-card--flip').forEach((card) => {
      const inner = card.querySelector('.content-card-flip-inner');
      if (!inner) return;

      function toggle() {
        inner.classList.toggle('is-flipped');
        const expanded = inner.classList.contains('is-flipped');
        if (card.hasAttribute('aria-expanded')) {
          card.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        }
      }

      card.addEventListener('click', (e) => {
        if (e.target.closest('a[href]')) return;
        toggle();
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      });
    });
  }

  function initLogoTrendCanvas(wrap, canvas) {
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    const t0 = performance.now();

    function isDark() {
      return document.documentElement.classList.contains('dark');
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = wrap.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(r.width * dpr));
      canvas.height = Math.max(1, Math.floor(r.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw(now) {
      if (!canvas.isConnected) {
        cancelAnimationFrame(raf);
        return;
      }
      const t = (now - t0) / 1000;
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      if (cw < 4 || ch < 4) {
        raf = requestAnimationFrame(draw);
        return;
      }
      ctx.clearRect(0, 0, cw, ch);
      const motion = wrap.classList.contains('is-motion-on');
      const dark = isDark();
      const n = 42;
      const baseY = ch * 0.6;
      const amp = ch * 0.062;
      const drift = motion ? t * 1.15 : t * 0.32;

      function strokePath(seed, strokeStyle, lineW, alpha) {
        ctx.beginPath();
        for (let i = 0; i <= n; i += 1) {
          const x = (i / n) * cw;
          const wobble =
            Math.sin(i * 0.4 + drift + seed) * amp * 0.5 +
            Math.sin(i * 0.18 + seed * 2 + drift * 0.55) * amp * 0.28;
          const trend = (i / n) * ch * (motion ? -0.15 : -0.085);
          const y = baseY + wobble + trend;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineW;
        ctx.globalAlpha = alpha;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      const gold = dark ? 'rgba(220, 198, 145, 0.95)' : 'rgba(120, 95, 52, 0.9)';
      const blue = dark ? 'rgba(140, 175, 225, 0.9)' : 'rgba(0, 43, 92, 0.65)';
      strokePath(0, gold, motion ? 2.1 : 1.5, motion ? 0.4 : 0.24);
      if (motion) {
        strokePath(2.2, blue, 1.4, 0.22);
      }
      raf = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize, { passive: true });
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => resize());
      ro.observe(wrap);
    }
    raf = requestAnimationFrame(draw);
  }

  function initInteractiveLogoPanel(wrap, btn) {
    const stage = wrap.querySelector('.interactive-logo-stage');
    const logoMain = wrap.querySelector('.interactive-logo-main');
    const img = wrap.querySelector('.interactive-logo-img');
    const chartCanvas = wrap.querySelector('.interactive-logo-chart');
    let motionOn = false;

    if (chartCanvas && !reduceMotion) {
      initLogoTrendCanvas(wrap, chartCanvas);
    }

    function setMotion(on) {
      motionOn = on;
      wrap.classList.toggle('is-motion-on', on);
      if (btn) {
        btn.classList.toggle('is-playing', on);
        btn.setAttribute('aria-label', on ? 'Pause logo animation' : 'Play logo animation');
      }
    }

    function toggleMotion() {
      setMotion(!motionOn);
    }

    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMotion();
      });
      if (stage) {
        stage.addEventListener('click', (e) => {
          if (e.target === btn || btn.contains(e.target)) return;
          toggleMotion();
        });
      }
      setMotion(false);
    } else if (reduceMotion) {
      setMotion(false);
    } else {
      setMotion(true);
    }

    if (!reduceMotion && logoMain && wrap) {
      wrap.addEventListener(
        'mousemove',
        (e) => {
          const r = wrap.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width - 0.5;
          const y = (e.clientY - r.top) / r.height - 0.5;
          logoMain.style.setProperty('--logo-tx', `${x * 22}px`);
          logoMain.style.setProperty('--logo-ty', `${y * 17}px`);
        },
        { passive: true }
      );
      wrap.addEventListener('mouseleave', () => {
        logoMain.style.removeProperty('--logo-tx');
        logoMain.style.removeProperty('--logo-ty');
      });
    }

    const explorer = document.getElementById('conversation-starters');
    if (explorer) {
      const accents = ['budgeting', 'investing', 'credit', 'stocks', 'emergency'];
      function clearAccents() {
        accents.forEach((a) => wrap.classList.remove(`logo-accent--${a}`));
      }
      explorer.addEventListener('mouseleave', clearAccents);
      explorer.querySelectorAll('.topic-chip[data-logo-accent]').forEach((chip) => {
        const key = chip.getAttribute('data-logo-accent');
        if (!key) return;
        chip.addEventListener('mouseenter', () => {
          clearAccents();
          wrap.classList.add(`logo-accent--${key}`);
        });
        chip.addEventListener('focus', () => {
          clearAccents();
          wrap.classList.add(`logo-accent--${key}`);
        });
        chip.addEventListener('blur', (e) => {
          const rel = e.relatedTarget;
          if (rel && explorer.contains(rel) && rel.closest('.topic-chip')) return;
          clearAccents();
        });
      });
    }

    if (img) {
      img.addEventListener('error', () => {
        wrap.classList.add('logo-img-missing');
        if (logoMain && !logoMain.querySelector('.interactive-logo-text-fallback')) {
          const span = document.createElement('span');
          span.className = 'interactive-logo-text-fallback';
          span.setAttribute('aria-hidden', 'true');
          span.textContent = 'IV';
          logoMain.replaceChildren(span);
          logoMain.setAttribute('role', 'img');
          logoMain.setAttribute('aria-label', 'Intellivest logo');
        }
      });
    }
  }

  function initVideoPanel() {
    const wrap = document.querySelector('[data-interactive-video]');
    if (!wrap) return;

    if (wrap.hasAttribute('data-interactive-logo')) {
      const btn = wrap.querySelector('.interactive-video-play');
      initInteractiveLogoPanel(wrap, btn || null);
      return;
    }

    const btn = wrap.querySelector('.interactive-video-play');
    if (!btn) return;

    const video = wrap.querySelector('video');
    if (!video) return;

    function togglePlay() {
      if (video.paused) {
        video.play().catch((err) => {
          console.warn('Video play failed:', err);
          wrap.classList.add('video-fallback');
        });
      } else {
        video.pause();
      }
    }

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePlay();
    });

    video.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePlay();
    });

    video.addEventListener('play', () => {
      btn.classList.add('is-playing');
      btn.setAttribute('aria-label', 'Pause video');
    });
    video.addEventListener('pause', () => {
      btn.classList.remove('is-playing');
      btn.setAttribute('aria-label', 'Play video');
    });

    const sources = Array.from(video.querySelectorAll('source'));
    let fallbackSourceIndex = 0;

    video.addEventListener('error', () => {
      fallbackSourceIndex += 1;
      if (fallbackSourceIndex >= sources.length) {
        wrap.classList.add('video-fallback');
        btn.setAttribute('aria-label', 'Video unavailable');
        return;
      }
      const url = sources[fallbackSourceIndex].getAttribute('src');
      if (url) {
        while (video.firstChild) {
          video.removeChild(video.firstChild);
        }
        video.src = url;
        video.load();
      }
    });
  }

  function initCapabilitiesBanner() {
    const banner = document.getElementById('capabilitiesBanner');
    if (!banner) return;

    const setA = document.getElementById('capabilitiesMarqueeSetA');
    const setB = document.getElementById('capabilitiesMarqueeSetB');
    const canvas = document.getElementById('capabilitiesBannerSpark');
    const sparkLabel = document.getElementById('capabilitiesSparkLabel');
    const M = window.IntellivestMarket;

    function staticMarqueeRows() {
      return [
        { label: 'ETFs', sub: 'Diversified funds', fromQuote: false },
        { label: 'DCA', sub: 'Steady investing', fromQuote: false },
        { label: 'IRAs', sub: 'Tax-smart saving', fromQuote: false },
        { label: 'Credit', sub: 'Scores & habits', fromQuote: false },
        { label: 'S&P 500', sub: 'Index context', fromQuote: false },
        { label: 'Compound', sub: 'Long-term growth', fromQuote: false },
      ];
    }

    function renderMarqueeHtml(rows) {
      return rows
        .map((d) => {
          let mid;
          if (d.fromQuote && typeof d.pct === 'number' && !Number.isNaN(d.pct)) {
            const cls = d.pct >= 0 ? 'is-up' : 'is-down';
            const sign = d.pct >= 0 ? '+' : '';
            mid = `<span class="capabilities-marquee-pct ${cls}">${sign}${d.pct.toFixed(2)}%</span>`;
          } else {
            mid = `<span class="capabilities-marquee-pct capabilities-marquee-pct--muted">${d.sub}</span>`;
          }
          return `<span class="capabilities-marquee-item"><code>${d.label}</code>${mid}<span class="capabilities-marquee-dot" aria-hidden="true">·</span></span>`;
        })
        .join('');
    }

    async function loadMarquee() {
      const symbols = ['QQQ', 'SPY', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META'];
      let rows = [];
      if (M && typeof M.fetchQuote === 'function') {
        const quotes = await Promise.all(symbols.map((s) => M.fetchQuote(s).catch(() => null)));
        quotes.forEach((q) => {
          if (q && q.symbol) {
            rows.push({
              label: q.symbol,
              pct: q.changePercent,
              fromQuote: true,
            });
          }
        });
      }
      if (rows.length < 4) {
        rows = staticMarqueeRows();
      }
      const html = renderMarqueeHtml(rows);
      if (setA) setA.innerHTML = html;
      if (setB) setB.innerHTML = html;
    }

    let lastPrices = [];
    let rafId = 0;

    function drawSparkline(prices, t) {
      if (!canvas || !prices || prices.length < 2) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(4, Math.floor(rect.width * dpr));
      const h = Math.max(4, Math.floor(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const isDark = document.documentElement.classList.contains('dark');
      ctx.clearRect(0, 0, w, h);
      const padX = 12 * dpr;
      const padY = 10 * dpr;
      const chartH = h - padY * 2 - 4 * dpr;
      const n = prices.length;
      const jitter =
        reduceMotion || !t ? 0 : Math.sin(t * 0.0018) * 0.0012 * (prices[n - 1] || 1);
      const series = prices.map((p, i) => (i === n - 1 ? p * (1 + jitter) : p));
      let min = Math.min(...series);
      let max = Math.max(...series);
      const span = max - min || 1;
      min -= span * 0.1;
      max += span * 0.1;
      const pts = series.map((p, i) => ({
        x: padX + (i / (n - 1)) * (w - 2 * padX),
        y: padY + (1 - (p - min) / (max - min)) * chartH,
      }));

      const fillGrad = ctx.createLinearGradient(0, padY, 0, h);
      fillGrad.addColorStop(0, isDark ? 'rgba(255, 214, 150, 0.2)' : 'rgba(255, 230, 180, 0.18)');
      fillGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.beginPath();
      ctx.moveTo(pts[0].x, h);
      pts.forEach((pt) => ctx.lineTo(pt.x, pt.y));
      ctx.lineTo(pts[pts.length - 1].x, h);
      ctx.closePath();
      ctx.fillStyle = fillGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i += 1) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.1 * dpr;
      ctx.strokeStyle = isDark ? 'rgba(255, 214, 150, 0.95)' : 'rgba(255, 224, 170, 0.98)';
      ctx.stroke();
    }

    function sparkLoop(t) {
      if (lastPrices.length) {
        drawSparkline(lastPrices, t);
      }
      if (!reduceMotion) {
        rafId = window.requestAnimationFrame(sparkLoop);
      }
    }

    async function loadSpark() {
      if (!canvas || !M) return;
      let chart = null;
      if (typeof M.fetchChart === 'function') {
        chart = await M.fetchChart('QQQ', '1D').catch(() => null);
      }
      if (!chart && typeof M.generateSyntheticSeries === 'function') {
        chart = M.generateSyntheticSeries('QQQ', '1D');
      }
      if (!chart || !chart.prices || chart.prices.length < 2) return;
      lastPrices = chart.prices.slice(-56);
      if (sparkLabel) {
        sparkLabel.textContent = chart.demo
          ? 'QQQ · demo path for learning'
          : 'QQQ · recent session (context only)';
      }
      drawSparkline(lastPrices, performance.now());
      if (!reduceMotion) {
        if (rafId) window.cancelAnimationFrame(rafId);
        rafId = window.requestAnimationFrame(sparkLoop);
      }
    }

    void loadMarquee();
    void loadSpark();

    if (canvas && canvas.parentElement && typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => {
        if (lastPrices.length) {
          drawSparkline(lastPrices, performance.now());
        }
      });
      ro.observe(canvas.parentElement);
    }

    if (canvas && typeof MutationObserver !== 'undefined') {
      const mo = new MutationObserver(() => {
        if (lastPrices.length) {
          drawSparkline(lastPrices, performance.now());
        }
      });
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }
  }

  function run() {
    initTilt();
    initRiskReward();
    initAmbientCanvas();
    initFlipCards();
    initVideoPanel();
    initCapabilitiesBanner();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
