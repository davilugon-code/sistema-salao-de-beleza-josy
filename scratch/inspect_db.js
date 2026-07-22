const supabaseUrl = 'https://ohdxfsitlnphfwcxymkp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oZHhmc2l0bG5waGZ3Y3h5bWtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MDM5OTIsImV4cCI6MjA5NzI3OTk5Mn0.E6eu0INXjwa2w-woZHful9CJbpGv1a3UsmvK62ktz4U';

async function checkColumn() {
  console.log("Checking if minutos_ultima_mensagem is a column in leads_estetica...");
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/leads_estetica?select=minutos_ultima_mensagem&limit=1`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text);
  } catch (err) {
    console.error("Error:", err);
  }
}

checkColumn();
