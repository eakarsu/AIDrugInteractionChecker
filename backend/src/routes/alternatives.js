const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { queryOpenRouter } = require('../middleware/openrouter');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT da.*, d1.name as original_drug_name, d2.name as alternative_drug_name
      FROM drug_alternatives da
      JOIN drugs d1 ON da.original_drug_id = d1.id
      JOIN drugs d2 ON da.alternative_drug_id = d2.id
      ORDER BY da.preference_rank
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT da.*, d1.name as original_drug_name, d2.name as alternative_drug_name
      FROM drug_alternatives da
      JOIN drugs d1 ON da.original_drug_id = d1.id
      JOIN drugs d2 ON da.alternative_drug_id = d2.id
      WHERE da.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { original_drug_id, alternative_drug_id, reason, efficacy_comparison, cost_comparison, preference_rank } = req.body;
    const result = await pool.query(
      `INSERT INTO drug_alternatives (original_drug_id, alternative_drug_id, reason, efficacy_comparison, cost_comparison, preference_rank)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [original_drug_id, alternative_drug_id, reason, efficacy_comparison, cost_comparison, preference_rank]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { original_drug_id, alternative_drug_id, reason, efficacy_comparison, cost_comparison, preference_rank } = req.body;
    const result = await pool.query(
      `UPDATE drug_alternatives SET original_drug_id=$1, alternative_drug_id=$2, reason=$3, efficacy_comparison=$4, cost_comparison=$5, preference_rank=$6, updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [original_drug_id, alternative_drug_id, reason, efficacy_comparison, cost_comparison, preference_rank, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM drug_alternatives WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI: Find alternatives
router.post('/ai-suggest', auth, async (req, res) => {
  try {
    const { drug_id, reason } = req.body;
    const drug = await pool.query('SELECT * FROM drugs WHERE id = $1', [drug_id]);
    if (drug.rows.length === 0) return res.status(404).json({ error: 'Drug not found' });
    const d = drug.rows[0];
    const prompt = `Suggest therapeutic alternatives for ${d.name} (${d.generic_name}, class: ${d.drug_class}). Reason for switch: ${reason || 'General alternatives needed'}. Include efficacy comparisons, cost considerations, and switching protocols.`;
    const aiResult = await queryOpenRouter(prompt, 'You are a clinical pharmacologist expert in therapeutic drug alternatives and formulary management.');
    res.json({ drug: d, ai_analysis: aiResult.result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
