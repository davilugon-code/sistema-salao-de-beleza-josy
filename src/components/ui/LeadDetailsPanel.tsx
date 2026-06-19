import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Phone, User, Calendar, Clock, DollarSign, FileText, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from './Badge';
import { Button } from './Button';

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
}

interface LeadDetailsPanelProps {
  lead: Lead;
  isClient?: boolean;
  clientData?: {
    data_primeira_visita: string | null;
    procedimentos_realizados?: number;
  };
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-text-muted uppercase tracking-wider">{label}</span>
      <span className="text-sm text-text-main">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="font-heading text-base font-medium text-text-main border-b border-border-card pb-2">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

const formatBR = (d: string | null) => {
  if (!d) return null;
  try {
    return format(new Date(d), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return d;
  }
};

const formatRelative = (d: string | null) => {
  if (!d) return null;
  try {
    return formatDistanceToNow(new Date(d), { addSuffix: true, locale: ptBR });
  } catch {
    return d;
  }
};

const formatMoney = (v: number | null) => {
  if (v === null || v === undefined) return null;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
};

const STATUS_LABELS: Record<string, string> = {
  iniciou_atendimento: 'Iniciou o Atendimento',
  conversando: 'Conversando',
  agendado: 'Agendado',
  compareceu: 'Compareceu',
  cancelou_agendamento: 'Cancelou o Agendamento',
  follow_up: 'Follow Up',
  abandonou_conversa: 'Abandonou a Conversa',
};

export function LeadDetailsPanel({ lead, isClient, clientData }: LeadDetailsPanelProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3 pb-4 border-b border-border-card">
        <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center text-primary shrink-0">
          <User size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-heading text-xl font-medium text-text-main truncate">
            {lead.nome_lead || 'Lead sem nome'}
          </h2>
          <div className="flex items-center gap-1.5 text-text-muted text-sm mt-0.5">
            <Phone size={14} />
            {lead.whatsapp_lead}
          </div>
          <div className="mt-2">
            <Badge variant={lead.status}>{STATUS_LABELS[lead.status] || lead.status}</Badge>
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <Section title="Informações do Lead">
        <InfoRow label="Procedimento de interesse" value={lead.procedimento_interesse} />
        <InfoRow label="Motivo do contato" value={lead.motivo_contato} />
        <InfoRow label="Início do atendimento" value={formatBR(lead.inicio_atendimento)} />
        <InfoRow label="Última mensagem" value={formatRelative(lead.ultima_mensagem)} />
        {lead.observacoes && <InfoRow label="Observações" value={lead.observacoes} />}
      </Section>

      {/* Resumo da Conversa */}
      {lead.resumo_conversa && (
        <Section title="Resumo da Conversa">
          <p className="text-sm text-text-main leading-relaxed bg-base p-3 rounded-md border border-border-card">
            {lead.resumo_conversa}
          </p>
        </Section>
      )}

      {/* Follow Ups */}
      {(lead.follow_up_1 || lead.follow_up_2 || lead.follow_up_3) && (
        <Section title="Follow Ups">
          <InfoRow label="Follow Up 1" value={formatBR(lead.follow_up_1)} />
          <InfoRow label="Follow Up 2" value={formatBR(lead.follow_up_2)} />
          <InfoRow label="Follow Up 3" value={formatBR(lead.follow_up_3)} />
        </Section>
      )}

      {/* Dados Pessoais */}
      {(lead.data_nascimento || lead.genero || lead.valor_pago !== null) && (
        <Section title="Dados Pessoais">
          <InfoRow label="Data de nascimento" value={lead.data_nascimento ? format(new Date(lead.data_nascimento + 'T12:00:00'), 'dd/MM/yyyy') : null} />
          <InfoRow label="Gênero" value={lead.genero} />
          <InfoRow label="Valor pago" value={formatMoney(lead.valor_pago)} />
        </Section>
      )}

      {/* Agendamento */}
      {(lead.data_agendamento || lead.id_agendamento) && (
        <Section title="Agendamento">
          <InfoRow label="Data agendada" value={formatBR(lead.data_agendamento)} />
          {lead.id_agendamento && (
            <Button
              variant="secondary"
              className="w-full flex items-center justify-center gap-2"
              onClick={() => navigate('/agenda')}
            >
              <Calendar size={16} />
              Ver agendamento
              <ChevronRight size={16} />
            </Button>
          )}
        </Section>
      )}

      {/* Client specific */}
      {isClient && clientData && (
        <Section title="Dados do Cliente">
          <InfoRow label="Cliente desde" value={formatBR(clientData.data_primeira_visita)} />
          <InfoRow label="Procedimentos realizados" value={clientData.procedimentos_realizados?.toString()} />
          <Button
            variant="secondary"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => navigate('/crm')}
          >
            Ver no CRM
            <ChevronRight size={16} />
          </Button>
        </Section>
      )}
    </div>
  );
}
