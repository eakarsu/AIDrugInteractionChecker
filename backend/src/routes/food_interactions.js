const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { queryOpenRouter } = require('../middleware/openrouter');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT fi.*, d.name as drug_name FROM food_interactions fi
      JOIN drugs d ON fi.drug_id = d.id ORDER BY fi.severity DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT fi.*, d.name as drug_name, d.generic_name FROM food_interactions fi
      JOIN drugs d ON fi.drug_id = d.id WHERE fi.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { drug_id, food_item, interaction_type, severity, description, recommendation } = req.body;
    const result = await pool.query(
      `INSERT INTO food_interactions (drug_id, food_item, interaction_type, severity, description, recommendation) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [drug_id, food_item, interaction_type, severity, description, recommendation]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { drug_id, food_item, interaction_type, severity, description, recommendation } = req.body;
    const result = await pool.query(
      `UPDATE food_interactions SET drug_id=$1, food_item=$2, interaction_type=$3, severity=$4, description=$5, recommendation=$6, updated_at=NOW() WHERE id=$7 RETURNING *`,
      [drug_id, food_item, interaction_type, severity, description, recommendation, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM food_interactions WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI: Analyze food interaction
router.post('/ai-analyze', auth, async (req, res) => {
  try {
    const { drug_id, food_items } = req.body;
    const drug = await pool.query('SELECT * FROM drugs WHERE id = $1', [drug_id]);
    if (drug.rows.length === 0) return res.status(404).json({ error: 'Drug not found' });
    const d = drug.rows[0];
    const prompt = `Analyze drug-food interactions between ${d.name} (${d.generic_name}, class: ${d.drug_class}) and these foods/beverages: ${food_items}. Include timing recommendations, absorption effects, and patient counseling points.`;
    const aiResult = await queryOpenRouter(prompt, 'You are a clinical pharmacist specializing in drug-food interactions and patient counseling.');
    res.json({ drug: d, ai_analysis: aiResult.result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
