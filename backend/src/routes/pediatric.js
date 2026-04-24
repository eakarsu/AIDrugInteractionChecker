const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { queryOpenRouter } = require('../middleware/openrouter');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pd.*, d.name as drug_name FROM pediatric_dosing pd
      JOIN drugs d ON pd.drug_id = d.id ORDER BY d.name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pd.*, d.name as drug_name, d.generic_name FROM pediatric_dosing pd
      JOIN drugs d ON pd.drug_id = d.id WHERE pd.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { drug_id, age_range, weight_based_dose, max_daily_dose, formulation, indication, special_notes } = req.body;
    const result = await pool.query(
      `INSERT INTO pediatric_dosing (drug_id, age_range, weight_based_dose, max_daily_dose, formulation, indication, special_notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [drug_id, age_range, weight_based_dose, max_daily_dose, formulation, indication, special_notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { drug_id, age_range, weight_based_dose, max_daily_dose, formulation, indication, special_notes } = req.body;
    const result = await pool.query(
      `UPDATE pediatric_dosing SET drug_id=$1, age_range=$2, weight_based_dose=$3, max_daily_dose=$4, formulation=$5, indication=$6, special_notes=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [drug_id, age_range, weight_based_dose, max_daily_dose, formulation, indication, special_notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM pediatric_dosing WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI: Pediatric dosing
router.post('/ai-calculate', auth, async (req, res) => {
  try {
    const { drug_id, age_years, weight_kg, indication } = req.body;
    const drug = await pool.query('SELECT * FROM drugs WHERE id = $1', [drug_id]);
    if (drug.rows.length === 0) return res.status(404).json({ error: 'Drug not found' });
    const d = drug.rows[0];
    const prompt = `Calculate pediatric dosing for ${d.name} (${d.generic_name}). Child age: ${age_years} years, Weight: ${weight_kg}kg, Indication: ${indication || 'Standard'}. Include weight-based calculation, age-appropriate formulation, maximum doses, and monitoring.`;
    const aiResult = await queryOpenRouter(prompt, 'You are a pediatric clinical pharmacist specializing in pediatric dosing and medication safety.');
    res.json({ drug: d, ai_analysis: aiResult.result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
