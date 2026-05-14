import React, { useState } from 'react';
import api from '../services/api';
import AIAnalysis from '../components/AIAnalysis';
import {
  FormInput,
  FormSelect,
  SubmitButton,
  PageHeader,
} from '../components/FormField';

const AuditAISummaryPage = () => {
  const [hours, setHours] = useState(24);
  const [actionFilter, setActionFilter] = useState('');
  const [limit, setLimit] = useState(100);
  const [aiResult, setAiResult] = useState('');
  const [aiJson, setAiJson] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const windowOptions = [
    { value: 1, label: 'Last hour' },
    { value: 6, label: 'Last 6 hours' },
    { value: 24, label: 'Last 24 hours' },
    { value: 72, label: 'Last 3 days' },
    { value: 168, label: 'Last 7 days' },
    { value: 720, label: 'Last 30 days' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setAiResult('');
    setAiJson(null);
    setMeta(null);
    try {
      const res = await api.post('/audit/ai-summary', {
        hours: parseInt(hours, 10),
        action_filter: actionFilter,
        limit: parseInt(limit, 10),
      });
      setAiResult(res.data.ai_analysis || '');
      setAiJson(res.data.ai_json || null);
      setMeta({
        entry_count: res.data.entry_count,
        action_counts: res.data.action_counts || {},
        user_counts: res.data.user_counts || {},
        window_hours: res.data.window_hours,
      });
    } catch (err) {
      console.error('Audit AI summary failed:', err);
      const status = err.response?.status;
      if (status === 503) {
        setError(err.response?.data?.error || 'AI service unavailable. Set OPENROUTER_API_KEY on the backend.');
      } else {
        setError(err.response?.data?.error || err.message || 'Request failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="AI Audit Summary"
        subtitle="LLM-generated clinician summary of recent audit_log activity"
      />

      <div style={styles.card}>
        <form onSubmit={handleSubmit}>
          <FormSelect
            label="Time Window"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            options={windowOptions}
          />
          <FormInput
            label="Action Filter (optional)"
            type="text"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            placeholder="e.g. AI_CONTRAINDICATION_CHECK"
          />
          <FormInput
            label="Max Entries"
            type="number"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            min={1}
            max={500}
          />

          {error && <div style={styles.error}>{error}</div>}

          <SubmitButton loading={loading}>Generate Summary</SubmitButton>
        </form>
      </div>

      {meta && (
        <div style={{ ...styles.card, marginTop: '16px' }}>
          <div style={styles.sectionLabel}>
            Entries: {meta.entry_count} (last {meta.window_hours}h)
          </div>
          {Object.keys(meta.action_counts).length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <div style={styles.sectionLabel}>Action Counts</div>
              <pre style={styles.pre}>{JSON.stringify(meta.action_counts, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      <AIAnalysis content={aiResult} loading={loading} />

      {aiJson && (
        <div style={{ ...styles.card, marginTop: '16px' }}>
          <div style={styles.sectionLabel}>Structured JSON</div>
          <pre style={styles.pre}>{JSON.stringify(aiJson, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

const styles = {
  card: {
    background: 'rgba(15, 23, 42, 0.5)',
    border: '1px solid #334155',
    borderRadius: '14px',
    padding: '20px',
  },
  sectionLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '10px',
  },
  error: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '10px',
    padding: '10px 14px',
    color: '#f87171',
    fontSize: '13px',
    marginBottom: '12px',
  },
  pre: {
    fontSize: '12px',
    color: '#cbd5e1',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '10px',
    padding: '14px',
    overflow: 'auto',
    fontFamily: 'monospace',
    maxHeight: '320px',
  },
};

export default AuditAISummaryPage;
