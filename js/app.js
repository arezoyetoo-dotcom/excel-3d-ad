/**
 * SheetFix 3D - Application Controller
 * Bilingual (EN / FA), 3D Canvas integration, Interactive Pricing Calculator, and Formula Clinic.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Language State
  let currentLang = localStorage.getItem('sheetfix_lang') || (window.location.pathname.endsWith('fa.html') ? 'fa' : 'en');

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

    // Update HTML nodes (for formatting like <code> or <br>)
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.dataset.i18nHtml;
      if (dict[key] !== undefined) {
        el.innerHTML = dict[key];
      }
    });

    // Update input placeholders
    const nameInput = document.getElementById('clientName');
    const emailInput = document.getElementById('clientEmail');
    const notesInput = document.getElementById('sheetNotes');

    if (nameInput && dict.modalNamePlaceholder) nameInput.placeholder = dict.modalNamePlaceholder;
    if (emailInput && dict.modalEmailPlaceholder) emailInput.placeholder = dict.modalEmailPlaceholder;
    if (notesInput && dict.modalNotesPlaceholder) notesInput.placeholder = dict.modalNotesPlaceholder;

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

    // Update data-plan attributes on interactive buttons
    document.querySelectorAll('[data-plan]').forEach(btn => {
      if (lang === 'fa' && btn.dataset.planFa) {
        btn.dataset.plan = btn.dataset.planFa;
      } else if (lang === 'en' && btn.dataset.planEn) {
        btn.dataset.plan = btn.dataset.planEn;
      }
    });

    // Refresh Calculator
    updateCalculator(calcSlider ? calcSlider.value : 1);
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

  // 2. Initialize 3D Scene
  let scene3D = null;
  if (typeof SimpleSpreadsheet3D === 'function') {
    scene3D = new SimpleSpreadsheet3D('simple3dCanvas');
  }

  // 3. 3D Mode Toggle (Chaos vs Clean)
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

  // 4. Sound Toggle
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

  // 5. Modal Open & Close
  const modal = document.getElementById('bookingModal');
  const closeBtn = document.getElementById('closeModalBtn');
  const form = document.getElementById('simpleBookingForm');
  const successBox = document.getElementById('modalSuccessMsg');

  function wireModalTriggers() {
    document.querySelectorAll('.open-modal-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const plan = btn.dataset.plan;
        const notesInput = document.getElementById('sheetNotes');
        if (notesInput && plan) {
          notesInput.value = (currentLang === 'fa' ? `بسته انتخابی: ${plan}. ` : `Selected Package: ${plan}. `);
        }
        if (modal) {
          modal.classList.add('open');
          if (window.soundEngine && typeof window.soundEngine.playClick === 'function') {
            window.soundEngine.playClick();
          }
        }
      };
    });
  }
  wireModalTriggers();

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('open');
      if (window.soundEngine && typeof window.soundEngine.playClick === 'function') {
        window.soundEngine.playClick();
      }
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('open');
      }
    });
  }

  // 6. Form Submit with Defensive Input Sanitization & Validation
  function sanitizeInput(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .trim();
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const nameInput = document.getElementById('clientName');
      const emailInput = document.getElementById('clientEmail');
      const notesInput = document.getElementById('sheetNotes');

      const name = sanitizeInput(nameInput ? nameInput.value : '');
      const email = sanitizeInput(emailInput ? emailInput.value : '');
      const notes = sanitizeInput(notesInput ? notesInput.value : '');

      // Strict validation checks
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!name || name.length > 80 || !email || !emailRegex.test(email) || !notes || notes.length > 1000) {
        alert(currentLang === 'fa' ? 'لطفاً اطلاعات فرم را به درستی وارد نمایید.' : 'Please provide valid information.');
        return;
      }

      if (window.soundEngine && typeof window.soundEngine.playSuccess === 'function') {
        window.soundEngine.playSuccess();
      }
      form.style.display = 'none';
      if (successBox) {
        successBox.classList.remove('is-hidden');
        successBox.style.display = 'flex';
      }
    });
  }

  // 7. Interactive Micro-Pricing & ROI Calculator
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

    // Micro-pricing computation
    let costText = '';
    let costVal = 0;
    if (currentLang === 'fa') {
      let unitPrice = 75000;
      if (files >= 15) unitPrice = 50000;
      else if (files >= 5) unitPrice = 60000;
      costVal = files * unitPrice;
      costText = `${costVal.toLocaleString('fa-IR')} تومان`;
    } else {
      let unitPrice = 0.50;
      if (files >= 15) unitPrice = 0.3333;
      else if (files >= 5) unitPrice = 0.40;
      costVal = (files * unitPrice).toFixed(2);
      costText = `$${costVal}`;
    }

    if (calcCostDisplay) calcCostDisplay.textContent = costText;

    const hoursSaved = (files * 3.8).toFixed(1);
    const formulasFixed = files * 18;

    if (calcHoursDisplay) {
      calcHoursDisplay.textContent = currentLang === 'fa' ? `${Number(hoursSaved).toLocaleString('fa-IR')} ساعت` : `${hoursSaved} hrs`;
    }
    if (calcFormulasDisplay) {
      calcFormulasDisplay.textContent = currentLang === 'fa' ? `${Number(formulasFixed).toLocaleString('fa-IR')}+` : `${formulasFixed}+`;
    }

    if (calcCtaBtn) {
      const planName = currentLang === 'fa'
        ? `سفارش محاسبه‌شده (${files} فایل - ${costText})`
        : `Calculated Order (${files} Files - ${costText})`;
      calcCtaBtn.dataset.plan = planName;
      calcCtaBtn.dataset.planEn = `Calculated Order (${files} Files - $${costVal})`;
      calcCtaBtn.dataset.planFa = `سفارش محاسبه‌شده (${files} فایل - ${costText})`;
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

  // 8. Interactive Formula Clinic Tab Switcher
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

  // 9. Smooth Scroll
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

  // Apply initial language
  setLanguage(currentLang);
});
