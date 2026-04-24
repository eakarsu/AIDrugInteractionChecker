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
  title: '',
  category: '',
  organization: '',
  summary: '',
  recommendations: '',
  evidence_grade: '',
  last_reviewed: '',
  source_url: '',
};

const gradeOptions = ['Grade A', 'Grade B', 'Grade C'];

const GuidelinesPage = () => {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiForm, setAiForm] = useState({ condition: '', patient_factors: '' });

  const fetchData = async () => {
    try {
      const res = await api.get('/guidelines');
      setItems(res.data.data || res.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns = [
    {
      key: 'title',
      label: 'Title',
      render: (val) => (val && val.length > 50 ? val.substring(0, 50) + '...' : val || '—'),
    },
    { key: 'category', label: 'Category' },
    { key: 'organization', label: 'Organization' },
    { key: 'evidence_grade', label: 'Evidence Grade' },
    {
      key: 'last_reviewed',
      label: 'Last Reviewed',
      render: (val) => (val ? new Date(val).toLocaleDateString() : '—'),
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
      title: item.title || '',
      category: item.category || '',
      organization: item.organization || '',
      summary: item.summary || '',
      recommendations: item.recommendations || '',
      evidence_grade: item.evidence_grade || '',
      last_reviewed: item.last_reviewed ? item.last_reviewed.substring(0, 10) : '',
      source_url: item.source_url || '',
    });
    setSelectedItem(item);
    setShowDetail(false);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing && selectedItem) {
        await api.put(`/guidelines/${selectedItem.id}`, formData);
      } else {
        await api.post('/guidelines', formData);
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
      await api.delete(`/guidelines/${id}`);
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

  const handleAIRecommend = async (e) => {
    e.preventDefault();
    setAiLoading(true);
    setAiResult('');
    try {
      const res = await api.post('/guidelines/ai-recommend', aiForm);
      setAiResult(res.data.analysis || res.data.result || res.data.data || JSON.stringify(res.data));
    } catch (err) {
      console.error('AI recommendation failed:', err);
      setAiResult('AI recommendation failed. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAIFromDetail = async () => {
    if (!selectedItem) return;
    setAiLoading(true);
    setAiResult('');
    try {
      const res = await api.post('/guidelines/ai-recommend', { condition: selectedItem.category || selectedItem.title });
      setAiResult(res.data.analysis || res.data.result || res.data.data || JSON.stringify(res.data));
    } catch (err) {
      console.error('AI recommendation failed:', err);
      setAiResult('AI recommendation failed. Please try again.');
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
            Clinical Guidelines
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            Manage clinical guidelines and evidence-based recommendations
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => {
              setAiForm({ condition: '', patient_factors: '' });
              setAiResult('');
              setAiLoading(false);
              setShowAIModal(true);
            }}
            style={styles.aiCheckBtn}
          >
            AI Recommend
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
          if (window.confirm('Are you sure you want to delete this guideline?')) {
            handleDelete(id);
          }
        }}
      />

      {/* Add / Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Guideline' : 'Add New Guideline'}
      >
        <form onSubmit={handleSubmit}>
          <FormInput
            label="Title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Guideline title..."
          />
          <FormInput
            label="Category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            placeholder="e.g. Cardiology, Oncology"
          />
          <FormInput
            label="Organization"
            name="organization"
            value={formData.organization}
            onChange={handleChange}
            placeholder="e.g. AHA, WHO, FDA"
          />
          <FormTextarea
            label="Summary"
            name="summary"
            value={formData.summary}
            onChange={handleChange}
            placeholder="Brief summary of the guideline..."
          />
          <FormTextarea
            label="Recommendations"
            name="recommendations"
            value={formData.recommendations}
            onChange={handleChange}
            placeholder="Key recommendations..."
          />
          <FormSelect
            label="Evidence Grade"
            name="evidence_grade"
            value={formData.evidence_grade}
            onChange={handleChange}
            options={gradeOptions}
          />
          <FormInput
            label="Last Reviewed"
            name="last_reviewed"
            type="date"
            value={formData.last_reviewed}
            onChange={handleChange}
          />
          <FormInput
            label="Source URL"
            name="source_url"
            value={formData.source_url}
            onChange={handleChange}
            placeholder="https://..."
          />
          <SubmitButton>{editing ? 'Update Guideline' : 'Add Guideline'}</SubmitButton>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title="Guideline Details"
        wide
      >
        {selectedItem && (
          <div>
            <div style={styles.detailGrid}>
              {detailRow('Title', selectedItem.title)}
              {detailRow('Category', selectedItem.category)}
              {detailRow('Organization', selectedItem.organization)}
              {detailRow('Evidence Grade', selectedItem.evidence_grade)}
              {detailRow('Last Reviewed', selectedItem.last_reviewed ? new Date(selectedItem.last_reviewed).toLocaleDateString() : '—')}
              {detailRow('Source URL', selectedItem.source_url ? (
                <a href={selectedItem.source_url} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline' }}>
                  {selectedItem.source_url}
                </a>
              ) : '—')}
            </div>
            <div style={styles.detailSection}>
              <div style={styles.detailSectionLabel}>Summary</div>
              <div style={styles.detailSectionText}>{selectedItem.summary || '—'}</div>
            </div>
            <div style={styles.detailSection}>
              <div style={styles.detailSectionLabel}>Recommendations</div>
              <div style={styles.detailSectionText}>{selectedItem.recommendations || '—'}</div>
            </div>

            <div style={styles.detailActions}>
              <button onClick={handleAIFromDetail} style={styles.aiBtn} disabled={aiLoading}>
                {aiLoading ? 'Analyzing...' : 'AI Recommend'}
              </button>
              <button onClick={() => openEditModal(selectedItem)} style={styles.editBtn}>
                Edit
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this guideline?')) {
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

      {/* AI Recommend Modal */}
      <Modal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        title="AI Guideline Recommendation"
        wide
      >
        <form onSubmit={handleAIRecommend}>
          <FormInput
            label="Condition"
            name="condition"
            value={aiForm.condition}
            onChange={(e) => setAiForm({ ...aiForm, condition: e.target.value })}
            placeholder="e.g. Hypertension, Type 2 Diabetes"
          />
          <FormTextarea
            label="Patient Factors"
            name="patient_factors"
            value={aiForm.patient_factors}
            onChange={(e) => setAiForm({ ...aiForm, patient_factors: e.target.value })}
            placeholder="Relevant patient factors (e.g. age, comorbidities, allergies)..."
          />
          <SubmitButton loading={aiLoading}>Get AI Recommendation</SubmitButton>
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

export default GuidelinesPage;
