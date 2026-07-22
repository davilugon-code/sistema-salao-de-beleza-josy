const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ohdxfsitlnphfwcxymkp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oZHhmc2l0bG5waGZ3Y3h5bWtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MDM5OTIsImV4cCI6MjA5NzI3OTk5Mn0.E6eu0INXjwa2w-woZHful9CJbpGv1a3UsmvK62ktz4U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('agendamentos_estetica').insert({
    agenda_id: '2aa6d328-ee8b-4def-992e-9170f3431023',
    lead_id: null,
    cliente_id: null,
    nome_lead: 'teste',
    whatsapp_lead: null,
    procedimento_nome: 'teste',
    data_hora_inicio: '2026-07-15T12:00:00',
    data_hora_fim: '2026-07-15T13:30:00',
    status: 'agendado'
  }).select();

  console.log("Error:", error);
  console.log("Data:", data);
}

check();
