const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ohdxfsitlnphfwcxymkp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oZHhmc2l0bG5waGZ3Y3h5bWtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MDM5OTIsImV4cCI6MjA5NzI3OTk5Mn0.E6eu0INXjwa2w-woZHful9CJbpGv1a3UsmvK62ktz4U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: cols, error: err } = await supabase.rpc('get_table_info', {}); // maybe not exists
  console.log("Cols via RPC:", cols, err);

  // Let's query information_schema orpg_catalog using a query on a generic public table if we can, or see what views exist.
  // Wait! Can we do a select from pg_class or information_schema?
  // By default PostgREST exposes all views and tables in the 'public' schema. Usually postgres system catalogs are not exposed in 'public' unless there is a view.
  // Let's check if we can query any view:
  const { data: v1, error: e1 } = await supabase.from('information_schema.columns').select('*');
  console.log("Inf schema columns:", v1, e1);
}

check();
