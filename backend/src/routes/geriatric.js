const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { queryOpenRouter } = require('../middleware/openrouter');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ga.*, d.name as drug_name FROM geriatric_alerts ga
      JOIN drugs d ON ga.drug_id = d.id ORDER BY ga.risk_level DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ga.*, d.name as drug_name, d.generic_name FROM geriatric_alerts ga
      JOIN drugs d ON ga.drug_id = d.id WHERE ga.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { drug_id, risk_level, beers_criteria, alert_type, description, dose_adjustment, monitoring_requirements } = req.body;
    const result = await pool.query(
      `INSERT INTO geriatric_alerts (drug_id, risk_level, beers_criteria, alert_type, description, dose_adjustment, monitoring_requirements)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [drug_id, risk_level, beers_criteria, alert_type, description, dose_adjustment, monitoring_requirements]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { drug_id, risk_level, beers_criteria, alert_type, description, dose_adjustment, monitoring_requirements } = req.body;
    const result = await pool.query(
      `UPDATE geriatric_alerts SET drug_id=$1, risk_level=$2, beers_criteria=$3, alert_type=$4, description=$5, dose_adjustment=$6, monitoring_requirements=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [drug_id, risk_level, beers_criteria, alert_type, description, dose_adjustment, monitoring_requirements, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM geriatric_alerts WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI: Geriatric assessment
router.post('/ai-assess', auth, async (req, res) => {
  try {
    const { drug_id, patient_age, renal_function, polypharmacy_count } = req.body;
    const drug = await pool.query('SELECT * FROM drugs WHERE id = $1', [drug_id]);
    if (drug.rows.length === 0) return res.status(404).json({ error: 'Drug not found' });
    const d = drug.rows[0];
    const prompt = `Assess geriatric safety of ${d.name} (${d.generic_name}, class: ${d.drug_class}). Patient age: ${patient_age || '75+'}, Renal function: ${renal_function || 'Unknown'}, Number of concurrent meds: ${polypharmacy_count || 'Unknown'}. Include Beers Criteria assessment, STOPP/START criteria, fall risk, anticholinergic burden, and dose adjustments.`;
    const aiResult = await queryOpenRouter(prompt, 'You are a geriatric pharmacist specializing in medication safety for elderly patients.');
    res.json({ drug: d, ai_analysis: aiResult.result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
