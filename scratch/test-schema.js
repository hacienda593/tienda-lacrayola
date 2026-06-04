const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Leer y parsear .env.local manualmente
const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length === 2) {
    env[parts[0].trim()] = parts[1].trim();
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  const { data, error } = await supabase
    .from('ol_productos')
    .select('*')
    .not('imagen_url', 'is', null)
    .limit(1);
  if (error) {
    console.error("Error fetching schema:", error);
  } else {
    console.log("Single product record structure:", data[0]);
  }
}
run();

