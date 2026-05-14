// Insurance formulary check: returns coverage tier + PA (prior auth) info
// alongside interaction data. v0 hits an upstream formulary API if configured;
// otherwise looks up a local formulary table.
const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

// GET /api/formulary-check?drug_id=...&plan_id=...
router.get('/', auth, aiRateLimiter, async (req, res) => {
  try {
    const { drug_id, plan_id } = req.query || {};
    if (!drug_id) return res.status(400).json({ error: 'drug_id required' });

    let local = null;
    try {
      const r = await pool.query(
        `SELECT * FROM formulary WHERE drug_id = $1 ${plan_id ? 'AND plan_id = $2' : ''} LIMIT 1`,
        plan_id ? [drug_id, plan_id] : [drug_id]
      );
      local = r.rows[0] || null;
    } catch {}

    // TODO: configure credentials — FORMULARY_API_KEY
    const key = process.env.FORMULARY_API_KEY;
    let upstream = null;
    if (key && plan_id) {
      try {
        const r = await fetch(`https://api.formulary.example/v1/coverage?drug_id=${drug_id}&plan_id=${plan_id}`, {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (r.ok) upstream = await r.json();
      } catch (e) {
        // ignore upstream errors
      }
    }

    const coverage = upstream || local || { covered: false, tier: null, prior_auth_required: null };
    return res.json({ drug_id, plan_id: plan_id || null, coverage });
  } catch (e) {
    console.error('formulary error:', e);
    return res.status(500).json({ error: 'formulary check failed' });
  }
});

module.exports = router;
