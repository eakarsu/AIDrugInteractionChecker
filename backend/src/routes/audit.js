const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { queryOpenRouter } = require('../middleware/openrouter');
const { parseAIJson } = require('../middleware/parseAIJson');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT al.*, u.name as user_name, u.email as user_email
      FROM audit_log al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC LIMIT 200
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT al.*, u.name as user_name, u.email as user_email
      FROM audit_log al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/audit/ai-summary
// Accepts { hours?: number, action_filter?: string, limit?: number }
// Summarises recent audit_log entries for a clinician dashboard.
router.post('/ai-summary', auth, aiRateLimiter, async (req, res) => {
  try {
    const hours = Math.max(1, Math.min(24 * 30, parseInt(req.body.hours, 10) || 24));
    const limit = Math.max(1, Math.min(500, parseInt(req.body.limit, 10) || 100));
    const actionFilter = (req.body.action_filter || '').toString().trim();

    const params = [`${hours} hours`];
    let where = `WHERE al.created_at >= NOW() - $1::interval`;
    if (actionFilter) {
      params.push(`%${actionFilter}%`);
      where += ` AND al.action ILIKE $${params.length}`;
    }
    params.push(limit);
    const sql = `
      SELECT al.id, al.action, al.entity_type, al.entity_id, al.created_at,
             u.name AS user_name, u.email AS user_email, al.details
      FROM audit_log al
      LEFT JOIN users u ON al.user_id = u.id
      ${where}
      ORDER BY al.created_at DESC
      LIMIT $${params.length}
    `;
    const result = await pool.query(sql, params);
    const rows = result.rows;

    if (rows.length === 0) {
      return res.json({
        window_hours: hours,
        action_filter: actionFilter || null,
        entry_count: 0,
        ai_analysis: 'No audit entries in selected window.',
        ai_json: null,
        entries: [],
      });
    }

    // Aggregate by action for prompt context
    const counts = rows.reduce((acc, r) => {
      acc[r.action] = (acc[r.action] || 0) + 1;
      return acc;
    }, {});
    const userCounts = rows.reduce((acc, r) => {
      const k = r.user_email || r.user_name || 'unknown';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});

    const sample = rows.slice(0, 25).map(r =>
      `- ${new Date(r.created_at).toISOString()} [${r.action}] ${r.entity_type || ''}#${r.entity_id || ''} by ${r.user_email || 'system'}`
    ).join('\n');

    const prompt = `Clinical Audit Log Summary (last ${hours}h, ${rows.length} entries)

Action breakdown:
${Object.entries(counts).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

User activity:
${Object.entries(userCounts).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

Recent sample:
${sample}

Provide a concise clinician-facing summary including:
1. **Activity Overview**: Most frequent actions and overall volume.
2. **Notable Patterns**: Any unusual concentrations (single user, repeated AI checks on the same drug/patient, off-hours activity).
3. **Risk Signals**: AI checks flagging high-risk drugs, contraindications, geriatric flags, or pregnancy concerns that warrant follow-up.
4. **Compliance Notes**: Whether the volume / mix suggests appropriate use vs. rubber-stamping.
5. **Recommended Follow-Ups**: 3-5 concrete actions for a clinical lead.

Return the narrative analysis followed by a JSON block with shape:
{ "summary": string, "top_actions": [{"action": string, "count": number}], "risk_signals": [string], "follow_ups": [string] }`;

    const aiResult = await queryOpenRouter(
      prompt,
      'You are a clinical informatics analyst summarising EHR audit logs for a pharmacy lead.'
    );
    const parsedJson = parseAIJson(aiResult.result);

    res.json({
      window_hours: hours,
      action_filter: actionFilter || null,
      entry_count: rows.length,
      action_counts: counts,
      user_counts: userCounts,
      ai_analysis: aiResult.result,
      ai_json: parsedJson,
      entries: rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM audit_log WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
