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
  gene: '',
  variant: '',
  metabolizer_status: '',
  recommendation: '',
  evidence_level: '',
  cpic_guideline: '',
};

const metabolizerOptions = [
  'Poor Metabolizer',
  'Intermediate Metabolizer',
  'Normal Metabolizer',
  'Rapid Metabolizer',
  'Ultrarapid Metabolizer',
];

const evidenceOptions = ['Level A', 'Level B', 'Level C'];

const PharmacogenomicsPage = () => {
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
  const [aiForm, setAiForm] = useState({ drug_id: '', gene_results: '' });

  const fetchData = async () => {
    try {
      const [res, drugRes] = await Promise.all([
        api.get('/pharmacogenomics'),
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
    { key: 'gene', label: 'Gene' },
    { key: 'variant', label: 'Variant' },
    { key: 'metabolizer_status', label: 'Metabolizer Status' },
    { key: 'evidence_level', label: 'Evidence Level' },
    {
      key: 'cpic_guideline',
      label: 'CPIC Guideline',
      render: (val) => (val && val.length > 40 ? val.substring(0, 40) + '...' : val || '—'),
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
      gene: item.gene || '',
      variant: item.variant || '',
      metabolizer_status: item.metabolizer_status || '',
      recommendation: item.recommendation || '',
      evidence_level: item.evidence_level || '',
      cpic_guideline: item.cpic_guideline || '',
    });
    setSelectedItem(item);
    setShowDetail(false);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing && selectedItem) {
        await api.put(`/pharmacogenomics/${selectedItem.id}`, formData);
      } else {
        await api.post('/pharmacogenomics', formData);
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
      await api.delete(`/pharmacogenomics/${id}`);
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

  const handleAIAnalyze = async (e) => {
    e.preventDefault();
    setAiLoading(true);
    setAiResult('');
    try {
      const res = await api.post('/pharmacogenomics/ai-analyze', aiForm);
      setAiResult(res.data.analysis || res.data.result || res.data.data || JSON.stringify(res.data));
    } catch (err) {
      console.error('AI analysis failed:', err);
      setAiResult('AI analysis failed. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAIFromDetail = async () => {
    if (!selectedItem) return;
    setAiLoading(true);
    setAiResult('');
    try {
      const res = await api.post('/pharmacogenomics/ai-analyze', { drug_id: selectedItem.drug_id, gene_results: selectedItem.gene });
      setAiResult(res.data.analysis || res.data.result || res.data.data || JSON.stringify(res.data));
    } catch (err) {
      console.error('AI analysis failed:', err);
      setAiResult('AI analysis failed. Please try again.');
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
            Pharmacogenomics
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            Manage pharmacogenomic data and gene-drug interactions
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => {
              setAiForm({ drug_id: '', gene_results: '' });
              setAiResult('');
              setAiLoading(false);
              setShowAIModal(true);
            }}
            style={styles.aiCheckBtn}
          >
            AI PGx Analysis
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
        title={editing ? 'Edit PGx Record' : 'Add New PGx Record'}
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
            label="Gene"
            name="gene"
            value={formData.gene}
            onChange={handleChange}
            placeholder="e.g. CYP2D6"
          />
          <FormInput
            label="Variant"
            name="variant"
            value={formData.variant}
            onChange={handleChange}
            placeholder="e.g. *1/*4"
          />
          <FormSelect
            label="Metabolizer Status"
            name="metabolizer_status"
            value={formData.metabolizer_status}
            onChange={handleChange}
            options={metabolizerOptions}
          />
          <FormTextarea
            label="Recommendation"
            name="recommendation"
            value={formData.recommendation}
            onChange={handleChange}
            placeholder="Clinical recommendation based on genotype..."
          />
          <FormSelect
            label="Evidence Level"
            name="evidence_level"
            value={formData.evidence_level}
            onChange={handleChange}
            options={evidenceOptions}
          />
          <FormInput
            label="CPIC Guideline"
            name="cpic_guideline"
            value={formData.cpic_guideline}
            onChange={handleChange}
            placeholder="CPIC guideline reference..."
          />
          <SubmitButton>{editing ? 'Update Record' : 'Add Record'}</SubmitButton>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title="Pharmacogenomics Details"
        wide
      >
        {selectedItem && (
          <div>
            <div style={styles.detailGrid}>
              {detailRow('Drug', selectedItem.drug_name)}
              {detailRow('Gene', selectedItem.gene)}
              {detailRow('Variant', selectedItem.variant)}
              {detailRow('Metabolizer Status', selectedItem.metabolizer_status)}
              {detailRow('Evidence Level', selectedItem.evidence_level)}
            </div>
            <div style={styles.detailSection}>
              <div style={styles.detailSectionLabel}>Recommendation</div>
              <div style={styles.detailSectionText}>{selectedItem.recommendation || '—'}</div>
            </div>
            <div style={styles.detailSection}>
              <div style={styles.detailSectionLabel}>CPIC Guideline</div>
              <div style={styles.detailSectionText}>{selectedItem.cpic_guideline || '—'}</div>
            </div>

            <div style={styles.detailActions}>
              <button onClick={handleAIFromDetail} style={styles.aiBtn} disabled={aiLoading}>
                {aiLoading ? 'Analyzing...' : 'AI PGx Analysis'}
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

      {/* AI PGx Analysis Modal */}
      <Modal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        title="AI PGx Analysis"
        wide
      >
        <form onSubmit={handleAIAnalyze}>
          <FormSelect
            label="Drug"
            name="drug_id"
            value={aiForm.drug_id}
            onChange={(e) => setAiForm({ ...aiForm, drug_id: e.target.value })}
            options={drugOptions}
          />
          <FormTextarea
            label="Gene Results"
            name="gene_results"
            value={aiForm.gene_results}
            onChange={(e) => setAiForm({ ...aiForm, gene_results: e.target.value })}
            placeholder="Enter gene test results (e.g. CYP2D6 *1/*4, CYP2C19 *1/*2)..."
          />
          <SubmitButton loading={aiLoading}>Run AI Analysis</SubmitButton>
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

export default PharmacogenomicsPage;
