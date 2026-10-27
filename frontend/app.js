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
  const btnLoginSubmit = document.getElementById('btn-login-submit');
  const toastContainer = document.getElementById('toast-container');

  const STORAGE_USER_KEY = 'vishnudatta_active_user';
  const STORAGE_TOKEN_KEY = 'vishnudatta_auth_token';

  // Check URL params for messages
  const urlParams = new URLSearchParams(window.location.search);
  const lang = localStorage.getItem('vishnudatta_lang') || 'en';

  if (urlParams.get('registered') === '1') {
    const msg = lang === 'te' 
      ? 'ఖాతా విజయవంతంగా నమోదయింది! దయచేసి లాగిన్ అవ్వండి.' 
      : 'Account registered successfully! Please sign in.';
    showToast(msg, 'success', 5000);
    const userPhone = urlParams.get('user');
    if (userPhone && loginUsernameInput) {
      loginUsernameInput.value = userPhone;
      if (loginPasswordInput) loginPasswordInput.focus();
    }
  } else if (urlParams.get('unauthorized') === '1') {
    const msg = lang === 'te'
      ? 'అనధికారిక ప్రవేశం నిషేధించబడింది! దయచేసి నమోదు చేసుకున్న ఖాతాతో లాగిన్ అవ్వండి.'
      : 'Unauthorized access blocked! Please sign in with your registered account.';
    showToast(msg, 'error', 5500);
  } else if (urlParams.get('logged_out') === '1') {
    const msg = lang === 'te'
      ? 'లాగౌట్ విజయవంతమైంది.'
      : 'Signed out successfully.';
    showToast(msg, 'info', 3500);
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
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const userOrPhone = loginUsernameInput.value.trim();
      const password = loginPasswordInput.value.trim();
      const currentLang = localStorage.getItem('vishnudatta_lang') || 'en';

      if (!userOrPhone || !password) {
        showToast(
          currentLang === 'te' ? 'యూజర్ నేమ్ మరియు పాస్‌వర్డ్ నమోదు చేయండి' : 'Please enter Username/Phone and Password', 
          'error'
        );
        return;
      }

      // UI Loading state
      if (btnLoginSubmit) {
        btnLoginSubmit.disabled = true;
        btnLoginSubmit.style.opacity = '0.7';
        btnLoginSubmit.innerHTML = `<span class="btn-text">${currentLang === 'te' ? 'ధృవీకరిస్తోంది...' : 'AUTHENTICATING...'}</span>`;
      }

      const loginEndpoint = window.COCO_CONFIG ? window.COCO_CONFIG.resolveUrl('/api/login') : '/api/login';

      try {
        const response = await fetch(loginEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: userOrPhone,
            password: password
          })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          // Store session token and user details
          localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(data.user));
          if (data.token) {
            localStorage.setItem(STORAGE_TOKEN_KEY, data.token);
          }

          // Check if Admin login or Regular User login
          if (data.role === 'admin' || (data.user && data.user.role === 'admin')) {
            // Admin authorization granted
            showToast(
              currentLang === 'te' 
                ? 'అడ్మిన్ అనుమతి మంజూరు చేయబడింది! అడ్మిన్ కన్సోల్‌కు వెళ్తున్నారు...' 
                : 'Admin authorization granted! Redirecting to Admin Console...',
              'success',
              2500
            );

            setTimeout(() => {
              window.location.href = 'admin.html';
            }, 800);
          } else {
            // Regular Registered User login
            const welcomeMsg = currentLang === 'te' 
              ? `స్వాగతం, ${data.user.fullname}! డ్యాష్‌బోర్డ్‌కు వెళ్తున్నారు...` 
              : `Welcome, ${data.user.fullname}! Redirecting to Dashboard...`;
            showToast(welcomeMsg, 'success', 2500);

            setTimeout(() => {
              window.location.href = 'dashboard.html';
            }, 800);
          }
        } else {
          // Authentication Denied (Unauthorized random details or invalid password)
          const errorMsg = data.error || (currentLang === 'te' 
            ? 'వివరాలు సరిపోలలేదు. రిజిస్టర్ అయిన వినియోగదారులు మాత్రమే లాగిన్ అవ్వగలరు.' 
            : 'Access Denied: Only registered users are permitted to log in. Please register first.');
          showToast(errorMsg, 'error', 4500);

          if (btnLoginSubmit) {
            btnLoginSubmit.disabled = false;
            btnLoginSubmit.style.opacity = '1';
            btnLoginSubmit.innerHTML = `<span class="btn-text" id="text-btn-login">${currentLang === 'te' ? 'లాగిన్ అవ్వండి' : 'SIGN IN'}</span>`;
          }
        }
      } catch (networkErr) {
        console.warn('Network issue connecting to server, checking local session cache:', networkErr);
        // Fallback for offline capacitor app if server cannot be contacted
        const localAccounts = JSON.parse(localStorage.getItem('vishnudatta_coconut_users') || '[]');
        const found = localAccounts.find(
          acc => (acc.username.toLowerCase() === userOrPhone.toLowerCase() || acc.phone === userOrPhone) && 
                 acc.password === password
        );

        if (found) {
          const sessionUser = {
            fullname: found.fullname,
            phone: found.phone,
            username: found.username,
            role: 'user',
            loginTime: new Date().toISOString()
          };
          localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(sessionUser));
          showToast(
            currentLang === 'te' ? `స్వాగతం, ${found.fullname}!` : `Welcome, ${found.fullname}!`,
            'success',
            2500
          );
          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 800);
        } else {
          showToast(
            currentLang === 'te' 
              ? 'అనధికార ప్రవేశం తిరస్కరించబడింది. దయచేసి రిజిస్టర్ అవ్వండి.' 
              : 'Access Denied: Only registered users are permitted to log in. Please register first.',
            'error',
            4500
          );
          if (btnLoginSubmit) {
            btnLoginSubmit.disabled = false;
            btnLoginSubmit.style.opacity = '1';
            btnLoginSubmit.innerHTML = `<span class="btn-text">${currentLang === 'te' ? 'లాగిన్ అవ్వండి' : 'SIGN IN'}</span>`;
          }
        }
      }
    });
  }
});
