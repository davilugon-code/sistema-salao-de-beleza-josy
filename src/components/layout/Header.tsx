import React from 'react';
import { Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar } from '../ui/Avatar';

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const location = useLocation();
  const { user } = useAuth();
  
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return 'Dashboard';
    if (path.startsWith('/crm')) return 'CRM';
    if (path.startsWith('/leads-clientes')) return 'Leads & Clientes';
    if (path.startsWith('/agenda')) return 'Agenda';
    if (path.startsWith('/configuracoes')) return 'Configurações';
    if (path.startsWith('/documentacao-api')) return 'Documentação API';
    return 'Sistema';
  };

  return (
    <header className="h-16 bg-base border-b border-border-card px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="p-1 md:hidden text-text-muted hover:text-primary"
        >
          <Menu size={24} />
        </button>
        <h1 className="font-heading text-2xl font-medium text-text-main">
          {getPageTitle()}
        </h1>
      </div>
      
      <div className="flex items-center">
        <Avatar initials={user?.email?.substring(0, 2).toUpperCase() || 'U'} className="w-9 h-9" />
      </div>
    </header>
  );
}
