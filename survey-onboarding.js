// One-time onboarding survey + profile in localStorage; "Edit My Profile" reopens
(function () {
  var PROFILE_KEY = 'intellivest_user_profile';

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem('intellivest_session') || 'null');
    } catch (e) {
      return null;
    }
  }

  function loadProfile() {
    try {
      return JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function saveProfile(data) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
  }

  function ensureProfileForUser(username) {
    var p = loadProfile();
    if (p.username !== username) {
      p = { username: username };
    }
    return p;
  }

  var step = 0;
  var modalEl = null;
  var editMode = false;

  var AGE_OPTS = [
    'Under 18',
    '18-24',
    '25-34',
    '35-44',
    '45-54',
    '55-64',
    '65+'
  ];
  var SAVINGS_OPTS = [
    'Under $500',
    '$500-$2,000',
    '$2,000-$10,000',
    '$10,000-$50,000',
    '$50,000+'
  ];
  var RISK_OPTS = [
    'Very Conservative',
    'Conservative',
    'Moderate',
    'Aggressive',
    'Very Aggressive'
  ];
  var GOAL_OPTS = [
    'Learn how to save money',
    'Build or improve my credit score',
    'Save for a house',
    'Start investing in stocks',
    'Learn about mutual funds/ETFs',
    'Retire comfortably',
    'Other'
  ];
  var TIMELINE_OPTS = [
    'Less than 1 year',
    '1-3 years',
    '3-5 years',
    '5-10 years',
    '10+ years'
  ];

  var draft = {};

  function closeModal() {
    if (modalEl && modalEl.parentNode) modalEl.parentNode.removeChild(modalEl);
    modalEl = null;
    document.body.style.overflow = '';
  }

  function renderStep() {
    var body = modalEl.querySelector('.survey-modal-body');
    var title = modalEl.querySelector('.survey-modal-title');
    var progress = modalEl.querySelector('.survey-progress');
    progress.textContent = 'Step ' + (step + 1) + ' of 5';

    var backBtn = modalEl.querySelector('.survey-back');
    var nextBtn = modalEl.querySelector('.survey-next');
    backBtn.style.visibility = step === 0 ? 'hidden' : 'visible';
    nextBtn.textContent = step === 4 ? 'Finish' : 'Next';

    if (step === 0) {
      title.textContent = 'How old are you?';
      body.innerHTML =
        '<label class="survey-field"><span class="survey-label">Age range</span>' +
        '<select class="survey-select" id="surveyAge">' +
        AGE_OPTS.map(function (o) {
          return (
            '<option value="' +
            o.replace(/"/g, '&quot;') +
            '"' +
            (draft.ageRange === o ? ' selected' : '') +
            '>' +
            o +
            '</option>'
          );
        }).join('') +
        '</select></label>';
    } else if (step === 1) {
      title.textContent =
        'How much money do you have saved or available to invest (not used for bills or expenses)?';
      body.innerHTML =
        '<label class="survey-field"><span class="survey-label">Amount</span>' +
        '<select class="survey-select" id="surveySavings">' +
        SAVINGS_OPTS.map(function (o) {
          return (
            '<option value="' +
            o.replace(/"/g, '&quot;') +
            '"' +
            (draft.investableSavings === o ? ' selected' : '') +
            '>' +
            o +
            '</option>'
          );
        }).join('') +
        '</select></label>';
    } else if (step === 2) {
      title.textContent = 'How comfortable are you with investment risk?';
      body.innerHTML =
        '<div class="survey-options" id="surveyRisk">' +
        RISK_OPTS.map(function (o) {
          var id = 'risk_' + o.replace(/\s+/g, '_');
          return (
            '<label class="survey-radio">' +
            '<input type="radio" name="risk" value="' +
            o.replace(/"/g, '&quot;') +
            '" id="' +
            id +
            '"' +
            (draft.riskComfort === o ? ' checked' : '') +
            ' />' +
            '<span>' +
            o +
            '</span></label>'
          );
        }).join('') +
        '</div>';
    } else if (step === 3) {
      title.textContent = 'What is your main financial goal? (select all that apply)';
      var goals = draft.goals || [];
      body.innerHTML =
        '<div class="survey-checkboxes" id="surveyGoals">' +
        GOAL_OPTS.map(function (o) {
          var checked = goals.indexOf(o) >= 0 ? ' checked' : '';
          return (
            '<label class="survey-check">' +
            '<input type="checkbox" value="' +
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
    } else if (step === 4) {
      title.textContent = 'What is your investment timeline?';
      body.innerHTML =
        '<div class="survey-options" id="surveyTimeline">' +
        TIMELINE_OPTS.map(function (o) {
          return (
            '<label class="survey-radio">' +
            '<input type="radio" name="timeline" value="' +
            o.replace(/"/g, '&quot;') +
            '"' +
            (draft.timeline === o ? ' checked' : '') +
            ' />' +
            '<span>' +
            o +
            '</span></label>'
          );
        }).join('') +
        '</div>';
    }
  }

  function collectStep() {
    if (step === 0) {
      var el = document.getElementById('surveyAge');
      draft.ageRange = el ? el.value : '';
    } else if (step === 1) {
      var el2 = document.getElementById('surveySavings');
      draft.investableSavings = el2 ? el2.value : '';
    } else if (step === 2) {
      var r = modalEl.querySelector('input[name="risk"]:checked');
      draft.riskComfort = r ? r.value : '';
    } else if (step === 3) {
      draft.goals = [];
      modalEl.querySelectorAll('#surveyGoals input[type="checkbox"]:checked').forEach(function (c) {
        draft.goals.push(c.value);
      });
    } else if (step === 4) {
      var t = modalEl.querySelector('input[name="timeline"]:checked');
      draft.timeline = t ? t.value : '';
    }
  }

  function openModal(isEdit) {
    editMode = !!isEdit;
    var session = getSession();
    if (!session || !session.username) return;

    draft = ensureProfileForUser(session.username);
    var saved = loadProfile();
    if (saved.username === session.username) {
      Object.assign(draft, saved);
    }
    if (!Array.isArray(draft.goals)) draft.goals = [];
    draft.ageRange = draft.ageRange || AGE_OPTS[1];
    draft.investableSavings = draft.investableSavings || SAVINGS_OPTS[1];
    draft.riskComfort = draft.riskComfort || RISK_OPTS[2];
    draft.timeline = draft.timeline || TIMELINE_OPTS[2];

    step = 0;
    document.body.style.overflow = 'hidden';

    modalEl = document.createElement('div');
    modalEl.className = 'survey-modal-overlay';
    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-modal', 'true');
    modalEl.innerHTML =
      '<div class="survey-modal">' +
      '<div class="survey-modal-header">' +
      '<span class="survey-progress">Step 1 of 5</span>' +
      '<h2 class="survey-modal-title">How old are you?</h2>' +
      '</div>' +
      '<div class="survey-modal-body"></div>' +
      '<div class="survey-modal-footer">' +
      '<button type="button" class="btn ghost survey-back">Back</button>' +
      '<div class="survey-modal-actions">' +
      '<button type="button" class="btn secondary survey-cancel">Cancel</button>' +
      '<button type="button" class="btn primary survey-next">Next</button>' +
      '</div></div></div>';

    document.body.appendChild(modalEl);

    modalEl.querySelector('.survey-back').addEventListener('click', function () {
      if (step > 0) {
        collectStep();
        step--;
        renderStep();
      }
    });

    modalEl.querySelector('.survey-next').addEventListener('click', function () {
      collectStep();
      if (step === 2 && !draft.riskComfort) {
        alert('Please select a risk comfort level.');
        return;
      }
      if (step === 3 && (!draft.goals || draft.goals.length === 0)) {
        alert('Please select at least one goal.');
        return;
      }
      if (step === 4 && !draft.timeline) {
        alert('Please select an investment timeline.');
        return;
      }
      if (step < 4) {
        step++;
        renderStep();
      } else {
        var s = getSession();
        draft.username = s.username;
        draft.surveyCompletedAt = Date.now();
        saveProfile(draft);
        closeModal();
        if (!editMode) {
          /* no alert — smooth completion */
        }
      }
    });

    modalEl.querySelector('.survey-cancel').addEventListener('click', function () {
      closeModal();
    });

    modalEl.addEventListener('click', function (e) {
      if (e.target === modalEl) closeModal();
    });

    renderStep();
  }

  function maybeShowFirstTime() {
    var session = getSession();
    if (!session || !session.username) return;

    var p = loadProfile();
    if (p.username !== session.username) {
      p = { username: session.username };
    }
    if (p.surveyCompletedAt) return;

    openModal(false);
  }

  window.IntellivestSurvey = {
    openEdit: function () {
      openModal(true);
    },
    loadProfile: loadProfile,
    PROFILE_KEY: PROFILE_KEY
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(maybeShowFirstTime, 400);
    });
  } else {
    setTimeout(maybeShowFirstTime, 400);
  }
})();
