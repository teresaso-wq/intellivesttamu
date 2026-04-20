// Onboarding survey for chatbot page only — localStorage keys per spec
(function () {
  var KEY_DONE = 'intellivest_survey_complete';
  var KEYS = [
    'intellivest_user_name',
    'intellivest_user_age',
    'intellivest_user_savings',
    'intellivest_user_amount',
    'intellivest_user_timeline',
    'intellivest_user_risk',
    'intellivest_user_goals'
  ];

  var step = 0;
  var overlay = null;
  var draft = {};

  var AGE_OPTS = ['Under 18', '18–24', '25–34', '35–44', '45–54', '55–64', '65+'];
  var SAVINGS_OPTS = [
    'Under $500',
    '$500–$2,000',
    '$2,000–$10,000',
    '$10,000–$50,000',
    '$50,000+'
  ];
  var RISK_OPTS = [
    { k: 'Very Conservative', e: '🟢' },
    { k: 'Conservative', e: '🟡' },
    { k: 'Moderate', e: '🟠' },
    { k: 'Aggressive', e: '🔴' },
    { k: 'Very Aggressive', e: '🔥' }
  ];
  var GOAL_OPTS = [
    'Learn how to save money',
    'Build or improve my credit score',
    'Save for a house',
    'Start investing in stocks',
    'Learn about mutual funds or ETFs',
    'Plan for retirement',
    'Other'
  ];
  var TIMELINE_OPTS = [
    'Under 1 year',
    '1–3 years',
    '3–5 years',
    '5–10 years',
    '10+ years'
  ];

  function clearSurveyData() {
    KEYS.forEach(function (k) {
      try {
        localStorage.removeItem(k);
      } catch (e) {}
    });
    try {
      localStorage.removeItem(KEY_DONE);
    } catch (e2) {}
  }

  function surveyFinishedSkipped() {
    try {
      localStorage.setItem(KEY_DONE, 'skipped');
    } catch (e) {}
    teardown(true);
  }

  function surveyFinishedComplete() {
    try {
      localStorage.setItem('intellivest_user_name', draft.name || '');
      localStorage.setItem('intellivest_user_age', draft.age || '');
      localStorage.setItem('intellivest_user_savings', draft.savings || '');
      localStorage.setItem('intellivest_user_amount', draft.amount || '');
      localStorage.setItem('intellivest_user_timeline', draft.timeline || '');
      localStorage.setItem('intellivest_user_risk', draft.risk || '');
      localStorage.setItem('intellivest_user_goals', JSON.stringify(draft.goals || []));
      localStorage.setItem(KEY_DONE, 'true');
    } catch (e) {}
    teardown(true);
  }

  function teardown(fireEvent) {
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null;
    var inp = document.getElementById('chatbotInput');
    var form = document.getElementById('chatbotForm');
    if (inp) {
      inp.disabled = false;
      inp.removeAttribute('aria-disabled');
    }
    if (form) form.style.pointerEvents = '';
    document.body.style.overflow = '';
    if (fireEvent) {
      window.__chatbotAllowStart = true;
      document.dispatchEvent(new Event('chatbot-survey-ready'));
    }
  }

  function lockInput() {
    var inp = document.getElementById('chatbotInput');
    var form = document.getElementById('chatbotForm');
    if (inp) {
      inp.disabled = true;
      inp.setAttribute('aria-disabled', 'true');
    }
    if (form) form.style.pointerEvents = 'none';
  }

  function render() {
    if (!overlay) return;
    var body = overlay.querySelector('.cb-survey-body');
    var title = overlay.querySelector('.cb-survey-title');
    var bar = overlay.querySelector('.cb-survey-bar-fill');
    var stepLabel = overlay.querySelector('.cb-survey-step-label');
    var totalSteps = 6;
    var pct = ((step + 1) / totalSteps) * 100;
    if (bar) bar.style.width = pct + '%';
    if (stepLabel) stepLabel.textContent = 'Step ' + (step + 1) + ' of ' + totalSteps;

    if (step === 0) {
      title.textContent = 'What is your first name?';
      body.innerHTML =
        '<label class="cb-survey-field"><span class="cb-survey-label">First name</span>' +
        '<input type="text" class="cb-survey-input" id="cbName" autocomplete="given-name" placeholder="Your first name" value="' +
        (draft.name || '').replace(/"/g, '&quot;') +
        '" /></label>';
    } else if (step === 1) {
      title.textContent = 'How old are you?';
      body.innerHTML =
        '<label class="cb-survey-field"><span class="cb-survey-label">Age range</span>' +
        '<select class="cb-survey-select" id="cbAge">' +
        AGE_OPTS.map(function (o) {
          return (
            '<option value="' +
            o.replace(/"/g, '&quot;') +
            '"' +
            (draft.age === o ? ' selected' : '') +
            '>' +
            o +
            '</option>'
          );
        }).join('') +
        '</select></label>';
    } else if (step === 2) {
      title.textContent =
        'How much money do you have available to save or invest? (not used for bills)';
      body.innerHTML =
        '<label class="cb-survey-field"><span class="cb-survey-label">Amount</span>' +
        '<select class="cb-survey-select" id="cbSavings">' +
        SAVINGS_OPTS.map(function (o) {
          return (
            '<option value="' +
            o.replace(/"/g, '&quot;') +
            '"' +
            (draft.savings === o ? ' selected' : '') +
            '>' +
            o +
            '</option>'
          );
        }).join('') +
        '</select></label>' +
        '<label class="cb-survey-field"><span class="cb-survey-label">Amount = (optional custom number)</span>' +
        '<input type="text" class="cb-survey-input" id="cbAmount" inputmode="numeric" placeholder="e.g. 20,000,000" value="' +
        (draft.amount || '').replace(/"/g, '&quot;') +
        '" /></label>';
    } else if (step === 3) {
      title.textContent = 'How long do you plan to keep this money invested?';
      body.innerHTML =
        '<label class="cb-survey-field"><span class="cb-survey-label">Timeline / holding period</span>' +
        '<select class="cb-survey-select" id="cbTimeline">' +
        TIMELINE_OPTS.map(function (o) {
          return (
            '<option value="' +
            o.replace(/"/g, '&quot;') +
            '"' +
            (draft.timeline === o ? ' selected' : '') +
            '>' +
            o +
            '</option>'
          );
        }).join('') +
        '</select></label>';
    } else if (step === 4) {
      title.textContent = 'How comfortable are you with financial risk?';
      body.innerHTML =
        '<div class="cb-risk-grid" id="cbRisk">' +
        RISK_OPTS.map(function (r) {
          var sel = draft.risk === r.k ? ' is-selected' : '';
          return (
            '<button type="button" class="cb-risk-btn' +
            sel +
            '" data-risk="' +
            r.k.replace(/"/g, '&quot;') +
            '">' +
            r.e +
            ' ' +
            r.k +
            '</button>'
          );
        }).join('') +
        '</div>';
      body.querySelectorAll('.cb-risk-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          body.querySelectorAll('.cb-risk-btn').forEach(function (b) {
            b.classList.remove('is-selected');
          });
          btn.classList.add('is-selected');
          draft.risk = btn.getAttribute('data-risk');
        });
      });
    } else if (step === 5) {
      title.textContent = 'What is your main financial goal? (select all that apply)';
      var g = draft.goals || [];
      body.innerHTML =
        '<div class="cb-goals-list" id="cbGoals">' +
        GOAL_OPTS.map(function (o) {
          var id = 'g_' + o.replace(/[^a-z0-9]+/gi, '_');
          var checked = g.indexOf(o) >= 0 ? ' checked' : '';
          return (
            '<label class="cb-goal-row">' +
            '<input type="checkbox" id="' +
            id +
            '" value="' +
            o.replace(/"/g, '&quot;') +
            '"' +
            checked +
            ' />' +
            '<span>' +
            o +
            '</span></label>'
          );
        }).join('') +
        '</div>';
    }
    var nextBtn = overlay.querySelector('.cb-survey-next');
    if (nextBtn) nextBtn.textContent = step === 5 ? 'Finish' : 'Next';
  }

  function collect() {
    if (step === 0) {
      var el = document.getElementById('cbName');
      draft.name = el ? el.value.trim() : '';
    } else if (step === 1) {
      var el2 = document.getElementById('cbAge');
      draft.age = el2 ? el2.value : '';
    } else if (step === 2) {
      var el3 = document.getElementById('cbSavings');
      draft.savings = el3 ? el3.value : '';
      var elAmount = document.getElementById('cbAmount');
      draft.amount = elAmount ? String(elAmount.value || '').trim() : '';
    } else if (step === 3) {
      var el4 = document.getElementById('cbTimeline');
      draft.timeline = el4 ? el4.value : '';
    } else if (step === 4) {
      /* draft.risk set by button */
    } else if (step === 5) {
      draft.goals = [];
      document.querySelectorAll('#cbGoals input:checked').forEach(function (c) {
        draft.goals.push(c.value);
      });
    }
  }

  function openSurvey() {
    lockInput();
    draft = {};
    try {
      if (localStorage.getItem('intellivest_user_name'))
        draft.name = localStorage.getItem('intellivest_user_name');
      if (localStorage.getItem('intellivest_user_age'))
        draft.age = localStorage.getItem('intellivest_user_age');
      if (localStorage.getItem('intellivest_user_savings'))
        draft.savings = localStorage.getItem('intellivest_user_savings');
      if (localStorage.getItem('intellivest_user_amount'))
        draft.amount = localStorage.getItem('intellivest_user_amount');
      if (localStorage.getItem('intellivest_user_timeline'))
        draft.timeline = localStorage.getItem('intellivest_user_timeline');
      if (localStorage.getItem('intellivest_user_risk'))
        draft.risk = localStorage.getItem('intellivest_user_risk');
      var gj = localStorage.getItem('intellivest_user_goals');
      if (gj) draft.goals = JSON.parse(gj);
    } catch (e) {}
    if (!draft.goals) draft.goals = [];

    step = 0;
    var wrap = document.querySelector('.chatbot-window');
    if (!wrap) return;

    overlay = document.createElement('div');
    overlay.className = 'cb-survey-overlay';
    overlay.innerHTML =
      '<div class="cb-survey-modal" role="dialog" aria-modal="true">' +
      '<div class="cb-survey-progress">' +
      '<div class="cb-survey-step-label">Step 1 of 6</div>' +
      '<div class="cb-survey-bar"><div class="cb-survey-bar-fill"></div></div>' +
      '</div>' +
      '<h2 class="cb-survey-title">What is your first name?</h2>' +
      '<div class="cb-survey-body"></div>' +
      '<div class="cb-survey-actions">' +
      '<button type="button" class="btn ghost cb-survey-skip">Skip Survey</button>' +
      '<div class="cb-survey-actions-right">' +
      '<button type="button" class="btn secondary cb-survey-back" style="visibility:hidden">Back</button>' +
      '<button type="button" class="btn primary cb-survey-next">Next</button>' +
      '</div></div></div>';

    wrap.style.position = 'relative';
    wrap.appendChild(overlay);

    overlay.querySelector('.cb-survey-skip').addEventListener('click', function () {
      surveyFinishedSkipped();
    });

    overlay.querySelector('.cb-survey-back').addEventListener('click', function () {
      if (step > 0) {
        collect();
        step--;
        render();
        overlay.querySelector('.cb-survey-back').style.visibility = step === 0 ? 'hidden' : 'visible';
        overlay.querySelector('.cb-survey-next').textContent = step === 5 ? 'Finish' : 'Next';
      }
    });

    overlay.querySelector('.cb-survey-next').addEventListener('click', function () {
      collect();
      if (step === 0 && !draft.name) {
        alert('Please enter your first name, or tap Skip Survey.');
        return;
      }
      if (step === 4 && !draft.risk) {
        alert('Please choose a risk level, or tap Skip Survey.');
        return;
      }
      if (step === 5 && (!draft.goals || draft.goals.length === 0)) {
        alert('Please select at least one goal, or tap Skip Survey.');
        return;
      }
      if (step < 5) {
        step++;
        render();
        overlay.querySelector('.cb-survey-back').style.visibility = 'visible';
        overlay.querySelector('.cb-survey-next').textContent = step === 5 ? 'Finish' : 'Next';
      } else {
        surveyFinishedComplete();
      }
    });

    render();
    overlay.querySelector('.cb-survey-next').textContent = 'Next';
  }

  function shouldOpenFromUrl() {
    var p = new URLSearchParams(window.location.search);
    return p.get('resurvey') === '1' || p.get('profile') === '1';
  }

  function init() {
    var params = new URLSearchParams(window.location.search);
    if (shouldOpenFromUrl()) {
      clearSurveyData();
      openSurvey();
      return;
    }

    var done = localStorage.getItem(KEY_DONE);
    if (done === 'true' || done === 'skipped') {
      window.__chatbotAllowStart = true;
      document.dispatchEvent(new Event('chatbot-survey-ready'));
      return;
    }

    openSurvey();
  }

  document.addEventListener('DOMContentLoaded', function () {
    init();

    var btn = document.getElementById('chatbotUpdateProfile');
    if (btn) {
      btn.addEventListener('click', function () {
        clearSurveyData();
        openSurvey();
      });
    }
  });
})();
