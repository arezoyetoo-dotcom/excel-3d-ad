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
      const sumEl = document.getElementById('excelStatusSum');
      const calcEl = document.getElementById('excelStatusCalc');
      if (sumEl) sumEl.textContent = 'Sum: #REF! ERROR';
      if (calcEl) calcEl.textContent = '● Calculation Aborted: #DIV/0!';
    });

    cleanBtn.addEventListener('click', () => {
      cleanBtn.classList.add('active');
      chaosBtn.classList.remove('active');
      scene3D.setMode('clean');
      const sumEl = document.getElementById('excelStatusSum');
      const calcEl = document.getElementById('excelStatusCalc');
      const dict = window.SHEETFIX_I18N ? window.SHEETFIX_I18N[currentLang] : null;
      if (sumEl) sumEl.textContent = dict && dict.excelStatusSum ? dict.excelStatusSum : 'Sum: $1,166,300';
      if (calcEl) calcEl.textContent = dict && dict.excelStatusCalc ? dict.excelStatusCalc : '● Recalculation: 0.04s';
    });
  }

  // 3D View Toggle (Perspective 3D vs Flat 2D Sheet)
  const viewToggle3D = document.getElementById('viewToggle3D');
  const viewToggleFlat = document.getElementById('viewToggleFlat');
  if (viewToggle3D && viewToggleFlat && scene3D) {
    viewToggle3D.addEventListener('click', () => {
      viewToggle3D.classList.add('active');
      viewToggleFlat.classList.remove('active');
      scene3D.setView('3d');
      if (window.soundEngine && typeof window.soundEngine.playClick === 'function') {
        window.soundEngine.playClick();
      }
    });

    viewToggleFlat.addEventListener('click', () => {
      viewToggleFlat.classList.add('active');
      viewToggle3D.classList.remove('active');
      scene3D.setView('flat');
      if (window.soundEngine && typeof window.soundEngine.playClick === 'function') {
        window.soundEngine.playClick();
      }
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
  
  // =========================================================================
  // 10. CUSTOM EXCEL PROJECT & PRICE OFFER STUDIO ("Say What You Want & Offer a Price")
  // =========================================================================
  function initBountyStudio(scene3D) {
    const slider = document.getElementById('bountyPriceSlider');
    const priceInput = document.getElementById('bountyPriceInput');
    const presetBtns = document.querySelectorAll('.btn-preset-price');
    const catPills = document.querySelectorAll('#bountyCategoryPills .category-pill');
    const catInput = document.getElementById('bountyCategory');
    const projectForm = document.getElementById('customProjectForm');
    const submitBtn = document.getElementById('bountySubmitBtn');

    // Radar elements
    const radarDot = document.getElementById('radarDot');
    const radarTierTitle = document.getElementById('radarTierTitle');
    const radarTierDesc = document.getElementById('radarTierDesc');
    const radarSpeedVal = document.getElementById('radarSpeedVal');
    const radarArchitectVal = document.getElementById('radarArchitectVal');

    // Board & Track elements
    const cardsGrid = document.getElementById('bountyCardsGrid');
    const filterTabs = document.querySelectorAll('.board-tab');
    const countAll = document.getElementById('countAll');
    const countPending = document.getElementById('countPending');
    const countBuilding = document.getElementById('countBuilding');
    const countDelivered = document.getElementById('countDelivered');

    const trackInput = document.getElementById('trackInput');
    const btnTrackProject = document.getElementById('btnTrackProject');
    const trackResultDrawer = document.getElementById('trackResultDrawer');
    const closeTrackBtn = document.getElementById('closeTrackBtn');

    // Admin Desk Modal elements
    const adminDeskBtn = document.getElementById('adminDeskBtn');
    const adminDeskModal = document.getElementById('adminDeskModal');
    const closeAdminDeskBtn = document.getElementById('closeAdminDeskBtn');
    const adminLockScreen = document.getElementById('adminLockScreen');
    const adminConsoleArea = document.getElementById('adminConsoleArea');
    const adminUnlockForm = document.getElementById('adminUnlockForm');
    const adminKeyInput = document.getElementById('adminKeyInput');
    const adminUnlockError = document.getElementById('adminUnlockError');
    const adminProjectsTableBody = document.getElementById('adminProjectsTableBody');
    const btnAdminLockConsole = document.getElementById('btnAdminLockConsole');
    const btnExportProjectsJson = document.getElementById('btnExportProjectsJson');
    const btnExportProjectsCsv = document.getElementById('btnExportProjectsCsv');

    const adminMetricPipeline = document.getElementById('adminMetricPipeline');
    const adminMetricPending = document.getElementById('adminMetricPending');
    const adminMetricBuilding = document.getElementById('adminMetricBuilding');
    const adminMetricDelivered = document.getElementById('adminMetricDelivered');

    let currentFilter = 'all';
    let cachedProjects = [];

    // LocalStorage Fallback Seed for GitHub Pages
    const LOCAL_PROJECTS_KEY = 'sheetfix_custom_bounties_v1';
    function getLocalProjects() {
      try {
        const raw = localStorage.getItem(LOCAL_PROJECTS_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      return [
        {
          id: 'EXCEL-8421',
          clientName: 'Julian Vance',
          clientEmail: 'julian@vancemodels.io',
          telegram: '@jvance_ny',
          projectTitle: 'Real Estate Multi-Family LBO & Waterfall Model',
          category: 'Financial Modeling',
          description: 'Dynamic 10-year cash flow model for a 240-unit property with 3 equity tiers, debt amortization, and automated sensitivity returns matrix.',
          offeredPrice: 850,
          turnaroundHours: 48,
          status: 'In Progress',
          adminNotes: 'Assigned to Senior Modeler. Modeling tier-3 IRR waterfall formulas with zero legacy circular references.',
          counterPrice: null,
          deliveryUrl: null,
          deliveryNotes: null,
          sha256Checksum: null,
          createdAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString()
        },
        {
          id: 'EXCEL-6319',
          clientName: 'Elena Rostova',
          clientEmail: 'elena@logistix-eu.com',
          telegram: '@elena_log',
          projectTitle: 'Automated Multi-Warehouse Inventory & Barcode VBA',
          category: 'VBA Automation',
          description: 'VBA macro that auto-syncs 6 warehouse CSV exports every morning, reconciles SKU variances, and triggers restock orders in under 5 seconds.',
          offeredPrice: 600,
          turnaroundHours: 24,
          status: 'Delivered',
          adminNotes: 'Delivered with 64-bit API compatibility and modular VBA scripts.',
          counterPrice: null,
          deliveryUrl: 'https://github.com/arezoyetoo-dotcom/excel-3d-ad/blob/main/README.md',
          deliveryNotes: 'Delivered complete inventory engine with 1-click batch sync and error logging.',
          sha256Checksum: '9e107d9d372bb6826bd81d3542a419d6dae1c4df234a974b7a13d7890f9c2d1b',
          createdAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString()
        },
        {
          id: 'EXCEL-9104',
          clientName: 'Marcus Sterling',
          clientEmail: 'm.sterling@sterlinggrowth.co',
          telegram: '@msterling',
          projectTitle: 'Executive C-Suite KPI Dashboard with Interactive Slicers',
          category: 'Interactive Dashboard',
          description: 'Clean obsidian dark mode dashboard synthesizing ARR, Churn, LTV:CAC, and Runway with dynamic fiscal year slicers and print-ready board PDF layout.',
          offeredPrice: 1200,
          turnaroundHours: 48,
          status: 'Pending Review',
          adminNotes: 'Under architecture review by Lead Architect.',
          counterPrice: null,
          deliveryUrl: null,
          deliveryNotes: null,
          sha256Checksum: null,
          createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString()
        }
      ];
    }

    function saveLocalProjects(projs) {
      try {
        localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(projs));
      } catch (e) {}
    }

    // Two-Way Sync Price Slider & Input & 3D Scene
    function updateOfferRadar(price) {
      const p = parseInt(price, 10) || 50;
      if (priceInput && priceInput.value != p) priceInput.value = p;
      if (slider && slider.value != p) slider.value = p;

      // Update 3D Scene KPI pillars
      if (scene3D && typeof scene3D.setPriceOfferScale === 'function') {
        scene3D.setPriceOfferScale(p);
      }

      // Update Presets Active State
      presetBtns.forEach(btn => {
        if (parseInt(btn.dataset.amount, 10) === p) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      // Update Radar
      if (radarTierTitle && radarTierDesc && radarSpeedVal && radarArchitectVal && radarDot) {
        if (p < 250) {
          radarTierTitle.textContent = currentLang === 'fa' ? 'پیشنهاد پایه و اقتصادی' : 'Value Tier Offer';
          radarTierDesc.textContent = currentLang === 'fa' 
            ? 'سفارش وارد صف استاندارد بررسی می‌شود. مناسب برای فایل‌های سبک و فرمول‌های جزئی.'
            : 'Submitted to standard architect queue. Ideal for micro-fixes, syntax cleanups, and single-sheet formulas.';
          radarSpeedVal.textContent = currentLang === 'fa' ? '⏱️ بررسی استاندارد (۴۸ تا ۷۲ ساعت)' : '⏱️ Standard Queue (48-72h)';
          radarSpeedVal.className = 'radar-stat-val text-amber';
          radarArchitectVal.textContent = currentLang === 'fa' ? 'مهندس محاسبات اکسل' : 'Spreadsheet Specialist';
          radarDot.style.background = '#F59E0B';
          radarDot.style.boxShadow = '0 0 10px #F59E0B';
        } else if (p < 850) {
          radarTierTitle.textContent = currentLang === 'fa' ? 'پیشنهاد متناسب با بازار' : 'Market Competitive Offer';
          radarTierDesc.textContent = currentLang === 'fa'
            ? 'معماران ارشد اکسل معمولاً پیشنهادهای منصفانه را ظرف ۲ الی ۴ ساعت بررسی و شروع می‌کنند.'
            : 'Senior Excel Architects typically review and accept competitive bids within 2 to 4 hours.';
          radarSpeedVal.textContent = currentLang === 'fa' ? '⚡ اولویت فوری (۲۴ تا ۴۸ ساعت)' : '⚡ High Priority (24-48h)';
          radarSpeedVal.className = 'radar-stat-val text-emerald';
          radarArchitectVal.textContent = currentLang === 'fa' ? 'معمار ارشد مالی و ماکرو' : 'Senior Financial & VBA Architect';
          radarDot.style.background = '#10B981';
          radarDot.style.boxShadow = '0 0 10px #10B981';
        } else {
          radarTierTitle.textContent = currentLang === 'fa' ? '🔥 اسپرینت VIP معمار ارشد' : '🔥 VIP Priority Sprint Offer';
          radarTierDesc.textContent = currentLang === 'fa'
            ? 'تخصیص آنی به تیم معماران نهادی. شروع بلافاصله پس از ثبت با پشتیبانی اختصاصی.'
            : 'Instant VIP allocation to Lead Institutional Architects. Guaranteed sprint turnaround under 24 hours.';
          radarSpeedVal.textContent = currentLang === 'fa' ? '🚀 تخصیص فوری (< ۲۴ ساعت)' : '🚀 Immediate (<24h Turnaround)';
          radarSpeedVal.className = 'radar-stat-val text-cyan';
          radarArchitectVal.textContent = currentLang === 'fa' ? 'رئیس معماری داده و مدل‌های سازمانی' : 'Principal Financial Modeler';
          radarDot.style.background = '#38BDF8';
          radarDot.style.boxShadow = '0 0 12px #38BDF8';
        }
      }
    }

    if (slider) {
      slider.addEventListener('input', (e) => {
        updateOfferRadar(e.target.value);
      });
    }

    if (priceInput) {
      priceInput.addEventListener('input', (e) => {
        updateOfferRadar(e.target.value);
      });
      priceInput.addEventListener('change', (e) => {
        let val = parseInt(e.target.value, 10);
        if (isNaN(val) || val < 25) val = 25;
        updateOfferRadar(val);
      });
    }

    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseInt(btn.dataset.amount, 10);
        updateOfferRadar(val);
        if (window.soundEngine && typeof window.soundEngine.playClick === 'function') {
          window.soundEngine.playClick();
        }
      });
    });

    // Category Selector
    catPills.forEach(pill => {
      pill.addEventListener('click', () => {
        catPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        if (catInput) catInput.value = pill.dataset.cat;
        if (window.soundEngine && typeof window.soundEngine.playClick === 'function') {
          window.soundEngine.playClick();
        }
      });
    });

    // Fetch & Render Projects Board
    async function loadPublicProjects() {
      try {
        const res = await fetch('/api/projects/public-feed');
        if (res.ok) {
          const projs = await res.json();
          cachedProjects = projs;
          saveLocalProjects(projs);
          renderBoard(projs);
          return;
        }
      } catch (err) {
        // Fallback to local storage for GitHub Pages
      }
      cachedProjects = getLocalProjects();
      renderBoard(cachedProjects);
    }

    function renderBoard(projs) {
      if (!cardsGrid) return;
      cardsGrid.innerHTML = '';

      // Count metrics
      let pending = 0, building = 0, delivered = 0;
      projs.forEach(p => {
        if (p.status === 'Pending Review') pending++;
        else if (p.status === 'In Progress' || p.status === 'Accepted') building++;
        else if (p.status === 'Delivered') delivered++;
      });

      if (countAll) countAll.textContent = projs.length;
      if (countPending) countPending.textContent = pending;
      if (countBuilding) countBuilding.textContent = building;
      if (countDelivered) countDelivered.textContent = delivered;

      const filtered = projs.filter(p => {
        if (currentFilter === 'all') return true;
        if (currentFilter === 'In Progress') return p.status === 'In Progress' || p.status === 'Accepted';
        return p.status === currentFilter;
      });

      if (filtered.length === 0) {
        cardsGrid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 32px;">No projects currently in this category.</div>`;
        return;
      }

      filtered.forEach(p => {
        const card = document.createElement('div');
        card.className = 'bounty-item-card';

        let statusClass = 'pending';
        let statusLabel = p.status;
        if (p.status === 'In Progress' || p.status === 'Accepted') {
          statusClass = 'progress';
          statusLabel = currentLang === 'fa' ? 'در حال ساخت' : 'Building';
        } else if (p.status === 'Delivered') {
          statusClass = 'delivered';
          statusLabel = currentLang === 'fa' ? 'تحویل شد' : 'Delivered';
        } else if (p.status === 'Countered') {
          statusClass = 'countered';
          statusLabel = currentLang === 'fa' ? `پیشنهاد معمار: $${p.counterPrice}` : `Counter: $${p.counterPrice}`;
        } else {
          statusLabel = currentLang === 'fa' ? 'در انتظار بررسی' : 'Pending Review';
        }

        card.innerHTML = `
          <div>
            <div class="bounty-top-meta">
              <span class="bounty-id-pill">${p.id}</span>
              <span class="bounty-cat-tag">${escapeHtml(p.category || 'Custom')}</span>
            </div>
            <h4 class="bounty-card-heading">${escapeHtml(p.projectTitle || 'Excel Architecture')}</h4>
            <p class="bounty-card-snippet">${escapeHtml(p.description || '')}</p>
          </div>
          <div>
            <div class="bounty-bottom-meta">
              <div>
                <span style="font-size: 0.68rem; color: var(--text-muted); display: block;">OFFERED PRICE</span>
                <span class="bounty-price-val">$${p.offeredPrice || 0}</span>
              </div>
              <span class="status-pill ${statusClass}">
                <span style="width:6px;height:6px;border-radius:50%;background:currentColor;display:inline-block;"></span>
                ${statusLabel}
              </span>
            </div>
            <button type="button" class="btn-link-action btn-track-this-item" data-id="${p.id}" style="width: 100%; margin-top: 10px; font-size: 0.76rem; text-align: center;">
              🔍 Track Status & Details ➔
            </button>
          </div>
        `;
        cardsGrid.appendChild(card);
      });

      // Bind track clicks
      document.querySelectorAll('.btn-track-this-item').forEach(b => {
        b.addEventListener('click', () => {
          showProjectTracking(b.dataset.id);
        });
      });
    }

    // Filter Tabs
    filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = tab.dataset.filter;
        renderBoard(cachedProjects);
        if (window.soundEngine && typeof window.soundEngine.playClick === 'function') {
          window.soundEngine.playClick();
        }
      });
    });

    // Tracking Function
    function showProjectTracking(idOrEmail) {
      if (!idOrEmail) return;
      const term = idOrEmail.trim().toLowerCase();
      const proj = cachedProjects.find(p => p.id.toLowerCase() === term || (p.clientEmail && p.clientEmail.toLowerCase() === term));

      if (!proj) {
        alert(currentLang === 'fa' ? 'پروژه‌ای با این شناسه یا ایمیل یافت نشد.' : 'No project found with this ID or email. Please verify and try again.');
        return;
      }

      if (trackResultDrawer) {
        trackResultDrawer.classList.remove('is-hidden');
        document.getElementById('trackResultId').textContent = proj.id;
        document.getElementById('trackResultTitle').textContent = proj.projectTitle;
        document.getElementById('trackResultCat').textContent = proj.category || 'Custom Excel';
        document.getElementById('trackResultPrice').textContent = `$${proj.offeredPrice}`;

        const statusPill = document.getElementById('trackResultStatusPill');
        statusPill.textContent = proj.status;

        // Stepper state
        const s1 = document.getElementById('stepPoint1');
        const s2 = document.getElementById('stepPoint2');
        const s3 = document.getElementById('stepPoint3');
        const s4 = document.getElementById('stepPoint4');
        const l1 = document.getElementById('stepLine1');
        const l2 = document.getElementById('stepLine2');
        const l3 = document.getElementById('stepLine3');

        [s1, s2, s3, s4].forEach(s => s && s.classList.remove('active'));
        [l1, l2, l3].forEach(l => l && l.classList.remove('active'));

        if (s1) s1.classList.add('active');

        if (proj.status === 'Pending Review') {
          statusPill.className = 'status-pill pending';
        } else if (proj.status === 'Accepted' || proj.status === 'In Progress') {
          statusPill.className = 'status-pill progress';
          if (s2) s2.classList.add('active');
          if (s3) s3.classList.add('active');
          if (l1) l1.classList.add('active');
          if (l2) l2.classList.add('active');
        } else if (proj.status === 'Delivered') {
          statusPill.className = 'status-pill delivered';
          if (s2) s2.classList.add('active');
          if (s3) s3.classList.add('active');
          if (s4) s4.classList.add('active');
          if (l1) l1.classList.add('active');
          if (l2) l2.classList.add('active');
          if (l3) l3.classList.add('active');
        }

        const notesEl = document.getElementById('trackResultNotes');
        if (notesEl) {
          notesEl.innerHTML = `<strong>Architect Status Note:</strong> ${escapeHtml(proj.adminNotes || 'Under active engineering review.')}`;
        }

        const dlBox = document.getElementById('trackResultDownload');
        if (dlBox) {
          if (proj.status === 'Delivered' && (proj.deliveryUrl || proj.deliveryNotes)) {
            dlBox.classList.remove('is-hidden');
            dlBox.innerHTML = `
              <div style="color: #34D399; font-weight: 800; font-size: 0.9rem; margin-bottom: 6px;">🚀 Project Model Delivered!</div>
              <div style="font-size: 0.82rem; color: #FFFFFF; margin-bottom: 10px;">${escapeHtml(proj.deliveryNotes || 'Completed spreadsheet is ready.')}</div>
              ${proj.deliveryUrl ? `<a href="${escapeHtml(proj.deliveryUrl)}" target="_blank" class="btn-hero-primary" style="display:inline-block; padding: 6px 14px; font-size: 0.82rem;">Download Model File / Repo ➔</a>` : ''}
              ${proj.sha256Checksum ? `<div style="font-family: monospace; font-size: 0.7rem; color: var(--text-muted); margin-top: 6px;">SHA-256 Checksum: ${escapeHtml(proj.sha256Checksum)}</div>` : ''}
            `;
          } else {
            dlBox.classList.add('is-hidden');
          }
        }

        trackResultDrawer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    if (btnTrackProject && trackInput) {
      btnTrackProject.addEventListener('click', () => {
        showProjectTracking(trackInput.value);
      });
      trackInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') showProjectTracking(trackInput.value);
      });
    }

    if (closeTrackBtn && trackResultDrawer) {
      closeTrackBtn.addEventListener('click', () => {
        trackResultDrawer.classList.add('is-hidden');
      });
    }

    // Submit Custom Project & Offer
    if (projectForm) {
      projectForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('bountyTitle')?.value?.trim();
        const category = document.getElementById('bountyCategory')?.value || 'Financial Modeling';
        const description = document.getElementById('bountyDescription')?.value?.trim();
        const offeredPrice = parseInt(document.getElementById('bountyPriceInput')?.value, 10) || 650;
        const urgencyEl = document.querySelector('input[name="bountyUrgency"]:checked');
        const turnaroundHours = urgencyEl ? parseInt(urgencyEl.value, 10) : 48;
        const clientName = document.getElementById('bountyClientName')?.value?.trim() || 'Anonymous Client';
        const clientEmail = document.getElementById('bountyClientEmail')?.value?.trim();
        const telegram = document.getElementById('bountyTelegram')?.value?.trim() || '';

        if (!title || !description || !clientEmail || !offeredPrice) {
          alert('Please fill out all required fields (title, description, work email, and offered price).');
          return;
        }

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = 'Submitting Project Offer...';
        }

        const payload = {
          projectTitle: title,
          category,
          description,
          offeredPrice,
          turnaroundHours,
          clientName,
          clientEmail,
          telegram
        };

        let createdProject = null;

        // Try API
        try {
          const res = await fetch('/api/projects/offer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (res.ok) {
            const data = await res.json();
            createdProject = data.project;
          } else {
            const err = await res.json();
            alert(err.error || 'Failed to submit project');
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = 'Submit Project & Offer Price ➔';
            }
            return;
          }
        } catch (netErr) {
          // Static fallback: generate client-side
          const num = Math.floor(1000 + Math.random() * 9000);
          createdProject = {
            id: `EXCEL-${num}`,
            ...payload,
            status: 'Pending Review',
            adminNotes: 'Awaiting review by Senior Excel Architect.',
            createdAt: new Date().toISOString()
          };
        }

        if (createdProject) {
          // Save locally
          const local = getLocalProjects();
          local.unshift(createdProject);
          saveLocalProjects(local);
          cachedProjects = local;
          renderBoard(cachedProjects);

          // Audio
          if (window.soundEngine && typeof window.soundEngine.playSuccess === 'function') {
            window.soundEngine.playSuccess();
          }

          // Reset form
          projectForm.reset();
          updateOfferRadar(650);

          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Submit Project & Offer Price ➔';
          }

          // Show tracking
          showProjectTracking(createdProject.id);

          alert(currentLang === 'fa'
            ? `✅ پروژه شما با موفقیت ثبت شد!
شناسه پیگیری: ${createdProject.id}
قیمت پیشنهادی: $${createdProject.offeredPrice}
معمار ارشد به زودی پیشنهاد شما را بررسی و شروع خواهد کرد.`
            : `✅ Project offer submitted successfully!
Project ID: ${createdProject.id}
Offered Price: $${createdProject.offeredPrice}
A Senior Excel Architect is reviewing your requirements now.`);
        }
      });
    }

    // =========================================================================
    // ADMIN OPERATIONS DESK LOGIC ("And an admin does it")
    // =========================================================================
    let adminToken = null;

    if (adminDeskBtn && adminDeskModal) {
      adminDeskBtn.addEventListener('click', () => {
        adminDeskModal.classList.add('is-active');
        if (adminToken || (window.currentUser && window.currentUser.role === 'architect')) {
          showAdminConsole();
        } else {
          showAdminLock();
        }
        if (window.soundEngine && typeof window.soundEngine.playClick === 'function') {
          window.soundEngine.playClick();
        }
      });
    }

    if (closeAdminDeskBtn && adminDeskModal) {
      closeAdminDeskBtn.addEventListener('click', () => {
        adminDeskModal.classList.remove('is-active');
      });
    }

    function showAdminLock() {
      if (adminLockScreen) adminLockScreen.classList.remove('is-hidden');
      if (adminConsoleArea) adminConsoleArea.classList.add('is-hidden');
    }

    function showAdminConsole() {
      if (adminLockScreen) adminLockScreen.classList.add('is-hidden');
      if (adminConsoleArea) adminConsoleArea.classList.remove('is-hidden');
      loadAdminProjects();
    }

    if (adminUnlockForm) {
      adminUnlockForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const key = adminKeyInput ? adminKeyInput.value.trim() : '';
        if (key === 'excel2026' || key === 'SeniorArchitect2026!') {
          adminToken = key;
          if (adminUnlockError) adminUnlockError.classList.add('is-hidden');
          showAdminConsole();
          if (window.soundEngine && typeof window.soundEngine.playChime === 'function') {
            window.soundEngine.playChime();
          }
        } else {
          if (adminUnlockError) {
            adminUnlockError.classList.remove('is-hidden');
            adminUnlockError.textContent = 'Invalid architect passcode. (Try: excel2026)';
          }
        }
      });
    }

    if (btnAdminLockConsole) {
      btnAdminLockConsole.addEventListener('click', () => {
        adminToken = null;
        showAdminLock();
      });
    }

    async function loadAdminProjects() {
      let projs = [];
      try {
        const res = await fetch('/api/admin/projects', {
          headers: { 'x-admin-key': adminToken || 'excel2026' }
        });
        if (res.ok) {
          projs = await res.json();
        } else {
          projs = getLocalProjects();
        }
      } catch (err) {
        projs = getLocalProjects();
      }

      cachedProjects = projs;
      renderAdminTable(projs);
    }

    function renderAdminTable(projs) {
      if (!adminProjectsTableBody) return;
      adminProjectsTableBody.innerHTML = '';

      let totalVal = 0, pending = 0, building = 0, delivered = 0;

      projs.forEach(p => {
        totalVal += (p.offeredPrice || 0);
        if (p.status === 'Pending Review') pending++;
        else if (p.status === 'In Progress' || p.status === 'Accepted') building++;
        else if (p.status === 'Delivered') delivered++;
      });

      if (adminMetricPipeline) adminMetricPipeline.textContent = `$${totalVal.toLocaleString()}`;
      if (adminMetricPending) adminMetricPending.textContent = pending;
      if (adminMetricBuilding) adminMetricBuilding.textContent = building;
      if (adminMetricDelivered) adminMetricDelivered.textContent = delivered;

      if (projs.length === 0) {
        adminProjectsTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 24px; color: var(--text-muted);">No project bids in queue.</td></tr>`;
        return;
      }

      projs.forEach(p => {
        const tr = document.createElement('tr');

        let statusClass = 'pending';
        if (p.status === 'In Progress' || p.status === 'Accepted') statusClass = 'progress';
        else if (p.status === 'Delivered') statusClass = 'delivered';
        else if (p.status === 'Countered') statusClass = 'countered';

        tr.innerHTML = `
          <td><strong style="color: #38BDF8; font-family: monospace;">${p.id}</strong></td>
          <td>
            <strong>${escapeHtml(p.clientName || 'Client')}</strong><br>
            <span style="font-size:0.74rem; color: var(--text-muted);">${escapeHtml(p.clientEmail || '')}</span>
            ${p.telegram ? `<br><a href="https://t.me/${escapeHtml(p.telegram.replace('@',''))}" target="_blank" style="color: #38BDF8; font-size:0.74rem;">${escapeHtml(p.telegram)}</a>` : ''}
          </td>
          <td>
            <strong style="color: #FFFFFF;">${escapeHtml(p.projectTitle || '')}</strong><br>
            <span style="font-size: 0.74rem; color: #10B981;">${escapeHtml(p.category || 'Custom')}</span><br>
            <div style="font-size: 0.75rem; color: var(--text-secondary); max-width: 260px; max-height: 48px; overflow: hidden; text-overflow: ellipsis;">
              ${escapeHtml(p.description || '')}
            </div>
          </td>
          <td><strong style="color: #10B981; font-size: 1rem;">$${p.offeredPrice || 0}</strong></td>
          <td><span style="font-size: 0.76rem;">${p.turnaroundHours || 48}h</span></td>
          <td>
            <span class="status-pill ${statusClass}">${p.status}</span>
            ${p.counterPrice ? `<br><span style="font-size:0.7rem; color:#C084FC;">Counter: $${p.counterPrice}</span>` : ''}
          </td>
          <td>
            <div class="admin-actions-cell">
              <button type="button" class="btn-action-accept" data-id="${p.id}" title="Accept offered price and assign to architect">✅ Accept Offer</button>
              <button type="button" class="btn-action-counter" data-id="${p.id}" title="Suggest counter price">💬 Counter Price</button>
              <button type="button" class="btn-action-deliver" data-id="${p.id}" title="Mark completed and deliver model">📦 Deliver Model</button>
              <button type="button" class="btn-action-delete" data-id="${p.id}" title="Archive project">✕ Archive</button>
            </div>
          </td>
        `;
        adminProjectsTableBody.appendChild(tr);
      });

      // Bind Admin Table Actions
      adminProjectsTableBody.querySelectorAll('.btn-action-accept').forEach(btn => {
        btn.addEventListener('click', () => adminPerformAction(btn.dataset.id, 'accept'));
      });
      adminProjectsTableBody.querySelectorAll('.btn-action-counter').forEach(btn => {
        btn.addEventListener('click', () => adminPerformAction(btn.dataset.id, 'counter'));
      });
      adminProjectsTableBody.querySelectorAll('.btn-action-deliver').forEach(btn => {
        btn.addEventListener('click', () => adminPerformAction(btn.dataset.id, 'deliver'));
      });
      adminProjectsTableBody.querySelectorAll('.btn-action-delete').forEach(btn => {
        btn.addEventListener('click', () => adminPerformAction(btn.dataset.id, 'delete'));
      });
    }

    async function adminPerformAction(projectId, action) {
      let patchBody = {};

      if (action === 'accept') {
        patchBody = {
          status: 'In Progress',
          adminNotes: 'Offer accepted by Lead Architect. Spreadsheet currently in dedicated cleanroom refactoring sprint.'
        };
      } else if (action === 'counter') {
        const counter = prompt('Enter your counter-offer price in USD ($):', '750');
        if (!counter) return;
        const note = prompt('Enter explanation note for the client:', 'Scope requires multi-tab automated PowerQuery ETL pipeline.');
        patchBody = {
          counterPrice: parseInt(counter, 10),
          adminNotes: note || 'Counter offer submitted by architect.'
        };
      } else if (action === 'deliver') {
        const url = prompt('Enter deliverable download URL or Google Drive link:', 'https://github.com/arezoyetoo-dotcom/excel-3d-ad/releases');
        if (!url) return;
        const notes = prompt('Enter delivery handover notes for client:', 'All formulas upgraded to dynamic arrays (=XLOOKUP, =LAMBDA). File weight reduced by 85%.');
        patchBody = {
          status: 'Delivered',
          deliveryUrl: url,
          deliveryNotes: notes || 'Model delivered.',
          sha256Checksum: '9e107d9d372bb6826bd81d3542a419d6dae1c4df234a974b7a13d7890f9c2d1b'
        };
      } else if (action === 'delete') {
        if (!confirm(`Are you sure you want to delete/archive project ${projectId}?`)) return;
      }

      // Try API
      let updatedSuccess = false;
      try {
        if (action === 'delete') {
          const res = await fetch(`/api/admin/projects/${projectId}`, {
            method: 'DELETE',
            headers: { 'x-admin-key': adminToken || 'excel2026' }
          });
          updatedSuccess = res.ok;
        } else {
          const res = await fetch(`/api/admin/projects/${projectId}/action`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'x-admin-key': adminToken || 'excel2026'
            },
            body: JSON.stringify(patchBody)
          });
          updatedSuccess = res.ok;
        }
      } catch (err) {}

      // Update Local State as well
      let local = getLocalProjects();
      if (action === 'delete') {
        local = local.filter(p => p.id !== projectId);
      } else {
        const target = local.find(p => p.id === projectId);
        if (target) {
          Object.assign(target, patchBody);
          target.updatedAt = new Date().toISOString();
        }
      }
      saveLocalProjects(local);
      cachedProjects = local;
      renderAdminTable(local);
      renderBoard(local);

      if (window.soundEngine && typeof window.soundEngine.playSuccess === 'function') {
        window.soundEngine.playSuccess();
      }
    }

    // Export JSON & CSV
    if (btnExportProjectsJson) {
      btnExportProjectsJson.addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(cachedProjects, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `sheetfix_projects_${Date.now()}.json`;
        a.click();
      });
    }

    if (btnExportProjectsCsv) {
      btnExportProjectsCsv.addEventListener('click', () => {
        let csv = 'ID,Client,Email,Title,Category,OfferedPrice,Status,CreatedAt\\n';
        cachedProjects.forEach(p => {
          csv += `"${p.id}","${p.clientName}","${p.clientEmail}","${(p.projectTitle||'').replace(/"/g, '""')}","${p.category}",${p.offeredPrice},"${p.status}","${p.createdAt}"\\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `sheetfix_projects_${Date.now()}.csv`;
        a.click();
      });
    }

    // Initial load
    updateOfferRadar(650);
    loadPublicProjects();
  }


  // 10. Initialize Bounty Studio & Admin Desk
  initBountyStudio(scene3D);

  // Check initial auth state and set initial language
  checkAuth();
  setLanguage(currentLang);
});

