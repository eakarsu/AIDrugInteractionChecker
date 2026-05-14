// Live drug-database sync: daily pull from FDA / WHO updates with auto
// re-index. v0 supports manual trigger and a basic FDA OpenFDA call.
const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

// POST /api/drug-database-sync/run  { source: 'fda'|'who', limit? }
router.post('/run', auth, aiRateLimiter, async (req, res) => {
  try {
    const { source = 'fda', limit = 25 } = req.body || {};
    // TODO: configure credentials — OPENFDA_API_KEY (optional), WHO_API_KEY
    const fdaKey = process.env.OPENFDA_API_KEY || '';
    const url = source === 'fda'
      ? `https://api.fda.gov/drug/label.json?limit=${Math.min(limit, 100)}${fdaKey ? `&api_key=${fdaKey}` : ''}`
      : `https://www.who.int/data/gho/info/gho-odata-api`;

    const r = await fetch(url);
    if (!r.ok) return res.status(502).json({ error: `Source ${source} unavailable`, status: r.status });
    const data = await r.json();

    let upserts = 0;
    const items = data.results || data.value || [];
    for (const item of items.slice(0, limit)) {
      const name = item?.openfda?.brand_name?.[0] || item?.openfda?.generic_name?.[0] || item?.name;
      if (!name) continue;
      try {
        await pool.query(
          `INSERT INTO drugs (name, generic_name, source_payload, updated_at)
           VALUES ($1,$2,$3, NOW())
           ON CONFLICT (name) DO UPDATE SET source_payload = EXCLUDED.source_payload, updated_at = NOW()`,
          [name, item?.openfda?.generic_name?.[0] || null, item]
        );
        upserts++;
      } catch (e) {
        // schema may differ — skip
      }
    }
    return res.json({ source, fetched: items.length, upserts });
  } catch (e) {
    console.error('drug-db sync error:', e);
    return res.status(500).json({ error: 'sync failed' });
  }
});

// GET /api/drug-database-sync/status — last sync per source
router.get('/status', auth, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT max(updated_at) AS last_updated, count(*) AS total FROM drugs`
    );
    return res.json({ last_updated: r.rows[0].last_updated, total: r.rows[0].total });
  } catch (e) {
    return res.json({ last_updated: null, total: 0, note: 'drugs table may differ' });
  }
});

module.exports = router;
