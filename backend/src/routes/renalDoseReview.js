const express = require('express');

const router = express.Router();

router.get('/', (_req, res) => {
  res.json({
    feature: 'Renal Dose Review',
    summary: { activeReviews: 24, doseAdjustments: 8, contraindicated: 3, labsStale: 5 },
    rules: [
      { medication: 'Metformin', threshold: 'eGFR < 30', recommendation: 'Contraindicated; hold and notify prescriber' },
      { medication: 'Gabapentin', threshold: 'CrCl 30-59', recommendation: 'Reduce daily dose and monitor sedation' },
      { medication: 'Apixaban', threshold: 'SCr >= 1.5 with age/weight criteria', recommendation: 'Verify dose reduction criteria' },
      { medication: 'Nitrofurantoin', threshold: 'CrCl < 30', recommendation: 'Avoid; recommend alternative antibiotic' }
    ],
    patients: [
      { patient: 'M. Chen', egfr: 28, medication: 'Metformin', risk: 'contraindicated', action: 'Hold recommendation and prescriber callback' },
      { patient: 'R. Alvarez', egfr: 42, medication: 'Gabapentin', risk: 'adjust dose', action: 'Convert to renal-adjusted regimen' },
      { patient: 'T. Morgan', egfr: 61, medication: 'Apixaban', risk: 'verify', action: 'Check weight and serum creatinine trend' }
    ]
  });
});

module.exports = router;
