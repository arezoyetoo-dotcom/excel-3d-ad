/**
 * SheetFix 3D - Streamlined Application Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize 3D Scene
  let scene3D = null;
  if (typeof SimpleSpreadsheet3D === 'function') {
    scene3D = new SimpleSpreadsheet3D('simple3dCanvas');
  }

  // 2. 3D Mode Toggle (Chaos vs Clean)
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

  // 3. Sound Toggle
  const soundBtn = document.getElementById('soundToggle');
  if (soundBtn && window.soundEngine) {
    const renderSoundLabel = () => {
      soundBtn.textContent = window.soundEngine.isMuted ? '🔇 Sound: OFF' : '🔊 Sound: ON';
    };
    renderSoundLabel();

    soundBtn.addEventListener('click', () => {
      window.soundEngine.toggleMute();
      renderSoundLabel();
    });
  }

  // 4. Modal Open & Close
  const modal = document.getElementById('bookingModal');
  const closeBtn = document.getElementById('closeModalBtn');
  const openBtns = document.querySelectorAll('.open-modal-btn');
  const form = document.getElementById('simpleBookingForm');
  const successBox = document.getElementById('modalSuccessMsg');

  openBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const plan = btn.dataset.plan;
      const notesInput = document.getElementById('sheetNotes');
      if (notesInput && plan) {
        notesInput.value = `Selected Package: ${plan}. `;
      }
      if (modal) {
        modal.classList.add('open');
        if (window.soundEngine) window.soundEngine.playClick();
      }
    });
  });

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('open');
      if (window.soundEngine) window.soundEngine.playClick();
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('open');
      }
    });
  }

  // 5. Form Submit
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (window.soundEngine) window.soundEngine.playSuccess();
      form.style.display = 'none';
      if (successBox) successBox.style.display = 'flex';
    });
  }

  // 6. Smooth Scroll
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const el = document.querySelector(targetId);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth' });
        if (window.soundEngine) window.soundEngine.playClick();
      }
    });
  });
});
