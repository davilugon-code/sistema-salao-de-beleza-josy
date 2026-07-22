const supabaseUrl = 'https://ohdxfsitlnphfwcxymkp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oZHhmc2l0bG5waGZ3Y3h5bWtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MDM5OTIsImV4cCI6MjA5NzI3OTk5Mn0.E6eu0INXjwa2w-woZHful9CJbpGv1a3UsmvK62ktz4U';

async function listarAtivos() {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/agendamentos_estetica?select=id,nome_lead,data_hora_inicio,status,lead_id,agenda_id&status=neq.cancelado&order=data_hora_inicio`,
    {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    }
  );
  const agendamentos = await res.json();
  console.log('Agendamentos ativos:', JSON.stringify(agendamentos, null, 2));
}

listarAtivos();
