import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ohdxfsitlnphfwcxymkp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oZHhmc2l0bG5waGZ3Y3h5bWtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MDM5OTIsImV4cCI6MjA5NzI3OTk5Mn0.E6eu0INXjwa2w-woZHful9CJbpGv1a3UsmvK62ktz4U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const agendaId = '2aa6d320-ee6b-4def-992e-9370f3431623';
  const { data, error } = await supabase
    .from('agenda_hours')
    .select('*')
    .eq('agenda_id', agendaId);

  if (error) {
    console.error(error);
  } else {
    console.log("Horários da agenda da Josy:", data);
  }
}

check();
