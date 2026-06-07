import React, { useState, useEffect, createContext, useContext } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import { onAuthChange } from './firebase.js';
import { ModelSettingsProvider } from './contexts/ModelSettings.jsx';
import { UISettingsProvider } from './contexts/UISettingsContext.jsx';

export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function Root() {
  const [user, setUser] = useState(undefined); // undefined = loading

  useEffect(() => {
    const unsubscribe = onAuthChange((u) => setUser(u));
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
