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

// Blue cursor follower
(function initCursor() {
  const cursor = document.getElementById('cursor');
  if (!cursor) return;
  
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
  const interactive = document.querySelectorAll('a, button, input, .btn, .link');
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
const SESSION_KEY = 'intellivest_session';

(function migrateLegacySession() {
  try {
    if (localStorage.getItem(SESSION_KEY)) return;
    const raw = sessionStorage.getItem('intellivest_current_user');
    if (!raw) return;
    const { username } = JSON.parse(raw);
    const users = JSON.parse(localStorage.getItem('intellivest_users') || '[]');
    const user = users.find(u => u.username === username);
    if (user) {
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          username: user.username,
          email: user.email || '',
          firstName: user.firstName || '',
          lastName: user.lastName || ''
        })
      );
    }
    sessionStorage.removeItem('intellivest_current_user');
  } catch (e) {
    /* ignore */
  }
})();

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
    const session = {
      username: user.username,
      email: user.email || '',
      firstName: user.firstName || '',
      lastName: user.lastName || ''
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    sessionStorage.removeItem('intellivest_current_user');
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

// Set copyright year
(function setYear() {
  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }
})();
