const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ohdxfsitlnphfwcxymkp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oZHhmc2l0bG5waGZ3Y3h5bWtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MDM5OTIsImV4cCI6MjA5NzI3OTk5Mn0.E6eu0INXjwa2w-woZHful9CJbpGv1a3UsmvK62ktz4U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('leads_estetica').insert({
    nome_lead: 'Teste Manual Lead',
    whatsapp_lead: null,
    status: 'conversando'
  }).select();
  console.log("Lead insert error:", error);
  console.log("Lead insert data:", data);
}

check();
