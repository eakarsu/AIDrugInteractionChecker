import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import AIAnalysis from '../components/AIAnalysis';
import {
  FormInput,
  FormSelect,
  FormTextarea,
  SubmitButton,
  PageHeader,
  SeverityBadge,
} from '../components/FormField';

const AuditPage = () => {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [formData, setFormData] = useState({});
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [editing, setEditing] = useState(false);

  const fetchData = async () => {
    try {
      const res = await api.get('/audit');
      setItems(res.data.data || res.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns = [
    { key: 'user_name', label: 'User' },
    { key: 'action', label: 'Action' },
    { key: 'entity_type', label: 'Entity Type' },
    {
      key: 'created_at',
      label: 'Created At',
      render: (val) => (val ? new Date(val).toLocaleString() : '—'),
    },
    {
      key: 'details',
      label: 'Details',
      render: (val) => {
        const str = typeof val === 'string' ? val : JSON.stringify(val);
        return str && str.length > 50 ? str.substring(0, 50) + '...' : str || '—';
      },
    },
  ];

  const handleDelete = async (id) => {
    try {
      await api.delete(`/audit/${id}`);
      setShowDetail(false);
      fetchData();
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete.');
    }
  };

  const onRowClick = (row) => {
    setSelectedItem(row);
    setShowDetail(true);
  };

  const parseDetails = (details) => {
    if (!details) return null;
    try {
      const parsed = typeof details === 'string' ? JSON.parse(details) : details;
      if (typeof parsed === 'object' && parsed !== null) {
        return Object.entries(parsed).map(([key, value]) => (
          <div key={key} style={styles.kvRow}>
            <span style={styles.kvKey}>{key}</span>
            <span style={styles.kvValue}>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
          </div>
        ));
      }
      return <span style={{ color: '#cbd5e1', fontSize: '14px' }}>{String(parsed)}</span>;
    } catch {
      return <span style={{ color: '#cbd5e1', fontSize: '14px' }}>{String(details)}</span>;
    }
  };

  const detailRow = (label, value) => (
    <div style={styles.detailRow}>
      <span style={styles.detailLabel}>{label}</span>
      <span style={styles.detailValue}>{value || '—'}</span>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Audit Log"
        subtitle="Track all system actions and AI queries"
      />

      <DataTable
        columns={columns}
        data={items}
        onRowClick={onRowClick}
        onDelete={(id) => {
          if (window.confirm('Are you sure you want to delete this audit record?')) {
            handleDelete(id);
          }
        }}
      />

      {/* Detail Modal */}
      <Modal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title="Audit Log Details"
        wide
      >
        {selectedItem && (
          <div>
            <div style={styles.detailGrid}>
              {detailRow('User', selectedItem.user_name)}
              {detailRow('Action', selectedItem.action)}
              {detailRow('Entity Type', selectedItem.entity_type)}
              {detailRow('Entity ID', selectedItem.entity_id)}
              {detailRow('Created At', selectedItem.created_at ? new Date(selectedItem.created_at).toLocaleString() : '—')}
              {detailRow('IP Address', selectedItem.ip_address)}
            </div>
            <div style={styles.detailSection}>
              <div style={styles.detailSectionLabel}>Details</div>
              <div style={styles.detailSectionContent}>
                {parseDetails(selectedItem.details)}
              </div>
            </div>

            <div style={styles.detailActions}>
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this audit record?')) {
                    handleDelete(selectedItem.id);
                  }
                }}
                style={styles.deleteBtn}
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const styles = {
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '20px',
  },
  detailRow: {
    background: 'rgba(15, 23, 42, 0.5)',
    borderRadius: '10px',
    padding: '12px 16px',
    border: '1px solid #334155',
  },
  detailLabel: {
    display: 'block',
    fontSize: '11px',
    fontWeight: '500',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    marginBottom: '4px',
  },
  detailValue: {
    fontSize: '14px',
    color: '#e2e8f0',
    fontWeight: '500',
  },
  detailSection: {
    background: 'rgba(15, 23, 42, 0.5)',
    borderRadius: '10px',
    padding: '14px 16px',
    border: '1px solid #334155',
    marginBottom: '12px',
  },
  detailSectionLabel: {
    fontSize: '11px',
    fontWeight: '500',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    marginBottom: '6px',
  },
  detailSectionContent: {
    fontSize: '14px',
    color: '#cbd5e1',
    lineHeight: '1.6',
  },
  kvRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
    alignItems: 'center',
  },
  kvKey: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'capitalize',
  },
  kvValue: {
    fontSize: '13px',
    color: '#e2e8f0',
    textAlign: 'right',
    maxWidth: '60%',
    wordBreak: 'break-word',
  },
  detailActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '20px',
    marginBottom: '4px',
  },
  deleteBtn: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '10px',
    padding: '10px 20px',
    color: '#f87171',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
  },
};

export default AuditPage;
