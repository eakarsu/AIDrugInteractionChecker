import React, { useEffect, useState } from 'react';

function RenalDoseReview() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/renal-dose-review')
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (!data) return <div style={{ color: '#e2e8f0' }}>Loading renal dose review...</div>;

  return (
    <div style={{ color: '#e2e8f0' }}>
      <h1 style={{ marginBottom: 8 }}>Renal Dose Review</h1>
      <p style={{ color: '#94a3b8', marginTop: 0 }}>Renal function checks for dosing, contraindications, and stale lab follow-up.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, margin: '24px 0' }}>
        {Object.entries(data.summary).map(([key, value]) => (
          <div key={key} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 18 }}>
            <strong style={{ fontSize: 28 }}>{value}</strong>
            <div style={{ color: '#94a3b8', textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}</div>
          </div>
        ))}
      </div>
      <section style={{ background: '#111827', border: '1px solid #334155', borderRadius: 8, padding: 20, marginBottom: 20 }}>
        <h2>Renal Rules</h2>
        {data.rules.map((rule) => (
          <div key={rule.medication} style={{ padding: '12px 0', borderTop: '1px solid #334155' }}>
            <strong>{rule.medication}</strong>
            <div style={{ color: '#93c5fd' }}>{rule.threshold}</div>
            <div style={{ color: '#cbd5e1' }}>{rule.recommendation}</div>
          </div>
        ))}
      </section>
      <section style={{ background: '#111827', border: '1px solid #334155', borderRadius: 8, padding: 20 }}>
        <h2>Patient Queue</h2>
        {data.patients.map((patient) => (
          <div key={`${patient.patient}-${patient.medication}`} style={{ padding: '12px 0', borderTop: '1px solid #334155' }}>
            <strong>{patient.patient}</strong>
            <div>{patient.medication} - eGFR {patient.egfr} - {patient.risk}</div>
            <div style={{ color: '#cbd5e1' }}>{patient.action}</div>
          </div>
        ))}
      </section>
    </div>
  );
}

export default RenalDoseReview;
