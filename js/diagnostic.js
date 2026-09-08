/**
 * GridCraft 3D - 60-Second Interactive Spreadsheet Diagnostic & Pricing Estimator
 */

class SpreadsheetDiagnostic {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 3;
    this.answers = {
      symptom: 'formulas',
      size: 'medium',
      speed: 'standard'
    };

    this.stepContainers = [
      document.getElementById('diagStep1'),
      document.getElementById('diagStep2'),
      document.getElementById('diagStep3')
    ];
    this.resultContainer = document.getElementById('diagResult');
    this.progressBar = document.getElementById('diagProgressBar');
    this.stepIndicator = document.getElementById('diagStepIndicator');

    this.init();
  }

  init() {
    // Option Card Selection
    document.querySelectorAll('.diag-option-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const optionCard = e.currentTarget;
        const step = parseInt(optionCard.dataset.step, 10);
        const val = optionCard.dataset.value;
        const key = optionCard.dataset.key;

        // Visual selection
        const siblings = optionCard.parentElement.querySelectorAll('.diag-option-card');
        siblings.forEach(s => s.classList.remove('selected'));
        optionCard.classList.add('selected');

        this.answers[key] = val;
        window.soundEngine.playClick();

        // Advance or show results
        setTimeout(() => {
          if (this.currentStep < this.totalSteps) {
            this.goToStep(this.currentStep + 1);
          } else {
            this.generateDiagnosis();
          }
        }, 220);
      });
    });

    // Reset / Restart Button
    const restartBtn = document.getElementById('diagRestartBtn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        window.soundEngine.playClick();
        this.reset();
      });
    }

    // Direct Claim / Book Button
    const claimBtn = document.getElementById('diagClaimBtn');
    if (claimBtn) {
      claimBtn.addEventListener('click', () => {
        window.soundEngine.playSuccess();
        const bookingModal = document.getElementById('bookingModal');
        if (bookingModal) {
          bookingModal.classList.add('open');
          const notesField = document.getElementById('bookNotes');
          if (notesField) {
            notesField.value = `[Generated Diagnostic Intake]\nSymptom: ${this.answers.symptom}\nWorkbook Scale: ${this.answers.size}\nRequired Turnaround: ${this.answers.speed}\nReady for 20-min triage audit.`;
          }
        }
      });
    }
  }

  goToStep(stepNum) {
    this.currentStep = stepNum;

    this.stepContainers.forEach((el, idx) => {
      if (el) el.classList.toggle('active', idx + 1 === stepNum);
    });

    if (this.resultContainer) {
      this.resultContainer.classList.remove('active');
    }

    if (this.progressBar) {
      this.progressBar.style.width = `${((stepNum - 1) / this.totalSteps) * 100}%`;
    }

    if (this.stepIndicator) {
      this.stepIndicator.textContent = `Step ${stepNum} of ${this.totalSteps}`;
    }
  }

  generateDiagnosis() {
    this.currentStep = 4;
    this.stepContainers.forEach(el => el && el.classList.remove('active'));

    if (this.progressBar) this.progressBar.style.width = '100%';
    if (this.stepIndicator) this.stepIndicator.textContent = 'Diagnosis Complete';

    // Pricing & Timeline Matrix
    let title = '';
    let recommendation = '';
    let timeline = '';
    let priceRange = '';
    let scoreBadge = '';

    if (this.answers.speed === 'urgent') {
      timeline = '24 - 48 Hours Express';
    } else if (this.answers.size === 'enterprise') {
      timeline = '10 - 14 Business Days';
    } else {
      timeline = '3 - 5 Business Days';
    }

    if (this.answers.size === 'single') {
      priceRange = '$1,400 - $1,950';
      recommendation = 'The 48-Hour Rapid Triage & Normalization Sprint';
    } else if (this.answers.size === 'enterprise') {
      priceRange = '$4,800 - $6,500';
      recommendation = 'Full-Stack Enterprise Model Re-Architecture & ETL Pipeline';
    } else {
      priceRange = '$2,800 - $3,600';
      recommendation = 'Executive Financial & KPI Dashboard Modeling';
    }

    if (this.answers.symptom === 'formulas') {
      title = 'Critical Formula Corruption & Circular Linkage Risk';
      scoreBadge = 'High Structural Fragility';
    } else if (this.answers.symptom === 'sluggish') {
      title = 'Severe Cache Bloat & Volatile Recalculation Freeze';
      scoreBadge = 'Extreme Performance Bottleneck';
    } else if (this.answers.symptom === 'manual') {
      title = 'High Human Labor Drain & Friction Vulnerability';
      scoreBadge = '85% Automatable Waste';
    } else {
      title = 'Decision Paralysis & Executive Blindspot';
      scoreBadge = 'Low Strategic Usability';
    }

    // Populate Report Elements
    const titleEl = document.getElementById('diagResultTitle');
    const badgeEl = document.getElementById('diagResultBadge');
    const recEl = document.getElementById('diagResultRec');
    const timeEl = document.getElementById('diagResultTimeline');
    const priceEl = document.getElementById('diagResultPrice');

    if (titleEl) titleEl.textContent = title;
    if (badgeEl) badgeEl.textContent = scoreBadge;
    if (recEl) recEl.textContent = recommendation;
    if (timeEl) timeEl.textContent = timeline;
    if (priceEl) priceEl.textContent = priceRange;

    if (this.resultContainer) {
      this.resultContainer.classList.add('active');
    }

    window.soundEngine.playSuccess();
  }

  reset() {
    this.answers = { symptom: 'formulas', size: 'medium', speed: 'standard' };
    document.querySelectorAll('.diag-option-card').forEach(c => c.classList.remove('selected'));
    this.goToStep(1);
  }
}

window.SpreadsheetDiagnostic = SpreadsheetDiagnostic;
