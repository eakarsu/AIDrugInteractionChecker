import React from 'react';

const DataTable = ({ columns, data, onRowClick, onDelete, onEdit }) => {
  return (
    <div style={styles.wrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={i} style={styles.th}>{col.label}</th>
            ))}
            {(onDelete || onEdit) && <th style={{ ...styles.th, width: '120px', textAlign: 'center' }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (onDelete || onEdit ? 1 : 0)} style={styles.empty}>
                No data available
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={row.id || i}
                style={styles.tr}
                onClick={() => onRowClick && onRowClick(row)}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                {columns.map((col, j) => (
                  <td key={j} style={styles.td}>
                    {col.render ? col.render(row[col.key], row) : (row[col.key] || '—')}
                  </td>
                ))}
                {(onDelete || onEdit) && (
                  <td style={{ ...styles.td, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      {onEdit && (
                        <button
                          onClick={() => onEdit(row)}
                          style={styles.editBtn}
                        >
                          Edit
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this item?')) onDelete(row.id);
                          }}
                          style={styles.deleteBtn}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

const styles = {
  wrapper: {
    overflow: 'auto',
    borderRadius: '16px',
    border: '1px solid #1e293b',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '14px 16px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    background: '#0f172a',
    borderBottom: '1px solid #1e293b',
    whiteSpace: 'nowrap',
  },
  tr: {
    cursor: 'pointer',
    transition: 'background 0.15s',
    borderBottom: '1px solid rgba(30, 41, 59, 0.5)',
  },
  td: {
    padding: '12px 16px',
    fontSize: '13px',
    color: '#cbd5e1',
    verticalAlign: 'middle',
  },
  empty: {
    textAlign: 'center',
    padding: '40px',
    color: '#475569',
    fontSize: '14px',
  },
  editBtn: {
    background: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: '6px',
    padding: '4px 12px',
    color: '#60a5fa',
    fontSize: '12px',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    fontWeight: '500',
  },
  deleteBtn: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '6px',
    padding: '4px 12px',
    color: '#f87171',
    fontSize: '12px',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    fontWeight: '500',
  },
};

export default DataTable;
