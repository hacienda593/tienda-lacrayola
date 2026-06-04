import os
import requests

# Supabase URL & Key from env
supabase_url = "https://kjshjgatoatsknbvswft.supabase.co"
supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtqc2hqZ2F0b2F0c2tuYnZzd2Z0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTM2Mzg2NiwiZXhwIjoyMDk0OTM5ODY2fQ.Kxh9ZfL81Hj9uNV63O2nezPEU6wlc19jx-4Sii45rt4"

headers = {
    "apikey": supabase_key,
    "Authorization": f"Bearer {supabase_key}"
}

# Tienda Tuti ID
tienda_id = 'b402b85a-b006-42ef-b2f6-763722f68241'

print("Fetching Tuti products...")
select_url = f"{supabase_url}/rest/v1/ol_productos?tienda_id=eq.{tienda_id}&select=codigo,descripcion,imagen_url"
response = requests.get(select_url, headers=headers)
response.raise_for_status()
products = response.json()

print(f"Total Tuti products in DB: {len(products)}")

with_url = [p for p in products if p.get('imagen_url')]
print(f"Products with image URL: {len(with_url)}")

if not with_url:
    print("NO PRODUCTS HAVE IMAGE URLs!")
    print("Sample products:")
    for p in products[:5]:
        print(f"Code: {p['codigo']}, Name: {p['descripcion']}, Img URL: {p.get('imagen_url')}")
else:
    print("\nFirst 10 products with image URLs:")
    for p in with_url[:10]:
        url = p['imagen_url']
        # Try a HEAD request to check if image is accessible
        try:
            head_res = requests.head(url)
            status = head_res.status_code
        except Exception as e:
            status = f"Error: {e}"
        print(f"- Code: {p['codigo']}\n  Desc: {p['descripcion']}\n  URL: {url}\n  HTTP Status: {status}")
