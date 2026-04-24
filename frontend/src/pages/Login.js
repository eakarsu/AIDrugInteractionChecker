import React, { useState } from 'react';
import api from '../services/api';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      onLogin();
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
    setLoading(false);
  };

  const populateCredentials = () => {
    setEmail('sarah@hospital.com');
    setPassword('password123');
  };

  return (
    <div style={styles.container}>
      <div style={styles.bgOverlay} />
      <div style={styles.card}>
        <div style={styles.logoSection}>
          <div style={styles.logoIcon}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="4" y="4" width="40" height="40" rx="12" fill="#3b82f6" />
              <path d="M24 12v24M12 24h24" stroke="white" strokeWidth="4" strokeLinecap="round" />
              <circle cx="24" cy="24" r="6" fill="white" fillOpacity="0.3" />
            </svg>
          </div>
          <h1 style={styles.title}>AI Drug Interaction Checker</h1>
          <p style={styles.subtitle}>Clinical Decision Support System</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.field}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder="Enter your email"
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" style={styles.loginBtn} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <button type="button" onClick={populateCredentials} style={styles.demoBtn}>
            Use Demo Credentials
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>HIPAA Compliant | SOC 2 Certified | FDA Registered</p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    position: 'relative',
    padding: '20px',
  },
  bgOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(circle at 30% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%), radial-gradient(circle at 70% 50%, rgba(16, 185, 129, 0.08) 0%, transparent 50%)',
  },
  card: {
    background: 'linear-gradient(145deg, #1e293b, #0f172a)',
    border: '1px solid #334155',
    borderRadius: '24px',
    padding: '48px',
    width: '100%',
    maxWidth: '440px',
    position: 'relative',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 100px rgba(59, 130, 246, 0.1)',
  },
  logoSection: {
    textAlign: 'center',
    marginBottom: '36px',
  },
  logoIcon: {
    marginBottom: '16px',
    display: 'inline-block',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#94a3b8',
    fontWeight: '400',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  error: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '12px',
    padding: '12px 16px',
    color: '#fca5a5',
    fontSize: '14px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  input: {
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '14px 16px',
    color: '#f1f5f9',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'Inter, sans-serif',
  },
  loginBtn: {
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    padding: '14px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    fontFamily: 'Inter, sans-serif',
    marginTop: '8px',
  },
  demoBtn: {
    background: 'transparent',
    color: '#3b82f6',
    border: '1px solid #3b82f6',
    borderRadius: '12px',
    padding: '12px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background 0.2s',
    fontFamily: 'Inter, sans-serif',
  },
  footer: {
    marginTop: '32px',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '11px',
    color: '#475569',
    letterSpacing: '0.05em',
  },
};

export default Login;
