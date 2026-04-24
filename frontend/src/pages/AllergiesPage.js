import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import AIAnalysis from '../components/AIAnalysis';
import { FormInput, FormSelect, FormTextarea, SubmitButton, PageHeader, SeverityBadge } from '../components/FormField';

const AllergiesPage = () => {
  const [items, setItems] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showAICheck, setShowAICheck] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiForm, setAiForm] = useState({ drug_id: '', patient_id: '' });
  const [formData, setFormData] = useState({
    drug_id: '', patient_id: '', allergy_type: '', severity: '',
    reaction_description: '', verified: false, verified_date: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [r1, r2, r3] = await Promise.all([api.get('/allergies'), api.get('/drugs'), api.get('/patients')]);
      setItems(r1.data);
      setDrugs(r2.data);
      setPatients(r3.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const truncate = (s, n = 40) => s && s.length > n ? s.slice(0, n) + '...' : s;

  const BoolBadge = ({ value }) => (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600',
      background: value ? 'rgba(34, 197, 94, 0.15)' : 'rgba(100, 116, 139, 0.15)',
      border: `1px solid ${value ? 'rgba(34, 197, 94, 0.3)' : 'rgba(100, 116, 139, 0.3)'}`,
      color: value ? '#4ade80' : '#94a3b8'
    }}>{value ? 'Yes' : 'No'}</span>
  );

  const columns = [
    { key: 'drug_name', label: 'Drug' },
    { key: 'patient_name', label: 'Patient' },
    { key: 'allergy_type', label: 'Type' },
    { key: 'severity', label: 'Severity', render: (v) => <SeverityBadge severity={v} /> },
    { key: 'verified', label: 'Verified', render: (v) => <BoolBadge value={v} /> },
    { key: 'reaction_description', label: 'Reaction', render: (v) => truncate(v) || '—' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/allergies/${editing.id}`, formData);
      } else {
        await api.post('/allergies', formData);
      }
      setShowForm(false);
      setEditing(null);
      resetForm();
      fetchAll();
    } catch (e) { console.error(e); }
    setSubmitting(false);
  };

  const resetForm = () => setFormData({
    drug_id: '', patient_id: '', allergy_type: '', severity: '',
    reaction_description: '', verified: false, verified_date: ''
  });

  const handleEdit = (item) => {
    setEditing(item);
    setFormData({
      drug_id: item.drug_id || '', patient_id: item.patient_id || '', allergy_type: item.allergy_type || '',
      severity: item.severity || '', reaction_description: item.reaction_description || '',
      verified: item.verified || false, verified_date: item.verified_date?.slice(0, 10) || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/allergies/${id}`); fetchAll(); } catch (e) { console.error(e); }
  };

  const handleRowClick = (item) => { setSelected(item); setShowDetail(true); };

  const runAICheck = async (e) => {
    e.preventDefault();
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await api.post('/allergies/ai-check', aiForm);
      setAiResult(res.data.analysis || res.data.result || JSON.stringify(res.data));
    } catch (e) { setAiResult('AI check failed. Please try again.'); }
    setAiLoading(false);
  };

  const set = (k) => (e) => setFormData({ ...formData, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  if (loading) return <div style={{ color: '#64748b', padding: '40px', textAlign: 'center' }}>Loading...</div>;

  return (
    <div>
      <PageHeader title="Drug Allergies" subtitle="Cross-reactivity and allergy assessment" onAdd={() => { resetForm(); setEditing(null); setShowForm(true); }} addLabel="Add Allergy" />
      <div style={{ marginBottom: '16px' }}>
        <button onClick={() => { setAiResult(null); setAiForm({ drug_id: '', patient_id: '' }); setShowAICheck(true); }} style={styles.aiTopBtn}>AI Cross-Reactivity Check</button>
      </div>
      <DataTable columns={columns} data={items} onRowClick={handleRowClick} onEdit={handleEdit} onDelete={handleDelete} />

      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditing(null); }} title={editing ? 'Edit Allergy' : 'Add Allergy'}>
        <form onSubmit={handleSubmit}>
          <FormSelect label="Drug" value={formData.drug_id} onChange={set('drug_id')} options={drugs.map(d => ({ value: d.id, label: d.name || d.generic_name }))} required />
          <FormSelect label="Patient" value={formData.patient_id} onChange={set('patient_id')} options={patients.map(p => ({ value: p.id, label: p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim() }))} required />
          <FormSelect label="Allergy Type" value={formData.allergy_type} onChange={set('allergy_type')} options={['True Allergy', 'Drug Intolerance', 'Drug Sensitivity']} required />
          <FormSelect label="Severity" value={formData.severity} onChange={set('severity')} options={['Mild', 'Moderate', 'Severe']} required />
          <FormTextarea label="Reaction Description" value={formData.reaction_description} onChange={set('reaction_description')} />
          <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" checked={formData.verified} onChange={set('verified')} id="verified" style={{ accentColor: '#3b82f6' }} />
            <label htmlFor="verified" style={{ fontSize: '13px', color: '#94a3b8' }}>Verified</label>
          </div>
          <FormInput label="Verified Date" type="date" value={formData.verified_date} onChange={set('verified_date')} />
          <SubmitButton loading={submitting}>{editing ? 'Update' : 'Create'}</SubmitButton>
        </form>
      </Modal>

      <Modal isOpen={showAICheck} onClose={() => setShowAICheck(false)} title="AI Cross-Reactivity Check" wide>
        <form onSubmit={runAICheck}>
          <FormSelect label="Drug" value={aiForm.drug_id} onChange={(e) => setAiForm({ ...aiForm, drug_id: e.target.value })} options={drugs.map(d => ({ value: d.id, label: d.name || d.generic_name }))} required />
          <FormSelect label="Patient" value={aiForm.patient_id} onChange={(e) => setAiForm({ ...aiForm, patient_id: e.target.value })} options={patients.map(p => ({ value: p.id, label: p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim() }))} required />
          <SubmitButton loading={aiLoading}>Check Cross-Reactivity</SubmitButton>
        </form>
        <AIAnalysis content={aiResult} loading={aiLoading} />
      </Modal>

      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title="Allergy Details" wide>
        {selected && (
          <div>
            <div style={styles.detailGrid}>
              <DetailItem label="Drug" value={selected.drug_name} />
              <DetailItem label="Patient" value={selected.patient_name} />
              <DetailItem label="Allergy Type" value={selected.allergy_type} />
              <DetailItem label="Severity" value={selected.severity} badge />
              <DetailItem label="Verified" value={selected.verified ? 'Yes' : 'No'} />
              <DetailItem label="Verified Date" value={selected.verified_date ? new Date(selected.verified_date).toLocaleDateString() : '—'} />
            </div>
            {selected.reaction_description && <div style={styles.descBox}><span style={styles.descLabel}>Reaction Description</span><p style={styles.descText}>{selected.reaction_description}</p></div>}
          </div>
        )}
      </Modal>
    </div>
  );
};

const DetailItem = ({ label, value, badge }) => (
  <div style={{ marginBottom: '12px' }}>
    <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
    <div style={{ marginTop: '4px', color: '#f1f5f9', fontSize: '14px' }}>{badge ? <SeverityBadge severity={value} /> : (value || '—')}</div>
  </div>
);

const styles = {
  detailGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', marginBottom: '16px' },
  descBox: { background: '#0f172a', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid #334155' },
  descLabel: { fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' },
  descText: { color: '#cbd5e1', fontSize: '14px', lineHeight: '1.6', marginTop: '6px' },
  aiTopBtn: { background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
};

export default AllergiesPage;
