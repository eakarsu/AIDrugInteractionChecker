import React from 'react';
import SeverityMatrixHeatmap from '../components/SeverityMatrixHeatmap';
import SeverityDistributionDonut from '../components/SeverityDistributionDonut';
import PatientReportExporter from '../components/PatientReportExporter';
import DrugClassRulesEditor from '../components/DrugClassRulesEditor';

const CustomViewsPage = () => {
  return (
    <div data-testid="custom-views-page">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: '#f1f5f9', fontSize: 26, fontWeight: 700, margin: 0 }}>Pharmacy Views</h1>
        <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 6 }}>
          Custom analytics and operational tools for clinical pharmacists.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <SeverityMatrixHeatmap />
        <SeverityDistributionDonut />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
        <PatientReportExporter />
        <DrugClassRulesEditor />
      </div>
    </div>
  );
};

export default CustomViewsPage;
