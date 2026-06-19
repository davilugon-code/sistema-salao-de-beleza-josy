import { useState, useEffect, useRef, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import { EventClickArg } from '@fullcalendar/core';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Edit2, Trash2, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { ToastContainer, useToast } from '../components/ui/Toast';

const PRESET_COLORS = ['#C47E7E', '#7A9E87', '#E8A87C', '#7B9EC4', '#B07ACA', '#CA7A9E', '#9EC47B', '#CA9E7A'];

interface Agenda {
  id: string;
  nome: string;
  cor: string;
  ativo: boolean;
}

interface AgendaHourRow {
  dia: string;
  aberto: boolean;
  hora_inicio: string | null;
  hora_fim: string | null;
}

const DIAS: { key: string; label: string }[] = [
  { key: 'domingo', label: 'Domingo' },
  { key: 'segunda', label: 'Segunda' },
  { key: 'terca', label: 'Terça' },
  { key: 'quarta', label: 'Quarta' },
  { key: 'quinta', label: 'Quinta' },
  { key: 'sexta', label: 'Sexta' },
  { key: 'sabado', label: 'Sábado' },
];

const STATUS_OPTIONS = [
  { value: 'agendado', label: 'Agendado' },
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'compareceu', label: 'Compareceu' },
  { value: 'faltou', label: 'Faltou' },
  { value: 'cancelado', label: 'Cancelado' },
];

