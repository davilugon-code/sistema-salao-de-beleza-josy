import { useState, useEffect, useMemo } from 'react';
import { format, eachDayOfInterval, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Calendar, Users, UserCheck, Bot, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { DateFilter, DateRange, getPresetRange } from '../components/ui/DateFilter';

const PRIMARY = '#C47E7E';
const SUCCESS = '#7A9E87';
const WARNING = '#E8A87C';
const PRIMARY_LIGHT = '#FAF0EE';

const STATUS_LABELS: Record<string, string> = {
  agendado: 'Agendado', confirmado: 'Confirmado', compareceu: 'Compareceu',
  faltou: 'Faltou', cancelado: 'Cancelado', follow_up: 'Follow Up',
};

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const ORDINALS = ['1º', '2º', '3º', '4º', '5º', '6º', '7º', '8º'];

interface ClinicHourRow {
  dia: string;
  aberto: boolean;
  hora_inicio: string | null;
  hora_fim: string | null;
}

export function Dashboard() {
  const [range, setRange] = useState<DateRange>(() => {
    const { from, to } = getPresetRange('hoje');
    return { from, to, preset: 'hoje' };
  });

  const [metrics, setMetrics] = useState({ agendamentos: 0, comparecimentos: 0, leads: 0, clientes: 0 });
  const [leadsData, setLeadsData] = useState<any[]>([]);
  const [agendamentosData, setAgendamentosData] = useState<any[]>([]);
  const [clinicHours, setClinicHours] = useState<ClinicHourRow[]>([]);
  const [proximosAgendamentos, setProximosAgendamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fromISO = range.from.toISOString();
  const toISO = range.to.toISOString();

  useEffect(() => {
    fetchAll();
  }, [fromISO, toISO]);

  useEffect(() => {
    fetchClinicHours();
  }, []);

  const fetchClinicHours = async () => {
    const { data } = await supabase.from('clinic_hours').select('*');
    if (data) setClinicHours(data);
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [
        { count: agCount },
        { count: compCount },
        { count: leadsCount },
        { count: clientesCount },
        { data: leadsRaw },
        { data: agendRaw },
        { data: proxAgend },
      ] = await Promise.all([
        supabase.from('agendamentos_estetica').select('*', { count: 'exact', head: true })
          .gte('data_hora_inicio', fromISO).lte('data_hora_inicio', toISO),
        supabase.from('agendamentos_estetica').select('*', { count: 'exact', head: true })
          .eq('status', 'compareceu').gte('data_hora_inicio', fromISO).lte('data_hora_inicio', toISO),
        supabase.from('leads_estetica').select('*', { count: 'exact', head: true })
          .gte('inicio_atendimento', fromISO).lte('inicio_atendimento', toISO),
        supabase.from('clientes_estetica').select('*', { count: 'exact', head: true })
          .gte('created_at', fromISO).lte('created_at', toISO),
        supabase.from('leads_estetica').select('id, inicio_atendimento')
          .gte('inicio_atendimento', fromISO).lte('inicio_atendimento', toISO),
        supabase.from('agendamentos_estetica').select('id, procedimento_nome, data_hora_inicio, status, nome_lead, agendas(nome)')
          .gte('data_hora_inicio', fromISO).lte('data_hora_inicio', toISO).neq('status', 'cancelado'),
        supabase.from('agendamentos_estetica')
          .select('id, nome_lead, procedimento_nome, data_hora_inicio, status, agendas(nome)')
          .gte('data_hora_inicio', new Date().toISOString())
          .neq('status', 'cancelado')
          .order('data_hora_inicio', { ascending: true })
          .limit(5),
      ]);

      setMetrics({ agendamentos: agCount || 0, comparecimentos: compCount || 0, leads: leadsCount || 0, clientes: clientesCount || 0 });
      setLeadsData(leadsRaw || []);
      setAgendamentosData(agendRaw || []);
      setProximosAgendamentos(proxAgend || []);
    } finally {
      setLoading(false);
    }
  };

  // Chart 1: Leads por dia
  const leadsByDay = useMemo(() => {
    const days = eachDayOfInterval({ start: range.from, end: range.to });
    return days.map((d) => {
      const dateStr = format(d, 'yyyy-MM-dd');
      const count = leadsData.filter((l) => l.inicio_atendimento?.startsWith(dateStr)).length;
      return { date: format(d, 'dd/MM'), count };
    });
  }, [leadsData, range]);

  // Chart 2: Leads por dia da semana
  const leadsByWeekday = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    leadsData.forEach((l) => {
      if (l.inicio_atendimento) {
        const d = getDay(new Date(l.inicio_atendimento));
        counts[d]++;
      }
    });
    return WEEK_DAYS.map((day, i) => ({ day, count: counts[i] }));
  }, [leadsData]);

  // Chart 3: Dentro/fora do horário
  const { dentroHorario, foraHorario } = useMemo(() => {
    let dentro = 0, fora = 0;
    const DIA_MAP: Record<string, number> = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };
    leadsData.forEach((l) => {
      if (!l.inicio_atendimento) { fora++; return; }
      const d = new Date(l.inicio_atendimento);
      const dow = d.getDay();
      const h = d.getHours() + d.getMinutes() / 60;
      const diasNomes = Object.keys(DIA_MAP);
      const diaNome = diasNomes.find((k) => DIA_MAP[k] === dow);
      const clinicDay = clinicHours.find((c) => c.dia === diaNome);
      if (!clinicDay || !clinicDay.aberto || !clinicDay.hora_inicio || !clinicDay.hora_fim) { fora++; return; }
      const start = parseInt(clinicDay.hora_inicio) + parseInt(clinicDay.hora_inicio.split(':')[1]) / 60;
      const end = parseInt(clinicDay.hora_fim) + parseInt(clinicDay.hora_fim.split(':')[1]) / 60;
      h >= start && h < end ? dentro++ : fora++;
    });
    return { dentroHorario: dentro, foraHorario: fora };
  }, [leadsData, clinicHours]);

  const pieData = [
    { name: `Dentro (${dentroHorario})`, value: dentroHorario },
    { name: `Fora (${foraHorario})`, value: foraHorario },
  ];

  // Chart 4: Procedimentos
  const procedimentos = useMemo(() => {
    const map: Record<string, number> = {};
    agendamentosData.forEach((a) => {
      if (a.procedimento_nome) map[a.procedimento_nome] = (map[a.procedimento_nome] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }));
  }, [agendamentosData]);

  const maxProcedimento = procedimentos[0]?.count || 1;

  // Horário comercial formatado
  const horarioFormatado = useMemo(() => {
    const DIA_LABELS: Record<string, string> = {
      domingo: 'Dom', segunda: 'Seg', terca: 'Ter', quarta: 'Qua',
      quinta: 'Qui', sexta: 'Sex', sabado: 'Sáb'
    };
    const openDays = clinicHours.filter((c) => c.aberto && c.hora_inicio && c.hora_fim);
    if (!openDays.length) return 'Sem horários cadastrados';
    const grouped: string[] = [];
    openDays.forEach((d) => {
      grouped.push(`${DIA_LABELS[d.dia] || d.dia} ${d.hora_inicio?.slice(0,5)}–${d.hora_fim?.slice(0,5)}`);
    });
    return grouped.join(', ');
  }, [clinicHours]);

  const MetricCard = ({ icon: Icon, value, label, color = 'text-primary' }: any) => (
    <Card className="flex-1 min-w-[140px]">
      <CardContent className="p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center shrink-0">
          <Icon size={20} className="text-primary" />
        </div>
        <div>
          <p className={`font-heading text-4xl font-semibold ${color}`}>{loading ? '—' : value}</p>
          <p className="text-xs text-text-muted mt-0.5">{label}</p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <DateFilter value={range} onChange={setRange} />

      {/* Metrics */}
      <div className="flex gap-4 flex-wrap">
        <MetricCard icon={Calendar} value={metrics.agendamentos} label="Agendamentos do período" />
        <MetricCard icon={UserCheck} value={metrics.comparecimentos} label="Comparecimentos" />
        <MetricCard icon={Users} value={metrics.leads} label="Novos leads" />
        <MetricCard icon={UserCheck} value={metrics.clientes} label="Novos clientes" color="text-success" />
      </div>

      {/* Chart 1 - Line */}
      <Card>
        <CardHeader>
          <CardTitle>Atendimentos no WhatsApp</CardTitle>
          <p className="text-sm text-text-muted">Total de leads atendidos pelo agente de IA por dia no período selecionado</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={leadsByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-card)" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="count" stroke={PRIMARY} strokeWidth={2} dot={{ fill: PRIMARY, r: 4 }} activeDot={{ r: 6 }} name="Leads" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Charts 2 & 3 */}
      <div className="flex gap-4 flex-wrap">
        <Card className="flex-[3] min-w-[280px]">
          <CardHeader>
            <CardTitle>Dias com mais movimento</CardTitle>
            <p className="text-sm text-text-muted">Veja em quais dias da semana seu salão recebe mais contatos</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={leadsByWeekday}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-card)" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '8px' }} />
                <Bar dataKey="count" fill={PRIMARY} fillOpacity={0.75} radius={[4, 4, 0, 0]} name="Leads" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="flex-[2] min-w-[240px]">
          <CardHeader>
            <CardTitle>Horário dos contatos</CardTitle>
            <p className="text-sm text-text-muted">Leads dentro e fora do horário de funcionamento</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>
                  <Cell fill={SUCCESS} />
                  <Cell fill={WARNING} />
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
            {horarioFormatado && (
              <p className="text-xs text-text-muted mt-2 border-t border-border-card pt-2">
                ⚙️ Horário considerado: {horarioFormatado}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts 4 & Ranking */}
      <div className="flex gap-4 flex-wrap">
        <Card className="flex-[3] min-w-[280px]">
          <CardHeader>
            <CardTitle>Procedimentos mais procurados</CardTitle>
            <p className="text-sm text-text-muted">Os serviços mais solicitados pelos seus leads no período</p>
          </CardHeader>
          <CardContent>
            {procedimentos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-text-muted gap-2">
                <Calendar size={32} className="opacity-30" />
                <p className="text-sm">Nenhum procedimento no período</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={procedimentos} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-card)" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '8px' }} />
                  <Bar dataKey="count" fill={PRIMARY} radius={[0, 4, 4, 0]} name="Quantidade" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="flex-[2] min-w-[240px]">
          <CardHeader>
            <CardTitle>Procedimentos em destaque</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {procedimentos.length === 0 ? (
              <p className="text-sm text-text-muted">Nenhum dado disponível.</p>
            ) : (
              procedimentos.map((p, i) => (
                <div key={p.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-text-main">{ORDINALS[i]} {p.name}</span>
                    <span className="text-text-muted">{p.count}</span>
                  </div>
                  <div className="h-1.5 bg-primary-light rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(p.count / maxProcedimento) * 100}%`, backgroundColor: PRIMARY, opacity: 1 - i * 0.1 }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Warning */}
      {foraHorario > 0 && (
        <div className="flex items-start gap-4 p-5 bg-primary-light border-l-4 border-primary rounded-card">
          <Bot size={24} className="text-primary shrink-0 mt-0.5" />
          <p className="text-text-main text-sm leading-relaxed">
            <strong className="font-medium">{foraHorario} {foraHorario === 1 ? 'pessoa tentou' : 'pessoas tentaram'} falar com seu salão fora do horário de atendimento.</strong>{' '}
            Sem o agente de IA no WhatsApp, esses contatos teriam ido embora sem resposta — e provavelmente procurado a concorrência.
          </p>
        </div>
      )}

      {/* Next appointments */}
      <Card>
        <CardHeader>
          <CardTitle>Próximos Agendamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {proximosAgendamentos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-text-muted gap-2">
              <Clock size={32} className="opacity-30" />
              <p className="text-sm">Nenhum agendamento futuro encontrado.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {proximosAgendamentos.map((a) => (
                <div key={a.id} className="flex items-center gap-4 p-3 rounded-md border border-border-card hover:bg-base/50 transition-colors">
                  <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-main text-sm truncate">{a.nome_lead || 'Cliente'}</p>
                    <p className="text-xs text-text-muted truncate">{a.procedimento_nome}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm text-text-main">{format(new Date(a.data_hora_inicio), 'dd/MM HH:mm')}</p>
                    <p className="text-xs text-text-muted">{(a.agendas as any)?.nome}</p>
                  </div>
                  <Badge variant={a.status}>{STATUS_LABELS[a.status] || a.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
