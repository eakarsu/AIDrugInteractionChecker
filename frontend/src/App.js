import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DrugsPage from './pages/DrugsPage';
import InteractionsPage from './pages/InteractionsPage';
import PatientsPage from './pages/PatientsPage';
import AdverseReactionsPage from './pages/AdverseReactionsPage';
import DosagePage from './pages/DosagePage';
import AlternativesPage from './pages/AlternativesPage';
import AllergiesPage from './pages/AllergiesPage';
import ContraindicationsPage from './pages/ContraindicationsPage';
import FoodInteractionsPage from './pages/FoodInteractionsPage';
import PregnancyPage from './pages/PregnancyPage';
import PediatricPage from './pages/PediatricPage';
import GeriatricPage from './pages/GeriatricPage';
import PharmacogenomicsPage from './pages/PharmacogenomicsPage';
import GuidelinesPage from './pages/GuidelinesPage';
import AuditPage from './pages/AuditPage';
import MultiInteractionPage from './pages/MultiInteractionPage';
import GeriatricRiskPage from './pages/GeriatricRiskPage';
import AuditAISummaryPage from './pages/AuditAISummaryPage';
import ClinicalTrialMatchPage from './pages/ClinicalTrialMatchPage';
import Layout from './components/Layout';

import Batch03Features from './pages/Batch03Features';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) setIsAuthenticated(true);
  }, []);

  const handleLogin = () => setIsAuthenticated(true);
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) return <Login onLogin={handleLogin} />;

  return (
    <Router>
      <Layout onLogout={handleLogout}>
        <Routes>
          <Route path="/batch03" element={<Batch03Features />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/drugs" element={<DrugsPage />} />
          <Route path="/interactions" element={<InteractionsPage />} />
          <Route path="/patients" element={<PatientsPage />} />
          <Route path="/adverse-reactions" element={<AdverseReactionsPage />} />
          <Route path="/dosage" element={<DosagePage />} />
          <Route path="/alternatives" element={<AlternativesPage />} />
          <Route path="/allergies" element={<AllergiesPage />} />
          <Route path="/contraindications" element={<ContraindicationsPage />} />
          <Route path="/food-interactions" element={<FoodInteractionsPage />} />
          <Route path="/pregnancy" element={<PregnancyPage />} />
          <Route path="/pediatric" element={<PediatricPage />} />
          <Route path="/geriatric" element={<GeriatricPage />} />
          <Route path="/pharmacogenomics" element={<PharmacogenomicsPage />} />
          <Route path="/guidelines" element={<GuidelinesPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/ai-multi-check" element={<MultiInteractionPage />} />
          <Route path="/ai-geriatric-risk" element={<GeriatricRiskPage />} />
          <Route path="/ai-audit-summary" element={<AuditAISummaryPage />} />
          <Route path="/ai-clinical-trials" element={<ClinicalTrialMatchPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
