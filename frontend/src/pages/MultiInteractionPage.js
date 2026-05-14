import React, { useState, useEffect } from 'react';
import api from '../services/api';
import AIAnalysis from '../components/AIAnalysis';
import {
  FormSelect,
  SubmitButton,
  PageHeader,
} from '../components/FormField';

const MultiInteractionPage = () => {
  const [drugs, setDrugs] = useState([]);
  const [patients, setPatients] = useState([]);
  const [drugIds, setDrugIds] = useState(['', '', '']);
  const [patientId, setPatientId] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [aiJson, setAiJson] = useState(null);
  const [documentedInteractions, setDocumentedInteractions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      const [drugRes, patientRes] = await Promise.all([
        api.get('/drugs'),
        api.get('/patients'),
      ]);
      setDrugs(drugRes.data.data || drugRes.data);
      setPatients(patientRes.data.data || patientRes.data);
    } catch (err) {
      console.error('Failed to fetch reference data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const drugOptions = drugs.map((d) => ({
    value: d.id,
    label: d.generic_name || d.name || d.brand_name,
  }));

  const patientOptions = patients.map((p) => ({
    value: p.id,
    label: `${p.first_name || ''} ${p.last_name || ''} (#${p.id})`.trim(),
  }));

  const updateDrugAt = (index, value) => {
    const next = [...drugIds];
    next[index] = value;
    setDrugIds(next);
  };

  const addDrugSlot = () => setDrugIds([...drugIds, '']);
  const removeDrugSlot = (index) => {
    if (drugIds.length <= 2) return;
    setDrugIds(drugIds.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanIds = drugIds.filter(Boolean).map((id) => parseInt(id, 10));
    if (cleanIds.length < 2) {
      setError('Please select at least two drugs.');
      return;
    }
    setError('');
    setLoading(true);
    setAiResult('');
    setAiJson(null);
    setDocumentedInteractions([]);
    try {
      const res = await api.post('/interactions/ai-multi-check', {
        drug_ids: cleanIds,
        patient_id: patientId ? parseInt(patientId, 10) : undefined,
      });
      setAiResult(res.data.ai_analysis || '');
      setAiJson(res.data.ai_json || null);
      setDocumentedInteractions(res.data.documented_interactions || []);
    } catch (err) {
      console.error('AI multi-check failed:', err);
      setError(err.response?.data?.error || err.message || 'Request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="AI Multi-Drug Interaction Check"
        subtitle="Analyze interactions across multiple medications with optional patient context"
      />

      <div style={styles.card}>
        <form onSubmit={handleSubmit}>
          <div style={styles.sectionLabel}>Medications</div>
          {drugIds.map((id, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <FormSelect
                  label={`Drug ${i + 1}`}
                  value={id}
                  onChange={(e) => updateDrugAt(i, e.target.value)}
                  options={drugOptions}
                />
              </div>
              {drugIds.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeDrugSlot(i)}
                  style={styles.removeBtn}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addDrugSlot} style={styles.addSlotBtn}>
            + Add another drug
          </button>

          <div style={{ ...styles.sectionLabel, marginTop: '20px' }}>Patient (optional)</div>
          <FormSelect
            label="Patient Profile"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            options={patientOptions}
          />

          {error && <div style={styles.error}>{error}</div>}

          <SubmitButton loading={loading}>Run Multi-Drug Analysis</SubmitButton>
        </form>
      </div>

      {documentedInteractions.length > 0 && (
        <div style={{ ...styles.card, marginTop: '16px' }}>
          <div style={styles.sectionLabel}>
            Documented Pairwise Interactions ({documentedInteractions.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {documentedInteractions.map((inter, i) => (
              <div key={i} style={styles.interactionRow}>
                <span style={styles.detailValue}>
                  Drug #{inter.drug_a_id} ↔ Drug #{inter.drug_b_id}
                </span>
                <span style={styles.detailLabel}>
                  Severity: {inter.severity || '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <AIAnalysis content={aiResult} loading={loading} />

      {aiJson && (
        <div style={{ ...styles.card, marginTop: '16px' }}>
          <div style={styles.sectionLabel}>Structured JSON</div>
          <pre style={styles.pre}>{JSON.stringify(aiJson, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

const styles = {
  card: {
    background: 'rgba(15, 23, 42, 0.5)',
    border: '1px solid #334155',
    borderRadius: '14px',
    padding: '20px',
  },
  sectionLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '10px',
  },
  detailValue: {
    fontSize: '14px',
    color: '#e2e8f0',
    fontWeight: '500',
  },
  detailLabel: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  removeBtn: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '10px',
    padding: '8px 14px',
    color: '#f87171',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    marginBottom: '14px',
    height: '40px',
  },
  addSlotBtn: {
    background: 'rgba(139, 92, 246, 0.1)',
    border: '1px dashed rgba(139, 92, 246, 0.3)',
    borderRadius: '10px',
    padding: '8px 14px',
    color: '#a78bfa',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    width: '100%',
    marginBottom: '8px',
  },
  error: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '10px',
    padding: '10px 14px',
    color: '#f87171',
    fontSize: '13px',
    marginBottom: '12px',
  },
  interactionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#0f172a',
    borderRadius: '10px',
    padding: '10px 14px',
    border: '1px solid #334155',
  },
  pre: {
    fontSize: '12px',
    color: '#cbd5e1',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '10px',
    padding: '14px',
    overflow: 'auto',
    fontFamily: 'monospace',
    maxHeight: '320px',
  },
};

export default MultiInteractionPage;
