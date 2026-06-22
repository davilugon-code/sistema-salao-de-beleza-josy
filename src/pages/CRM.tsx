import { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Phone, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Drawer } from '../components/ui/Drawer';
import { LeadDetailsPanel } from '../components/ui/LeadDetailsPanel';
import { ToastContainer, useToast } from '../components/ui/Toast';
import { cn } from '../components/ui/Button';
import { useTheme } from '../contexts/ThemeContext';

interface Lead {
  id: string;
  nome_lead: string | null;
  whatsapp_lead: string;
  status: string;
  procedimento_interesse: string | null;
  motivo_contato: string | null;
  resumo_conversa: string | null;
  inicio_atendimento: string | null;
  ultima_mensagem: string | null;
  follow_up_1: string | null;
  follow_up_2: string | null;
  follow_up_3: string | null;
  data_agendamento: string | null;
  valor_pago: number | null;
  data_nascimento: string | null;
  genero: string | null;
  observacoes: string | null;
  id_agendamento: string | null;
  minutos_ultima_mensagem: number | null;
}

const COLUMNS = [
  { status: 'iniciou_atendimento', label: 'Iniciou o Atendimento', color: '#FAF0EE', darkColor: '#3D2525', headerColor: '#C47E7E' },
  { status: 'conversando', label: 'Conversando', color: '#EFF6FF', darkColor: '#1E293B', headerColor: '#3B82F6' },
  { status: 'agendado', label: 'Agendado', color: '#F0F7F3', darkColor: '#14532D', headerColor: '#7A9E87' },
  { status: 'compareceu', label: 'Compareceu', color: '#E6F0EA', darkColor: '#166534', headerColor: '#7A9E87' },
  { status: 'cancelou_agendamento', label: 'Cancelou o Agendamento', color: '#FDF6EE', darkColor: '#432E24', headerColor: '#E8A87C' },
  { status: 'follow_up', label: 'Follow Up', color: '#FFF8F1', darkColor: '#4C2417', headerColor: '#E8804A' },
  { status: 'abandonou_conversa', label: 'Abandonou a Conversa', color: '#F5F5F5', darkColor: '#27272A', headerColor: '#9CA3AF' },
];

const STATUS_LABELS: Record<string, string> = Object.fromEntries(COLUMNS.map((c) => [c.status, c.label]));

function formatRelativeMinutes(minutos: number | null) {
  if (minutos === null || minutos === undefined) return null;
  if (minutos < 60) return `há ${Math.round(minutos)}min`;
  if (minutos < 1440) return `há ${Math.round(minutos / 60)}h`;
  return `há ${Math.round(minutos / 1440)} dias`;
}

