const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://kjshjgatoatsknbvswft.supabase.co',
  'sb_publishable_ilmEDfVn7-U_6M__lsPQhA_YEb02Ey0'
);

async function check() {
  console.log("=== CHECKING TIENDAS ===");
  const { data: tiendas, error: errT } = await supabase.from('ol_tiendas').select('id, nombre, activa');
  if (errT) console.error("Error tiendas:", errT);
  else console.log("Tiendas:", tiendas);

  console.log("\n=== CHECKING PRODUCTOS COUNT BY TIENDA_ID ===");
  const { data: prods, error: errP } = await supabase.from('ol_productos').select('tienda_id, stock, precio_publico');
  if (errP) {
    console.error("Error productos:", errP);
    return;
  }

  const counts = {};
  const stockCounts = {};
  prods.forEach(p => {
    const tid = p.tienda_id;
    counts[tid] = (counts[tid] || 0) + 1;
    if (p.stock > 0 && p.precio_publico > 0) {
      stockCounts[tid] = (stockCounts[tid] || 0) + 1;
    }
  });

  console.log("Total products by tienda_id:", counts);
  console.log("Active products (stock > 0, price > 0) by tienda_id:", stockCounts);
}

check();
