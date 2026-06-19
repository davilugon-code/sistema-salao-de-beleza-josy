import React, { useState } from 'react';
import { cn } from '../components/ui/Button';
import { AbaGeral } from './configuracoes/AbaGeral';
import { AbaUsuarios } from './configuracoes/AbaUsuarios';
import { AbaTokens } from './configuracoes/AbaTokens';
import { AbaKanban } from './configuracoes/AbaKanban';

type Tab = 'geral' | 'usuarios' | 'token' | 'kanban';

export function Configuracoes() {
  const [activeTab, setActiveTab] = useState<Tab>('geral');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'geral', label: 'Geral' },
    { id: 'usuarios', label: 'Usuários' },
    { id: 'token', label: 'Token de API' },
    { id: 'kanban', label: 'Kanban' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="border-b border-border-card">
        <nav className="flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-text-muted hover:text-text-main hover:border-border-card"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'geral' && <AbaGeral />}
        {activeTab === 'usuarios' && <AbaUsuarios />}
        {activeTab === 'token' && <AbaTokens />}
        {activeTab === 'kanban' && <AbaKanban />}
      </div>
    </div>
  );
}
