import React from 'react';

const inputStyle = {
  background: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '10px',
  padding: '10px 14px',
  color: '#f1f5f9',
  fontSize: '14px',
  width: '100%',
  outline: 'none',
  fontFamily: 'Inter, sans-serif',
};

const labelStyle = {
  fontSize: '12px',
  fontWeight: '500',
  color: '#94a3b8',
  marginBottom: '4px',
  display: 'block',
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
};

export const FormInput = ({ label, ...props }) => (
  <div style={{ marginBottom: '14px' }}>
    {label && <label style={labelStyle}>{label}</label>}
    <input style={inputStyle} {...props} />
  </div>
);

export const FormSelect = ({ label, options, ...props }) => (
  <div style={{ marginBottom: '14px' }}>
    {label && <label style={labelStyle}>{label}</label>}
    <select style={inputStyle} {...props}>
      <option value="">Select...</option>
      {options.map((opt, i) => (
        <option key={i} value={typeof opt === 'object' ? opt.value : opt}>
          {typeof opt === 'object' ? opt.label : opt}
        </option>
      ))}
    </select>
  </div>
);

export const FormTextarea = ({ label, ...props }) => (
  <div style={{ marginBottom: '14px' }}>
    {label && <label style={labelStyle}>{label}</label>}
    <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} {...props} />
  </div>
);

export const SubmitButton = ({ children, loading, ...props }) => (
  <button
    style={{
      background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      padding: '12px 24px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: loading ? 'wait' : 'pointer',
      opacity: loading ? 0.7 : 1,
      fontFamily: 'Inter, sans-serif',
      width: '100%',
      marginTop: '8px',
    }}
    disabled={loading}
    {...props}
  >
    {loading ? 'Processing...' : children}
  </button>
);

export const SeverityBadge = ({ severity }) => {
  const colors = {
    major: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', color: '#f87171' },
    severe: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', color: '#f87171' },
    high: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', color: '#f87171' },
    moderate: { bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.3)', color: '#fbbf24' },
    mild: { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.3)', color: '#4ade80' },
    minor: { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.3)', color: '#4ade80' },
    low: { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.3)', color: '#4ade80' },
  };
  const s = (severity || '').toLowerCase();
  const c = colors[s] || { bg: 'rgba(100, 116, 139, 0.15)', border: 'rgba(100, 116, 139, 0.3)', color: '#94a3b8' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: '600',
      background: c.bg,
      border: `1px solid ${c.border}`,
      color: c.color,
      textTransform: 'capitalize',
    }}>
      {severity || 'N/A'}
    </span>
  );
};

export const PageHeader = ({ title, subtitle, onAdd, addLabel }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f1f5f9', marginBottom: '4px' }}>{title}</h1>
      {subtitle && <p style={{ fontSize: '14px', color: '#64748b' }}>{subtitle}</p>}
    </div>
    {onAdd && (
      <button
        onClick={onAdd}
        style={{
          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
          color: 'white',
          border: 'none',
          borderRadius: '10px',
          padding: '10px 20px',
          fontSize: '13px',
          fontWeight: '600',
          cursor: 'pointer',
          fontFamily: 'Inter, sans-serif',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          whiteSpace: 'nowrap',
        }}
      >
        + {addLabel || 'Add New'}
      </button>
    )}
  </div>
);
