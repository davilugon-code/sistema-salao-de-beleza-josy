import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, Settings, Code, Kanban, LogOut, Sun, Moon, Menu } from 'lucide-react';
import { useClinic } from '../../contexts/ClinicContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Avatar } from '../ui/Avatar';
import { cn } from '../ui/Button';

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { config } = useClinic();
  const { user, role, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'CRM', path: '/crm', icon: Kanban },
    { name: 'Leads / Clientes', path: '/leads-clientes', icon: Users },
    { name: 'Agenda', path: '/agenda', icon: Calendar },
    ...(role === 'admin' ? [{ name: 'Configurações', path: '/configuracoes', icon: Settings }] : []),
    { name: 'Doc. API', path: '/documentacao-api', icon: Code },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[240px] bg-sidebar border-r border-border-card flex flex-col transition-transform duration-300 md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col items-center justify-center p-6 border-b border-border-card min-h-[140px]">
          {config.logo_url ? (
            <img src={config.logo_url} alt="Logo" className="max-h-[80px] object-contain mb-3" />
          ) : (
            <Avatar initials={config.nome || 'C'} className="w-16 h-16 text-2xl mb-3" />
          )}
          <h2 className="font-heading text-lg text-text-main text-center font-medium leading-tight">
            {config.nome || 'Salão de Beleza da Josy'}
          </h2>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={() => onClose()}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium",
                      isActive 
                        ? "bg-sidebar-active text-primary border-l-3 border-primary pl-2" 
                        : "text-text-muted hover:bg-sidebar-active hover:text-text-main"
                    )}
                  >
                    <item.icon size={18} className={isActive ? "text-primary" : ""} />
                    {item.name}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-border-card">
          <div className="flex items-center gap-3 mb-4 px-2">
            <Avatar initials={user?.email?.substring(0, 2).toUpperCase() || 'U'} className="w-8 h-8 text-sm" />
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-text-main truncate">{user?.email}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between px-2">
            <button 
              onClick={signOut}
              className="flex items-center gap-2 text-sm text-text-muted hover:text-error transition-colors"
            >
              <LogOut size={18} />
              <span>Sair</span>
            </button>
            
            <button 
              onClick={toggleTheme}
              className="p-1.5 rounded-md text-text-muted hover:bg-sidebar-active hover:text-primary transition-colors"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
