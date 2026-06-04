/**
 * Script de sincronización de productos externos (Tuti / Tía) a Supabase.
 * Diseñado para leer productosTUTI.csv (delimitado por ;) y subirlos a ol_productos.
 * Resuelve RLS (usando service_role key) y restricciones de base de datos (con mapeo en memoria).
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ── CONFIGURACIÓN DE TIENDAS ─────────────────────────────────────────
const TIENDA_TUTI_ID = 'b402b85a-b006-42ef-b2f6-763722f68241'; // Tuti UUID
const TIENDA_TIA_ID  = '37f0c318-ef34-439b-9362-1c4c9fb4d1bd'; // Tía UUID

// ── MAPEO DE CATEGORÍAS ──────────────────────────────────────────────
const CATEGORIAS_PERMITIDAS = {
  "Abarrotes": "Alimentos",
  "Alimentos": "Alimentos",
  "Bebidas": "Bebidas",
  "Lácteos": "Alimentos",
  "Limpieza": "Limpieza",
  "Hogar y limpieza": "Limpieza",
  "Cuidado personal": "Higiene",
  "Higiene": "Higiene"
};

// ── LECTURA DE VARIABLES DE ENTORNO ──────────────────────────────────
const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length === 2) {
    let key = parts[0].trim();
    let val = parts[1].trim();
    // Remover comillas envolventes si existen
    if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
      val = val.substring(1, val.length - 1);
    }
    env[key] = val;
  }
});

// Usamos preferentemente la SERVICE ROLE KEY para evitar políticas de RLS
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log("⚠️ Advertencia: No se detectó SUPABASE_SERVICE_ROLE_KEY en .env.local. Se usará la ANON_KEY pública (puede fallar por RLS).");
} else {
  console.log("🔒 Utilizando clave de administración (Service Role Key) para omitir RLS.");
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey
);
const RUC = env.NEXT_PUBLIC_TIENDA_RUC || '1717067647001';

// Parser de CSV para ";" que respeta comillas dobles
function parseCSVLine(line, separator = ';') {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === separator && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function syncCSV(fileNameOrPath, tiendaId, prefijo) {
  const filePath = path.isAbsolute(fileNameOrPath) 
    ? fileNameOrPath 
    : path.join(process.cwd(), fileNameOrPath);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: El archivo en la ruta "${filePath}" no existe.`);
    return;
  }

  console.log(`📖 Leyendo archivo desde: ${filePath}...`);
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);

  if (lines.length <= 1) {
    console.log("⚠️ El archivo CSV está vacío o solo contiene encabezados.");
    return;
  }

  const headers = parseCSVLine(lines[0], ';');
  console.log("📊 Encabezados detectados:", headers.join(" | "));

  // 1. Obtener los productos ya existentes de esta tienda en Supabase
  console.log("🔍 Consultando productos existentes de esta tienda en Supabase...");
  const { data: existingProducts, error: errFetch } = await supabase
    .from('ol_productos')
    .select('id, codigo')
    .eq('tienda_id', tiendaId);

  if (errFetch) {
    console.error("❌ Error al obtener productos existentes de Supabase:", errFetch);
    return;
  }

  // Mapeamos los existentes por 'codigo' para saber su ID interno
  const existingMap = new Map();
  if (existingProducts) {
    existingProducts.forEach(p => existingMap.set(p.codigo, p.id));
  }
  console.log(`ℹ️ Se encontraron ${existingMap.size} productos existentes en la base de datos.`);

  const productosNuevos = [];
  const productosAActualizar = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i], ';');
    if (cols.length < 5) continue;

    const nombreWeb     = cols[0];
    const marca         = cols[1];
    const precioTexto   = cols[2];
    const code          = cols[3];
    const categoriaExcel= cols[4];
    const presentacion  = cols[5];
    const imgArchivo    = cols[7];

    const categoriaMapeada = CATEGORIAS_PERMITIDAS[categoriaExcel];
    if (!categoriaMapeada) continue;

    let precioLimpio = precioTexto.replace('$', '').trim();
    precioLimpio = precioLimpio.replace(',', '.');
    const precio = parseFloat(precioLimpio) || 0;
    if (precio <= 0) continue;

    const codigoUnico = `${prefijo}-${code}`;

    let descripcion = nombreWeb;
    if (presentacion && presentacion !== "N/A" && !descripcion.toLowerCase().includes(presentacion.toLowerCase())) {
      descripcion = `${descripcion} ${presentacion}`;
    }

    let imagenUrl = null;
    if (imgArchivo && imgArchivo !== "N/A") {
      const host = env.NEXT_PUBLIC_SUPABASE_URL.split('//')[1];
      imagenUrl = `https://${host}/storage/v1/object/public/productos/${imgArchivo}`;
    }

    const payload = {
      ruc: RUC,
      codigo: codigoUnico,
      descripcion: descripcion,
      categoria: categoriaMapeada,
      marca: marca === "N/A" || !marca ? "OTRA" : marca,
      stock: 100,
      stock_minimo: 0,
      precio_publico: precio,
      precio_con_iva: precio,
      subcategoria: "",
      tienda_id: tiendaId,
      imagen_url: imagenUrl,
      url_origen: null,
      updated_at: new Date().toISOString()
    };

    // Si ya existe en la base de datos, le asignamos su ID para que se actualice por Clave Primaria (evita error de ON CONFLICT)
    if (existingMap.has(codigoUnico)) {
      payload.id = existingMap.get(codigoUnico);
      productosAActualizar.push(payload);
    } else {
      productosNuevos.push(payload);
    }
  }

  console.log(`📋 Total de filas válidas en CSV: ${productosNuevos.length + productosAActualizar.length}`);
  console.log(`➡️ Para Insertar (Nuevos): ${productosNuevos.length}`);
  console.log(`➡️ Para Actualizar (Existentes): ${productosAActualizar.length}`);

  // Función auxiliar para subir un lote de datos con tolerancia a columnas faltantes
  async function uploadBatch(tableName, list, isUpdate = false) {
    if (list.length === 0) return;

    let query = supabase.from(tableName);
    if (isUpdate) {
      // Upsert basado en la clave primaria "id" (la cual sí tiene restricción única)
      query = query.upsert(list, { onConflict: 'id' });
    } else {
      query = query.insert(list);
    }

    const { error } = await query;
    if (error) {
      // Si el error es por columnas nuevas que aún no existen (imagen_url o url_origen)
      const esErrorColumna = error.message && (
        error.message.includes('imagen_url') || 
        error.message.includes('url_origen') || 
        error.message.includes('column')
      );

      if (esErrorColumna) {
        console.log(`⚠️ Las columnas imagen_url/url_origen no existen. Reintentando subida básica (${isUpdate ? 'update' : 'insert'})...`);
        const listaBasica = list.map(({ imagen_url, url_origen, ...resto }) => resto);
        
        let retryQuery = supabase.from(tableName);
        if (isUpdate) {
          retryQuery = retryQuery.upsert(listaBasica, { onConflict: 'id' });
        } else {
          retryQuery = retryQuery.insert(listaBasica);
        }

        const resRetry = await retryQuery;
        if (resRetry.error) {
          console.error(`❌ Falló la subida básica en reintento:`, resRetry.error);
        } else {
          console.log(`✅ Lote subido con éxito en modo básico (sin imágenes).`);
        }
      } else {
        console.error(`❌ Error en la operación de base de datos:`, error);
      }
    } else {
      console.log(`✅ Lote de ${list.length} productos procesado correctamente.`);
    }
  }

  // Ejecutamos las inserciones de nuevos
  if (productosNuevos.length > 0) {
    console.log("➕ Insertando productos nuevos...");
    await uploadBatch('ol_productos', productosNuevos, false);
  }

  // Ejecutamos las actualizaciones de existentes
  if (productosAActualizar.length > 0) {
    console.log("🔄 Actualizando productos existentes...");
    await uploadBatch('ol_productos', productosAActualizar, true);
  }

  console.log("🏁 Proceso de sincronización completado.");
}

// Ejecutar la sincronización apuntando al archivo CSV de descargas del usuario
const rutaCSV = 'C:\\Users\\hacienda\\Downloads\\productosTUTI.csv';
syncCSV(rutaCSV, TIENDA_TUTI_ID, 'ext1');
