/**
 * Reusable financial term tooltips (plain CSS; Tailwind equivalents would be
 * underline decoration-dotted, decoration-from-font, text-sm, max-w-xs, shadow-md, rounded-lg).
 *
 * Auto-wrap: add data-glossary-auto to a container; text nodes are scanned for known terms.
 * Manual: <span class="glossary-term" data-term="npv">NPV</span> (data-term matches DEFINITIONS key).
 */
(function () {
  const TOOLTIP_ID = 'iv-glossary-tooltip';

  const DEFINITIONS = {
    npv:
      'Net present value is today’s value of future cash flows after “discounting,” used to compare projects or investments in consistent dollars.',
    amortization:
      'Amortization spreads loan payments over time so each payment covers part of interest and part of principal until the debt is paid off.',
    etf:
      'An exchange-traded fund is a basket of investments (like stocks or bonds) you buy and sell on an exchange like a single stock, often with low fees.',
    diversification:
      'Diversification means spreading money across different investments or types so one bad result does not wipe out your whole portfolio.',
    compoundInterest:
      'Compound interest is interest earned on your original amount and on interest already added, so savings can grow faster the longer you wait.',
    apr:
      'APR (annual percentage rate) is the yearly cost of borrowing, including interest and many fees, as one percentage for easier comparison.',
    budgeting:
      'Budgeting is a plan that lines up expected income with spending and savings goals so you can track and adjust where your money goes.',
    creditManagement:
      'Credit management means using cards and loans responsibly (paying on time and keeping balances in check) to build a strong credit history.',
    emergencyFund:
      'An emergency fund is cash set aside (often several months of expenses) for surprise bills or income loss so you avoid high-interest debt.',
    financialLiteracy:
      'Financial literacy is the knowledge and skills to make informed choices about earning, spending, saving, borrowing, and investing.',
    assetAllocation:
      'Asset allocation is how you split investments among stocks, bonds, cash, and other categories based on goals, timeline, and risk comfort.',
    indexFund:
      'An index fund tracks a market index (like the S&P 500) instead of picking individual stocks, often with broad exposure and low costs.',
    volatility:
      'Volatility measures how much prices swing up and down; higher volatility usually means a bumpier ride and more uncertainty.',
    liquidity:
      'Liquidity is how quickly and easily something can be turned into cash without losing much value.',
    bond:
      'A bond is a loan to a government or company that pays you interest over time and returns the principal at maturity.',
    equity:
      'Equity is ownership in an asset or company; in investing it often means stocks as opposed to bonds.',
    k401:
      'A 401(k) is a workplace retirement plan that lets you contribute from your paycheck, often with tax benefits and sometimes an employer match.',
    riskVsReturn:
      'Risk vs. return is the tradeoff that higher potential reward often comes with a greater chance of loss, so you balance both for your goals.',
    investmentPlanning:
      'Investment planning means setting goals and a time horizon, then choosing investments and contributions that fit what you can tolerate and need.',
    financialStability:
      'Financial stability means you can cover regular expenses, handle small shocks, and avoid constant stress about money.',
    portfolio:
      'Your portfolio is the full set of investments you own together, which you can diversify across assets and accounts.',
    marketInsights:
      'Market insights are observations about trends, prices, or behavior in markets; they are useful for learning context, not a promise of future results.',
    researchAnalysis:
      'Research and analysis means systematically gathering data and reasoning about it to support conclusions, which is core to studying finance rigorously.',
    caseStudy:
      'A case study looks at a real or realistic example in depth to see what happened, why it matters, and what lessons apply elsewhere.',
  };

  /** Longer phrases first so “net present value” wins over “NPV” when both appear. */
  const PATTERN_ROWS = [
    ['risk vs\\. return', 'riskVsReturn'],
    ['compound interest', 'compoundInterest'],
    ['credit management', 'creditManagement'],
    ['financial literacy', 'financialLiteracy'],
    ['investment planning', 'investmentPlanning'],
    ['financial stability', 'financialStability'],
    ['asset allocation', 'assetAllocation'],
    ['portfolios?', 'portfolio'],
    ['emergency funds?', 'emergencyFund'],
    ['index funds?', 'indexFund'],
    ['exchange-traded funds?', 'etf'],
    ['net present value', 'npv'],
    ['market insights', 'marketInsights'],
    ['research (?:&|and) analysis', 'researchAnalysis'],
    ['case studies', 'caseStudy'],
    ['amortization', 'amortization'],
    ['diversification', 'diversification'],
    ['ETFs?', 'etf'],
    ['NPV', 'npv'],
    ['APR', 'apr'],
  ];

  const ENTRIES = PATTERN_ROWS.map(([src, key]) => ({
    key,
    def: DEFINITIONS[key],
    regex: new RegExp(`\\b(${src})\\b`, 'gi'),
  }))
    .concat([
      {
        key: 'k401',
        def: DEFINITIONS.k401,
        /* Trailing \b fails after ')' before whitespace; both are non-word chars. */
        regex: /\b(401\(k\)s?)(?=\W|$)/gi,
      },
    ])
    .filter((e) => e.def)
    .sort((a, b) => b.regex.source.length - a.regex.source.length);

  function findNextMatch(text, from) {
    let best = null;
    for (const entry of ENTRIES) {
      entry.regex.lastIndex = from;
      const m = entry.regex.exec(text);
      if (!m || m.index === undefined) continue;
      const abs = m.index;
      const len = m[1].length;
      const matchText = m[1];
      if (
        !best ||
        abs < best.index ||
        (abs === best.index && len > best.length)
      ) {
        best = { index: abs, length: len, matchText, entry };
      }
    }
    return best;
  }

  function splitTextNode(textNode) {
    const parent = textNode.parentNode;
    if (!parent) return;

    let text = textNode.nodeValue;
    const parts = [];
    let cursor = 0;

    while (cursor < text.length) {
      const best = findNextMatch(text, cursor);
      if (!best) {
        parts.push(document.createTextNode(text.slice(cursor)));
        break;
      }
      if (best.index > cursor) {
        parts.push(document.createTextNode(text.slice(cursor, best.index)));
      }
      const span = document.createElement('span');
      span.className = 'glossary-term';
      span.setAttribute('tabindex', '0');
      span.setAttribute('data-term', best.entry.key);
      span.setAttribute('role', 'term');
      span.textContent = best.matchText;
      parts.push(span);
      cursor = best.index + best.length;
    }

    if (parts.length === 1 && parts[0].nodeType === Node.TEXT_NODE) return;

    for (const p of parts) parent.insertBefore(p, textNode);
    parent.removeChild(textNode);
  }

  function collectTextNodes(root) {
    const out = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !/\S/.test(node.nodeValue)) {
          return NodeFilter.FILTER_REJECT;
        }
        const el = node.parentElement;
        if (!el) return NodeFilter.FILTER_REJECT;
        if (
          el.closest(
            'a, script, style, .glossary-term, code, pre, .no-glossary, h1, h2, h3, h4, h5, h6'
          )
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    while (walker.nextNode()) out.push(walker.currentNode);
    return out;
  }

  function scanContainer(root) {
    const nodes = collectTextNodes(root);
    for (let i = nodes.length - 1; i >= 0; i--) {
      splitTextNode(nodes[i]);
    }
  }

  function ensureTooltip() {
    let el = document.getElementById(TOOLTIP_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = TOOLTIP_ID;
      el.className = 'glossary-tooltip';
      el.setAttribute('role', 'tooltip');
      el.hidden = true;
      document.body.appendChild(el);
    }
    return el;
  }

  function positionTooltip(tooltip, target) {
    const rect = target.getBoundingClientRect();
    const margin = 8;
    const tw = tooltip.offsetWidth;
    const th = tooltip.offsetHeight;
    let left = rect.left + rect.width / 2 - tw / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - tw - margin));
    let top = rect.bottom + margin;
    if (top + th > window.innerHeight - margin) {
      top = rect.top - th - margin;
    }
    top = Math.max(margin, top);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  let activeTerm = null;
  let hideTimer = null;
  let globalListenersBound = false;

  function hideTooltip(tooltip) {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    tooltip.hidden = true;
    tooltip.textContent = '';
    tooltip.classList.remove('is-visible');
    if (activeTerm) {
      activeTerm.removeAttribute('aria-describedby');
      activeTerm = null;
    }
  }

  function showFor(target, tooltip) {
    const key = target.getAttribute('data-term');
    const def = key ? DEFINITIONS[key] : null;
    if (!def) return;

    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }

    if (activeTerm && activeTerm !== target) {
      activeTerm.removeAttribute('aria-describedby');
    }
    activeTerm = target;
    tooltip.textContent = def;
    tooltip.hidden = false;
    activeTerm.setAttribute('aria-describedby', TOOLTIP_ID);

    requestAnimationFrame(() => {
      positionTooltip(tooltip, target);
      tooltip.classList.add('is-visible');
    });
  }

  function bindGlobalListeners(tooltip) {
    if (globalListenersBound) return;
    globalListenersBound = true;
    window.addEventListener(
      'scroll',
      () => {
        if (activeTerm && !tooltip.hidden) positionTooltip(tooltip, activeTerm);
      },
      true
    );
    window.addEventListener('resize', () => {
      if (activeTerm && !tooltip.hidden) positionTooltip(tooltip, activeTerm);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideTooltip(tooltip);
    });
  }

  function wireTerms(root, tooltip) {
    root.querySelectorAll('.glossary-term:not([data-glossary-wired])').forEach((el) => {
      el.setAttribute('data-glossary-wired', '1');
      el.addEventListener('mouseenter', () => showFor(el, tooltip));
      el.addEventListener('mouseleave', () => {
        hideTimer = setTimeout(() => hideTooltip(tooltip), 80);
      });
      el.addEventListener('focus', () => showFor(el, tooltip));
      el.addEventListener('blur', () => {
        hideTimer = setTimeout(() => hideTooltip(tooltip), 80);
      });
    });
  }

  function init(root) {
    const scope = root && root.querySelector ? root : document;
    const tooltip = ensureTooltip();
    bindGlobalListeners(tooltip);
    scope.querySelectorAll('[data-glossary-auto]').forEach((container) => {
      scanContainer(container);
    });
    wireTerms(scope, tooltip);
  }

  window.FinancialGlossary = {
    init,
    scanContainer,
    DEFINITIONS,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init(document));
  } else {
    init(document);
  }
})();
