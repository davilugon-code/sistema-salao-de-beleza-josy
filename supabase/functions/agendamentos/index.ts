import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors, createResponse, handleError } from '../_shared/errors.ts';
import { authenticateRequest, validateAgenda } from '../_shared/auth.ts';
import { calcularSlotsDisponiveis } from '../_shared/slots.ts';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return createResponse(false, 'METODO_NAO_PERMITIDO', 'Método HTTP não permitido.', 405);
  }

  try {
    const authResult = await authenticateRequest(req);
    if (authResult.error) return authResult.error;
    const { supabase } = authResult;

    const body = await req.json();
    const { agenda_id, lead_id, cliente_id, data, hora, procedimento_nome, nome_lead, whatsapp_lead, observacoes } = body;

    if (!agenda_id) {
       return createResponse(false, 'CAMPO_OBRIGATORIO_AUSENTE', 'É necessário informar agenda_id.', 422, { campo: 'agenda_id' });
    }

    const agendaResult = await validateAgenda(supabase, agenda_id);
    if (agendaResult.error) return agendaResult.error;

    if (!lead_id && !cliente_id) {
      return createResponse(false, 'CAMPO_OBRIGATORIO_AUSENTE', 'É necessário informar lead_id ou cliente_id.', 422, { campo: 'lead_id ou cliente_id' });
    }
    
    if (!data || !hora) {
      return createResponse(false, 'CAMPO_OBRIGATORIO_AUSENTE', 'É necessário informar data e hora.', 422, { campo: 'data ou hora' });
    }

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data) || !timeRegex.test(hora)) {
      return createResponse(false, 'FORMATO_INVALIDO', 'Formato de data ou hora inválido.', 422);
    }

    if (lead_id) {
      const { data: lead, error: leadErr } = await supabase.from('leads_estetica').select('id').eq('id', lead_id).single();
      if (leadErr || !lead) return createResponse(false, 'LEAD_NAO_ENCONTRADO', 'lead_id não existe.', 404);
    }

    if (cliente_id) {
      const { data: cli, error: cliErr } = await supabase.from('clientes_estetica').select('id').eq('id', cliente_id).single();
      if (cliErr || !cli) return createResponse(false, 'CLIENTE_NAO_ENCONTRADO', 'cliente_id não existe.', 404);
    }

    const slotsResult = await calcularSlotsDisponiveis(supabase, agenda_id, data);
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

    const { data: newApp, error: insertError } = await supabase
      .from('agendamentos_estetica')
      .insert({
        agenda_id,
        lead_id,
        cliente_id,
        data_hora_inicio,
        procedimento_nome,
        nome_lead,
        whatsapp_lead,
        observacoes,
        status: 'agendado'
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return createResponse(true, 'AGENDAMENTO_CRIADO', 'Agendamento criado com sucesso.', 201, { agendamento: newApp });
  } catch (error) {
    return handleError(error);
  }
});
