import React from 'react';

const Modal = ({ isOpen, onClose, title, children, wide }) => {
  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={{ ...styles.modal, maxWidth: wide ? '900px' : '600px' }} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>{title}</h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>
        <div style={styles.body}>{children}</div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '20px',
    width: '100%',
    maxHeight: '85vh',
    overflow: 'auto',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #334155',
    position: 'sticky',
    top: 0,
    background: '#1e293b',
    zIndex: 1,
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#f1f5f9',
  },
  closeBtn: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '8px',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#f87171',
    fontSize: '14px',
    fontFamily: 'Inter, sans-serif',
  },
  body: {
    padding: '24px',
  },
};

export default Modal;
