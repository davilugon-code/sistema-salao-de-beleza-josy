import { handleCors, createResponse, handleError } from '../_shared/errors.ts';
import { authenticateRequest, validateAgenda } from '../_shared/auth.ts';
import { calcularSlotsDisponiveis } from '../_shared/slots.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'GET') {
    return createResponse(false, 'METODO_NAO_PERMITIDO', 'Método HTTP não permitido.', 405);
  }

  try {
    const authResult = await authenticateRequest(req);
    if (authResult.error) return authResult.error;
    const { supabase } = authResult;

    const url = new URL(req.url);
    const agenda_id = url.searchParams.get('agenda_id');
    const data = url.searchParams.get('data');
    const hora = url.searchParams.get('hora');

    if (!agenda_id) return createResponse(false, 'CAMPO_OBRIGATORIO_AUSENTE', 'É necessário informar agenda_id.', 422, { campo: 'agenda_id' });
    if (!data) return createResponse(false, 'CAMPO_OBRIGATORIO_AUSENTE', 'É necessário informar data.', 422, { campo: 'data' });

    const agendaResult = await validateAgenda(supabase, agenda_id);
    if (agendaResult.error) return agendaResult.error;

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data)) {
      return createResponse(false, 'FORMATO_INVALIDO', 'Formato de data ou hora inválido.', 422);
    }

    if (hora) {
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(hora)) {
        return createResponse(false, 'FORMATO_INVALIDO', 'Formato de data ou hora inválido.', 422);
      }
    }

    const slotsResult = await calcularSlotsDisponiveis(supabase, agenda_id, data);
    if (slotsResult.errorResponse) return slotsResult.errorResponse;

    const slots = slotsResult.slots ?? [];
    const diaSemana = slotsResult.diaSemana ?? '';
    const duracaoMinutos = slotsResult.duracaoMinutos ?? 100;

    const parts = data.split('-');
    const dataBr = `${parts[2]}/${parts[1]}/${parts[0]}`;

    if (hora) {
      if (slots.includes(hora)) {
        return createResponse(true, 'HORARIO_DISPONIVEL', 'O horário solicitado está disponível.', 200, {
          horario: `${data}T${hora}:00`,
          dia_semana: diaSemana,
        });
      } else {
        const validFutureSlots = slots.filter((s: string) => s > hora);
        const sugestoes = validFutureSlots.slice(0, 3).map((s: string) => `${data}T${s}:00`);
        if (sugestoes.length === 0) {
          const fallback = slots.slice(0, 3).map((s: string) => `${data}T${s}:00`);
          return createResponse(false, 'HORARIO_OCUPADO', 'O horário solicitado não está disponível. Aqui estão os próximos horários livres:', 200, {
            sugestoes: fallback,
            dia_semana: diaSemana,
          });
        }
        return createResponse(false, 'HORARIO_OCUPADO', 'O horário solicitado não está disponível. Aqui estão os próximos horários livres:', 200, {
          sugestoes,
          dia_semana: diaSemana,
        });
      }
    } else {
      if (slots.length > 0) {
        return createResponse(true, 'HORARIOS_DISPONIVEIS', `Horários disponíveis para ${diaSemana}, dia ${dataBr}.`, 200, {
          data,
          dia_semana: diaSemana,
          duracao_minutos: duracaoMinutos,
          slots_disponiveis: slots,
        });
      } else {
        return createResponse(true, 'HORARIOS_DISPONIVEIS', `Não há horários disponíveis para ${diaSemana}, dia ${dataBr}.`, 200, {
          data,
          dia_semana: diaSemana,
          slots_disponiveis: [],
        });
      }
    }

  } catch (error) {
    return handleError(error);
  }
});
