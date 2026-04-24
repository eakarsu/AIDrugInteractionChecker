const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { queryOpenRouter } = require('../middleware/openrouter');
const router = express.Router();

// Get all dosage guidelines
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT dg.*, d.name as drug_name FROM dosage_guidelines dg
      JOIN drugs d ON dg.drug_id = d.id ORDER BY d.name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT dg.*, d.name as drug_name, d.generic_name FROM dosage_guidelines dg
      JOIN drugs d ON dg.drug_id = d.id WHERE dg.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { drug_id, indication, age_group, min_dose, max_dose, dose_unit, frequency, route, special_instructions } = req.body;
    const result = await pool.query(
      `INSERT INTO dosage_guidelines (drug_id, indication, age_group, min_dose, max_dose, dose_unit, frequency, route, special_instructions)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [drug_id, indication, age_group, min_dose, max_dose, dose_unit, frequency, route, special_instructions]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { drug_id, indication, age_group, min_dose, max_dose, dose_unit, frequency, route, special_instructions } = req.body;
    const result = await pool.query(
      `UPDATE dosage_guidelines SET drug_id=$1, indication=$2, age_group=$3, min_dose=$4, max_dose=$5, dose_unit=$6, frequency=$7, route=$8, special_instructions=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [drug_id, indication, age_group, min_dose, max_dose, dose_unit, frequency, route, special_instructions, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM dosage_guidelines WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI: Calculate dosage
router.post('/ai-calculate', auth, async (req, res) => {
  try {
    const { drug_id, patient_id } = req.body;
    const drug = await pool.query('SELECT * FROM drugs WHERE id = $1', [drug_id]);
    const patient = await pool.query('SELECT * FROM patients WHERE id = $1', [patient_id]);
    if (drug.rows.length === 0 || patient.rows.length === 0) return res.status(404).json({ error: 'Drug or patient not found' });

    const d = drug.rows[0]; const p = patient.rows[0];
    const age = new Date().getFullYear() - new Date(p.date_of_birth).getFullYear();
    const prompt = `Calculate appropriate dosage for ${d.name} (${d.generic_name}) for patient: Age ${age}, Gender: ${p.gender}, Weight: ${p.weight_kg}kg, Height: ${p.height_cm}cm, Conditions: ${p.medical_conditions || 'None'}, Allergies: ${p.allergies || 'None'}. Provide dose calculation, adjustment factors, and monitoring plan.`;
    const aiResult = await queryOpenRouter(prompt, 'You are a clinical pharmacist expert in dosage calculations and pharmacokinetics.');
    res.json({ drug: d, patient: p, ai_analysis: aiResult.result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
