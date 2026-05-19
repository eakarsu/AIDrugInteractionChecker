// ============================================================
// === Batch 03 Gaps & Frontend Mounts ===
// Auto-generated Gap-feature endpoints (lean v0).
// TODO: configure credentials (set OPENROUTER_API_KEY).
// ============================================================
const express = require('express');
const router = express.Router();

let _gfReady = false;
async function ensureGapTable(pool) {
  if (_gfReady || !pool) return;
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS gap_features (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(120) NOT NULL,
      user_id INT,
      input JSONB,
      output JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    _gfReady = true;
  } catch (_) { /* tolerant of missing DB */ }
}

async function callAI(prompt) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return { ok: false, status: 503, error: 'AI service unavailable. Set OPENROUTER_API_KEY (TODO: configure credentials).' };
  try {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
      }),
    });
    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content || '';
    return { ok: r.ok, status: r.status, text, raw: data };
  } catch (e) {
    return { ok: false, status: 500, error: String(e.message || e) };
  }
}

function buildHandler(slug, label, hint) {
  return async (req, res) => {
    const body = req.body || {};
    const userId = req.user?.id || null;
    const prompt = `Feature: ${label}\nContext hint: ${hint}\nUser input:\n${JSON.stringify(body, null, 2)}\n\nProduce a concise, actionable response.`;
    const ai = await callAI(prompt);
    try {
      const pool = req.app.locals.pool || req.app.get('pool') || null;
      if (pool) {
        await ensureGapTable(pool);
        await pool.query('INSERT INTO gap_features(slug, user_id, input, output) VALUES ($1,$2,$3,$4)',
          [slug, userId, body, { text: ai.text || ai.error || null }]);
      }
    } catch (_) { /* tolerant */ }
    if (!ai.ok) return res.status(ai.status || 500).json({ error: ai.error || ai.text || `Upstream error (${ai.status})`, slug });
    res.json({ slug, label, result: ai.text });
  };
}

router.post('/gap-no-reasoning-chain-why-this-interaction-explainability-end', buildHandler('gap-ai-no-reasoning-chain-why-this-interaction-explainability-end', 'No reasoning-chain "why this interaction" explainability end', 'No reasoning-chain "why this interaction" explainability endpoint'));
router.post('/gap-no-population-cohort-polypharmacy-scan', buildHandler('gap-ai-no-population-cohort-polypharmacy-scan', 'No population-cohort polypharmacy scan', 'No population-cohort polypharmacy scan'));
router.post('/gap-no-formulary-cost-aware-alternative-ranking', buildHandler('gap-ai-no-formulary-cost-aware-alternative-ranking', 'No formulary/cost-aware alternative ranking', 'No formulary/cost-aware alternative ranking'));
router.post('/gap-no-prescription-workflow-order-fill-dispense-lifecycle', buildHandler('gap-non-no-prescription-workflow-order-fill-dispense-lifecycle', 'No prescription workflow (order/fill/dispense lifecycle)', 'No prescription workflow (order/fill/dispense lifecycle)'));
router.post('/gap-no-notifications-alerting-system-for-high-risk-findings', buildHandler('gap-non-no-notifications-alerting-system-for-high-risk-findings', 'No notifications/alerting system for high-risk findings', 'No notifications/alerting system for high-risk findings'));
router.post('/gap-no-webhooks-for-ehr-integration-callbacks', buildHandler('gap-non-no-webhooks-for-ehr-integration-callbacks', 'No webhooks for EHR integration callbacks', 'No webhooks for EHR integration callbacks'));
router.post('/gap-no-file-upload-no-e-rx-pdf-ingest', buildHandler('gap-non-no-file-upload-no-e-rx-pdf-ingest', 'No file upload (no e-Rx/PDF ingest)', 'No file upload (no e-Rx/PDF ingest)'));
router.post('/gap-limited-integration-no-surescripts-ehr-connector', buildHandler('gap-non-limited-integration-no-surescripts-ehr-connector', 'Limited integration (no Surescripts/EHR connector)', 'Limited integration (no Surescripts/EHR connector)'));
router.post('/gap-no-approval-workflow-for-off-label-use', buildHandler('gap-non-no-approval-workflow-for-off-label-use', 'No approval workflow for off-label use', 'No approval workflow for off-label use'));

module.exports = router;
