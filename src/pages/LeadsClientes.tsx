import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDistanceToNow } from 'date-fns';
import { UserSearch, UserCheck, Search, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Drawer } from '../components/ui/Drawer';
import { LeadDetailsPanel } from '../components/ui/LeadDetailsPanel';
import { DateFilter, DateRange, getPresetRange } from '../components/ui/DateFilter';
import { ToastContainer, useToast } from '../components/ui/Toast';
import { cn } from '../components/ui/Button';

const PAGE_SIZE = 20;

const STATUS_LABELS: Record<string, string> = {
  iniciou_atendimento: 'Iniciou',
  conversando: 'Conversando',
  agendado: 'Agendado',
  compareceu: 'Compareceu',
  cancelou_agendamento: 'Cancelou',
  follow_up: 'Follow Up',
  abandonou_conversa: 'Abandonou',
};

const formatBR = (d: string | null) => {
  if (!d) return '—';
  try { return format(new Date(d), 'dd/MM/yyyy HH:mm', { locale: ptBR }); } catch { return d; }
};

const formatRelative = (d: string | null) => {
  if (!d) return '—';
  try { return formatDistanceToNow(new Date(d), { addSuffix: true, locale: ptBR }); } catch { return d; }
};

const formatMoney = (v: number | null) => {
  if (v === null || v === undefined) return null;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
};

