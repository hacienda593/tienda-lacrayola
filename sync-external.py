# -*- coding: utf-8 -*-
"""
Script de sincronización de productos externos (Tuti / Tía) a Supabase.
Desarrollado en Python para Windows.
ASCII markers are used instead of emojis to prevent CP1252 UnicodeEncodeErrors in standard Windows terminals.
"""

import os
import csv
import json
from datetime import datetime
import requests

# ── CONFIGURACIÓN DE TIENDAS ─────────────────────────────────────────
TIENDA_TUTI_ID = 'b402b85a-b006-42ef-b2f6-763722f68241' # Tuti UUID
TIENDA_TIA_ID  = '37f0c318-ef34-439b-9362-1c4c9fb4d1bd' # Tía UUID

# ── CATEGORÍAS PERMITIDAS ────────────────────────────────────────────
CATEGORIAS_PERMITIDAS = [
    "Abarrotes",
    "Bebidas y Licores",
    "Congelados y Refrigerados",
    "Golosinas y Snacks",
    "Panadería",
    "Cuidado Personal",
    "Hogar y Limpieza",
    "Mascotas",
    "Huevos Lácteos y Leches"
]

def leer_env_local():
    """Lee y parsea el archivo .env.local manualmente."""
    env = {}
    env_path = os.path.join(os.getcwd(), '.env.local')
    if not os.path.exists(env_path):
        print("[ERROR] No se encontro el archivo .env.local en el directorio actual.")
        return None
        
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            parts = line.split('=', 1)
            key = parts[0].strip()
            val = parts[1].strip()
            # Quitar comillas si existen
            if (val.startswith("'") and val.endswith("'")) or (val.startswith('"') and val.endswith('"')):
                val = val[1:-1]
            env[key] = val
    return env

