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
  fda_category: '',
  trimester_risk: '',
  lactation_risk: '',
  description: '',
  alternatives_during_pregnancy: '',
};

const fdaCategoryOptions = ['A', 'B', 'C', 'D', 'X'];

const FDACategoryBadge = ({ category }) => {
  const colorMap = {
    X: '#ef4444',
    D: '#f97316',
    C: '#eab308',
    B: '#22c55e',
    A: '#4ade80',
  };
  const color = colorMap[(category || '').toUpperCase()] || '#94a3b8';
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 12px',
        borderRadius: '20px',
        fontSize: '11px',
        fontWeight: '700',
        background: `${color}20`,
        border: `1px solid ${color}50`,
        color: color,
        textTransform: 'uppercase',
      }}
    >
      Category {category || 'N/A'}
    </span>
  );
};

const PregnancyPage = () => {
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
  const [aiCheckForm, setAiCheckForm] = useState({ drug_id: '', trimester: '', breastfeeding: false });

  const fetchData = async () => {
    try {
      const [mainRes, drugRes] = await Promise.all([
        api.get('/pregnancy'),
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
    {
      key: 'fda_category',
      label: 'FDA Category',
      render: (val) => <FDACategoryBadge category={val} />,
    },
    {
      key: 'trimester_risk',
      label: 'Trimester Risk',
      render: (val) =>
        val && val.length > 50 ? val.substring(0, 50) + '...' : val || '—',
    },
    { key: 'lactation_risk', label: 'Lactation Risk' },
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
      fda_category: item.fda_category || '',
      trimester_risk: item.trimester_risk || '',
      lactation_risk: item.lactation_risk || '',
      description: item.description || '',
      alternatives_during_pregnancy: item.alternatives_during_pregnancy || '',
    });
    setSelectedItem(item);
    setShowDetail(false);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing && selectedItem) {
        await api.put(`/pregnancy/${selectedItem.id}`, formData);
      } else {
        await api.post('/pregnancy', formData);
      }
      setShowModal(false);
      setFormData(emptyForm);
      fetchData();
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save pregnancy data: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/pregnancy/${id}`);
      setShowDetail(false);
      fetchData();
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete pregnancy record.');
    }
  };

  const onRowClick = (row) => {
    setSelectedItem(row);
    setAiResult('');
    setShowDetail(true);
  };

  const runAICheck = async (drugId, trimester, breastfeeding) => {
    setAiLoading(true);
    setAiResult('');
    try {
      const res = await api.post('/pregnancy/ai-check', {
        drug_id: drugId,
        trimester: trimester,
        breastfeeding: breastfeeding,
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
      runAICheck(selectedItem.drug_id, '1st', false);
    }
  };

  const handleAICheckModal = () => {
    setAiCheckForm({ drug_id: '', trimester: '', breastfeeding: false });
    setAiResult('');
    setAiLoading(false);
    setShowAICheckModal(true);
  };

  const handleAICheckSubmit = (e) => {
    e.preventDefault();
    if (aiCheckForm.drug_id) {
      runAICheck(aiCheckForm.drug_id, aiCheckForm.trimester, aiCheckForm.breastfeeding);
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
            Pregnancy Safety
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            Manage pregnancy and lactation drug safety information
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleAICheckModal} style={styles.aiCheckBtn}>
            AI Safety Check
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
          if (window.confirm('Are you sure you want to delete this pregnancy record?')) {
            handleDelete(id);
          }
        }}
      />

      {/* Add / Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Pregnancy Record' : 'Add New Pregnancy Record'}
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
            label="FDA Category"
            name="fda_category"
            value={formData.fda_category}
            onChange={handleChange}
            options={fdaCategoryOptions}
          />
          <FormTextarea
            label="Trimester Risk"
            name="trimester_risk"
            value={formData.trimester_risk}
            onChange={handleChange}
            placeholder="Risk assessment by trimester..."
          />
          <FormInput
            label="Lactation Risk"
            name="lactation_risk"
            value={formData.lactation_risk}
            onChange={handleChange}
            placeholder="e.g. Low risk, Compatible with breastfeeding"
          />
          <FormTextarea
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Additional details..."
          />
          <FormTextarea
            label="Alternatives During Pregnancy"
            name="alternatives_during_pregnancy"
            value={formData.alternatives_during_pregnancy}
            onChange={handleChange}
            placeholder="Safer alternative drugs..."
          />
          <SubmitButton>{editing ? 'Update Record' : 'Add Record'}</SubmitButton>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title="Pregnancy Safety Details"
        wide
      >
        {selectedItem && (
          <div>
            <div style={styles.detailGrid}>
              {detailRow('Drug', selectedItem.drug_name)}
              {detailRow('FDA Category', <FDACategoryBadge category={selectedItem.fda_category} />)}
              {detailRow('Lactation Risk', selectedItem.lactation_risk)}
            </div>
            <div style={styles.detailSection}>
              <div style={styles.detailSectionLabel}>Trimester Risk</div>
              <div style={styles.detailSectionText}>{selectedItem.trimester_risk || '—'}</div>
            </div>
            <div style={styles.detailSection}>
              <div style={styles.detailSectionLabel}>Description</div>
              <div style={styles.detailSectionText}>{selectedItem.description || '—'}</div>
            </div>
            <div style={styles.detailSection}>
              <div style={styles.detailSectionLabel}>Alternatives During Pregnancy</div>
              <div style={styles.detailSectionText}>{selectedItem.alternatives_during_pregnancy || '—'}</div>
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
                  if (window.confirm('Are you sure you want to delete this pregnancy record?')) {
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

      {/* AI Safety Check Modal */}
      <Modal
        isOpen={showAICheckModal}
        onClose={() => setShowAICheckModal(false)}
        title="AI Pregnancy Safety Check"
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
          <FormSelect
            label="Trimester"
            name="trimester"
            value={aiCheckForm.trimester}
            onChange={(e) => setAiCheckForm({ ...aiCheckForm, trimester: e.target.value })}
            options={['1st', '2nd', '3rd']}
          />
          <div style={{ marginBottom: '14px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '14px',
              color: '#e2e8f0',
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={aiCheckForm.breastfeeding}
                onChange={(e) => setAiCheckForm({ ...aiCheckForm, breastfeeding: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }}
              />
              Breastfeeding
            </label>
          </div>
          <SubmitButton loading={aiLoading}>Run AI Safety Check</SubmitButton>
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

export default PregnancyPage;
