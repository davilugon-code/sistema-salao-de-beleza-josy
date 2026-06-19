import { createResponse } from './errors.ts';

function getDiaSemana(dateStr: string) {
  // Convert YYYY-MM-DD to a date
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  
  // To get the day of the week correctly
  const d = new Date(Date.UTC(year, month, day));
  if (isNaN(d.getTime())) return null;

  const dias = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  return dias[d.getUTCDay()];
}

export async function calcularSlotsDisponiveis(
  supabase: any,
  agenda_id: string,
  dataStr: string,
  ignorar_agendamento_id?: string
) {
  const diaSemana = getDiaSemana(dataStr);
  if (!diaSemana) {
    return { errorResponse: createResponse(false, 'FORMATO_INVALIDO', 'Formato de data ou hora inválido.', 422) };
  }

  // Check if date is in the past
  const now = new Date();
  const spTimeStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now);
  const [spDate, spTime] = spTimeStr.split(', ');
  
  if (dataStr < spDate) {
    return { errorResponse: createResponse(false, 'DATA_PASSADA', 'Não é possível agendar para uma data que já passou.', 200) };
  }

  const { data: agendaHours, error: ahError } = await supabase
    .from('agenda_hours')
    .select('aberto, hora_inicio, hora_fim')
    .eq('agenda_id', agenda_id)
    .eq('dia', diaSemana)
    .single();

  if (ahError || !agendaHours || !agendaHours.aberto) {
    return { errorResponse: createResponse(false, 'AGENDA_FECHADA', 'A agenda não tem atendimentos no dia solicitado.', 200) };
  }

  // Generate slots
  let currentHour = parseInt(agendaHours.hora_inicio.split(':')[0], 10);
  const endHour = parseInt(agendaHours.hora_fim.split(':')[0], 10);
  const slots: string[] = [];
  while (currentHour + 1 <= endHour) {
    slots.push(`${currentHour.toString().padStart(2, '0')}:00`);
    currentHour++;
  }

  // Filter slots if it's today
  if (dataStr === spDate) {
    const currentH = parseInt(spTime.split(':')[0], 10);
    const currentM = parseInt(spTime.split(':')[1], 10);
    for (let i = slots.length - 1; i >= 0; i--) {
      const slotH = parseInt(slots[i].split(':')[0], 10);
      if (slotH < currentH || (slotH === currentH && currentM > 0)) {
         slots.splice(i, 1);
      }
    }
  }

  const dateStart = `${dataStr}T00:00:00-03:00`;
  const dateEnd = `${dataStr}T23:59:59-03:00`;
  
  let query = supabase
    .from('agendamentos_estetica')
    .select('id, data_hora_inicio, data_hora_fim')
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

  // Filter out occupied slots
  const availableSlots = slots.filter(slot => {
    const slotStart = `${dataStr}T${slot}:00-03:00`;
    const slotStartTime = new Date(slotStart).getTime();
    const slotEndTime = slotStartTime + 60 * 60 * 1000;

    const isOccupied = appointments.some((app: any) => {
      const appStart = new Date(app.data_hora_inicio).getTime();
      const appEnd = new Date(app.data_hora_fim).getTime();
      return slotStartTime < appEnd && slotEndTime > appStart;
    });

    return !isOccupied;
  });

  return { slots: availableSlots };
}
