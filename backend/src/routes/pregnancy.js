const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { queryOpenRouter } = require('../middleware/openrouter');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ps.*, d.name as drug_name FROM pregnancy_safety ps
      JOIN drugs d ON ps.drug_id = d.id ORDER BY ps.fda_category
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ps.*, d.name as drug_name, d.generic_name FROM pregnancy_safety ps
      JOIN drugs d ON ps.drug_id = d.id WHERE ps.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { drug_id, fda_category, trimester_risk, lactation_risk, description, alternatives_during_pregnancy } = req.body;
    const result = await pool.query(
      `INSERT INTO pregnancy_safety (drug_id, fda_category, trimester_risk, lactation_risk, description, alternatives_during_pregnancy)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [drug_id, fda_category, trimester_risk, lactation_risk, description, alternatives_during_pregnancy]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { drug_id, fda_category, trimester_risk, lactation_risk, description, alternatives_during_pregnancy } = req.body;
    const result = await pool.query(
      `UPDATE pregnancy_safety SET drug_id=$1, fda_category=$2, trimester_risk=$3, lactation_risk=$4, description=$5, alternatives_during_pregnancy=$6, updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [drug_id, fda_category, trimester_risk, lactation_risk, description, alternatives_during_pregnancy, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM pregnancy_safety WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI: Pregnancy safety check
router.post('/ai-check', auth, async (req, res) => {
  try {
    const { drug_id, trimester, breastfeeding } = req.body;
    const drug = await pool.query('SELECT * FROM drugs WHERE id = $1', [drug_id]);
    if (drug.rows.length === 0) return res.status(404).json({ error: 'Drug not found' });
    const d = drug.rows[0];
    const prompt = `Assess pregnancy/lactation safety of ${d.name} (${d.generic_name}, class: ${d.drug_class}). Trimester: ${trimester || 'All'}. Breastfeeding: ${breastfeeding ? 'Yes' : 'No'}. Include FDA category, teratogenicity risk, safer alternatives, and counseling points.`;
    const aiResult = await queryOpenRouter(prompt, 'You are a maternal-fetal medicine pharmacologist specializing in medication safety during pregnancy and lactation.');
    res.json({ drug: d, ai_analysis: aiResult.result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
