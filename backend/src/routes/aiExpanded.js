const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { queryOpenRouter } = require('../middleware/openrouter');
const { parseAIJson } = require('../middleware/parseAIJson');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

// POST /api/contraindications/ai-check
// Accepts { drug_id, patient_id (optional) }
// Fetches drug + contraindications + patient conditions if provided
// Returns contraindication severity and management
router.post('/contraindications/ai-check', auth, aiRateLimiter, async (req, res) => {
  try {
    const { drug_id, patient_id } = req.body;
    if (!drug_id) return res.status(400).json({ error: 'drug_id is required' });

    const drug = await pool.query('SELECT * FROM drugs WHERE id = $1', [drug_id]);
    if (drug.rows.length === 0) return res.status(404).json({ error: 'Drug not found' });
    const d = drug.rows[0];

    const contraindications = await pool.query(
      'SELECT condition, severity, description, evidence_level FROM contraindications WHERE drug_id = $1 ORDER BY severity DESC',
      [drug_id]
    );

    let patientContext = '';
    let patient = null;
    if (patient_id) {
      const patientResult = await pool.query('SELECT * FROM patients WHERE id = $1', [patient_id]);
      if (patientResult.rows.length > 0) {
        patient = patientResult.rows[0];
        const age = patient.date_of_birth
          ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()
          : 'Unknown';
        patientContext = `\n\nPatient Profile:\n- Age: ${age}, Gender: ${patient.gender || 'N/A'}, Weight: ${patient.weight_kg ? patient.weight_kg + 'kg' : 'N/A'}\n- Medical Conditions: ${patient.medical_conditions || 'None documented'}\n- Allergies: ${patient.allergies || 'None documented'}`;
      }
    }

    const contraindicationList = contraindications.rows.length > 0
      ? contraindications.rows.map(c => `- ${c.condition} (Severity: ${c.severity}, Evidence: ${c.evidence_level}): ${c.description || 'N/A'}`).join('\n')
      : 'No contraindications documented in database.';

    const prompt = `Contraindication Assessment for ${d.name} (${d.generic_name}, Class: ${d.drug_class}):

Known Contraindications from Database:
${contraindicationList}

Drug's Documented Contraindications: ${d.contraindications || 'None documented'}${patientContext}

Provide:
1. **Absolute Contraindications**: Conditions where this drug must never be used
2. **Relative Contraindications**: Conditions where risk-benefit analysis is required
3. **Severity Classification**: Rate each contraindication (Critical/Major/Moderate/Minor)
4. **Patient-Specific Risk**: ${patient_id ? 'Assess risk based on patient profile provided' : 'General population risk assessment'}
5. **Management Strategies**: How to manage or mitigate each contraindication
6. **Alternative Recommendations**: Safer alternatives when contraindicated
7. **Monitoring Protocol**: Required monitoring if used despite contraindications`;

    const aiResult = await queryOpenRouter(prompt, 'You are a clinical pharmacologist specializing in drug safety, contraindications, and risk management. Provide evidence-based, patient-safety-focused analysis.');
    const parsedJson = parseAIJson(aiResult.result);

    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ai_results) VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.id, 'AI_CONTRAINDICATION_CHECK', 'drug', drug_id, JSON.stringify({ drug: d.name, patient_id: patient_id || null }), JSON.stringify({ raw: aiResult.result, parsed: parsedJson })]
    );

    res.json({ drug: d, contraindications: contraindications.rows, patient: patient || null, ai_analysis: aiResult.result, ai_json: parsedJson });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pregnancy/ai-assess
