// === Batch 03 Gaps & Frontend Mounts ===
// Auto-generated frontend page (lean v0). Wires Custom Feature Suggestions
// and Gap endpoints (AI counterparts + non-AI features) to backend routes.
import React, { useState } from 'react';

const API_BASE = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) || 'http://localhost:4000/api';

const FEATURES = [
  { kind: 'cfs', slug: 'cf-live-drug-database-sync', label: 'Live drug-database sync', desc: 'Daily pull from FDA/WHO updates with auto-indexing', endpoint: '/cf-live-drug-database-sync' },
  { kind: 'cfs', slug: 'cf-agentic-pharmacist', label: 'Agentic pharmacist', desc: 'Chat with visible reasoning chain (which interactions drove which recommendation)', endpoint: '/cf-agentic-pharmacist' },
  { kind: 'cfs', slug: 'cf-voice-intake', label: 'Voice intake', desc: 'Speak medication list, NLP returns interaction report', endpoint: '/cf-voice-intake' },
  { kind: 'cfs', slug: 'cf-pharmacy-integration-apis', label: 'Pharmacy integration APIs', desc: 'Sync with Surescripts/RxNorm', endpoint: '/cf-pharmacy-integration-apis' },
  { kind: 'cfs', slug: 'cf-insurance-formulary-check', label: 'Insurance formulary check', desc: 'Coverage + PA alongside interaction data', endpoint: '/cf-insurance-formulary-check' },
  { kind: 'cfs', slug: 'cf-population-health-analysis', label: 'Population health analysis', desc: 'Cohort-wide polypharmacy risk', endpoint: '/cf-population-health-analysis' },
  { kind: 'gap-ai', slug: 'gap-ai-no-reasoning-chain-why-this-interaction-explainability-end', label: 'No reasoning-chain "why this interaction" explainability end', desc: 'No reasoning-chain "why this interaction" explainability endpoint', endpoint: '/gap-no-reasoning-chain-why-this-interaction-explainability-end' },
  { kind: 'gap-ai', slug: 'gap-ai-no-population-cohort-polypharmacy-scan', label: 'No population-cohort polypharmacy scan', desc: 'No population-cohort polypharmacy scan', endpoint: '/gap-no-population-cohort-polypharmacy-scan' },
  { kind: 'gap-ai', slug: 'gap-ai-no-formulary-cost-aware-alternative-ranking', label: 'No formulary/cost-aware alternative ranking', desc: 'No formulary/cost-aware alternative ranking', endpoint: '/gap-no-formulary-cost-aware-alternative-ranking' },
  { kind: 'gap-non', slug: 'gap-non-no-prescription-workflow-order-fill-dispense-lifecycle', label: 'No prescription workflow (order/fill/dispense lifecycle)', desc: 'No prescription workflow (order/fill/dispense lifecycle)', endpoint: '/gap-no-prescription-workflow-order-fill-dispense-lifecycle' },
  { kind: 'gap-non', slug: 'gap-non-no-notifications-alerting-system-for-high-risk-findings', label: 'No notifications/alerting system for high-risk findings', desc: 'No notifications/alerting system for high-risk findings', endpoint: '/gap-no-notifications-alerting-system-for-high-risk-findings' },
  { kind: 'gap-non', slug: 'gap-non-no-webhooks-for-ehr-integration-callbacks', label: 'No webhooks for EHR integration callbacks', desc: 'No webhooks for EHR integration callbacks', endpoint: '/gap-no-webhooks-for-ehr-integration-callbacks' },
  { kind: 'gap-non', slug: 'gap-non-no-file-upload-no-e-rx-pdf-ingest', label: 'No file upload (no e-Rx/PDF ingest)', desc: 'No file upload (no e-Rx/PDF ingest)', endpoint: '/gap-no-file-upload-no-e-rx-pdf-ingest' },
  { kind: 'gap-non', slug: 'gap-non-limited-integration-no-surescripts-ehr-connector', label: 'Limited integration (no Surescripts/EHR connector)', desc: 'Limited integration (no Surescripts/EHR connector)', endpoint: '/gap-limited-integration-no-surescripts-ehr-connector' },
  { kind: 'gap-non', slug: 'gap-non-no-approval-workflow-for-off-label-use', label: 'No approval workflow for off-label use', desc: 'No approval workflow for off-label use', endpoint: '/gap-no-approval-workflow-for-off-label-use' },
];

