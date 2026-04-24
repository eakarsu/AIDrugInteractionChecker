const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { queryOpenRouter } = require('../middleware/openrouter');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, d.name as drug_name FROM contraindications c
      JOIN drugs d ON c.drug_id = d.id ORDER BY c.severity DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, d.name as drug_name, d.generic_name FROM contraindications c
      JOIN drugs d ON c.drug_id = d.id WHERE c.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { drug_id, condition, severity, description, evidence_level } = req.body;
    const result = await pool.query(
      `INSERT INTO contraindications (drug_id, condition, severity, description, evidence_level) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [drug_id, condition, severity, description, evidence_level]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { drug_id, condition, severity, description, evidence_level } = req.body;
    const result = await pool.query(
      `UPDATE contraindications SET drug_id=$1, condition=$2, severity=$3, description=$4, evidence_level=$5, updated_at=NOW() WHERE id=$6 RETURNING *`,
      [drug_id, condition, severity, description, evidence_level, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM contraindications WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI: Check contraindications
router.post('/ai-check', auth, async (req, res) => {
  try {
    const { drug_id, patient_conditions } = req.body;
    const drug = await pool.query('SELECT * FROM drugs WHERE id = $1', [drug_id]);
    if (drug.rows.length === 0) return res.status(404).json({ error: 'Drug not found' });
    const d = drug.rows[0];
    const prompt = `Check contraindications for ${d.name} (${d.generic_name}, class: ${d.drug_class}) in a patient with these conditions: ${patient_conditions}. List absolute and relative contraindications, risk levels, and alternative recommendations.`;
    const aiResult = await queryOpenRouter(prompt, 'You are a clinical pharmacologist specializing in drug contraindications and patient safety.');
    res.json({ drug: d, ai_analysis: aiResult.result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