// Accepts { drug_id }
// Fetches drug + pregnancy safety data
// Returns FDA category, risk assessment, safer alternatives
router.post('/pregnancy/ai-assess', auth, aiRateLimiter, async (req, res) => {
  try {
    const { drug_id } = req.body;
    if (!drug_id) return res.status(400).json({ error: 'drug_id is required' });

    const drug = await pool.query('SELECT * FROM drugs WHERE id = $1', [drug_id]);
    if (drug.rows.length === 0) return res.status(404).json({ error: 'Drug not found' });
    const d = drug.rows[0];

    const pregnancySafety = await pool.query(
      'SELECT * FROM pregnancy_safety WHERE drug_id = $1',
      [drug_id]
    );
    const ps = pregnancySafety.rows[0] || null;

    const safetyContext = ps
      ? `FDA Category: ${ps.fda_category}, Trimester Risk: ${ps.trimester_risk || 'N/A'}, Lactation Risk: ${ps.lactation_risk || 'N/A'}, Description: ${ps.description || 'N/A'}, Pregnancy Alternatives: ${ps.alternatives_during_pregnancy || 'N/A'}`
      : 'No pregnancy safety data documented in database.';

    const prompt = `Comprehensive Pregnancy Safety Assessment for ${d.name} (${d.generic_name}, Class: ${d.drug_class}):

Database Safety Record:
${safetyContext}

Provide:
1. **FDA Pregnancy Category**: Current category with explanation
2. **Trimester-Specific Risk**: Risk assessment for each trimester (T1/T2/T3)
3. **Teratogenicity Assessment**: Known or potential teratogenic effects with evidence level
4. **Lactation Safety**: Breastfeeding risk (L1-L5 Hale's scale), milk transfer, infant risk
5. **Safer Alternatives**: Ranked list of safer alternatives by trimester
6. **Clinical Management**: When the drug may still be justified despite risk, and how to minimize harm
7. **Patient Counseling Points**: Key information to share with pregnant patients
8. **Monitoring Requirements**: Maternal and fetal monitoring if drug is used`;

    const aiResult = await queryOpenRouter(prompt, 'You are a maternal-fetal medicine pharmacologist and clinical toxicologist specializing in medication safety during pregnancy and lactation.');
    const parsedJson = parseAIJson(aiResult.result);

    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ai_results) VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.id, 'AI_PREGNANCY_ASSESS', 'drug', drug_id, JSON.stringify({ drug: d.name }), JSON.stringify({ raw: aiResult.result, parsed: parsedJson })]
    );

    res.json({ drug: d, pregnancy_safety_data: ps, ai_analysis: aiResult.result, ai_json: parsedJson });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/dosage/ai-calculate
