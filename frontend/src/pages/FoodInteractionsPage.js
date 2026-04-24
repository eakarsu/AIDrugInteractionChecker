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
  food_item: '',
  interaction_type: '',
  severity: '',
  description: '',
  recommendation: '',
};

const interactionTypeOptions = ['Pharmacokinetic', 'Pharmacodynamic', 'Absorption'];
const severityOptions = ['Major', 'Moderate', 'Minor'];

const FoodInteractionsPage = () => {
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
  const [aiCheckForm, setAiCheckForm] = useState({ drug_id: '', food_items: '' });

  const fetchData = async () => {
    try {
      const [mainRes, drugRes] = await Promise.all([
        api.get('/food-interactions'),
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
    { key: 'food_item', label: 'Food Item' },
    { key: 'interaction_type', label: 'Type' },
    {
      key: 'severity',
      label: 'Severity',
      render: (val) => <SeverityBadge severity={val} />,
    },
    {
      key: 'recommendation',
      label: 'Recommendation',
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
      drug_id: item.drug_id || '',
      food_item: item.food_item || '',
      interaction_type: item.interaction_type || '',
      severity: item.severity || '',
      description: item.description || '',
      recommendation: item.recommendation || '',
    });
    setSelectedItem(item);
    setShowDetail(false);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing && selectedItem) {
        await api.put(`/food-interactions/${selectedItem.id}`, formData);
      } else {
        await api.post('/food-interactions', formData);
      }
      setShowModal(false);
      setFormData(emptyForm);
      fetchData();
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save food interaction: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/food-interactions/${id}`);
      setShowDetail(false);
      fetchData();
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete food interaction.');
    }
  };

  const onRowClick = (row) => {
    setSelectedItem(row);
    setAiResult('');
    setShowDetail(true);
  };

  const runAICheck = async (drugId, foodItems) => {
    setAiLoading(true);
    setAiResult('');
    try {
      const res = await api.post('/food-interactions/ai-analyze', {
        drug_id: drugId,
        food_items: foodItems,
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
      runAICheck(selectedItem.drug_id, selectedItem.food_item);
    }
  };

  const handleAICheckModal = () => {
    setAiCheckForm({ drug_id: '', food_items: '' });
    setAiResult('');
    setAiLoading(false);
    setShowAICheckModal(true);
  };

  const handleAICheckSubmit = (e) => {
    e.preventDefault();
    if (aiCheckForm.drug_id && aiCheckForm.food_items) {
      runAICheck(aiCheckForm.drug_id, aiCheckForm.food_items);
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
            Food Interactions
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            Manage drug-food interactions and dietary recommendations
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleAICheckModal} style={styles.aiCheckBtn}>
            AI Food Check
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
          if (window.confirm('Are you sure you want to delete this food interaction?')) {
            handleDelete(id);
          }
        }}
      />

      {/* Add / Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Food Interaction' : 'Add New Food Interaction'}
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
            label="Food Item"
            name="food_item"
            value={formData.food_item}
            onChange={handleChange}
            placeholder="e.g. Grapefruit juice"
          />
          <FormSelect
            label="Interaction Type"
            name="interaction_type"
            value={formData.interaction_type}
            onChange={handleChange}
            options={interactionTypeOptions}
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
            placeholder="Describe the food interaction..."
          />
          <FormTextarea
            label="Recommendation"
            name="recommendation"
            value={formData.recommendation}
            onChange={handleChange}
            placeholder="Dietary recommendations..."
          />
          <SubmitButton>{editing ? 'Update Food Interaction' : 'Add Food Interaction'}</SubmitButton>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title="Food Interaction Details"
        wide
      >
        {selectedItem && (
          <div>
            <div style={styles.detailGrid}>
              {detailRow('Drug', selectedItem.drug_name)}
              {detailRow('Food Item', selectedItem.food_item)}
              {detailRow('Interaction Type', selectedItem.interaction_type)}
              {detailRow('Severity', <SeverityBadge severity={selectedItem.severity} />)}
            </div>
            <div style={styles.detailSection}>
              <div style={styles.detailSectionLabel}>Description</div>
              <div style={styles.detailSectionText}>{selectedItem.description || '—'}</div>
            </div>
            <div style={styles.detailSection}>
              <div style={styles.detailSectionLabel}>Recommendation</div>
              <div style={styles.detailSectionText}>{selectedItem.recommendation || '—'}</div>
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
                  if (window.confirm('Are you sure you want to delete this food interaction?')) {
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

      {/* AI Food Check Modal */}
      <Modal
        isOpen={showAICheckModal}
        onClose={() => setShowAICheckModal(false)}
        title="AI Food Interaction Check"
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
            label="Food Items"
            name="food_items"
            value={aiCheckForm.food_items}
            onChange={(e) => setAiCheckForm({ ...aiCheckForm, food_items: e.target.value })}
            placeholder="Enter food items (one per line)..."
          />
          <SubmitButton loading={aiLoading}>Run AI Food Check</SubmitButton>
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

export default FoodInteractionsPage;
