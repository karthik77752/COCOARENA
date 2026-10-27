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
  const regCaptchaInput = document.getElementById('reg-captcha-input');
  const btnRefreshCaptcha = document.getElementById('btn-refresh-captcha');
  const captchaCanvas = document.getElementById('captcha-canvas');
  const btnRegisterSubmit = document.getElementById('btn-register-submit');
  const toastContainer = document.getElementById('toast-container');

  let currentCaptcha = '';

  // Storage key
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

  function saveAccounts(accounts) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
    const usersEndpoint = window.COCO_CONFIG ? window.COCO_CONFIG.resolveUrl('/api/users') : '/api/users';
    if (usersEndpoint) {
      fetch(usersEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accounts)
      }).catch(() => {});
    }
  }

  // Captcha Generator
  function generateCaptchaCode(length = 5) {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  function renderCaptcha() {
    if (!captchaCanvas) return;
    const ctx = captchaCanvas.getContext('2d');
    const width = captchaCanvas.width;
    const height = captchaCanvas.height;

    currentCaptcha = generateCaptchaCode(5);

    // Canvas Background
    ctx.fillStyle = '#03140c';
    ctx.fillRect(0, 0, width, height);

    // Noise Lines
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, Math.random() * height);
      ctx.lineTo(Math.random() * width, Math.random() * height);
      ctx.strokeStyle = 'rgba(212, 163, 65, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // Characters
    const spacing = width / (currentCaptcha.length + 1);
    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.textBaseline = 'middle';

    const colors = ['#fae4a8', '#34d399', '#f3cf7a', '#6ee7b7', '#fcd34d'];

    for (let i = 0; i < currentCaptcha.length; i++) {
      const char = currentCaptcha[i];
      ctx.save();
      const x = (i + 0.8) * spacing;
      const y = height / 2 + (Math.random() * 4 - 2);
      const angle = (Math.random() * 0.3) - 0.15;
      
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = colors[i % colors.length];
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = 3;
      ctx.fillText(char, -8, 0);
      ctx.restore();
    }

    if (regCaptchaInput) {
      regCaptchaInput.value = '';
    }
  }

  if (btnRefreshCaptcha) {
    btnRefreshCaptcha.addEventListener('click', () => {
      renderCaptcha();
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
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const lang = localStorage.getItem('vishnudatta_lang') || 'en';
      const fullname = regFullname.value.trim();
      const phone = regPhone.value.trim();
      const username = regUsername.value.trim();
      const password = regPassword.value.trim();
      const confirmPassword = regConfirmPass.value.trim();
      const enteredCaptcha = regCaptchaInput.value.trim().toUpperCase();

      // Validate empty fields
      if (!fullname || !phone || !username || !password || !confirmPassword) {
        showToast(
          lang === 'te' ? 'దయచేసి అన్ని వివరాలను నమోదు చేయండి' : 'Please fill in all required fields',
          'error'
        );
        return;
      }

      // Validate Phone: 10 digits
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(phone)) {
        showToast(
          lang === 'te' ? 'సరైన 10 అంకెల మొబైల్ నంబరును నమోదు చేయండి' : 'Please enter a valid 10-digit phone number',
          'error'
        );
        regPhone.focus();
        return;
      }

      // Validate Password length
      if (password.length < 6) {
        showToast(
          lang === 'te' ? 'పాస్‌వర్డ్ కనీసం 6 అక్షరాలు ఉండాలి' : 'Password must be at least 6 characters long',
          'error'
        );
        regPassword.focus();
        return;
      }

      // Validate Password matching
      if (password !== confirmPassword) {
        showToast(
          lang === 'te' ? 'పాస్‌వర్డ్ మరియు నిర్ధారణ పాస్‌వర్డ్ సరిపోలలేదు' : 'Passwords do not match! Please check again',
          'error'
        );
        regConfirmPass.focus();
        return;
      }

      // Captcha Verification
      if (!enteredCaptcha) {
        showToast(
          lang === 'te' ? 'దయచేసి సెక్యూరిటీ క్యాప్చా నమోదు చేయండి' : 'Please enter the security captcha code',
          'error'
        );
        regCaptchaInput.focus();
        return;
      }

      if (enteredCaptcha !== currentCaptcha) {
        showToast(
          lang === 'te' ? 'క్యాప్చా సరిపోలలేదు! కొత్త కోడ్ ప్రయత్నించండి' : 'Incorrect captcha code! Please try the new code',
          'error'
        );
        renderCaptcha();
        regCaptchaInput.focus();
        return;
      }

      // Check for duplicate accounts
      const accounts = getStoredAccounts();
      const existingUser = accounts.find(
        acc => acc.username.toLowerCase() === username.toLowerCase() || acc.phone === phone
      );

      if (existingUser) {
        if (existingUser.phone === phone) {
          showToast(
            lang === 'te' 
              ? 'ఈ ఫోన్ నంబరుతో ఇప్పటికే ఖాతా ఉంది! దయచేసి లాగిన్ అవ్వండి.' 
              : 'An account with this phone number already exists! Please sign in.',
            'error'
          );
        } else {
          showToast(
            lang === 'te' 
              ? 'ఈ యూజర్ నేమ్ ఇప్పటికే ఉపయోగంలో ఉంది. వేరే పేరును ఎంచుకోండి.' 
              : 'This username is already taken. Please choose another username.',
            'error'
          );
        }
        renderCaptcha();
        return;
      }

      // Save new user account
      const newUser = {
        fullname,
        phone,
        username,
        password,
        registeredAt: new Date().toISOString()
      };

      accounts.push(newUser);
      saveAccounts(accounts);

      // Disable button to prevent duplicate submission
      if (btnRegisterSubmit) {
        btnRegisterSubmit.disabled = true;
        btnRegisterSubmit.style.opacity = '0.7';
      }

      showToast(
        lang === 'te' 
          ? `ఖాతా విజయవంతంగా నమోదయింది! లాగిన్ పేజీకి రీడైరెక్ట్ అవుతోంది...` 
          : `Account registered successfully! Redirecting to Sign In...`,
        'success',
        3000
      );

      // Redirect to index.html with user param
      setTimeout(() => {
        window.location.href = `index.html?registered=1&user=${encodeURIComponent(phone)}`;
      }, 1200);
    });
  }

  // Initial captcha render
  renderCaptcha();
});
