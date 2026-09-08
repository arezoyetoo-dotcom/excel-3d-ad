/**
 * GridCraft 3D - Interactive Spreadsheet Waste & ROI Calculator
 * Computes live operational cost bleed from spreadsheet disorganization.
 */

class SpreadsheetRoiCalculator {
  constructor() {
    this.teamSlider = document.getElementById('calcTeamSize');
    this.hoursSlider = document.getElementById('calcHoursWasted');
    this.rateSlider = document.getElementById('calcHourlyRate');

    this.teamValEl = document.getElementById('calcTeamSizeVal');
    this.hoursValEl = document.getElementById('calcHoursWastedVal');
    this.rateValEl = document.getElementById('calcHourlyRateVal');

    this.annualWasteEl = document.getElementById('calcAnnualWaste');
    this.hoursSavedEl = document.getElementById('calcHoursSaved');
    this.netSavingsEl = document.getElementById('calcNetSavings');
    this.paybackDaysEl = document.getElementById('calcPaybackDays');

    if (this.teamSlider && this.hoursSlider && this.rateSlider) {
      this.init();
    }
  }

  init() {
    const update = () => this.calculate();

    this.teamSlider.addEventListener('input', update);
    this.hoursSlider.addEventListener('input', update);
    this.rateSlider.addEventListener('input', update);

    this.calculate();
  }

  calculate() {
    const team = parseInt(this.teamSlider.value, 10) || 6;
    const hours = parseInt(this.hoursSlider.value, 10) || 7;
    const rate = parseInt(this.rateSlider.value, 10) || 75;

    // Update Slider Value Badges
    if (this.teamValEl) this.teamValEl.textContent = `${team} analysts / operators`;
    if (this.hoursValEl) this.hoursValEl.textContent = `${hours} hrs / week per person`;
    if (this.rateValEl) this.rateValEl.textContent = `$${rate} / hr fully-loaded`;

    // Metrics
    const weeklyHoursTotal = team * hours;
    const annualHoursTotal = weeklyHoursTotal * 50; // 50 working weeks
    const annualCostBleed = annualHoursTotal * rate;

    // GridCraft eliminates ~85% of manual cleaning & formula debugging
    const reclaimedHoursAnnual = Math.round(annualHoursTotal * 0.85);
    const reclaimedDollarsAnnual = Math.round(annualCostBleed * 0.85);

    // Assume average GridCraft engagement fee of $3,500
    const engagementCost = 3500;
    const dailySavings = reclaimedDollarsAnnual / 250; // 250 work days
    const paybackDays = Math.max(2, Math.round(engagementCost / (dailySavings || 1)));

    // Animate Number Outputs
    this.animateNumber(this.annualWasteEl, annualCostBleed, '$');
    this.animateNumber(this.hoursSavedEl, reclaimedHoursAnnual, '', ' hrs');
    this.animateNumber(this.netSavingsEl, reclaimedDollarsAnnual, '$');
    if (this.paybackDaysEl) this.paybackDaysEl.textContent = `${paybackDays} business days`;
  }

  animateNumber(element, target, prefix = '', suffix = '') {
    if (!element) return;
    const formatted = prefix + target.toLocaleString('en-US') + suffix;
    element.textContent = formatted;
  }
}

window.SpreadsheetRoiCalculator = SpreadsheetRoiCalculator;
