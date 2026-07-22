import { handleCors, createResponse, handleError } from '../_shared/errors.ts';
import { authenticateRequest, validateAgenda } from '../_shared/auth.ts';
import { calcularSlotsDisponiveis } from '../_shared/slots.ts';
import { calcularDuracaoProcedimento, adicionarMinutos, atualizarObservacoesComHorario } from '../_shared/duracao.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Aceita PUT, DELETE e também POST (alias de PUT para compatibilidade com N8N)
  if (req.method !== 'PUT' && req.method !== 'DELETE' && req.method !== 'POST') {
    return createResponse(false, 'METODO_NAO_PERMITIDO', 'Método HTTP não permitido.', 405);
  }

  try {
    const authResult = await authenticateRequest(req);
    if (authResult.error) return authResult.error;
    const { supabase } = authResult;

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    let agendamentoIdFromUrl = pathParts[pathParts.length - 1];
    if (agendamentoIdFromUrl === 'agendamentos-id') agendamentoIdFromUrl = '';

    // Lê o body
    const body = await req.json();
    const { agenda_id, data, hora, agendamento_id: agendamentoIdFromBody, lead_id } = body;

    // ID do agendamento pode vir na URL ou no body (campo agendamento_id)
    let agendamentoId = agendamentoIdFromUrl || agendamentoIdFromBody;

    // POST é tratado como PUT (alias para compatibilidade com N8N)
    const method = req.method === 'POST' ? 'PUT' : req.method;

    if (!agenda_id) {
      return createResponse(false, 'CAMPO_OBRIGATORIO_AUSENTE', 'É necessário informar agenda_id.', 422, { campo: 'agenda_id' });
    }

    const agendaResult = await validateAgenda(supabase, agenda_id);
    if (agendaResult.error) return agendaResult.error;

    let agendamento: any = null;

    if (agendamentoId) {
      // Busca direta pelo ID do agendamento
      const { data: ag, error: agErr } = await supabase
        .from('agendamentos_estetica')
        .select('*')
        .eq('id', agendamentoId)
        .single();
      if (agErr || !ag) {
        return createResponse(false, 'AGENDAMENTO_NAO_ENCONTRADO', 'ID do agendamento não existe.', 404);
      }
      agendamento = ag;
    } else if (lead_id) {
      // Fallback: busca o agendamento ativo mais recente do lead nessa agenda
      const { data: ags, error: agErr } = await supabase
        .from('agendamentos_estetica')
        .select('*')
        .eq('agenda_id', agenda_id)
        .eq('lead_id', lead_id)
        .neq('status', 'cancelado')
        .order('data_hora_inicio', { ascending: false })
        .limit(1);
      if (agErr || !ags || ags.length === 0) {
        return createResponse(false, 'AGENDAMENTO_NAO_ENCONTRADO', 'Nenhum agendamento ativo encontrado para este lead nessa agenda.', 404);
      }
      agendamento = ags[0];
      agendamentoId = agendamento.id;
    } else {
      return createResponse(false, 'AGENDAMENTO_NAO_ENCONTRADO', 'Informe agendamento_id ou lead_id para identificar o agendamento.', 404);
    }

    if (agendamento.agenda_id !== agenda_id) {
      return createResponse(false, 'ACESSO_NEGADO', 'Agendamento não pertence à agenda.', 403);
    }

    if (method === 'DELETE') {
      const { error: updError } = await supabase
        .from('agendamentos_estetica')
        .delete()
        .eq('id', agendamentoId);
      if (updError) throw updError;

      let targetLeadId = agendamento.lead_id;
      if (!targetLeadId && agendamento.cliente_id) {
        const { data: clientData } = await supabase
          .from('clientes_estetica').select('lead_id').eq('id', agendamento.cliente_id).single();
        if (clientData?.lead_id) targetLeadId = clientData.lead_id;
      }
      if (targetLeadId) {
        await supabase.from('leads_estetica')
          .update({ status: 'cancelou_agendamento', data_agendamento: null })
          .eq('id', targetLeadId);
      }
      return createResponse(true, 'AGENDAMENTO_CANCELADO', 'Agendamento cancelado com sucesso.', 200, { agendamento });
    }

    if (method === 'PUT') {
      if (agendamento.status === 'cancelado') {
        return createResponse(false, 'AGENDAMENTO_CANCELADO_NAO_REAGENDAVEL', 'Não é possível reagendar um agendamento cancelado.', 422);
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

      const slots = slotsResult.slots ?? [];
      if (!slots.includes(hora)) {
        const validFutureSlots = slots.filter((s: string) => s > hora);
        const sugestoes = validFutureSlots.slice(0, 3).map((s: string) => `${data}T${s}:00`);
        if (sugestoes.length === 0) {
          const fallback = slots.slice(0, 3).map((s: string) => `${data}T${s}:00`);
          return createResponse(false, 'HORARIO_OCUPADO', 'O horário solicitado não está disponível. Aqui estão os próximos horários livres:', 200, { sugestoes: fallback });
        }
        return createResponse(false, 'HORARIO_OCUPADO', 'O horário solicitado não está disponível. Aqui estão os próximos horários livres:', 200, { sugestoes });
      }

      // ✅ SEM timezone: armazena como horário local puro para evitar conversão UTC no banco
      const data_hora_inicio = `${data}T${hora}:00`;
      const duracao = calcularDuracaoProcedimento(agendamento.procedimento_nome);
      const data_hora_fim = adicionarMinutos(data_hora_inicio, duracao);
      const parts = (agendamento.procedimento_nome || '').split(/[,;+]|\s+e\s+/gi).map((p: string) => p.trim()).filter(Boolean);
      const updatedObs = atualizarObservacoesComHorario(agendamento.observacoes, data_hora_inicio, data_hora_fim, parts.length);

      const { data: updated, error: updError } = await supabase
        .from('agendamentos_estetica')
        .update({ data_hora_inicio, data_hora_fim, observacoes: updatedObs, status: 'agendado' })
        .eq('id', agendamentoId)
        .select()
        .single();
      if (updError) throw updError;

      let targetLeadId = updated.lead_id;
      if (!targetLeadId && updated.cliente_id) {
        const { data: clientData } = await supabase
          .from('clientes_estetica').select('lead_id').eq('id', updated.cliente_id).single();
        if (clientData?.lead_id) targetLeadId = clientData.lead_id;
      }
      if (targetLeadId) {
        await supabase.from('leads_estetica')
          .update({ status: 'agendado', data_agendamento: data_hora_inicio })
          .eq('id', targetLeadId);
      }

      return createResponse(true, 'AGENDAMENTO_REAGENDADO', 'Agendamento reagendado com sucesso.', 200, { agendamento: updated });
    }
  } catch (error) {
    return handleError(error);
  }
});
