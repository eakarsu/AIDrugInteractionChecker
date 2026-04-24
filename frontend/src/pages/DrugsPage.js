import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { FormInput, FormSelect, FormTextarea, SubmitButton, PageHeader } from '../components/FormField';
import AIAnalysis from '../components/AIAnalysis';

const emptyForm = {
  name: '',
  generic_name: '',
  drug_class: '',
  category: '',
  manufacturer: '',
  fda_status: '',
  description: '',
  side_effects: '',
  contraindications: '',
};

const drugClassOptions = [
  'HMG-CoA Reductase Inhibitor',
  'Biguanide',
  'ACE Inhibitor',
  'Penicillin Antibiotic',
  'PPI',
  'Vitamin K Antagonist',
  'SSRI',
  'CCB',
  'Thyroid Hormone',
  'Beta Blocker',
  'Anticonvulsant',
  'Thiazide Diuretic',
  'Macrolide',
  'Corticosteroid',
  'Opioid Analgesic',
  'Fluoroquinolone',
  'Antiplatelet',
  'Beta-2 Agonist',
  'ARB',
];

const categoryOptions = [
  'Cardiovascular',
  'Endocrine',
  'Anti-infective',
  'GI',
  'Hematologic',
  'Psychiatric',
  'Neurologic',
  'Anti-inflammatory',
  'Pain Management',
  'Respiratory',
];

const fdaStatusOptions = ['Approved', 'Pending', 'Withdrawn'];

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'generic_name', label: 'Generic Name' },
  { key: 'drug_class', label: 'Drug Class' },
  { key: 'category', label: 'Category' },
  { key: 'fda_status', label: 'FDA Status' },
  { key: 'manufacturer', label: 'Manufacturer' },
];

