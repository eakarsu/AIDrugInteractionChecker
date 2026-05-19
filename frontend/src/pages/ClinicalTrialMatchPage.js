import React, { useState } from 'react';
import api from '../services/api';
import AIAnalysis from '../components/AIAnalysis';
import {
  FormInput,
  SubmitButton,
  PageHeader,
} from '../components/FormField';

const ClinicalTrialMatchPage = () => {
  const [patientId, setPatientId] = useState('');
  const [drugId, setDrugId] = useState('');
  const [condition, setCondition] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [aiJson, setAiJson] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setAiResult('');
    setAiJson(null);
    setMeta(null);
    try {
      const body = {};
      if (patientId) body.patient_id = parseInt(patientId, 10);
      if (drugId) body.drug_id = parseInt(drugId, 10);
      if (condition) body.condition = condition;
      const res = await api.post('/clinical-trials/ai-match', body);
      setAiResult(res.data.ai_analysis || '');
      setAiJson(res.data.ai_json || null);
      setMeta({
        candidate_trials: res.data.candidate_trials || [],
        ai_configured: res.data.ai_configured,
      });
    } catch (err) {
      const status = err.response?.status;
      if (status === 503) {
        setError(err.response?.data?.error || 'AI service unavailable. Set OPENROUTER_API_KEY on the backend.');
      } else {
        setError(err.response?.data?.error || err.message || 'Request failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Clinical Trial Matching"
        subtitle="Match patients/drugs against the local eligibility_criteria catalog (additive table)"
      />

      <div style={styles.card}>
        <form onSubmit={handleSubmit}>
          <FormInput label="Patient ID (optional)" type="number" value={patientId} onChange={(e) => setPatientId(e.target.value)} />
          <FormInput label="Drug ID (optional)" type="number" value={drugId} onChange={(e) => setDrugId(e.target.value)} />
          <FormInput label="Condition (optional)" type="text" value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="e.g. Type 2 Diabetes" />

          {error && <div style={styles.error}>{error}</div>}

          <SubmitButton loading={loading}>Match Trials</SubmitButton>
        </form>
      </div>

      {meta && (
        <div style={{ ...styles.card, marginTop: 16 }}>
          <div style={styles.sectionLabel}>Candidate Trials ({meta.candidate_trials.length})</div>
          <pre style={styles.pre}>{JSON.stringify(meta.candidate_trials, null, 2)}</pre>
          {meta.ai_configured === false && (
            <div style={{ ...styles.error, marginTop: 10 }}>AI not configured (mock response). Set OPENROUTER_API_KEY.</div>
          )}
        </div>
      )}

      <AIAnalysis content={aiResult} loading={loading} />

      {aiJson && (
        <div style={{ ...styles.card, marginTop: 16 }}>
          <div style={styles.sectionLabel}>Structured Match JSON</div>
          <pre style={styles.pre}>{JSON.stringify(aiJson, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

const styles = {
  card: { background: 'rgba(15, 23, 42, 0.5)', border: '1px solid #334155', borderRadius: '14px', padding: '20px' },
  sectionLabel: { fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' },
  error: { background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', padding: '10px 14px', color: '#f87171', fontSize: '13px', marginBottom: '12px' },
  pre: { fontSize: '12px', color: '#cbd5e1', background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '14px', overflow: 'auto', fontFamily: 'monospace', maxHeight: '320px' },
};

export default ClinicalTrialMatchPage;
