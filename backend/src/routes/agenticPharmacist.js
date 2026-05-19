// Agentic pharmacist: chat endpoint with visible reasoning chain — which
// interactions drove which recommendation. Aggregates context from drugs,
// interactions, and patient profile, then calls the LLM.
const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { queryOpenRouter } = require('../middleware/openrouter');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

// POST /api/agentic-pharmacist/chat { messages:[{role,content}], patient_id?, drug_ids? }
router.post('/chat', auth, aiRateLimiter, async (req, res) => {
  try {
    const { messages = [], patient_id, drug_ids = [] } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages[] required' });
    }

    const evidence = { drugs: [], interactions: [], patient: null };
    if (Array.isArray(drug_ids) && drug_ids.length) {
      const dr = await pool.query('SELECT id, name, generic_name FROM drugs WHERE id = ANY($1)', [drug_ids]);
      evidence.drugs = dr.rows;
      if (drug_ids.length >= 2) {
        try {
          const ir = await pool.query(
            `SELECT * FROM interactions WHERE drug_a_id = ANY($1) AND drug_b_id = ANY($1) LIMIT 50`,
            [drug_ids]
          );
          evidence.interactions = ir.rows;
        } catch {}
      }
    }
    if (patient_id) {
      try {
        const pr = await pool.query('SELECT id, age, weight, renal_function, hepatic_function FROM patients WHERE id = $1', [patient_id]);
        evidence.patient = pr.rows[0] || null;
      } catch {}
    }

    const system = 'You are a licensed clinical pharmacist agent. Use the supplied evidence to answer. Output JSON: {"answer":"...","reasoning_chain":["..."],"interactions_cited":[ids],"recommendation":"..."}. Cite evidence row ids.';
    const userMsg = `Evidence:\n${JSON.stringify(evidence)}\n\nConversation:\n${messages.map(m => `${m.role}: ${m.content}`).join('\n')}`;

    let answer;
    try {
      const raw = await queryOpenRouter(userMsg, system); // TODO: configure OPENROUTER_API_KEY
      try { answer = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw); } catch { answer = { answer: raw }; }
    } catch (e) {
      return res.status(503).json({ error: 'LLM unavailable', detail: e.message });
    }

    return res.json({ evidence, response: answer });
  } catch (e) {
    console.error('agentic pharmacist error:', e);
    return res.status(500).json({ error: 'chat failed' });
  }
});

module.exports = router;
