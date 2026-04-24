import React from 'react';
import { useNavigate } from 'react-router-dom';

const cards = [
  { path: '/drugs', title: 'Drug Database', desc: 'Search and manage comprehensive drug information', icon: '⬡', color: '#3b82f6', count: '20+ drugs' },
  { path: '/interactions', title: 'Drug Interactions', desc: 'AI-powered drug-drug interaction analysis', icon: '⇄', color: '#ef4444', count: 'Critical alerts' },
  { path: '/patients', title: 'Patient Profiles', desc: 'Manage patient medication lists and records', icon: '♥', color: '#10b981', count: '16 patients' },
  { path: '/adverse-reactions', title: 'Adverse Reactions', desc: 'Track and analyze adverse drug reactions', icon: '⚠', color: '#f59e0b', count: 'ADR reports' },
  { path: '/dosage', title: 'Dosage Calculator', desc: 'AI dosage recommendations per patient', icon: '⊕', color: '#8b5cf6', count: 'Smart dosing' },
  { path: '/alternatives', title: 'Drug Alternatives', desc: 'Find therapeutic alternatives for medications', icon: '↔', color: '#06b6d4', count: 'Formulary' },
  { path: '/allergies', title: 'Allergy Checker', desc: 'Cross-reactivity and allergy assessment', icon: '✦', color: '#ec4899', count: 'Safety check' },
  { path: '/contraindications', title: 'Contraindications', desc: 'Drug-disease contraindication screening', icon: '⊘', color: '#f43f5e', count: 'Risk alerts' },
  { path: '/food-interactions', title: 'Food Interactions', desc: 'Drug-food interaction analysis and advice', icon: '▣', color: '#84cc16', count: 'Diet alerts' },
  { path: '/pregnancy', title: 'Pregnancy Safety', desc: 'FDA categories and teratogenicity assessment', icon: '◈', color: '#d946ef', count: 'Safety ratings' },
  { path: '/pediatric', title: 'Pediatric Dosing', desc: 'Weight-based pediatric dosage calculation', icon: '◇', color: '#14b8a6', count: 'Age-adjusted' },
  { path: '/geriatric', title: 'Geriatric Alerts', desc: 'Beers criteria and elderly safety screening', icon: '◆', color: '#f97316', count: 'Beers list' },
  { path: '/pharmacogenomics', title: 'Pharmacogenomics', desc: 'Genotype-guided drug therapy recommendations', icon: '⬢', color: '#6366f1', count: 'PGx data' },
  { path: '/guidelines', title: 'Clinical Guidelines', desc: 'Evidence-based clinical practice guidelines', icon: '▥', color: '#0ea5e9', count: 'EBM guides' },
  { path: '/audit', title: 'Audit Log', desc: 'Track all system actions and AI queries', icon: '▤', color: '#475569', count: 'Compliance' },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div>
      <div style={styles.welcome}>
        <div>
          <h1 style={styles.welcomeTitle}>Welcome back, {user.name?.split(' ')[0] || 'User'}</h1>
          <p style={styles.welcomeSubtitle}>AI-Powered Clinical Decision Support System</p>
        </div>
        <div style={styles.stats}>
          <div style={styles.stat}>
            <div style={styles.statValue}>$8B</div>
            <div style={styles.statLabel}>Market Size</div>
          </div>
          <div style={styles.stat}>
            <div style={styles.statValue}>15</div>
            <div style={styles.statLabel}>AI Modules</div>
          </div>
          <div style={styles.stat}>
            <div style={styles.statValue}>24/7</div>
            <div style={styles.statLabel}>Monitoring</div>
          </div>
        </div>
      </div>

      <div style={styles.grid}>
        {cards.map((card) => (
          <div
            key={card.path}
            onClick={() => navigate(card.path)}
            style={styles.card}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = card.color;
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = `0 12px 40px ${card.color}20`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#1e293b';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={styles.cardTop}>
              <div style={{ ...styles.cardIcon, background: `${card.color}15`, color: card.color, border: `1px solid ${card.color}30` }}>
                {card.icon}
              </div>
              <span style={{ ...styles.cardCount, color: card.color, background: `${card.color}10`, border: `1px solid ${card.color}20` }}>
                {card.count}
              </span>
            </div>
            <h3 style={styles.cardTitle}>{card.title}</h3>
            <p style={styles.cardDesc}>{card.desc}</p>
            <div style={{ ...styles.cardArrow, color: card.color }}>→</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  welcome: {
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(139, 92, 246, 0.05))',
    border: '1px solid rgba(59, 130, 246, 0.15)',
    borderRadius: '20px',
    padding: '32px',
    marginBottom: '32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px',
  },
  welcomeTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: '6px',
  },
  welcomeSubtitle: {
    fontSize: '15px',
    color: '#64748b',
  },
  stats: {
    display: 'flex',
    gap: '32px',
  },
  stat: {
    textAlign: 'center',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#3b82f6',
  },
  statLabel: {
    fontSize: '11px',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginTop: '2px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  },
  card: {
    background: '#1e293b',
    border: '1px solid #1e293b',
    borderRadius: '16px',
    padding: '24px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  cardIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
  },
  cardCount: {
    fontSize: '10px',
    fontWeight: '600',
    padding: '4px 10px',
    borderRadius: '20px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: '6px',
  },
  cardDesc: {
    fontSize: '13px',
    color: '#64748b',
    lineHeight: '1.5',
  },
  cardArrow: {
    position: 'absolute',
    bottom: '24px',
    right: '24px',
    fontSize: '18px',
    fontWeight: '600',
    opacity: 0.5,
  },
};

export default Dashboard;
