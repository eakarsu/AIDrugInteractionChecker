import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const menuItems = [
  { path: '/', label: 'Dashboard', icon: '◎' },
  { path: '/drugs', label: 'Drug Database', icon: '⬡' },
  { path: '/interactions', label: 'Interactions', icon: '⇄' },
  { path: '/patients', label: 'Patients', icon: '♥' },
  { path: '/adverse-reactions', label: 'Adverse Reactions', icon: '⚠' },
  { path: '/dosage', label: 'Dosage Calculator', icon: '⊕' },
  { path: '/renal-dose-review', label: 'Renal Dose Review', icon: '◌' },
  { path: '/alternatives', label: 'Drug Alternatives', icon: '↔' },
  { path: '/allergies', label: 'Allergy Checker', icon: '✦' },
  { path: '/contraindications', label: 'Contraindications', icon: '⊘' },
  { path: '/food-interactions', label: 'Food Interactions', icon: '▣' },
  { path: '/pregnancy', label: 'Pregnancy Safety', icon: '◈' },
  { path: '/pediatric', label: 'Pediatric Dosing', icon: '◇' },
  { path: '/geriatric', label: 'Geriatric Alerts', icon: '◆' },
  { path: '/pharmacogenomics', label: 'Pharmacogenomics', icon: '⬢' },
  { path: '/guidelines', label: 'Clinical Guidelines', icon: '▥' },
  { path: '/audit', label: 'Audit Log', icon: '▤' },
  { path: '/ai-multi-check', label: 'AI Multi-Drug Check', icon: '⊕' },
  { path: '/ai-geriatric-risk', label: 'AI Geriatric Risk', icon: '◈' },
  { path: '/ai-audit-summary', label: 'AI Audit Summary', icon: '▦' },
  { path: '/ai-clinical-trials', label: 'AI Clinical Trial Match', icon: '◇' },
  { path: '/custom-views', label: 'Pharmacy Views', icon: '▼' },
];

const Layout = ({ children, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: collapsed ? '72px' : '260px',
        background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
        borderRight: '1px solid #1e293b',
        transition: 'width 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 100,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: collapsed ? '20px 16px' : '20px 24px',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
        }} onClick={() => setCollapsed(!collapsed)}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: '700',
            color: 'white',
            flexShrink: 0,
          }}>+</div>
          {!collapsed && (
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#f1f5f9' }}>DrugCheck AI</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Clinical DSS</div>
            </div>
          )}
        </div>

        <nav style={{ flex: 1, overflow: 'auto', padding: '12px 8px' }}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <div
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: collapsed ? '10px 16px' : '10px 16px',
                  marginBottom: '2px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  background: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  color: isActive ? '#60a5fa' : '#94a3b8',
                  fontSize: '13px',
                  fontWeight: isActive ? '600' : '400',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ fontSize: '16px', width: '24px', textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                {!collapsed && item.label}
              </div>
            );
          })}
        </nav>

        <div style={{
          padding: collapsed ? '16px' : '16px 20px',
          borderTop: '1px solid #1e293b',
        }}>
          {!collapsed && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>{user.name || 'User'}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>{user.role || 'user'}</div>
            </div>
          )}
          <button
            onClick={onLogout}
            style={{
              width: '100%',
              padding: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '8px',
              color: '#f87171',
              cursor: 'pointer',
              fontSize: '12px',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {collapsed ? '⏻' : 'Sign Out'}
          </button>
        </div>
      </aside>

      <main style={{
        flex: 1,
        marginLeft: collapsed ? '72px' : '260px',
        transition: 'margin-left 0.3s ease',
        padding: '32px',
        minHeight: '100vh',
        background: '#0f172a',
      }}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
