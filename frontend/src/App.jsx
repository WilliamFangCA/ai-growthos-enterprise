import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
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

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/agents" element={<AgentCenter />} />
        <Route path="/content" element={<ContentFactory />} />
        <Route path="/crm" element={<CRM />} />
        <Route path="/workflows" element={<Workflows />} />
        <Route path="/comms" element={<CommHub />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/ai-rules" element={<AIRules />} />
        <Route path="/marketing" element={<Marketing />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  );
}
