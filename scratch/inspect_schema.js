import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ohdxfsitlnphfwcxymkp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oZHhmc2l0bG5waGZ3Y3h5bWtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MDM5OTIsImV4cCI6MjA5NzI3OTk5Mn0.E6eu0INXjwa2w-woZHful9CJbpGv1a3UsmvK62ktz4U';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
  console.log("=== INSPECTING SCHEMA ===");
  
  // Try querying table columns by selecting one row
  const { data: sqlRes, error: sqlErr } = await supabase.from('leads_estetica').select('*').limit(1);
  if (sqlErr) console.error("leads_estetica error:", sqlErr);
  console.log("leads_estetica columns:", sqlRes && sqlRes.length > 0 ? Object.keys(sqlRes[0]) : "No rows or error");
  
  const { data: sqlRes2, error: sqlErr2 } = await supabase.from('agendamentos_estetica').select('*').limit(1);
  if (sqlErr2) console.error("agendamentos_estetica error:", sqlErr2);
  console.log("agendamentos_estetica columns:", sqlRes2 && sqlRes2.length > 0 ? Object.keys(sqlRes2[0]) : "No rows or error");

  const { data: sqlRes3, error: sqlErr3 } = await supabase.from('clientes_estetica').select('*').limit(1);
  if (sqlErr3) console.error("clientes_estetica error:", sqlErr3);
  console.log("clientes_estetica columns:", sqlRes3 && sqlRes3.length > 0 ? Object.keys(sqlRes3[0]) : "No rows or error");

  // Let's check a few rows from leads_estetica
  const { data: leads, error: leadsErr } = await supabase.from('leads_estetica').select('id, nome_lead, whatsapp_lead, status').limit(5);
  console.log("Leads sample:", leads);
}

inspectSchema();
