import React, { useEffect, useState } from 'react';
import api from '../services/api';

const POLICIES = ['BLOCK', 'WARN', 'REVIEW', 'ALLOW'];
const THRESHOLDS = ['minor', 'moderate', 'major', 'contraindicated'];

const DrugClassRulesEditor = () => {
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState({ drug_class: '', interaction_policy: 'WARN', severity_threshold: 'moderate', notes: '' });
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState('');

  const load = () => api.get('/custom-views/class-rules').then(r => setRules(r.data.rules || [])).catch(e => setErr(e.message));

  useEffect(() => { load(); }, []);

  const submit = async () => {
    setErr('');
    try {
      if (editing) {
        await api.put(`/custom-views/class-rules/${editing}`, form);
        setEditing(null);
      } else {
        await api.post('/custom-views/class-rules', form);
      }
      setForm({ drug_class: '', interaction_policy: 'WARN', severity_threshold: 'moderate', notes: '' });
      load();
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    }
  };

  const remove = async (id) => {
    await api.delete(`/custom-views/class-rules/${id}`);
    load();
  };

  const edit = (rule) => {
    setEditing(rule.id);
    setForm({
      drug_class: rule.drug_class,
      interaction_policy: rule.interaction_policy,
      severity_threshold: rule.severity_threshold,
      notes: rule.notes || '',
    });
  };

  const input = { background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '6px 10px', color: '#f1f5f9', fontSize: 12 };

  return (
    <div style={{ background: '#1e293b', padding: 16, borderRadius: 12, border: '1px solid #334155' }}>
      <div style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 600, marginBottom: 10 }}>
        Drug Class Rules Editor
      </div>
      <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 12 }}>
        Define interaction policies per drug class. Used by the pharmacist override workflow.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 2fr auto', gap: 8, marginBottom: 12 }}>
        <input placeholder="Drug class (e.g. Anticoagulants)" value={form.drug_class}
               onChange={(e) => setForm({ ...form, drug_class: e.target.value })} style={input} />
        <select value={form.interaction_policy} onChange={(e) => setForm({ ...form, interaction_policy: e.target.value })} style={input}>
          {POLICIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={form.severity_threshold} onChange={(e) => setForm({ ...form, severity_threshold: e.target.value })} style={input}>
          {THRESHOLDS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={input} />
        <button onClick={submit}
                style={{ background: editing ? '#f59e0b' : '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12 }}>
          {editing ? 'Save' : 'Add'}
        </button>
      </div>

      {err && <div style={{ color: '#fca5a5', fontSize: 12, marginBottom: 8 }}>{err}</div>}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ color: '#94a3b8', textAlign: 'left' }}>
            <th style={{ padding: 6 }}>Class</th>
            <th style={{ padding: 6 }}>Policy</th>
            <th style={{ padding: 6 }}>Threshold</th>
            <th style={{ padding: 6 }}>Notes</th>
            <th style={{ padding: 6 }}></th>
          </tr>
        </thead>
        <tbody>
          {rules.map(r => (
            <tr key={r.id} style={{ borderTop: '1px solid #334155', color: '#cbd5e1' }}>
              <td style={{ padding: 6 }}>{r.drug_class}</td>
              <td style={{ padding: 6 }}>
                <span style={{
                  background: r.interaction_policy === 'BLOCK' ? '#7f1d1d' : r.interaction_policy === 'WARN' ? '#f59e0b' : '#334155',
                  color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                }}>{r.interaction_policy}</span>
              </td>
              <td style={{ padding: 6 }}>{r.severity_threshold}</td>
              <td style={{ padding: 6, color: '#94a3b8' }}>{r.notes}</td>
              <td style={{ padding: 6, textAlign: 'right' }}>
                <button onClick={() => edit(r)}
                        style={{ background: 'transparent', border: '1px solid #3b82f6', color: '#60a5fa', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontSize: 11, marginRight: 4 }}>Edit</button>
                <button onClick={() => remove(r.id)}
                        style={{ background: 'transparent', border: '1px solid #ef4444', color: '#fca5a5', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontSize: 11 }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DrugClassRulesEditor;