export function Agenda() {
  const { role } = useAuth();
  const { toasts, addToast, removeToast } = useToast();
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [events, setEvents] = useState<Record<string, any[]>>({});
  const [agendaHours, setAgendaHours] = useState<Record<string, AgendaHourRow[]>>({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const calendarRefs = useRef<Record<string, FullCalendar | null>>({});

  // Modal states
  const [newAgendaModal, setNewAgendaModal] = useState(false);
  const [editAgendaModal, setEditAgendaModal] = useState<Agenda | null>(null);
  const [deleteAgendaModal, setDeleteAgendaModal] = useState<Agenda | null>(null);
  const [newAppModal, setNewAppModal] = useState<{ agendaId: string; date: string; time: string } | null>(null);
  const [viewAppModal, setViewAppModal] = useState<any | null>(null);
  const [rescheduleModal, setRescheduleModal] = useState<{ id: string; date: string; time: string } | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null);

  // Form states
  const [newAgendaNome, setNewAgendaNome] = useState('');
  const [newAgendaCor, setNewAgendaCor] = useState(PRESET_COLORS[0]);
  const [editHours, setEditHours] = useState<Record<string, AgendaHourRow>>({});
  const [newAppForm, setNewAppForm] = useState({ leadSearch: '', leadId: '', clienteId: '', procedimento: '', obs: '', nome: '' });
  const [leadSuggestions, setLeadSuggestions] = useState<any[]>([]);

  useEffect(() => { fetchAgendas(); }, []);

  const fetchAgendas = async () => {
    const { data } = await supabase.from('agendas').select('*').eq('ativo', true).order('created_at');
    if (data) {
      setAgendas(data);
      data.forEach((a: Agenda) => { fetchEvents(a.id); fetchAgendaHours(a.id); });
    }
  };

  const fetchEvents = async (agendaId: string) => {
    const { data } = await supabase.from('agendamentos_estetica')
      .select('id, nome_lead, procedimento_nome, data_hora_inicio, data_hora_fim, status, observacoes, lead_id, cliente_id, agenda_id')
      .eq('agenda_id', agendaId)
      .neq('status', 'cancelado');
    if (data) {
      const mapped = data.map((e) => ({
        id: e.id, title: `${e.nome_lead || 'Lead'} — ${e.procedimento_nome || ''}`,
        start: e.data_hora_inicio, end: e.data_hora_fim,
        extendedProps: { ...e },
      }));
      setEvents((prev) => ({ ...prev, [agendaId]: mapped }));
    }
  };

  const fetchAgendaHours = async (agendaId: string) => {
    const { data } = await supabase.from('agenda_hours').select('*').eq('agenda_id', agendaId);
    if (data) setAgendaHours((prev) => ({ ...prev, [agendaId]: data }));
  };

  const navigateWeek = (dir: 1 | -1) => {
    const next = dir === 1 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1);
    setCurrentDate(next);
    Object.values(calendarRefs.current).forEach((ref) => {
      if (ref) {
        const api = ref.getApi();
        dir === 1 ? api.next() : api.prev();
      }
    });
  };

  const weekLabel = `${format(startOfWeek(currentDate, { locale: ptBR }), 'dd/MM')} - ${format(endOfWeek(currentDate, { locale: ptBR }), 'dd/MM/yyyy')}`;

  const handleSlotClick = (agendaId: string) => (arg: DateClickArg) => {
    setNewAppForm({ leadSearch: '', leadId: '', clienteId: '', procedimento: '', obs: '', nome: '' });
    setNewAppModal({
      agendaId,
      date: format(arg.date, 'yyyy-MM-dd'),
      time: format(arg.date, 'HH:mm'),
    });
  };

  const handleEventClick = (arg: EventClickArg) => {
    setViewAppModal(arg.event.extendedProps);
  };

  const searchLeads = async (q: string) => {
    if (!q || q.length < 2) { setLeadSuggestions([]); return; }
    const { data: leads } = await supabase.from('leads_estetica').select('id, nome_lead, whatsapp_lead').or(`nome_lead.ilike.%${q}%,whatsapp_lead.ilike.%${q}%`).limit(5);
    const { data: clientes } = await supabase.from('clientes_estetica').select('id, leads_estetica(id, nome_lead, whatsapp_lead)').limit(5);
    const suggestions = [
      ...(leads || []).map((l) => ({ id: l.id, nome: l.nome_lead, whatsapp: l.whatsapp_lead, tipo: 'lead' })),
    ];
    setLeadSuggestions(suggestions);
  };

  const handleCreateAppointment = async () => {
    if (!newAppModal) return;
    const dataHora = `${newAppModal.date}T${newAppModal.time}:00`;
    const { error } = await supabase.from('agendamentos_estetica').insert({
      agenda_id: newAppModal.agendaId,
      lead_id: newAppForm.leadId || null,
      nome_lead: newAppForm.nome || newAppForm.leadSearch,
      procedimento_nome: newAppForm.procedimento,
      observacoes: newAppForm.obs,
      data_hora_inicio: dataHora,
      status: 'agendado',
    });
    if (error) { addToast('Erro ao criar agendamento.', 'error'); return; }
    addToast('Agendamento criado com sucesso!');
    setNewAppModal(null);
    fetchEvents(newAppModal.agendaId);
  };

  const handleUpdateStatus = async (id: string, agendaId: string, status: string) => {
    const { error } = await supabase.from('agendamentos_estetica').update({ status }).eq('id', id);
    if (error) { addToast('Erro ao atualizar status.', 'error'); return; }
    addToast('Status atualizado!');
    setViewAppModal((prev: any) => ({ ...prev, status }));
    fetchEvents(agendaId);
  };

  const handleCancelAppointment = async (id: string, agendaId: string) => {
    await handleUpdateStatus(id, agendaId, 'cancelado');
    setViewAppModal(null);
    setCancelConfirm(null);
  };

  const handleReschedule = async () => {
    if (!rescheduleModal || !viewAppModal) return;
    const dataHora = `${rescheduleModal.date}T${rescheduleModal.time}:00`;
    const { error } = await supabase.from('agendamentos_estetica').update({ data_hora_inicio: dataHora, status: 'agendado' }).eq('id', rescheduleModal.id);
    if (error) { addToast('Erro ao reagendar.', 'error'); return; }
    addToast('Reagendado com sucesso!');
    setRescheduleModal(null);
    fetchEvents(viewAppModal.agenda_id);
    setViewAppModal(null);
  };

  const handleCreateAgenda = async () => {
    if (!newAgendaNome) return;
    const { error } = await supabase.from('agendas').insert({ nome: newAgendaNome, cor: newAgendaCor, ativo: true });
    if (error) { addToast('Erro ao criar agenda.', 'error'); return; }
    addToast('Agenda criada com sucesso!');
    setNewAgendaModal(false);
    setNewAgendaNome('');
    fetchAgendas();
  };

  const handleSaveEditAgenda = async () => {
    if (!editAgendaModal) return;
    await supabase.from('agendas').update({ nome: editAgendaModal.nome, cor: editAgendaModal.cor }).eq('id', editAgendaModal.id);
    const upserts = Object.values(editHours).map((h) => ({ ...h, agenda_id: editAgendaModal.id }));
    if (upserts.length) await supabase.from('agenda_hours').upsert(upserts, { onConflict: 'agenda_id,dia' });
    addToast('Agenda atualizada!');
    setEditAgendaModal(null);
    fetchAgendas();
  };

  const openEditAgenda = async (agenda: Agenda) => {
    setEditAgendaModal(agenda);
    const { data } = await supabase.from('agenda_hours').select('*').eq('agenda_id', agenda.id);
    const map: Record<string, AgendaHourRow> = {};
    DIAS.forEach((d) => {
      const h = data?.find((r: any) => r.dia === d.key);
      map[d.key] = h || { dia: d.key, aberto: false, hora_inicio: '08:00', hora_fim: '18:00' };
    });
    setEditHours(map);
  };

  const handleDeleteAgenda = async () => {
    if (!deleteAgendaModal) return;
    await supabase.from('agendas').update({ ativo: false }).eq('id', deleteAgendaModal.id);
    addToast('Agenda removida.');
    setDeleteAgendaModal(null);
    fetchAgendas();
  };

  const getBusinessHours = (agendaId: string) => {
    const hours = agendaHours[agendaId] || [];
    const DOW: Record<string, number> = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };
    return hours.filter((h) => h.aberto && h.hora_inicio && h.hora_fim).map((h) => ({
      daysOfWeek: [DOW[h.dia]],
      startTime: h.hora_inicio!,
      endTime: h.hora_fim!,
    }));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigateWeek(-1)} className="p-2 hover:bg-primary-light rounded-button text-text-muted hover:text-primary transition-colors border border-border-card">
            <ChevronLeft size={20} />
          </button>
          <span className="font-heading text-xl text-text-main min-w-[200px] text-center">{weekLabel}</span>
          <button onClick={() => navigateWeek(1)} className="p-2 hover:bg-primary-light rounded-button text-text-muted hover:text-primary transition-colors border border-border-card">
            <ChevronRight size={20} />
          </button>
        </div>
        {role === 'admin' && (
          <Button onClick={() => setNewAgendaModal(true)}>
            <Plus size={18} className="mr-1" /> Nova agenda
          </Button>
        )}
      </div>

      {/* Calendar blocks */}
      {agendas.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-text-muted gap-2">
          <Calendar size={40} className="opacity-30" />
          <p>Nenhuma agenda ativa. Crie uma agenda para começar.</p>
        </div>
      )}

      {agendas.map((agenda) => (
        <Card key={agenda.id} className="overflow-hidden">
          <div className="h-1.5" style={{ backgroundColor: agenda.cor }} />
          <div className="flex items-center justify-between p-4 border-b border-border-card">
            <h2 className="font-heading text-xl font-medium text-text-main">{agenda.nome}</h2>
            {role === 'admin' && (
              <div className="flex gap-2">
                <button onClick={() => openEditAgenda(agenda)} className="p-1.5 hover:bg-primary-light rounded text-text-muted hover:text-primary transition-colors">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => setDeleteAgendaModal(agenda)} className="p-1.5 hover:bg-red-50 rounded text-text-muted hover:text-error transition-colors dark:hover:bg-red-900/20">
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
          <div className="p-0 overflow-auto">
            <FullCalendar
              ref={(ref) => { calendarRefs.current[agenda.id] = ref; }}
              plugins={[timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              locale={ptBrLocale}
              headerToolbar={false}
              slotMinTime="06:00:00"
              slotMaxTime="22:00:00"
              slotDuration="00:60:00"
              allDaySlot={false}
              height="auto"
              events={events[agenda.id] || []}
              dateClick={handleSlotClick(agenda.id)}
              eventClick={handleEventClick}
              businessHours={getBusinessHours(agenda.id)}
              eventColor={agenda.cor}
              eventTextColor="#ffffff"
            />
          </div>
        </Card>
      ))}

      {/* New Agenda Modal */}
      <Modal isOpen={newAgendaModal} onClose={() => setNewAgendaModal(false)} title="Nova Agenda">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome da agenda</label>
            <Input value={newAgendaNome} onChange={(e) => setNewAgendaNome(e.target.value)} placeholder="Ex: Dra. Ana" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Cor</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button key={c} onClick={() => setNewAgendaCor(c)}
                  className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ backgroundColor: c, borderColor: newAgendaCor === c ? '#2D2020' : 'transparent' }}
                />
              ))}
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setNewAgendaModal(false)}>Cancelar</Button>
            <Button onClick={handleCreateAgenda}>Criar Agenda</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Agenda Modal */}
      <Modal isOpen={!!editAgendaModal} onClose={() => setEditAgendaModal(null)} title="Editar Agenda" className="max-w-2xl">
        {editAgendaModal && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1">Nome</label>
              <Input value={editAgendaModal.nome} onChange={(e) => setEditAgendaModal({ ...editAgendaModal, nome: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Cor</label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button key={c} onClick={() => setEditAgendaModal({ ...editAgendaModal, cor: c })}
                    className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                    style={{ backgroundColor: c, borderColor: editAgendaModal.cor === c ? '#2D2020' : 'transparent' }}
                  />
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-medium text-text-main mb-3">Horários de Funcionamento</h3>
              <div className="space-y-3">
                {DIAS.map(({ key, label }) => {
                  const h = editHours[key] || { dia: key, aberto: false, hora_inicio: '08:00', hora_fim: '18:00' };
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className="w-24 text-sm">{label}</span>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={h.aberto} onChange={(e) => setEditHours({ ...editHours, [key]: { ...h, aberto: e.target.checked } })} className="accent-primary" />
                        <span className="text-sm">Aberto</span>
                      </label>
                      <Input type="time" value={h.hora_inicio || ''} disabled={!h.aberto} className="w-28" onChange={(e) => setEditHours({ ...editHours, [key]: { ...h, hora_inicio: e.target.value } })} />
                      <span className="text-sm text-text-muted">até</span>
                      <Input type="time" value={h.hora_fim || ''} disabled={!h.aberto} className="w-28" onChange={(e) => setEditHours({ ...editHours, [key]: { ...h, hora_fim: e.target.value } })} />
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="pt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditAgendaModal(null)}>Cancelar</Button>
              <Button onClick={handleSaveEditAgenda}>Salvar</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal isOpen={!!deleteAgendaModal} onClose={() => setDeleteAgendaModal(null)} title="Excluir Agenda">
        <p className="text-text-main mb-6">Tem certeza que deseja remover a agenda <strong>{deleteAgendaModal?.nome}</strong>? Os agendamentos existentes serão mantidos.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteAgendaModal(null)}>Cancelar</Button>
          <Button variant="danger" onClick={handleDeleteAgenda}>Excluir</Button>
        </div>
      </Modal>

      {/* New Appointment Modal */}
      <Modal isOpen={!!newAppModal} onClose={() => setNewAppModal(null)} title="Novo Agendamento">
        {newAppModal && (
          <div className="space-y-4">
            <div className="relative">
              <label className="block text-sm font-medium mb-1">Lead ou Cliente</label>
              <Input
                placeholder="Buscar por nome ou WhatsApp..."
                value={newAppForm.leadSearch}
                onChange={(e) => {
                  setNewAppForm({ ...newAppForm, leadSearch: e.target.value, nome: e.target.value });
                  searchLeads(e.target.value);
                }}
              />
              {leadSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-card border border-border-card rounded-input shadow-dropdown">
                  {leadSuggestions.map((s) => (
                    <button key={s.id} className="w-full text-left px-3 py-2 hover:bg-primary-light text-sm" onClick={() => {
                      setNewAppForm({ ...newAppForm, leadSearch: s.nome || s.whatsapp, nome: s.nome || '', leadId: s.tipo === 'lead' ? s.id : '', clienteId: s.tipo === 'cliente' ? s.id : '' });
                      setLeadSuggestions([]);
                    }}>
                      <span className="font-medium">{s.nome || 'Sem nome'}</span> — {s.whatsapp}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Procedimento</label>
              <Input value={newAppForm.procedimento} onChange={(e) => setNewAppForm({ ...newAppForm, procedimento: e.target.value })} placeholder="Ex: Limpeza de pele" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Data</label>
                <Input type="date" value={newAppModal.date} onChange={(e) => setNewAppModal({ ...newAppModal, date: e.target.value })} />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Hora</label>
                <Input type="time" value={newAppModal.time} onChange={(e) => setNewAppModal({ ...newAppModal, time: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Observações</label>
              <textarea className="w-full rounded-input border border-border-card bg-card px-3 py-2 text-sm text-text-main placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary h-20 resize-none"
                value={newAppForm.obs} onChange={(e) => setNewAppForm({ ...newAppForm, obs: e.target.value })} placeholder="Observações opcionais..." />
            </div>
            <div className="pt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setNewAppModal(null)}>Cancelar</Button>
              <Button onClick={handleCreateAppointment}>Agendar</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* View Appointment Modal */}
      <Modal isOpen={!!viewAppModal} onClose={() => setViewAppModal(null)} title="Agendamento">
        {viewAppModal && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-text-muted">Nome</span><p className="font-medium">{viewAppModal.nome_lead || '—'}</p></div>
              <div><span className="text-text-muted">Procedimento</span><p className="font-medium">{viewAppModal.procedimento_nome || '—'}</p></div>
              <div><span className="text-text-muted">Início</span><p className="font-medium">{viewAppModal.data_hora_inicio ? format(new Date(viewAppModal.data_hora_inicio), 'dd/MM/yyyy HH:mm') : '—'}</p></div>
              <div><span className="text-text-muted">Fim</span><p className="font-medium">{viewAppModal.data_hora_fim ? format(new Date(viewAppModal.data_hora_fim), 'HH:mm') : '—'}</p></div>
            </div>
            {viewAppModal.observacoes && <p className="text-sm text-text-muted border-t border-border-card pt-3">{viewAppModal.observacoes}</p>}
            <div className="flex items-center gap-2 pt-2 border-t border-border-card">
              <span className="text-sm text-text-muted">Status:</span>
              <select className="flex-1 h-9 rounded-input border border-border-card bg-card px-2 text-sm text-text-main focus:outline-none focus:ring-1 focus:ring-primary"
                value={viewAppModal.status}
                onChange={(e) => handleUpdateStatus(viewAppModal.id, viewAppModal.agenda_id, e.target.value)}
              >
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setRescheduleModal({ id: viewAppModal.id, date: format(new Date(viewAppModal.data_hora_inicio), 'yyyy-MM-dd'), time: format(new Date(viewAppModal.data_hora_inicio), 'HH:mm') })}>
                Reagendar
              </Button>
              <Button variant="danger" className="flex-1" onClick={() => setCancelConfirm(viewAppModal.id)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reschedule Modal */}
      <Modal isOpen={!!rescheduleModal} onClose={() => setRescheduleModal(null)} title="Reagendar">
        {rescheduleModal && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Nova data</label>
                <Input type="date" value={rescheduleModal.date} onChange={(e) => setRescheduleModal({ ...rescheduleModal, date: e.target.value })} />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Novo horário</label>
                <Input type="time" value={rescheduleModal.time} onChange={(e) => setRescheduleModal({ ...rescheduleModal, time: e.target.value })} />
              </div>
            </div>
            <div className="pt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setRescheduleModal(null)}>Cancelar</Button>
              <Button onClick={handleReschedule}>Confirmar Reagendamento</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Confirm Modal */}
      <Modal isOpen={!!cancelConfirm} onClose={() => setCancelConfirm(null)} title="Cancelar Agendamento">
        <p className="text-text-main mb-6">Tem certeza que deseja cancelar este agendamento?</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setCancelConfirm(null)}>Voltar</Button>
          <Button variant="danger" onClick={() => handleCancelAppointment(cancelConfirm!, viewAppModal?.agenda_id)}>Confirmar Cancelamento</Button>
        </div>
      </Modal>
    </div>
  );
}
