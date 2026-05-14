// Population health analysis: cohort-wide polypharmacy risk. v0 aggregates
// patient prescriptions and returns a risk distribution.
const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { queryOpenRouter } = require('../middleware/openrouter');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

// GET /api/population-health/polypharmacy?min_drugs=5
router.get('/polypharmacy', auth, aiRateLimiter, async (req, res) => {
  try {
    const min = Math.max(parseInt(req.query.min_drugs) || 5, 2);
    // Group prescriptions by patient
    const r = await pool.query(
      `SELECT p.id AS patient_id, p.age, COUNT(DISTINCT pr.drug_id) AS drug_count,
              array_agg(DISTINCT d.name) AS drug_names
       FROM patients p
       LEFT JOIN prescriptions pr ON pr.patient_id = p.id
       LEFT JOIN drugs d ON d.id = pr.drug_id
       GROUP BY p.id, p.age
       HAVING COUNT(DISTINCT pr.drug_id) >= $1
       ORDER BY drug_count DESC
       LIMIT 200`,
      [min]
    );

    const cohort = r.rows;
    const summary = {
      total_patients: cohort.length,
      avg_drug_count: cohort.length ? cohort.reduce((a, x) => a + Number(x.drug_count), 0) / cohort.length : 0,
      high_risk: cohort.filter(x => Number(x.drug_count) >= 8).length,
      elderly_polypharmacy: cohort.filter(x => Number(x.age) >= 65).length,
    };
    return res.json({ threshold: min, summary, sample: cohort.slice(0, 25) });
  } catch (e) {
    console.error('population polypharmacy error:', e);
    return res.status(500).json({ error: 'analysis failed', detail: e.message });
  }
});

// POST /api/population-health/risk-narrative { cohort_summary }
router.post('/risk-narrative', auth, aiRateLimiter, async (req, res) => {
  try {
    const { cohort_summary } = req.body || {};
    if (!cohort_summary) return res.status(400).json({ error: 'cohort_summary required' });
    const system = 'You are a population health pharmacist. Given a cohort summary, produce a brief risk narrative with top 3 interventions.';
    try {
      const out = await queryOpenRouter(JSON.stringify(cohort_summary), system);
      return res.json({ narrative: out });
    } catch (e) {
      return res.status(503).json({ error: 'LLM unavailable' });
    }
  } catch (e) {
    console.error('risk-narrative error:', e);
    return res.status(500).json({ error: 'narrative failed' });
  }
});

module.exports = router;