const DrugsPage = () => {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [editing, setEditing] = useState(false);

  const fetchItems = async () => {
    try {
      const res = await api.get('/drugs');
      setItems(res.data);
    } catch (err) {
      console.error('Failed to fetch drugs:', err);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRowClick = (row) => {
    setSelectedItem(row);
    setAiResult('');
    setAiLoading(false);
    setShowDetail(true);
  };

  const handleAiAnalysis = async () => {
    if (!selectedItem) return;
    setAiLoading(true);
    setAiResult('');
    try {
      const res = await api.post(`/drugs/${selectedItem.id}/ai-info`);
      setAiResult(res.data.result || res.data.analysis || JSON.stringify(res.data));
    } catch (err) {
      setAiResult('Failed to retrieve AI analysis. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAdd = () => {
    setFormData(emptyForm);
    setEditing(false);
    setShowModal(true);
  };

  const handleEdit = () => {
    if (!selectedItem) return;
    setFormData({
      name: selectedItem.name || '',
      generic_name: selectedItem.generic_name || '',
      drug_class: selectedItem.drug_class || '',
      category: selectedItem.category || '',
      manufacturer: selectedItem.manufacturer || '',
      fda_status: selectedItem.fda_status || '',
      description: selectedItem.description || '',
      side_effects: selectedItem.side_effects || '',
      contraindications: selectedItem.contraindications || '',
    });
    setEditing(true);
    setShowDetail(false);
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    if (!window.confirm(`Are you sure you want to delete "${selectedItem.name}"?`)) return;
    try {
      await api.delete(`/drugs/${selectedItem.id}`);
      setShowDetail(false);
      setSelectedItem(null);
      fetchItems();
    } catch (err) {
      console.error('Failed to delete drug:', err);
      alert('Failed to delete drug.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing && selectedItem) {
        await api.put(`/drugs/${selectedItem.id}`, formData);
      } else {
        await api.post('/drugs', formData);
      }
      setShowModal(false);
      setFormData(emptyForm);
      setEditing(false);
      fetchItems();
    } catch (err) {
      console.error('Failed to save drug:', err);
      alert('Failed to save drug.');
    }
  };

  const handleTableDelete = async (id) => {
    try {
      await api.delete(`/drugs/${id}`);
      fetchItems();
    } catch (err) {
      console.error('Failed to delete drug:', err);
      alert('Failed to delete drug.');
    }
  };

  return (
    <div>
      <PageHeader
        title="Drug Database"
        subtitle="Manage and explore comprehensive drug information"
        onAdd={handleAdd}
        addLabel="Add New Drug"
      />

      <DataTable
        columns={columns}
        data={items}
        onRowClick={handleRowClick}
        onDelete={handleTableDelete}
      />

      {/* Detail Modal */}
      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title="Drug Details" wide>
        {selectedItem && (
          <div>
            <div style={styles.detailGrid}>
              <DetailField label="Name" value={selectedItem.name} />
              <DetailField label="Generic Name" value={selectedItem.generic_name} />
              <DetailField label="Drug Class" value={selectedItem.drug_class} />
              <DetailField label="Category" value={selectedItem.category} />
              <DetailField label="FDA Status" value={selectedItem.fda_status} />
              <DetailField label="Manufacturer" value={selectedItem.manufacturer} />
            </div>

            {selectedItem.description && (
              <DetailBlock label="Description" value={selectedItem.description} />
            )}
            {selectedItem.side_effects && (
              <DetailBlock label="Side Effects" value={selectedItem.side_effects} />
            )}
            {selectedItem.contraindications && (
              <DetailBlock label="Contraindications" value={selectedItem.contraindications} />
            )}

            <div style={styles.detailActions}>
              <button onClick={handleAiAnalysis} style={styles.aiButton} disabled={aiLoading}>
                AI Drug Analysis
              </button>
              <button onClick={handleEdit} style={styles.editButton}>
                Edit
              </button>
              <button onClick={handleDelete} style={styles.deleteButton}>
                Delete
              </button>
            </div>

            <AIAnalysis content={aiResult} loading={aiLoading} />
          </div>
        )}
      </Modal>

      {/* Form Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditing(false); }}
        title={editing ? 'Edit Drug' : 'Add New Drug'}
      >
        <form onSubmit={handleSubmit}>
          <FormInput
            label="Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter drug name"
            required
          />
          <FormInput
            label="Generic Name"
            name="generic_name"
            value={formData.generic_name}
            onChange={handleChange}
            placeholder="Enter generic name"
            required
          />
          <FormSelect
            label="Drug Class"
            name="drug_class"
            value={formData.drug_class}
            onChange={handleChange}
            options={drugClassOptions}
            required
          />
          <FormSelect
            label="Category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            options={categoryOptions}
            required
          />
          <FormInput
            label="Manufacturer"
            name="manufacturer"
            value={formData.manufacturer}
            onChange={handleChange}
            placeholder="Enter manufacturer"
          />
          <FormSelect
            label="FDA Status"
            name="fda_status"
            value={formData.fda_status}
            onChange={handleChange}
            options={fdaStatusOptions}
            required
          />
          <FormTextarea
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Enter drug description"
          />
          <FormTextarea
            label="Side Effects"
            name="side_effects"
            value={formData.side_effects}
            onChange={handleChange}
            placeholder="Enter known side effects"
          />
          <FormTextarea
            label="Contraindications"
            name="contraindications"
            value={formData.contraindications}
            onChange={handleChange}
            placeholder="Enter contraindications"
          />
          <SubmitButton>{editing ? 'Update Drug' : 'Add Drug'}</SubmitButton>
        </form>
      </Modal>
    </div>
  );
};

const DetailField = ({ label, value }) => (
  <div style={styles.detailField}>
    <span style={styles.detailLabel}>{label}</span>
    <span style={styles.detailValue}>{value || '—'}</span>
  </div>
);

const DetailBlock = ({ label, value }) => (
  <div style={styles.detailBlock}>
    <span style={styles.detailLabel}>{label}</span>
    <p style={styles.detailBlockText}>{value}</p>
  </div>
);

const styles = {
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
  },
  detailField: {
    background: '#0f172a',
    borderRadius: '10px',
    padding: '14px 16px',
    border: '1px solid #334155',
  },
  detailLabel: {
    display: 'block',
    fontSize: '11px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '6px',
  },
  detailValue: {
    fontSize: '14px',
    color: '#f1f5f9',
    fontWeight: '500',
  },
  detailBlock: {
    background: '#0f172a',
    borderRadius: '10px',
    padding: '14px 16px',
    border: '1px solid #334155',
    marginBottom: '12px',
  },
  detailBlockText: {
    fontSize: '14px',
    color: '#94a3b8',
    lineHeight: '1.6',
    margin: 0,
  },
  detailActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '20px',
    flexWrap: 'wrap',
  },
  aiButton: {
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 20px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
  },
  editButton: {
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
  deleteButton: {
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

export default DrugsPage;
