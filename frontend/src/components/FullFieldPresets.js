import React from 'react';

/**
 * Multiple one-click "fill every field" presets for the AI prompt forms.
 *
 * Each preset populates every field in the form — required and optional — so a
 * reviewer can run a complete example and then edit the values before sending
 * the request. Modelled on AICompetitiveAnalysisTool FullFieldPresets.js.
 */
export function fillEveryField(values, variant = 0, choices = {}) {
  const names = ['Typical adult', 'Frail elderly', 'Pediatric'];
  return Object.fromEntries(Object.entries(values).map(([key, value]) => {
    if (['id', 'created_at', 'updated_at', 'user_id'].includes(key)) return [key, value];
    if (choices[key] && choices[key].length) return [key, choices[key][variant % choices[key].length]];
    if (Array.isArray(value)) return [key, [`${names[variant]} example item`, 'Review before generating']];
    if (value && typeof value === 'object') return [key, { ...value }];
    if (typeof value === 'boolean') return [key, variant !== 1];
    if (/date|deadline/.test(key)) return [key, new Date(Date.now() + (variant + 7) * 86400000).toISOString().slice(0, 10)];
    if (/email/.test(key)) return [key, `patient${variant + 1}@example.com`];
    if (/age/.test(key)) return [key, [72, 84, 9][variant]];
    if (/weight/.test(key)) return [key, [70, 55, 22][variant]];
    if (/count/.test(key)) return [key, [8, 5, 3][variant]];
    if (/renal|function|crcl|egfr/.test(key)) return [key, ['CrCl 45 mL/min', 'eGFR 30 mL/min/1.73m2', 'CrCl 22 mL/min'][variant]];
    if (/trimester/.test(key)) return [key, ['1st trimester', '2nd trimester', '3rd trimester'][variant]];
    if (/breastfeeding/.test(key)) return [key, variant !== 0];
    if (typeof value === 'number') return [key, [75, 60, 40][variant]];
    return [key, `${names[variant]} example: review dosing, interactions, contraindications, and monitoring before generating.`];
  }));
}

export default function FullFieldPresets({ value, onChange, choices = {}, presets, disabled = false }) {
  const labels = presets ? presets.map((preset) => preset.label) : ['Typical adult', 'Frail elderly', 'Pediatric'];
  return (
    <div style={styles.bar}>
      <div>
        <strong style={styles.title}>Fill every field</strong>
        <p style={styles.hint}>Each example fills required and optional fields. Review and edit before generating.</p>
      </div>
      <div style={styles.actions}>
        {labels.map((label, index) => (
          <button
            type="button"
            key={label}
            disabled={disabled}
            style={styles.btn}
            onClick={() => onChange(presets ? { ...value, ...presets[index].values } : fillEveryField(value, index, choices))}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

const styles = {
  bar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    marginBottom: '14px',
    borderRadius: '10px',
    border: '1px solid rgba(139, 92, 246, 0.35)',
    background: 'rgba(139, 92, 246, 0.08)',
  },
  title: { color: '#e2e8f0', fontSize: '13px' },
  hint: { color: '#94a3b8', fontSize: '12px', margin: '4px 0 0' },
  actions: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  btn: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(139, 92, 246, 0.4)',
    background: 'rgba(139, 92, 246, 0.15)',
    color: '#c4b5fd',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
  },
};
