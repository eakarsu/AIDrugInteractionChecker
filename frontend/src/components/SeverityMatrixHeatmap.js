import React, { useEffect, useState } from 'react';
import api from '../services/api';

const cellColor = (v) => {
  if (!v) return '#1e293b';
  if (v >= 4) return '#7f1d1d';
  if (v >= 3) return '#ef4444';
  if (v >= 2) return '#f59e0b';
  return '#10b981';
};

const SeverityMatrixHeatmap = () => {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/custom-views/severity-matrix').then(r => setData(r.data)).catch(e => setErr(e.message));
  }, []);

  if (err) return <div style={{ color: '#fca5a5' }}>Error: {err}</div>;
  if (!data) return <div style={{ color: '#94a3b8' }}>Loading heatmap...</div>;

  const { drugs = [], matrix = [] } = data;
  const cell = 38;

  return (
    <div style={{ background: '#1e293b', padding: 16, borderRadius: 12, border: '1px solid #334155' }}>
      <div style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 600, marginBottom: 10 }}>
        Interaction Severity Matrix
      </div>
      <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 14 }}>
        Drug-x-Drug heatmap. Darker red = higher severity. Total pairs: {data.total_pairs}
      </div>
      <div style={{ overflow: 'auto' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 2 }}>
          <thead>
            <tr>
              <th></th>
              {drugs.map(d => (
                <th key={d} style={{ color: '#94a3b8', fontSize: 10, padding: 4, transform: 'rotate(-45deg)', whiteSpace: 'nowrap', width: cell }}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {drugs.map((row, i) => (
              <tr key={row}>
                <td style={{ color: '#cbd5e1', fontSize: 11, padding: '0 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>{row}</td>
                {drugs.map((col, j) => {
                  const v = matrix[i] && matrix[i][j];
                  return (
                    <td key={col} title={`${row} x ${col} score=${v}`}
                        style={{
                          width: cell, height: cell,
                          background: cellColor(v),
                          textAlign: 'center',
                          color: '#fff',
                          fontSize: 10,
                          borderRadius: 4,
                        }}>{v || ''}</td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SeverityMatrixHeatmap;
