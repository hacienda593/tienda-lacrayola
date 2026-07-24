-- Sistema de correccion de busqueda: diccionario de variantes + registro
-- de busquedas sin resultado. Ejecutar una sola vez en el SQL Editor de
-- Supabase (Project > SQL Editor > New query > pegar todo > Run).
--
-- IMPORTANTE: pega este archivo en una consulta NUEVA y vacia (Ctrl+A y
-- borra cualquier texto anterior antes de pegar), para evitar que quede
-- mezclado con contenido previo en el editor.

-- 1) Diccionario: variante (como la escribe el cliente, con o sin falta
--    ortografica) -> termino correcto que si existe en el catalogo.
create table if not exists ol_productos_terminos_busqueda (
  id bigserial primary key,
  variante text not null unique,
  termino_correcto text not null,
  created_at timestamptz not null default now()
);

alter table ol_productos_terminos_busqueda enable row level security;

drop policy if exists "lectura publica terminos" on ol_productos_terminos_busqueda;
create policy "lectura publica terminos" on ol_productos_terminos_busqueda
  for select using (true);

-- 2) Registro de busquedas que no encontraron ningun producto, para que
--    puedas revisarlas manualmente en Supabase y decidir si agregar una
--    variante nueva al diccionario de arriba.
create table if not exists ol_productos_busquedas_sin_resultado (
  id bigserial primary key,
  termino_buscado text not null unique,
  veces_buscado integer not null default 1,
  primera_vez timestamptz not null default now(),
  ultima_vez timestamptz not null default now(),
  resuelto boolean not null default false
);

alter table ol_productos_busquedas_sin_resultado enable row level security;

drop policy if exists "escritura publica busquedas fallidas" on ol_productos_busquedas_sin_resultado;
create policy "escritura publica busquedas fallidas" on ol_productos_busquedas_sin_resultado
  for insert with check (true);

drop policy if exists "actualizacion publica busquedas fallidas" on ol_productos_busquedas_sin_resultado;
create policy "actualizacion publica busquedas fallidas" on ol_productos_busquedas_sin_resultado
  for update using (true) with check (true);

drop policy if exists "lectura publica busquedas fallidas" on ol_productos_busquedas_sin_resultado;
create policy "lectura publica busquedas fallidas" on ol_productos_busquedas_sin_resultado
  for select using (true);

-- 3) Funcion que la app llama en cada busqueda sin resultado: si el termino
--    ya existe, suma 1 a veces_buscado; si no, lo crea.
create or replace function registrar_busqueda_fallida(termino text)
returns void
language sql
security definer
as $$
  insert into ol_productos_busquedas_sin_resultado (termino_buscado, veces_buscado, primera_vez, ultima_vez)
  values (termino, 1, now(), now())
  on conflict (termino_buscado)
  do update set
    veces_buscado = ol_productos_busquedas_sin_resultado.veces_buscado + 1,
    ultima_vez = now();
$$;

grant execute on function registrar_busqueda_fallida(text) to anon, authenticated;

-- 4) Semilla inicial: variantes foneticas frecuentes en la costa ecuatoriana
--    (seseo z/c->s, confusion b/v, h muda, etc.) para los productos mas
--    buscados de tu catalogo actual. Esto es un punto de partida -- la tabla
--    de busquedas sin resultado (#2) es la que te dira que mas falta.
insert into ol_productos_terminos_busqueda (variante, termino_correcto) values
  ('asucar', 'azucar'),
  ('azukar', 'azucar'),
  ('asukar', 'azucar'),
  ('aseite', 'aceite'),
  ('aceyte', 'aceite'),
  ('javon', 'jabon'),
  ('xabon', 'jabon'),
  ('vinagre', 'vinagre'),
  ('vinilla', 'vainilla'),
  ('bainilla', 'vainilla'),
  ('gaseosa', 'gaseosa'),
  ('galleta', 'galletas'),
  ('yogurt', 'yogur'),
  ('yogourt', 'yogur'),
  ('lechi', 'leche'),
  ('kesos', 'quesos'),
  ('quezo', 'queso'),
  ('keso', 'queso'),
  ('uevos', 'huevos'),
  ('guevos', 'huevos'),
  ('arros', 'arroz'),
  ('avena', 'avena'),
  ('mayonesa', 'mayonesa'),
  ('mallonesa', 'mayonesa'),
  ('mahonesa', 'mayonesa'),
  ('deterjente', 'detergente'),
  ('suavisante', 'suavizante'),
  ('desodorante', 'desodorante'),
  ('shampu', 'shampoo'),
  ('champu', 'shampoo'),
  ('champoo', 'shampoo'),
  ('papel iginico', 'papel higienico'),
  ('fideo', 'fideos'),
  ('espageti', 'espagueti'),
  ('spaguetti', 'espagueti')
on conflict (variante) do nothing;
