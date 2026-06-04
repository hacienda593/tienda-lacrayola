import os
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

supabase_url = "https://kjshjgatoatsknbvswft.supabase.co"
supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtqc2hqZ2F0b2F0c2tuYnZzd2Z0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTM2Mzg2NiwiZXhwIjoyMDk0OTM5ODY2fQ.Kxh9ZfL81Hj9uNV63O2nezPEU6wlc19jx-4Sii45rt4"

headers = {
    "apikey": supabase_key,
    "Authorization": f"Bearer {supabase_key}"
}
tienda_id = 'b402b85a-b006-42ef-b2f6-763722f68241'

print("Querying products...")
res = requests.get(f"{supabase_url}/rest/v1/ol_productos?tienda_id=eq.{tienda_id}&select=codigo,descripcion,imagen_url", headers=headers)
res.raise_for_status()
products = res.json()

with_url = [p for p in products if p.get('imagen_url')]
print(f"Total products: {len(products)}")
print(f"Products with image URL in DB: {len(with_url)}")

status_counts = {}
failures = []

def check_url(p):
    url = p['imagen_url']
    try:
        r = requests.head(url, timeout=5)
        return p['codigo'], r.status_code, url
    except Exception as e:
        return p['codigo'], f"Error: {e}", url

print("Testing URLs in parallel...")
with ThreadPoolExecutor(max_workers=20) as executor:
    futures = [executor.submit(check_url, p) for p in with_url]
    for future in as_completed(futures):
        code, status, url = future.result()
        status_counts[status] = status_counts.get(status, 0) + 1
        if status != 200:
            failures.append((code, status, url))

print("\nResults:")
for status, count in status_counts.items():
    print(f"- HTTP {status}: {count} images")

if failures:
    print(f"\nFailed to load {len(failures)} images. First 10 failures:")
    for f in failures[:10]:
        print(f"Code: {f[0]}, Status: {f[1]}, URL: {f[2]}")
else:
    print("\nAll image URLs returned 200 OK!")
