// Theme toggle with persistence and sun/moon icons
(function initTheme() {
  const stored = localStorage.getItem('theme');
  if (stored === 'dark') document.documentElement.classList.add('dark');
  
  const toggle = document.getElementById('themeToggle');
  if (!toggle) return;
  
  toggle.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    const nowDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('theme', nowDark ? 'dark' : 'light');
  });
})();

// Always start each page load at the top.
(function forceInitialTopPosition() {
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  function goTop() {
    window.scrollTo(0, 0);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', goTop, { once: true });
  } else {
    goTop();
  }
  window.addEventListener('pageshow', goTop);
})();

// Remove emoji characters from visible UI text across pages.
(function stripEmojiFromUi() {
  function getEmojiRegex() {
    try {
      return /[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F]/gu;
    } catch (e) {
      return /[\u2600-\u27BF\u{1F000}-\u{1FAFF}]/gu;
    }
  }

  const emojiRe = getEmojiRegex();

  function cleanString(value) {
    return String(value || '').replace(emojiRe, '').replace(/\s{2,}/g, ' ').trim();
  }

  function cleanTextNode(node) {
    if (!node || !node.nodeValue) return;
    const cleaned = cleanString(node.nodeValue);
    if (cleaned !== node.nodeValue.trim()) {
      node.nodeValue = cleaned;
    }
  }

  function cleanElementAttrs(el) {
    if (!el || el.nodeType !== 1) return;
    ['placeholder', 'aria-label', 'title'].forEach((attr) => {
      const v = el.getAttribute(attr);
      if (!v) return;
      const cleaned = cleanString(v);
      if (cleaned !== v) el.setAttribute(attr, cleaned);
    });
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      cleanTextNode(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    cleanElementAttrs(root);
    root.childNodes.forEach(walk);
  }

  function run() {
    walk(document.body);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((m) => {
      m.addedNodes.forEach(walk);
      if (m.type === 'characterData' && m.target) walk(m.target);
    });
  });
  function startObserver() {
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver);
  } else {
    startObserver();
  }
})();

// Custom cursor (disabled in CSS for corporate UI; skip animation if hidden)
(function initCursor() {
  const cursor = document.getElementById('cursor');
  if (!cursor) return;
  if (window.getComputedStyle(cursor).display === 'none') return;
  
  let x = window.innerWidth / 2, y = window.innerHeight / 2;
  let tx = x, ty = y;
  const speed = 0.15;
  let rafId = null;

  function updateCursor(e) {
    tx = e.clientX;
    ty = e.clientY;
    cursor.style.opacity = '0.9';
  }

  window.addEventListener('mousemove', updateCursor);
  window.addEventListener('mouseleave', () => { 
    cursor.style.opacity = '0'; 
  });
  window.addEventListener('mouseenter', () => { 
    cursor.style.opacity = '0.9'; 
  });

  function animate() {
    x += (tx - x) * speed;
    y += (ty - y) * speed;
    cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    rafId = requestAnimationFrame(animate);
  }
  animate();

  // Enlarge cursor on interactive elements
  const interactive = document.querySelectorAll('a, button, input, .btn, .link, .glossary-term');
  interactive.forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.style.width = '32px';
      cursor.style.height = '32px';
      cursor.style.marginLeft = '-16px';
      cursor.style.marginTop = '-16px';
    });
    el.addEventListener('mouseleave', () => {
      cursor.style.width = '20px';
      cursor.style.height = '20px';
      cursor.style.marginLeft = '-10px';
      cursor.style.marginTop = '-10px';
    });
  });
})();

// Basic localStorage-backed demo auth (no real backend)
const Auth = {
  key: 'intellivest_users',
  get users() {
    try { 
      return JSON.parse(localStorage.getItem(this.key) || '[]'); 
    } catch { 
      return []; 
    }
  },
  save(users) { 
    localStorage.setItem(this.key, JSON.stringify(users)); 
  },
  create({ username, password, email, firstName, lastName }) {
    const users = this.users;
    if (users.find(u => u.username === username)) {
      throw new Error('Username already exists');
    }
    users.push({ 
      username, 
      password, 
      email, 
      firstName, 
      lastName, 
      createdAt: Date.now() 
    });
    this.save(users);
  },
  login({ username, password }) {
    const users = this.users;
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) {
      throw new Error('Invalid username or password');
    }
    sessionStorage.setItem('intellivest_current_user', JSON.stringify({ 
      username: user.username 
    }));
    return user;
  }
};

