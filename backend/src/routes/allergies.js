const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { queryOpenRouter } = require('../middleware/openrouter');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT da.*, d.name as drug_name, p.first_name || ' ' || p.last_name as patient_name
      FROM drug_allergies da
      JOIN drugs d ON da.drug_id = d.id
      LEFT JOIN patients p ON da.patient_id = p.id
      ORDER BY da.severity DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT da.*, d.name as drug_name, d.generic_name, d.drug_class, p.first_name || ' ' || p.last_name as patient_name
      FROM drug_allergies da
      JOIN drugs d ON da.drug_id = d.id
      LEFT JOIN patients p ON da.patient_id = p.id
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
    const { drug_id, patient_id, allergy_type, severity, reaction_description, verified, verified_date } = req.body;
    const result = await pool.query(
      `INSERT INTO drug_allergies (drug_id, patient_id, allergy_type, severity, reaction_description, verified, verified_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [drug_id, patient_id, allergy_type, severity, reaction_description, verified, verified_date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { drug_id, patient_id, allergy_type, severity, reaction_description, verified, verified_date } = req.body;
    const result = await pool.query(
      `UPDATE drug_allergies SET drug_id=$1, patient_id=$2, allergy_type=$3, severity=$4, reaction_description=$5, verified=$6, verified_date=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [drug_id, patient_id, allergy_type, severity, reaction_description, verified, verified_date, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM drug_allergies WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI: Cross-reactivity check
router.post('/ai-check', auth, async (req, res) => {
  try {
    const { drug_id, patient_id } = req.body;
    const drug = await pool.query('SELECT * FROM drugs WHERE id = $1', [drug_id]);
    const allergies = await pool.query(`
      SELECT da.*, d.name as drug_name, d.drug_class FROM drug_allergies da
      JOIN drugs d ON da.drug_id = d.id WHERE da.patient_id = $1
    `, [patient_id]);
    if (drug.rows.length === 0) return res.status(404).json({ error: 'Drug not found' });
    const d = drug.rows[0];
    const allergyList = allergies.rows.map(a => `${a.drug_name} (${a.drug_class}) - ${a.allergy_type}: ${a.reaction_description}`).join('; ');
    const prompt = `Check if ${d.name} (${d.generic_name}, class: ${d.drug_class}) is safe for a patient with these known drug allergies: ${allergyList || 'None documented'}. Assess cross-reactivity risk and provide safe prescribing recommendations.`;
    const aiResult = await queryOpenRouter(prompt, 'You are an allergist and clinical pharmacologist specializing in drug allergy assessment and cross-reactivity analysis.');
    res.json({ drug: d, allergies: allergies.rows, ai_analysis: aiResult.result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
