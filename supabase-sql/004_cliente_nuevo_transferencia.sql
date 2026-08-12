-- =====================================================================
-- Antifraude: clientes nuevos deben pagar su primera compra por
-- transferencia (no contra-entrega), para evitar pedidos falsos/broma
-- por COD donde nadie recibe ni paga al motorizado.
-- =====================================================================
-- "Cliente nuevo" = ese numero de telefono no tiene NINGUN pedido que
-- haya llegado a 'entregado'. No cuenta cualquier pedido creado (un
-- pedido COD que nunca se entrego pudo ser la broma misma), solo una
-- entrega real y completada cuenta como historial de confianza.
--
-- El checkout corre en el navegador con la clave anon, y por RLS un
-- usuario anonimo no puede leer pedidos de otras personas para ver su
-- propio historial. Esta funcion SECURITY DEFINER resuelve eso sin
-- exponer ningun dato de pedidos ajenos -- solo devuelve un boolean.
--
-- Ejecuta esto completo en el SQL Editor de tu Dashboard de Supabase
-- (mismo proyecto que usa reparto-lacrayola, ya que comparten ol_pedidos).
-- =====================================================================

CREATE OR REPLACE FUNCTION cliente_tiene_historial(p_telefono TEXT) RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM ol_pedidos
    WHERE telefono = p_telefono AND estado = 'entregado'
  );
$$;

GRANT EXECUTE ON FUNCTION cliente_tiene_historial(TEXT) TO anon, authenticated;
