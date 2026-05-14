const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'drug_interaction_checker',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function seed() {
  console.log('Seeding database...');

  // Create tables
  await pool.query(`
    DROP TABLE IF EXISTS audit_log CASCADE;
    DROP TABLE IF EXISTS pharmacogenomics CASCADE;
    DROP TABLE IF EXISTS clinical_guidelines CASCADE;
    DROP TABLE IF EXISTS geriatric_alerts CASCADE;
    DROP TABLE IF EXISTS pediatric_dosing CASCADE;
    DROP TABLE IF EXISTS pregnancy_safety CASCADE;
    DROP TABLE IF EXISTS food_interactions CASCADE;
    DROP TABLE IF EXISTS contraindications CASCADE;
    DROP TABLE IF EXISTS drug_allergies CASCADE;
    DROP TABLE IF EXISTS drug_alternatives CASCADE;
    DROP TABLE IF EXISTS dosage_guidelines CASCADE;
    DROP TABLE IF EXISTS adverse_reactions CASCADE;
    DROP TABLE IF EXISTS patient_medications CASCADE;
    DROP TABLE IF EXISTS drug_interactions CASCADE;
    DROP TABLE IF EXISTS patients CASCADE;
    DROP TABLE IF EXISTS drugs CASCADE;
    DROP TABLE IF EXISTS users CASCADE;

    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'pharmacist',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE drugs (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      generic_name VARCHAR(255),
      drug_class VARCHAR(255),
      category VARCHAR(255),
      manufacturer VARCHAR(255),
      fda_status VARCHAR(100),
      description TEXT,
      side_effects TEXT,
      contraindications TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE patients (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255) NOT NULL,
      date_of_birth DATE,
      gender VARCHAR(20),
      weight_kg DECIMAL(5,1),
      height_cm DECIMAL(5,1),
      allergies TEXT,
      medical_conditions TEXT,
      insurance_id VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE drug_interactions (
      id SERIAL PRIMARY KEY,
      drug1_id INTEGER REFERENCES drugs(id),
      drug2_id INTEGER REFERENCES drugs(id),
      severity VARCHAR(50),
      interaction_type VARCHAR(100),
      description TEXT,
      clinical_significance TEXT,
      management TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE patient_medications (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER REFERENCES patients(id),
      drug_id INTEGER REFERENCES drugs(id),
      dosage VARCHAR(100),
      frequency VARCHAR(100),
      route VARCHAR(50),
      start_date DATE,
      end_date DATE,
      prescribing_doctor VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE adverse_reactions (
      id SERIAL PRIMARY KEY,
      drug_id INTEGER REFERENCES drugs(id),
      patient_id INTEGER REFERENCES patients(id),
      reaction_type VARCHAR(255),
      severity VARCHAR(50),
      description TEXT,
      onset_date DATE,
      reported_date DATE,
      outcome VARCHAR(100),
      reporter VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE dosage_guidelines (
      id SERIAL PRIMARY KEY,
      drug_id INTEGER REFERENCES drugs(id),
      indication VARCHAR(255),
      age_group VARCHAR(100),
      min_dose VARCHAR(100),
      max_dose VARCHAR(100),
      dose_unit VARCHAR(50),
      frequency VARCHAR(100),
      route VARCHAR(50),
      special_instructions TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE drug_alternatives (
      id SERIAL PRIMARY KEY,
      original_drug_id INTEGER REFERENCES drugs(id),
      alternative_drug_id INTEGER REFERENCES drugs(id),
      reason TEXT,
      efficacy_comparison VARCHAR(100),
      cost_comparison VARCHAR(100),
      preference_rank INTEGER,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE drug_allergies (
      id SERIAL PRIMARY KEY,
      drug_id INTEGER REFERENCES drugs(id),
      patient_id INTEGER REFERENCES patients(id),
      allergy_type VARCHAR(100),
      severity VARCHAR(50),
      reaction_description TEXT,
      verified BOOLEAN DEFAULT false,
      verified_date DATE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE contraindications (
      id SERIAL PRIMARY KEY,
      drug_id INTEGER REFERENCES drugs(id),
      condition VARCHAR(255),
      severity VARCHAR(50),
      description TEXT,
      evidence_level VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE food_interactions (
      id SERIAL PRIMARY KEY,
      drug_id INTEGER REFERENCES drugs(id),
      food_item VARCHAR(255),
      interaction_type VARCHAR(100),
      severity VARCHAR(50),
      description TEXT,
      recommendation TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE pregnancy_safety (
      id SERIAL PRIMARY KEY,
      drug_id INTEGER REFERENCES drugs(id),
      fda_category VARCHAR(10),
      trimester_risk TEXT,
      lactation_risk VARCHAR(100),
      description TEXT,
      alternatives_during_pregnancy TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE pediatric_dosing (
      id SERIAL PRIMARY KEY,
      drug_id INTEGER REFERENCES drugs(id),
      age_range VARCHAR(100),
      weight_based_dose VARCHAR(100),
      max_daily_dose VARCHAR(100),
      formulation VARCHAR(255),
      indication VARCHAR(255),
      special_notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE geriatric_alerts (
      id SERIAL PRIMARY KEY,
      drug_id INTEGER REFERENCES drugs(id),
      risk_level VARCHAR(50),
      beers_criteria BOOLEAN DEFAULT false,
      alert_type VARCHAR(100),
      description TEXT,
      dose_adjustment TEXT,
      monitoring_requirements TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE pharmacogenomics (
      id SERIAL PRIMARY KEY,
      drug_id INTEGER REFERENCES drugs(id),
      gene VARCHAR(100),
      variant VARCHAR(100),
      metabolizer_status VARCHAR(100),
      recommendation TEXT,
      evidence_level VARCHAR(50),
      cpic_guideline VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE clinical_guidelines (
      id SERIAL PRIMARY KEY,
      title VARCHAR(500),
      category VARCHAR(255),
      organization VARCHAR(255),
      summary TEXT,
      recommendations TEXT,
      evidence_grade VARCHAR(50),
      last_reviewed DATE,
      source_url TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE audit_log (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      action VARCHAR(255),
      entity_type VARCHAR(100),
      entity_id INTEGER,
      details JSONB,
      ai_results JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Seed Users
  const hash = await bcrypt.hash('password123', 10);
  await pool.query(`
    INSERT INTO users (name, email, password_hash, role) VALUES
    ('Dr. Sarah Chen', 'sarah@hospital.com', '${hash}', 'physician'),
    ('James Wilson, PharmD', 'james@pharmacy.com', '${hash}', 'pharmacist'),
    ('Admin User', 'admin@drugcheck.com', '${hash}', 'admin')
  `);

  // Seed Drugs (20 items)
  await pool.query(`
    INSERT INTO drugs (name, generic_name, drug_class, category, manufacturer, fda_status, description, side_effects, contraindications) VALUES
    ('Lipitor', 'Atorvastatin', 'HMG-CoA Reductase Inhibitor', 'Cardiovascular', 'Pfizer', 'Approved', 'Statin used to lower cholesterol and reduce cardiovascular risk', 'Myalgia, headache, GI upset, elevated liver enzymes', 'Active liver disease, pregnancy, lactation'),
    ('Metformin', 'Metformin HCl', 'Biguanide', 'Endocrine', 'Various', 'Approved', 'First-line oral antidiabetic for type 2 diabetes', 'GI upset, diarrhea, nausea, lactic acidosis (rare)', 'Renal impairment (eGFR<30), metabolic acidosis'),
    ('Lisinopril', 'Lisinopril', 'ACE Inhibitor', 'Cardiovascular', 'Various', 'Approved', 'ACE inhibitor for hypertension and heart failure', 'Dry cough, hyperkalemia, dizziness, angioedema', 'Pregnancy, bilateral renal artery stenosis, angioedema history'),
    ('Amoxicillin', 'Amoxicillin', 'Penicillin Antibiotic', 'Anti-infective', 'Various', 'Approved', 'Broad-spectrum penicillin antibiotic', 'Diarrhea, nausea, rash, allergic reactions', 'Penicillin allergy, infectious mononucleosis'),
    ('Omeprazole', 'Omeprazole', 'Proton Pump Inhibitor', 'Gastrointestinal', 'AstraZeneca', 'Approved', 'PPI for GERD, peptic ulcer disease', 'Headache, diarrhea, abdominal pain, B12 deficiency', 'Rilpivirine co-administration'),
    ('Warfarin', 'Warfarin Sodium', 'Vitamin K Antagonist', 'Hematologic', 'Bristol-Myers Squibb', 'Approved', 'Anticoagulant for thromboembolic disorders', 'Bleeding, bruising, skin necrosis (rare)', 'Pregnancy, active bleeding, severe hepatic disease'),
    ('Sertraline', 'Sertraline HCl', 'SSRI', 'Psychiatric', 'Pfizer', 'Approved', 'SSRI antidepressant for depression and anxiety disorders', 'Nausea, insomnia, sexual dysfunction, diarrhea', 'MAO inhibitor use within 14 days, pimozide use'),
    ('Amlodipine', 'Amlodipine Besylate', 'Calcium Channel Blocker', 'Cardiovascular', 'Pfizer', 'Approved', 'Calcium channel blocker for hypertension and angina', 'Peripheral edema, dizziness, flushing, headache', 'Severe aortic stenosis, cardiogenic shock'),
    ('Levothyroxine', 'Levothyroxine Sodium', 'Thyroid Hormone', 'Endocrine', 'AbbVie', 'Approved', 'Synthetic thyroid hormone for hypothyroidism', 'Palpitations, weight loss, tremor, insomnia', 'Uncorrected adrenal insufficiency, acute MI'),
    ('Metoprolol', 'Metoprolol Tartrate', 'Beta Blocker', 'Cardiovascular', 'AstraZeneca', 'Approved', 'Beta-blocker for hypertension, angina, heart failure', 'Bradycardia, fatigue, dizziness, cold extremities', 'Severe bradycardia, heart block, cardiogenic shock'),
    ('Gabapentin', 'Gabapentin', 'Anticonvulsant', 'Neurologic', 'Pfizer', 'Approved', 'Anticonvulsant also used for neuropathic pain', 'Drowsiness, dizziness, ataxia, peripheral edema', 'Hypersensitivity to gabapentin'),
    ('Hydrochlorothiazide', 'Hydrochlorothiazide', 'Thiazide Diuretic', 'Cardiovascular', 'Various', 'Approved', 'Thiazide diuretic for hypertension and edema', 'Hypokalemia, hyperuricemia, photosensitivity', 'Anuria, sulfonamide allergy'),
    ('Azithromycin', 'Azithromycin', 'Macrolide Antibiotic', 'Anti-infective', 'Pfizer', 'Approved', 'Macrolide antibiotic for respiratory and soft tissue infections', 'Diarrhea, nausea, abdominal pain, QT prolongation', 'Hepatic impairment history with azithromycin'),
    ('Prednisone', 'Prednisone', 'Corticosteroid', 'Anti-inflammatory', 'Various', 'Approved', 'Systemic corticosteroid for inflammation and autoimmune conditions', 'Weight gain, hyperglycemia, osteoporosis, mood changes', 'Systemic fungal infections, live vaccines'),
    ('Tramadol', 'Tramadol HCl', 'Opioid Analgesic', 'Pain Management', 'Various', 'Approved', 'Centrally acting opioid analgesic for moderate pain', 'Nausea, dizziness, constipation, seizure risk', 'MAO inhibitor use, seizure disorder, <12 years old'),
    ('Ciprofloxacin', 'Ciprofloxacin', 'Fluoroquinolone', 'Anti-infective', 'Bayer', 'Approved', 'Fluoroquinolone antibiotic for various infections', 'Tendinitis, GI upset, CNS effects, photosensitivity', 'Tizanidine use, myasthenia gravis'),
    ('Clopidogrel', 'Clopidogrel', 'Antiplatelet Agent', 'Hematologic', 'Sanofi', 'Approved', 'Antiplatelet for acute coronary syndrome and stroke prevention', 'Bleeding, bruising, GI upset, TTP (rare)', 'Active bleeding, severe hepatic impairment'),
    ('Escitalopram', 'Escitalopram Oxalate', 'SSRI', 'Psychiatric', 'Lundbeck', 'Approved', 'SSRI for depression and generalized anxiety disorder', 'Nausea, insomnia, sexual dysfunction, QT prolongation', 'MAO inhibitor use, pimozide use, QT prolongation'),
    ('Albuterol', 'Albuterol Sulfate', 'Beta-2 Agonist', 'Respiratory', 'Various', 'Approved', 'Short-acting bronchodilator for asthma and COPD', 'Tremor, tachycardia, nervousness, headache', 'Hypersensitivity to albuterol'),
    ('Losartan', 'Losartan Potassium', 'ARB', 'Cardiovascular', 'Merck', 'Approved', 'Angiotensin receptor blocker for hypertension', 'Dizziness, hyperkalemia, hypotension, renal impairment', 'Pregnancy, co-use with aliskiren in diabetes')
  `);

  // Seed Patients (16 items)
  await pool.query(`
    INSERT INTO patients (first_name, last_name, date_of_birth, gender, weight_kg, height_cm, allergies, medical_conditions, insurance_id) VALUES
    ('John', 'Smith', '1955-03-15', 'Male', 82.5, 178, 'Penicillin', 'Hypertension, Type 2 Diabetes, Hyperlipidemia', 'INS-001234'),
    ('Maria', 'Garcia', '1968-07-22', 'Female', 65.0, 162, 'Sulfa drugs', 'Asthma, GERD, Depression', 'INS-002345'),
    ('Robert', 'Johnson', '1942-11-08', 'Male', 75.0, 170, 'None', 'Atrial fibrillation, Heart failure, CKD Stage 3', 'INS-003456'),
    ('Emily', 'Williams', '1990-01-30', 'Female', 58.0, 165, 'Codeine, Latex', 'Epilepsy, Migraine, Anxiety', 'INS-004567'),
    ('James', 'Brown', '1978-09-12', 'Male', 95.0, 183, 'NSAIDs', 'Gout, Hypertension, Obesity', 'INS-005678'),
    ('Linda', 'Davis', '1985-04-18', 'Female', 70.0, 168, 'Penicillin, Cephalosporins', 'Rheumatoid Arthritis, Hypothyroidism', 'INS-006789'),
    ('Michael', 'Miller', '1960-12-25', 'Male', 88.0, 175, 'Aspirin', 'COPD, Type 2 Diabetes, Peripheral Neuropathy', 'INS-007890'),
    ('Jennifer', 'Wilson', '1995-06-07', 'Female', 55.0, 160, 'None', 'Depression, IBS, Insomnia', 'INS-008901'),
    ('David', 'Moore', '1950-02-14', 'Male', 72.0, 172, 'ACE Inhibitors', 'CAD, Post-MI, Hyperlipidemia, BPH', 'INS-009012'),
    ('Susan', 'Taylor', '1973-08-30', 'Female', 68.0, 164, 'Morphine', 'Fibromyalgia, Chronic Pain, Anxiety', 'INS-010123'),
    ('William', 'Anderson', '1938-05-20', 'Male', 65.0, 168, 'None', 'Parkinson Disease, Dementia, Falls risk', 'INS-011234'),
    ('Patricia', 'Thomas', '1982-10-11', 'Female', 72.0, 170, 'Tetracyclines', 'Lupus, Raynaud syndrome, Anemia', 'INS-012345'),
    ('Richard', 'Jackson', '1965-07-03', 'Male', 90.0, 180, 'Statins', 'Post-CABG, AFib, Sleep Apnea', 'INS-013456'),
    ('Barbara', 'White', '1988-12-19', 'Female', 62.0, 166, 'None', 'Pregnancy (28 weeks), Gestational Diabetes', 'INS-014567'),
    ('Charles', 'Harris', '1948-01-25', 'Male', 78.0, 174, 'Fluoroquinolones', 'CHF, CKD Stage 4, Anemia, Gout', 'INS-015678'),
    ('Dorothy', 'Martin', '1970-03-08', 'Female', 85.0, 158, 'Erythromycin', 'Bipolar Disorder, Metabolic Syndrome, NAFLD', 'INS-016789')
  `);

  // Seed Drug Interactions (16 items)
  await pool.query(`
    INSERT INTO drug_interactions (drug1_id, drug2_id, severity, interaction_type, description, clinical_significance, management) VALUES
    (6, 1, 'Major', 'Pharmacokinetic', 'Warfarin + Atorvastatin: Statins may increase warfarin effect via CYP3A4 competition', 'Increased bleeding risk, INR elevation', 'Monitor INR closely when starting/changing statin; adjust warfarin dose'),
    (6, 5, 'Major', 'Pharmacokinetic', 'Warfarin + Omeprazole: PPI may reduce warfarin metabolism via CYP2C19', 'Potential INR changes', 'Monitor INR; consider pantoprazole as alternative PPI'),
    (7, 15, 'Major', 'Pharmacodynamic', 'Sertraline + Tramadol: Serotonin syndrome risk from combined serotonergic activity', 'Serotonin syndrome: agitation, hyperthermia, clonus', 'Avoid combination; use non-serotonergic analgesic'),
    (3, 12, 'Moderate', 'Pharmacodynamic', 'Lisinopril + HCTZ: Additive hypotensive effect, electrolyte changes', 'Enhanced blood pressure lowering, hypokalemia risk', 'Monitor BP and electrolytes; commonly used as intentional combination'),
    (2, 16, 'Moderate', 'Pharmacokinetic', 'Metformin + Ciprofloxacin: Fluoroquinolones may alter glucose levels', 'Hypo- or hyperglycemia risk', 'Monitor blood glucose closely during antibiotic course'),
    (17, 5, 'Major', 'Pharmacokinetic', 'Clopidogrel + Omeprazole: PPI inhibits CYP2C19 activation of clopidogrel', 'Reduced antiplatelet effect, increased CV events', 'Use pantoprazole instead; avoid omeprazole/esomeprazole'),
    (8, 10, 'Moderate', 'Pharmacodynamic', 'Amlodipine + Metoprolol: Additive negative chronotropic/inotropic effects', 'Excessive bradycardia and hypotension', 'Monitor HR and BP; adjust doses cautiously'),
    (9, 14, 'Moderate', 'Pharmacokinetic', 'Levothyroxine + Prednisone: Corticosteroids may alter thyroid function tests', 'May increase levothyroxine requirements', 'Monitor TSH during prolonged steroid use'),
    (7, 18, 'Major', 'Pharmacodynamic', 'Sertraline + Escitalopram: Dual SSRI therapy increases serotonin syndrome risk', 'Serotonin syndrome, QT prolongation', 'Never combine two SSRIs; switch with appropriate washout'),
    (6, 14, 'Major', 'Pharmacokinetic', 'Warfarin + Prednisone: Corticosteroids may increase warfarin sensitivity', 'Increased bleeding risk', 'Monitor INR frequently during steroid courses'),
    (3, 20, 'Major', 'Pharmacodynamic', 'Lisinopril + Losartan: Dual RAAS blockade increases renal/hyperkalemia risk', 'Hyperkalemia, acute kidney injury, hypotension', 'Avoid combination; use one RAAS blocker'),
    (15, 11, 'Moderate', 'Pharmacodynamic', 'Tramadol + Gabapentin: Additive CNS depression', 'Increased sedation, respiratory depression risk', 'Use lower doses; monitor for excessive sedation'),
    (6, 4, 'Moderate', 'Pharmacokinetic', 'Warfarin + Amoxicillin: Antibiotics may increase warfarin effect via gut flora changes', 'INR elevation, bleeding risk', 'Monitor INR during and after antibiotic course'),
    (16, 2, 'Moderate', 'Pharmacokinetic', 'Ciprofloxacin + Metformin: May increase metformin levels', 'Increased lactic acidosis risk', 'Monitor renal function and blood glucose'),
    (1, 13, 'Moderate', 'Pharmacokinetic', 'Atorvastatin + Azithromycin: Macrolide may increase statin levels via CYP3A4', 'Increased myopathy/rhabdomyolysis risk', 'Monitor for muscle pain; consider temporary statin hold'),
    (10, 19, 'Minor', 'Pharmacodynamic', 'Metoprolol + Albuterol: Beta-blocker may reduce bronchodilator effect', 'Reduced albuterol efficacy', 'Use cardioselective beta-blocker; monitor respiratory status')
  `);

  // Seed Patient Medications
  await pool.query(`
    INSERT INTO patient_medications (patient_id, drug_id, dosage, frequency, route, start_date, prescribing_doctor) VALUES
    (1, 1, '40mg', 'Once daily', 'Oral', '2023-01-15', 'Dr. Smith'),
    (1, 2, '1000mg', 'Twice daily', 'Oral', '2022-06-01', 'Dr. Smith'),
    (1, 3, '20mg', 'Once daily', 'Oral', '2022-03-10', 'Dr. Chen'),
    (2, 7, '100mg', 'Once daily', 'Oral', '2023-05-20', 'Dr. Wilson'),
    (2, 5, '20mg', 'Once daily', 'Oral', '2023-03-15', 'Dr. Garcia'),
    (2, 19, '90mcg', 'As needed', 'Inhalation', '2022-01-01', 'Dr. Garcia'),
    (3, 6, '5mg', 'Once daily', 'Oral', '2021-09-01', 'Dr. Johnson'),
    (3, 10, '50mg', 'Twice daily', 'Oral', '2021-09-01', 'Dr. Johnson'),
    (4, 11, '300mg', 'Three times daily', 'Oral', '2023-02-14', 'Dr. Williams'),
    (4, 18, '10mg', 'Once daily', 'Oral', '2023-06-01', 'Dr. Brown')
  `);

  // Seed Adverse Reactions (16 items)
  await pool.query(`
    INSERT INTO adverse_reactions (drug_id, patient_id, reaction_type, severity, description, onset_date, reported_date, outcome, reporter) VALUES
    (1, 1, 'Myalgia', 'Moderate', 'Patient developed bilateral leg muscle pain and weakness 3 weeks after starting atorvastatin', '2023-02-05', '2023-02-10', 'Resolved with drug discontinuation', 'Dr. Smith'),
    (4, 6, 'Anaphylaxis', 'Severe', 'Immediate hypersensitivity reaction: urticaria, angioedema, hypotension within 30 minutes', '2023-04-12', '2023-04-12', 'Resolved with epinephrine and ED treatment', 'Dr. Davis'),
    (7, 2, 'Sexual Dysfunction', 'Moderate', 'Decreased libido and anorgasmia reported 6 weeks into SSRI therapy', '2023-07-01', '2023-07-15', 'Ongoing, considering dose adjustment', 'Dr. Wilson'),
    (6, 3, 'GI Bleeding', 'Severe', 'Upper GI hemorrhage with INR 5.2, required transfusion and vitamin K', '2023-08-20', '2023-08-20', 'Hospitalized, warfarin held', 'Dr. Johnson'),
    (16, 5, 'Tendinitis', 'Moderate', 'Achilles tendon pain and swelling after 10 days of ciprofloxacin therapy', '2023-09-05', '2023-09-08', 'Resolved after discontinuation, 4 weeks recovery', 'Dr. Brown'),
    (14, 12, 'Cushingoid Features', 'Moderate', 'Moon face, weight gain, glucose elevation after 3 months of prednisone 20mg daily', '2023-05-15', '2023-06-01', 'Tapering initiated', 'Dr. Thomas'),
    (2, 7, 'Lactic Acidosis', 'Severe', 'Elevated lactate with nausea and hyperventilation; renal function had declined', '2023-10-01', '2023-10-01', 'Hospitalized, metformin discontinued', 'Dr. Miller'),
    (15, 10, 'Seizure', 'Severe', 'New-onset seizure in patient taking tramadol with SSRI combination', '2023-07-22', '2023-07-22', 'ED treatment, tramadol discontinued', 'Dr. Taylor'),
    (5, 1, 'B12 Deficiency', 'Mild', 'Macrocytic anemia found on routine labs after 2 years of PPI therapy', '2023-11-10', '2023-11-15', 'B12 supplementation started', 'Dr. Smith'),
    (3, 9, 'Angioedema', 'Severe', 'Lip and tongue swelling within 1 week of starting lisinopril', '2023-03-18', '2023-03-18', 'ED treatment, switched to ARB', 'Dr. Moore'),
    (13, 3, 'QT Prolongation', 'Moderate', 'ECG showed QTc 510ms during azithromycin course', '2023-06-14', '2023-06-15', 'Antibiotic changed, QTc normalized', 'Dr. Johnson'),
    (11, 11, 'Peripheral Edema', 'Mild', 'Bilateral ankle swelling after gabapentin dose increase to 900mg TID', '2023-08-01', '2023-08-10', 'Dose reduced, edema improving', 'Dr. Anderson'),
    (8, 1, 'Gingival Hyperplasia', 'Mild', 'Gum overgrowth noted at dental visit after 6 months of amlodipine', '2023-09-20', '2023-10-01', 'Dental referral, monitoring', 'Dr. Smith'),
    (12, 5, 'Hyponatremia', 'Moderate', 'Serum sodium 128 mEq/L with confusion; HCTZ suspected cause', '2023-07-30', '2023-07-31', 'Hospitalized, diuretic adjusted', 'Dr. Brown'),
    (9, 14, 'Palpitations', 'Mild', 'Heart racing and tremor after levothyroxine dose increase to 150mcg', '2023-04-05', '2023-04-10', 'Dose reduced to 125mcg, resolved', 'Dr. White'),
    (17, 9, 'Bruising', 'Mild', 'Increased easy bruising on clopidogrel, no major bleeding events', '2023-05-20', '2023-06-01', 'Ongoing monitoring, clinically acceptable', 'Dr. Moore')
  `);

  // Seed Dosage Guidelines (16 items)
  await pool.query(`
    INSERT INTO dosage_guidelines (drug_id, indication, age_group, min_dose, max_dose, dose_unit, frequency, route, special_instructions) VALUES
    (1, 'Hyperlipidemia', 'Adult', '10', '80', 'mg', 'Once daily', 'Oral', 'Take in the evening; monitor LFTs at baseline and 12 weeks'),
    (2, 'Type 2 Diabetes', 'Adult', '500', '2550', 'mg', 'Twice daily', 'Oral', 'Take with meals; check renal function before starting and annually'),
    (3, 'Hypertension', 'Adult', '5', '40', 'mg', 'Once daily', 'Oral', 'Monitor potassium and creatinine within 1-2 weeks of initiation'),
    (4, 'Upper Respiratory Infection', 'Adult', '250', '500', 'mg', 'Three times daily', 'Oral', 'Complete full course; take 1 hour before or 2 hours after meals'),
    (5, 'GERD', 'Adult', '20', '40', 'mg', 'Once daily', 'Oral', 'Take 30-60 min before breakfast; limit to 8 weeks for uncomplicated GERD'),
    (6, 'Atrial Fibrillation', 'Adult', '2', '10', 'mg', 'Once daily', 'Oral', 'Target INR 2.0-3.0; frequent INR monitoring required'),
    (7, 'Major Depressive Disorder', 'Adult', '50', '200', 'mg', 'Once daily', 'Oral', 'Start 50mg; increase by 50mg at weekly intervals if needed'),
    (8, 'Hypertension', 'Adult', '2.5', '10', 'mg', 'Once daily', 'Oral', 'May take with or without food; onset 6-12 hours'),
    (9, 'Hypothyroidism', 'Adult', '25', '200', 'mcg', 'Once daily', 'Oral', 'Take on empty stomach 30-60 min before breakfast; check TSH q6-8 weeks'),
    (10, 'Hypertension', 'Adult', '25', '200', 'mg', 'Twice daily', 'Oral', 'Do not stop abruptly; taper over 1-2 weeks'),
    (11, 'Neuropathic Pain', 'Adult', '300', '3600', 'mg', 'Three times daily', 'Oral', 'Titrate over 3+ days; reduce dose in renal impairment'),
    (12, 'Hypertension', 'Adult', '12.5', '50', 'mg', 'Once daily', 'Oral', 'Monitor electrolytes at 4-6 weeks; avoid in severe renal impairment'),
    (13, 'Community-Acquired Pneumonia', 'Adult', '500', '500', 'mg', 'Day 1, then 250mg days 2-5', 'Oral', 'Z-pack dosing; caution with QT-prolonging drugs'),
    (14, 'Inflammatory Conditions', 'Adult', '5', '60', 'mg', 'Once daily or divided', 'Oral', 'Taper gradually if >2 weeks; give with food'),
    (15, 'Moderate Pain', 'Adult', '50', '400', 'mg', 'Every 4-6 hours', 'Oral', 'Max 400mg/day; reduce in elderly and renal impairment'),
    (16, 'Urinary Tract Infection', 'Adult', '250', '750', 'mg', 'Twice daily', 'Oral', 'Hydrate well; avoid antacids within 2 hours; 3-14 day course')
  `);

  // Seed Drug Alternatives (16 items)
  await pool.query(`
    INSERT INTO drug_alternatives (original_drug_id, alternative_drug_id, reason, efficacy_comparison, cost_comparison, preference_rank) VALUES
    (1, 2, 'Statin intolerance - myopathy', 'Similar LDL reduction', 'Lower cost', 1),
    (3, 20, 'ACE inhibitor cough', 'Equivalent BP reduction', 'Similar cost', 1),
    (7, 18, 'Inadequate response to sertraline', 'Similar efficacy', 'Similar cost', 1),
    (4, 13, 'Penicillin allergy', 'Good coverage for respiratory infections', 'Higher cost', 1),
    (5, 8, 'Clopidogrel interaction concern', 'Similar acid suppression', 'Lower cost', 1),
    (6, 17, 'Warfarin monitoring burden', 'Non-inferior stroke prevention', 'Higher cost', 2),
    (10, 8, 'Beta-blocker fatigue', 'Good BP control', 'Similar cost', 2),
    (15, 11, 'Opioid avoidance preference', 'Good for neuropathic pain', 'Lower cost', 1),
    (16, 4, 'Fluoroquinolone tendon risk', 'Narrow spectrum but effective', 'Lower cost', 1),
    (12, 20, 'Electrolyte concerns with thiazide', 'Similar BP reduction', 'Similar cost', 2),
    (14, 11, 'Steroid side effects concern', 'Anti-inflammatory for nerve pain', 'Lower cost', 3),
    (2, 1, 'Metformin GI intolerance', 'Different mechanism', 'Higher cost', 3),
    (18, 7, 'Cost consideration', 'Equivalent efficacy', 'Lower cost (generic)', 1),
    (8, 3, 'Peripheral edema on CCB', 'Equivalent BP reduction', 'Lower cost', 1),
    (13, 4, 'QT prolongation concern', 'Good spectrum', 'Lower cost', 2),
    (19, 10, 'Tachycardia with albuterol', 'Different mechanism', 'Similar cost', 3)
  `);

  // Seed Drug Allergies (16 items)
  await pool.query(`
    INSERT INTO drug_allergies (drug_id, patient_id, allergy_type, severity, reaction_description, verified, verified_date) VALUES
    (4, 1, 'True Allergy', 'Severe', 'Anaphylaxis with penicillin at age 12 - documented in medical records', true, '2020-01-15'),
    (12, 2, 'Drug Intolerance', 'Moderate', 'Severe rash with sulfa-containing drugs including HCTZ', true, '2019-06-20'),
    (15, 4, 'Drug Intolerance', 'Mild', 'Nausea and vomiting with codeine-based products', true, '2021-03-10'),
    (4, 6, 'True Allergy', 'Severe', 'Penicillin: urticaria and angioedema, cross-reactive with cephalosporins', true, '2018-09-05'),
    (1, 13, 'Drug Intolerance', 'Moderate', 'Severe myopathy with statins - CK elevation 10x ULN', true, '2022-04-12'),
    (3, 9, 'True Allergy', 'Severe', 'Angioedema with ACE inhibitors - lip and tongue swelling', true, '2023-03-20'),
    (16, 15, 'True Allergy', 'Moderate', 'Fluoroquinolone: photosensitivity reaction and tendon pain', true, '2021-08-15'),
    (13, 16, 'Drug Intolerance', 'Mild', 'GI upset and diarrhea with erythromycin and azithromycin', true, '2020-11-30'),
    (15, 10, 'Drug Sensitivity', 'Moderate', 'Morphine: severe pruritus and urticaria; tolerates other opioids', true, '2019-05-22'),
    (5, 1, 'Drug Intolerance', 'Mild', 'Headache and dizziness with aspirin at therapeutic doses', false, NULL),
    (14, 2, 'Drug Sensitivity', 'Moderate', 'Steroid-induced hyperglycemia and mood disturbance', true, '2022-07-18'),
    (6, 4, 'Drug Sensitivity', 'Mild', 'Easy bruising with anticoagulants', false, NULL),
    (2, 5, 'Drug Intolerance', 'Moderate', 'Severe GI intolerance to NSAIDs - history of GI bleed', true, '2020-02-28'),
    (9, 3, 'Drug Intolerance', 'Mild', 'Palpitations and anxiety with higher levothyroxine doses', true, '2022-09-14'),
    (11, 11, 'Drug Sensitivity', 'Mild', 'Excessive drowsiness with gabapentin even at low doses', false, NULL),
    (7, 8, 'Drug Intolerance', 'Moderate', 'Severe GI upset with sertraline - tried multiple SSRIs', true, '2023-01-08')
  `);

  // Seed Contraindications (16 items)
  await pool.query(`
    INSERT INTO contraindications (drug_id, condition, severity, description, evidence_level) VALUES
    (6, 'Pregnancy', 'Absolute', 'Warfarin is teratogenic - causes warfarin embryopathy in first trimester and CNS abnormalities throughout', 'Level A'),
    (3, 'Bilateral Renal Artery Stenosis', 'Absolute', 'ACE inhibitors can cause acute renal failure in bilateral RAS', 'Level A'),
    (2, 'eGFR < 30 mL/min', 'Absolute', 'Risk of lactic acidosis with severe renal impairment', 'Level A'),
    (10, 'Severe Bradycardia (HR<50)', 'Absolute', 'Beta-blockers worsen bradycardia and may cause cardiac arrest', 'Level A'),
    (15, 'Seizure Disorder', 'Relative', 'Tramadol lowers seizure threshold; use with extreme caution', 'Level B'),
    (16, 'Myasthenia Gravis', 'Absolute', 'Fluoroquinolones can exacerbate muscle weakness and cause respiratory failure', 'Level A'),
    (14, 'Active Peptic Ulcer', 'Relative', 'Corticosteroids increase GI bleeding risk; use PPI if unavoidable', 'Level B'),
    (1, 'Active Liver Disease', 'Absolute', 'Statins can worsen hepatic function; check LFTs before starting', 'Level A'),
    (7, 'Concurrent MAO Inhibitor', 'Absolute', 'Risk of fatal serotonin syndrome; 14-day washout required', 'Level A'),
    (12, 'Anuria', 'Absolute', 'Thiazides ineffective without glomerular filtration', 'Level A'),
    (8, 'Severe Aortic Stenosis', 'Absolute', 'Vasodilation can cause fatal hypotension in fixed cardiac output', 'Level A'),
    (19, 'Uncorrected Hypokalemia', 'Relative', 'Albuterol can further lower potassium via intracellular shift', 'Level B'),
    (17, 'Active Pathological Bleeding', 'Absolute', 'Antiplatelet therapy contraindicated with active hemorrhage', 'Level A'),
    (9, 'Uncorrected Adrenal Insufficiency', 'Absolute', 'Thyroid hormone increases metabolic demand; may precipitate adrenal crisis', 'Level A'),
    (5, 'Concurrent Rilpivirine', 'Absolute', 'PPIs significantly reduce rilpivirine absorption and efficacy', 'Level A'),
    (13, 'History of Cholestatic Jaundice with Azithromycin', 'Absolute', 'Recurrence of hepatotoxicity likely', 'Level B')
  `);

  // Seed Food Interactions (16 items)
  await pool.query(`
    INSERT INTO food_interactions (drug_id, food_item, interaction_type, severity, description, recommendation) VALUES
    (6, 'Vitamin K-rich foods (spinach, kale, broccoli)', 'Pharmacodynamic', 'Major', 'Vitamin K antagonizes warfarin effect, causing INR fluctuations', 'Maintain consistent vitamin K intake; do not drastically change green vegetable consumption'),
    (9, 'Calcium-rich foods and supplements', 'Absorption', 'Moderate', 'Calcium binds levothyroxine reducing absorption by up to 40%', 'Take levothyroxine 4 hours apart from calcium-containing products'),
    (1, 'Grapefruit juice', 'Pharmacokinetic', 'Major', 'Grapefruit inhibits CYP3A4, increasing statin levels and toxicity risk', 'Avoid grapefruit; applies to atorvastatin, simvastatin, lovastatin'),
    (16, 'Dairy products (milk, yogurt, cheese)', 'Absorption', 'Major', 'Calcium and magnesium in dairy chelate ciprofloxacin, reducing absorption 50%+', 'Take ciprofloxacin 2 hours before or 6 hours after dairy'),
    (2, 'Alcohol', 'Pharmacodynamic', 'Major', 'Alcohol increases lactic acidosis risk and causes hypoglycemia', 'Limit alcohol; avoid binge drinking; monitor blood glucose'),
    (7, 'St. Johns Wort', 'Pharmacokinetic', 'Major', 'St. Johns Wort induces CYP3A4/P-gp, reducing sertraline levels', 'Avoid combination; risk of therapeutic failure and discontinuation syndrome'),
    (5, 'Coffee/caffeine', 'Pharmacokinetic', 'Minor', 'Omeprazole may reduce caffeine metabolism slightly', 'No specific restriction; monitor if caffeine sensitivity increases'),
    (15, 'Alcohol', 'Pharmacodynamic', 'Major', 'Additive CNS depression with tramadol; respiratory depression risk', 'Avoid alcohol during tramadol therapy'),
    (13, 'Antacids (aluminum/magnesium)', 'Absorption', 'Moderate', 'Antacids reduce azithromycin peak concentration by 24%', 'Take azithromycin 1 hour before or 2 hours after antacids'),
    (3, 'High-potassium foods (bananas, oranges)', 'Pharmacodynamic', 'Moderate', 'ACE inhibitors cause potassium retention; high-K diet adds to hyperkalemia risk', 'Moderate potassium intake; monitor serum potassium regularly'),
    (14, 'Grapefruit juice', 'Pharmacokinetic', 'Minor', 'May slightly increase prednisone bioavailability', 'Generally not clinically significant; no strict avoidance needed'),
    (10, 'High-protein meals', 'Pharmacokinetic', 'Moderate', 'Food increases metoprolol bioavailability by up to 40%', 'Take consistently with or without food; be aware of enhanced effect with meals'),
    (8, 'Grapefruit juice', 'Pharmacokinetic', 'Moderate', 'Grapefruit increases amlodipine levels via CYP3A4 inhibition', 'Avoid large amounts of grapefruit; monitor for hypotension'),
    (11, 'Alcohol', 'Pharmacodynamic', 'Moderate', 'Additive CNS depression with gabapentin', 'Limit alcohol use; warn about increased drowsiness'),
    (4, 'Food (general)', 'Absorption', 'Minor', 'Food may delay but does not significantly reduce amoxicillin absorption', 'May take with or without food; take with food if GI upset occurs'),
    (12, 'Licorice (natural)', 'Pharmacodynamic', 'Moderate', 'Natural licorice contains glycyrrhizin which causes potassium loss, additive with HCTZ', 'Avoid natural licorice products while on thiazide diuretics')
  `);

  // Seed Pregnancy Safety (16 items)
  await pool.query(`
    INSERT INTO pregnancy_safety (drug_id, fda_category, trimester_risk, lactation_risk, description, alternatives_during_pregnancy) VALUES
    (6, 'X', 'All trimesters: Warfarin embryopathy (T1), CNS abnormalities (T2/T3), fetal hemorrhage', 'Compatible with caution', 'Absolutely contraindicated in pregnancy. Switch to LMWH.', 'Enoxaparin (LMWH) for anticoagulation during pregnancy'),
    (3, 'D', 'T2/T3: Fetal renal impairment, oligohydramnios, skull ossification defects', 'Compatible', 'Discontinue immediately if pregnancy detected. Teratogenic in T2/T3.', 'Labetalol, nifedipine, or methyldopa for HTN in pregnancy'),
    (1, 'X', 'All trimesters: Potential fetal harm, decreased cholesterol needed for development', 'Not recommended', 'Contraindicated. Cholesterol needed for fetal development.', 'Discontinue statins; manage with diet; cholestyramine if needed'),
    (2, 'B', 'Generally considered safe; limited data but no clear teratogenicity', 'Compatible', 'Reasonable option for gestational diabetes if insulin not preferred.', 'Insulin is preferred first-line for gestational diabetes'),
    (7, 'C', 'T3: Neonatal withdrawal syndrome, persistent pulmonary HTN risk', 'Compatible with monitoring', 'Use only if benefits outweigh risks. Monitor neonate if used in T3.', 'Consider CBT first; if SSRI needed, sertraline preferred'),
    (4, 'B', 'Low risk across all trimesters; widely used in pregnancy', 'Compatible', 'Generally safe. First-line antibiotic for many infections in pregnancy.', 'Amoxicillin itself is a preferred antibiotic in pregnancy'),
    (5, 'C', 'Limited data; animal studies show embryotoxicity at high doses', 'Compatible', 'Use short-term if necessary. H2 blockers preferred.', 'Ranitidine or famotidine; antacids for mild symptoms'),
    (14, 'C/D', 'T1: Possible cleft palate risk. All: Growth restriction, adrenal suppression', 'Compatible at low doses', 'Use lowest effective dose for shortest duration. Monitor fetal growth.', 'Disease-specific: consider azathioprine for autoimmune conditions'),
    (10, 'C', 'T3: Fetal bradycardia, hypoglycemia, growth restriction', 'Compatible', 'Use if maternal benefit justifies risk. Monitor neonatal HR and glucose.', 'Labetalol preferred beta-blocker in pregnancy'),
    (15, 'C', 'T3: Neonatal withdrawal, respiratory depression', 'Not recommended', 'Avoid especially near term. Risk of neonatal withdrawal.', 'Acetaminophen; short-course low-dose opioids if needed'),
    (8, 'C', 'Limited human data; animal studies show some fetal effects', 'Compatible', 'May use if other antihypertensives inadequate.', 'Nifedipine preferred CCB in pregnancy'),
    (9, 'A', 'Safe; necessary for maternal and fetal health in hypothyroidism', 'Compatible', 'Continue and monitor; dose often needs increase during pregnancy.', 'No alternative needed - levothyroxine is the treatment'),
    (13, 'B', 'No clear evidence of teratogenicity in human studies', 'Compatible', 'Reasonable antibiotic choice during pregnancy when indicated.', 'Amoxicillin or azithromycin depending on infection'),
    (16, 'C', 'Cartilage damage in animal studies; limited human data concerning', 'Not recommended', 'Avoid fluoroquinolones in pregnancy. Theoretical cartilage risk.', 'Amoxicillin, cephalosporins, or azithromycin'),
    (11, 'C', 'Limited human data; animal studies show some developmental effects', 'Compatible with caution', 'Use only if clearly needed. Limited pregnancy safety data.', 'Pregabalin has similar limited data; consider non-drug options'),
    (20, 'D', 'T2/T3: Same risks as ACE inhibitors - fetal renal harm', 'Compatible with caution', 'Contraindicated in T2/T3. Switch if pregnancy planned.', 'Same alternatives as ACE inhibitors: labetalol, nifedipine')
  `);

  // Seed Pediatric Dosing (16 items)
  await pool.query(`
    INSERT INTO pediatric_dosing (drug_id, age_range, weight_based_dose, max_daily_dose, formulation, indication, special_notes) VALUES
    (4, '3 months - 12 years', '25-50 mg/kg/day divided q8h', '3000 mg/day', 'Oral suspension 125mg/5mL, 250mg/5mL', 'Otitis media, Pharyngitis, UTI', 'Shake well before use; can mix with food or drink'),
    (19, '4-11 years', '0.1-0.2 mg/kg up to 2.5mg nebulized q4-6h', '30 mg/day', 'Nebulizer solution 0.63mg/3mL, MDI 90mcg/puff', 'Asthma, Bronchospasm', 'Spacer with mask for MDI in young children; rinse mouth after'),
    (13, '6 months - 17 years', '10 mg/kg day 1, then 5 mg/kg days 2-5', '500 mg day 1, 250 mg days 2-5', 'Oral suspension 100mg/5mL, 200mg/5mL', 'Otitis media, Pharyngitis, Pneumonia', 'Single daily dose; can take with or without food'),
    (5, '1-16 years', '0.7-3.5 mg/kg/day', '40 mg/day', 'Oral suspension 2mg/mL (compounded)', 'GERD, Erosive Esophagitis', 'Open capsule and mix with applesauce if unable to swallow'),
    (14, '0-17 years', '0.5-2 mg/kg/day', '60 mg/day (varies)', 'Oral solution 5mg/5mL, tablets', 'Asthma, Nephrotic Syndrome, Croup', 'Taper needed if >7-14 days; give with food; monitor growth'),
    (2, '10-16 years', '500 mg twice daily, max 2000 mg/day', '2000 mg/day', 'Tablets 500mg, 850mg', 'Type 2 Diabetes (pediatric)', 'Only approved for children ≥10; monitor renal function'),
    (7, '6-17 years', '25-200 mg/day', '200 mg/day', 'Oral solution 20mg/mL', 'OCD (6+), Depression (12+)', 'Start 25mg; increase weekly as tolerated; monitor for suicidality'),
    (11, '3-12 years', '10-15 mg/kg/day divided TID', '50 mg/kg/day', 'Oral solution 250mg/5mL', 'Epilepsy (adjunctive)', 'Titrate slowly over 3+ days; adjust for renal function'),
    (9, '0-12 years', '2-6 mcg/kg/day', 'Varies by age', 'Tablets 25, 50, 75, 88, 100, 112, 125, 137, 150mcg', 'Congenital Hypothyroidism', 'Crush tablet in water for infants; do not mix with soy formula'),
    (16, 'Not recommended < 18 years', 'N/A', 'N/A', 'N/A', 'N/A', 'CONTRAINDICATED in pediatrics - risk of cartilage damage; use alternatives'),
    (15, 'Not recommended < 12 years', 'N/A', 'N/A', 'N/A', 'N/A', 'CONTRAINDICATED in children <12; risk of fatal respiratory depression'),
    (8, '6-17 years', '2.5-5 mg/day', '10 mg/day', 'Tablets 2.5, 5, 10mg', 'Hypertension', 'Limited pediatric data; start low dose; monitor BP and HR'),
    (10, '6-17 years', '1-2 mg/kg/day divided BID', '200 mg/day', 'Tablets 25, 50, 100mg', 'Hypertension, SVT prophylaxis', 'Monitor HR; do not stop abruptly; adjust for weight changes'),
    (3, '6-17 years', '0.07 mg/kg up to 5mg/day', '40 mg/day', 'Tablets 2.5, 5, 10, 20, 40mg', 'Hypertension, Proteinuria', 'Monitor potassium and creatinine; contraindicated in pregnancy'),
    (18, '12-17 years', '10 mg/day', '20 mg/day', 'Oral solution 5mg/5mL, tablets', 'Depression, Anxiety', 'FDA approved for depression age 12+; monitor suicidality'),
    (12, '6-17 years', '1-2 mg/kg/day', '37.5 mg/day (2-12y), 50 mg/day (>12y)', 'Tablets 12.5, 25mg', 'Edema, Hypertension', 'Limited pediatric data; monitor electrolytes closely')
  `);

  // Seed Geriatric Alerts (16 items)
  await pool.query(`
    INSERT INTO geriatric_alerts (drug_id, risk_level, beers_criteria, alert_type, description, dose_adjustment, monitoring_requirements) VALUES
    (15, 'High', true, 'Avoid', 'Tramadol on Beers List: CNS effects, falls risk, seizure risk in elderly', 'Avoid; if necessary start 25mg q12h, max 200mg/day', 'Pain assessment, fall risk, CNS status, renal function'),
    (7, 'Moderate', true, 'Use with Caution', 'SSRIs: increased fall risk, hyponatremia (SIADH) risk in elderly', 'Start 25mg; max usually 100mg in elderly', 'Sodium levels at 2 and 4 weeks, fall risk, bone density'),
    (12, 'Moderate', true, 'Use with Caution', 'HCTZ: risk of hyponatremia, hypokalemia, orthostatic hypotension in elderly', 'Start 12.5mg; max 25mg preferred in elderly', 'Electrolytes, renal function, orthostatic BP, hydration'),
    (11, 'High', true, 'Use with Caution', 'Gabapentin: anticholinergic burden, falls, sedation in elderly', 'Start 100mg TID; titrate slowly; max often 1800mg/day', 'Renal function (dose adjust), fall risk, sedation, cognitive status'),
    (14, 'High', false, 'Use with Caution', 'Prednisone: accelerated osteoporosis, glucose dysregulation, delirium risk', 'Use lowest dose shortest duration; consider 2.5-5mg if chronic', 'Bone density, blood glucose, BP, mood/cognition, infection signs'),
    (10, 'Moderate', false, 'Dose Adjustment', 'Metoprolol: enhanced bradycardia, risk of falls from dizziness', 'Start 12.5-25mg BID; titrate slowly', 'Heart rate, BP (orthostatic), fatigue, exercise tolerance'),
    (8, 'Moderate', false, 'Dose Adjustment', 'Amlodipine: increased peripheral edema and hypotension in elderly', 'Start 2.5mg; increase cautiously', 'BP (orthostatic), edema, heart rate, ankle circumference'),
    (6, 'High', false, 'Enhanced Monitoring', 'Warfarin: elderly more sensitive; increased bleeding risk, fall-related hemorrhage', 'Lower initial dose 2-3mg; target same INR but closer monitoring', 'INR weekly initially, fall risk assessment, hemoglobin, signs of bleeding'),
    (5, 'Moderate', true, 'Use with Caution', 'PPIs: increased C. diff risk, hip fracture, hypomagnesemia in elderly', 'Use lowest dose; reassess need regularly; limit to 8 weeks if possible', 'Magnesium, B12, bone density if long-term, C. diff symptoms'),
    (2, 'Moderate', false, 'Dose Adjustment', 'Metformin: age-related renal decline increases lactic acidosis risk', 'Check eGFR; avoid if <30; caution 30-45', 'eGFR every 3-6 months, B12 annually, lactic acid if symptomatic'),
    (16, 'High', true, 'Avoid', 'Ciprofloxacin: tendon rupture risk markedly increased in elderly especially with steroids', 'Avoid if possible; if needed, shortest course', 'Tendon pain, gait assessment, renal-adjusted dosing'),
    (3, 'Moderate', false, 'Dose Adjustment', 'Lisinopril: increased risk of hypotension, hyperkalemia, renal impairment', 'Start 2.5-5mg; monitor closely', 'Potassium, creatinine, BP, cognitive function'),
    (18, 'Moderate', true, 'Use with Caution', 'Escitalopram: QT prolongation risk increases with age; max 10mg in elderly', 'Max 10mg/day in patients >65', 'ECG if risk factors, sodium, fall risk'),
    (1, 'Low', false, 'Standard Monitoring', 'Atorvastatin: no specific geriatric contraindication but myopathy risk increases', 'Start 10-20mg; titrate based on response', 'LFTs, CK if muscle symptoms, drug interactions review'),
    (17, 'High', false, 'Enhanced Monitoring', 'Clopidogrel: increased bleeding risk with age and polypharmacy', 'Standard dosing but enhanced bleeding monitoring', 'CBC, bleeding signs, GI symptoms, concurrent anticoagulant review'),
    (9, 'Low', false, 'Dose Adjustment', 'Levothyroxine: elderly more sensitive; over-replacement causes AFib and osteoporosis', 'Start 12.5-25mcg; increase by 12.5-25mcg q6-8 weeks', 'TSH more frequently, cardiac symptoms, bone density')
  `);

  // Seed Pharmacogenomics (16 items)
  await pool.query(`
    INSERT INTO pharmacogenomics (drug_id, gene, variant, metabolizer_status, recommendation, evidence_level, cpic_guideline) VALUES
    (17, 'CYP2C19', '*2/*2', 'Poor Metabolizer', 'Clopidogrel prodrug not activated. Use prasugrel or ticagrelor instead.', 'Level A', 'CPIC Guideline for Clopidogrel and CYP2C19 (2013, updated 2022)'),
    (6, 'CYP2C9/VKORC1', 'CYP2C9*3/*3 + VKORC1 -1639 A/A', 'Highly Sensitive', 'Markedly reduced warfarin dose needed (≤1mg/day). High bleeding risk at standard doses.', 'Level A', 'CPIC Guideline for Warfarin and CYP2C9/VKORC1 (2017)'),
    (7, 'CYP2C19', '*17/*17', 'Ultrarapid Metabolizer', 'Increased sertraline metabolism; may need higher doses or alternative SSRI.', 'Level B', 'CPIC Guideline for SSRIs and CYP2D6/CYP2C19 (2015)'),
    (15, 'CYP2D6', '*4/*4', 'Poor Metabolizer', 'Reduced conversion of tramadol to active metabolite. Decreased efficacy. Use alternative analgesic.', 'Level A', 'CPIC Guideline for Codeine and CYP2D6 (applies to tramadol)'),
    (5, 'CYP2C19', '*1/*17', 'Rapid Metabolizer', 'Increased omeprazole metabolism; may need higher doses for adequate acid suppression.', 'Level B', 'CPIC Guideline for PPIs and CYP2C19 (2020)'),
    (1, 'SLCO1B1', 'rs4149056 T/C', 'Intermediate Function', 'Increased risk of statin myopathy. Consider lower dose or alternative statin (pravastatin, rosuvastatin).', 'Level A', 'CPIC Guideline for Statins and SLCO1B1 (2022)'),
    (18, 'CYP2C19', '*2/*3', 'Poor Metabolizer', 'Reduced escitalopram metabolism; increased side effects risk. Consider 50% dose reduction.', 'Level B', 'CPIC Guideline for SSRIs and CYP2D6/CYP2C19 (2015)'),
    (10, 'CYP2D6', '*1/*4', 'Intermediate Metabolizer', 'Slightly elevated metoprolol levels. Standard dose with monitoring.', 'Level B', 'DPWG Guideline for Beta-blockers and CYP2D6'),
    (2, 'SLC22A1 (OCT1)', 'rs628031 A/G', 'Reduced Function', 'Decreased metformin uptake into hepatocytes; may have reduced efficacy.', 'Level C', 'Research-level evidence for metformin and OCT1'),
    (16, 'NAT2', 'Slow acetylator', 'Slow Metabolizer', 'Increased ciprofloxacin exposure; higher risk of adverse effects.', 'Level C', 'Limited clinical guidelines available'),
    (13, 'CYP3A4/5', 'CYP3A5*3/*3', 'Poor Expressor', 'Standard azithromycin metabolism; no dose adjustment typically needed.', 'Level C', 'No specific CPIC guideline for azithromycin'),
    (9, 'DIO2', 'rs225014 T/T', 'Reduced T4 to T3 Conversion', 'May benefit from combination T4/T3 therapy; monitor symptoms not just TSH.', 'Level C', 'Emerging evidence; no CPIC guideline yet'),
    (14, 'NR3C1', 'BclI polymorphism', 'Enhanced Sensitivity', 'Increased glucocorticoid sensitivity; may achieve therapeutic effect at lower doses.', 'Level C', 'Research-level; limited clinical guidelines'),
    (11, 'HLA-B', 'HLA-B*15:02', 'High Risk', 'Increased risk of Stevens-Johnson Syndrome/TEN. Screen before prescribing in at-risk populations.', 'Level A', 'CPIC guideline for carbamazepine (cross-reference for anticonvulsants)'),
    (8, 'CYP3A4', '*22/*22', 'Poor Metabolizer', 'Increased amlodipine exposure. Start with lower dose and titrate carefully.', 'Level B', 'Emerging evidence for CCBs and CYP3A4'),
    (15, 'CYP2D6', '*1/*1x3', 'Ultrarapid Metabolizer', 'Rapid tramadol activation to O-desmethyltramadol. Risk of toxicity and respiratory depression. Avoid.', 'Level A', 'CPIC Guideline for Codeine/Tramadol and CYP2D6')
  `);

  // Seed Clinical Guidelines (16 items)
  await pool.query(`
    INSERT INTO clinical_guidelines (title, category, organization, summary, recommendations, evidence_grade, last_reviewed, source_url) VALUES
    ('2023 AHA/ACC Guideline for Heart Failure Management', 'Cardiology', 'AHA/ACC', 'Comprehensive guidelines for diagnosis and management of heart failure across the spectrum from at-risk to advanced HF.', 'Stage-based approach: GDMT includes ACEi/ARB/ARNI + beta-blocker + MRA + SGLT2i for HFrEF. Dapagliflozin/empagliflozin now class I for HFrEF and HFpEF.', 'Grade A', '2023-04-01', ''),
    ('ADA Standards of Care in Diabetes 2024', 'Endocrinology', 'American Diabetes Association', 'Annual update of comprehensive diabetes management standards including pharmacologic approaches.', 'Metformin + lifestyle first-line. Add SGLT2i or GLP-1 RA if CVD/CKD. A1C target <7% for most; individualize. CGM recommended for type 1 and insulin-treated type 2.', 'Grade A', '2024-01-01', ''),
    ('JNC 8 Blood Pressure Guidelines Update', 'Cardiology', 'Joint National Committee', 'Evidence-based guidelines for management of high blood pressure in adults.', 'Target <130/80 for most adults. First-line: thiazide, CCB, ACEi, or ARB. Black patients: CCB or thiazide preferred. CKD: ACEi or ARB.', 'Grade A', '2023-06-15', ''),
    ('IDSA Guidelines for Community-Acquired Pneumonia', 'Infectious Disease', 'IDSA/ATS', 'Diagnosis and treatment of community-acquired pneumonia in adults.', 'Outpatient: amoxicillin or doxycycline for healthy; amoxicillin-clav + macrolide or respiratory FQ for comorbidities. Inpatient: beta-lactam + macrolide or respiratory FQ.', 'Grade A', '2023-09-01', ''),
    ('ACOG Practice Bulletin: Medications in Pregnancy', 'Obstetrics', 'ACOG', 'Guidance on prescribing medications during pregnancy with risk-benefit analysis.', 'Use FDA labeling system. SSRIs generally acceptable in pregnancy when indicated. Avoid ACEi/ARB in T2/T3. Labetalol/nifedipine for HTN. Insulin preferred for GDM.', 'Grade B', '2023-07-01', ''),
    ('AGS Beers Criteria 2023', 'Geriatrics', 'American Geriatrics Society', 'Updated list of potentially inappropriate medications for older adults (≥65 years).', 'Avoid: benzodiazepines, anticholinergics, certain NSAIDs, sliding-scale insulin. Use with caution: SSRIs, diuretics, antipsychotics. Deprescribing recommended.', 'Grade A', '2023-05-01', ''),
    ('WHO Pain Ladder and Analgesic Guidelines', 'Pain Management', 'WHO', 'Stepwise approach to pain management from non-opioid to strong opioid therapy.', 'Step 1: Non-opioid (acetaminophen, NSAIDs). Step 2: Weak opioid + non-opioid. Step 3: Strong opioid + non-opioid. Adjuvants at any step. Multimodal preferred.', 'Grade A', '2023-03-15', ''),
    ('CPIC Pharmacogenomics Implementation Guide', 'Pharmacogenomics', 'CPIC', 'Clinical implementation of pharmacogenomic testing in practice.', 'Pre-emptive testing recommended for: CYP2D6, CYP2C19, CYP2C9, VKORC1, HLA-B, SLCO1B1. Clinical decision support at point of prescribing. Panel testing preferred.', 'Grade A', '2023-11-01', ''),
    ('GINA Asthma Management Strategy 2024', 'Pulmonology', 'Global Initiative for Asthma', 'Stepwise approach to asthma management from mild to severe persistent asthma.', 'Step 1-2: Low-dose ICS-formoterol PRN. Step 3: Low-dose ICS-LABA. Step 4: Medium-dose ICS-LABA. Step 5: Add-on LAMA, biologic, or OCS. Track control and adjust.', 'Grade A', '2024-01-15', ''),
    ('CHEST Guideline for Antithrombotic Therapy', 'Hematology', 'CHEST', 'Evidence-based approach to antithrombotic therapy for various indications.', 'VTE treatment: DOACs preferred over warfarin. AFib: CHA2DS2-VASc score guides anticoagulation. ACS: DAPT duration based on ischemic/bleeding risk balance.', 'Grade A', '2023-08-01', ''),
    ('APA Guidelines for Major Depressive Disorder', 'Psychiatry', 'American Psychiatric Association', 'Comprehensive treatment guidelines for major depressive disorder.', 'First-line: SSRI or SNRI + psychotherapy. Augmentation: aripiprazole, lithium, or T3. ECT for treatment-resistant. Maintenance: 6-12 months minimum after remission.', 'Grade A', '2023-10-01', ''),
    ('KDIGO CKD Management Guidelines', 'Nephrology', 'KDIGO', 'Management of chronic kidney disease including drug dosing adjustments.', 'ACEi/ARB for proteinuric CKD. SGLT2i for CKD with eGFR 20-45. Adjust drug doses per eGFR. Avoid nephrotoxins. Target BP <120/80 if tolerated.', 'Grade A', '2023-06-01', ''),
    ('ACR Guidelines for Rheumatoid Arthritis', 'Rheumatology', 'ACR/EULAR', 'Treatment recommendations for rheumatoid arthritis using conventional and biologic DMARDs.', 'Early aggressive therapy: methotrexate first-line. Add biologic (TNF inhibitor or JAK inhibitor) if inadequate response at 3 months. Steroid bridging short-term only.', 'Grade A', '2023-04-15', ''),
    ('Epilepsy Treatment Guidelines', 'Neurology', 'ILAE/AAN', 'Evidence-based guidelines for antiepileptic drug selection and management.', 'Focal: lamotrigine or levetiracetam first-line. Generalized: valproate (if not female of childbearing potential) or lamotrigine. Avoid carbamazepine in generalized.', 'Grade A', '2023-07-15', ''),
    ('CDC STI Treatment Guidelines 2024', 'Infectious Disease', 'CDC', 'Updated treatment recommendations for sexually transmitted infections.', 'Chlamydia: doxycycline 100mg BID x7 days (preferred over azithromycin). Gonorrhea: ceftriaxone 500mg IM single dose. Syphilis: penicillin G benzathine.', 'Grade A', '2024-01-01', ''),
    ('NICE Guideline for Medication Safety in Polypharmacy', 'General Practice', 'NICE', 'Structured approach to medication review and deprescribing in patients on multiple medications.', 'Annual medication review for patients on 10+ meds. Use STOPP/START criteria. Deprescribe: PPIs, benzodiazepines, anticholinergics. Consider pill burden and adherence.', 'Grade B', '2023-09-15', '')
  `);

  // Seed Audit Log
  await pool.query(`
    INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES
    (1, 'AI_INTERACTION_CHECK', 'drug_interaction', NULL, '{"drug1": "Warfarin", "drug2": "Atorvastatin"}'),
    (2, 'AI_PATIENT_CHECK', 'patient', 1, '{"patient": "John Smith", "medication_count": 3}'),
    (1, 'AI_INTERACTION_CHECK', 'drug_interaction', NULL, '{"drug1": "Sertraline", "drug2": "Tramadol"}'),
    (2, 'AI_DOSAGE_CALC', 'dosage', NULL, '{"drug": "Metformin", "patient": "Maria Garcia"}'),
    (1, 'LOGIN', 'user', 1, '{"ip": "192.168.1.100"}'),
    (2, 'LOGIN', 'user', 2, '{"ip": "192.168.1.101"}'),
    (1, 'AI_ALLERGY_CHECK', 'drug_allergy', NULL, '{"drug": "Amoxicillin", "patient": "John Smith"}'),
    (2, 'AI_PREGNANCY_CHECK', 'pregnancy_safety', NULL, '{"drug": "Lisinopril", "trimester": "Second"}'),
    (1, 'DRUG_CREATE', 'drug', 20, '{"name": "Losartan"}'),
    (2, 'PATIENT_UPDATE', 'patient', 2, '{"field": "medications", "action": "added albuterol"}'),
    (1, 'AI_GERIATRIC_CHECK', 'geriatric', NULL, '{"drug": "Tramadol", "patient_age": 82}'),
    (2, 'AI_PGX_ANALYSIS', 'pharmacogenomics', NULL, '{"drug": "Clopidogrel", "gene": "CYP2C19"}'),
    (1, 'AI_FOOD_INTERACTION', 'food_interaction', NULL, '{"drug": "Warfarin", "food": "Spinach"}'),
    (2, 'AI_ALTERNATIVE_SUGGEST', 'drug_alternative', NULL, '{"drug": "Atorvastatin", "reason": "myopathy"}'),
    (1, 'AI_CONTRAINDICATION_CHECK', 'contraindication', NULL, '{"drug": "Metformin", "condition": "CKD Stage 4"}')
  `);

  console.log('Database seeded successfully!');
  await pool.end();
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
