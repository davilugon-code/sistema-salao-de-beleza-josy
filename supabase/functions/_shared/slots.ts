import { createResponse } from './errors.ts';
import { calcularDuracaoProcedimento } from './duracao.ts';

const DIAS_SEMANA = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
const DIAS_SEMANA_PT = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

function getDiaSemana(dateStr: string): { chave: string; nomePt: string } | null {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  // Usa Date.UTC para evitar qualquer conversão de fuso
  const d = new Date(Date.UTC(year, month, day));
  if (isNaN(d.getTime())) return null;

  const idx = d.getUTCDay();
  return { chave: DIAS_SEMANA[idx], nomePt: DIAS_SEMANA_PT[idx] };
}

export async function calcularSlotsDisponiveis(
  supabase: any,
  agenda_id: string,
  dataStr: string,
  ignorar_agendamento_id?: string,
  procedimento_nome?: string
) {
  const diaInfo = getDiaSemana(dataStr);
  if (!diaInfo) {
    return { errorResponse: createResponse(false, 'FORMATO_INVALIDO', 'Formato de data inválido.', 422) };
  }

  const { chave: diaSemana, nomePt: diaSemanaLabel } = diaInfo;

  // Verifica se a data não é passada (usando horário de Brasília)
  const now = new Date();
  const spTimeStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  }).format(now);
  const [spDate, spTime] = spTimeStr.split(', ');

  if (dataStr < spDate) {
    return { errorResponse: createResponse(false, 'DATA_PASSADA', 'Não é possível agendar para uma data que já passou.', 200) };
  }

  // Busca horários de funcionamento da agenda para esse dia
  const { data: agendaHoursFromDb, error: ahError } = await supabase
    .from('agenda_hours')
    .select('aberto, hora_inicio, hora_fim')
    .eq('agenda_id', agenda_id)
    .eq('dia', diaSemana)
    .maybeSingle();

  let agendaHours = agendaHoursFromDb;

  // Fallback: Se a agenda não tem registros de horários no banco,
  // ou se houver erro ao buscar, assumimos o padrão de trabalho da Josy:
  // Terça a Sábado das 08:30 às 18:00. Segunda e Domingo fechado.
  if (ahError || !agendaHours) {
    const diasTrabalho = ['terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    const estaAberto = diasTrabalho.includes(diaSemana);
    
    agendaHours = {
      aberto: estaAberto,
      hora_inicio: estaAberto ? '08:30' : null,
      hora_fim: estaAberto ? '18:00' : null
    };
  }

  if (!agendaHours.aberto || !agendaHours.hora_inicio || !agendaHours.hora_fim) {
    return {
      errorResponse: createResponse(
        false,
        'AGENDA_FECHADA',
        `A agenda não tem atendimentos na ${diaSemanaLabel} (${dataStr}).`,
        200,
        { dia_semana: diaSemanaLabel }
      )
    };
  }

  // Duração real do procedimento em minutos (padrão 1h40 = 100min)
  const duracaoMin = calcularDuracaoProcedimento(procedimento_nome);

  // Gera slots de 1h40m (100min) com base no horário de início e fim
  const [startH, startM] = agendaHours.hora_inicio.split(':').map(Number);
  const [endH, endM] = agendaHours.hora_fim.split(':').map(Number);
  const startTotal = startH * 60 + (startM || 0);
  const endTotal = endH * 60 + (endM || 0);

  const slots: string[] = [];
  let cursor = startTotal;
  const stepMin = 30; // Gera slots a cada 30 minutos para flexibilidade
  while (cursor + duracaoMin <= endTotal) {
    const h = Math.floor(cursor / 60).toString().padStart(2, '0');
    const m = (cursor % 60).toString().padStart(2, '0');
    slots.push(`${h}:${m}`);
    cursor += stepMin;
  }

  // Remove slots passados se for hoje
  if (dataStr === spDate) {
    const [curH, curM] = spTime.split(':').map(Number);
    const curTotal = curH * 60 + curM;
    for (let i = slots.length - 1; i >= 0; i--) {
      const [sh, sm] = slots[i].split(':').map(Number);
      if (sh * 60 + sm <= curTotal) slots.splice(i, 1);
    }
  }

  // Busca agendamentos existentes no dia (sem offset de timezone)
  const dateStart = `${dataStr}T00:00:00`;
  const dateEnd = `${dataStr}T23:59:59`;

  let query = supabase
    .from('agendamentos_estetica')
    .select('id, data_hora_inicio, data_hora_fim, procedimento_nome')
    .eq('agenda_id', agenda_id)
    .neq('status', 'cancelado')
    .gte('data_hora_inicio', dateStart)
    .lte('data_hora_inicio', dateEnd);

  if (ignorar_agendamento_id) {
    query = query.neq('id', ignorar_agendamento_id);
  }

  const { data: appointments, error: appError } = await query;
  if (appError) {
    return { errorResponse: createResponse(false, 'ERRO_INTERNO', 'Erro ao buscar agendamentos.', 500) };
  }

  // Filtra slots ocupados
  const availableSlots = slots.filter(slot => {
    const [sh, sm] = slot.split(':').map(Number);
    const slotStartMin = sh * 60 + sm;
    const slotEndMin = slotStartMin + duracaoMin;

    return !appointments.some((app: any) => {
      // Extrai hora/minuto do início do agendamento existente
      const appStartStr: string = (app.data_hora_inicio || '').replace(/([+-]\d{2}:\d{2}|Z)$/, '');
      const appTimePart = appStartStr.split('T')[1] || '';
      const [appH, appM] = appTimePart.split(':').map(Number);
      const appStartMin = (appH || 0) * 60 + (appM || 0);

      let appDurMin = calcularDuracaoProcedimento(app.procedimento_nome);
      if (app.data_hora_fim) {
        const appEndStr: string = (app.data_hora_fim || '').replace(/([+-]\d{2}:\d{2}|Z)$/, '');
        const appEndTimePart = appEndStr.split('T')[1] || '';
        const [endH2, endM2] = appEndTimePart.split(':').map(Number);
        const appEndMin = (endH2 || 0) * 60 + (endM2 || 0);
        if (appEndMin > appStartMin) appDurMin = appEndMin - appStartMin;
      }

      const appEndMin = appStartMin + appDurMin;
      // Conflito: intervalos se sobrepõem
      return slotStartMin < appEndMin && slotEndMin > appStartMin;
    });
  });

  return { slots: availableSlots, diaSemana: diaSemanaLabel, duracaoMinutos: duracaoMin };
}
