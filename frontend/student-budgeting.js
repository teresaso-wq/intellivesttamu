/**
 * Finance page: Budgeting calculators for all life stages + tab switching.
 */
(function () {
  var fmt = function (n) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(isFinite(n) && n >= 0 ? n : 0);
  };

  function g(id) { return document.getElementById(id); }
  function val(id, def) {
    var el = g(id);
    if (!el) return (def !== undefined ? def : 0);
    var v = parseFloat(String(el.value).replace(/,/g, ''));
    return isFinite(v) ? v : (def !== undefined ? def : 0);
  }
  function bind(ids, fn) {
    ids.forEach(function (id) {
      var el = g(id);
      if (el) el.addEventListener('input', fn);
    });
  }
  function setNet(statId, valueId, net) {
    var stat = g(statId);
    var value = g(valueId);
    if (!value) return;
    if (net >= 0) {
      value.textContent = fmt(net) + ' ✅';
      if (stat) { stat.classList.remove('is-negative'); stat.classList.add('is-positive'); }
    } else {
      value.textContent = fmt(Math.abs(net)) + ' deficit ⚠️';
      if (stat) { stat.classList.remove('is-positive'); stat.classList.add('is-negative'); }
    }
  }

  /* ── Tabs ── */
  function initTabs() {
    var tabs = document.querySelectorAll('[data-budget-tab]');
    if (!tabs.length) return;
    function setActiveTab(key) {
      tabs.forEach(function (t) {
        var isActive = t.getAttribute('data-budget-tab') === key;
        t.classList.toggle('active', isActive);
        t.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
      document.querySelectorAll('.budget-tab-panel').forEach(function (p) {
        p.hidden = p.id !== 'budgetTab-' + key;
      });
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var key = tab.getAttribute('data-budget-tab');
        setActiveTab(key);
      });
    });

    var active = document.querySelector('[data-budget-tab].active');
    setActiveTab(active ? active.getAttribute('data-budget-tab') : 'students');
  }

  /* ── Students ── */
  function initStudents() {
    function update() {
      var gigMonthly = (Math.max(0, val('sGigHours')) * Math.max(0, val('sGigRate')) * 52) / 12;
      var income = gigMonthly + Math.max(0, val('sOtherIncome'));
      var expenses = ['sRent','sUtilities','sFood','sTransport','sLoan','sOther']
        .reduce(function (s, id) { return s + Math.max(0, val(id)); }, 0);
      var net = income - expenses;
      if (g('sTotalIncome')) g('sTotalIncome').textContent = fmt(income);
      if (g('sTotalExpenses')) g('sTotalExpenses').textContent = fmt(expenses);
      setNet('sNetStat', 'sNet', net);
    }
    bind(['sGigHours','sGigRate','sOtherIncome','sRent','sUtilities','sFood','sTransport','sLoan','sOther'], update);
    update();
  }

  /* ── Working Adults ── */
  function initAdults() {
    function update() {
      var gross = Math.max(0, val('aAnnualSalary')) / 12;
      var taxRate = Math.min(100, Math.max(0, val('aTaxRate', 22)));
      var deductions = Math.max(0, val('aDeductions'));
      var other = Math.max(0, val('aOtherIncome'));
      var takeHome = gross * (1 - taxRate / 100) - deductions + other;
      var expenses = ['aRent','aGroceries','aTransport','aInsurance','aUtilities','aPersonal']
        .reduce(function (s, id) { return s + Math.max(0, val(id)); }, 0);
      var net = takeHome - expenses;
      if (g('aGross')) g('aGross').textContent = fmt(gross);
      if (g('aTotalIncome')) g('aTotalIncome').textContent = fmt(Math.max(0, takeHome));
      if (g('aTotalExpenses')) g('aTotalExpenses').textContent = fmt(expenses);
      setNet('aNetStat', 'aNet', net);
    }
    bind(['aAnnualSalary','aTaxRate','aDeductions','aOtherIncome','aRent','aGroceries','aTransport','aInsurance','aUtilities','aPersonal'], update);
    update();
  }

  /* ── Families ── */
  function initFamilies() {
    function update() {
      var income = Math.max(0, val('fIncome1')) + Math.max(0, val('fIncome2'));
      var expenses = ['fMortgage','fGroceries','fChildcare','fKidsActivities','fTransport','fInsurance','fOther']
        .reduce(function (s, id) { return s + Math.max(0, val(id)); }, 0);
      var net = income - expenses;
      if (g('fTotalIncome')) g('fTotalIncome').textContent = fmt(income);
      if (g('fTotalExpenses')) g('fTotalExpenses').textContent = fmt(expenses);
      setNet('fNetStat', 'fNet', net);
    }
    bind(['fIncome1','fIncome2','fMortgage','fGroceries','fChildcare','fKidsActivities','fTransport','fInsurance','fOther'], update);
    update();
  }

  /* ── Savings Goals ── */
  function initSavings() {
    // Emergency fund
    function updateEF() {
      var expenses = Math.max(0, val('efExpenses'));
      var saved = Math.max(0, val('efSaved'));
      var monthly = Math.max(0, val('efMonthlySave'));
      var t3 = expenses * 3;
      var t6 = expenses * 6;
      var rem3 = Math.max(0, t3 - saved);
      var months = monthly > 0 ? Math.ceil(rem3 / monthly) : '∞';
      if (g('efTarget3')) g('efTarget3').textContent = fmt(t3);
      if (g('efTarget6')) g('efTarget6').textContent = fmt(t6);
      if (g('efMonthsTo3')) g('efMonthsTo3').textContent = rem3 <= 0 ? '✅ Already there!' : months + ' months';
    }
    bind(['efExpenses','efSaved','efMonthlySave'], updateEF);
    updateEF();

    // Savings goal
    function updateSG() {
      var goal = Math.max(0, val('sgGoal'));
      var already = Math.max(0, val('sgAlready'));
      var months = Math.max(1, val('sgMonths', 1));
      var remaining = Math.max(0, goal - already);
      if (g('sgRemaining')) g('sgRemaining').textContent = fmt(remaining);
      if (g('sgMonthlyNeeded')) g('sgMonthlyNeeded').textContent = fmt(remaining / months);
    }
    bind(['sgGoal','sgAlready','sgMonths'], updateSG);
    updateSG();

    // College fund
    function updateCF() {
      var goal = Math.max(0, val('cfGoal'));
      var years = Math.max(1, val('cfYears', 1));
      var r = Math.max(0, val('cfReturn')) / 100 / 12;
      var already = Math.max(0, val('cfAlready'));
      var n = years * 12;
      var fvAlready = already * Math.pow(1 + r, n);
      var remaining = Math.max(0, goal - fvAlready);
      var monthly = r === 0 ? remaining / n : remaining * r / (Math.pow(1 + r, n) - 1);
      if (g('cfMonthly')) g('cfMonthly').textContent = fmt(Math.max(0, monthly));
    }
    bind(['cfGoal','cfYears','cfReturn','cfAlready'], updateCF);
    updateCF();

    // Trip budget (savings tab only)
    function updateTrip() {
      var total = ['tripFlights','tripHotel','tripFood','tripActivities','tripMisc']
        .reduce(function (s, id) { return s + Math.max(0, val(id)); }, 0);
      if (g('tripTotal')) g('tripTotal').textContent = fmt(total);
    }
    bind(['tripFlights','tripHotel','tripFood','tripActivities','tripMisc'], updateTrip);
    updateTrip();

    // Vacation savings countdown (savings tab only — no separate vacation tab)
    function updateVac() {
      var goal = Math.max(0, val('vacGoal'));
      var already = Math.max(0, val('vacAlready'));
      var months = Math.max(1, val('vacMonths', 1));
      var remaining = Math.max(0, goal - already);
      if (g('vacRemaining')) g('vacRemaining').textContent = fmt(remaining);
      if (g('vacMonthlyNeeded')) g('vacMonthlyNeeded').textContent = fmt(remaining / months);
    }
    bind(['vacGoal','vacAlready','vacMonths'], updateVac);
    updateVac();

    // Daily spending budget (savings tab only)
    function updateDSB() {
      var total = Math.max(0, val('dsbTotal'));
      var fixed = Math.max(0, val('dsbFixed'));
      var days = Math.max(1, val('dsbDays', 1));
      var spending = Math.max(0, total - fixed);
      if (g('dsbSpending')) g('dsbSpending').textContent = fmt(spending);
      if (g('dsbDaily')) g('dsbDaily').textContent = fmt(spending / days);
    }
    bind(['dsbTotal','dsbFixed','dsbDays'], updateDSB);
    updateDSB();
  }

  function init() {
    if (!document.getElementById('studentBudgeting')) return;
    initTabs();
    initStudents();
    initAdults();
    initFamilies();
    initSavings();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
