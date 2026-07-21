const assert=require('node:assert/strict');
const test=require('node:test');
const {canonicalPair,evaluateMedicationSet,pseudonymizePatientRef}=require('../services/evidenceEngine');
test('compound pairs normalize into stable order',()=>assert.deepEqual(canonicalPair('rxcui:2','rxcui:1'),['RXCUI:1','RXCUI:2']));
test('only current published cited evidence produces findings',()=>{const evidence=[{id:'e1',compound_a:'RXCUI:1',compound_b:'RXCUI:2',status:'published',citation:'Curated source',source_url:'https://example.test/evidence',effective_from:'2026-01-01',severity:'major',summary:'review interaction',management_boundary:'professional review',evidence_version:'1',subgroup_criteria:{}}];const result=evaluateMedicationSet(['RXCUI:1','RXCUI:2'],evidence,{},new Date('2026-07-18'));assert.equal(result.findings.length,1);assert.equal(result.professionalReviewRequired,true);assert.equal(result.clinicalDecision,false);});
test('an evidence gap is explicit rather than inferred by a model',()=>{const result=evaluateMedicationSet(['RXCUI:1','RXCUI:2'],[],{});assert.deepEqual(result.missingEvidence,[['RXCUI:1','RXCUI:2']]);});
test('patient references are deterministic pseudonyms',()=>{const secret='x'.repeat(32);assert.equal(pseudonymizePatientRef('patient-7',secret),pseudonymizePatientRef('patient-7',secret));assert.notEqual(pseudonymizePatientRef('patient-7',secret),'patient-7');});

