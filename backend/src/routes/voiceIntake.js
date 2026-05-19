// Voice intake: speak medication list, NLP returns interaction report.
// Accepts base64 audio or pre-transcribed text, parses meds, runs the
// existing interactions endpoint logic.
const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { queryOpenRouter } = require('../middleware/openrouter');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

async function whisper(base64, mimeType = 'audio/webm') {
  // TODO: configure credentials — OPENAI_API_KEY
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const buf = Buffer.from(base64, 'base64');
  const form = new FormData();
  form.append('file', new Blob([buf], { type: mimeType }), 'rec.webm');
  form.append('model', 'whisper-1');
  const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!r.ok) return null;
  const j = await r.json();
  return j.text || null;
}

// POST /api/voice-intake/medications { audio_base64?, transcript?, patient_id? }
router.post('/medications', auth, aiRateLimiter, async (req, res) => {
  try {
    const { audio_base64, transcript, patient_id, mimeType } = req.body || {};
    let text = transcript;
    if (!text && audio_base64) {
      text = await whisper(audio_base64, mimeType);
      if (!text) return res.status(503).json({ error: 'Whisper not configured (OPENAI_API_KEY)' });
    }
    if (!text) return res.status(400).json({ error: 'transcript or audio_base64 required' });

    // Extract medication names via LLM
    const system = 'Extract medication names and doses from the user transcript. Output JSON: {"medications":[{"name":"...","dose":"...","frequency":"..."}]}.';
    let extraction;
    try {
      const raw = await queryOpenRouter(text, system);
      extraction = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw);
    } catch (e) {
      return res.status(503).json({ error: 'LLM unavailable', detail: e.message });
    }

    // Map to drug IDs
    const matched = [];
    for (const m of (extraction.medications || [])) {
      try {
        const r = await pool.query('SELECT id, name FROM drugs WHERE lower(name) LIKE $1 OR lower(generic_name) LIKE $1 LIMIT 1', [`%${(m.name || '').toLowerCase()}%`]);
        if (r.rows[0]) matched.push({ ...m, drug_id: r.rows[0].id, matched_name: r.rows[0].name });
      } catch {}
    }

    // Pairwise interaction lookup
    const interactions = [];
    const ids = matched.map(m => m.drug_id);
    if (ids.length >= 2) {
      try {
        const ir = await pool.query(
          `SELECT * FROM interactions WHERE drug_a_id = ANY($1) AND drug_b_id = ANY($1)`,
          [ids]
        );
        interactions.push(...ir.rows);
      } catch {}
    }

    return res.json({ transcript: text, extracted: extraction.medications, matched, interactions, patient_id: patient_id || null });
  } catch (e) {
    console.error('voice intake error:', e);
    return res.status(500).json({ error: 'voice intake failed' });
  }
});

module.exports = router;
