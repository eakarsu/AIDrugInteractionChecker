import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import AIAnalysis from '../components/AIAnalysis';
import { FormInput, FormSelect, FormTextarea, SubmitButton, PageHeader, SeverityBadge } from '../components/FormField';

const DosagePage = () => {
  const [items, setItems] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showAICalc, setShowAICalc] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCalcForm, setAiCalcForm] = useState({ drug_id: '', patient_id: '' });
  const [formData, setFormData] = useState({
    drug_id: '', indication: '', age_group: '', min_dose: '', max_dose: '',
    dose_unit: '', frequency: '', route: '', special_instructions: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [r1, r2, r3] = await Promise.all([
        api.get('/dosage'),
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
    { key: 'indication', label: 'Indication' },
    { key: 'age_group', label: 'Age Group' },
    { key: 'dose_range', label: 'Dose Range', render: (_, row) => `${row.min_dose || '—'} - ${row.max_dose || '—'} ${row.dose_unit || ''}` },
    { key: 'frequency', label: 'Frequency' },
    { key: 'route', label: 'Route' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/dosage/${editing.id}`, formData);
      } else {
        await api.post('/dosage', formData);
      }
      setShowForm(false);
      setEditing(null);
      resetForm();
      fetchAll();
    } catch (e) { console.error(e); }
    setSubmitting(false);
  };

  const resetForm = () => setFormData({
    drug_id: '', indication: '', age_group: '', min_dose: '', max_dose: '',
    dose_unit: '', frequency: '', route: '', special_instructions: ''
  });

  const handleEdit = (item) => {
    setEditing(item);
    setFormData({
      drug_id: item.drug_id || '', indication: item.indication || '', age_group: item.age_group || '',
      min_dose: item.min_dose || '', max_dose: item.max_dose || '', dose_unit: item.dose_unit || '',
      frequency: item.frequency || '', route: item.route || '', special_instructions: item.special_instructions || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/dosage/${id}`); fetchAll(); } catch (e) { console.error(e); }
  };

  const handleRowClick = (item) => {
    setSelected(item);
    setShowDetail(true);
  };

  const runAICalc = async (e) => {
    e.preventDefault();
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await api.post('/dosage/ai-calculate', aiCalcForm);
      setAiResult(res.data.analysis || res.data.result || JSON.stringify(res.data));
    } catch (e) { setAiResult('AI calculation failed. Please try again.'); }
    setAiLoading(false);
  };

  const set = (k) => (e) => setFormData({ ...formData, [k]: e.target.value });

  if (loading) return <div style={{ color: '#64748b', padding: '40px', textAlign: 'center' }}>Loading...</div>;

  return (
    <div>
      <PageHeader title="Dosage Guidelines" subtitle="AI-powered dosage recommendations" onAdd={() => { resetForm(); setEditing(null); setShowForm(true); }} addLabel="Add Dosage" />
      <div style={{ marginBottom: '16px' }}>
        <button onClick={() => { setAiResult(null); setAiCalcForm({ drug_id: '', patient_id: '' }); setShowAICalc(true); }} style={styles.aiTopBtn}>AI Calculate Dose</button>
      </div>
      <DataTable columns={columns} data={items} onRowClick={handleRowClick} onEdit={handleEdit} onDelete={handleDelete} />

      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditing(null); }} title={editing ? 'Edit Dosage' : 'Add Dosage'}>
        <form onSubmit={handleSubmit}>
          <FormSelect label="Drug" value={formData.drug_id} onChange={set('drug_id')} options={drugs.map(d => ({ value: d.id, label: d.name || d.generic_name }))} required />
          <FormInput label="Indication" value={formData.indication} onChange={set('indication')} required />
          <FormSelect label="Age Group" value={formData.age_group} onChange={set('age_group')} options={['Adult', 'Pediatric', 'Geriatric']} required />
          <FormInput label="Min Dose" type="number" value={formData.min_dose} onChange={set('min_dose')} />
          <FormInput label="Max Dose" type="number" value={formData.max_dose} onChange={set('max_dose')} />
          <FormInput label="Dose Unit" value={formData.dose_unit} onChange={set('dose_unit')} />
          <FormInput label="Frequency" value={formData.frequency} onChange={set('frequency')} />
          <FormInput label="Route" value={formData.route} onChange={set('route')} />
          <FormTextarea label="Special Instructions" value={formData.special_instructions} onChange={set('special_instructions')} />
          <SubmitButton loading={submitting}>{editing ? 'Update' : 'Create'}</SubmitButton>
        </form>
      </Modal>

      <Modal isOpen={showAICalc} onClose={() => setShowAICalc(false)} title="AI Dose Calculator" wide>
        <form onSubmit={runAICalc}>
          <FormSelect label="Drug" value={aiCalcForm.drug_id} onChange={(e) => setAiCalcForm({ ...aiCalcForm, drug_id: e.target.value })} options={drugs.map(d => ({ value: d.id, label: d.name || d.generic_name }))} required />
          <FormSelect label="Patient" value={aiCalcForm.patient_id} onChange={(e) => setAiCalcForm({ ...aiCalcForm, patient_id: e.target.value })} options={patients.map(p => ({ value: p.id, label: p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim() }))} required />
          <SubmitButton loading={aiLoading}>Calculate Dose</SubmitButton>
        </form>
        <AIAnalysis content={aiResult} loading={aiLoading} />
      </Modal>

      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title="Dosage Details" wide>
        {selected && (
          <div>
            <div style={styles.detailGrid}>
              <DetailItem label="Drug" value={selected.drug_name} />
              <DetailItem label="Indication" value={selected.indication} />
              <DetailItem label="Age Group" value={selected.age_group} />
              <DetailItem label="Dose Range" value={`${selected.min_dose || '—'} - ${selected.max_dose || '—'} ${selected.dose_unit || ''}`} />
              <DetailItem label="Frequency" value={selected.frequency} />
              <DetailItem label="Route" value={selected.route} />
            </div>
            {selected.special_instructions && <div style={styles.descBox}><span style={styles.descLabel}>Special Instructions</span><p style={styles.descText}>{selected.special_instructions}</p></div>}
          </div>
        )}
      </Modal>
    </div>
  );
};

const DetailItem = ({ label, value }) => (
  <div style={{ marginBottom: '12px' }}>
    <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
    <div style={{ marginTop: '4px', color: '#f1f5f9', fontSize: '14px' }}>{value || '—'}</div>
  </div>
);

const styles = {
  detailGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', marginBottom: '16px' },
  descBox: { background: '#0f172a', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid #334155' },
  descLabel: { fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' },
  descText: { color: '#cbd5e1', fontSize: '14px', lineHeight: '1.6', marginTop: '6px' },
  aiTopBtn: { background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
};

export default DosagePage;
