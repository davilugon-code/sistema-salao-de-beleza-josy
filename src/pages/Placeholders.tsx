import React from 'react';
import { Hammer } from 'lucide-react';

function PlaceholderPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-text-muted mt-20">
      <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mb-4 text-primary">
        <Hammer size={32} />
      </div>
      <h2 className="text-xl font-heading font-medium text-text-main mb-2">Página em Construção</h2>
      <p className="text-sm">Esta funcionalidade estará disponível em breve.</p>
    </div>
  );
}

export function Dashboard() { return <PlaceholderPage />; }
export function CRM() { return <PlaceholderPage />; }
export function LeadsClientes() { return <PlaceholderPage />; }
export function Agenda() { return <PlaceholderPage />; }
export function DocumentacaoAPI() { return <PlaceholderPage />; }
