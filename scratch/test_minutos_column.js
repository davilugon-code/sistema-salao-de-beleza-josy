import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ohdxfsitlnphfwcxymkp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oZHhmc2l0bG5waGZ3Y3h5bWtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MDM5OTIsImV4cCI6MjA5NzI3OTk5Mn0.E6eu0INXjwa2w-woZHful9CJbpGv1a3UsmvK62ktz4U';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  console.log("Testing insert with minutos_ultima_mensagem...");
  const { data, error } = await supabase
    .from('leads_estetica')
    .insert({
      whatsapp_lead: '5511999999999',
      minutos_ultima_mensagem: 10
    })
    .select();
    
  if (error) {
    console.error("Insert error:", error);
  } else {
    console.log("Insert success:", data);
    // Let's delete the test row
    if (data && data.length > 0) {
      await supabase.from('leads_estetica').delete().eq('id', data[0].id);
      console.log("Deleted test row.");
    }
  }
}

testInsert();
