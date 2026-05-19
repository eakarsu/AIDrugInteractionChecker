const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

// Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// Env-driven CORS allowlist
const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (corsOrigins.includes('*') || corsOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/drugs', require('./routes/drugs'));
app.use('/api/interactions', require('./routes/interactions'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/adverse-reactions', require('./routes/adverse_reactions'));
app.use('/api/dosage', require('./routes/dosage'));
app.use('/api/alternatives', require('./routes/alternatives'));
app.use('/api/allergies', require('./routes/allergies'));
app.use('/api/contraindications', require('./routes/contraindications'));
app.use('/api/food-interactions', require('./routes/food_interactions'));
app.use('/api/pregnancy', require('./routes/pregnancy'));
app.use('/api/pediatric', require('./routes/pediatric'));
app.use('/api/geriatric', require('./routes/geriatric'));
app.use('/api/pharmacogenomics', require('./routes/pharmacogenomics'));
app.use('/api/guidelines', require('./routes/guidelines'));
app.use('/api/audit', require('./routes/audit'));

// Expanded AI endpoints
const aiExpanded = require('./routes/aiExpanded');
app.use('/api', aiExpanded);
app.use('/api/drug-database-sync', require('./routes/drugDatabaseSync'));
app.use('/api/agentic-pharmacist', require('./routes/agenticPharmacist'));
app.use('/api/voice-intake', require('./routes/voiceIntake'));
app.use('/api/pharmacy-integration', require('./routes/pharmacyIntegration'));
app.use('/api/formulary-check', require('./routes/formularyCheck'));
app.use('/api/population-health', require('./routes/populationHealth'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// === Custom Pharmacy Views (mounted BEFORE 404) ===
try {
  const _customViews = require('../routes/customViews');
  app.use('/api/custom-views', _customViews);
  console.log('[custom-views] mounted at /api/custom-views');
} catch (e) {
  console.warn('[custom-views] failed to mount:', e.message);
}

// === Batch 03 Gaps & Frontend Mounts ===
try {
  const _batch03 = require('../routes/batch03Gaps');
  if (typeof authenticateToken === 'function') app.use('/api', authenticateToken, _batch03);
  else app.use('/api', _batch03);
} catch (_e) { /* batch03 gap routes optional */ }

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
