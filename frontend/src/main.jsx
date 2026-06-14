import React, { useState, useEffect, createContext, useContext } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import { onAuthChange } from './firebase.js';
import { apiFetch } from './utils/apiClient.js';
import { ModelSettingsProvider } from './contexts/ModelSettings.jsx';
import { UISettingsProvider } from './contexts/UISettingsContext.jsx';

export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function Root() {
  const [user, setUser] = useState(undefined); // undefined = loading

  useEffect(() => {
    let lastSyncedUid = null;
    const unsubscribe = onAuthChange((u) => {
      setUser(u);
      // 登入後同步個人檔 + 記錄登入事件（IP/時間，後端寫 Firestore）；每個 uid 只同步一次，fire-and-forget
      if (u && u.uid !== lastSyncedUid) {
        lastSyncedUid = u.uid;
        apiFetch('/api/users/sync', { method: 'POST' }).catch(() => {});
      }
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading: user === undefined }}>
      <UISettingsProvider>
        <ModelSettingsProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ModelSettingsProvider>
      </UISettingsProvider>
    </AuthContext.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
