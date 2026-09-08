/**
 * GridCraft 3D - Master Controller & Application Orchestrator
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize 3D WebGL Monolith Scene
  let scene3D = null;
  if (typeof Spreadsheet3DScene === 'function') {
    scene3D = new Spreadsheet3DScene('hero3dCanvasContainer');
  }

  // 2. 3D Controls Hookup
  // State Buttons (Chaos vs Pristine)
  const stateChaosBtn = document.getElementById('btnStateChaos');
  const statePristineBtn = document.getElementById('btnStatePristine');

  if (stateChaosBtn && statePristineBtn && scene3D) {
    stateChaosBtn.addEventListener('click', () => {
      stateChaosBtn.classList.add('active');
      statePristineBtn.classList.remove('active');
      scene3D.setState('chaos');
      updateStatusBadge('💥 Raw Chaotic State (#REF! Cascades)');
    });

    statePristineBtn.addEventListener('click', () => {
      statePristineBtn.classList.add('active');
      stateChaosBtn.classList.remove('active');
      scene3D.setState('pristine');
      updateStatusBadge('✨ Engineered Pristine Architecture');
    });
  }

  function updateStatusBadge(text) {
    const badge = document.getElementById('hudModeStatus');
    if (badge) badge.textContent = text;
  }

  // View Mode Buttons (Unified / Exploded / Wireframe)
  document.querySelectorAll('.btn-view-mode').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.btn-view-mode').forEach(b => b.classList.remove('active'));
      const targetBtn = e.currentTarget;
      targetBtn.classList.add('active');
      const mode = targetBtn.dataset.view;
      if (scene3D) scene3D.setViewMode(mode);
    });
  });

  // Camera Presets
  document.querySelectorAll('.btn-camera-preset').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.btn-camera-preset').forEach(b => b.classList.remove('active'));
      const targetBtn = e.currentTarget;
      targetBtn.classList.add('active');
      const preset = targetBtn.dataset.camera;
      if (scene3D) scene3D.setCameraPreset(preset);
      window.soundEngine.playClick();
    });
  });

  // Auto-Rotate Button
  const autoRotateBtn = document.getElementById('btnToggleRotate');
  if (autoRotateBtn && scene3D) {
    autoRotateBtn.addEventListener('click', () => {
      const isRotating = scene3D.toggleAutoRotate();
      autoRotateBtn.classList.toggle('active', isRotating);
      autoRotateBtn.innerHTML = isRotating ? '<span>🔄</span> Auto-Orbit: ON' : '<span>⏸️</span> Auto-Orbit: PAUSED';
      window.soundEngine.playClick();
    });
  }

  // 3. Audio Mute Toggle Button
  const audioToggleBtn = document.getElementById('btnAudioToggle');
  if (audioToggleBtn) {
    const updateAudioIcon = () => {
      audioToggleBtn.innerHTML = window.soundEngine.isMuted ? '<span>🔇</span> Audio: Muted' : '<span>🔊</span> Audio: ON';
      audioToggleBtn.classList.toggle('muted', window.soundEngine.isMuted);
    };
    updateAudioIcon();

    audioToggleBtn.addEventListener('click', () => {
      window.soundEngine.toggleMute();
      updateAudioIcon();
    });
  }

  // 4. Interactive "Before vs After" Comparison Split Slider
  const comparisonContainer = document.getElementById('comparisonContainer');
  const comparisonSlider = document.getElementById('comparisonSlider');
  const comparisonBefore = document.getElementById('comparisonBefore');

  if (comparisonContainer && comparisonSlider && comparisonBefore) {
    let isSliding = false;

    const setPosition = (clientX) => {
      const rect = comparisonContainer.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = (x / rect.width) * 100;
      comparisonSlider.style.left = `${percentage}%`;
      comparisonBefore.style.clipPath = `polygon(0 0, ${percentage}% 0, ${percentage}% 100%, 0 100%)`;
    };

    comparisonSlider.addEventListener('mousedown', () => isSliding = true);
    window.addEventListener('mouseup', () => isSliding = false);
    window.addEventListener('mousemove', (e) => {
      if (isSliding) setPosition(e.clientX);
    });

    // Touch support
    comparisonSlider.addEventListener('touchstart', () => isSliding = true);
    window.addEventListener('touchend', () => isSliding = false);
    window.addEventListener('touchmove', (e) => {
      if (isSliding && e.touches[0]) setPosition(e.touches[0].clientX);
    });
  }

  // 5. Initialize ROI Calculator & 60-Sec Diagnostic
  if (typeof SpreadsheetRoiCalculator === 'function') {
    new SpreadsheetRoiCalculator();
  }
  if (typeof SpreadsheetDiagnostic === 'function') {
    new SpreadsheetDiagnostic();
  }

  // 6. Booking & Consultation Modal Management
  const bookingModal = document.getElementById('bookingModal');
  const openModalBtns = document.querySelectorAll('.btn-open-booking');
  const closeModalBtn = document.getElementById('closeBookingModal');
  const bookingForm = document.getElementById('bookingForm');
  const bookingSuccess = document.getElementById('bookingSuccess');

  openModalBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const tier = btn.dataset.tier || '';
      const notesField = document.getElementById('bookNotes');
      if (notesField && tier) {
        notesField.value = `Interested in ${tier}. Requesting 20-min confidential sheet audit.`;
      }
      if (bookingModal) {
        bookingModal.classList.add('open');
        window.soundEngine.playClick();
      }
    });
  });

  if (closeModalBtn && bookingModal) {
    closeModalBtn.addEventListener('click', () => {
      bookingModal.classList.remove('open');
      window.soundEngine.playClick();
    });
  }

  if (bookingModal) {
    bookingModal.addEventListener('click', (e) => {
      if (e.target === bookingModal) {
        bookingModal.classList.remove('open');
      }
    });
  }

  if (bookingForm) {
    bookingForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('bookName')?.value || 'Leader';
      const company = document.getElementById('bookCompany')?.value || 'Organization';

      // Simulate instant booking registration
      window.soundEngine.playSuccess();
      if (bookingForm) bookingForm.style.display = 'none';
      if (bookingSuccess) {
        bookingSuccess.style.display = 'flex';
        const confirmText = document.getElementById('bookingConfirmSummary');
        if (confirmText) {
          confirmText.textContent = `Priority triage confirmed for ${name} at ${company}. NDA and secure upload vault link sent to your inbox.`;
        }
      }
    });
  }

  // 7. Smooth Scroll for Navbar Links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.soundEngine.playClick();
      }
    });
  });
});
