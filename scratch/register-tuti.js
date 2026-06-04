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
  console.log("Checking if Tuti is registered...");
  const { data: existing, error: errExist } = await supabase
    .from('ol_tiendas')
    .select('id, nombre')
    .ilike('nombre', 'tuti');

  if (errExist) {
    console.error("Error checking stores:", errExist);
    return;
  }

  if (existing && existing.length > 0) {
    console.log("Tuti is already registered with ID:", existing[0].id);
    return;
  }

  console.log("Registering Tuti in ol_tiendas...");
  const { data, error } = await supabase
    .from('ol_tiendas')
    .insert([
      {
        nombre: 'Tuti',
        descripcion: 'Supermercados Tuti - Alto en calidad, bajo en precios.',
        categoria: 'supermercado',
        activa: true,
        orden: 3
      }
    ])
    .select();

  if (error) {
    console.error("Error registering Tuti:", error);
  } else {
    console.log("Tuti registered successfully:", data[0]);
  }
}
run();
