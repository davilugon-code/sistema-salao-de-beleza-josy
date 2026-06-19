import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Copy } from 'lucide-react';

export function AbaKanban() {
  const statusList = [
    { name: 'Iniciou o Atendimento', value: 'iniciou_atendimento', variant: 'agendado' },
    { name: 'Conversando', value: 'conversando', variant: 'confirmado' },
    { name: 'Agendado', value: 'agendado', variant: 'agendado' },
    { name: 'Compareceu', value: 'compareceu', variant: 'compareceu' },
    { name: 'Cancelou o Agendamento', value: 'cancelou_agendamento', variant: 'cancelou_agendamento' },
    { name: 'Follow Up', value: 'follow_up', variant: 'follow_up' },
    { name: 'Abandonou a Conversa', value: 'abandonou_conversa', variant: 'abandonou_conversa' },
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Referência do CRM</CardTitle>
        <p className="text-sm text-text-muted mt-1">Use os valores abaixo para atualizar o status dos leads via N8N ou agente de IA.</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto border border-border-card rounded-md mb-4">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-text-muted uppercase bg-base border-b border-border-card">
              <tr>
                <th className="px-6 py-3">Coluna do Kanban</th>
                <th className="px-6 py-3">Valor no banco</th>
              </tr>
            </thead>
            <tbody>
              {statusList.map((s, i) => (
                <tr key={i} className="border-b border-border-card last:border-0 hover:bg-base/50">
                  <td className="px-6 py-4">
                    <Badge variant={s.variant}>{s.name}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <code className="bg-base px-2 py-1 rounded text-primary border border-border-card font-mono text-xs">
                        {s.value}
                      </code>
                      <button 
                        onClick={() => copyToClipboard(s.value)}
                        className="text-text-muted hover:text-primary transition-colors group relative"
                        title="Copiar"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-text-muted bg-primary-light/50 p-4 rounded-md border border-primary-light">
          <strong>Aviso:</strong> Para atualizar o status de um lead via N8N, envie uma requisição ao Supabase atualizando o campo <code>status</code> da tabela <code>leads_estetica</code> com um dos valores acima.
        </p>
      </CardContent>
    </Card>
  );
}
