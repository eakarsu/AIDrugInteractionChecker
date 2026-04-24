import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import AIAnalysis from '../components/AIAnalysis';
import { FormInput, FormSelect, FormTextarea, SubmitButton, PageHeader, SeverityBadge } from '../components/FormField';

const AdverseReactionsPage = () => {
  const [items, setItems] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [formData, setFormData] = useState({
    drug_id: '', patient_id: '', reaction_type: '', severity: '', description: '',
    onset_date: '', reported_date: '', outcome: '', reporter: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [r1, r2, r3] = await Promise.all([
        api.get('/adverse-reactions'),
        api.get('/drugs'),
        api.get('/patients')
      ]);
      setItems(r1.data);
      setDrugs(r2.data);
      setPatients(r3.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const columns = [
    { key: 'drug_name', label: 'Drug' },
    { key: 'patient_name', label: 'Patient' },
    { key: 'reaction_type', label: 'Reaction Type' },
    { key: 'severity', label: 'Severity', render: (v) => <SeverityBadge severity={v} /> },
    { key: 'reported_date', label: 'Reported', render: (v) => v ? new Date(v).toLocaleDateString() : '—' },
    { key: 'outcome', label: 'Outcome' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/adverse-reactions/${editing.id}`, formData);
      } else {
        await api.post('/adverse-reactions', formData);
      }
      setShowForm(false);
      setEditing(null);
      resetForm();
      fetchAll();
    } catch (e) { console.error(e); }
    setSubmitting(false);
  };

  const resetForm = () => setFormData({
    drug_id: '', patient_id: '', reaction_type: '', severity: '', description: '',
    onset_date: '', reported_date: '', outcome: '', reporter: ''
  });

  const handleEdit = (item) => {
    setEditing(item);
    setFormData({
      drug_id: item.drug_id || '', patient_id: item.patient_id || '', reaction_type: item.reaction_type || '',
      severity: item.severity || '', description: item.description || '', onset_date: item.onset_date?.slice(0, 10) || '',
      reported_date: item.reported_date?.slice(0, 10) || '', outcome: item.outcome || '', reporter: item.reporter || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/adverse-reactions/${id}`); fetchAll(); } catch (e) { console.error(e); }
  };

  const handleRowClick = (item) => {
    setSelected(item);
    setAiResult(null);
    setShowDetail(true);
  };

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await api.post(`/adverse-reactions/${selected.id}/ai-analyze`);
      setAiResult(res.data.analysis || res.data.result || JSON.stringify(res.data));
    } catch (e) { setAiResult('AI analysis failed. Please try again.'); }
    setAiLoading(false);
  };

  const set = (k) => (e) => setFormData({ ...formData, [k]: e.target.value });

  if (loading) return <div style={{ color: '#64748b', padding: '40px', textAlign: 'center' }}>Loading...</div>;

  return (
    <div>
      <PageHeader title="Adverse Reactions" subtitle="Track and analyze adverse drug reactions" onAdd={() => { resetForm(); setEditing(null); setShowForm(true); }} addLabel="Add Reaction" />
      <DataTable columns={columns} data={items} onRowClick={handleRowClick} onEdit={handleEdit} onDelete={handleDelete} />

      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditing(null); }} title={editing ? 'Edit Adverse Reaction' : 'Add Adverse Reaction'}>
        <form onSubmit={handleSubmit}>
          <FormSelect label="Drug" value={formData.drug_id} onChange={set('drug_id')} options={drugs.map(d => ({ value: d.id, label: d.name || d.generic_name }))} required />
          <FormSelect label="Patient" value={formData.patient_id} onChange={set('patient_id')} options={patients.map(p => ({ value: p.id, label: p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim() }))} required />
          <FormInput label="Reaction Type" value={formData.reaction_type} onChange={set('reaction_type')} required />
          <FormSelect label="Severity" value={formData.severity} onChange={set('severity')} options={['Mild', 'Moderate', 'Severe']} required />
          <FormTextarea label="Description" value={formData.description} onChange={set('description')} />
          <FormInput label="Onset Date" type="date" value={formData.onset_date} onChange={set('onset_date')} />
          <FormInput label="Reported Date" type="date" value={formData.reported_date} onChange={set('reported_date')} />
          <FormSelect label="Outcome" value={formData.outcome} onChange={set('outcome')} options={['Resolved', 'Ongoing', 'Fatal', 'Unknown']} />
          <FormInput label="Reporter" value={formData.reporter} onChange={set('reporter')} />
          <SubmitButton loading={submitting}>{editing ? 'Update' : 'Create'}</SubmitButton>
        </form>
      </Modal>

      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title="Adverse Reaction Details" wide>
        {selected && (
          <div>
            <div style={styles.detailGrid}>
              <DetailItem label="Drug" value={selected.drug_name} />
              <DetailItem label="Patient" value={selected.patient_name} />
              <DetailItem label="Reaction Type" value={selected.reaction_type} />
              <DetailItem label="Severity" value={selected.severity} badge />
              <DetailItem label="Onset Date" value={selected.onset_date ? new Date(selected.onset_date).toLocaleDateString() : '—'} />
              <DetailItem label="Reported Date" value={selected.reported_date ? new Date(selected.reported_date).toLocaleDateString() : '—'} />
              <DetailItem label="Outcome" value={selected.outcome} />
              <DetailItem label="Reporter" value={selected.reporter} />
            </div>
            {selected.description && <div style={styles.descBox}><span style={styles.descLabel}>Description</span><p style={styles.descText}>{selected.description}</p></div>}
            <button onClick={runAI} disabled={aiLoading} style={styles.aiBtn}>AI Analyze Reaction</button>
            <AIAnalysis content={aiResult} loading={aiLoading} />
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
  aiBtn: { background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
};

export default AdverseReactionsPage;
