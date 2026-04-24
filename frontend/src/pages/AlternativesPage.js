import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import AIAnalysis from '../components/AIAnalysis';
import { FormInput, FormSelect, FormTextarea, SubmitButton, PageHeader, SeverityBadge } from '../components/FormField';

const AlternativesPage = () => {
  const [items, setItems] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showAISuggest, setShowAISuggest] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiForm, setAiForm] = useState({ drug_id: '', reason: '' });
  const [formData, setFormData] = useState({
    original_drug_id: '', alternative_drug_id: '', reason: '',
    efficacy_comparison: '', cost_comparison: '', preference_rank: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [r1, r2] = await Promise.all([api.get('/alternatives'), api.get('/drugs')]);
      setItems(r1.data);
      setDrugs(r2.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const truncate = (s, n = 40) => s && s.length > n ? s.slice(0, n) + '...' : s;

  const columns = [
    { key: 'original_drug_name', label: 'Original Drug' },
    { key: 'alternative_drug_name', label: 'Alternative Drug' },
    { key: 'reason', label: 'Reason', render: (v) => truncate(v) || '—' },
    { key: 'efficacy_comparison', label: 'Efficacy' },
    { key: 'cost_comparison', label: 'Cost' },
    { key: 'preference_rank', label: 'Rank' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/alternatives/${editing.id}`, formData);
      } else {
        await api.post('/alternatives', formData);
      }
      setShowForm(false);
      setEditing(null);
      resetForm();
      fetchAll();
    } catch (e) { console.error(e); }
    setSubmitting(false);
  };

  const resetForm = () => setFormData({
    original_drug_id: '', alternative_drug_id: '', reason: '',
    efficacy_comparison: '', cost_comparison: '', preference_rank: ''
  });

  const handleEdit = (item) => {
    setEditing(item);
    setFormData({
      original_drug_id: item.original_drug_id || '', alternative_drug_id: item.alternative_drug_id || '',
      reason: item.reason || '', efficacy_comparison: item.efficacy_comparison || '',
      cost_comparison: item.cost_comparison || '', preference_rank: item.preference_rank || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/alternatives/${id}`); fetchAll(); } catch (e) { console.error(e); }
  };

  const handleRowClick = (item) => { setSelected(item); setShowDetail(true); };

  const runAISuggest = async (e) => {
    e.preventDefault();
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await api.post('/alternatives/ai-suggest', aiForm);
      setAiResult(res.data.analysis || res.data.result || JSON.stringify(res.data));
    } catch (e) { setAiResult('AI suggestion failed. Please try again.'); }
    setAiLoading(false);
  };

  const set = (k) => (e) => setFormData({ ...formData, [k]: e.target.value });

  if (loading) return <div style={{ color: '#64748b', padding: '40px', textAlign: 'center' }}>Loading...</div>;

  return (
    <div>
      <PageHeader title="Drug Alternatives" subtitle="Find therapeutic alternatives for medications" onAdd={() => { resetForm(); setEditing(null); setShowForm(true); }} addLabel="Add Alternative" />
      <div style={{ marginBottom: '16px' }}>
        <button onClick={() => { setAiResult(null); setAiForm({ drug_id: '', reason: '' }); setShowAISuggest(true); }} style={styles.aiTopBtn}>AI Suggest Alternatives</button>
      </div>
      <DataTable columns={columns} data={items} onRowClick={handleRowClick} onEdit={handleEdit} onDelete={handleDelete} />

      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditing(null); }} title={editing ? 'Edit Alternative' : 'Add Alternative'}>
        <form onSubmit={handleSubmit}>
          <FormSelect label="Original Drug" value={formData.original_drug_id} onChange={set('original_drug_id')} options={drugs.map(d => ({ value: d.id, label: d.name || d.generic_name }))} required />
          <FormSelect label="Alternative Drug" value={formData.alternative_drug_id} onChange={set('alternative_drug_id')} options={drugs.map(d => ({ value: d.id, label: d.name || d.generic_name }))} required />
          <FormTextarea label="Reason" value={formData.reason} onChange={set('reason')} />
          <FormInput label="Efficacy Comparison" value={formData.efficacy_comparison} onChange={set('efficacy_comparison')} />
          <FormInput label="Cost Comparison" value={formData.cost_comparison} onChange={set('cost_comparison')} />
          <FormInput label="Preference Rank" type="number" value={formData.preference_rank} onChange={set('preference_rank')} />
          <SubmitButton loading={submitting}>{editing ? 'Update' : 'Create'}</SubmitButton>
        </form>
      </Modal>

      <Modal isOpen={showAISuggest} onClose={() => setShowAISuggest(false)} title="AI Suggest Alternatives" wide>
        <form onSubmit={runAISuggest}>
          <FormSelect label="Drug" value={aiForm.drug_id} onChange={(e) => setAiForm({ ...aiForm, drug_id: e.target.value })} options={drugs.map(d => ({ value: d.id, label: d.name || d.generic_name }))} required />
          <FormTextarea label="Reason for Alternative" value={aiForm.reason} onChange={(e) => setAiForm({ ...aiForm, reason: e.target.value })} placeholder="e.g., Cost, side effects, allergy..." />
          <SubmitButton loading={aiLoading}>Get AI Suggestions</SubmitButton>
        </form>
        <AIAnalysis content={aiResult} loading={aiLoading} />
      </Modal>

      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title="Alternative Details" wide>
        {selected && (
          <div>
            <div style={styles.detailGrid}>
              <DetailItem label="Original Drug" value={selected.original_drug_name} />
              <DetailItem label="Alternative Drug" value={selected.alternative_drug_name} />
              <DetailItem label="Efficacy Comparison" value={selected.efficacy_comparison} />
              <DetailItem label="Cost Comparison" value={selected.cost_comparison} />
              <DetailItem label="Preference Rank" value={selected.preference_rank} />
            </div>
            {selected.reason && <div style={styles.descBox}><span style={styles.descLabel}>Reason</span><p style={styles.descText}>{selected.reason}</p></div>}
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

export default AlternativesPage;
