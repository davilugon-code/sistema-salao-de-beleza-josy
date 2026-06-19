import { getSupabaseClient } from './supabase.ts';
import { createResponse } from './errors.ts';

export async function authenticateRequest(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: createResponse(false, 'TOKEN_INVALIDO', 'Token ausente ou inválido.', 401) };
  }

  const token = authHeader.split(' ')[1];
  
  // SHA-256 hash
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const tokenHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  const supabase = getSupabaseClient();
  
  const { data: tokenData, error: tokenError } = await supabase
    .from('api_tokens')
    .select('id, ativo')
    .eq('token_hash', tokenHash)
    .single();

  if (tokenError || !tokenData) {
    return { error: createResponse(false, 'TOKEN_INVALIDO', 'Token ausente ou inválido.', 401) };
  }

  if (!tokenData.ativo) {
    return { error: createResponse(false, 'TOKEN_DESABILITADO', 'Token desabilitado permanentemente.', 401) };
  }

  return { supabase };
}

export async function validateAgenda(supabase: any, agenda_id: string) {
  if (!agenda_id) {
    return { error: createResponse(false, 'AGENDA_NAO_ENCONTRADA', 'agenda_id inválido ou inativo.', 403) };
  }

  const { data: agenda, error: agendaError } = await supabase
    .from('agendas')
    .select('id')
    .eq('id', agenda_id)
    .eq('ativo', true)
    .single();

  if (agendaError || !agenda) {
    return { error: createResponse(false, 'AGENDA_NAO_ENCONTRADA', 'agenda_id inválido ou inativo.', 403) };
  }

  return { agenda };
}
