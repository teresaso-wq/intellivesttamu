// Header auth: show name + logout when session exists; expose logout for survey script
(function () {
  var SESSION_KEY = 'intellivest_session';

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    } catch (e) {
      return null;
    }
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    window.location.reload();
  }

  window.IntellivestAuth = {
    getSession: getSession,
    logout: logout,
    SESSION_KEY: SESSION_KEY
  };

  function render() {
    var actions = document.querySelector('.header-actions');
    if (!actions) return;

    var signIn = actions.querySelector('a[href*="sign-in"]');
    var themeToggle = actions.querySelector('#themeToggle');
    var existing = actions.querySelector('.auth-user-bar');

    var session = getSession();
    if (session && session.username) {
      if (signIn) signIn.style.display = 'none';
      if (existing) existing.remove();

      var bar = document.createElement('div');
      bar.className = 'auth-user-bar';
      var display =
        (session.firstName && String(session.firstName).trim()) ||
        session.username;
      bar.innerHTML =
        '<span class="auth-user-name">' +
        escapeHtml(display) +
        '</span>' +
        '<button type="button" class="btn secondary btn-sm auth-edit-profile" id="authEditProfile">Edit My Profile</button>' +
        '<button type="button" class="btn secondary btn-sm auth-logout" id="authLogoutBtn">Logout</button>';

      if (themeToggle) {
        actions.insertBefore(bar, themeToggle);
      } else {
        actions.insertBefore(bar, actions.firstChild);
      }

      var lo = bar.querySelector('#authLogoutBtn');
      if (lo) lo.addEventListener('click', function () { logout(); });

      var ed = bar.querySelector('#authEditProfile');
      if (ed) {
        ed.addEventListener('click', function (e) {
          e.preventDefault();
          window.location.href = './chatbot.html?resurvey=1';
        });
      }
    } else {
      if (signIn) signIn.style.display = '';
      if (existing) existing.remove();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
