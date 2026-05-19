const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { queryOpenRouter } = require('../middleware/openrouter');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

// Get all patients (paginated)
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM patients');
    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    const result = await pool.query(
      'SELECT * FROM patients ORDER BY last_name, first_name LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    res.json({ data: result.rows, pagination: { page, limit, total, totalPages } });
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

// List active medications for patient
router.get('/:id/medications', auth, async (req, res) => {
  try {
    const patient = await pool.query('SELECT id FROM patients WHERE id = $1', [req.params.id]);
    if (patient.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });

    const meds = await pool.query(`
      SELECT pm.*, d.name as drug_name, d.generic_name, d.drug_class
      FROM patient_medications pm
      JOIN drugs d ON pm.drug_id = d.id
      WHERE pm.patient_id = $1
      ORDER BY pm.start_date DESC
    `, [req.params.id]);
    res.json(meds.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add medication to patient
router.post('/:id/medications', auth, async (req, res) => {
  try {
    const { drug_id, dosage, frequency, route, start_date, end_date, prescribing_doctor } = req.body;

    if (!drug_id) return res.status(400).json({ error: 'drug_id is required' });
    if (!dosage || typeof dosage !== 'string' || dosage.trim().length === 0) {
      return res.status(400).json({ error: 'dosage is required' });
    }
    if (!frequency || typeof frequency !== 'string' || frequency.trim().length === 0) {
      return res.status(400).json({ error: 'frequency is required' });
    }
    if (!start_date) return res.status(400).json({ error: 'start_date is required' });

    const patient = await pool.query('SELECT id FROM patients WHERE id = $1', [req.params.id]);
    if (patient.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });

    const result = await pool.query(
      `INSERT INTO patient_medications (patient_id, drug_id, dosage, frequency, route, start_date, end_date, prescribing_doctor)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.params.id, drug_id, dosage.trim(), frequency.trim(), route, start_date, end_date, prescribing_doctor]
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

// Check all ACTIVE medications for a patient — comprehensive AI interaction analysis
router.post('/:id/check-interactions', auth, aiRateLimiter, async (req, res) => {
  try {
    const patient = await pool.query('SELECT * FROM patients WHERE id = $1', [req.params.id]);
    if (patient.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });

    const meds = await pool.query(`
      SELECT pm.*, d.name, d.generic_name, d.drug_class, d.side_effects, d.contraindications
      FROM patient_medications pm
      JOIN drugs d ON pm.drug_id = d.id
      WHERE pm.patient_id = $1
        AND (pm.end_date IS NULL OR pm.end_date >= CURRENT_DATE)
      ORDER BY pm.start_date DESC
    `, [req.params.id]);

    if (meds.rows.length === 0) {
      return res.json({ patient: patient.rows[0], active_medications: [], message: 'No active medications found for this patient.', ai_analysis: null });
    }

    const p = patient.rows[0];
    const age = p.date_of_birth
      ? new Date().getFullYear() - new Date(p.date_of_birth).getFullYear()
      : 'Unknown';

    const medList = meds.rows.map(m =>
      `- ${m.name} (${m.generic_name}), Class: ${m.drug_class}, Dose: ${m.dosage} ${m.frequency}, Route: ${m.route || 'oral'}`
    ).join('\n');

    const prompt = `Comprehensive Medication Therapy Review:

Patient Profile:
- Name: ${p.first_name} ${p.last_name}
- Age: ${age} years
- Gender: ${p.gender || 'Not specified'}
- Weight: ${p.weight_kg ? p.weight_kg + 'kg' : 'Not specified'}
- Allergies: ${p.allergies || 'None documented'}
- Medical Conditions: ${p.medical_conditions || 'None documented'}

Active Medications (${meds.rows.length}):
${medList}

Please provide:
1. **Drug-Drug Interactions**: Identify all potential interactions between these medications, with severity (Major/Moderate/Minor)
2. **Drug-Allergy Conflicts**: Flag any medications that may conflict with documented allergies
3. **Drug-Disease Contraindications**: Identify medications contraindicated for the patient's conditions
4. **Dosing Concerns**: Flag any dosing issues given patient's age/weight/conditions
5. **High-Risk Combinations**: Highlight any combinations requiring immediate attention
6. **Monitoring Recommendations**: Lab tests and clinical parameters to monitor
7. **Clinical Summary**: Overall risk assessment and priority action items`;

    const aiResult = await queryOpenRouter(prompt, 'You are a clinical pharmacist performing a comprehensive medication therapy review. Prioritize patient safety and provide evidence-based analysis.');
    const { parseAIJson } = require('../middleware/parseAIJson');
    const parsedJson = parseAIJson(aiResult.result);

    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ai_results) VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.id, 'AI_FULL_INTERACTION_CHECK', 'patient', req.params.id, JSON.stringify({ patient: `${p.first_name} ${p.last_name}`, active_medication_count: meds.rows.length }), JSON.stringify({ raw: aiResult.result, parsed: parsedJson })]
    );

    res.json({
      patient: p,
      active_medications: meds.rows,
      ai_analysis: aiResult.result,
      ai_json: parsedJson
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI: Check all patient medication interactions
router.post('/:id/ai-check', auth, aiRateLimiter, async (req, res) => {
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
    const { parseAIJson: _parseAIJson } = require('../middleware/parseAIJson');
    const parsedJson = _parseAIJson(aiResult.result);

    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ai_results) VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.id, 'AI_PATIENT_CHECK', 'patient', req.params.id, JSON.stringify({ patient: `${p.first_name} ${p.last_name}`, medication_count: meds.rows.length }), JSON.stringify({ raw: aiResult.result, parsed: parsedJson })]
    );

    res.json({ patient: p, medications: meds.rows, ai_analysis: aiResult.result, ai_json: parsedJson });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
