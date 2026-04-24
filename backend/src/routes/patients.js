const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { queryOpenRouter } = require('../middleware/openrouter');
const router = express.Router();

// Get all patients
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM patients ORDER BY last_name, first_name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single patient with medications
router.get('/:id', auth, async (req, res) => {
  try {
    const patient = await pool.query('SELECT * FROM patients WHERE id = $1', [req.params.id]);
    if (patient.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
    const meds = await pool.query(`
      SELECT pm.*, d.name as drug_name, d.generic_name, d.drug_class
      FROM patient_medications pm
      JOIN drugs d ON pm.drug_id = d.id
      WHERE pm.patient_id = $1 ORDER BY pm.start_date DESC
    `, [req.params.id]);
    res.json({ ...patient.rows[0], medications: meds.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create patient
router.post('/', auth, async (req, res) => {
  try {
    const { first_name, last_name, date_of_birth, gender, weight_kg, height_cm, allergies, medical_conditions, insurance_id } = req.body;
    const result = await pool.query(
      `INSERT INTO patients (first_name, last_name, date_of_birth, gender, weight_kg, height_cm, allergies, medical_conditions, insurance_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [first_name, last_name, date_of_birth, gender, weight_kg, height_cm, allergies, medical_conditions, insurance_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update patient
router.put('/:id', auth, async (req, res) => {
  try {
    const { first_name, last_name, date_of_birth, gender, weight_kg, height_cm, allergies, medical_conditions, insurance_id } = req.body;
    const result = await pool.query(
      `UPDATE patients SET first_name=$1, last_name=$2, date_of_birth=$3, gender=$4, weight_kg=$5, height_cm=$6, allergies=$7, medical_conditions=$8, insurance_id=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [first_name, last_name, date_of_birth, gender, weight_kg, height_cm, allergies, medical_conditions, insurance_id, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete patient
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM patient_medications WHERE patient_id = $1', [req.params.id]);
    const result = await pool.query('DELETE FROM patients WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
    res.json({ message: 'Patient deleted', patient: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add medication to patient
router.post('/:id/medications', auth, async (req, res) => {
  try {
    const { drug_id, dosage, frequency, route, start_date, end_date, prescribing_doctor } = req.body;
    const result = await pool.query(
      `INSERT INTO patient_medications (patient_id, drug_id, dosage, frequency, route, start_date, end_date, prescribing_doctor)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.params.id, drug_id, dosage, frequency, route, start_date, end_date, prescribing_doctor]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete medication from patient
router.delete('/:id/medications/:medId', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM patient_medications WHERE id = $1 AND patient_id = $2 RETURNING *', [req.params.medId, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Medication not found' });
    res.json({ message: 'Medication removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI: Check all patient medication interactions
router.post('/:id/ai-check', auth, async (req, res) => {
  try {
    const patient = await pool.query('SELECT * FROM patients WHERE id = $1', [req.params.id]);
    if (patient.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });

    const meds = await pool.query(`
      SELECT pm.*, d.name, d.generic_name, d.drug_class FROM patient_medications pm
      JOIN drugs d ON pm.drug_id = d.id WHERE pm.patient_id = $1
    `, [req.params.id]);

    const p = patient.rows[0];
    const medList = meds.rows.map(m => `${m.name} (${m.generic_name}) ${m.dosage} ${m.frequency}`).join(', ');
    const prompt = `Patient: ${p.first_name} ${p.last_name}, ${p.gender}, Weight: ${p.weight_kg}kg, Allergies: ${p.allergies || 'None'}, Conditions: ${p.medical_conditions || 'None'}.
Current medications: ${medList || 'None'}.
Analyze all potential drug-drug interactions, drug-allergy conflicts, and drug-condition contraindications for this patient. Provide severity ratings and recommendations.`;

    const aiResult = await queryOpenRouter(prompt, 'You are a clinical pharmacist performing a comprehensive medication therapy review.');

    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, 'AI_PATIENT_CHECK', 'patient', req.params.id, JSON.stringify({ patient: `${p.first_name} ${p.last_name}`, medication_count: meds.rows.length })]
    );

    res.json({ patient: p, medications: meds.rows, ai_analysis: aiResult.result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
