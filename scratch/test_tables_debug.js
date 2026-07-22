import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ohdxfsitlnphfwcxymkp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oZHhmc2l0bG5waGZ3Y3h5bWtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MDM5OTIsImV4cCI6MjA5NzI3OTk5Mn0.E6eu0INXjwa2w-woZHful9CJbpGv1a3UsmvK62ktz4U';
const supabase = createClient(supabaseUrl, supabaseKey);

const extraTables = [
  'leads_estetica',
  'clientes_estetica',
  'agendamentos_estetica',
  'api_tokens',
  'agendas',
  'mensagens_estetica',
  'mensagens_leads',
  'leads_mensagens',
  'leads_historico',
  'historico_leads',
  'atendimentos',
  'atendimentos_estetica',
  'historico_atendimento'
];

async function test() {
  console.log("Starting table mapping test...");
  for (const table of extraTables) {
    try {
      const { data, error, status } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`[-] ${table}: Error. Code: ${error.code}, Message: ${error.message}, Status: ${status}`);
      } else {
        console.log(`[+] ${table}: EXISTS! Rows: ${data.length}, Status: ${status}`);
      }
    } catch (e) {
      console.log(`[x] ${table}: Threw exception:`, e.message);
    }
  }
  console.log("Table mapping test completed.");
}

test().catch(err => console.error("Unhandled test error:", err));
