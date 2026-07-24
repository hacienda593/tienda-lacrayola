-- ─────────────────────────────────────────────────────────────────────────
-- Sistema de corrección de búsqueda: diccionario de variantes + registro
-- de búsquedas sin resultado. Ejecutar una sola vez en el SQL Editor de
-- Supabase (Project > SQL Editor > New query > pegar todo > Run).
-- ─────────────────────────────────────────────────────────────────────────

-- 1) Diccionario: variante (como la escribe el cliente, con o sin falta
--    ortográfica) -> término correcto que sí existe en el catálogo.
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

-- 2) Registro de búsquedas que no encontraron ningún producto, para que
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

-- 3) Función que la app llama en cada búsqueda sin resultado: si el término
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

-- 4) Semilla inicial: variantes fonéticas frecuentes en la costa ecuatoriana
--    (seseo z/c->s, confusión b/v, h muda, etc.) para los productos más
--    buscados de tu catálogo actual. Esto es un punto de partida — la tabla
--    de búsquedas sin resultado (#2) es la que te dirá qué más falta.
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
  ('güevos', 'huevos'),
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
