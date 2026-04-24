import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import AIAnalysis from '../components/AIAnalysis';
import { FormInput, FormSelect, FormTextarea, SubmitButton, PageHeader, SeverityBadge } from '../components/FormField';

const emptyPatient = {
  first_name: '',
  last_name: '',
  date_of_birth: '',
  gender: '',
  weight_kg: '',
  height_cm: '',
  allergies: '',
  medical_conditions: '',
  insurance_id: '',
};

const emptyMed = {
  drug_id: '',
  dosage: '',
  frequency: '',
  route: '',
  start_date: '',
  prescribing_doctor: '',
};

const PatientsPage = () => {
  const [patients, setPatients] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form modal
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ ...emptyPatient });
  const [editingId, setEditingId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  // Detail modal
  const [showDetail, setShowDetail] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // AI analysis
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Add medication form
  const [showMedForm, setShowMedForm] = useState(false);
  const [medData, setMedData] = useState({ ...emptyMed });
  const [medLoading, setMedLoading] = useState(false);

  useEffect(() => {
    fetchPatients();
    fetchDrugs();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const res = await api.get('/patients');
      setPatients(res.data);
    } catch (err) {
      console.error('Failed to fetch patients:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDrugs = async () => {
    try {
      const res = await api.get('/drugs');
      setDrugs(res.data);
    } catch (err) {
      console.error('Failed to fetch drugs:', err);
    }
  };

  const fetchPatientDetail = async (id) => {
    try {
      setDetailLoading(true);
      const res = await api.get(`/patients/${id}`);
      setSelectedPatient(res.data);
    } catch (err) {
      console.error('Failed to fetch patient detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRowClick = async (row) => {
    setShowDetail(true);
    setAiResult(null);
    setShowMedForm(false);
    await fetchPatientDetail(row.id);
  };

  const handleAdd = () => {
    setFormData({ ...emptyPatient });
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = (row) => {
    setFormData({
      first_name: row.first_name || '',
      last_name: row.last_name || '',
      date_of_birth: row.date_of_birth ? row.date_of_birth.slice(0, 10) : '',
      gender: row.gender || '',
      weight_kg: row.weight_kg || '',
      height_cm: row.height_cm || '',
      allergies: row.allergies || '',
      medical_conditions: row.medical_conditions || '',
      insurance_id: row.insurance_id || '',
    });
    setEditingId(row.id);
    setShowForm(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const payload = {
        ...formData,
        weight_kg: formData.weight_kg ? Number(formData.weight_kg) : null,
        height_cm: formData.height_cm ? Number(formData.height_cm) : null,
      };
      if (editingId) {
        await api.put(`/patients/${editingId}`, payload);
      } else {
        await api.post('/patients', payload);
      }
      setShowForm(false);
      fetchPatients();
    } catch (err) {
      console.error('Failed to save patient:', err);
      alert(err.response?.data?.error || 'Failed to save patient');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/patients/${id}`);
      fetchPatients();
    } catch (err) {
      console.error('Failed to delete patient:', err);
      alert(err.response?.data?.error || 'Failed to delete patient');
    }
  };

  const handleAiCheck = async () => {
    if (!selectedPatient) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await api.post(`/patients/${selectedPatient.id}/ai-check`);
      setAiResult(res.data.analysis || res.data.result || JSON.stringify(res.data));
    } catch (err) {
      console.error('AI check failed:', err);
      setAiResult('Failed to perform AI medication review. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddMedication = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setMedLoading(true);
    try {
      await api.post(`/patients/${selectedPatient.id}/medications`, {
        ...medData,
        drug_id: Number(medData.drug_id),
      });
      setShowMedForm(false);
      setMedData({ ...emptyMed });
      await fetchPatientDetail(selectedPatient.id);
    } catch (err) {
      console.error('Failed to add medication:', err);
      alert(err.response?.data?.error || 'Failed to add medication');
    } finally {
      setMedLoading(false);
    }
  };

  const handleDeleteMedication = async (medId) => {
    if (!selectedPatient) return;
    if (!window.confirm('Remove this medication?')) return;
    try {
      await api.delete(`/patients/${selectedPatient.id}/medications/${medId}`);
      await fetchPatientDetail(selectedPatient.id);
    } catch (err) {
      console.error('Failed to delete medication:', err);
      alert(err.response?.data?.error || 'Failed to remove medication');
    }
  };

  const truncate = (str, len = 30) => {
    if (!str) return '—';
    return str.length > len ? str.slice(0, len) + '...' : str;
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (_, row) => `${row.first_name || ''} ${row.last_name || ''}`.trim() || '—',
    },
    { key: 'date_of_birth', label: 'Date of Birth', render: (v) => v ? v.slice(0, 10) : '—' },
    { key: 'gender', label: 'Gender' },
    { key: 'weight_kg', label: 'Weight (kg)' },
    { key: 'allergies', label: 'Allergies', render: (v) => truncate(v, 30) },
    { key: 'medical_conditions', label: 'Conditions', render: (v) => truncate(v, 30) },
  ];

  const formField = (key, val) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
  };

  const medField = (key, val) => {
    setMedData((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <div>
      <PageHeader
        title="Patients"
        subtitle="Manage patient profiles and medication records"
        onAdd={handleAdd}
        addLabel="Add Patient"
      />

      <DataTable
        columns={columns}
        data={patients}
        onRowClick={handleRowClick}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Add / Edit Patient Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? 'Edit Patient' : 'Add New Patient'}
      >
        <form onSubmit={handleFormSubmit}>
          <div style={styles.formGrid}>
            <FormInput
              label="First Name"
              value={formData.first_name}
              onChange={(e) => formField('first_name', e.target.value)}
              required
            />
            <FormInput
              label="Last Name"
              value={formData.last_name}
              onChange={(e) => formField('last_name', e.target.value)}
              required
            />
          </div>
          <div style={styles.formGrid}>
            <FormInput
              label="Date of Birth"
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => formField('date_of_birth', e.target.value)}
              required
            />
            <FormSelect
              label="Gender"
              value={formData.gender}
              onChange={(e) => formField('gender', e.target.value)}
              options={['Male', 'Female', 'Other']}
              required
            />
          </div>
          <div style={styles.formGrid}>
            <FormInput
              label="Weight (kg)"
              type="number"
              step="0.1"
              value={formData.weight_kg}
              onChange={(e) => formField('weight_kg', e.target.value)}
            />
            <FormInput
              label="Height (cm)"
              type="number"
              step="0.1"
              value={formData.height_cm}
              onChange={(e) => formField('height_cm', e.target.value)}
            />
          </div>
          <FormTextarea
            label="Allergies"
            value={formData.allergies}
            onChange={(e) => formField('allergies', e.target.value)}
            placeholder="List known allergies..."
          />
          <FormTextarea
            label="Medical Conditions"
            value={formData.medical_conditions}
            onChange={(e) => formField('medical_conditions', e.target.value)}
            placeholder="List medical conditions..."
          />
          <FormInput
            label="Insurance ID"
            value={formData.insurance_id}
            onChange={(e) => formField('insurance_id', e.target.value)}
          />
          <SubmitButton loading={formLoading}>
            {editingId ? 'Update Patient' : 'Create Patient'}
          </SubmitButton>
        </form>
      </Modal>

      {/* Patient Detail Modal */}
      <Modal
        isOpen={showDetail}
        onClose={() => { setShowDetail(false); setSelectedPatient(null); setAiResult(null); setShowMedForm(false); }}
        title={selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : 'Patient Details'}
        wide
      >
        {detailLoading ? (
          <div style={styles.loadingText}>Loading patient details...</div>
        ) : selectedPatient ? (
          <div>
            {/* Patient Info */}
            <div style={styles.infoGrid}>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Date of Birth</span>
                <span style={styles.infoValue}>
                  {selectedPatient.date_of_birth ? selectedPatient.date_of_birth.slice(0, 10) : '—'}
                </span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Gender</span>
                <span style={styles.infoValue}>{selectedPatient.gender || '—'}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Weight</span>
                <span style={styles.infoValue}>
                  {selectedPatient.weight_kg ? `${selectedPatient.weight_kg} kg` : '—'}
                </span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Height</span>
                <span style={styles.infoValue}>
                  {selectedPatient.height_cm ? `${selectedPatient.height_cm} cm` : '—'}
                </span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Insurance ID</span>
                <span style={styles.infoValue}>{selectedPatient.insurance_id || '—'}</span>
              </div>
            </div>

            {selectedPatient.allergies && (
              <div style={styles.detailSection}>
                <span style={styles.infoLabel}>Allergies</span>
                <p style={styles.detailText}>{selectedPatient.allergies}</p>
              </div>
            )}

            {selectedPatient.medical_conditions && (
              <div style={styles.detailSection}>
                <span style={styles.infoLabel}>Medical Conditions</span>
                <p style={styles.detailText}>{selectedPatient.medical_conditions}</p>
              </div>
            )}

            {/* Medications Section */}
            <div style={styles.medsHeader}>
              <h3 style={styles.medsTitle}>Medications</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={styles.aiBtn} onClick={handleAiCheck} disabled={aiLoading}>
                  {aiLoading ? 'Analyzing...' : 'AI Medication Review'}
                </button>
                <button
                  style={styles.addMedBtn}
                  onClick={() => { setShowMedForm(!showMedForm); setMedData({ ...emptyMed }); }}
                >
                  {showMedForm ? 'Cancel' : '+ Add Medication'}
                </button>
              </div>
            </div>

            {/* Medication List */}
            {selectedPatient.medications && selectedPatient.medications.length > 0 ? (
              <div style={styles.medsList}>
                {selectedPatient.medications.map((med) => (
                  <div key={med.id} style={styles.medItem}>
                    <div style={styles.medInfo}>
                      <div style={styles.medName}>
                        {med.drug_name || med.Drug?.generic_name || `Drug #${med.drug_id}`}
                      </div>
                      <div style={styles.medDetails}>
                        {med.dosage && <span>{med.dosage}</span>}
                        {med.frequency && <span> · {med.frequency}</span>}
                        {med.route && <span> · {med.route}</span>}
                      </div>
                      <div style={styles.medMeta}>
                        {med.start_date && <span>Started: {med.start_date.slice(0, 10)}</span>}
                        {med.prescribing_doctor && <span> · Dr. {med.prescribing_doctor}</span>}
                      </div>
                    </div>
                    <button
                      style={styles.medDeleteBtn}
                      onClick={() => handleDeleteMedication(med.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={styles.noMeds}>No medications on record.</p>
            )}

            {/* Add Medication Form */}
            {showMedForm && (
              <div style={styles.medFormWrap}>
                <h4 style={styles.medFormTitle}>Add Medication</h4>
                <form onSubmit={handleAddMedication}>
                  <div style={styles.formGrid}>
                    <FormSelect
                      label="Drug"
                      value={medData.drug_id}
                      onChange={(e) => medField('drug_id', e.target.value)}
                      options={drugs.map((d) => ({
                        value: d.id,
                        label: `${d.generic_name}${d.brand_name ? ` (${d.brand_name})` : ''}`,
                      }))}
                      required
                    />
                    <FormInput
                      label="Dosage"
                      value={medData.dosage}
                      onChange={(e) => medField('dosage', e.target.value)}
                      placeholder="e.g., 500mg"
                      required
                    />
                  </div>
                  <div style={styles.formGrid}>
                    <FormInput
                      label="Frequency"
                      value={medData.frequency}
                      onChange={(e) => medField('frequency', e.target.value)}
                      placeholder="e.g., Twice daily"
                      required
                    />
                    <FormSelect
                      label="Route"
                      value={medData.route}
                      onChange={(e) => medField('route', e.target.value)}
                      options={['Oral', 'IV', 'IM', 'SC', 'Inhalation', 'Topical']}
                      required
                    />
                  </div>
                  <div style={styles.formGrid}>
                    <FormInput
                      label="Start Date"
                      type="date"
                      value={medData.start_date}
                      onChange={(e) => medField('start_date', e.target.value)}
                      required
                    />
                    <FormInput
                      label="Prescribing Doctor"
                      value={medData.prescribing_doctor}
                      onChange={(e) => medField('prescribing_doctor', e.target.value)}
                    />
                  </div>
                  <SubmitButton loading={medLoading}>Add Medication</SubmitButton>
                </form>
              </div>
            )}

            {/* AI Analysis Result */}
            <AIAnalysis content={aiResult} loading={aiLoading} />
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

const styles = {
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0 16px',
  },
  loadingText: {
    color: '#64748b',
    textAlign: 'center',
    padding: '40px 0',
    fontSize: '14px',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
  },
  infoItem: {
    background: '#0f172a',
    borderRadius: '10px',
    padding: '12px 16px',
    border: '1px solid #334155',
  },
  infoLabel: {
    fontSize: '11px',
    fontWeight: '500',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    display: 'block',
    marginBottom: '4px',
  },
  infoValue: {
    fontSize: '14px',
    color: '#e2e8f0',
    fontWeight: '500',
  },
  detailSection: {
    marginBottom: '16px',
  },
  detailText: {
    fontSize: '14px',
    color: '#cbd5e1',
    lineHeight: '1.6',
    marginTop: '4px',
  },
  medsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '24px',
    marginBottom: '12px',
    flexWrap: 'wrap',
    gap: '10px',
  },
  medsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#f1f5f9',
  },
  aiBtn: {
    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    whiteSpace: 'nowrap',
  },
  addMedBtn: {
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#34d399',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    whiteSpace: 'nowrap',
  },
  medsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  medItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '10px',
    padding: '12px 16px',
    gap: '12px',
  },
  medInfo: {
    flex: 1,
    minWidth: 0,
  },
  medName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: '2px',
  },
  medDetails: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  medMeta: {
    fontSize: '11px',
    color: '#64748b',
    marginTop: '2px',
  },
  medDeleteBtn: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '6px',
    padding: '4px 12px',
    color: '#f87171',
    fontSize: '12px',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  noMeds: {
    color: '#475569',
    fontSize: '13px',
    padding: '20px 0',
    textAlign: 'center',
  },
  medFormWrap: {
    marginTop: '16px',
    background: 'rgba(16, 185, 129, 0.04)',
    border: '1px solid rgba(16, 185, 129, 0.15)',
    borderRadius: '12px',
    padding: '20px',
  },
  medFormTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#34d399',
    marginBottom: '12px',
  },
};

export default PatientsPage;