export function CRM() {
  const { theme } = useTheme();
  const { toasts, addToast, removeToast } = useToast();
  const [columns, setColumns] = useState<Record<string, Lead[]>>({});
  const [loading, setLoading] = useState(true);
  const [drawerLead, setDrawerLead] = useState<Lead | null>(null);
  const [newLeadModal, setNewLeadModal] = useState(false);
  const [compareceuConfirm, setCompareceuConfirm] = useState<{ lead: Lead; destCol: string } | null>(null);
  const [pendingDrop, setPendingDrop] = useState<DropResult | null>(null);
  const [newForm, setNewForm] = useState({ whatsapp: '', nome: '', procedimento: '', motivo: '' });

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('leads_estetica')
      .select('id, nome_lead, whatsapp_lead, status, procedimento_interesse, motivo_contato, resumo_conversa, inicio_atendimento, ultima_mensagem, follow_up_1, follow_up_2, follow_up_3, data_agendamento, valor_pago, data_nascimento, genero, observacoes, id_agendamento, minutos_ultima_mensagem')
      .order('inicio_atendimento', { ascending: false });

    if (error) { addToast('Erro ao carregar leads.', 'error'); setLoading(false); return; }

    const grouped: Record<string, Lead[]> = {};
    COLUMNS.forEach((c) => { grouped[c.status] = []; });
    (data || []).forEach((lead: Lead) => {
      if (grouped[lead.status]) grouped[lead.status].push(lead);
    });
    setColumns(grouped);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const lead = columns[source.droppableId]?.find((l) => l.id === draggableId);
    if (!lead) return;

    if (destination.droppableId === 'compareceu') {
      setPendingDrop(result);
      setCompareceuConfirm({ lead, destCol: destination.droppableId });
      return;
    }

    await applyDrop(result, lead);
  };

  const applyDrop = async (result: DropResult, lead: Lead) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    const newStatus = destination.droppableId;

    // Optimistic update
    setColumns((prev) => {
      const src = [...(prev[source.droppableId] || [])].filter((l) => l.id !== draggableId);
      const dst = [...(prev[destination.droppableId] || [])];
      dst.splice(destination.index, 0, { ...lead, status: newStatus });
      return { ...prev, [source.droppableId]: src, [destination.droppableId]: dst };
    });

    const { error } = await supabase.from('leads_estetica').update({ status: newStatus }).eq('id', draggableId);
    if (error) {
      addToast('Erro ao atualizar status. Revertendo...', 'error');
      setColumns((prev) => {
        const dst = [...(prev[destination.droppableId] || [])].filter((l) => l.id !== draggableId);
        const src = [...(prev[source.droppableId] || [])];
        src.splice(source.index, 0, lead);
        return { ...prev, [source.droppableId]: src, [destination.droppableId]: dst };
      });
    } else {
      addToast(`Lead movido para "${STATUS_LABELS[newStatus]}"`);
    }
  };

  const confirmCompareceu = async () => {
    if (!compareceuConfirm || !pendingDrop) return;
    setCompareceuConfirm(null);
    await applyDrop(pendingDrop, compareceuConfirm.lead);
    setPendingDrop(null);
  };

  const cancelCompareceu = () => {
    setCompareceuConfirm(null);
    setPendingDrop(null);
  };

  const handleCreateLead = async () => {
    if (!newForm.whatsapp) { addToast('WhatsApp é obrigatório.', 'warning'); return; }
    const { error } = await supabase.from('leads_estetica').insert({
      whatsapp_lead: newForm.whatsapp,
      nome_lead: newForm.nome || null,
      procedimento_interesse: newForm.procedimento || null,
      motivo_contato: newForm.motivo || null,
      status: 'iniciou_atendimento',
    });
    if (error) { addToast('Erro ao criar lead.', 'error'); return; }
    addToast('Lead criado com sucesso!');
    setNewLeadModal(false);
    setNewForm({ whatsapp: '', nome: '', procedimento: '', motivo: '' });
    fetchLeads();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="flex items-center justify-between mb-4 shrink-0">
        <h2 className="font-heading text-2xl text-text-main">Funil de Atendimento</h2>
        <Button onClick={() => setNewLeadModal(true)}>
          <Plus size={18} className="mr-1" /> Novo lead
        </Button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4 flex-1">
          {COLUMNS.map((col) => {
            const leads = columns[col.status] || [];
            return (
              <div key={col.status} className="flex flex-col rounded-card border border-border-card min-w-[220px] w-[220px] shrink-0 bg-card shadow-card">
                <div className="p-3 rounded-t-card border-b border-border-card" style={{ backgroundColor: theme === 'dark' ? col.darkColor : col.color }}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-text-main">{col.label}</span>
                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded-badge text-white" style={{ backgroundColor: col.headerColor }}>
                      {leads.length}
                    </span>
                  </div>
                </div>
                <Droppable droppableId={col.status}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn('flex-1 p-2 space-y-2 min-h-[100px] transition-colors rounded-b-card', snapshot.isDraggingOver && 'bg-primary-light/50')}
                    >
                      {leads.map((lead, index) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => setDrawerLead(lead)}
                              className={cn(
                                'bg-card border border-border-card rounded-md p-3 cursor-pointer hover:shadow-card transition-shadow text-sm space-y-1.5',
                                snapshot.isDragging && 'shadow-modal rotate-1 opacity-90'
                              )}
                            >
                              <p className="font-medium text-text-main truncate">{lead.nome_lead || 'Lead sem nome'}</p>
                              <div className="flex items-center gap-1 text-text-muted">
                                <Phone size={12} />
                                <span className="text-xs truncate">{lead.whatsapp_lead}</span>
                              </div>
                              {lead.procedimento_interesse && (
                                <p className="text-xs text-text-muted truncate">{lead.procedimento_interesse}</p>
                              )}
                              {lead.minutos_ultima_mensagem !== null && (
                                <div className="flex items-center gap-1 text-text-muted">
                                  <Clock size={11} />
                                  <span className="text-xs">{formatRelativeMinutes(lead.minutos_ultima_mensagem)}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {leads.length === 0 && !snapshot.isDraggingOver && (
                        <p className="text-xs text-text-muted text-center py-4 opacity-50">Nenhum lead</p>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Lead Drawer */}
      <Drawer isOpen={!!drawerLead} onClose={() => setDrawerLead(null)} title="Detalhes do Lead">
        {drawerLead && <LeadDetailsPanel lead={drawerLead} />}
      </Drawer>

      {/* New Lead Modal */}
      <Modal isOpen={newLeadModal} onClose={() => setNewLeadModal(false)} title="Novo Lead">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">WhatsApp <span className="text-error">*</span></label>
            <Input value={newForm.whatsapp} onChange={(e) => setNewForm({ ...newForm, whatsapp: e.target.value })} placeholder="+55 11 99999-9999" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nome</label>
            <Input value={newForm.nome} onChange={(e) => setNewForm({ ...newForm, nome: e.target.value })} placeholder="Nome do lead" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Procedimento de interesse</label>
            <Input value={newForm.procedimento} onChange={(e) => setNewForm({ ...newForm, procedimento: e.target.value })} placeholder="Ex: Limpeza de pele" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Motivo do contato</label>
            <Input value={newForm.motivo} onChange={(e) => setNewForm({ ...newForm, motivo: e.target.value })} placeholder="Como chegou até o salão?" />
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setNewLeadModal(false)}>Cancelar</Button>
            <Button onClick={handleCreateLead}>Criar Lead</Button>
          </div>
        </div>
      </Modal>

      {/* Compareceu Confirm */}
      <Modal isOpen={!!compareceuConfirm} onClose={cancelCompareceu} title="Confirmar Comparecimento">
        <p className="text-text-main mb-6">
          Confirmar que <strong>{compareceuConfirm?.lead.nome_lead || 'este lead'}</strong> compareceu ao salão? Ele será promovido para <strong>Cliente</strong>.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={cancelCompareceu}>Cancelar</Button>
          <Button onClick={confirmCompareceu}>Confirmar</Button>
        </div>
      </Modal>
    </div>
  );
}
