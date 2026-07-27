-- Guarda el codigo y porcentaje de IVA de cada producto al momento de la
-- compra, en vez de depender de un join en vivo contra ol_productos para
-- facturar (los precios/tarifas de IVA pueden cambiar despues de la venta).
-- Ejecuta este script una sola vez en el SQL Editor de tu Dashboard de Supabase.

alter table ol_pedido_items add column if not exists iva_codigo text;
alter table ol_pedido_items add column if not exists iva_porcentaje numeric;
