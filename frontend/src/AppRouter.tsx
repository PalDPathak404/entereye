import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import EntrancePage from './pages/EntrancePage';
import LandingPage from './pages/LandingPage';
import Dashboard from './Dashboard';

const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<EntrancePage />} />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/login" element={<LoginRedirect />} />
      <Route path="/register" element={<RegisterRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// Temporary redirects - you can replace these with actual login/register pages
const LoginRedirect: React.FC = () => {
  return <Navigate to="/dashboard" replace />;
};

const RegisterRedirect: React.FC = () => {
  return <Navigate to="/dashboard" replace />;
};

export default AppRouter;
