const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Leer y parsear .env.local
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
  console.log("Inspecting unique constraints for ol_productos...");
  // Let's run a query to inspect constraints
  const { data, error } = await supabase.rpc('inspect_table_constraints'); // Wait! RPC might not exist.
  // Instead of RPC, we can try to select keys or query pg_indexes/pg_constraint if we have direct access, 
  // but since we are through PostgREST, we can only query tables or RPCs exposed.
  // Wait, is there an information_schema or pg_class view exposed in PostgREST? Usually not, unless explicitly enabled.
  // Let's try to query pg_catalog or information_schema directly just in case it is exposed.
  const { data: cols, error: errCols } = await supabase.from('ol_productos').select('codigo').limit(5);
  console.log("Existing products keys count:", cols ? cols.length : 0);
  
  // Let's try to do a insert of a duplicate codigo to see if it fails with unique key violation!
  // That will tell us if there is a constraint.
  const testProduct = {
    ruc: '1717067647001',
    codigo: 'TEST_DUP_KEY_123',
    descripcion: 'Test Duplicate Key',
    categoria: 'Escolar',
    marca: 'TEST',
    stock: 0,
    stock_minimo: 0,
    precio_publico: 1.0,
    precio_con_iva: 1.0,
    subcategoria: '',
    tienda_id: 'b7fe17b9-c3da-4c9f-9a87-169d70623566'
  };

  console.log("Inserting first test product...");
  const res1 = await supabase.from('ol_productos').insert(testProduct);
  if (res1.error) {
    console.error("Error inserting first:", res1.error);
    return;
  }
  
  console.log("Inserting duplicate test product to test unique constraint...");
  const res2 = await supabase.from('ol_productos').insert(testProduct);
  if (res2.error) {
    console.log("Duplicate insertion failed as expected. Error code & message:", res2.error.code, res2.error.message);
  } else {
    console.log("Warning: Duplicate code was inserted! No unique constraint exists on 'codigo'.");
    // Clean up
    await supabase.from('ol_productos').delete().eq('codigo', 'TEST_DUP_KEY_123');
  }

  // Let's clean up test product
  await supabase.from('ol_productos').delete().eq('codigo', 'TEST_DUP_KEY_123');
}
run();
