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
  age_range: '',
  weight_based_dose: '',
  max_daily_dose: '',
  formulation: '',
  indication: '',
  special_notes: '',
};

const PediatricPage = () => {
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
  const [aiCheckForm, setAiCheckForm] = useState({ drug_id: '', age_years: '', weight_kg: '', indication: '' });

  const fetchData = async () => {
    try {
      const [mainRes, drugRes] = await Promise.all([
        api.get('/pediatric'),
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
    { key: 'age_range', label: 'Age Range' },
    { key: 'weight_based_dose', label: 'Weight-Based Dose' },
    { key: 'max_daily_dose', label: 'Max Daily Dose' },
    {
      key: 'formulation',
      label: 'Formulation',
      render: (val) =>
        val && val.length > 40 ? val.substring(0, 40) + '...' : val || '—',
    },
    { key: 'indication', label: 'Indication' },
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
      age_range: item.age_range || '',
      weight_based_dose: item.weight_based_dose || '',
      max_daily_dose: item.max_daily_dose || '',
      formulation: item.formulation || '',
      indication: item.indication || '',
      special_notes: item.special_notes || '',
    });
    setSelectedItem(item);
    setShowDetail(false);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing && selectedItem) {
        await api.put(`/pediatric/${selectedItem.id}`, formData);
      } else {
        await api.post('/pediatric', formData);
      }
      setShowModal(false);
      setFormData(emptyForm);
      fetchData();
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save pediatric data: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/pediatric/${id}`);
      setShowDetail(false);
      fetchData();
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete pediatric record.');
    }
  };

  const onRowClick = (row) => {
    setSelectedItem(row);
    setAiResult('');
    setShowDetail(true);
  };

  const runAICalculate = async (drugId, ageYears, weightKg, indication) => {
    setAiLoading(true);
    setAiResult('');
    try {
      const res = await api.post('/pediatric/ai-calculate', {
        drug_id: drugId,
        age_years: ageYears,
        weight_kg: weightKg,
        indication: indication,
      });
      setAiResult(res.data.analysis || res.data.result || res.data.data || JSON.stringify(res.data));
    } catch (err) {
      console.error('AI calculation failed:', err);
      setAiResult('AI analysis failed. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAICheckFromDetail = () => {
    if (selectedItem) {
      runAICalculate(selectedItem.drug_id, '', '', selectedItem.indication);
    }
  };

  const handleAICheckModal = () => {
    setAiCheckForm({ drug_id: '', age_years: '', weight_kg: '', indication: '' });
    setAiResult('');
    setAiLoading(false);
    setShowAICheckModal(true);
  };

  const handleAICheckSubmit = (e) => {
    e.preventDefault();
    if (aiCheckForm.drug_id) {
      runAICalculate(aiCheckForm.drug_id, aiCheckForm.age_years, aiCheckForm.weight_kg, aiCheckForm.indication);
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
            Pediatric Dosing
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            Manage pediatric drug dosing and safety information
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleAICheckModal} style={styles.aiCheckBtn}>
            AI Peds Dose
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
          if (window.confirm('Are you sure you want to delete this pediatric record?')) {
            handleDelete(id);
          }
        }}
      />

      {/* Add / Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Pediatric Record' : 'Add New Pediatric Record'}
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
            label="Age Range"
            name="age_range"
            value={formData.age_range}
            onChange={handleChange}
            placeholder="e.g. 2-6 years"
          />
          <FormInput
            label="Weight-Based Dose"
            name="weight_based_dose"
            value={formData.weight_based_dose}
            onChange={handleChange}
            placeholder="e.g. 10-15 mg/kg/dose"
          />
          <FormInput
            label="Max Daily Dose"
            name="max_daily_dose"
            value={formData.max_daily_dose}
            onChange={handleChange}
            placeholder="e.g. 60 mg/kg/day"
          />
          <FormInput
            label="Formulation"
            name="formulation"
            value={formData.formulation}
            onChange={handleChange}
            placeholder="e.g. Oral suspension 250mg/5mL"
          />
          <FormInput
            label="Indication"
            name="indication"
            value={formData.indication}
            onChange={handleChange}
            placeholder="e.g. Acute otitis media"
          />
          <FormTextarea
            label="Special Notes"
            name="special_notes"
            value={formData.special_notes}
            onChange={handleChange}
            placeholder="Any special considerations..."
          />
          <SubmitButton>{editing ? 'Update Record' : 'Add Record'}</SubmitButton>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title="Pediatric Dosing Details"
        wide
      >
        {selectedItem && (
          <div>
            <div style={styles.detailGrid}>
              {detailRow('Drug', selectedItem.drug_name)}
              {detailRow('Age Range', selectedItem.age_range)}
              {detailRow('Weight-Based Dose', selectedItem.weight_based_dose)}
              {detailRow('Max Daily Dose', selectedItem.max_daily_dose)}
              {detailRow('Formulation', selectedItem.formulation)}
              {detailRow('Indication', selectedItem.indication)}
            </div>
            <div style={styles.detailSection}>
              <div style={styles.detailSectionLabel}>Special Notes</div>
              <div style={styles.detailSectionText}>{selectedItem.special_notes || '—'}</div>
            </div>

            <div style={styles.detailActions}>
              <button onClick={handleAICheckFromDetail} style={styles.aiBtn} disabled={aiLoading}>
                {aiLoading ? 'Calculating...' : 'AI Analyze'}
              </button>
              <button onClick={() => openEditModal(selectedItem)} style={styles.editBtn}>
                Edit
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this pediatric record?')) {
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

      {/* AI Peds Dose Modal */}
      <Modal
        isOpen={showAICheckModal}
        onClose={() => setShowAICheckModal(false)}
        title="AI Pediatric Dose Calculator"
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
          <FormInput
            label="Age (years)"
            name="age_years"
            type="number"
            value={aiCheckForm.age_years}
            onChange={(e) => setAiCheckForm({ ...aiCheckForm, age_years: e.target.value })}
            placeholder="e.g. 5"
          />
          <FormInput
            label="Weight (kg)"
            name="weight_kg"
            type="number"
            value={aiCheckForm.weight_kg}
            onChange={(e) => setAiCheckForm({ ...aiCheckForm, weight_kg: e.target.value })}
            placeholder="e.g. 20"
          />
          <FormInput
            label="Indication"
            name="indication"
            value={aiCheckForm.indication}
            onChange={(e) => setAiCheckForm({ ...aiCheckForm, indication: e.target.value })}
            placeholder="e.g. Acute otitis media"
          />
          <SubmitButton loading={aiLoading}>Calculate AI Dose</SubmitButton>
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

export default PediatricPage;
