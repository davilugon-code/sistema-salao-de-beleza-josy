-- Adiciona a coluna opcional 'valor' na tabela de agendamentos se ainda não existir
ALTER TABLE public.agendamentos_estetica 
ADD COLUMN IF NOT EXISTS valor NUMERIC(10,2);