export function LeadsClientes() {
  const { toasts, addToast, removeToast } = useToast();
  const [tab, setTab] = useState<'leads' | 'clientes'>('leads');
  const [range, setRange] = useState<DateRange>(() => {
    const { from, to } = getPresetRange('7dias');
    return { from, to, preset: '7dias' };
  });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [leadsData, setLeadsData] = useState<any[]>([]);
  const [clientesData, setClientesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerItem, setDrawerItem] = useState<{ lead: any; isClient?: boolean; clientData?: any } | null>(null);

  const fromISO = range.from.toISOString();
  const toISO = range.to.toISOString();

  useEffect(() => {
    setPage(0);
    if (tab === 'leads') fetchLeads();
    else fetchClientes();
  }, [tab, fromISO, toISO]);

  const fetchLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('leads_estetica')
      .select('id, nome_lead, whatsapp_lead, status, procedimento_interesse, motivo_contato, resumo_conversa, inicio_atendimento, ultima_mensagem, follow_up_1, follow_up_2, follow_up_3, data_agendamento, valor_pago, data_nascimento, genero, observacoes, id_agendamento, minutos_ultima_mensagem')
      .gte('inicio_atendimento', fromISO)
      .lte('inicio_atendimento', toISO)
      .order('inicio_atendimento', { ascending: false });

    if (!error && data) {
      // Filter out clients
      const { data: clientIds } = await supabase.from('clientes_estetica').select('lead_id');
      const ids = new Set((clientIds || []).map((c: any) => c.lead_id));
      setLeadsData(data.filter((l: any) => !ids.has(l.id)));
    }
    setLoading(false);
  };

  const fetchClientes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clientes_estetica')
      .select('*, leads_estetica(id, nome_lead, whatsapp_lead, status, procedimento_interesse, motivo_contato, resumo_conversa, inicio_atendimento, ultima_mensagem, follow_up_1, follow_up_2, follow_up_3, data_agendamento, valor_pago, data_nascimento, genero, observacoes, id_agendamento, minutos_ultima_mensagem)')
      .gte('created_at', fromISO)
      .lte('created_at', toISO)
      .order('created_at', { ascending: false });

    if (!error && data) setClientesData(data);
    setLoading(false);
  };

  const filteredLeads = useMemo(() => {
    if (!search) return leadsData;
    const q = search.toLowerCase();
    return leadsData.filter((l) =>
      (l.nome_lead || '').toLowerCase().includes(q) ||
      (l.whatsapp_lead || '').toLowerCase().includes(q)
    );
  }, [leadsData, search]);

  const filteredClientes = useMemo(() => {
    if (!search) return clientesData;
    const q = search.toLowerCase();
    return clientesData.filter((c) => {
      const lead = c.leads_estetica;
      return (lead?.nome_lead || '').toLowerCase().includes(q) ||
             (lead?.whatsapp_lead || '').toLowerCase().includes(q);
    });
  }, [clientesData, search]);

  const paginatedLeads = filteredLeads.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const paginatedClientes = filteredClientes.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil((tab === 'leads' ? filteredLeads : filteredClientes).length / PAGE_SIZE);

  const Pagination = () => totalPages <= 1 ? null : (
    <div className="flex items-center justify-between mt-4">
      <p className="text-sm text-text-muted">
        Página {page + 1} de {totalPages}
      </p>
      <div className="flex gap-2">
        <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
          className="p-1.5 border border-border-card rounded text-text-muted hover:bg-primary-light disabled:opacity-30">
          <ChevronLeft size={16} />
        </button>
        <button disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}
          className="p-1.5 border border-border-card rounded text-text-muted hover:bg-primary-light disabled:opacity-30">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-primary shrink-0">
              <UserSearch size={20} />
            </div>
            <div>
              <p className="font-heading text-lg font-medium text-primary">Lead</p>
              <p className="text-sm text-text-muted">Entrou em contato com o salão, mas ainda não compareceu presencialmente.</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#E6F0EA', color: '#7A9E87' }}>
              <UserCheck size={20} />
            </div>
            <div>
              <p className="font-heading text-lg font-medium" style={{ color: '#7A9E87' }}>Cliente</p>
              <p className="text-sm text-text-muted">Agendou e compareceu ao salão pelo menos uma vez.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date Filter */}
      <DateFilter value={range} onChange={(r) => { setRange(r); setPage(0); }} />

      {/* Tabs */}
      <div className="border-b border-border-card">
        <nav className="flex space-x-6">
          {[{ id: 'leads', label: 'Leads' }, { id: 'clientes', label: 'Clientes' }].map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id as any); setPage(0); setSearch(''); }}
              className={cn('py-3 px-1 border-b-2 font-medium text-sm transition-colors',
                tab === t.id ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-main'
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Search */}
      <Input
        placeholder="Buscar por nome ou WhatsApp..."
        icon={<Search size={16} />}
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        className="max-w-sm"
      />

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : tab === 'leads' ? (
        <>
          {paginatedLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-text-muted gap-2">
              <Users size={40} className="opacity-30" />
              <p>Nenhum lead encontrado no período.</p>
            </div>
          ) : (
            <div className="bg-card rounded-card border border-border-card shadow-card overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="border-b border-border-card text-xs text-text-muted uppercase bg-base">
                  <tr>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">WhatsApp</th>
                    <th className="px-4 py-3">Procedimento</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Última msg</th>
                    <th className="px-4 py-3">Agendamento</th>
                    <th className="px-4 py-3">Iniciou em</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      onClick={() => setDrawerItem({ lead })}
                      className="border-b border-border-card hover:bg-primary-light/30 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-text-main">{lead.nome_lead || 'Sem nome'}</td>
                      <td className="px-4 py-3 text-text-muted">{lead.whatsapp_lead}</td>
                      <td className="px-4 py-3 text-text-muted max-w-[120px] truncate">{lead.procedimento_interesse || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={lead.status}>{STATUS_LABELS[lead.status] || lead.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-text-muted">{formatRelative(lead.ultima_mensagem)}</td>
                      <td className="px-4 py-3 text-text-muted">{formatBR(lead.data_agendamento)}</td>
                      <td className="px-4 py-3 text-text-muted">{formatBR(lead.inicio_atendimento)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination />
        </>
      ) : (
        <>
          {paginatedClientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-text-muted gap-2">
              <UserCheck size={40} className="opacity-30" />
              <p>Nenhum cliente encontrado no período.</p>
            </div>
          ) : (
            <div className="bg-card rounded-card border border-border-card shadow-card overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="border-b border-border-card text-xs text-text-muted uppercase bg-base">
                  <tr>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">WhatsApp</th>
                    <th className="px-4 py-3">Procedimentos</th>
                    <th className="px-4 py-3">Próximo agendamento</th>
                    <th className="px-4 py-3">Cliente desde</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedClientes.map((c) => {
                    const lead = c.leads_estetica;
                    return (
                      <tr
                        key={c.id}
                        onClick={() => setDrawerItem({
                          lead,
                          isClient: true,
                          clientData: { data_primeira_visita: c.data_primeira_visita, procedimentos_realizados: 0 }
                        })}
                        className="border-b border-border-card hover:bg-primary-light/30 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-text-main">{lead?.nome_lead || 'Sem nome'}</td>
                        <td className="px-4 py-3 text-text-muted">{lead?.whatsapp_lead}</td>
                        <td className="px-4 py-3 text-text-muted">—</td>
                        <td className="px-4 py-3 text-text-muted">—</td>
                        <td className="px-4 py-3 text-text-muted">{formatBR(c.data_primeira_visita)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <Pagination />
        </>
      )}

      {/* Detail Drawer */}
      <Drawer
        isOpen={!!drawerItem}
        onClose={() => setDrawerItem(null)}
        title={drawerItem?.isClient ? 'Dados do Cliente' : 'Dados do Lead'}
      >
        {drawerItem && (
          <LeadDetailsPanel
            lead={drawerItem.lead}
            isClient={drawerItem.isClient}
            clientData={drawerItem.clientData}
          />
        )}
      </Drawer>
    </div>
  );
}
