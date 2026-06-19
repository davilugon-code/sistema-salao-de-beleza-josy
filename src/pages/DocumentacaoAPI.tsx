import { useState, useEffect, useRef } from 'react';
import { Copy, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { CodeBlock } from '../components/ui/CodeBlock';
import { cn } from '../components/ui/Button';

export function DocumentacaoAPI() {
  const [tokens, setTokens] = useState<any[]>([]);
  const [agendas, setAgendas] = useState<any[]>([]);
  const [selectedToken, setSelectedToken] = useState('');
  const [selectedAgenda, setSelectedAgenda] = useState('');
  const [activeSection, setActiveSection] = useState('marcar');
  const [urlCopied, setUrlCopied] = useState(false);

  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [{ data: t }, { data: a }] = await Promise.all([
      supabase.from('api_tokens').select('id, label').eq('ativo', true),
      supabase.from('agendas').select('id, nome').eq('ativo', true),
    ]);
    if (t) setTokens(t);
    if (a) setAgendas(a);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-100px 0px -80% 0px' }
    );

    const sections = document.querySelectorAll('section[id]');
    sections.forEach((s) => observer.observe(s));
    return () => sections.forEach((s) => observer.unobserve(s));
  }, []);

  const tokenDisplay = selectedToken 
    ? `••••••${tokens.find(t => t.id === selectedToken)?.label.replace(/\s+/g, '')}` 
    : '{TOKEN}';
    
  const agendaDisplay = selectedAgenda || '{AGENDA_ID}';

  const copyUrl = () => {
    navigator.clipboard.writeText(baseUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  const menuItems = [
    { id: 'marcar', label: 'POST Marcar agendamento' },
    { id: 'reagendar', label: 'PUT Reagendar agendamento' },
    { id: 'cancelar', label: 'DELETE Cancelar agendamento' },
    { id: 'horarios', label: 'GET Consultar horários' },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-8 max-w-7xl mx-auto items-start relative h-full">
      
      {/* Side Navigation */}
      <nav className="hidden md:block w-64 shrink-0 sticky top-6 self-start space-y-1 bg-card rounded-card border border-border-card p-4 shadow-sm">
        <h3 className="font-heading font-medium text-lg mb-3 border-b border-border-card pb-2">Endpoints</h3>
        {menuItems.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={cn(
              "block text-sm py-2 px-3 rounded-md transition-colors",
              activeSection === item.id 
                ? "bg-primary text-white font-medium shadow-sm" 
                : "text-text-muted hover:bg-primary-light hover:text-primary"
            )}
          >
            {item.label}
          </a>
        ))}
      </nav>

      {/* Main Content */}
      <div className="flex-1 min-w-0 pb-20 space-y-12 w-full">
        
        {/* Header */}
        <div className="space-y-3">
          <h1 className="font-heading text-3xl font-medium text-text-main">Documentação da API</h1>
          <p className="text-text-muted text-lg">
            Use os endpoints abaixo para integrar seu agente de IA e N8N com o sistema de agendamento do salão.
          </p>
        </div>

        {/* Configuration Panel */}
        <div className="bg-primary-light border border-primary/30 rounded-card p-5 space-y-4">
          <h2 className="font-heading text-lg font-medium text-primary">Configuração Rápida</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-text-main">Token ativo</label>
              <select 
                className="w-full h-10 rounded-input border border-border-card bg-card px-3 text-sm text-text-main focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
              >
                <option value="">Selecione um token...</option>
                {tokens.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              {tokens.length === 0 && (
                <p className="text-xs text-error mt-1">Nenhum token ativo encontrado. Crie um em Configurações.</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1 text-text-main">Agenda</label>
              <select 
                className="w-full h-10 rounded-input border border-border-card bg-card px-3 text-sm text-text-main focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                value={selectedAgenda}
                onChange={(e) => setSelectedAgenda(e.target.value)}
              >
                <option value="">Selecione uma agenda...</option>
                {agendas.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-text-main">Base URL</label>
            <div className="flex items-center gap-2 bg-card border border-border-card rounded-input p-2 shadow-sm">
              <code className="text-sm flex-1 overflow-hidden truncate px-1 text-text-main">{baseUrl}</code>
              <button onClick={copyUrl} className="p-1.5 hover:bg-base rounded-md text-text-muted hover:text-text-main transition-colors shrink-0">
                {urlCopied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          <p className="text-xs text-text-muted mt-2 border-t border-primary/20 pt-2">
            Aviso: O token real não é exibido por segurança. Copie o cURL e substitua pelo token completo gerado em Configurações → Token de API.
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-16">
          
          {/* ENDPOINT 1 */}
          <section id="marcar" className="scroll-mt-10 space-y-6">
            <div className="border-b border-border-card pb-4">
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="success" className="font-mono">POST</Badge>
                <h2 className="font-heading text-2xl font-medium text-text-main">Marcar Agendamento</h2>
              </div>
              <p className="text-text-muted">Cria um novo agendamento na agenda informada para um lead ou cliente existente no sistema. Duração fixa de 60 minutos.</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-3">Parâmetros (Body)</h3>
              <div className="overflow-x-auto bg-card rounded-card border border-border-card shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-base border-b border-border-card text-xs text-text-muted uppercase">
                    <tr><th className="px-4 py-3 w-1/4">Campo</th><th className="px-4 py-3 w-1/6">Tipo</th><th className="px-4 py-3 w-1/6">Obrigatório</th><th className="px-4 py-3">Descrição</th></tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border-card">
                      <td className="px-4 py-3 font-mono font-medium">agenda_id</td><td className="px-4 py-3 text-text-muted">UUID</td><td className="px-4 py-3"><span className="text-success font-medium">SIM</span></td><td className="px-4 py-3 text-text-muted">ID da agenda</td>
                    </tr>
                    <tr className="border-b border-border-card">
                      <td className="px-4 py-3 font-mono font-medium">lead_id</td><td className="px-4 py-3 text-text-muted">UUID</td><td className="px-4 py-3"><span className="text-warning font-medium">CONDIC.</span></td><td className="px-4 py-3 text-text-muted">Obrigatório se não informar cliente_id</td>
                    </tr>
                    <tr className="border-b border-border-card">
                      <td className="px-4 py-3 font-mono font-medium">cliente_id</td><td className="px-4 py-3 text-text-muted">UUID</td><td className="px-4 py-3"><span className="text-warning font-medium">CONDIC.</span></td><td className="px-4 py-3 text-text-muted">Obrigatório se não informar lead_id</td>
                    </tr>
                    <tr className="border-b border-border-card">
                      <td className="px-4 py-3 font-mono font-medium">data</td><td className="px-4 py-3 text-text-muted">String</td><td className="px-4 py-3"><span className="text-success font-medium">SIM</span></td><td className="px-4 py-3 text-text-muted">Formato YYYY-MM-DD</td>
                    </tr>
                    <tr className="border-b border-border-card">
                      <td className="px-4 py-3 font-mono font-medium">hora</td><td className="px-4 py-3 text-text-muted">String</td><td className="px-4 py-3"><span className="text-success font-medium">SIM</span></td><td className="px-4 py-3 text-text-muted">Formato HH:MM</td>
                    </tr>
                    <tr className="border-b border-border-card">
                      <td className="px-4 py-3 font-mono font-medium">procedimento_nome</td><td className="px-4 py-3 text-text-muted">String</td><td className="px-4 py-3">NÃO</td><td className="px-4 py-3 text-text-muted">Nome do procedimento (texto livre)</td>
                    </tr>
                    <tr className="border-b border-border-card">
                      <td className="px-4 py-3 font-mono font-medium">nome_lead</td><td className="px-4 py-3 text-text-muted">String</td><td className="px-4 py-3">NÃO</td><td className="px-4 py-3 text-text-muted">Nome do lead</td>
                    </tr>
                    <tr className="border-b border-border-card">
                      <td className="px-4 py-3 font-mono font-medium">whatsapp_lead</td><td className="px-4 py-3 text-text-muted">String</td><td className="px-4 py-3">NÃO</td><td className="px-4 py-3 text-text-muted">WhatsApp do lead</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-mono font-medium">observacoes</td><td className="px-4 py-3 text-text-muted">String</td><td className="px-4 py-3">NÃO</td><td className="px-4 py-3 text-text-muted">Observações livres</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-2">Requisição cURL</h3>
              <CodeBlock code={`curl -X POST ${baseUrl}/agendamentos \\
  -H "Authorization: Bearer ${tokenDisplay}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agenda_id": "${agendaDisplay}",
    "lead_id": "UUID_DO_LEAD",
    "procedimento_nome": "Limpeza de Pele",
    "nome_lead": "Maria Silva",
    "whatsapp_lead": "5548999999999",
    "data": "2025-03-15",
    "hora": "14:00"
  }'`} />
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-2">Resposta de Sucesso (201)</h3>
              <CodeBlock code={`{
  "sucesso": true,
  "situacao": "AGENDAMENTO_CRIADO",
  "mensagem": "Agendamento criado com sucesso.",
  "agendamento": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "agenda_id": "3d94b8e2-1c7a-4f9d-b123-456789abcdef",
    "lead_id": "a1b2c3d4-1234-5678-abcd-ef0123456789",
    "cliente_id": null,
    "procedimento_nome": "Limpeza de Pele",
    "nome_lead": "Maria Silva",
    "whatsapp_lead": "5548999999999",
    "data_hora_inicio": "2025-03-15T14:00:00-03:00",
    "data_hora_fim": "2025-03-15T15:00:00-03:00",
    "status": "agendado"
  }
}`} />
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-3">Situações e Erros</h3>
              <div className="overflow-x-auto bg-card rounded-card border border-border-card shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-base border-b border-border-card text-xs text-text-muted uppercase">
                    <tr><th className="px-4 py-3 w-20">HTTP</th><th className="px-4 py-3 w-1/3">situacao</th><th className="px-4 py-3">Motivo</th></tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border-card"><td className="px-4 py-3 font-medium text-success">201</td><td className="px-4 py-3 font-mono">AGENDAMENTO_CRIADO</td><td className="px-4 py-3 text-text-muted">Agendamento criado com sucesso</td></tr>
                    <tr className="border-b border-border-card"><td className="px-4 py-3 font-medium text-text-main">200</td><td className="px-4 py-3 font-mono">HORARIO_OCUPADO</td><td className="px-4 py-3 text-text-muted">Slot indisponível — resposta inclui 3 sugestões</td></tr>
                    <tr className="border-b border-border-card"><td className="px-4 py-3 font-medium text-text-main">200</td><td className="px-4 py-3 font-mono">AGENDA_FECHADA</td><td className="px-4 py-3 text-text-muted">Agenda fechada no dia solicitado</td></tr>
                    <tr className="border-b border-border-card"><td className="px-4 py-3 font-medium text-text-main">200</td><td className="px-4 py-3 font-mono">DATA_PASSADA</td><td className="px-4 py-3 text-text-muted">Data anterior a hoje</td></tr>
                    <tr className="border-b border-border-card"><td className="px-4 py-3 font-medium text-error">401</td><td className="px-4 py-3 font-mono">TOKEN_INVALIDO</td><td className="px-4 py-3 text-text-muted">Token ausente ou inválido</td></tr>
                    <tr className="border-b border-border-card"><td className="px-4 py-3 font-medium text-error">403</td><td className="px-4 py-3 font-mono">AGENDA_NAO_ENCONTRADA</td><td className="px-4 py-3 text-text-muted">agenda_id inválido ou inativo</td></tr>
                    <tr className="border-b border-border-card"><td className="px-4 py-3 font-medium text-error">404</td><td className="px-4 py-3 font-mono">LEAD_NAO_ENCONTRADO</td><td className="px-4 py-3 text-text-muted">lead_id não existe</td></tr>
                    <tr><td className="px-4 py-3 font-medium text-error">422</td><td className="px-4 py-3 font-mono">CAMPO_OBRIGATORIO_AUSENTE</td><td className="px-4 py-3 text-text-muted">lead_id e cliente_id ausentes</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ENDPOINT 2 */}
          <section id="reagendar" className="scroll-mt-10 space-y-6">
            <div className="border-b border-border-card pb-4">
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="primary" className="font-mono bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">PUT</Badge>
                <h2 className="font-heading text-2xl font-medium text-text-main">Reagendar Agendamento</h2>
              </div>
              <p className="text-text-muted">Altera a data e/ou hora de um agendamento existente. O ID do agendamento é retornado no momento da criação.</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-3">Parâmetros</h3>
              <div className="overflow-x-auto bg-card rounded-card border border-border-card shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-base border-b border-border-card text-xs text-text-muted uppercase">
                    <tr><th className="px-4 py-3 w-1/4">Campo</th><th className="px-4 py-3 w-1/6">Onde</th><th className="px-4 py-3 w-1/6">Obrigatório</th><th className="px-4 py-3">Descrição</th></tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border-card"><td className="px-4 py-3 font-mono font-medium">:id</td><td className="px-4 py-3 text-text-muted">URL</td><td className="px-4 py-3"><span className="text-success font-medium">SIM</span></td><td className="px-4 py-3 text-text-muted">ID do agendamento a reagendar</td></tr>
                    <tr className="border-b border-border-card"><td className="px-4 py-3 font-mono font-medium">agenda_id</td><td className="px-4 py-3 text-text-muted">Body</td><td className="px-4 py-3"><span className="text-success font-medium">SIM</span></td><td className="px-4 py-3 text-text-muted">ID da agenda</td></tr>
                    <tr className="border-b border-border-card"><td className="px-4 py-3 font-mono font-medium">data</td><td className="px-4 py-3 text-text-muted">Body</td><td className="px-4 py-3"><span className="text-success font-medium">SIM</span></td><td className="px-4 py-3 text-text-muted">Nova data no formato YYYY-MM-DD</td></tr>
                    <tr><td className="px-4 py-3 font-mono font-medium">hora</td><td className="px-4 py-3 text-text-muted">Body</td><td className="px-4 py-3"><span className="text-success font-medium">SIM</span></td><td className="px-4 py-3 text-text-muted">Novo horário no formato HH:MM</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-2">Requisição cURL</h3>
              <CodeBlock code={`curl -X PUT ${baseUrl}/agendamentos/ID_DO_AGENDAMENTO \\
  -H "Authorization: Bearer ${tokenDisplay}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agenda_id": "${agendaDisplay}",
    "data": "2025-03-20",
    "hora": "10:00"
  }'`} />
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-2">Resposta de Sucesso (200)</h3>
              <CodeBlock code={`{
  "sucesso": true,
  "situacao": "AGENDAMENTO_REAGENDADO",
  "mensagem": "Agendamento reagendado com sucesso.",
  "agendamento": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "agenda_id": "3d94b8e2-1c7a-4f9d-b123-456789abcdef",
    "procedimento_nome": "Limpeza de Pele",
    "nome_lead": "Maria Silva",
    "whatsapp_lead": "5548999999999",
    "data_hora_inicio": "2025-03-20T10:00:00-03:00",
    "data_hora_fim": "2025-03-20T11:00:00-03:00",
    "status": "agendado"
  }
}`} />
            </div>
          </section>

          {/* ENDPOINT 3 */}
          <section id="cancelar" className="scroll-mt-10 space-y-6">
            <div className="border-b border-border-card pb-4">
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="danger" className="font-mono">DELETE</Badge>
                <h2 className="font-heading text-2xl font-medium text-text-main">Cancelar Agendamento</h2>
              </div>
              <p className="text-text-muted">Cancela um agendamento existente. O registro não é deletado — o status é alterado para cancelado.</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-3">Parâmetros</h3>
              <div className="overflow-x-auto bg-card rounded-card border border-border-card shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-base border-b border-border-card text-xs text-text-muted uppercase">
                    <tr><th className="px-4 py-3 w-1/4">Campo</th><th className="px-4 py-3 w-1/6">Onde</th><th className="px-4 py-3 w-1/6">Obrigatório</th><th className="px-4 py-3">Descrição</th></tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border-card"><td className="px-4 py-3 font-mono font-medium">:id</td><td className="px-4 py-3 text-text-muted">URL</td><td className="px-4 py-3"><span className="text-success font-medium">SIM</span></td><td className="px-4 py-3 text-text-muted">ID do agendamento a cancelar</td></tr>
                    <tr><td className="px-4 py-3 font-mono font-medium">agenda_id</td><td className="px-4 py-3 text-text-muted">Body</td><td className="px-4 py-3"><span className="text-success font-medium">SIM</span></td><td className="px-4 py-3 text-text-muted">ID da agenda</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-2">Requisição cURL</h3>
              <CodeBlock code={`curl -X DELETE ${baseUrl}/agendamentos/ID_DO_AGENDAMENTO \\
  -H "Authorization: Bearer ${tokenDisplay}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agenda_id": "${agendaDisplay}"
  }'`} />
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-2">Resposta de Sucesso (200)</h3>
              <CodeBlock code={`{
  "sucesso": true,
  "situacao": "AGENDAMENTO_CANCELADO",
  "mensagem": "Agendamento cancelado com sucesso.",
  "agendamento": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "status": "cancelado"
  }
}`} />
            </div>
          </section>

          {/* ENDPOINT 4 */}
          <section id="horarios" className="scroll-mt-10 space-y-6">
            <div className="border-b border-border-card pb-4">
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="secondary" className="font-mono bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300">GET</Badge>
                <h2 className="font-heading text-2xl font-medium text-text-main">Consultar Horários</h2>
              </div>
              <p className="text-text-muted">Consulta a disponibilidade de horários em uma agenda. Pode verificar um horário específico ou listar todos os livres de um dia.</p>
            </div>

            <div className="space-y-8 bg-base/50 p-6 rounded-card border border-border-card">
              <h3 className="font-heading text-xl font-medium text-text-main">Variação 1 — Verificar horário específico</h3>
              <p className="text-text-muted text-sm -mt-2 mb-4">Informe data + hora para verificar se um horário está disponível. Se ocupado, recebe 3 sugestões próximas.</p>
              
              <CodeBlock code={`curl -X GET "${baseUrl}/agendamentos/horarios?agenda_id=${agendaDisplay}&data=2025-03-15&hora=14:00" \\
  -H "Authorization: Bearer ${tokenDisplay}"`} />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-2">Resposta (Disponível)</h4>
                  <CodeBlock code={`{
  "sucesso": true,
  "situacao": "HORARIO_DISPONIVEL",
  "mensagem": "O horário solicitado está disponível.",
  "horario": "2025-03-15T14:00:00-03:00"
}`} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-2">Resposta (Ocupado)</h4>
                  <CodeBlock code={`{
  "sucesso": false,
  "situacao": "HORARIO_OCUPADO",
  "mensagem": "O horário solicitado não está disponível. Aqui estão os próximos horários livres:",
  "sugestoes": [
    "2025-03-15T15:00:00-03:00",
    "2025-03-15T16:00:00-03:00",
    "2025-03-15T17:00:00-03:00"
  ]
}`} />
                </div>
              </div>
            </div>

            <div className="space-y-8 bg-base/50 p-6 rounded-card border border-border-card mt-8">
              <h3 className="font-heading text-xl font-medium text-text-main">Variação 2 — Listar todos os slots livres</h3>
              <p className="text-text-muted text-sm -mt-2 mb-4">Informe apenas a data para receber todos os horários disponíveis do dia.</p>
              
              <CodeBlock code={`curl -X GET "${baseUrl}/agendamentos/horarios?agenda_id=${agendaDisplay}&data=2025-03-15" \\
  -H "Authorization: Bearer ${tokenDisplay}"`} />
              
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-2">Resposta de Sucesso</h4>
                <CodeBlock code={`{
  "sucesso": true,
  "situacao": "HORARIOS_DISPONIVEIS",
  "mensagem": "Horários disponíveis para o dia 15/03/2025.",
  "data": "2025-03-15",
  "duracao_minutos": 60,
  "slots_disponiveis": ["08:00", "09:00", "10:00", "14:00", "15:00", "16:00"]
}`} />
              </div>
            </div>
            
          </section>

        </div>
      </div>
    </div>
  );
}