def sync_csv(csv_path, tienda_id, prefijo):
    if not os.path.exists(csv_path):
        print(f"[ERROR] El archivo en la ruta '{csv_path}' no existe.")
        return

    env = leer_env_local()
    if not env:
        return

    supabase_url = env.get('NEXT_PUBLIC_SUPABASE_URL')
    # Usar preferiblemente la SERVICE ROLE KEY para evadir RLS
    supabase_key = env.get('SUPABASE_SERVICE_ROLE_KEY') or env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    ruc = env.get('NEXT_PUBLIC_TIENDA_RUC', '1717067647001')

    if not env.get('SUPABASE_SERVICE_ROLE_KEY'):
        print("[WARN] No se detecto SUPABASE_SERVICE_ROLE_KEY. Se usara ANON_KEY (puede fallar por RLS).")
    else:
        print("[INFO] Utilizando clave de administracion (Service Role Key) para omitir RLS.")

    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json"
    }

    # 1. Obtener productos existentes de esta tienda en Supabase
    print("[INFO] Consultando productos existentes de esta tienda en Supabase...")
    select_url = f"{supabase_url}/rest/v1/ol_productos?tienda_id=eq.{tienda_id}&select=id,codigo"
    
    try:
        response = requests.get(select_url, headers=headers)
        response.raise_for_status()
        existing_products = response.json()
    except Exception as e:
        print(f"[ERROR] Al consultar productos en Supabase: {e}")
        return

    # Mapear existentes por código
    existing_map = {p['codigo']: p['id'] for p in existing_products}
    print(f"[INFO] Se encontraron {len(existing_map)} productos existentes en la base de datos.")

    productos_nuevos = []
    productos_a_actualizar = []

    print(f"[INFO] Leyendo archivo desde: {csv_path}...")
    try:
        with open(csv_path, 'r', encoding='utf-8-sig') as csvfile:
            reader = csv.reader(csvfile, delimiter=';')
            headers_detected = next(reader)
            print("Encabezados detectados:", " | ".join(headers_detected))

            for row in reader:
                if len(row) < 8:
                    continue

                nombre_web     = row[0]
                marca          = row[1]
                precio_texto   = row[2]
                code           = row[3]
                categoria_excel= row[4]
                presentacion   = row[5]
                img_archivo    = row[7]

                # Validar categoría
                if categoria_excel not in CATEGORIAS_PERMITIDAS:
                    continue

                # Limpiar precio
                precio_limpio = precio_texto.replace('$', '').replace(' ', '').replace(',', '.')
                try:
                    precio = float(precio_limpio)
                except ValueError:
                    continue

                if precio <= 0:
                    continue

                codigo_unico = f"{prefijo}-{code}"

                # Formatear descripción
                descripcion = nombre_web
                if presentacion and presentacion != "N/A" and presentacion.lower() not in descripcion.lower():
                    descripcion = f"{descripcion} {presentacion}"

                # Construir URL de la imagen en Supabase
                imagen_url = None
                if img_archivo and img_archivo != "N/A":
                    host = supabase_url.split('//')[1]
                    imagen_url = f"https://{host}/storage/v1/object/public/productos/{prefijo}/{img_archivo}"

                payload = {
                    "ruc": ruc,
                    "codigo": codigo_unico,
                    "descripcion": descripcion,
                    "categoria": categoria_excel,
                    "marca": marca if (marca and marca != "N/A") else "OTRA",
                    "stock": 100,
                    "stock_minimo": 0,
                    "precio_publico": precio,
                    "precio_con_iva": precio,
                    "subcategoria": "",
                    "tienda_id": tienda_id,
                    "imagen_url": imagen_url,
                    "updated_at": datetime.utcnow().isoformat() + 'Z'
                }

                # Si ya existe, le asignamos su ID para actualizarlo mediante clave primaria
                if codigo_unico in existing_map:
                    payload["id"] = existing_map[codigo_unico]
                    productos_a_actualizar.append(payload)
                else:
                    productos_nuevos.append(payload)

    except Exception as e:
        print(f"[ERROR] Al leer el archivo CSV: {e}")
        return

    print(f"[INFO] Total de filas validas en CSV: {len(productos_nuevos) + len(productos_a_actualizar)}")
    print(f"-> Para Insertar (Nuevos): {len(productos_nuevos)}")
    print(f"-> Para Actualizar (Existentes): {len(productos_a_actualizar)}")

    # Función interna para enviar peticiones en lote
    def subir_lote(lista, is_update=False):
        if not lista:
            return

        post_url = f"{supabase_url}/rest/v1/ol_productos"
        
        # Copiar headers y configurar para UPSERT/INSERT
        batch_headers = headers.copy()
        if is_update:
            batch_headers["Prefer"] = "resolution=merge-duplicates"

        res = requests.post(post_url, headers=batch_headers, data=json.dumps(lista))
        
        if res.status_code not in [200, 201, 204]:
            err_msg = res.text
            if "imagen_url" in err_msg or "column" in err_msg:
                print(f"[WARN] La columna de imagenes aun no existe en Supabase. Reintentando subida basica...")
                
                lista_basica = []
                for p in lista:
                    p_copy = p.copy()
                    p_copy.pop('imagen_url', None)
                    lista_basica.append(p_copy)

                res_retry = requests.post(post_url, headers=batch_headers, data=json.dumps(lista_basica))
                if res_retry.status_code not in [200, 201, 204]:
                    print(f"[ERROR] En la subida basica reintentada: {res_retry.text}")
                else:
                    print(f"[OK] Lote procesado con exito en modo basico (sin imagenes).")
            else:
                print(f"[ERROR] En la operacion de base de datos ({res.status_code}): {err_msg}")
        else:
            print(f"[OK] Lote de {len(lista)} productos procesado correctamente.")

    # 1. Ejecutar inserción de nuevos
    if productos_nuevos:
        print("[INFO] Insertando productos nuevos...")
        subir_lote(productos_nuevos, is_update=False)

    # 2. Ejecutar actualización de existentes
    if productos_a_actualizar:
        print("[INFO] Actualizando productos existentes...")
        subir_lote(productos_a_actualizar, is_update=True)

    print("[INFO] Sincronizacion completada.")

if __name__ == "__main__":
    ruta_csv = r"C:\Users\hacienda\Downloads\productosTUTI.csv"
    sync_csv(ruta_csv, TIENDA_TUTI_ID, 'ext1')
