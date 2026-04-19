/**
 * Finance page: Budgeting calculators for all audiences + tab switching.
 */
(function () {
  var money = function (n) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(isFinite(n) ? n : 0);
  };
  var moneyCents = function (n) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(isFinite(n) ? n : 0);
  };
  function parseNum(el, fallback) {
    if (fallback === undefined) fallback = 0;
    var v = parseFloat(String(el ? el.value : '').replace(/,/g, ''));
    return isFinite(v) ? v : fallback;
  }
  function q(id) { return document.getElementById(id); }
  function bind(ids, fn) {
    ids.forEach(function (id) {
      var el = q(id);
      if (el) el.addEventListener('input', fn);
    });
  }

  /* ── Tab switching ── */
  function initTabs() {
    var tabs = document.querySelectorAll('[data-budget-tab]');
    if (!tabs.length) return;
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var key = tab.getAttribute('data-budget-tab');
        tabs.forEach(function (t) {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        document.querySelectorAll('.budget-tab-panel').forEach(function (panel) {
          panel.hidden = panel.id !== 'budgetTab-' + key;
        });
      });
    });
  }

  /* ── STUDENTS ── */
  function initGigCalculator() {
    function update() {
      var h = Math.max(0, parseNum(q('budgetGigHours')));
      var r = Math.max(0, parseNum(q('budgetGigRate')));
      var ex = Math.max(0, parseNum(q('budgetGigExtra')));
      var weekly = h * r;
      var monthly = (weekly * 52) / 12 + ex;
      if (q('budgetGigOutWeekly')) q('budgetGigOutWeekly').textContent = money(weekly);
      if (q('budgetGigOutMonthly')) q('budgetGigOutMonthly').textContent = money(monthly);
    }
    bind(['budgetGigHours', 'budgetGigRate', 'budgetGigExtra'], update);
    update();
  }

  function loanPayment(principal, apr, years) {
    var n = Math.round(Math.max(0, years) * 12);
    if (principal <= 0 || n <= 0) return 0;
    var r = apr / 100 / 12;
    if (r === 0) return principal / n;
    var pow = Math.pow(1 + r, n);
    return (principal * r * pow) / (pow - 1);
  }

  function initLoanEstimator() {
    function update() {
      var P = Math.max(0, parseNum(q('budgetLoanPrincipal')));
      var a = Math.max(0, parseNum(q('budgetLoanApr')));
      var y = Math.max(0.25, parseNum(q('budgetLoanYears'), 10));
      var pay = loanPayment(P, a, y);
      var interest = Math.max(0, pay * Math.round(y * 12) - P);
      if (q('budgetLoanPayment')) q('budgetLoanPayment').textContent = moneyCents(pay);
      if (q('budgetLoanInterest')) q('budgetLoanInterest').textContent = moneyCents(interest);
    }
    bind(['budgetLoanPrincipal', 'budgetLoanApr', 'budgetLoanYears'], update);
    update();
  }

  function initColBreakdown() {
    var fields = [
      { id: 'budgetColRent', bar: 'budgetColBarRent' },
      { id: 'budgetColUtilities', bar: 'budgetColBarUtilities' },
      { id: 'budgetColFood', bar: 'budgetColBarFood' },
      { id: 'budgetColTransport', bar: 'budgetColBarTransport' },
      { id: 'budgetColOther', bar: 'budgetColBarOther' },
    ];
    function update() {
      var sum = 0;
      var amounts = fields.map(function (f) {
        var v = Math.max(0, parseNum(q(f.id)));
        sum += v;
        return v;
      });
      if (q('budgetColTotal')) q('budgetColTotal').textContent = money(sum);
      fields.forEach(function (f, i) {
        var seg = q(f.bar);
        if (!seg) return;
        var pct = sum > 0 ? (amounts[i] / sum) * 100 : 0;
        seg.style.flexBasis = pct + '%';
        seg.style.minWidth = amounts[i] > 0 ? '4px' : '0';
      });
    }
    bind(fields.map(function (f) { return f.id; }), update);
    update();
  }

  /* ── WORKING ADULTS ── */
  function initAdultPlanner() {
    function update() {
      var salary = Math.max(0, parseNum(q('adultSalary')));
      var taxRate = Math.max(0, parseNum(q('adultTaxRate')));
      var deductions = Math.max(0, parseNum(q('adultDeductions')));
      var gross = salary / 12;
      var afterTax = gross * (1 - taxRate / 100);
      var takeHome = afterTax - deductions;
      if (q('adultGrossMonthly')) q('adultGrossMonthly').textContent = money(gross);
      if (q('adultAfterTax')) q('adultAfterTax').textContent = money(afterTax);
      if (q('adultTakeHome')) q('adultTakeHome').textContent = money(Math.max(0, takeHome));
    }
    bind(['adultSalary', 'adultTaxRate', 'adultDeductions'], update);
    update();
  }

  function initWorkExpenses() {
    function update() {
      var total = ['workCommute', 'workLunch', 'workClothing', 'workSubs'].reduce(function (s, id) {
        return s + Math.max(0, parseNum(q(id)));
      }, 0);
      if (q('workExpensesTotal')) q('workExpensesTotal').textContent = money(total);
    }
    bind(['workCommute', 'workLunch', 'workClothing', 'workSubs'], update);
    update();
  }

  function init401k() {
    function update() {
      var salary = Math.max(0, parseNum(q('k401Salary')));
      var yourPct = Math.max(0, parseNum(q('k401YourPct')));
      var matchPct = Math.max(0, parseNum(q('k401MatchPct')));
      var yourAmt = salary * (yourPct / 100);
      var effectiveMatch = Math.min(yourPct, matchPct);
      var matchAmt = salary * (effectiveMatch / 100);
      if (q('k401YourAmt')) q('k401YourAmt').textContent = money(yourAmt);
      if (q('k401MatchAmt')) q('k401MatchAmt').textContent = money(matchAmt);
      if (q('k401Total')) q('k401Total').textContent = money(yourAmt + matchAmt);
    }
    bind(['k401Salary', 'k401YourPct', 'k401MatchPct'], update);
    update();
  }

  /* ── FAMILIES ── */
  function initHousehold() {
    var ids = ['hhMortgage', 'hhGroceries', 'hhChildcare', 'hhTransport', 'hhInsurance', 'hhOther'];
    function update() {
      var total = ids.reduce(function (s, id) { return s + Math.max(0, parseNum(q(id))); }, 0);
      if (q('hhTotal')) q('hhTotal').textContent = money(total);
    }
    bind(ids, update);
    update();
  }

  function initGroceries() {
    function update() {
      var people = Math.max(1, parseNum(q('grocPeople'), 1));
      var perPerson = Math.max(0, parseNum(q('grocPerPerson')));
      var dineOut = Math.max(0, parseNum(q('grocDineOut')));
      var weekly = people * perPerson + dineOut;
      var monthly = weekly * 52 / 12;
      if (q('grocWeekly')) q('grocWeekly').textContent = money(weekly);
      if (q('grocMonthly')) q('grocMonthly').textContent = money(monthly);
    }
    bind(['grocPeople', 'grocPerPerson', 'grocDineOut'], update);
    update();
  }

  function initCollegeFund() {
    function update() {
      var goal = Math.max(0, parseNum(q('cfGoal')));
      var years = Math.max(1, parseNum(q('cfYears'), 1));
      var returnPct = Math.max(0, parseNum(q('cfReturn')));
      var already = Math.max(0, parseNum(q('cfAlready')));
      var n = years * 12;
      var r = returnPct / 100 / 12;
      var fvAlready = already * Math.pow(1 + r, n);
      var remaining = Math.max(0, goal - fvAlready);
      var monthly;
      if (r === 0) {
        monthly = remaining / n;
      } else {
        monthly = remaining * r / (Math.pow(1 + r, n) - 1);
      }
      if (q('cfMonthly')) q('cfMonthly').textContent = money(Math.max(0, monthly));
    }
    bind(['cfGoal', 'cfYears', 'cfReturn', 'cfAlready'], update);
    update();
  }

  /* ── SAVINGS GOALS ── */
  function initEmergencyFund() {
    function update() {
      var expenses = Math.max(0, parseNum(q('efMonthlyExpenses')));
      var saved = Math.max(0, parseNum(q('efCurrentSaved')));
      var monthlySave = Math.max(0, parseNum(q('efMonthlySave')));
      var t3 = expenses * 3;
      var t6 = expenses * 6;
      var remaining3 = Math.max(0, t3 - saved);
      var months = monthlySave > 0 ? Math.ceil(remaining3 / monthlySave) : '∞';
      if (q('efTarget3')) q('efTarget3').textContent = money(t3);
      if (q('efTarget6')) q('efTarget6').textContent = money(t6);
      if (q('efMonthsTo3')) q('efMonthsTo3').textContent = remaining3 <= 0 ? '✅ Done!' : months + ' months';
    }
    bind(['efMonthlyExpenses', 'efCurrentSaved', 'efMonthlySave'], update);
    update();
  }

  function initDownPayment() {
    function update() {
      var goal = Math.max(0, parseNum(q('dpGoal')));
      var already = Math.max(0, parseNum(q('dpAlready')));
      var months = Math.max(1, parseNum(q('dpMonths'), 1));
      var remaining = Math.max(0, goal - already);
      var monthly = remaining / months;
      if (q('dpRemaining')) q('dpRemaining').textContent = money(remaining);
      if (q('dpMonthlyNeeded')) q('dpMonthlyNeeded').textContent = money(monthly);
    }
    bind(['dpGoal', 'dpAlready', 'dpMonths'], update);
    update();
  }

  function initSavingsGoal() {
    function update() {
      var goal = Math.max(0, parseNum(q('sgGoal')));
      var already = Math.max(0, parseNum(q('sgAlready')));
      var months = Math.max(1, parseNum(q('sgMonths'), 1));
      var monthly = Math.max(0, goal - already) / months;
      if (q('sgMonthlyNeeded')) q('sgMonthlyNeeded').textContent = money(monthly);
    }
    bind(['sgGoal', 'sgAlready', 'sgMonths'], update);
    update();
  }

  /* ── VACATION ── */
  function initTripBudget() {
    var ids = ['tripFlights', 'tripHotel', 'tripFood', 'tripActivities', 'tripMisc'];
    function update() {
      var total = ids.reduce(function (s, id) { return s + Math.max(0, parseNum(q(id))); }, 0);
      if (q('tripTotal')) q('tripTotal').textContent = money(total);
    }
    bind(ids, update);
    update();
  }

  function initVacationSavings() {
    function update() {
      var goal = Math.max(0, parseNum(q('vacGoal')));
      var already = Math.max(0, parseNum(q('vacAlready')));
      var months = Math.max(1, parseNum(q('vacMonths'), 1));
      var remaining = Math.max(0, goal - already);
      var monthly = remaining / months;
      if (q('vacRemaining')) q('vacRemaining').textContent = money(remaining);
      if (q('vacMonthlyNeeded')) q('vacMonthlyNeeded').textContent = money(monthly);
    }
    bind(['vacGoal', 'vacAlready', 'vacMonths'], update);
    update();
  }

  function initDailyBudget() {
    function update() {
      var total = Math.max(0, parseNum(q('dsbTotal')));
      var fixed = Math.max(0, parseNum(q('dsbFixed')));
      var days = Math.max(1, parseNum(q('dsbDays'), 1));
      var spending = Math.max(0, total - fixed);
      var daily = spending / days;
      if (q('dsbSpending')) q('dsbSpending').textContent = money(spending);
      if (q('dsbDaily')) q('dsbDaily').textContent = money(daily);
    }
    bind(['dsbTotal', 'dsbFixed', 'dsbDays'], update);
    update();
  }

  function init() {
    if (!document.getElementById('studentBudgeting')) return;
    initTabs();
    // Students
    initGigCalculator();
    initLoanEstimator();
    initColBreakdown();
    // Working Adults
    initAdultPlanner();
    initWorkExpenses();
    init401k();
    // Families
    initHousehold();
    initGroceries();
    initCollegeFund();
    // Savings Goals
    initEmergencyFund();
    initDownPayment();
    initSavingsGoal();
    // Vacation
    initTripBudget();
    initVacationSavings();
    initDailyBudget();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
