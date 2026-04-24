const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

app.use(cors());
app.use(express.json());

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

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
