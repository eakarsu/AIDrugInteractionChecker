import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import AIAnalysis from '../components/AIAnalysis';
import {
  FormInput,
  FormSelect,
  FormTextarea,
  SubmitButton,
  PageHeader,
  SeverityBadge,
} from '../components/FormField';

const emptyForm = {
  drug_id: '',
  risk_level: '',
  beers_criteria: false,
  alert_type: '',
  description: '',
  dose_adjustment: '',
  monitoring_requirements: '',
};

const riskOptions = ['High', 'Moderate', 'Low'];

const GeriatricPage = () => {
  const [items, setItems] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiForm, setAiForm] = useState({ drug_id: '', patient_age: '', renal_function: '', polypharmacy_count: '' });

  const fetchData = async () => {
    try {
      const [res, drugRes] = await Promise.all([
        api.get('/geriatric'),
        api.get('/drugs'),
      ]);
      setItems(res.data.data || res.data);
      setDrugs(drugRes.data.data || drugRes.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const drugOptions = drugs.map((d) => ({
    value: d.id,
    label: d.generic_name || d.name || d.brand_name,
  }));

  const columns = [
    { key: 'drug_name', label: 'Drug' },
    {
      key: 'risk_level',
      label: 'Risk Level',
      render: (val) => <SeverityBadge severity={val} />,
    },
    {
      key: 'beers_criteria',
      label: 'Beers Criteria',
      render: (val) => (
        <span
          style={{
            display: 'inline-block',
            padding: '3px 10px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: '600',
            background: val ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
            border: `1px solid ${val ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
            color: val ? '#f87171' : '#4ade80',
          }}
        >
          {val ? 'Beers List' : 'Safe'}
        </span>
      ),
    },
    { key: 'alert_type', label: 'Alert Type' },
    {
      key: 'dose_adjustment',
      label: 'Dose Adjustment',
      render: (val) => (val && val.length > 50 ? val.substring(0, 50) + '...' : val || '—'),
    },
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const openAddModal = () => {
    setEditing(false);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditing(true);
    setFormData({
      drug_id: item.drug_id || '',
      risk_level: item.risk_level || '',
      beers_criteria: item.beers_criteria || false,
      alert_type: item.alert_type || '',
      description: item.description || '',
      dose_adjustment: item.dose_adjustment || '',
      monitoring_requirements: item.monitoring_requirements || '',
    });
    setSelectedItem(item);
    setShowDetail(false);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing && selectedItem) {
        await api.put(`/geriatric/${selectedItem.id}`, formData);
      } else {
        await api.post('/geriatric', formData);
      }
      setShowModal(false);
      setFormData(emptyForm);
      fetchData();
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/geriatric/${id}`);
      setShowDetail(false);
      fetchData();
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete.');
    }
  };

  const onRowClick = (row) => {
    setSelectedItem(row);
    setAiResult('');
    setShowDetail(true);
  };

  const handleAIAssess = async (e) => {
    e.preventDefault();
    setAiLoading(true);
    setAiResult('');
    try {
      const res = await api.post('/geriatric/ai-assess', aiForm);
      setAiResult(res.data.analysis || res.data.result || res.data.data || JSON.stringify(res.data));
    } catch (err) {
      console.error('AI assessment failed:', err);
      setAiResult('AI assessment failed. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAIFromDetail = async () => {
    if (!selectedItem) return;
    setAiLoading(true);
    setAiResult('');
    try {
      const res = await api.post('/geriatric/ai-assess', { drug_id: selectedItem.drug_id });
      setAiResult(res.data.analysis || res.data.result || res.data.data || JSON.stringify(res.data));
    } catch (err) {
      console.error('AI assessment failed:', err);
      setAiResult('AI assessment failed. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const detailRow = (label, value) => (
    <div style={styles.detailRow}>
      <span style={styles.detailLabel}>{label}</span>
      <span style={styles.detailValue}>{value || '—'}</span>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f1f5f9', marginBottom: '4px' }}>
            Geriatric Safety
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            Manage geriatric drug safety and Beers Criteria alerts
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => {
              setAiForm({ drug_id: '', patient_age: '', renal_function: '', polypharmacy_count: '' });
              setAiResult('');
              setAiLoading(false);
              setShowAIModal(true);
            }}
            style={styles.aiCheckBtn}
          >
            AI Geriatric Assessment
          </button>
          <button onClick={openAddModal} style={styles.addBtn}>
            + Add New
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={items}
        onRowClick={onRowClick}
        onEdit={(row) => openEditModal(row)}
        onDelete={(id) => {
          if (window.confirm('Are you sure you want to delete this record?')) {
            handleDelete(id);
          }
        }}
      />

      {/* Add / Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Geriatric Record' : 'Add New Geriatric Record'}
      >
        <form onSubmit={handleSubmit}>
          <FormSelect
            label="Drug"
            name="drug_id"
            value={formData.drug_id}
            onChange={handleChange}
            options={drugOptions}
          />
          <FormSelect
            label="Risk Level"
            name="risk_level"
            value={formData.risk_level}
            onChange={handleChange}
            options={riskOptions}
          />
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: '500', color: '#94a3b8', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Beers Criteria
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', fontSize: '14px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="beers_criteria"
                checked={formData.beers_criteria}
                onChange={handleChange}
                style={{ width: '16px', height: '16px', accentColor: '#3b82f6' }}
              />
              On Beers List
            </label>
          </div>
          <FormInput
            label="Alert Type"
            name="alert_type"
            value={formData.alert_type}
            onChange={handleChange}
            placeholder="e.g. Avoid, Use with caution"
          />
          <FormTextarea
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe the geriatric concern..."
          />
          <FormTextarea
            label="Dose Adjustment"
            name="dose_adjustment"
            value={formData.dose_adjustment}
            onChange={handleChange}
            placeholder="Recommended dose adjustments..."
          />
          <FormTextarea
            label="Monitoring Requirements"
            name="monitoring_requirements"
            value={formData.monitoring_requirements}
            onChange={handleChange}
            placeholder="Monitoring recommendations..."
          />
          <SubmitButton>{editing ? 'Update Record' : 'Add Record'}</SubmitButton>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title="Geriatric Record Details"
        wide
      >
        {selectedItem && (
          <div>
            <div style={styles.detailGrid}>
              {detailRow('Drug', selectedItem.drug_name)}
              {detailRow('Risk Level', <SeverityBadge severity={selectedItem.risk_level} />)}
              {detailRow('Beers Criteria', selectedItem.beers_criteria ? 'Yes - Beers List' : 'Safe')}
              {detailRow('Alert Type', selectedItem.alert_type)}
            </div>
            <div style={styles.detailSection}>
              <div style={styles.detailSectionLabel}>Description</div>
              <div style={styles.detailSectionText}>{selectedItem.description || '—'}</div>
            </div>
            <div style={styles.detailSection}>
              <div style={styles.detailSectionLabel}>Dose Adjustment</div>
              <div style={styles.detailSectionText}>{selectedItem.dose_adjustment || '—'}</div>
            </div>
            <div style={styles.detailSection}>
              <div style={styles.detailSectionLabel}>Monitoring Requirements</div>
              <div style={styles.detailSectionText}>{selectedItem.monitoring_requirements || '—'}</div>
            </div>

            <div style={styles.detailActions}>
              <button onClick={handleAIFromDetail} style={styles.aiBtn} disabled={aiLoading}>
                {aiLoading ? 'Analyzing...' : 'AI Assessment'}
              </button>
              <button onClick={() => openEditModal(selectedItem)} style={styles.editBtn}>
                Edit
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this record?')) {
                    handleDelete(selectedItem.id);
                  }
                }}
                style={styles.deleteBtn}
              >
                Delete
              </button>
            </div>

            <AIAnalysis content={aiResult} loading={aiLoading} />
          </div>
        )}
      </Modal>

      {/* AI Assessment Modal */}
      <Modal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        title="AI Geriatric Assessment"
        wide
      >
        <form onSubmit={handleAIAssess}>
          <FormSelect
            label="Drug"
            name="drug_id"
            value={aiForm.drug_id}
            onChange={(e) => setAiForm({ ...aiForm, drug_id: e.target.value })}
            options={drugOptions}
          />
          <FormInput
            label="Patient Age"
            name="patient_age"
            type="number"
            value={aiForm.patient_age}
            onChange={(e) => setAiForm({ ...aiForm, patient_age: e.target.value })}
            placeholder="e.g. 75"
          />
          <FormInput
            label="Renal Function"
            name="renal_function"
            value={aiForm.renal_function}
            onChange={(e) => setAiForm({ ...aiForm, renal_function: e.target.value })}
            placeholder="e.g. CrCl 45 mL/min"
          />
          <FormInput
            label="Polypharmacy Count"
            name="polypharmacy_count"
            type="number"
            value={aiForm.polypharmacy_count}
            onChange={(e) => setAiForm({ ...aiForm, polypharmacy_count: e.target.value })}
            placeholder="Number of concurrent medications"
          />
          <SubmitButton loading={aiLoading}>Run AI Assessment</SubmitButton>
        </form>
        <AIAnalysis content={aiResult} loading={aiLoading} />
      </Modal>
    </div>
  );
};

const styles = {
  addBtn: {
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 20px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    whiteSpace: 'nowrap',
  },
  aiCheckBtn: {
    background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 20px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    whiteSpace: 'nowrap',
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '20px',
  },
  detailRow: {
    background: 'rgba(15, 23, 42, 0.5)',
    borderRadius: '10px',
    padding: '12px 16px',
    border: '1px solid #334155',
  },
  detailLabel: {
    display: 'block',
    fontSize: '11px',
    fontWeight: '500',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    marginBottom: '4px',
  },
  detailValue: {
    fontSize: '14px',
    color: '#e2e8f0',
    fontWeight: '500',
  },
  detailSection: {
    background: 'rgba(15, 23, 42, 0.5)',
    borderRadius: '10px',
    padding: '14px 16px',
    border: '1px solid #334155',
    marginBottom: '12px',
  },
  detailSectionLabel: {
    fontSize: '11px',
    fontWeight: '500',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    marginBottom: '6px',
  },
  detailSectionText: {
    fontSize: '14px',
    color: '#cbd5e1',
    lineHeight: '1.6',
  },
  detailActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '20px',
    marginBottom: '4px',
  },
  aiBtn: {
    background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 20px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
  },
  editBtn: {
    background: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: '10px',
    padding: '10px 20px',
    color: '#60a5fa',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
  },
  deleteBtn: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '10px',
    padding: '10px 20px',
    color: '#f87171',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
  },
};

export default GeriatricPage;
