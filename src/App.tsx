import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { CRM } from './pages/CRM';
import { LeadsClientes } from './pages/LeadsClientes';
import { Agenda } from './pages/Agenda';
import { DocumentacaoAPI } from './pages/DocumentacaoAPI';
import { Configuracoes } from './pages/Configuracoes';
import { useAuth } from './contexts/AuthContext';

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  if (role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="crm" element={<CRM />} />
          <Route path="leads-clientes" element={<LeadsClientes />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="documentacao-api" element={<DocumentacaoAPI />} />
          <Route path="configuracoes" element={<AdminRoute><Configuracoes /></AdminRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