// Accepts { drug_id, patient_weight_kg, patient_age_years, renal_function (0-100) }
// Returns adjusted dosage recommendation
router.post('/dosage/ai-calculate', auth, aiRateLimiter, async (req, res) => {
  try {
    const { drug_id, patient_weight_kg, patient_age_years, renal_function } = req.body;
    if (!drug_id) return res.status(400).json({ error: 'drug_id is required' });
    if (patient_weight_kg === undefined || patient_weight_kg === null) {
      return res.status(400).json({ error: 'patient_weight_kg is required' });
    }
    if (patient_age_years === undefined || patient_age_years === null) {
      return res.status(400).json({ error: 'patient_age_years is required' });
    }

    const drug = await pool.query('SELECT * FROM drugs WHERE id = $1', [drug_id]);
    if (drug.rows.length === 0) return res.status(404).json({ error: 'Drug not found' });
    const d = drug.rows[0];

    const dosageGuidelines = await pool.query(
      'SELECT * FROM dosage_guidelines WHERE drug_id = $1 ORDER BY age_group',
      [drug_id]
    );

    const guidelinesText = dosageGuidelines.rows.length > 0
      ? dosageGuidelines.rows.map(g => `- ${g.age_group}: ${g.min_dose}-${g.max_dose} ${g.dose_unit} ${g.frequency} (${g.route}), Indication: ${g.indication}, Notes: ${g.special_instructions || 'None'}`).join('\n')
      : 'No standard dosage guidelines documented in database.';

    const renalFunctionDesc = renal_function !== undefined && renal_function !== null
      ? `${renal_function}% (${renal_function >= 60 ? 'Normal' : renal_function >= 30 ? 'Mild-Moderate Impairment' : renal_function >= 15 ? 'Severe Impairment' : 'Kidney Failure/ESRD'})`
      : 'Not provided (assume normal)';

    const prompt = `Patient-Specific Dosage Calculation for ${d.name} (${d.generic_name}, Class: ${d.drug_class}):

Patient Parameters:
- Age: ${patient_age_years} years
- Weight: ${patient_weight_kg} kg
- Renal Function (eGFR %): ${renalFunctionDesc}

Standard Dosage Guidelines from Database:
${guidelinesText}

Calculate and provide:
1. **Recommended Dose**: Specific dose in mg (or appropriate unit) for this patient
2. **Dose Calculation Methodology**: Show weight-based or age-based calculation
3. **Renal Adjustment**: Specific dose reduction or interval extension based on renal function
4. **Loading Dose**: Whether applicable and if so, what amount
5. **Maintenance Dose**: Ongoing dosing schedule with frequency
6. **Maximum Safe Dose**: Do not exceed threshold for this patient
7. **Special Considerations**: Age-related (pediatric/geriatric), hepatic impact if relevant
8. **Monitoring Plan**: Drug levels, renal function, clinical parameters to monitor`;

    const aiResult = await queryOpenRouter(prompt, 'You are a clinical pharmacist and pharmacokinetics expert. Provide precise, evidence-based dosage calculations with clear methodology.');
    const parsedJson = parseAIJson(aiResult.result);

    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ai_results) VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.id, 'AI_DOSAGE_CALCULATE', 'drug', drug_id, JSON.stringify({ drug: d.name, weight: patient_weight_kg, age: patient_age_years, renal_function }), JSON.stringify({ raw: aiResult.result, parsed: parsedJson })]
    );

    res.json({
      drug: d,
      patient_parameters: { patient_weight_kg, patient_age_years, renal_function },
      dosage_guidelines: dosageGuidelines.rows,
      ai_analysis: aiResult.result,
      ai_json: parsedJson
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/food-interactions/ai-alert
// Accepts { drug_id }
// Fetches food_interactions data, returns clinical significance and foods to avoid with timing
router.post('/food-interactions/ai-alert', auth, aiRateLimiter, async (req, res) => {
  try {
    const { drug_id } = req.body;
    if (!drug_id) return res.status(400).json({ error: 'drug_id is required' });

    const drug = await pool.query('SELECT * FROM drugs WHERE id = $1', [drug_id]);
    if (drug.rows.length === 0) return res.status(404).json({ error: 'Drug not found' });
    const d = drug.rows[0];

    const foodInteractions = await pool.query(
      'SELECT * FROM food_interactions WHERE drug_id = $1 ORDER BY severity DESC',
      [drug_id]
    );

    const foodList = foodInteractions.rows.length > 0
      ? foodInteractions.rows.map(fi => `- ${fi.food_item}: Type: ${fi.interaction_type}, Severity: ${fi.severity}, Effect: ${fi.description || 'N/A'}, Recommendation: ${fi.recommendation || 'N/A'}`).join('\n')
      : 'No food interactions documented in database.';

    const prompt = `Comprehensive Drug-Food Interaction Alert for ${d.name} (${d.generic_name}, Class: ${d.drug_class}):

Documented Food Interactions:
${foodList}

Provide:
1. **Critical Food Interactions**: Foods that must be completely avoided with clinical rationale
2. **Foods to Limit**: Foods that should be limited and to what extent
3. **Timing Recommendations**: How long before/after taking the drug to avoid specific foods
4. **Mechanism of Interaction**: How each food affects drug absorption, metabolism, or effect
5. **Clinical Significance**: Real-world impact (e.g., grapefruit CYP3A4 inhibition causing toxicity)
6. **Safe Foods/Beverages**: What is safe to consume with this medication
7. **Patient Counseling Script**: Clear, patient-friendly language for educating patients
8. **Food-Drug Interaction Severity Rating**: Overall alert level (Critical/High/Moderate/Low)`;

    const aiResult = await queryOpenRouter(prompt, 'You are a clinical pharmacist specializing in drug-food interactions, patient counseling, and clinical nutrition. Provide practical, actionable guidance.');
    const parsedJson = parseAIJson(aiResult.result);

    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ai_results) VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.id, 'AI_FOOD_INTERACTION_ALERT', 'drug', drug_id, JSON.stringify({ drug: d.name }), JSON.stringify({ raw: aiResult.result, parsed: parsedJson })]
    );

    res.json({ drug: d, food_interactions: foodInteractions.rows, ai_analysis: aiResult.result, ai_json: parsedJson });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/alternatives/ai-suggest
// Accepts { drug_id, reason }
// Fetches drug_alternatives, returns ranked alternatives with switchability score
router.post('/alternatives/ai-suggest', auth, aiRateLimiter, async (req, res) => {
  try {
    const { drug_id, reason } = req.body;
    if (!drug_id) return res.status(400).json({ error: 'drug_id is required' });

    const drug = await pool.query('SELECT * FROM drugs WHERE id = $1', [drug_id]);
    if (drug.rows.length === 0) return res.status(404).json({ error: 'Drug not found' });
    const d = drug.rows[0];

    const alternatives = await pool.query(`
      SELECT da.*, d2.name as alt_name, d2.generic_name as alt_generic, d2.drug_class as alt_class,
             d2.fda_status, d2.description as alt_description
      FROM drug_alternatives da
      JOIN drugs d2 ON da.alternative_drug_id = d2.id
      WHERE da.original_drug_id = $1
      ORDER BY da.preference_rank ASC
    `, [drug_id]);

    const altList = alternatives.rows.length > 0
      ? alternatives.rows.map(a => `- ${a.alt_name} (${a.alt_generic}), Class: ${a.alt_class}, FDA Status: ${a.fda_status}, Rank: ${a.preference_rank}, Efficacy: ${a.efficacy_comparison || 'N/A'}, Cost: ${a.cost_comparison || 'N/A'}, Reason for Alt: ${a.reason || 'N/A'}`).join('\n')
      : 'No alternatives documented in database.';

    const prompt = `Therapeutic Alternative Suggestion for ${d.name} (${d.generic_name}, Class: ${d.drug_class}):

Reason for Switch: ${reason || 'Not specified'}

Documented Alternatives in Database:
${altList}

Provide:
1. **Ranked Alternatives**: List alternatives ranked by switchability (1 = most preferred)
2. **Switchability Score**: Rate each alternative 1-10 based on: efficacy equivalence, safety profile, cost, availability
3. **Efficacy Comparison**: How each alternative compares therapeutically
4. **Safety Profile Comparison**: Key differences in side effect and risk profiles
5. **Reason-Specific Fit**: How well each alternative addresses the stated reason for switching (${reason || 'general'})
6. **Switching Protocol**: Step-by-step switching instructions (taper, cross-taper, washout if needed)
7. **Monitoring After Switch**: What to monitor during and after transition
8. **Patient Counseling**: Key points to tell the patient about the switch
9. **Cost-Effectiveness**: Brief cost comparison (brand vs generic options)`;

    const aiResult = await queryOpenRouter(prompt, 'You are a clinical pharmacologist and formulary specialist expert in therapeutic drug switching, efficacy comparison, and patient-centered medication management.');
    const parsedJson = parseAIJson(aiResult.result);

    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ai_results) VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.id, 'AI_ALTERNATIVE_SUGGEST', 'drug', drug_id, JSON.stringify({ drug: d.name, reason: reason || null }), JSON.stringify({ raw: aiResult.result, parsed: parsedJson })]
    );

    res.json({ drug: d, alternatives: alternatives.rows, reason: reason || null, ai_analysis: aiResult.result, ai_json: parsedJson });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/interactions/ai-multi-check
// Accepts { drug_ids: [..], patient_id (optional) }
// Returns multi-drug interaction analysis using existing interactions/drugs tables
router.post('/interactions/ai-multi-check', auth, aiRateLimiter, async (req, res) => {
  try {
    const { drug_ids, patient_id } = req.body;
    if (!Array.isArray(drug_ids) || drug_ids.length < 2) {
      return res.status(400).json({ error: 'drug_ids must be an array of at least 2 ids' });
    }

    const drugsResult = await pool.query('SELECT * FROM drugs WHERE id = ANY($1::int[])', [drug_ids]);
    if (drugsResult.rows.length < 2) {
      return res.status(404).json({ error: 'At least two valid drugs are required' });
    }

    const interactionsResult = await pool.query(
      `SELECT drug1_id AS drug_a_id, drug2_id AS drug_b_id, severity, description AS mechanism, management
         FROM drug_interactions
        WHERE drug1_id = ANY($1::int[]) AND drug2_id = ANY($1::int[])`,
      [drug_ids]
    );

    let patientContext = '';
    if (patient_id) {
      const p = await pool.query('SELECT * FROM patients WHERE id = $1', [patient_id]);
      if (p.rows.length > 0) {
        const pt = p.rows[0];
        const age = pt.date_of_birth
          ? new Date().getFullYear() - new Date(pt.date_of_birth).getFullYear()
          : 'Unknown';
        patientContext = `\n\nPatient Profile:\n- Age: ${age}, Weight: ${pt.weight_kg || 'N/A'}kg\n- Conditions: ${pt.medical_conditions || 'None documented'}\n- Allergies: ${pt.allergies || 'None documented'}`;
      }
    }

    const drugSummary = drugsResult.rows.map(d => `- ${d.name} (${d.generic_name}, class: ${d.drug_class})`).join('\n');
    const interactionSummary = interactionsResult.rows.length > 0
      ? interactionsResult.rows.map(i => `- ${i.drug_a_id} <-> ${i.drug_b_id}: ${i.severity} | ${i.mechanism || ''} | ${i.management || ''}`).join('\n')
      : 'No documented pairwise interactions in database.';

    const prompt = `Multi-Drug Interaction Analysis:

Medications:
${drugSummary}

Documented Interactions:
${interactionSummary}${patientContext}

Provide:
1. **Critical Interactions** with severity rating (Major/Moderate/Minor)
2. **Mechanism** for each interaction
3. **Patient-Specific Risk** (organ function, age, comorbidities)
4. **Cumulative Effect Assessment** across all combinations
5. **Management Strategy** (alternatives, dose adjustments, monitoring)
6. **Required Monitoring** parameters and frequency
7. **Counseling Points** for the patient`;

    const aiResult = await queryOpenRouter(prompt, 'You are a clinical pharmacologist specializing in polypharmacy, drug-drug interactions, and patient safety. Provide evidence-based, actionable analysis.');
    const parsedJson = parseAIJson(aiResult.result);

    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ai_results) VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.id, 'AI_MULTI_INTERACTION_CHECK', 'drug_set', null, JSON.stringify({ drug_ids, patient_id: patient_id || null }), JSON.stringify({ raw: aiResult.result, parsed: parsedJson })]
    );

    res.json({
      drugs: drugsResult.rows,
      documented_interactions: interactionsResult.rows,
      ai_analysis: aiResult.result,
      ai_json: parsedJson,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/geriatric/ai-risk
// Accepts { patient_id, drug_ids: [..] }
// Returns geriatric polypharmacy risk (falls, cognition, anticholinergic burden)
router.post('/geriatric/ai-risk', auth, aiRateLimiter, async (req, res) => {
  try {
    const { patient_id, drug_ids } = req.body;
    if (!patient_id) return res.status(400).json({ error: 'patient_id is required' });
    if (!Array.isArray(drug_ids) || drug_ids.length === 0) {
      return res.status(400).json({ error: 'drug_ids must be a non-empty array' });
    }

    const p = await pool.query('SELECT * FROM patients WHERE id = $1', [patient_id]);
    if (p.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
    const patient = p.rows[0];
    const age = patient.date_of_birth
      ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()
      : null;

    const drugsResult = await pool.query('SELECT * FROM drugs WHERE id = ANY($1::int[])', [drug_ids]);
    const drugSummary = drugsResult.rows.map(d => `- ${d.name} (${d.generic_name}, class: ${d.drug_class})`).join('\n');

    const prompt = `Geriatric Risk Assessment for Polypharmacy:

Patient Profile:
- Age: ${age ?? 'unknown'}
- Sex: ${patient.gender || 'N/A'}
- Weight: ${patient.weight_kg || 'N/A'}kg
- Renal function: ${patient.renal_function || 'unknown'}
- Hepatic function: ${patient.hepatic_function || 'unknown'}
- Comorbidities: ${patient.medical_conditions || 'None documented'}
- Allergies: ${patient.allergies || 'None documented'}

Current Medications:
${drugSummary}

Provide a geriatric-focused risk assessment using Beers Criteria, STOPP/START,
and anticholinergic burden frameworks:
1. **Beers Criteria flags** — list each drug that is potentially inappropriate in older adults
2. **Anticholinergic burden score** — total ACB and contributing drugs
3. **Fall risk** — drugs increasing fall risk and overall fall-risk score (Low/Med/High)
4. **Cognitive impairment risk** — drugs with cognitive side effects
5. **Renal/hepatic dose considerations**
6. **Deprescribing recommendations** — which drugs to consider stopping or substituting
7. **Monitoring plan**`;

    const aiResult = await queryOpenRouter(prompt, 'You are a board-certified geriatric clinical pharmacologist. Provide guideline-based, age-appropriate medication risk assessment.');
    const parsedJson = parseAIJson(aiResult.result);

    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ai_results) VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.id, 'AI_GERIATRIC_RISK', 'patient', patient_id, JSON.stringify({ drug_ids }), JSON.stringify({ raw: aiResult.result, parsed: parsedJson })]
    );

    res.json({
      patient,
      drugs: drugsResult.rows,
      ai_analysis: aiResult.result,
      ai_json: parsedJson,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clinical-trials/ai-match
// Audit-recommended (MECHANICAL): Clinical-trial matching
// PRODUCT-DECISION: Local in-memory + DB-backed catalog of eligibility_criteria; no live
// ClinicalTrials.gov fetch (would need creds + rate limits). The eligibility_criteria table is
// created on first request (CREATE TABLE IF NOT EXISTS) and seeded with a small starter set so
// the endpoint produces deterministic output on a fresh database.
// ENV: OPENROUTER_API_KEY — if unset, queryOpenRouter falls back to mock; we still surface a
// 503-style hint via response.ai_configured=false.
router.post('/clinical-trials/ai-match', auth, aiRateLimiter, async (req, res) => {
  try {
    const { patient_id, drug_id, condition } = req.body;

    // Bootstrap the catalog table additively
    await pool.query(`
      CREATE TABLE IF NOT EXISTS eligibility_criteria (
        id SERIAL PRIMARY KEY,
        trial_id VARCHAR(100) NOT NULL,
        title TEXT NOT NULL,
        condition VARCHAR(255),
        drug_focus VARCHAR(255),
        min_age INT,
        max_age INT,
        sex VARCHAR(20),
        inclusion TEXT,
        exclusion TEXT,
        phase VARCHAR(20),
        status VARCHAR(40) DEFAULT 'recruiting',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    const seedCheck = await pool.query('SELECT COUNT(*) FROM eligibility_criteria');
    if (parseInt(seedCheck.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO eligibility_criteria (trial_id, title, condition, drug_focus, min_age, max_age, sex, inclusion, exclusion, phase, status) VALUES
        ('NCT00000001', 'Statin Optimization in Diabetes', 'Type 2 Diabetes', 'atorvastatin', 40, 75, 'all', 'HbA1c 7.0-9.5; LDL >100', 'Severe hepatic impairment; pregnancy', 'III', 'recruiting'),
        ('NCT00000002', 'Anticoagulation Strategy in AFib', 'Atrial Fibrillation', 'apixaban', 50, 85, 'all', 'CHA2DS2-VASc >=2', 'Active major bleeding; CrCl <15', 'IV', 'recruiting'),
        ('NCT00000003', 'SSRI in Late-Life Depression', 'Major Depressive Disorder', 'sertraline', 65, 90, 'all', 'PHQ-9 >=10; geriatric', 'Recent MI; severe renal failure', 'III', 'recruiting'),
        ('NCT00000004', 'Pediatric Asthma Inhaler Study', 'Asthma', 'fluticasone', 6, 17, 'all', 'Persistent asthma; spirometry-confirmed', 'Recent oral steroid burst', 'II', 'recruiting')
      `);
    }

    // Pull patient context if provided
    let patient = null;
    if (patient_id) {
      const r = await pool.query('SELECT * FROM patients WHERE id = $1', [patient_id]);
      if (r.rows.length > 0) patient = r.rows[0];
    }

    // Pull drug context if provided
    let drug = null;
    if (drug_id) {
      const r = await pool.query('SELECT * FROM drugs WHERE id = $1', [drug_id]);
      if (r.rows.length > 0) drug = r.rows[0];
    }

    // Coarse SQL filter: condition match OR drug-focus match
    const conditions = [];
    const params = [];
    const cond = condition || patient?.medical_conditions || null;
    const drugName = drug?.generic_name || drug?.name || null;
    if (cond) { params.push(`%${cond}%`); conditions.push(`condition ILIKE $${params.length}`); }
    if (drugName) { params.push(`%${drugName}%`); conditions.push(`drug_focus ILIKE $${params.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' OR ')}` : '';
    const trialsResult = await pool.query(
      `SELECT * FROM eligibility_criteria ${where} ORDER BY created_at DESC LIMIT 25`,
      params
    );
    const trials = trialsResult.rows;

    if (trials.length === 0) {
      return res.json({
        patient: patient || null,
        drug: drug || null,
        condition: cond || null,
        candidate_trials: [],
        ai_analysis: 'No matching trials in local catalog.',
        ai_json: null,
        ai_configured: !!(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== 'your-openrouter-key-here'),
      });
    }

    const age = patient?.date_of_birth
      ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()
      : null;

    const trialList = trials.map(t =>
      `- ${t.trial_id} (${t.phase}, ${t.status}): ${t.title}\n  Condition: ${t.condition}; Drug focus: ${t.drug_focus}\n  Age: ${t.min_age}-${t.max_age}, Sex: ${t.sex}\n  Inclusion: ${t.inclusion}\n  Exclusion: ${t.exclusion}`
    ).join('\n\n');

    const patientCtx = patient
      ? `\n\nPatient: age ${age || 'unknown'}, sex ${patient.gender || 'N/A'}; conditions: ${patient.medical_conditions || 'none documented'}; allergies: ${patient.allergies || 'none documented'}.`
      : '';
    const drugCtx = drug ? `\nCurrent drug under review: ${drug.name} (${drug.generic_name}, class ${drug.drug_class}).` : '';

    const prompt = `Match the following clinical trials to the patient/drug context. For each trial assess eligibility (Eligible/Likely-Eligible/Ineligible/Insufficient-Data), state matching inclusion criteria, list disqualifying exclusion criteria, and rank top recommendations.

Trials:
${trialList}${patientCtx}${drugCtx}${cond ? `\nCondition focus: ${cond}` : ''}

Return JSON: {"matches":[{"trial_id":"","eligibility":"Eligible|Likely-Eligible|Ineligible|Insufficient-Data","matched_inclusion":["..."],"violated_exclusion":["..."],"score":0-100}],"recommendations":["..."],"summary":"..."}`;

    const aiResult = await queryOpenRouter(
      prompt,
      'You are a clinical research coordinator specializing in matching patients to interventional drug trials. Be conservative and patient-safety focused.'
    );
    const parsedJson = parseAIJson(aiResult.result);

    // Audit log insert — defensive: ai_results column may be missing on legacy DBs
    try {
      await pool.query(
        `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ai_results) VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.user.id, 'AI_CLINICAL_TRIAL_MATCH', 'patient', patient_id || null,
         JSON.stringify({ patient_id: patient_id || null, drug_id: drug_id || null, condition: cond, count: trials.length }),
         JSON.stringify({ raw: aiResult.result, parsed: parsedJson })]
      );
    } catch (logErr) {
      try {
        await pool.query(
          `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)`,
          [req.user.id, 'AI_CLINICAL_TRIAL_MATCH', 'patient', patient_id || null,
           JSON.stringify({ patient_id: patient_id || null, drug_id: drug_id || null, condition: cond, count: trials.length, ai_summary: (aiResult.result || '').slice(0, 4000) })]
        );
      } catch (_) { /* audit best-effort */ }
    }

    res.json({
      patient: patient || null,
      drug: drug || null,
      condition: cond || null,
      candidate_trials: trials,
      ai_analysis: aiResult.result,
      ai_json: parsedJson,
      ai_configured: !!(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== 'your-openrouter-key-here'),
    });
  } catch (err) {
    console.error('clinical-trials/ai-match error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
