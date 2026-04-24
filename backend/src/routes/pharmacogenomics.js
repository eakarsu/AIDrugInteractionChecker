const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { queryOpenRouter } = require('../middleware/openrouter');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pg.*, d.name as drug_name FROM pharmacogenomics pg
      JOIN drugs d ON pg.drug_id = d.id ORDER BY d.name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pg.*, d.name as drug_name, d.generic_name FROM pharmacogenomics pg
      JOIN drugs d ON pg.drug_id = d.id WHERE pg.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { drug_id, gene, variant, metabolizer_status, recommendation, evidence_level, cpic_guideline } = req.body;
    const result = await pool.query(
      `INSERT INTO pharmacogenomics (drug_id, gene, variant, metabolizer_status, recommendation, evidence_level, cpic_guideline)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [drug_id, gene, variant, metabolizer_status, recommendation, evidence_level, cpic_guideline]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { drug_id, gene, variant, metabolizer_status, recommendation, evidence_level, cpic_guideline } = req.body;
    const result = await pool.query(
      `UPDATE pharmacogenomics SET drug_id=$1, gene=$2, variant=$3, metabolizer_status=$4, recommendation=$5, evidence_level=$6, cpic_guideline=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [drug_id, gene, variant, metabolizer_status, recommendation, evidence_level, cpic_guideline, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM pharmacogenomics WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI: Pharmacogenomic analysis
router.post('/ai-analyze', auth, async (req, res) => {
  try {
    const { drug_id, gene_results } = req.body;
    const drug = await pool.query('SELECT * FROM drugs WHERE id = $1', [drug_id]);
    if (drug.rows.length === 0) return res.status(404).json({ error: 'Drug not found' });
    const d = drug.rows[0];
    const prompt = `Provide pharmacogenomic analysis for ${d.name} (${d.generic_name}, class: ${d.drug_class}). Genetic test results: ${gene_results || 'CYP2D6 *1/*1 (Normal Metabolizer)'}. Include CPIC guidelines, dose adjustments based on genotype, and clinical action recommendations.`;
    const aiResult = await queryOpenRouter(prompt, 'You are a pharmacogenomics expert specializing in precision medicine and genotype-guided drug therapy.');
    res.json({ drug: d, ai_analysis: aiResult.result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
