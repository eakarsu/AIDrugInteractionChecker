// Pharmacy integration APIs: sync with Surescripts / RxNorm. v0 supports a
// RxNorm lookup (public, no key) and a stub Surescripts e-Rx push.
const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

// GET /api/pharmacy-integration/rxnorm/:term — RxNorm name → rxcui
router.get('/rxnorm/:term', auth, async (req, res) => {
  try {
    const term = encodeURIComponent(req.params.term);
    const r = await fetch(`https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${term}`);
    if (!r.ok) return res.status(502).json({ error: 'RxNorm lookup failed' });
    const data = await r.json();
    const rxcui = data?.idGroup?.rxnormId?.[0] || null;
    if (rxcui) {
      try {
        await pool.query(`UPDATE drugs SET rxnorm_id = $1 WHERE lower(name) = lower($2)`, [rxcui, req.params.term]);
      } catch {}
    }
    return res.json({ term: req.params.term, rxcui, raw: data });
  } catch (e) {
    console.error('rxnorm error:', e);
    return res.status(500).json({ error: 'rxnorm failed' });
  }
});

// POST /api/pharmacy-integration/surescripts/push  { patient_id, drug_id, dose, refills }
router.post('/surescripts/push', auth, aiRateLimiter, async (req, res) => {
  try {
    const { patient_id, drug_id, dose, refills } = req.body || {};
    if (!patient_id || !drug_id) return res.status(400).json({ error: 'patient_id and drug_id required' });
    // TODO: configure credentials — SURESCRIPTS_CLIENT_ID / SURESCRIPTS_SECRET
    const sId = process.env.SURESCRIPTS_CLIENT_ID;
    const sSecret = process.env.SURESCRIPTS_SECRET;
    if (!sId || !sSecret) {
      return res.status(503).json({ error: 'Surescripts credentials not configured', dry_run: { patient_id, drug_id, dose, refills } });
    }
    // Real impl would call Surescripts endpoint here — stubbed pending creds.
    return res.json({ ok: true, status: 'queued', patient_id, drug_id, dose, refills });
  } catch (e) {
    console.error('surescripts error:', e);
    return res.status(500).json({ error: 'push failed' });
  }
});

module.exports = router;
