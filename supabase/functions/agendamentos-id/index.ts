import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors, createResponse, handleError } from '../_shared/errors.ts';
import { authenticateRequest, validateAgenda } from '../_shared/auth.ts';
import { calcularSlotsDisponiveis } from '../_shared/slots.ts';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'PUT' && req.method !== 'DELETE') {
    return createResponse(false, 'METODO_NAO_PERMITIDO', 'Método HTTP não permitido.', 405);
  }

  try {
    const authResult = await authenticateRequest(req);
    if (authResult.error) return authResult.error;
    const { supabase } = authResult;

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const agendamentoId = pathParts[pathParts.length - 1];
    
    if (!agendamentoId || agendamentoId === 'agendamentos-id') {
      return createResponse(false, 'AGENDAMENTO_NAO_ENCONTRADO', 'ID do agendamento não informado.', 404);
    }

    const body = await req.json();
    const { agenda_id, data, hora } = body;

    if (!agenda_id) {
       return createResponse(false, 'CAMPO_OBRIGATORIO_AUSENTE', 'É necessário informar agenda_id.', 422, { campo: 'agenda_id' });
    }

    const agendaResult = await validateAgenda(supabase, agenda_id);
    if (agendaResult.error) return agendaResult.error;

    const { data: agendamento, error: agendamentoError } = await supabase
      .from('agendamentos_estetica')
      .select('*')
      .eq('id', agendamentoId)
      .single();

    if (agendamentoError || !agendamento) {
      return createResponse(false, 'AGENDAMENTO_NAO_ENCONTRADO', 'ID do agendamento não existe.', 404);
    }

    if (agendamento.agenda_id !== agenda_id) {
      return createResponse(false, 'ACESSO_NEGADO', 'Agendamento não pertence à agenda.', 403);
    }

    if (req.method === 'DELETE') {
      if (agendamento.status === 'cancelado') {
        return createResponse(false, 'AGENDAMENTO_JA_CANCELADO', 'Este agendamento já foi cancelado anteriormente.', 422);
      }
      const { data: updated, error: updError } = await supabase
        .from('agendamentos_estetica')
        .update({ status: 'cancelado' })
        .eq('id', agendamentoId)
        .select()
        .single();
        
      if (updError) throw updError;
      return createResponse(true, 'AGENDAMENTO_CANCELADO', 'Agendamento cancelado com sucesso.', 200, { agendamento: updated });
    }

    if (req.method === 'PUT') {
      if (agendamento.status === 'cancelado') {
        return createResponse(false, 'AGENDAMENTO_CANCELADO_NAO_REAGENDAVEL', 'Não é possível reagendar um agendamento que foi cancelado.', 422);
      }

      if (!data || !hora) {
        return createResponse(false, 'CAMPO_OBRIGATORIO_AUSENTE', 'É necessário informar data e hora.', 422, { campo: 'data ou hora' });
      }

      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(data) || !timeRegex.test(hora)) {
        return createResponse(false, 'FORMATO_INVALIDO', 'Formato de data ou hora inválido.', 422);
      }

      const slotsResult = await calcularSlotsDisponiveis(supabase, agenda_id, data, agendamentoId);
      if (slotsResult.errorResponse) return slotsResult.errorResponse;

      const slots = slotsResult.slots;
      if (!slots.includes(hora)) {
        const validFutureSlots = slots.filter((s: string) => s > hora);
        const sugestoes = validFutureSlots.slice(0, 3).map((s: string) => `${data}T${s}:00-03:00`);
        if (sugestoes.length === 0) {
          const fallback = slots.slice(0, 3).map((s: string) => `${data}T${s}:00-03:00`);
          return createResponse(false, 'HORARIO_OCUPADO', 'O horário solicitado não está disponível. Aqui estão os próximos horários livres:', 200, { sugestoes: fallback });
        }
        return createResponse(false, 'HORARIO_OCUPADO', 'O horário solicitado não está disponível. Aqui estão os próximos horários livres:', 200, { sugestoes });
      }

      const data_hora_inicio = `${data}T${hora}:00-03:00`;
      const { data: updated, error: updError } = await supabase
        .from('agendamentos_estetica')
        .update({ data_hora_inicio, status: 'agendado' })
        .eq('id', agendamentoId)
        .select()
        .single();

      if (updError) throw updError;
      return createResponse(true, 'AGENDAMENTO_REAGENDADO', 'Agendamento reagendado com sucesso.', 200, { agendamento: updated });
    }
  } catch (error) {
    return handleError(error);
  }
});
