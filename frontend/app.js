/**
 * VISHNUDATTA COCONUT - Login Page Logic (index.html)
 * Podalada, Razole Mandal, Dr. B.R.A. Konaseema district
 * Proprietor: Akkireddy Subrahmanyam | Contact: 9440217789
 */

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const loginUsernameInput = document.getElementById('login-username');
  const loginPasswordInput = document.getElementById('login-password');
  const btnToggleLoginPass = document.getElementById('btn-toggle-login-pass');
  const toastContainer = document.getElementById('toast-container');

  // Local Storage Setup
  const STORAGE_KEY = 'vishnudatta_coconut_users';
  function getStoredAccounts() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        const defaultAccounts = [
          {
            fullname: 'Akkireddy Subrahmanyam',
            phone: '9440217789',
            username: 'subrahmanyam',
            password: 'konaseema'
          }
        ];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultAccounts));
        return defaultAccounts;
      }
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }

  // Check URL params for registration redirect
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('registered') === '1') {
    const lang = localStorage.getItem('vishnudatta_lang') || 'en';
    const msg = lang === 'te' 
      ? 'ఖాతా విజయవంతంగా నమోదయింది! దయచేసి లాగిన్ అవ్వండి.' 
      : 'Account registered successfully! Please sign in.';
    showToast(msg, 'success', 5000);
    const userPhone = urlParams.get('user');
    if (userPhone && loginUsernameInput) {
      loginUsernameInput.value = userPhone;
      if (loginPasswordInput) loginPasswordInput.focus();
    }
  }


  // Password Visibility Toggle
  if (btnToggleLoginPass && loginPasswordInput) {
    btnToggleLoginPass.addEventListener('click', () => {
      const currentType = loginPasswordInput.getAttribute('type');
      if (currentType === 'password') {
        loginPasswordInput.setAttribute('type', 'text');
        btnToggleLoginPass.style.color = 'var(--gold-400)';
      } else {
        loginPasswordInput.setAttribute('type', 'password');
        btnToggleLoginPass.style.color = '';
      }
    });
  }

  // Toast System
  function showToast(message, type = 'info', duration = 4000) {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#34d399" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else {
      iconSvg = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#d4a341" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `${iconSvg}<div class="toast-msg">${message}</div>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // Form Submit Handler
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const userOrPhone = loginUsernameInput.value.trim();
      const password = loginPasswordInput.value.trim();
      const lang = localStorage.getItem('vishnudatta_lang') || 'en';

      if (!userOrPhone || !password) {
        showToast(lang === 'te' ? 'యూజర్ నేమ్ మరియు పాస్‌వర్డ్ నమోదు చేయండి' : 'Please enter Username/Phone and Password', 'error');
        return;
      }

      // Check credentials
      // Sync accounts from disk if available
    const usersEndpoint = window.COCO_CONFIG ? window.COCO_CONFIG.resolveUrl('/api/users') : '/api/users';
    if (usersEndpoint) {
      fetch(usersEndpoint)
        .then(res => res.json())
        .then(remote => {
          if (Array.isArray(remote) && remote.length > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
          }
        }).catch(() => {});
    }
    const accounts = getStoredAccounts();
      const found = accounts.find(
        acc => (acc.username.toLowerCase() === userOrPhone.toLowerCase() || acc.phone === userOrPhone) && 
               acc.password === password
      );

      if (found) {
        // Save active user session
        const sessionUser = {
          fullname: found.fullname,
          phone: found.phone,
          username: found.username,
          loginTime: new Date().toISOString()
        };
        try {
          localStorage.setItem('vishnudatta_active_user', JSON.stringify(sessionUser));
        } catch (e) {
          console.error('Failed to store active user', e);
        }

        const welcomeMsg = lang === 'te' 
          ? `స్వాగతం, ${found.fullname}! డ్యాష్‌బోర్డ్‌కు వెళ్తున్నారు...` 
          : `Welcome, ${found.fullname}! Redirecting to Dashboard...`;
        showToast(welcomeMsg, 'success', 3000);
        loginForm.reset();

        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 800);
      } else {
        const errorMsg = lang === 'te' 
          ? 'వివరాలు సరిపోలలేదు. దయచేసి చెక్ చేయండి లేదా క్రింద రిజిస్టర్ అవ్వండి.' 
          : 'Invalid login details. Please check your credentials or register below.';
        showToast(errorMsg, 'error', 4500);
      }
    });
  }
});
