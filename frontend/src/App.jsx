import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './main.jsx';
import Layout from './components/Layout.jsx';
import LandingPage from './pages/landing/LandingPage.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import SignupPage from './pages/auth/SignupPage.jsx';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AgentCenter from './pages/AgentCenter.jsx';
import ContentFactory from './pages/ContentFactory.jsx';
import CRM from './pages/CRM.jsx';
import Workflows from './pages/Workflows.jsx';
import CommHub from './pages/CommHub.jsx';
import Orders from './pages/Orders.jsx';
import AIRules from './pages/AIRules.jsx';
import Marketing from './pages/Marketing.jsx';
import Analytics from './pages/Analytics.jsx';
import Settings from './pages/Settings.jsx';

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', background: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🚀</div>
      <div style={{ width: 32, height: 3, borderRadius: 2, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', animation: 'pulse 1.2s ease-in-out infinite' }} />
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="agents" element={<AgentCenter />} />
      <Route path="content" element={<ContentFactory />} />
      <Route path="crm" element={<CRM />} />
      <Route path="workflows" element={<Workflows />} />
      <Route path="comms" element={<CommHub />} />
      <Route path="orders" element={<Orders />} />
      <Route path="ai-rules" element={<AIRules />} />
      <Route path="marketing" element={<Marketing />} />
      <Route path="analytics" element={<Analytics />} />
      <Route path="settings" element={<Settings />} />
    </Routes>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={user ? <Navigate to="/app/dashboard" replace /> : <LoginPage />} />
      <Route path="/signup" element={user ? <Navigate to="/app/dashboard" replace /> : <SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Protected app routes */}
      <Route
        path="/app/*"
        element={
          user ? (
            <Layout>
              <AppRoutes />
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Legacy redirects for old URLs */}
      <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="/agents" element={<Navigate to="/app/agents" replace />} />
      <Route path="/content" element={<Navigate to="/app/content" replace />} />
      <Route path="/crm" element={<Navigate to="/app/crm" replace />} />
      <Route path="/workflows" element={<Navigate to="/app/workflows" replace />} />
      <Route path="/comms" element={<Navigate to="/app/comms" replace />} />
      <Route path="/orders" element={<Navigate to="/app/orders" replace />} />
      <Route path="/ai-rules" element={<Navigate to="/app/ai-rules" replace />} />
      <Route path="/marketing" element={<Navigate to="/app/marketing" replace />} />
      <Route path="/analytics" element={<Navigate to="/app/analytics" replace />} />
      <Route path="/settings" element={<Navigate to="/app/settings" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
