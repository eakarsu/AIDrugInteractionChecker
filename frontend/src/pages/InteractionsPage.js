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
  drug1_id: '',
  drug2_id: '',
  severity: '',
  interaction_type: '',
  description: '',
  clinical_significance: '',
  management: '',
};

const severityOptions = ['Major', 'Moderate', 'Minor'];

const InteractionsPage = () => {
  const [items, setItems] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showAICheckModal, setShowAICheckModal] = useState(false);
  const [aiCheckForm, setAiCheckForm] = useState({ drug1_id: '', drug2_id: '' });

  const fetchData = async () => {
    try {
      const [intRes, drugRes] = await Promise.all([
        api.get('/interactions'),
        api.get('/drugs'),
      ]);
      setItems(intRes.data.data || intRes.data);
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
    { key: 'drug1_name', label: 'Drug 1' },
    { key: 'drug2_name', label: 'Drug 2' },
    {
      key: 'severity',
      label: 'Severity',
      render: (val) => <SeverityBadge severity={val} />,
    },
    { key: 'interaction_type', label: 'Type' },
    {
      key: 'clinical_significance',
      label: 'Clinical Significance',
      render: (val) =>
        val && val.length > 60 ? val.substring(0, 60) + '...' : val || '—',
    },
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openAddModal = () => {
    setEditing(false);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditing(true);
    setFormData({
      drug1_id: item.drug1_id || '',
      drug2_id: item.drug2_id || '',
      severity: item.severity || '',
      interaction_type: item.interaction_type || '',
      description: item.description || '',
      clinical_significance: item.clinical_significance || '',
      management: item.management || '',
    });
    setSelectedItem(item);
    setShowDetail(false);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing && selectedItem) {
        await api.put(`/interactions/${selectedItem.id}`, formData);
      } else {
        await api.post('/interactions', formData);
      }
      setShowModal(false);
      setFormData(emptyForm);
      fetchData();
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save interaction: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/interactions/${id}`);
      setShowDetail(false);
      fetchData();
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete interaction.');
    }
  };

  const onRowClick = (row) => {
    setSelectedItem(row);
    setAiResult(null);
    setShowDetail(true);
  };

  const runAICheck = async (drug1Id, drug2Id) => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await api.post('/interactions/ai-check', {
        drug1_id: drug1Id,
        drug2_id: drug2Id,
      });
      setAiResult(res.data.analysis || res.data.result || res.data.data || JSON.stringify(res.data));
    } catch (err) {
      console.error('AI check failed:', err);
      setAiResult('AI analysis failed. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAICheckFromDetail = () => {
    if (selectedItem) {
      runAICheck(selectedItem.drug1_id, selectedItem.drug2_id);
    }
  };

  const handleAICheckModal = () => {
    setAiCheckForm({ drug1_id: '', drug2_id: '' });
    setAiResult(null);
    setAiLoading(false);
    setShowAICheckModal(true);
  };

  const handleAICheckSubmit = (e) => {
    e.preventDefault();
    if (aiCheckForm.drug1_id && aiCheckForm.drug2_id) {
      runAICheck(aiCheckForm.drug1_id, aiCheckForm.drug2_id);
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
            Drug Interactions
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            Manage and analyze drug-drug interactions
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleAICheckModal} style={styles.aiCheckBtn}>
            AI Check Interaction
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
          if (window.confirm('Are you sure you want to delete this interaction?')) {
            handleDelete(id);
          }
        }}
      />

      {/* Add / Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Interaction' : 'Add New Interaction'}
      >
        <form onSubmit={handleSubmit}>
          <FormSelect
            label="Drug 1"
            name="drug1_id"
            value={formData.drug1_id}
            onChange={handleChange}
            options={drugOptions}
          />
          <FormSelect
            label="Drug 2"
            name="drug2_id"
            value={formData.drug2_id}
            onChange={handleChange}
            options={drugOptions}
          />
          <FormSelect
            label="Severity"
            name="severity"
            value={formData.severity}
            onChange={handleChange}
            options={severityOptions}
          />
          <FormInput
            label="Interaction Type"
            name="interaction_type"
            value={formData.interaction_type}
            onChange={handleChange}
            placeholder="e.g. Pharmacokinetic, Pharmacodynamic"
          />
          <FormTextarea
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe the interaction..."
          />
          <FormTextarea
            label="Clinical Significance"
            name="clinical_significance"
            value={formData.clinical_significance}
            onChange={handleChange}
            placeholder="Clinical significance details..."
          />
          <FormTextarea
            label="Management"
            name="management"
            value={formData.management}
            onChange={handleChange}
            placeholder="Management recommendations..."
          />
          <SubmitButton>{editing ? 'Update Interaction' : 'Add Interaction'}</SubmitButton>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title="Interaction Details"
        wide
      >
        {selectedItem && (
          <div>
            <div style={styles.detailGrid}>
              {detailRow('Drug 1', selectedItem.drug1_name)}
              {detailRow('Drug 2', selectedItem.drug2_name)}
              {detailRow('Severity', <SeverityBadge severity={selectedItem.severity} />)}
              {detailRow('Interaction Type', selectedItem.interaction_type)}
            </div>
            <div style={styles.detailSection}>
              <div style={styles.detailSectionLabel}>Description</div>
              <div style={styles.detailSectionText}>{selectedItem.description || '—'}</div>
            </div>
            <div style={styles.detailSection}>
              <div style={styles.detailSectionLabel}>Clinical Significance</div>
              <div style={styles.detailSectionText}>{selectedItem.clinical_significance || '—'}</div>
            </div>
            <div style={styles.detailSection}>
              <div style={styles.detailSectionLabel}>Management</div>
              <div style={styles.detailSectionText}>{selectedItem.management || '—'}</div>
            </div>

            <div style={styles.detailActions}>
              <button onClick={handleAICheckFromDetail} style={styles.aiBtn} disabled={aiLoading}>
                {aiLoading ? 'Analyzing...' : 'AI Analysis'}
              </button>
              <button onClick={() => openEditModal(selectedItem)} style={styles.editBtn}>
                Edit
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this interaction?')) {
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

      {/* AI Check Modal */}
      <Modal
        isOpen={showAICheckModal}
        onClose={() => setShowAICheckModal(false)}
        title="AI Check Interaction"
        wide
      >
        <form onSubmit={handleAICheckSubmit}>
          <FormSelect
            label="Drug 1"
            name="drug1_id"
            value={aiCheckForm.drug1_id}
            onChange={(e) => setAiCheckForm({ ...aiCheckForm, drug1_id: e.target.value })}
            options={drugOptions}
          />
          <FormSelect
            label="Drug 2"
            name="drug2_id"
            value={aiCheckForm.drug2_id}
            onChange={(e) => setAiCheckForm({ ...aiCheckForm, drug2_id: e.target.value })}
            options={drugOptions}
          />
          <SubmitButton loading={aiLoading}>Run AI Check</SubmitButton>
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

export default InteractionsPage;
