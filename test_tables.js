import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ohdxfsitlnphfwcxymkp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oZHhmc2l0bG5waGZ3Y3h5bWtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MDM5OTIsImV4cCI6MjA5NzI3OTk5Mn0.E6eu0INXjwa2w-woZHful9CJbpGv1a3UsmvK62ktz4U';

const supabase = createClient(supabaseUrl, supabaseKey);

const extraTables = [
  'mensagens_estetica', 'mensagens_leads', 'leads_mensagens', 
  'leads_historico', 'historico_leads', 'atendimentos', 
  'atendimentos_estetica', 'historico_atendimento'
];

async function test() {
  console.log("Mapeando tabelas adicionais...");
  for (const table of extraTables) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error && error.code === 'PGRST205') {
      // Tabela não existe
    } else {
      console.log(`[+] ${table}: EXISTE! (Erro: ${error ? error.code : 'Nenhum'})`);
    }
  }
}

test();
