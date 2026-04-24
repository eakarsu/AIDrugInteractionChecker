const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { queryOpenRouter } = require('../middleware/openrouter');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clinical_guidelines ORDER BY category, title');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clinical_guidelines WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, category, organization, summary, recommendations, evidence_grade, last_reviewed, source_url } = req.body;
    const result = await pool.query(
      `INSERT INTO clinical_guidelines (title, category, organization, summary, recommendations, evidence_grade, last_reviewed, source_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [title, category, organization, summary, recommendations, evidence_grade, last_reviewed, source_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { title, category, organization, summary, recommendations, evidence_grade, last_reviewed, source_url } = req.body;
    const result = await pool.query(
      `UPDATE clinical_guidelines SET title=$1, category=$2, organization=$3, summary=$4, recommendations=$5, evidence_grade=$6, last_reviewed=$7, source_url=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [title, category, organization, summary, recommendations, evidence_grade, last_reviewed, source_url, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM clinical_guidelines WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI: Guideline recommendations
router.post('/ai-recommend', auth, async (req, res) => {
  try {
    const { condition, patient_factors } = req.body;
    const prompt = `Provide evidence-based clinical guideline recommendations for managing: ${condition}. Patient factors: ${patient_factors || 'Standard adult patient'}. Include current guideline references, treatment algorithms, monitoring parameters, and quality metrics.`;
    const aiResult = await queryOpenRouter(prompt, 'You are a clinical guidelines expert with expertise in evidence-based medicine and clinical decision support.');
    res.json({ condition, ai_analysis: aiResult.result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