// Forms - Login
(function initLoginForm() {
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) return;

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(loginForm);
    const username = (data.get('username') || '').toString().trim();
    const password = (data.get('password') || '').toString();

    if (!username || !password) {
      alert('Please fill in all fields.');
      return;
    }

    try {
      Auth.login({ username, password });
      alert(`Welcome back, ${username}!`);
      window.location.href = './index.html';
    } catch (err) {
      alert(err.message || 'Login failed. Please check your credentials.');
    }
  });
})();

// Forms - Signup
(function initSignupForm() {
  const signupForm = document.getElementById('signupForm');
  if (!signupForm) return;

  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(signupForm);
    const payload = {
      firstName: (data.get('firstName') || '').toString().trim(),
      lastName: (data.get('lastName') || '').toString().trim(),
      email: (data.get('email') || '').toString().trim(),
      username: (data.get('username') || '').toString().trim(),
      password: (data.get('password') || '').toString(),
    };

    if (!payload.firstName || !payload.lastName || !payload.email || !payload.username || !payload.password) {
      alert('Please complete all fields.');
      return;
    }

    if (payload.password.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }

    try {
      Auth.create(payload);
      alert('Account created successfully! You can now sign in.');
      window.location.href = './sign-in.html';
    } catch (err) {
      alert(err.message || 'Sign up failed. Please try again.');
    }
  });
})();

// Sticky header: subtle shadow when scrolled (McKinsey-style elevation)
(function initHeaderScroll() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const onScroll = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 12);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// Scroll-triggered section reveals
(function initRevealOnScroll() {
  const nodes = document.querySelectorAll('.reveal');
  if (!nodes.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    nodes.forEach((el) => el.classList.add('reveal--visible'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal--visible');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -32px 0px' }
  );
  nodes.forEach((el) => io.observe(el));
})();

// Set copyright year
(function setYear() {
  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }
})();

// Fixed chat launcher → full chatbot page (Intellivest editorial card, not blue “Ask X” slab)
(function initIntellivestChatLauncher() {
  if (document.getElementById('ivChatLauncher')) return;
  if (document.querySelector('main.chatbot-main')) return;

  const path = window.location.pathname || '';
  if (path.endsWith('/chatbot.html') || path.endsWith('\\chatbot.html')) return;

  const base = document.querySelector('head base')?.getAttribute('href');
  const href = base ? new URL('chatbot.html', base).href : './chatbot.html';

  const a = document.createElement('a');
  a.id = 'ivChatLauncher';
  a.className = 'iv-chat-launcher';
  a.href = href;
  a.setAttribute('aria-label', 'Open Ask Intellivest chatbot, beta');
  a.classList.add('iv-chat-launcher--playful');

  a.innerHTML =
    '<span class="iv-chat-launcher__deco" aria-hidden="true">' +
    '<span class="iv-chat-launcher__deco-ring"></span>' +
    '<span class="iv-chat-launcher__deco-dot iv-chat-launcher__deco-dot--a"></span>' +
    '<span class="iv-chat-launcher__deco-dot iv-chat-launcher__deco-dot--b"></span>' +
    '</span>' +
    '<span class="iv-chat-launcher__icon-wrap" aria-hidden="true">' +
    '<svg class="iv-chat-launcher__glyph" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M6.5 9.5h11a2 2 0 012 2v5.5a2 2 0 01-2 2h-2.2L12 21.2V19H6.5a2 2 0 01-2-2v-5.5a2 2 0 012-2z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/>' +
    '<circle cx="9.25" cy="13.25" r="1.1" fill="currentColor"/>' +
    '<circle cx="14.75" cy="13.25" r="1.1" fill="currentColor"/>' +
    '<path d="M9.8 16.2c.85.75 1.95 1.15 3.05 1.15 1.1 0 2.15-.4 2.95-1.05" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
    '</svg></span>' +
    '<span class="iv-chat-launcher__copy">' +
    '<span class="iv-chat-launcher__kicker">IV here!</span>' +
    '<span class="iv-chat-launcher__row">' +
    '<span class="iv-chat-launcher__title">Ask Intellivest</span>' +
    '<span class="iv-chat-launcher__tag">beta</span>' +
    '</span></span>' +
    '<span class="iv-chat-launcher__go" aria-hidden="true">' +
    '<svg class="iv-chat-launcher__arrow" width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M6 12h10M13 7l5 5-5 5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg></span>';

  document.body.appendChild(a);
})();

/* Progressive Web App: register service worker on HTTPS or localhost (same site as the web app). */
(function registerIntellivestPwa() {
  if (!('serviceWorker' in navigator)) return;
  var host = location.hostname;
  var secure =
    location.protocol === 'https:' || host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  if (!secure) return;
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(function () {});
  });
})();

