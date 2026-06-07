import React from 'react';
import Sidebar from './Sidebar.jsx';
import { useUISettings } from '../contexts/UISettingsContext.jsx';

export default function Layout({ children }) {
  const { theme } = useUISettings();
  const bg = theme === 'dark' ? '#0f1117' : '#f3f4f6';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: bg }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </div>
  );
}
