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
  condition: '',
  severity: '',
  description: '',
  evidence_level: '',
};

const severityOptions = ['Absolute', 'Relative'];
const evidenceOptions = ['Level A', 'Level B', 'Level C'];

const ContraindicationsPage = () => {
  const [items, setItems] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showAICheckModal, setShowAICheckModal] = useState(false);
  const [aiCheckForm, setAiCheckForm] = useState({ drug_id: '', patient_conditions: '' });

  const fetchData = async () => {
    try {
      const [mainRes, drugRes] = await Promise.all([
        api.get('/contraindications'),
        api.get('/drugs'),
      ]);
      setItems(mainRes.data.data || mainRes.data);
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
    { key: 'condition', label: 'Condition' },
    {
      key: 'severity',
      label: 'Severity',
      render: (val) => <SeverityBadge severity={val} />,
    },
    {
      key: 'description',
      label: 'Description',
      render: (val) =>
        val && val.length > 60 ? val.substring(0, 60) + '...' : val || '—',
    },
    { key: 'evidence_level', label: 'Evidence Level' },
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
      drug_id: item.drug_id || '',
      condition: item.condition || '',
      severity: item.severity || '',
      description: item.description || '',
      evidence_level: item.evidence_level || '',
    });
    setSelectedItem(item);
    setShowDetail(false);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing && selectedItem) {
        await api.put(`/contraindications/${selectedItem.id}`, formData);
      } else {
        await api.post('/contraindications', formData);
      }
      setShowModal(false);
      setFormData(emptyForm);
      fetchData();
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save contraindication: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/contraindications/${id}`);
      setShowDetail(false);
      fetchData();
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete contraindication.');
    }
  };

  const onRowClick = (row) => {
    setSelectedItem(row);
    setAiResult('');
    setShowDetail(true);
  };

  const runAICheck = async (drugId, patientConditions) => {
    setAiLoading(true);
    setAiResult('');
    try {
      const res = await api.post('/contraindications/ai-check', {
        drug_id: drugId,
        patient_conditions: patientConditions,
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
      runAICheck(selectedItem.drug_id, selectedItem.condition);
    }
  };

  const handleAICheckModal = () => {
    setAiCheckForm({ drug_id: '', patient_conditions: '' });
    setAiResult('');
    setAiLoading(false);
    setShowAICheckModal(true);
  };

  const handleAICheckSubmit = (e) => {
    e.preventDefault();
    if (aiCheckForm.drug_id && aiCheckForm.patient_conditions) {
      runAICheck(aiCheckForm.drug_id, aiCheckForm.patient_conditions);
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
            Contraindications
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            Manage drug contraindications and conditions
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleAICheckModal} style={styles.aiCheckBtn}>
            AI Check
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
          if (window.confirm('Are you sure you want to delete this contraindication?')) {
            handleDelete(id);
          }
        }}
      />

      {/* Add / Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Contraindication' : 'Add New Contraindication'}
      >
        <form onSubmit={handleSubmit}>
          <FormSelect
            label="Drug"
            name="drug_id"
            value={formData.drug_id}
            onChange={handleChange}
            options={drugOptions}
          />
          <FormInput
            label="Condition"
            name="condition"
            value={formData.condition}
            onChange={handleChange}
            placeholder="e.g. Severe hepatic impairment"
          />
          <FormSelect
            label="Severity"
            name="severity"
            value={formData.severity}
            onChange={handleChange}
            options={severityOptions}
          />
          <FormTextarea
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe the contraindication..."
          />
          <FormSelect
            label="Evidence Level"
            name="evidence_level"
            value={formData.evidence_level}
            onChange={handleChange}
            options={evidenceOptions}
          />
          <SubmitButton>{editing ? 'Update Contraindication' : 'Add Contraindication'}</SubmitButton>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title="Contraindication Details"
        wide
      >
        {selectedItem && (
          <div>
            <div style={styles.detailGrid}>
              {detailRow('Drug', selectedItem.drug_name)}
              {detailRow('Condition', selectedItem.condition)}
              {detailRow('Severity', <SeverityBadge severity={selectedItem.severity} />)}
              {detailRow('Evidence Level', selectedItem.evidence_level)}
            </div>
            <div style={styles.detailSection}>
              <div style={styles.detailSectionLabel}>Description</div>
              <div style={styles.detailSectionText}>{selectedItem.description || '—'}</div>
            </div>

            <div style={styles.detailActions}>
              <button onClick={handleAICheckFromDetail} style={styles.aiBtn} disabled={aiLoading}>
                {aiLoading ? 'Analyzing...' : 'AI Analyze'}
              </button>
              <button onClick={() => openEditModal(selectedItem)} style={styles.editBtn}>
                Edit
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this contraindication?')) {
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
        title="AI Check Contraindications"
        wide
      >
        <form onSubmit={handleAICheckSubmit}>
          <FormSelect
            label="Drug"
            name="drug_id"
            value={aiCheckForm.drug_id}
            onChange={(e) => setAiCheckForm({ ...aiCheckForm, drug_id: e.target.value })}
            options={drugOptions}
          />
          <FormTextarea
            label="Patient Conditions"
            name="patient_conditions"
            value={aiCheckForm.patient_conditions}
            onChange={(e) => setAiCheckForm({ ...aiCheckForm, patient_conditions: e.target.value })}
            placeholder="Enter patient conditions (one per line)..."
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

export default ContraindicationsPage;
