import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './contexts/ThemeContext.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { ClinicProvider } from './contexts/ClinicContext.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <ClinicProvider>
          <App />
        </ClinicProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
