const crypto = require('crypto');
const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { canonicalPair, evaluateMedicationSet, normalizeCode, pseudonymizePatientRef } = require('../services/evidenceEngine');

const router = express.Router();
router.use(auth);
const makeId = () => crypto.randomUUID();
const respondError = (res, error) => res.status(error.status || (error.code === '23505' ? 409 : 400)).json({ error: error.code === '23505' ? 'Idempotent request already exists' : error.message });

async function member(req, roles) {
  const workspaceId = req.params.workspaceId || req.body.workspaceId;
  const result = await pool.query('SELECT role FROM clinical_memberships WHERE workspace_id=$1 AND user_id=$2', [workspaceId, req.user.id]);
  if (!result.rows[0] || (roles && !roles.includes(result.rows[0].role))) { const error = new Error('Clinical workspace role is not authorized'); error.status=403; throw error; }
  return { workspaceId, role: result.rows[0].role };
}

router.post('/workspaces', async (req, res) => {
  try {
    if (!['admin','pharmacist','physician'].includes(req.user.role)) return res.status(403).json({ error: 'A verified clinical or administrator account is required to create a workspace' });
    const name = String(req.body.name || '').trim(); if (name.length < 3) throw new Error('name must contain at least 3 characters');
    const workspaceId = makeId(); const client = await pool.connect();
    try { await client.query('BEGIN'); await client.query('INSERT INTO clinical_workspaces(id,name,created_by) VALUES($1,$2,$3)', [workspaceId,name,req.user.id]); await client.query("INSERT INTO clinical_memberships(workspace_id,user_id,role) VALUES($1,$2,'clinical_lead')",[workspaceId,req.user.id]); await client.query("INSERT INTO clinical_audit_events(workspace_id,actor_user_id,action,entity_type,entity_id) VALUES($1,$2,'workspace.created','workspace',$1)",[workspaceId,req.user.id]); await client.query('COMMIT'); }
    catch(error){ await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    res.status(201).json({ id: workspaceId, name, role: 'clinical_lead' });
  } catch (error) { respondError(res,error); }
});

router.post('/workspaces/:workspaceId/members', async (req,res) => {
  try { const { workspaceId } = await member(req,['clinical_lead']); const role=String(req.body.role||''); if(!['pharmacist','clinician','data_steward','viewer'].includes(role)||!Number.isInteger(Number(req.body.userId))) throw new Error('valid userId and role are required'); await pool.query(`INSERT INTO clinical_memberships(workspace_id,user_id,role) VALUES($1,$2,$3) ON CONFLICT(workspace_id,user_id) DO UPDATE SET role=EXCLUDED.role`,[workspaceId,req.body.userId,role]); res.status(201).json({workspaceId,userId:Number(req.body.userId),role}); }
  catch(error){ respondError(res,error); }
});

router.post('/workspaces/:workspaceId/evidence', async (req,res) => {
  try {
    const { workspaceId } = await member(req,['clinical_lead','data_steward']);
    const [compoundA,compoundB]=canonicalPair(req.body.compoundA,req.body.compoundB);
    const required=['severity','summary','managementBoundary','citation','sourceUrl','sourcePublisher','sourceRetrievedAt','effectiveFrom','evidenceVersion','contentHash'];
    if(required.some(field=>!req.body[field])) throw new Error(`Missing required evidence fields: ${required.filter(field=>!req.body[field]).join(', ')}`);
    if(!/^[a-f0-9]{64}$/i.test(req.body.contentHash)) throw new Error('contentHash must be a SHA-256 hex digest');
    const evidenceId=makeId();
    await pool.query(`INSERT INTO curated_interaction_evidence
      (id,workspace_id,compound_a,compound_b,severity,summary,management_boundary,subgroup_criteria,citation,source_url,source_publisher,source_retrieved_at,effective_from,effective_until,evidence_version,content_hash,status,entered_by,reviewed_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
    [evidenceId,workspaceId,compoundA,compoundB,req.body.severity,req.body.summary,req.body.managementBoundary,req.body.subgroupCriteria||{},req.body.citation,req.body.sourceUrl,req.body.sourcePublisher,req.body.sourceRetrievedAt,req.body.effectiveFrom,req.body.effectiveUntil||null,req.body.evidenceVersion,req.body.contentHash,'draft',req.user.id,null]);
    res.status(201).json({id:evidenceId,status:'draft',compounds:[compoundA,compoundB],independentReviewRequired:true});
  } catch(error){ respondError(res,error); }
});

router.post('/workspaces/:workspaceId/evidence/:evidenceId/review', async (req,res) => {
  try {
    const { workspaceId } = await member(req,['clinical_lead','pharmacist']);
    if (req.body.approved !== true || String(req.body.rationale || '').trim().length < 12) throw new Error('Explicit approval and a meaningful rationale are required');
    const result = await pool.query(`UPDATE curated_interaction_evidence SET status='published',reviewed_by=$1
      WHERE id=$2 AND workspace_id=$3 AND status='draft' AND entered_by<>$1 RETURNING id,status,reviewed_by`, [req.user.id,req.params.evidenceId,workspaceId]);
    if (!result.rows[0]) return res.status(409).json({error:'Evidence is missing, already reviewed, or cannot be self-approved'});
    await pool.query("INSERT INTO clinical_audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,reason) VALUES($1,$2,'evidence.published','evidence',$3,$4)", [workspaceId,req.user.id,req.params.evidenceId,req.body.rationale]);
    res.json(result.rows[0]);
  } catch(error){ respondError(res,error); }
});

router.post('/workspaces/:workspaceId/cases', async (req,res) => {
  try {
    const { workspaceId }=await member(req,['clinical_lead','pharmacist','clinician']);
    if(req.body.consentConfirmed!==true||String(req.body.consentBasis||'').trim().length<8) throw new Error('Explicit consent confirmation and consentBasis are required');
    const idempotencyKey=req.get('Idempotency-Key'); if(!idempotencyKey) throw new Error('Idempotency-Key header is required');
    const existing=await pool.query('SELECT id,status FROM medication_review_cases WHERE workspace_id=$1 AND idempotency_key=$2',[workspaceId,idempotencyKey]);
    if(existing.rows[0]) return res.json({...existing.rows[0],duplicate:true});
    const medicationCodes=[...new Set((req.body.medicationCodes||[]).map(normalizeCode))];
    if(medicationCodes.length<2||medicationCodes.length>30) throw new Error('Between 2 and 30 medication codes are required');
    const caseId=makeId(); const patientHash=pseudonymizePatientRef(req.body.patientRef,process.env.CLINICAL_ID_HMAC_SECRET);
    await pool.query(`INSERT INTO medication_review_cases
      (id,workspace_id,patient_ref_hash,consent_basis,consent_recorded_at,medication_codes,patient_criteria,idempotency_key,created_by)
      VALUES($1,$2,$3,$4,NOW(),$5,$6,$7,$8)`,[caseId,workspaceId,patientHash,req.body.consentBasis,medicationCodes,req.body.patientCriteria||{},idempotencyKey,req.user.id]);
    res.status(201).json({id:caseId,status:'draft',patientRefStored:false});
  } catch(error){ respondError(res,error); }
});

router.post('/workspaces/:workspaceId/cases/:caseId/evaluate', async(req,res)=>{
  try {
    const {workspaceId}=await member(req,['clinical_lead','pharmacist','clinician']);
    const caseResult=await pool.query("SELECT * FROM medication_review_cases WHERE id=$1 AND workspace_id=$2 AND status='draft'",[req.params.caseId,workspaceId]);
    const reviewCase=caseResult.rows[0]; if(!reviewCase) return res.status(409).json({error:'Case is missing or already evaluated'});
    const evidence=await pool.query("SELECT * FROM curated_interaction_evidence WHERE workspace_id=$1 AND status='published'",[workspaceId]);
    const evaluation=evaluateMedicationSet(reviewCase.medication_codes,evidence.rows,reviewCase.patient_criteria);
    const client=await pool.connect();
    try { await client.query('BEGIN'); for(const finding of evaluation.findings){ await client.query(`INSERT INTO medication_review_findings(id,case_id,workspace_id,evidence_id,compound_a,compound_b,severity,summary,citation,source_url,evidence_version,finding_type) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'matched_evidence')`,[makeId(),reviewCase.id,workspaceId,finding.evidenceId,finding.compounds[0],finding.compounds[1],finding.severity,finding.summary,finding.citation,finding.sourceUrl,finding.evidenceVersion]); } for(const pair of evaluation.missingEvidence){ await client.query(`INSERT INTO medication_review_findings(id,case_id,workspace_id,compound_a,compound_b,finding_type) VALUES($1,$2,$3,$4,$5,'evidence_gap')`,[makeId(),reviewCase.id,workspaceId,pair[0],pair[1]]); } await client.query("UPDATE medication_review_cases SET status='evaluated',updated_at=NOW() WHERE id=$1",[reviewCase.id]); await client.query("INSERT INTO clinical_audit_events(workspace_id,actor_user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,'case.evaluated','case',$3,$4)",[workspaceId,req.user.id,reviewCase.id,{findings:evaluation.findings.length,gaps:evaluation.missingEvidence.length}]); await client.query('COMMIT'); }
    catch(error){await client.query('ROLLBACK');throw error;} finally{client.release();}
    res.json({...evaluation,status:'evaluated',notice:'Evidence retrieval support only. Do not change therapy without qualified professional review.'});
  } catch(error){respondError(res,error);}
});

router.post('/workspaces/:workspaceId/cases/:caseId/review',async(req,res)=>{
  try { const {workspaceId}=await member(req,['clinical_lead','pharmacist','clinician']); if(!['reviewed','rejected'].includes(req.body.decision)||String(req.body.rationale||'').trim().length<12) throw new Error('decision and meaningful rationale are required'); const decisionId=makeId(); const client=await pool.connect(); try{await client.query('BEGIN'); const updated=await client.query("UPDATE medication_review_cases SET status=$1,updated_at=NOW() WHERE id=$2 AND workspace_id=$3 AND status='evaluated' RETURNING id",[req.body.decision,req.params.caseId,workspaceId]); if(!updated.rows[0]){const conflict=new Error('Case is missing or not awaiting review'); conflict.status=409; throw conflict;} await client.query(`INSERT INTO clinical_review_decisions(id,case_id,workspace_id,decision,rationale,reviewer_user_id) VALUES($1,$2,$3,$4,$5,$6)`,[decisionId,req.params.caseId,workspaceId,req.body.decision,req.body.rationale,req.user.id]); await client.query('COMMIT');}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();} res.json({id:decisionId,caseId:req.params.caseId,decision:req.body.decision}); }
  catch(error){respondError(res,error);}
});

router.get('/workspaces/:workspaceId/cases/:caseId',async(req,res)=>{
  try { const {workspaceId}=await member(req); const [reviewCase,findings,decision]=await Promise.all([pool.query('SELECT id,workspace_id,consent_basis,consent_recorded_at,medication_codes,patient_criteria,status,created_at,updated_at FROM medication_review_cases WHERE id=$1 AND workspace_id=$2',[req.params.caseId,workspaceId]),pool.query('SELECT * FROM medication_review_findings WHERE case_id=$1 AND workspace_id=$2 ORDER BY finding_type,severity',[req.params.caseId,workspaceId]),pool.query('SELECT * FROM clinical_review_decisions WHERE case_id=$1 AND workspace_id=$2',[req.params.caseId,workspaceId])]); if(!reviewCase.rows[0])return res.status(404).json({error:'Case not found'});res.json({case:reviewCase.rows[0],findings:findings.rows,decision:decision.rows[0]||null,clinicalDecision:false,professionalReviewRequired:reviewCase.rows[0].status!=='reviewed'}); }
  catch(error){respondError(res,error);}
});

module.exports=router;
