-- 1. Sincronização: Agendamento -> Lead (Kanban)
CREATE OR REPLACE FUNCTION public.sincronizar_agendamento_para_lead()
RETURNS TRIGGER AS $$
DECLARE
    v_lead_id UUID;
    v_status_agendamento VARCHAR;
    v_data_inicio TIMESTAMP WITH TIME ZONE;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_lead_id := OLD.lead_id;
        v_status_agendamento := 'cancelado';
        v_data_inicio := NULL;
    ELSE
        v_lead_id := NEW.lead_id;
        v_status_agendamento := NEW.status;
        v_data_inicio := NEW.data_hora_inicio;
    END IF;

    IF v_lead_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Atualiza o status do lead de acordo com o agendamento
    -- Evitamos loop infinito de triggers usando a condição pg_trigger_depth()
    IF pg_trigger_depth() <= 1 THEN
        IF v_status_agendamento = 'cancelado' OR TG_OP = 'DELETE' THEN
            UPDATE public.leads_estetica
            SET status = 'cancelou_agendamento',
                data_agendamento = NULL
            WHERE id = v_lead_id AND status != 'cancelou_agendamento';
        ELSIF v_status_agendamento = 'agendado' THEN
            UPDATE public.leads_estetica
            SET status = 'agendado',
                data_agendamento = v_data_inicio
            WHERE id = v_lead_id AND status != 'agendado';
        ELSIF v_status_agendamento = 'confirmado' THEN
            UPDATE public.leads_estetica
            SET status = 'agendado', -- Mantém na coluna "Agendado" do Kanban
                data_agendamento = v_data_inicio
            WHERE id = v_lead_id AND status != 'agendado';
        ELSIF v_status_agendamento = 'compareceu' THEN
            UPDATE public.leads_estetica
            SET status = 'compareceu'
            WHERE id = v_lead_id AND status != 'compareceu';
        ELSIF v_status_agendamento = 'faltou' THEN
            UPDATE public.leads_estetica
            SET status = 'abandonou_conversa'
            WHERE id = v_lead_id AND status != 'abandonou_conversa';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Sincronização: Lead (Kanban) -> Agendamento
CREATE OR REPLACE FUNCTION public.sincronizar_lead_para_agendamento()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o trigger foi disparado por outro trigger (evita recursão infinita)
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    -- Se o status do lead mudou
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        -- Se mudou para Cancelado, cancela ou deleta os agendamentos ativos desse lead
        IF NEW.status = 'cancelou_agendamento' THEN
            -- Exclui ou marca como cancelado os agendamentos ativos na tabela
            UPDATE public.agendamentos_estetica
            SET status = 'cancelado'
            WHERE lead_id = NEW.id AND status IN ('agendado', 'confirmado');
            
            -- Limpa a data de agendamento do lead
            NEW.data_agendamento := NULL;
        
        -- Se mudou para Compareceu, marca agendamentos como compareceu
        ELSIF NEW.status = 'compareceu' THEN
            UPDATE public.agendamentos_estetica
            SET status = 'compareceu'
            WHERE lead_id = NEW.id AND status IN ('agendado', 'confirmado');
            
        -- Se mudou para outro status que não seja "agendado" (ex: conversando, abandonou, etc)
        -- cancelamos os agendamentos que estavam marcados para o futuro.
        ELSIF NEW.status IN ('conversando', 'abandonou_conversa', 'iniciou_atendimento', 'follow_up') THEN
            UPDATE public.agendamentos_estetica
            SET status = 'cancelado'
            WHERE lead_id = NEW.id AND status IN ('agendado', 'confirmado');
            NEW.data_agendamento := NULL;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove triggers antigos se existirem
DROP TRIGGER IF EXISTS trg_sincronizar_agendamento ON public.agendamentos_estetica;
DROP TRIGGER IF EXISTS trg_sincronizar_lead ON public.leads_estetica;

-- Cria Trigger: Agendamento -> Lead
CREATE TRIGGER trg_sincronizar_agendamento
AFTER INSERT OR UPDATE OR DELETE
ON public.agendamentos_estetica
FOR EACH ROW
EXECUTE FUNCTION public.sincronizar_agendamento_para_lead();

-- Cria Trigger: Lead -> Agendamento
CREATE TRIGGER trg_sincronizar_lead
BEFORE UPDATE
ON public.leads_estetica
FOR EACH ROW
EXECUTE FUNCTION public.sincronizar_lead_para_agendamento();

-- 3. Cálculo de Duração (Respeita data_hora_fim informada)
CREATE OR REPLACE FUNCTION public.calculate_data_hora_fim()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.data_hora_fim IS NOT NULL AND NEW.data_hora_fim > NEW.data_hora_inicio THEN
    RETURN NEW;
  END IF;

  NEW.data_hora_fim := NEW.data_hora_inicio + interval '30 minutes';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_agendamento_insert_update ON public.agendamentos_estetica;

CREATE TRIGGER on_agendamento_insert_update
BEFORE INSERT OR UPDATE ON public.agendamentos_estetica
FOR EACH ROW
EXECUTE FUNCTION public.calculate_data_hora_fim();

