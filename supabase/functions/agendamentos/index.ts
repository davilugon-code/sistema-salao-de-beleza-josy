import { handleCors, createResponse, handleError } from '../_shared/errors.ts';
import { authenticateRequest, validateAgenda } from '../_shared/auth.ts';
import { calcularSlotsDisponiveis } from '../_shared/slots.ts';
import { calcularDuracaoProcedimento, adicionarMinutos, atualizarObservacoesComHorario } from '../_shared/duracao.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST' && req.method !== 'DELETE') {
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

    // ─── DELETE: Cancelar agendamento ativo pelo lead/cliente + agenda ────────
    if (req.method === 'DELETE') {
      let cancelQuery = supabase
        .from('agendamentos_estetica')
        .select('id, data_hora_inicio, nome_lead, lead_id, cliente_id')
        .eq('agenda_id', agenda_id)
        .in('status', ['agendado', 'confirmado']);

      if (lead_id) cancelQuery = cancelQuery.eq('lead_id', lead_id);
      else if (cliente_id) cancelQuery = cancelQuery.eq('cliente_id', cliente_id);

      const { data: existentes, error: buscarErr } = await cancelQuery;

      if (buscarErr) throw buscarErr;

      if (!existentes || existentes.length === 0) {
        return createResponse(false, 'AGENDAMENTO_NAO_ENCONTRADO', 'Nenhum agendamento ativo encontrado para este lead nesta agenda.', 404);
      }

      const ids = existentes.map((e: any) => e.id);
      const { error: updErr } = await supabase
        .from('agendamentos_estetica')
        .delete()
        .in('id', ids);

      if (updErr) throw updErr;

      // Atualizar o status dos leads correspondentes no CRM para cancelou_agendamento
      for (const app of existentes) {
        let targetLeadId = app.lead_id;
        if (!targetLeadId && app.cliente_id) {
          const { data: clientData } = await supabase
            .from('clientes_estetica')
            .select('lead_id')
            .eq('id', app.cliente_id)
            .single();
          if (clientData?.lead_id) {
            targetLeadId = clientData.lead_id;
          }
        }
        if (targetLeadId) {
          await supabase
            .from('leads_estetica')
            .update({ status: 'cancelou_agendamento', data_agendamento: null })
            .eq('id', targetLeadId);
        }
      }

      return createResponse(true, 'AGENDAMENTO_CANCELADO', 'Agendamento cancelado com sucesso.', 200, {
        agendamentos_cancelados: existentes,
      });
    }

    // ─── POST: Criar / Reagendar agendamento ─────────────────────────────────
    if (!data || !hora) {
      return createResponse(false, 'CAMPO_OBRIGATORIO_AUSENTE', 'É necessário informar data e hora.', 422, { campo: 'data ou hora' });
    }

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data) || !timeRegex.test(hora)) {
      return createResponse(false, 'FORMATO_INVALIDO', 'Formato de data ou hora inválido.', 422);
    }

    let dbNomeLead = nome_lead;
    let dbWhatsappLead = whatsapp_lead;

    if (lead_id) {
      const { data: lead, error: leadErr } = await supabase
        .from('leads_estetica')
        .select('id, nome_lead, whatsapp_lead')
        .eq('id', lead_id)
        .single();
      if (leadErr || !lead) return createResponse(false, 'LEAD_NAO_ENCONTRADO', 'lead_id não existe.', 404);

      if (!dbNomeLead) dbNomeLead = lead.nome_lead;
      if (!dbWhatsappLead) dbWhatsappLead = lead.whatsapp_lead;
    }

    if (cliente_id) {
      const { data: cli, error: cliErr } = await supabase
        .from('clientes_estetica')
        .select('id, lead_id, leads_estetica(id, nome_lead, whatsapp_lead)')
        .eq('id', cliente_id)
        .single();
      if (cliErr || !cli) return createResponse(false, 'CLIENTE_NAO_ENCONTRADO', 'cliente_id não existe.', 404);

      const lead = cli.leads_estetica as any;
      if (lead) {
        if (!dbNomeLead) dbNomeLead = lead.nome_lead;
        if (!dbWhatsappLead) dbWhatsappLead = lead.whatsapp_lead;
      }
    }

    // Remove agendamentos ativos anteriores do mesmo lead (reagendamento automático)
    let agendamentoCancelado: any = null;
    let cancelQuery = supabase
      .from('agendamentos_estetica')
      .select('id, data_hora_inicio')
      .eq('agenda_id', agenda_id)
      .in('status', ['agendado', 'confirmado']);

    if (lead_id) cancelQuery = cancelQuery.eq('lead_id', lead_id);
    else if (cliente_id) cancelQuery = cancelQuery.eq('cliente_id', cliente_id);

    const { data: existentes, error: cancelErr } = await cancelQuery;

    if (!cancelErr && existentes && existentes.length > 0) {
      const ids = existentes.map((e: any) => e.id);
      await supabase
        .from('agendamentos_estetica')
        .delete()
        .in('id', ids);
      agendamentoCancelado = existentes[0];
    }

    const slotsResult = await calcularSlotsDisponiveis(supabase, agenda_id, data);
    if (slotsResult.errorResponse) return slotsResult.errorResponse;

    const slots = slotsResult.slots;

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
    const duracao = calcularDuracaoProcedimento(procedimento_nome);
    const data_hora_fim = adicionarMinutos(data_hora_inicio, duracao);
    const parts = (procedimento_nome || '').split(/[,;+]|\s+e\s+/gi).map((p: string) => p.trim()).filter(Boolean);
    const updatedObs = atualizarObservacoesComHorario(observacoes, data_hora_inicio, data_hora_fim, parts.length);

    const { data: newApp, error: insertError } = await supabase
      .from('agendamentos_estetica')
      .insert({
        agenda_id,
        lead_id,
        cliente_id,
        data_hora_inicio,
        data_hora_fim,
        procedimento_nome,
        nome_lead: dbNomeLead,
        whatsapp_lead: dbWhatsappLead,
        observacoes: updatedObs,
        status: 'agendado',
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Atualizar o status do lead correspondente no CRM para agendado e definir data do agendamento
    let targetLeadId = lead_id;
    if (!targetLeadId && cliente_id) {
      const { data: clientData } = await supabase
        .from('clientes_estetica')
        .select('lead_id')
        .eq('id', cliente_id)
        .single();
      if (clientData?.lead_id) {
        targetLeadId = clientData.lead_id;
      }
    }
    if (targetLeadId) {
      await supabase
        .from('leads_estetica')
        .update({ status: 'agendado', data_agendamento: data_hora_inicio })
        .eq('id', targetLeadId);
    }

    const mensagem = agendamentoCancelado
      ? 'Agendamento anterior cancelado e novo agendamento criado com sucesso.'
      : 'Agendamento criado com sucesso.';
    const situacao = agendamentoCancelado ? 'AGENDAMENTO_REAGENDADO' : 'AGENDAMENTO_CRIADO';
    const httpStatus = agendamentoCancelado ? 200 : 201;

    return createResponse(true, situacao, mensagem, httpStatus, { agendamento: newApp, agendamento_cancelado: agendamentoCancelado });
  } catch (error) {
    return handleError(error);
  }
});
