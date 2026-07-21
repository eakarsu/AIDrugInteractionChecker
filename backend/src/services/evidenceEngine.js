const crypto = require('crypto');

function normalizeCode(code) {
  const normalized = String(code || '').trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9_-]{1,19}:[A-Z0-9._-]{1,80}$/.test(normalized)) throw new Error('Medication codes must use SYSTEM:CODE format');
  return normalized;
}

function canonicalPair(a, b) {
  const pair = [normalizeCode(a), normalizeCode(b)].sort();
  if (pair[0] === pair[1]) throw new Error('An interaction pair requires two distinct medication codes');
  return pair;
}

function evidenceIsCurrent(evidence, at = new Date()) {
  if (evidence.status !== 'published' || !evidence.citation || !evidence.source_url || !evidence.effective_from) return false;
  const from = new Date(evidence.effective_from);
  const until = evidence.effective_until ? new Date(evidence.effective_until) : null;
  return from <= at && (!until || until >= at);
}

function appliesToCriteria(criteria = {}, patientCriteria = {}) {
  return Object.entries(criteria).every(([key, expected]) => {
    const actual = patientCriteria[key];
    return Array.isArray(expected) ? expected.includes(actual) : expected === actual;
  });
}

function evaluateMedicationSet(codes, evidenceRows, patientCriteria = {}, at = new Date()) {
  const unique = [...new Set(codes.map(normalizeCode))].sort();
  if (unique.length < 2 || unique.length > 30) throw new Error('Between 2 and 30 distinct medications are required');
  const findings = []; const missingEvidence = [];
  for (let i = 0; i < unique.length; i += 1) {
    for (let j = i + 1; j < unique.length; j += 1) {
      const pair = [unique[i], unique[j]];
      const matches = evidenceRows.filter(row => row.compound_a === pair[0] && row.compound_b === pair[1] && evidenceIsCurrent(row, at) && appliesToCriteria(row.subgroup_criteria || {}, patientCriteria));
      if (!matches.length) missingEvidence.push(pair);
      for (const row of matches) findings.push({ evidenceId: row.id, compounds: pair, severity: row.severity, summary: row.summary, managementBoundary: row.management_boundary, citation: row.citation, sourceUrl: row.source_url, evidenceVersion: row.evidence_version });
    }
  }
  return { findings, missingEvidence, professionalReviewRequired: true, clinicalDecision: false };
}

function pseudonymizePatientRef(patientRef, secret) {
  if (!patientRef || !secret) throw new Error('patientRef and pseudonymization secret are required');
  return crypto.createHmac('sha256', secret).update(String(patientRef)).digest('hex');
}

module.exports = { normalizeCode, canonicalPair, evidenceIsCurrent, evaluateMedicationSet, pseudonymizePatientRef };