function authHeaders() {
  const t = (typeof window !== 'undefined') ? localStorage.getItem('token') : null;
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

export default function Batch03Features() {
  const [active, setActive] = useState(FEATURES[0]?.slug);
  const [input, setInput] = useState('');
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sampleRequests = [
      {
          "label": "Scenario",
          "value": "Run Batch03 Features for a realistic customer case.\nContext: a team needs a practical recommendation based on incomplete operating data.\nGoal: identify the best action, key risks, missing information, and expected business impact.\nReturn: summary, prioritized action plan, assumptions, and follow-up questions."
      },
      {
          "label": "Data sample",
          "value": "Analyze this Batch03 Features data sample.\nInput records:\n- Record 1: urgent, customer impact high, owner unassigned\n- Record 2: medium priority, blocked by missing data\n- Record 3: recurring issue, automation opportunity\nReturn structured findings, anomalies, recommendations, and confidence."
      },
      {
          "label": "Executive review",
          "value": "Prepare an executive review for Batch03 Features.\nAudience: business owner, operations lead, and implementation team.\nInclude impact, risk, estimated effort, decision points, and a concise next-step plan."
      }
  ];

  const applySampleRequest = (value) => {
    setInput(value);
    setError(null);
  };
  const current = FEATURES.find(f => f.slug === active) || FEATURES[0];

  async function run() {
    if (!current) return;
    setLoading(true); setError(null);
    try {
      let parsed;
      try { parsed = input ? JSON.parse(input) : {}; } catch { parsed = { input }; }
      const r = await fetch(`${API_BASE}${current.endpoint}`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(parsed)
      });
      let body; try { body = await r.json(); } catch { body = { raw: await r.text() }; }
      if (!r.ok) setError(body.error || `HTTP ${r.status}`);
      setResults(prev => ({ ...prev, [current.slug]: body }));
    } catch (e) {
      setError(String(e.message || e));
    } finally { setLoading(false); }
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ marginTop: 0 }}>Batch 03 Features <small style={{ color: '#64748b', fontWeight: 400 }}>(AIDrugInteractionChecker)</small></h2>
      <p style={{ color: '#475569', maxWidth: 720 }}>
        Audit-driven AI counterparts, non-AI feature gaps, and custom feature suggestions.
        Backend endpoints prefixed <code>/api/cf-*</code> (custom features) and <code>/api/gap-*</code> (gap fills).
      </p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '12px 0' }}>
        {FEATURES.map(f => (
          <button key={f.slug} onClick={() => setActive(f.slug)}
            style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #cbd5e1',
                     background: active === f.slug ? '#1e40af' : '#f8fafc',
                     color: active === f.slug ? 'white' : '#0f172a', cursor: 'pointer', fontSize: 12 }}>
            <span style={{ opacity: 0.7, marginRight: 4 }}>[{f.kind}]</span>{f.label}
          </button>
        ))}
      </div>
      {current && (
        <div style={{ marginTop: 16, padding: 16, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
          <div style={{ marginBottom: 8 }}>
            <strong>{current.label}</strong>
            <div style={{ color: '#475569', fontSize: 13 }}>{current.desc}</div>
            <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>POST <code>{current.endpoint}</code></div>
          </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {sampleRequests.map((sample) => (
            <button
              key={sample.label}
              type="button"
              onClick={() => applySampleRequest(sample.value)}
              style={{ padding: '6px 10px', background: '#eef2ff', color: '#1e3a8a', border: '1px solid #c7d2fe', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
            >
              {sample.label}
            </button>
          ))}
        </div>

          <textarea value={input} onChange={e => setInput(e.target.value)}
            placeholder='Optional JSON input (e.g. {"query":"..."})'
            style={{ width: '100%', minHeight: 80, padding: 8, fontFamily: 'monospace', fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 4 }} />
          <div style={{ marginTop: 8 }}>
            <button onClick={run} disabled={loading}
              style={{ padding: '8px 16px', background: '#1e40af', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Running…' : 'Run'}
            </button>
          </div>
          {error && (<div style={{ marginTop: 12, padding: 10, background: '#fee2e2', color: '#991b1b', borderRadius: 4, fontSize: 13 }}>{error}</div>)}
          {results[current.slug] && (
            <pre style={{ marginTop: 12, padding: 10, background: '#0b1020', color: '#cbd5e1', borderRadius: 4, overflow: 'auto', maxHeight: 360, fontSize: 12 }}>
              {typeof results[current.slug] === 'string' ? results[current.slug] : JSON.stringify(results[current.slug], null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
