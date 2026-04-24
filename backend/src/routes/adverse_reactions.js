const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { queryOpenRouter } = require('../middleware/openrouter');
const router = express.Router();

// Get all
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ar.*, d.name as drug_name, p.first_name || ' ' || p.last_name as patient_name
      FROM adverse_reactions ar
      JOIN drugs d ON ar.drug_id = d.id
      LEFT JOIN patients p ON ar.patient_id = p.id
      ORDER BY ar.reported_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ar.*, d.name as drug_name, p.first_name || ' ' || p.last_name as patient_name
      FROM adverse_reactions ar
      JOIN drugs d ON ar.drug_id = d.id
      LEFT JOIN patients p ON ar.patient_id = p.id
      WHERE ar.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create
router.post('/', auth, async (req, res) => {
  try {
    const { drug_id, patient_id, reaction_type, severity, description, onset_date, reported_date, outcome, reporter } = req.body;
    const result = await pool.query(
      `INSERT INTO adverse_reactions (drug_id, patient_id, reaction_type, severity, description, onset_date, reported_date, outcome, reporter)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [drug_id, patient_id, reaction_type, severity, description, onset_date, reported_date, outcome, reporter]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update
router.put('/:id', auth, async (req, res) => {
  try {
    const { drug_id, patient_id, reaction_type, severity, description, onset_date, reported_date, outcome, reporter } = req.body;
    const result = await pool.query(
      `UPDATE adverse_reactions SET drug_id=$1, patient_id=$2, reaction_type=$3, severity=$4, description=$5, onset_date=$6, reported_date=$7, outcome=$8, reporter=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [drug_id, patient_id, reaction_type, severity, description, onset_date, reported_date, outcome, reporter, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM adverse_reactions WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI: Analyze adverse reaction
router.post('/:id/ai-analyze', auth, async (req, res) => {
  try {
    const ar = await pool.query(`
      SELECT ar.*, d.name as drug_name, d.generic_name, d.drug_class
      FROM adverse_reactions ar JOIN drugs d ON ar.drug_id = d.id WHERE ar.id = $1
    `, [req.params.id]);
    if (ar.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const r = ar.rows[0];
    const prompt = `Analyze this adverse drug reaction report: Drug: ${r.drug_name} (${r.generic_name}), Reaction: ${r.reaction_type}, Severity: ${r.severity}, Description: ${r.description}, Outcome: ${r.outcome}. Assess causality using Naranjo algorithm criteria, suggest management, and identify if this is a known ADR for this drug class (${r.drug_class}).`;
    const aiResult = await queryOpenRouter(prompt, 'You are a pharmacovigilance expert analyzing adverse drug reaction reports.');
    res.json({ reaction: r, ai_analysis: aiResult.result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
