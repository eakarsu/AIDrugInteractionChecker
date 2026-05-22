import React, { useState } from 'react';
import api from '../services/api';

const PatientReportExporter = () => {
  const [patientId, setPatientId] = useState('1');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [err, setErr] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    setErr('');
    try {
      const r = await api.get(`/custom-views/patient-report?patient_id=${patientId}&format=json`);
      setReport(r.data);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    }
    setLoading(false);
  };

  const downloadPdf = () => {
    const token = localStorage.getItem('token');
    const url = `/api/custom-views/patient-report?patient_id=${patientId}`;
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `patient_${patientId}_interaction_report.txt`;
        a.click();
      })
      .catch(e => setErr(e.message));
  };

  return (
    <div style={{ background: '#1e293b', padding: 16, borderRadius: 12, border: '1px solid #334155' }}>
      <div style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 600, marginBottom: 10 }}>
        Patient Interaction Report (PDF Export)
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <label style={{ color: '#94a3b8', fontSize: 13 }}>Patient ID:</label>
        <input
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '6px 10px', color: '#f1f5f9', width: 80 }}
        />
        <button onClick={fetchReport} disabled={loading}
                style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>
          {loading ? 'Loading...' : 'Generate'}
        </button>
        <button onClick={downloadPdf}
                style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>
          Download PDF
        </button>
      </div>
      {err && <div style={{ color: '#fca5a5', fontSize: 13, marginBottom: 8 }}>{err}</div>}
      {report && (
        <pre style={{
          background: '#0f172a',
          border: '1px solid #334155',
          borderRadius: 8,
          padding: 12,
          color: '#cbd5e1',
          fontSize: 11,
          maxHeight: 320,
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
        }}>{report.report_text}</pre>
      )}
    </div>
  );
};

export default PatientReportExporter;
