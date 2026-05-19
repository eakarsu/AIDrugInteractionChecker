import React, { useState, useEffect } from 'react';
import api from '../services/api';
import AIAnalysis from '../components/AIAnalysis';
import {
  FormSelect,
  SubmitButton,
  PageHeader,
} from '../components/FormField';

const GeriatricRiskPage = () => {
  const [drugs, setDrugs] = useState([]);
  const [patients, setPatients] = useState([]);
  const [drugIds, setDrugIds] = useState(['']);
  const [patientId, setPatientId] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [aiJson, setAiJson] = useState(null);
  const [patient, setPatient] = useState(null);
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
    if (drugIds.length <= 1) return;
    setDrugIds(drugIds.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!patientId) {
      setError('Please select a patient.');
      return;
    }
    const cleanIds = drugIds.filter(Boolean).map((id) => parseInt(id, 10));
    if (cleanIds.length === 0) {
      setError('Please select at least one medication.');
      return;
    }
    setError('');
    setLoading(true);
    setAiResult('');
    setAiJson(null);
    setPatient(null);
    try {
      const res = await api.post('/geriatric/ai-risk', {
        patient_id: parseInt(patientId, 10),
        drug_ids: cleanIds,
      });
      setAiResult(res.data.ai_analysis || '');
      setAiJson(res.data.ai_json || null);
      setPatient(res.data.patient || null);
    } catch (err) {
      console.error('Geriatric AI risk failed:', err);
      setError(err.response?.data?.error || err.message || 'Request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="AI Geriatric Polypharmacy Risk"
        subtitle="Beers Criteria, STOPP/START, and anticholinergic burden assessment"
      />

      <div style={styles.card}>
        <form onSubmit={handleSubmit}>
          <FormSelect
            label="Patient"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            options={patientOptions}
          />

          <div style={{ ...styles.sectionLabel, marginTop: '12px' }}>Current Medications</div>
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
              {drugIds.length > 1 && (
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
            + Add another medication
          </button>

          {error && <div style={styles.error}>{error}</div>}

          <SubmitButton loading={loading}>Run Geriatric Risk Assessment</SubmitButton>
        </form>
      </div>

      {patient && (
        <div style={{ ...styles.card, marginTop: '16px' }}>
          <div style={styles.sectionLabel}>Patient Snapshot</div>
          <div style={styles.grid}>
            <Field label="Name" value={`${patient.first_name || ''} ${patient.last_name || ''}`} />
            <Field label="Sex" value={patient.gender} />
            <Field label="Weight" value={patient.weight_kg ? `${patient.weight_kg} kg` : '—'} />
            <Field label="Renal" value={patient.renal_function} />
            <Field label="Hepatic" value={patient.hepatic_function} />
            <Field label="Conditions" value={patient.medical_conditions} />
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

const Field = ({ label, value }) => (
  <div style={{
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '10px',
    padding: '10px 14px',
  }}>
    <div style={{
      fontSize: '11px',
      color: '#64748b',
      textTransform: 'uppercase',
      letterSpacing: '0.03em',
      marginBottom: '4px',
    }}>{label}</div>
    <div style={{ fontSize: '14px', color: '#e2e8f0' }}>{value || '—'}</div>
  </div>
);

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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
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

export default GeriatricRiskPage;
