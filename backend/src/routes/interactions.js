const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { queryOpenRouter } = require('../middleware/openrouter');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

// Get all interactions (paginated)
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM drug_interactions');
    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    const result = await pool.query(`
      SELECT i.*, d1.name as drug1_name, d2.name as drug2_name
      FROM drug_interactions i
      JOIN drugs d1 ON i.drug1_id = d1.id
      JOIN drugs d2 ON i.drug2_id = d2.id
      ORDER BY i.severity DESC, i.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    res.json({ data: result.rows, pagination: { page, limit, total, totalPages } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single interaction
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.*, d1.name as drug1_name, d2.name as drug2_name
      FROM drug_interactions i
      JOIN drugs d1 ON i.drug1_id = d1.id
      JOIN drugs d2 ON i.drug2_id = d2.id
      WHERE i.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Interaction not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create interaction
router.post('/', auth, async (req, res) => {
  try {
    const { drug1_id, drug2_id, severity, interaction_type, description, clinical_significance, management } = req.body;
    const result = await pool.query(
      `INSERT INTO drug_interactions (drug1_id, drug2_id, severity, interaction_type, description, clinical_significance, management)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [drug1_id, drug2_id, severity, interaction_type, description, clinical_significance, management]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update interaction
router.put('/:id', auth, async (req, res) => {
  try {
    const { drug1_id, drug2_id, severity, interaction_type, description, clinical_significance, management } = req.body;
    const result = await pool.query(
      `UPDATE drug_interactions SET drug1_id=$1, drug2_id=$2, severity=$3, interaction_type=$4, description=$5, clinical_significance=$6, management=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [drug1_id, drug2_id, severity, interaction_type, description, clinical_significance, management, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Interaction not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete interaction
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM drug_interactions WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Interaction not found' });
    res.json({ message: 'Interaction deleted', interaction: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI: Check interaction between two drugs
router.post('/ai-check', auth, aiRateLimiter, async (req, res) => {
  try {
    const { drug1_id, drug2_id } = req.body;
    const d1 = await pool.query('SELECT * FROM drugs WHERE id = $1', [drug1_id]);
    const d2 = await pool.query('SELECT * FROM drugs WHERE id = $2', [drug2_id]);
    if (d1.rows.length === 0 || d2.rows.length === 0) return res.status(404).json({ error: 'Drug not found' });

    const prompt = `Analyze the potential drug interaction between ${d1.rows[0].name} (${d1.rows[0].generic_name}, class: ${d1.rows[0].drug_class}) and ${d2.rows[0].name} (${d2.rows[0].generic_name}, class: ${d2.rows[0].drug_class}). Include severity, mechanism, clinical effects, and management recommendations.`;
    const aiResult = await queryOpenRouter(prompt, 'You are a clinical pharmacology expert specializing in drug-drug interactions. Provide detailed, evidence-based interaction analysis.');
    const { parseAIJson } = require('../middleware/parseAIJson');
    const parsedJson = parseAIJson(aiResult.result);

    // Log to audit (with structured ai_results JSONB)
    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ai_results) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.user.id,
        'AI_INTERACTION_CHECK',
        'drug_interaction',
        null,
        JSON.stringify({ drug1: d1.rows[0].name, drug2: d2.rows[0].name }),
        JSON.stringify({ raw: aiResult.result, parsed: parsedJson })
      ]
    );

    res.json({ drug1: d1.rows[0], drug2: d2.rows[0], ai_analysis: aiResult.result, ai_json: parsedJson });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
