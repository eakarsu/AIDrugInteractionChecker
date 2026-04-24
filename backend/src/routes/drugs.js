const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { queryOpenRouter } = require('../middleware/openrouter');
const router = express.Router();

// Get all drugs
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM drugs ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single drug
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM drugs WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Drug not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create drug
router.post('/', auth, async (req, res) => {
  try {
    const { name, generic_name, drug_class, category, manufacturer, fda_status, description, side_effects, contraindications } = req.body;
    const result = await pool.query(
      `INSERT INTO drugs (name, generic_name, drug_class, category, manufacturer, fda_status, description, side_effects, contraindications)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, generic_name, drug_class, category, manufacturer, fda_status, description, side_effects, contraindications]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update drug
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, generic_name, drug_class, category, manufacturer, fda_status, description, side_effects, contraindications } = req.body;
    const result = await pool.query(
      `UPDATE drugs SET name=$1, generic_name=$2, drug_class=$3, category=$4, manufacturer=$5, fda_status=$6, description=$7, side_effects=$8, contraindications=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [name, generic_name, drug_class, category, manufacturer, fda_status, description, side_effects, contraindications, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Drug not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete drug
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM drugs WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Drug not found' });
    res.json({ message: 'Drug deleted', drug: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI: Get drug info
router.post('/:id/ai-info', auth, async (req, res) => {
  try {
    const drug = await pool.query('SELECT * FROM drugs WHERE id = $1', [req.params.id]);
    if (drug.rows.length === 0) return res.status(404).json({ error: 'Drug not found' });
    const d = drug.rows[0];
    const prompt = `Provide a comprehensive clinical overview of ${d.name} (${d.generic_name}), a ${d.drug_class} medication. Include mechanism of action, common uses, key warnings, and monitoring parameters.`;
    const aiResult = await queryOpenRouter(prompt, 'You are a clinical pharmacology expert providing drug information for healthcare professionals.');
    res.json({ drug: d, ai_analysis: aiResult.result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
