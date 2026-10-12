import React, { useEffect, useState } from 'react';

const titleCase = (key) =>
  String(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());

function RecordValue({ value }) {
  if (value === null || value === undefined || value === '') return <span style={{ color: '#64748b' }}>Not provided</span>;
  if (typeof value === 'boolean') return <span>{value ? 'Yes' : 'No'}</span>;
  if (Array.isArray(value)) return <ul style={{ margin: 0, paddingLeft: 18 }}>{value.map((item, i) => <li key={i}><RecordValue value={item} /></li>)}</ul>;
  if (typeof value === 'object') {
    return (
      <dl style={{ margin: 0 }}>
        {Object.entries(value).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', gap: 8 }}>
            <dt style={{ color: '#94a3b8' }}>{titleCase(k)}</dt>
            <dd style={{ margin: 0 }}><RecordValue value={v} /></dd>
          </div>
        ))}
      </dl>
    );
  }
  return <span style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{String(value)}</span>;
}

/**
 * Details dialog for a table row with Edit / Delete (confirmed) / Cancel.
 * Modelled on ai-340b-contract-pharmacy-audit-recovery RecordDialog.jsx.
 */
export default function RecordDialog({ title = 'Record details', item, columns, onClose, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!item) return null;
  const fields = columns && columns.length
    ? columns.map((c) => ({ key: c.key, label: c.label || titleCase(c.key) }))
    : Object.keys(item).map((key) => ({ key, label: titleCase(key) }));

  return (
    <div className="modalBackdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }} style={styles.backdrop}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} style={styles.dialog}>
        <header style={styles.header}>
          <h3 style={styles.title}>{title}</h3>
          <button type="button" style={styles.close} aria-label="Cancel" onClick={onClose}>×</button>
        </header>
        <div style={styles.body}>
          <dl style={styles.grid}>
            {fields.map((f) => (
              <div key={f.key} style={styles.row}>
                <dt style={styles.key}>{f.label}</dt>
                <dd style={styles.val}><RecordValue value={item[f.key]} /></dd>
              </div>
            ))}
          </dl>
        </div>
        <footer style={styles.footer}>
          {onEdit && <button type="button" style={styles.edit} onClick={() => onEdit(item)}>Edit</button>}
          {onDelete && (confirmDelete ? (
            <span style={styles.confirmRow}>
              <strong style={{ color: '#fecaca' }}>Delete this record?</strong>
              <button type="button" style={styles.deleteSolid} onClick={() => onDelete(item)}>Delete</button>
              <button type="button" style={styles.cancel} onClick={() => setConfirmDelete(false)}>Cancel</button>
            </span>
          ) : (
            <button type="button" style={styles.delete} onClick={() => setConfirmDelete(true)}>Delete</button>
          ))}
          <button type="button" style={styles.cancel} onClick={onClose}>Cancel</button>
        </footer>
      </div>
    </div>
  );
}

const styles = {
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 },
  dialog: { background: '#1e293b', border: '1px solid #334155', borderRadius: 18, width: '100%', maxWidth: 720, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #334155' },
  title: { margin: 0, fontSize: 18, fontWeight: 600, color: '#f1f5f9' },
  close: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, width: 32, height: 32, color: '#f87171', cursor: 'pointer', fontSize: 15 },
  body: { padding: 20, overflowY: 'auto' },
  grid: { margin: 0, display: 'grid', gap: 10 },
  row: { display: 'grid', gridTemplateColumns: 'minmax(140px, 32%) 1fr', gap: 14, padding: '10px 12px', background: 'rgba(15,23,42,0.6)', border: '1px solid #334155', borderRadius: 10 },
  key: { margin: 0, fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.03em' },
  val: { margin: 0, fontSize: 14, color: '#e2e8f0' },
  footer: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', padding: '14px 20px', borderTop: '1px solid #334155' },
  confirmRow: { display: 'flex', gap: 10, alignItems: 'center', marginRight: 'auto' },
  edit: { background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: 10, padding: '9px 16px', color: '#60a5fa', fontWeight: 600, cursor: 'pointer' },
  delete: { background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 10, padding: '9px 16px', color: '#f87171', fontWeight: 600, cursor: 'pointer' },
  deleteSolid: { background: '#dc2626', border: '1px solid #dc2626', borderRadius: 10, padding: '9px 16px', color: '#fff', fontWeight: 600, cursor: 'pointer' },
  cancel: { background: 'transparent', border: '1px solid #475569', borderRadius: 10, padding: '9px 16px', color: '#cbd5e1', fontWeight: 600, cursor: 'pointer' },
};
