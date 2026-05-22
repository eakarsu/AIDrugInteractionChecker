import React, { useEffect, useState } from 'react';
import api from '../services/api';

const SeverityDistributionDonut = () => {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/custom-views/severity-distribution').then(r => setData(r.data)).catch(e => setErr(e.message));
  }, []);

  if (err) return <div style={{ color: '#fca5a5' }}>Error: {err}</div>;
  if (!data) return <div style={{ color: '#94a3b8' }}>Loading donut...</div>;

  const segments = data.segments || [];
  const total = data.total || 1;
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = 80;
  const inner = 50;

  let cumulative = 0;
  const arcs = segments.map((s, idx) => {
    const start = cumulative / total;
    cumulative += s.count;
    const end = cumulative / total;
    const a1 = start * 2 * Math.PI - Math.PI / 2;
    const a2 = end * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2);
    const y2 = cy + r * Math.sin(a2);
    const xi2 = cx + inner * Math.cos(a2);
    const yi2 = cy + inner * Math.sin(a2);
    const xi1 = cx + inner * Math.cos(a1);
    const yi1 = cy + inner * Math.sin(a1);
    const large = end - start > 0.5 ? 1 : 0;
    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${inner} ${inner} 0 ${large} 0 ${xi1} ${yi1} Z`;
    return <path key={idx} d={d} fill={s.color} stroke="#0f172a" strokeWidth="1" />;
  });

  return (
    <div style={{ background: '#1e293b', padding: 16, borderRadius: 12, border: '1px solid #334155' }}>
      <div style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 600, marginBottom: 10 }}>
        Severity Distribution
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <svg width={size} height={size}>
          {arcs}
          <text x={cx} y={cy - 4} textAnchor="middle" fill="#f1f5f9" fontSize="22" fontWeight="700">{total}</text>
          <text x={cx} y={cy + 14} textAnchor="middle" fill="#94a3b8" fontSize="10">Interactions</text>
        </svg>
        <div style={{ flex: 1 }}>
          {segments.map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ width: 12, height: 12, background: s.color, borderRadius: 3, display: 'inline-block' }}></span>
              <span style={{ color: '#e2e8f0', fontSize: 13, textTransform: 'capitalize', flex: 1 }}>{s.label}</span>
              <span style={{ color: '#94a3b8', fontSize: 12 }}>{s.count} ({s.percent}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SeverityDistributionDonut;
