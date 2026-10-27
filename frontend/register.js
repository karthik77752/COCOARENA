/**
 * VISHNUDATTA COCONUT - Registration Page Logic (register.html)
 * Podalada, Razole Mandal, Dr. B.R.A. Konaseema district
 * Proprietor: Akkireddy Subrahmanyam | Contact: 9440217789
 */

document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('register-form');
  const regFullname = document.getElementById('reg-fullname');
  const regPhone = document.getElementById('reg-phone');
  const regUsername = document.getElementById('reg-username');
  const regPassword = document.getElementById('reg-password');
  const regConfirmPass = document.getElementById('reg-confirm-password');
  const regWebsiteHp = document.getElementById('reg-website-hp');
  const formRenderTimeInput = document.getElementById('form-render-time');
  const btnRegisterSubmit = document.getElementById('btn-register-submit');
  const toastContainer = document.getElementById('toast-container');

  // Record form render timestamp for anti-bot timing check
  const formLoadTime = Date.now();
  if (formRenderTimeInput) {
    formRenderTimeInput.value = formLoadTime.toString();
  }

  // Storage key
  const STORAGE_KEY = 'vishnudatta_coconut_users';

  function getStoredAccounts() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveLocalAccounts(accounts) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
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

  // Password Visibility Toggles
  const btnToggleRegPass = document.getElementById('btn-toggle-reg-pass');
  if (btnToggleRegPass && regPassword) {
    btnToggleRegPass.addEventListener('click', () => {
      const isPass = regPassword.getAttribute('type') === 'password';
      regPassword.setAttribute('type', isPass ? 'text' : 'password');
      btnToggleRegPass.style.color = isPass ? 'var(--gold-400)' : '';
    });
  }

  const btnToggleRegConfirm = document.getElementById('btn-toggle-reg-confirm');
  if (btnToggleRegConfirm && regConfirmPass) {
    btnToggleRegConfirm.addEventListener('click', () => {
      const isPass = regConfirmPass.getAttribute('type') === 'password';
      regConfirmPass.setAttribute('type', isPass ? 'text' : 'password');
      btnToggleRegConfirm.style.color = isPass ? 'var(--gold-400)' : '';
    });
  }

  // Form Submit Handler
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const lang = localStorage.getItem('vishnudatta_lang') || 'en';
      const fullname = regFullname.value.trim();
      const phone = regPhone.value.trim();
      const username = regUsername.value.trim();
      const password = regPassword.value.trim();
      const confirmPassword = regConfirmPass.value.trim();
      const honeypot = regWebsiteHp ? regWebsiteHp.value.trim() : '';

      // 1. Anti-Bot Honeypot check
      if (honeypot !== '') {
        console.warn('Bot detected via honeypot.');
        showToast('Registration error occurred.', 'error');
        return;
      }

      // 2. Validate empty fields
      if (!fullname || !phone || !username || !password || !confirmPassword) {
        showToast(
          lang === 'te' ? 'దయచేసి అన్ని వివరాలను నమోదు చేయండి' : 'Please fill in all required fields',
          'error'
        );
        return;
      }

      // 3. Validate Phone: exactly 10 digits
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(phone)) {
        showToast(
          lang === 'te' ? 'సరైన 10 అంకెల మొబైల్ నంబరును నమోదు చేయండి' : 'Please enter a valid 10-digit phone number',
          'error'
        );
        regPhone.focus();
        return;
      }

      // 4. Validate Username: 3-30 characters, alphanumeric
      if (username.length < 3 || username.length > 30) {
        showToast(
          lang === 'te' ? 'యూజర్ నేమ్ 3 నుండి 30 అక్షరాలు ఉండాలి' : 'Username must be 3-30 characters long',
          'error'
        );
        regUsername.focus();
        return;
      }

      // 5. Check reserved admin username
      if (username.toUpperCase() === 'KARTHIK') {
        showToast(
          lang === 'te' ? 'ఈ యూజర్ నేమ్ అనుమతించబడదు. వేరే పేరును ఎంచుకోండి.' : 'This username is reserved. Please choose another username.',
          'error'
        );
        regUsername.focus();
        return;
      }

      // 6. Validate Password length
      if (password.length < 6) {
        showToast(
          lang === 'te' ? 'పాస్‌వర్డ్ కనీసం 6 అక్షరాలు ఉండాలి' : 'Password must be at least 6 characters long',
          'error'
        );
        regPassword.focus();
        return;
      }

      // 7. Validate Password matching
      if (password !== confirmPassword) {
        showToast(
          lang === 'te' ? 'పాస్‌వర్డ్ మరియు నిర్ధారణ పాస్‌వర్డ్ సరిపోలలేదు' : 'Passwords do not match! Please check again',
          'error'
        );
        regConfirmPass.focus();
        return;
      }

      // Prepare submission payload
      const payload = {
        fullname,
        phone,
        username,
        password,
        confirmPassword,
        website_hp: honeypot,
        formRenderTime: formLoadTime
      };

      // Set loading state on submit button
      if (btnRegisterSubmit) {
        btnRegisterSubmit.disabled = true;
        btnRegisterSubmit.style.opacity = '0.7';
        btnRegisterSubmit.innerHTML = `<span class="btn-text">${lang === 'te' ? 'నమోదు అవుతోంది...' : 'REGISTERING...'}</span>`;
      }

      const registerEndpoint = window.COCO_CONFIG ? window.COCO_CONFIG.resolveUrl('/api/register') : '/api/register';

      try {
        const response = await fetch(registerEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok && data.success) {
          // Sync with local storage
          const localAccounts = getStoredAccounts();
          localAccounts.push({
            fullname,
            phone,
            username,
            password,
            registeredAt: new Date().toISOString()
          });
          saveLocalAccounts(localAccounts);

          showToast(
            lang === 'te' 
              ? `ఖాతా విజయవంతంగా నమోదయింది! లాగిన్ పేజీకి రీడైరెక్ట్ అవుతోంది...` 
              : `Account registered successfully! Redirecting to Sign In...`,
            'success',
            3000
          );

          setTimeout(() => {
            window.location.href = `index.html?registered=1&user=${encodeURIComponent(phone)}`;
          }, 1200);
        } else {
          // Server returned validation / duplicate error
          const errMsg = data.error || (lang === 'te' ? 'రిజిస్ట్రేషన్ విఫలమైంది.' : 'Registration failed.');
          showToast(errMsg, 'error', 4500);

          if (btnRegisterSubmit) {
            btnRegisterSubmit.disabled = false;
            btnRegisterSubmit.style.opacity = '1';
            btnRegisterSubmit.innerHTML = `<span class="btn-text" id="text-btn-register">${lang === 'te' ? 'ఇప్పుడే నమోదు అవ్వండి' : 'REGISTER NOW'}</span>`;
          }
        }
      } catch (networkErr) {
        console.warn('Network error reaching backend server, trying local fallback:', networkErr);

        // Offline / Direct static fallback
        const localAccounts = getStoredAccounts();
        const existingUser = localAccounts.find(
          acc => acc.username.toLowerCase() === username.toLowerCase() || acc.phone === phone
        );

        if (existingUser) {
          showToast(
            lang === 'te' 
              ? 'ఈ ఫోన్ నంబర్ లేదా యూజర్ నేమ్‌తో ఇప్పటికే ఖాతా ఉంది!' 
              : 'An account with this phone number or username already exists!',
            'error'
          );
          if (btnRegisterSubmit) {
            btnRegisterSubmit.disabled = false;
            btnRegisterSubmit.style.opacity = '1';
            btnRegisterSubmit.innerHTML = `<span class="btn-text">${lang === 'te' ? 'ఇప్పుడే నమోదు అవ్వండి' : 'REGISTER NOW'}</span>`;
          }
          return;
        }

        localAccounts.push({
          fullname,
          phone,
          username,
          password,
          registeredAt: new Date().toISOString()
        });
        saveLocalAccounts(localAccounts);

        showToast(
          lang === 'te' 
            ? `ఖాతా నమోదయింది! లాగిన్ పేజీకి రీడైరెక్ట్ అవుతోంది...` 
            : `Account registered! Redirecting to Sign In...`,
          'success',
          2500
        );

        setTimeout(() => {
          window.location.href = `index.html?registered=1&user=${encodeURIComponent(phone)}`;
        }, 1000);
      }
    });
  }
});
