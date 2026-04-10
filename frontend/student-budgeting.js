/**
 * Finance page: Student Budgeting calculators (gig income, loan interest, COL breakdown).
 */
(function () {
  const money = (n) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(Number.isFinite(n) ? n : 0);

  const moneyCents = (n) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(n) ? n : 0);

  function parseNum(el, fallback = 0) {
    const v = parseFloat(String(el.value).replace(/,/g, ''));
    return Number.isFinite(v) ? v : fallback;
  }

  function initGigCalculator(root) {
    const hours = root.querySelector('#budgetGigHours');
    const rate = root.querySelector('#budgetGigRate');
    const extra = root.querySelector('#budgetGigExtra');
    const outWeekly = root.querySelector('#budgetGigOutWeekly');
    const outMonthly = root.querySelector('#budgetGigOutMonthly');
    if (!hours || !rate || !extra || !outWeekly || !outMonthly) return;

    function update() {
      const h = Math.max(0, parseNum(hours, 0));
      const r = Math.max(0, parseNum(rate, 0));
      const ex = Math.max(0, parseNum(extra, 0));
      const weekly = h * r;
      const monthlyGig = (weekly * 52) / 12;
      const monthlyTotal = monthlyGig + ex;
      outWeekly.textContent = money(weekly);
      outMonthly.textContent = money(monthlyTotal);
    }

    [hours, rate, extra].forEach((el) => el.addEventListener('input', update));
    update();
  }

  function loanMonthlyPayment(principal, annualAprPct, years) {
    const n = Math.round(Math.max(0, years) * 12);
    if (principal <= 0 || n <= 0) return 0;
    const r = annualAprPct / 100 / 12;
    if (r === 0) return principal / n;
    const pow = (1 + r) ** n;
    return (principal * r * pow) / (pow - 1);
  }

  function initLoanEstimator(root) {
    const principal = root.querySelector('#budgetLoanPrincipal');
    const apr = root.querySelector('#budgetLoanApr');
    const years = root.querySelector('#budgetLoanYears');
    const outPayment = root.querySelector('#budgetLoanPayment');
    const outInterest = root.querySelector('#budgetLoanInterest');
    if (!principal || !apr || !years || !outPayment || !outInterest) return;

    function update() {
      const P = Math.max(0, parseNum(principal, 0));
      const a = Math.max(0, parseNum(apr, 0));
      const y = Math.max(0.25, parseNum(years, 10));
      const pay = loanMonthlyPayment(P, a, y);
      const n = Math.round(y * 12);
      const totalPaid = pay * n;
      const interest = Math.max(0, totalPaid - P);
      outPayment.textContent = moneyCents(pay);
      outInterest.textContent = moneyCents(interest);
    }

    [principal, apr, years].forEach((el) => el.addEventListener('input', update));
    update();
  }

  function initColBreakdown(root) {
    const fields = [
      { id: 'budgetColRent', bar: 'budgetColBarRent' },
      { id: 'budgetColUtilities', bar: 'budgetColBarUtilities' },
      { id: 'budgetColFood', bar: 'budgetColBarFood' },
      { id: 'budgetColTransport', bar: 'budgetColBarTransport' },
      { id: 'budgetColOther', bar: 'budgetColBarOther' },
    ];
    const totalEl = root.querySelector('#budgetColTotal');
    const track = root.querySelector('#budgetColBarTrack');
    if (!totalEl || !track) return;

    function update() {
      let sum = 0;
      const amounts = [];
      for (const { id } of fields) {
        const el = root.querySelector('#' + id);
        const v = el ? Math.max(0, parseNum(el, 0)) : 0;
        amounts.push(v);
        sum += v;
      }
      totalEl.textContent = money(sum);

      fields.forEach(({ bar }, i) => {
        const seg = root.querySelector('#' + bar);
        if (!seg) return;
        const pct = sum > 0 ? (amounts[i] / sum) * 100 : 0;
        seg.style.flexBasis = pct + '%';
        seg.style.minWidth = amounts[i] > 0 ? '4px' : '0';
      });
    }

    fields.forEach(({ id }) => {
      const el = root.querySelector('#' + id);
      if (el) el.addEventListener('input', update);
    });
    update();
  }

  function init() {
    const root = document.getElementById('studentBudgeting');
    if (!root) return;
    initGigCalculator(root);
    initLoanEstimator(root);
    initColBreakdown(root);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
