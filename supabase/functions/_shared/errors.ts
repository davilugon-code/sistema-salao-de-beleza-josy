export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

export function handleCors(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}

export function createResponse(
  sucesso: boolean,
  situacao: string,
  mensagem: string,
  status: number,
  extraData: Record<string, any> = {}
) {
  return new Response(
    JSON.stringify({
      sucesso,
      situacao,
      mensagem,
      ...extraData,
    }),
    {
      status,
      headers: corsHeaders,
    }
  );
}

export function handleError(err: any) {
  console.error(err);
  return createResponse(
    false,
    'ERRO_INTERNO',
    'Ocorreu um erro inesperado no servidor.',
    500
  );
}
