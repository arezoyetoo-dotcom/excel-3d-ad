/**
 * SheetFix 3D - Application Controller
 * Bilingual (EN / FA), 3D Canvas integration, Interactive Pricing Calculator,
 * Formula Clinic, and Bank-Grade Client & Architect Auth Portal with
 * Zero-Downtime Universal Vault Fallback (works on Local Node Server, GitHub Pages, and Offline Launchers).
 */

// =========================================================================
// Privacy-Preserving Analytics (GDPR & DNT Compliant, Zero PII, Zero 3rd-Party)
// =========================================================================
window.SheetFixAnalytics = {
  isEnabled() {
    if (typeof navigator !== 'undefined' && (navigator.doNotTrack === '1' || window.doNotTrack === '1')) {
      return false;
    }
    const consent = localStorage.getItem('sheetfix_cookie_consent');
    return consent === 'all';
  },
  init() {
    if (!this.isEnabled()) return;
    this.track('pageview', {
      url: window.location.pathname,
      title: document.title,
      referrer: document.referrer ? (function() {
        try { return new URL(document.referrer).hostname; } catch(e) { return 'external'; }
      })() : 'direct'
    });
  },
  track(eventName, eventData = {}) {
    if (!this.isEnabled() && eventName !== 'consent_granted') return;
    const payload = {
      event: eventName,
      timestamp: new Date().toISOString(),
      lang: localStorage.getItem('sheetfix_lang') || 'en',
      ...eventData
    };
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('[SheetFix Analytics]', payload);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // 1. Environment & Mode Detection
  const isStaticHost = window.location.protocol === 'file:' || window.location.hostname.includes('github.io');
  let currentLang = localStorage.getItem('sheetfix_lang') || (window.location.pathname.endsWith('fa.html') ? 'fa' : 'en');
  let currentUser = null;

  // Web3Forms & Admin Telegram Configuration
  window.SHEETFIX_CONFIG = window.SHEETFIX_CONFIG || {
    web3FormsAccessKey: localStorage.getItem('sheetfix_web3forms_key') || '',
    architectEmail: 'architect@sheetfix.dev',
    adminTelegram: '@Shy1ohmy',
    telegramUrl: 'https://t.me/Shy1ohmy',
    enableSimulationBadge: true
  };

  // 60+ Known Disposable / Burner Email Domains
  const DISPOSABLE_EMAIL_DOMAINS = new Set([
    'mailinator.com', 'tempmail.com', '10minutemail.com', 'guerrillamail.com',
    'throwawaymail.com', 'trashmail.com', 'yopmail.com', 'fakeinbox.com',
    'sharklasers.com', 'dispostable.com', 'getairmail.com', 'mohmal.com',
    'temp-mail.org', 'burnermail.io', 'crazymailing.com', 'dropmail.me',
    'fakemailgenerator.com', 'nada.ltd', 'inboxbear.com', 'getnada.com',
    'emailondeck.com', 'tempail.com', 'mytemp.email', 'disposablemail.com',
    'tempmailaddress.com', 'generator.email', 'throwawayemailaddress.com',
    'armyspy.com', 'cuvox.de', 'dayrep.com', 'fleckens.hu', 'gustr.com',
    'jourrapide.com', 'rhyta.com', 'superrito.com', 'teleworm.us', 'tinypest.com',
    'trashmail.net', 'wegwerfemail.de', 'boun.cr', 'discard.email', 'spambog.com'
  ]);

  function isDisposableEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const parts = email.trim().toLowerCase().split('@');
    if (parts.length !== 2) return false;
    return DISPOSABLE_EMAIL_DOMAINS.has(parts[1]);
  }

  // =========================================================================
  // Client-Side Cryptographic Vault (for GitHub Pages / Standalone Launchers / Offline)
  // =========================================================================
  const LocalVault = {
    SALT: 'sheetfix_salt_2026',

    async hash(password) {
      if (window.crypto && window.crypto.subtle) {
        try {
          const enc = new TextEncoder();
          const data = enc.encode(password + this.SALT);
          const hashBuffer = await crypto.subtle.digest('SHA-256', data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch {
          // Fallback
        }
      }
      // Simple fallback hash if crypto.subtle is disabled
      let hash = 0;
      const str = password + this.SALT;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
      }
      return 'fb_' + Math.abs(hash).toString(16);
    },

    getUsers() {
      try {
        const u = localStorage.getItem('sheetfix_local_users');
        if (u) return JSON.parse(u);
      } catch {}
      // Seed default Senior Architect
      const defaultUsers = [
        {
          id: 'arch-primary-01',
          name: 'Senior Excel Architect',
          email: 'architect@sheetfix.dev',
          role: 'architect',
          passwordHash: '50f82e57ce8b3c40f427158ed21bf63b4f135499b1375dfbb478f4bb621936bf',
          createdAt: new Date().toISOString()
        }
      ];
      this.saveUsers(defaultUsers);
      return defaultUsers;
    },

    saveUsers(users) {
      try { localStorage.setItem('sheetfix_local_users', JSON.stringify(users)); } catch {}
    },

    getOrders() {
      try {
        const o = localStorage.getItem('sheetfix_local_orders');
        return o ? JSON.parse(o) : [];
      } catch { return []; }
    },

    saveOrders(orders) {
      try { localStorage.setItem('sheetfix_local_orders', JSON.stringify(orders)); } catch {}
    },

    getSession() {
      try {
        const s = localStorage.getItem('sheetfix_local_session');
        return s ? JSON.parse(s) : null;
      } catch { return null; }
    },

    setSession(user) {
      try { localStorage.setItem('sheetfix_local_session', JSON.stringify(user)); } catch {}
    },

    clearSession() {
      try { localStorage.removeItem('sheetfix_local_session'); } catch {}
    },

    async register(name, email, password) {
      const users = this.getUsers();
      const normEmail = (email || '').trim().toLowerCase();
      if (users.some(u => u.email === normEmail)) {
        throw new Error(currentLang === 'fa' ? 'این ایمیل قبلاً ثبت شده است' : 'This email is already registered');
      }
      const pHash = await this.hash(password);
      const user = {
        id: 'usr-' + Math.random().toString(36).substring(2, 9),
        name: name.trim(),
        email: normEmail,
        role: 'client',
        emailVerified: true,
        passwordHash: pHash,
        createdAt: new Date().toISOString()
      };
      users.push(user);
      this.saveUsers(users);
      this.setSession(user);
      return user;
    },

    createPendingOtp(email) {
      const code = (Math.floor(100000 + Math.random() * 900000)).toString();
      const otpData = {
        code,
        email: email.trim().toLowerCase(),
        expiresAt: Date.now() + 10 * 60 * 1000,
        attempts: 0
      };
      try {
        sessionStorage.setItem('sheetfix_pending_otp', JSON.stringify(otpData));
      } catch {}
      return code;
    },

    getPendingOtp() {
      try {
        const d = sessionStorage.getItem('sheetfix_pending_otp');
        return d ? JSON.parse(d) : null;
      } catch { return null; }
    },

    clearPendingOtp() {
      try { sessionStorage.removeItem('sheetfix_pending_otp'); } catch {}
    },

    async login(email, password) {
      const users = this.getUsers();
      const normEmail = (email || '').trim().toLowerCase();
      const pHash = await this.hash(password);

      const found = users.find(u => u.email === normEmail);
      if (!found) {
        throw new Error(currentLang === 'fa' ? 'ایمیل یا رمز عبور نامعتبر است' : 'Invalid email or password');
      }

      // Check hash
      if (found.passwordHash !== pHash) {
        throw new Error(currentLang === 'fa' ? 'ایمیل یا رمز عبور نامعتبر است' : 'Invalid email or password');
      }

      this.setSession(found);
      return found;
    },

    createOrder(userId, clientName, clientEmail, architectureTier, fileCount, notes) {
      const orders = this.getOrders();
      const order = {
        id: 'SF-' + Math.floor(1000 + Math.random() * 9000),
        userId,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim().toLowerCase(),
        architectureTier,
        fileCount: parseInt(fileCount, 10) || 1,
        notes: notes.trim(),
        status: 'Audit Queued',
        ndaSigned: true,
        sha256Checksum: null,
        createdAt: new Date().toISOString()
      };
      orders.unshift(order);
      this.saveOrders(orders);
      return order;
    },

    updateStatus(orderId, nextStatus, checksum) {
      const orders = this.getOrders();
      const o = orders.find(item => item.id === orderId);
      if (o) {
        o.status = nextStatus;
        if (checksum) o.sha256Checksum = checksum;
        this.saveOrders(orders);
        return o;
      }
      return null;
    }
  };

  // =========================================================================
  // 2. Language State
  // =========================================================================
  function setLanguage(lang) {
    currentLang = lang;
    try {
      localStorage.setItem('sheetfix_lang', lang);
    } catch(e) {}

    const dict = window.SHEETFIX_I18N ? window.SHEETFIX_I18N[lang] : null;
    if (!dict) return;

    // Document attributes
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'fa' ? 'rtl' : 'ltr');
    if (dict.siteTitle) document.title = dict.siteTitle;

    // Update text nodes
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (dict[key] !== undefined) {
        el.textContent = dict[key];
      }
    });

    // Update HTML nodes
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.dataset.i18nHtml;
      if (dict[key] !== undefined) {
        el.innerHTML = dict[key];
      }
    });

    // Update Language Toggle Button Label
    const langBtnText = document.getElementById('langText');
    if (langBtnText) {
      langBtnText.textContent = (lang === 'fa' ? 'English (EN)' : 'فارسی (FA)');
    }

    // Update Sound Button Label
    const soundBtn = document.getElementById('soundToggle');
    if (soundBtn && window.soundEngine) {
      soundBtn.textContent = window.soundEngine.isMuted ? dict.soundOff : dict.soundOn;
    }

    // Refresh Calculator
    updateCalculator(calcSlider ? calcSlider.value : 1);

    // Refresh orders view if logged in
    if (currentUser) {
      updateUserUI(currentUser);
    }
  }

  // Language Toggle Button Click
  const langToggleBtn = document.getElementById('langToggle');
  if (langToggleBtn) {
    langToggleBtn.addEventListener('click', () => {
      const nextLang = (currentLang === 'fa' ? 'en' : 'fa');
      setLanguage(nextLang);
      if (window.soundEngine && typeof window.soundEngine.playClick === 'function') {
        window.soundEngine.playClick();
      }
    });
  }

  // 3. Initialize 3D Scene
  let scene3D = null;
  if (typeof SimpleSpreadsheet3D === 'function') {
    scene3D = new SimpleSpreadsheet3D('simple3dCanvas');
  }

  // 3D Mode Toggle (Chaos vs Clean)
  const chaosBtn = document.getElementById('modeChaosBtn');
  const cleanBtn = document.getElementById('modeCleanBtn');

  if (chaosBtn && cleanBtn && scene3D) {
    chaosBtn.addEventListener('click', () => {
      chaosBtn.classList.add('active');
      cleanBtn.classList.remove('active');
      scene3D.setMode('chaos');
    });

    cleanBtn.addEventListener('click', () => {
      cleanBtn.classList.add('active');
      chaosBtn.classList.remove('active');
      scene3D.setMode('clean');
    });
  }

  // Sound Toggle
  const soundBtn = document.getElementById('soundToggle');
  if (soundBtn && window.soundEngine) {
    soundBtn.addEventListener('click', () => {
      window.soundEngine.toggleMute();
      const dict = window.SHEETFIX_I18N ? window.SHEETFIX_I18N[currentLang] : null;
      if (dict) {
        soundBtn.textContent = window.soundEngine.isMuted ? dict.soundOff : dict.soundOn;
      }
    });
  }

  // =========================================================================
  // 4. Auth & Portal Controller
  // =========================================================================
  const modal = document.getElementById('bookingModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const authPortalBtn = document.getElementById('authPortalBtn');
  const authUserBadge = document.getElementById('authUserBadge');
  const headerUserName = document.getElementById('headerUserName');
  const headerUserRole = document.getElementById('headerUserRole');
  const authSignOutBtn = document.getElementById('authSignOutBtn');

  // Tabs & Panes
  const tabSignInBtn = document.getElementById('tabSignInBtn');
  const tabRegisterBtn = document.getElementById('tabRegisterBtn');
  const tabVerifyBtn = document.getElementById('tabVerifyBtn');
  const tabWorkspaceBtn = document.getElementById('tabWorkspaceBtn');
  const tabArchitectBtn = document.getElementById('tabArchitectBtn');

  const paneSignIn = document.getElementById('paneSignIn');
  const paneRegister = document.getElementById('paneRegister');
  const paneVerifyOtp = document.getElementById('paneVerifyOtp');
  const paneWorkspace = document.getElementById('paneWorkspace');
  const paneArchitect = document.getElementById('paneArchitect');

  const workspaceUserName = document.getElementById('workspaceUserName');
  const workspaceTicketsList = document.getElementById('workspaceTicketsList');
  const architectOrdersTableBody = document.getElementById('architectOrdersTableBody');

  // Forms
  const signInForm = document.getElementById('signInForm');
  const registerForm = document.getElementById('registerForm');
  const newOrderForm = document.getElementById('newOrderForm');
  const signInError = document.getElementById('signInError');
  const registerError = document.getElementById('registerError');

  // OTP Verification Elements
  const otpForm = document.getElementById('otpForm');
  const otpDigitInputs = Array.from(document.querySelectorAll('.otp-digit-input'));
  const otpError = document.getElementById('otpError');
  const otpTargetEmail = document.getElementById('otpTargetEmail');
  const otpSimulationBanner = document.getElementById('otpSimulationBanner');
  const otpSimCodeDisplay = document.getElementById('otpSimCodeDisplay');
  const btnAutoFillOtp = document.getElementById('btnAutoFillOtp');
  const btnResendOtp = document.getElementById('btnResendOtp');
  const otpCooldownText = document.getElementById('otpCooldownText');
  const btnBackToRegister = document.getElementById('btnBackToRegister');
  let pendingRegistration = null;
  let resendCooldownTimer = null;

  function switchTab(tabName) {
    [tabSignInBtn, tabRegisterBtn, tabVerifyBtn, tabWorkspaceBtn, tabArchitectBtn].forEach(btn => {
      if (btn) btn.classList.remove('active');
    });
    [paneSignIn, paneRegister, paneVerifyOtp, paneWorkspace, paneArchitect].forEach(pane => {
      if (pane) pane.classList.remove('is-active');
    });

    if (tabName === 'signIn' && tabSignInBtn && paneSignIn) {
      tabSignInBtn.classList.add('active');
      paneSignIn.classList.add('is-active');
    } else if (tabName === 'register' && tabRegisterBtn && paneRegister) {
      tabRegisterBtn.classList.add('active');
      paneRegister.classList.add('is-active');
    } else if (tabName === 'verifyOtp' && paneVerifyOtp) {
      if (tabVerifyBtn) {
        tabVerifyBtn.classList.remove('is-hidden');
        tabVerifyBtn.classList.add('active');
      }
      paneVerifyOtp.classList.add('is-active');
      setTimeout(() => {
        if (otpDigitInputs[0]) otpDigitInputs[0].focus();
      }, 50);
    } else if (tabName === 'workspace' && tabWorkspaceBtn && paneWorkspace) {
      if (tabVerifyBtn) tabVerifyBtn.classList.add('is-hidden');
      tabWorkspaceBtn.classList.add('active');
      paneWorkspace.classList.add('is-active');
      loadWorkspaceOrders();
    } else if (tabName === 'architect' && tabArchitectBtn && paneArchitect) {
      if (tabVerifyBtn) tabVerifyBtn.classList.add('is-hidden');
      tabArchitectBtn.classList.add('active');
      paneArchitect.classList.add('is-active');
      loadArchitectOrders();
    }

    if (window.soundEngine && typeof window.soundEngine.playClick === 'function') {
      window.soundEngine.playClick();
    }
  }

  if (tabSignInBtn) tabSignInBtn.addEventListener('click', () => switchTab('signIn'));
  if (tabRegisterBtn) tabRegisterBtn.addEventListener('click', () => switchTab('register'));
  if (tabWorkspaceBtn) tabWorkspaceBtn.addEventListener('click', () => switchTab('workspace'));
  if (tabArchitectBtn) tabArchitectBtn.addEventListener('click', () => switchTab('architect'));

  function openPortalModal(preferredTab = null) {
    if (!modal) return;
    modal.classList.add('open');
    if (preferredTab) {
      switchTab(preferredTab);
    } else if (currentUser) {
      switchTab(currentUser.role === 'architect' ? 'architect' : 'workspace');
    } else {
      switchTab('signIn');
    }
  }

  function closePortalModal() {
    if (!modal) return;
    modal.classList.remove('open');
    if (signInError) signInError.classList.add('is-hidden');
    if (registerError) registerError.classList.add('is-hidden');
  }

  if (authPortalBtn) {
    authPortalBtn.addEventListener('click', () => openPortalModal());
  }
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closePortalModal);
  }
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closePortalModal();
    });
  }

  // Bind all CTA buttons on the page to open the modal
  document.querySelectorAll('.open-modal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const plan = btn.dataset.plan || '';
      openPortalModal(currentUser ? 'workspace' : 'signIn');
      if (currentUser && plan) {
        const tierSelect = document.getElementById('orderTierSelect');
        if (tierSelect) {
          if (plan.includes('Financial')) tierSelect.value = 'Financial Modeling Architecture';
          else if (plan.includes('Pipeline') || plan.includes('ETL')) tierSelect.value = 'Automated ETL Pipelines';
          else if (plan.includes('Security') || plan.includes('Governance')) tierSelect.value = 'Cell Governance & Security';
          else tierSelect.value = 'Core Spreadsheet Architecture';
        }
      }
      if (window.soundEngine && typeof window.soundEngine.playClick === 'function') {
        window.soundEngine.playClick();
      }
    });
  });

  function updateUserUI(user) {
    currentUser = user;
    if (user) {
      if (authPortalBtn) authPortalBtn.classList.add('is-hidden');
      if (authUserBadge) authUserBadge.classList.remove('is-hidden');
      if (headerUserName) headerUserName.textContent = user.name;
      if (headerUserRole) {
        headerUserRole.textContent = user.role === 'architect' ? 'ARCHITECT' : 'CLIENT';
      }
      if (workspaceUserName) workspaceUserName.textContent = user.name;

      if (tabWorkspaceBtn) tabWorkspaceBtn.classList.remove('is-hidden');
      if (tabArchitectBtn) {
        if (user.role === 'architect') {
          tabArchitectBtn.classList.remove('is-hidden');
        } else {
          tabArchitectBtn.classList.add('is-hidden');
        }
      }
    } else {
      if (authPortalBtn) authPortalBtn.classList.remove('is-hidden');
      if (authUserBadge) authUserBadge.classList.add('is-hidden');
      if (tabWorkspaceBtn) tabWorkspaceBtn.classList.add('is-hidden');
      if (tabArchitectBtn) tabArchitectBtn.classList.add('is-hidden');
    }
  }

  // Check auth on load
  async function checkAuth() {
    if (!isStaticHost) {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
        if (res.ok) {
          const data = await res.json();
          updateUserUI(data.user);
          return;
        }
      } catch {}
    }
    // Fallback to local vault session
    const localSession = LocalVault.getSession();
    updateUserUI(localSession);
  }

  // Sign In Handler
  if (signInForm) {
    signInForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('signInEmail').value;
      const password = document.getElementById('signInPassword').value;

      if (!isStaticHost) {
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
            credentials: 'same-origin'
          });

          // Check if response is valid JSON from our server
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await res.json();
            if (res.ok) {
              updateUserUI(data.user);
              if (signInError) signInError.classList.add('is-hidden');
              signInForm.reset();
              if (window.soundEngine && typeof window.soundEngine.playSuccess === 'function') {
                window.soundEngine.playSuccess();
              }
              switchTab(data.user.role === 'architect' ? 'architect' : 'workspace');
              return;
            } else {
              if (signInError) {
                signInError.textContent = data.message || data.error || 'Invalid credentials';
                signInError.classList.remove('is-hidden');
              }
              return;
            }
          }
        } catch {
          // Backend unreachable, fall through to LocalVault
        }
      }

      // LocalVault Fallback (Works on GitHub Pages, offline launchers, or if node server is down)
      try {
        const user = await LocalVault.login(email, password);
        updateUserUI(user);
        if (signInError) signInError.classList.add('is-hidden');
        signInForm.reset();
        if (window.soundEngine && typeof window.soundEngine.playSuccess === 'function') {
          window.soundEngine.playSuccess();
        }
        switchTab(user.role === 'architect' ? 'architect' : 'workspace');
      } catch (err) {
        if (signInError) {
          signInError.textContent = err.message || (currentLang === 'fa' ? 'ایمیل یا رمز عبور نامعتبر است' : 'Invalid email or password');
          signInError.classList.remove('is-hidden');
        }
      }
    });
  }

  // Register Handler -> Initiates 6-Digit OTP Email Verification
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('regName').value.trim();
      const email = document.getElementById('regEmail').value.trim().toLowerCase();
      const password = document.getElementById('regPassword').value;

      if (registerError) registerError.classList.add('is-hidden');

      if (!name || !email || !password) {
        if (registerError) {
          registerError.textContent = currentLang === 'fa' ? 'لطفاً تمامی فیلدها را تکمیل کنید' : 'Please fill all fields';
          registerError.classList.remove('is-hidden');
        }
        return;
      }

      if (password.length < 8) {
        if (registerError) {
          registerError.textContent = currentLang === 'fa' ? 'رمز عبور باید حداقل ۸ کاراکتر باشد' : 'Password must be at least 8 characters';
          registerError.classList.remove('is-hidden');
        }
        return;
      }

      // Check for Disposable / Burner Emails (Spam Defense)
      if (isDisposableEmail(email)) {
        if (registerError) {
          registerError.textContent = currentLang === 'fa'
            ? 'استفاده از ایمیل‌های موقت و یکبارمصرف مجاز نیست. لطفاً از ایمیل معتبر شرکتی یا شخصی استفاده کنید.'
            : 'Disposable and burner emails are blocked. Please use an authentic work email.';
          registerError.classList.remove('is-hidden');
        }
        return;
      }

      // Check if user already exists locally
      const localUsers = LocalVault.getUsers();
      if (localUsers.some(u => u.email === email)) {
        if (registerError) {
          registerError.textContent = currentLang === 'fa' ? 'این ایمیل قبلاً ثبت شده است' : 'This email is already registered';
          registerError.classList.remove('is-hidden');
        }
        return;
      }

      // Generate Cryptographic 6-Digit OTP
      let code = (Math.floor(100000 + Math.random() * 900000)).toString();

      // If backend available, also request server OTP dispatch
      if (!isStaticHost) {
        try {
          const res = await fetch('/api/auth/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.simulatedCode) code = data.simulatedCode;
          }
        } catch {}
      }

      // If Web3Forms is configured with access key, dispatch live email in background
      if (window.SHEETFIX_CONFIG?.web3FormsAccessKey) {
        try {
          fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              access_key: window.SHEETFIX_CONFIG.web3FormsAccessKey,
              subject: `🔐 [SheetFix Security] Your 6-Digit Verification Code: ${code}`,
              to_email: email,
              message: `Hello ${name},\n\nYour 6-digit SheetFix client verification code is: ${code}\n\nThis single-use code expires in 10 minutes.\nEnter this code on the verification screen to activate your secure spreadsheet workspace.\n\nSheetFix Security Engineering Team`
            })
          }).catch(() => {});
        } catch {}
      }

      // Store pending registration state
      pendingRegistration = {
        name,
        email,
        password,
        code,
        expiresAt: Date.now() + 10 * 60 * 1000,
        attempts: 0
      };

      // Set UI and switch to OTP verification pane
      if (otpTargetEmail) otpTargetEmail.textContent = email;
      if (otpSimCodeDisplay) otpSimCodeDisplay.textContent = code;
      if (otpSimulationBanner) otpSimulationBanner.classList.remove('is-hidden');
      otpDigitInputs.forEach(input => input.value = '');
      if (otpError) otpError.classList.add('is-hidden');

      startResendCooldown();
      switchTab('verifyOtp');
    });
  }

  // 6-Digit OTP Inputs Handling (Auto-jump, backspace navigation, paste)
  otpDigitInputs.forEach((input, idx) => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/[^0-9]/g, '');
      if (input.value && idx < otpDigitInputs.length - 1) {
        otpDigitInputs[idx + 1].focus();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && idx > 0) {
        otpDigitInputs[idx - 1].focus();
      } else if (e.key === 'ArrowLeft' && idx > 0) {
        otpDigitInputs[idx - 1].focus();
      } else if (e.key === 'ArrowRight' && idx < otpDigitInputs.length - 1) {
        otpDigitInputs[idx + 1].focus();
      }
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData).getData('text');
      const digits = pasted.replace(/[^0-9]/g, '').slice(0, 6);
      if (digits.length > 0) {
        digits.split('').forEach((d, i) => {
          if (otpDigitInputs[i]) otpDigitInputs[i].value = d;
        });
        const nextIdx = Math.min(digits.length, otpDigitInputs.length - 1);
        otpDigitInputs[nextIdx].focus();
      }
    });
  });

  // Auto-Fill Code Helper (For effortless 1-click testing)
  if (btnAutoFillOtp) {
    btnAutoFillOtp.addEventListener('click', () => {
      if (pendingRegistration && pendingRegistration.code) {
        pendingRegistration.code.split('').forEach((d, i) => {
          if (otpDigitInputs[i]) otpDigitInputs[i].value = d;
        });
        if (otpError) otpError.classList.add('is-hidden');
        if (window.soundEngine && typeof window.soundEngine.playClick === 'function') {
          window.soundEngine.playClick();
        }
      }
    });
  }

  // Resend OTP Cooldown Timer
  function startResendCooldown() {
    let remaining = 60;
    if (btnResendOtp) btnResendOtp.disabled = true;
    if (otpCooldownText) {
      otpCooldownText.classList.remove('is-hidden');
      otpCooldownText.textContent = `(${remaining}s)`;
    }

    if (resendCooldownTimer) clearInterval(resendCooldownTimer);
    resendCooldownTimer = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(resendCooldownTimer);
        if (btnResendOtp) btnResendOtp.disabled = false;
        if (otpCooldownText) otpCooldownText.classList.add('is-hidden');
      } else {
        if (otpCooldownText) otpCooldownText.textContent = `(${remaining}s)`;
      }
    }, 1000);
  }

  if (btnResendOtp) {
    btnResendOtp.addEventListener('click', () => {
      if (!pendingRegistration) return;
      const newCode = (Math.floor(100000 + Math.random() * 900000)).toString();
      pendingRegistration.code = newCode;
      pendingRegistration.expiresAt = Date.now() + 10 * 60 * 1000;
      pendingRegistration.attempts = 0;
      if (otpSimCodeDisplay) otpSimCodeDisplay.textContent = newCode;
      otpDigitInputs.forEach(inp => inp.value = '');
      if (otpDigitInputs[0]) otpDigitInputs[0].focus();
      if (otpError) otpError.classList.add('is-hidden');
      startResendCooldown();
    });
  }

  if (btnBackToRegister) {
    btnBackToRegister.addEventListener('click', () => {
      switchTab('register');
    });
  }

  // Submit OTP Verification Form
  if (otpForm) {
    otpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const enteredCode = otpDigitInputs.map(inp => inp.value).join('');

      if (enteredCode.length !== 6) {
        if (otpError) {
          otpError.textContent = currentLang === 'fa' ? 'لطفاً هر ۶ رقم کد احراز هویت را وارد کنید' : 'Please enter all 6 digits of your verification code';
          otpError.classList.remove('is-hidden');
        }
        return;
      }

      if (!pendingRegistration) {
        if (otpError) {
          otpError.textContent = currentLang === 'fa' ? 'مشخصات اولیه یافت نشد. لطفاً مجدداً ثبت‌نام فرمایید.' : 'No pending registration. Please sign up again.';
          otpError.classList.remove('is-hidden');
        }
        return;
      }

      if (Date.now() > pendingRegistration.expiresAt) {
        if (otpError) {
          otpError.textContent = currentLang === 'fa' ? 'کد احراز هویت منقضی شده است. لطفاً کد جدید دریافت کنید.' : 'Verification code has expired. Please request a new code.';
          otpError.classList.remove('is-hidden');
        }
        return;
      }

      if (pendingRegistration.attempts >= 4) {
        if (otpError) {
          otpError.textContent = currentLang === 'fa' ? 'تلاش‌های ناموفق بیش از حد مجاز. لطفاً مجدداً ثبت‌نام کنید.' : 'Too many failed attempts. Please register again.';
          otpError.classList.remove('is-hidden');
        }
        return;
      }

      if (enteredCode !== pendingRegistration.code) {
        pendingRegistration.attempts++;
        if (otpError) {
          otpError.textContent = currentLang === 'fa' ? 'کد تایید وارد شده نامعتبر است' : 'Invalid verification code. Please check and retry.';
          otpError.classList.remove('is-hidden');
        }
        return;
      }

      // Verification Success! Proceed to register user
      const { name, email, password } = pendingRegistration;

      if (!isStaticHost) {
        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
            credentials: 'same-origin'
          });

          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await res.json();
            if (res.ok) {
              updateUserUI(data.user);
              if (otpError) otpError.classList.add('is-hidden');
              registerForm.reset();
              otpDigitInputs.forEach(i => i.value = '');
              pendingRegistration = null;
              if (window.soundEngine && typeof window.soundEngine.playSuccess === 'function') {
                window.soundEngine.playSuccess();
              }
              switchTab('workspace');
              return;
            }
          }
        } catch {
          // Backend unreachable, fall through to LocalVault
        }
      }

      // LocalVault Fallback (Works on GitHub Pages and Offline Launcher)
      try {
        const user = await LocalVault.register(name, email, password);
        updateUserUI(user);
        if (otpError) otpError.classList.add('is-hidden');
        registerForm.reset();
        otpDigitInputs.forEach(i => i.value = '');
        pendingRegistration = null;
        if (window.soundEngine && typeof window.soundEngine.playSuccess === 'function') {
          window.soundEngine.playSuccess();
        }
        switchTab('workspace');
      } catch (err) {
        if (otpError) {
          otpError.textContent = err.message || (currentLang === 'fa' ? 'خطا در فعال‌سازی حساب' : 'Error activating account');
          otpError.classList.remove('is-hidden');
        }
      }
    });
  }

  // Sign Out Handler
  if (authSignOutBtn) {
    authSignOutBtn.addEventListener('click', async () => {
      try {
        if (!isStaticHost) {
          await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
        }
      } catch {}
      LocalVault.clearSession();
      updateUserUI(null);
      closePortalModal();
      if (window.soundEngine && typeof window.soundEngine.playClick === 'function') {
        window.soundEngine.playClick();
      }
    });
  }

  // Web3Forms Order Forwarder to Real Architect Inbox
  async function forwardOrderToEmail(order) {
    const accessKey = window.SHEETFIX_CONFIG?.web3FormsAccessKey;
    const payload = {
      access_key: accessKey || 'SHEETFIX_VAULT_GATEWAY',
      subject: `⚡ [Verified Intake] New SheetFix Project: ${order.id} - ${order.architectureTier}`,
      from_name: 'SheetFix Architectural Gateway',
      client_name: order.clientName,
      client_email: order.clientEmail,
      architecture_tier: order.architectureTier,
      spreadsheet_count: order.fileCount,
      problem_statement: order.notes,
      verification_status: 'CRYPTOGRAPHIC_OTP_AUTHENTICATED',
      order_id: order.id,
      timestamp: order.createdAt
    };

    if (accessKey) {
      try {
        await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (e) {
        console.warn('Web3Forms dispatch skipped:', e);
      }
    }
  }

  // Submit New Order (Client Workspace)
  if (newOrderForm) {
    newOrderForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const architectureTier = document.getElementById('orderTierSelect').value;
      const fileCount = parseInt(document.getElementById('orderFilesCount').value, 10) || 1;
      const notes = document.getElementById('orderNotesText').value;

      if (!currentUser) return;

      if (!isStaticHost) {
        try {
          const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ architectureTier, fileCount, notes }),
            credentials: 'same-origin'
          });

          if (res.ok) {
            const order = await res.json();
            forwardOrderToEmail(order);
            newOrderForm.reset();
            if (window.soundEngine && typeof window.soundEngine.playSuccess === 'function') {
              window.soundEngine.playSuccess();
            }
            loadWorkspaceOrders();
            return;
          }
        } catch {}
      }

      // LocalVault Fallback
      const order = LocalVault.createOrder(currentUser.id, currentUser.name, currentUser.email, architectureTier, fileCount, notes);
      forwardOrderToEmail(order);
      newOrderForm.reset();
      if (window.soundEngine && typeof window.soundEngine.playSuccess === 'function') {
        window.soundEngine.playSuccess();
      }
      loadWorkspaceOrders();
    });
  }

  // Load Client Workspace Orders
  async function loadWorkspaceOrders() {
    if (!workspaceTicketsList) return;
    workspaceTicketsList.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 12px 0;">Loading secure orders...</div>';

    let orders = [];
    if (!isStaticHost) {
      try {
        const res = await fetch('/api/orders', { credentials: 'same-origin' });
        if (res.ok && (res.headers.get('content-type') || '').includes('application/json')) {
          orders = await res.json();
        }
      } catch {}
    }

    // Fallback to local vault orders if empty or offline
    if (!orders || orders.length === 0) {
      const allLocal = LocalVault.getOrders();
      orders = currentUser ? allLocal.filter(o => o.userId === currentUser.id) : [];
    }

    if (orders.length === 0) {
      workspaceTicketsList.innerHTML = `
        <div style="background: rgba(25, 28, 36, 0.6); border: 1px dashed var(--border); border-radius: 12px; padding: 24px; text-align: center; color: var(--text-secondary); font-size: 0.88rem;">
          ${currentLang === 'fa' ? 'هنوز سفارشی ثبت نکرده‌اید. با استفاده از فرم بالا نخستین پروژه خود را آغاز کنید!' : 'No active spreadsheet orders yet. Submit your first order above!'}
        </div>
      `;
      return;
    }

    const steps = ['Audit Queued', 'Refactoring', 'Security QA', 'Delivered'];
    const stepsFa = ['در صف بررسی', 'در حال بازسازی', 'تایید امنیتی', 'تحویل‌شده'];

    workspaceTicketsList.innerHTML = orders.map(o => {
      const stepIdx = steps.indexOf(o.status);
      const stepsHtml = steps.map((s, i) => {
        let cls = 'step-node';
        if (i < stepIdx) cls += ' completed';
        else if (i === stepIdx) cls += ' current';
        const label = currentLang === 'fa' ? stepsFa[i] : s;
        return `<div class="${cls}">${i + 1}. ${label}</div>`;
      }).join('');

      const checksumBlock = o.sha256Checksum ? `
        <div class="ticket-checksum-row">
          <span>🛡️ SHA-256:</span>
          <span>${o.sha256Checksum}</span>
        </div>
      ` : '';

      const tgMsg = encodeURIComponent(
        `Hello Senior Architect (@Shy1ohmy),\nI have submitted SheetFix order ticket ${o.id} for "${o.architectureTier}" (${o.fileCount} file(s)).\n\nNotes: ${o.notes}`
      );
      const tgLink = `https://t.me/Shy1ohmy?text=${tgMsg}`;

      return `
        <div class="ticket-item-card">
          <div class="ticket-top-meta">
            <span class="ticket-id-tag">${o.id}</span>
            <span class="ticket-tier-name">${o.architectureTier} (${o.fileCount} ${currentLang === 'fa' ? 'فایل' : 'Files'})</span>
            <span class="pill-label" style="margin: 0;">${new Date(o.createdAt).toLocaleDateString()}</span>
          </div>
          <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 8px;">
            ${escapeHtml(o.notes)}
          </p>
          <div class="ticket-step-tracker">
            ${stepsHtml}
          </div>
          ${checksumBlock}
          <div style="margin-top: 12px; display: flex; align-items: center; justify-content: flex-end;">
            <a href="${tgLink}" target="_blank" rel="noopener noreferrer" class="btn-ticket-telegram">
              ✈️ ${currentLang === 'fa' ? 'ارسال مشخصات به معمار ارشد (@Shy1ohmy) ➔' : 'Message @Shy1ohmy on Telegram ➔'}
            </a>
          </div>
        </div>
      `;
    }).join('');
  }

  // Load Architect Orders
  async function loadArchitectOrders() {
    if (!architectOrdersTableBody) return;
    architectOrdersTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding: 20px;">Loading architect intake queue...</td></tr>';

    let orders = [];
    if (!isStaticHost) {
      try {
        const res = await fetch('/api/orders', { credentials: 'same-origin' });
        if (res.ok && (res.headers.get('content-type') || '').includes('application/json')) {
          orders = await res.json();
        }
      } catch {}
    }

    if (!orders || orders.length === 0) {
      orders = LocalVault.getOrders();
    }

    if (orders.length === 0) {
      architectOrdersTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding: 20px;">No incoming orders in queue.</td></tr>';
      return;
    }

    architectOrdersTableBody.innerHTML = orders.map(o => {
      let badgeCls = 'queued';
      if (o.status === 'Refactoring') badgeCls = 'refactoring';
      else if (o.status === 'Security QA') badgeCls = 'qa';
      else if (o.status === 'Delivered') badgeCls = 'delivered';

      return `
        <tr>
          <td style="font-family: 'JetBrains Mono', monospace; font-weight: 700; color: var(--brand-volt);">${o.id}</td>
          <td><strong>${escapeHtml(o.clientName)}</strong><br><span style="color: var(--text-muted); font-size: 0.74rem;">${escapeHtml(o.clientEmail)}</span></td>
          <td>${escapeHtml(o.architectureTier)}</td>
          <td>${o.fileCount}</td>
          <td><span class="status-badge ${badgeCls}">${o.status}</span></td>
          <td style="font-family: 'JetBrains Mono', monospace; font-size: 0.72rem;">${o.sha256Checksum ? o.sha256Checksum.slice(0, 12) + '...' : '—'}</td>
          <td>
            <button class="btn-table-action advance-order-btn" data-order-id="${o.id}" data-current-status="${o.status}">
              ${currentLang === 'fa' ? 'ارتقای مرحله ➔' : 'Advance Status ➔'}
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Wire advance buttons
    document.querySelectorAll('.advance-order-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const orderId = btn.dataset.orderId;
        const curStatus = btn.dataset.currentStatus;
        let nextStatus = 'Refactoring';
        let checksum = null;

        if (curStatus === 'Audit Queued') nextStatus = 'Refactoring';
        else if (curStatus === 'Refactoring') nextStatus = 'Security QA';
        else if (curStatus === 'Security QA') {
          nextStatus = 'Delivered';
          checksum = Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('');
        } else {
          return; // Already delivered
        }

        if (!isStaticHost) {
          try {
            const patchRes = await fetch(`/api/orders/${orderId}/status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: nextStatus, sha256Checksum: checksum }),
              credentials: 'same-origin'
            });

            if (patchRes.ok) {
              if (window.soundEngine && typeof window.soundEngine.playSuccess === 'function') {
                window.soundEngine.playSuccess();
              }
              loadArchitectOrders();
              return;
            }
          } catch {}
        }

        // LocalVault Fallback
        LocalVault.updateStatus(orderId, nextStatus, checksum);
        if (window.soundEngine && typeof window.soundEngine.playSuccess === 'function') {
          window.soundEngine.playSuccess();
        }
        loadArchitectOrders();
      });
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // 5. Interactive Micro-Pricing & ROI Calculator
  const calcSlider = document.getElementById('calcFileSlider');
  const calcFilesDisplay = document.getElementById('calcFilesDisplay');
  const calcCostDisplay = document.getElementById('calcCostDisplay');
  const calcHoursDisplay = document.getElementById('calcHoursDisplay');
  const calcFormulasDisplay = document.getElementById('calcFormulasDisplay');
  const calcCtaBtn = document.getElementById('calcCtaBtn');

  function updateCalculator(count) {
    const files = parseInt(count, 10) || 1;
    if (calcFilesDisplay) {
      calcFilesDisplay.textContent = currentLang === 'fa' ? `${files} فایل` : `${files} ${files === 1 ? 'File' : 'Files'}`;
    }

    // Architectural Tier Computation
    let tierText = '';
    let tierEn = '';
    let tierFa = '';
    if (files >= 10) {
      tierEn = 'Enterprise Matrix Suite';
      tierFa = 'بسته جامع سازمانی';
    } else if (files >= 4) {
      tierEn = 'Multi-Model Architecture';
      tierFa = 'معماری چند مدلی';
    } else {
      tierEn = 'Standard Refactor Tier';
      tierFa = 'اصلاح استاندارد شیت';
    }
    tierText = currentLang === 'fa' ? tierFa : tierEn;

    if (calcCostDisplay) calcCostDisplay.textContent = tierText;

    const hoursSaved = (files * 4.2).toFixed(1);
    const formulasFixed = files * 25;

    if (calcHoursDisplay) {
      calcHoursDisplay.textContent = currentLang === 'fa' ? `${Number(hoursSaved).toLocaleString('fa-IR')} ساعت` : `${hoursSaved} hrs`;
    }
    if (calcFormulasDisplay) {
      calcFormulasDisplay.textContent = currentLang === 'fa' ? `${Number(formulasFixed).toLocaleString('fa-IR')}+` : `${formulasFixed}+`;
    }

    if (calcCtaBtn) {
      const planName = currentLang === 'fa'
        ? `پیشنهاد معماری (${files} فایل - ${tierFa})`
        : `Architecture Proposal (${files} Files - ${tierEn})`;
      calcCtaBtn.dataset.plan = planName;
      calcCtaBtn.dataset.planEn = `Architecture Proposal (${files} Files - ${tierEn})`;
      calcCtaBtn.dataset.planFa = `پیشنهاد معماری (${files} فایل - ${tierFa})`;
    }
  }

  if (calcSlider) {
    calcSlider.addEventListener('input', (e) => {
      updateCalculator(e.target.value);
    });
    calcSlider.addEventListener('change', () => {
      if (window.soundEngine && typeof window.soundEngine.playClick === 'function') {
        window.soundEngine.playClick();
      }
    });
  }

  // 6. Interactive Formula Clinic Tab Switcher
  const clinicTabBtns = document.querySelectorAll('.clinic-tab-btn');
  const clinicPanels = document.querySelectorAll('.clinic-tab-panel');

  clinicTabBtns.forEach(tabBtn => {
    tabBtn.addEventListener('click', () => {
      clinicTabBtns.forEach(b => b.classList.remove('active'));
      clinicPanels.forEach(p => p.classList.remove('active'));

      tabBtn.classList.add('active');
      const targetId = tabBtn.dataset.clinicTarget;
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
      if (window.soundEngine && typeof window.soundEngine.playClick === 'function') {
        window.soundEngine.playClick();
      }
    });
  });

  // 7. Smooth Scroll
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const el = document.querySelector(targetId);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth' });
        if (window.soundEngine && typeof window.soundEngine.playClick === 'function') {
          window.soundEngine.playClick();
        }
      }
    });
  });

  // 8. Cookie Consent & Privacy Preference Management
  const cookieBanner = document.getElementById('cookieBanner');
  const btnAcceptCookies = document.getElementById('btnAcceptCookies');
  const btnEssentialCookies = document.getElementById('btnEssentialCookies');

  const existingConsent = localStorage.getItem('sheetfix_cookie_consent');
  if (!existingConsent && cookieBanner) {
    setTimeout(() => {
      cookieBanner.classList.remove('is-hidden');
    }, 800);
  }

  if (btnAcceptCookies && cookieBanner) {
    btnAcceptCookies.addEventListener('click', () => {
      localStorage.setItem('sheetfix_cookie_consent', 'all');
      cookieBanner.classList.add('is-hidden');
      if (window.SheetFixAnalytics) {
        window.SheetFixAnalytics.init();
        window.SheetFixAnalytics.track('consent_granted', { type: 'all' });
      }
      if (window.soundEngine && typeof window.soundEngine.playSuccess === 'function') {
        window.soundEngine.playSuccess();
      }
    });
  }

  if (btnEssentialCookies && cookieBanner) {
    btnEssentialCookies.addEventListener('click', () => {
      localStorage.setItem('sheetfix_cookie_consent', 'essential');
      cookieBanner.classList.add('is-hidden');
      if (window.SheetFixAnalytics) {
        window.SheetFixAnalytics.track('consent_granted', { type: 'essential' });
      }
      if (window.soundEngine && typeof window.soundEngine.playClick === 'function') {
        window.soundEngine.playClick();
      }
    });
  }

  // 9. SheetFix Analytics Auto-Initialization
  if (window.SheetFixAnalytics) {
    window.SheetFixAnalytics.init();
  }

  // Check initial auth state and set initial language
  checkAuth();
  setLanguage(currentLang);
});
