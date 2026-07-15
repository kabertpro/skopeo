-- ============================================================
-- SKOPEO — Schema de base de datos (Supabase / PostgreSQL)
-- Kabert EduLab · Kabert Studio Pro
-- ============================================================
-- Cómo usar: pega todo este archivo en Supabase → SQL Editor → Run.
-- Se puede correr una sola vez. Si necesitas resetear todo durante
-- pruebas, hay un bloque comentado al final con los DROP correspondientes.
-- ============================================================

-- Habilita generación de UUIDs si no está activa
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- CURSOS
-- ------------------------------------------------------------
create table if not exists cursos (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- ESTUDIANTES
-- El "numero" es el mismo que el ID físico de la tarjeta ArUco (0..N-1
-- en el marcador, mostrado como N°1..N en la tarjeta impresa).
-- Se reutiliza el mismo número entre cursos distintos, por eso la
-- identidad real de un estudiante es (curso_id, numero).
-- ------------------------------------------------------------
create table if not exists estudiantes (
  id          uuid primary key default gen_random_uuid(),
  curso_id    uuid not null references cursos(id) on delete cascade,
  numero      int  not null,
  nombre      text not null,
  created_at  timestamptz not null default now(),
  unique (curso_id, numero)
);

-- ------------------------------------------------------------
-- EVALUACIONES
-- estado: 'pendiente' (creada, no iniciada) | 'en_curso' (LIVE) | 'finalizada'
-- pregunta_actual_orden: qué pregunta se está mostrando/escaneando ahora mismo.
-- El índice único parcial de abajo garantiza a nivel de base de datos que
-- SOLO puede existir una evaluación en_curso a la vez (evita sesiones
-- fantasma o dos evaluaciones activas por error).
-- ------------------------------------------------------------
create table if not exists evaluaciones (
  id                     uuid primary key default gen_random_uuid(),
  curso_id               uuid not null references cursos(id) on delete cascade,
  titulo                 text not null,
  estado                 text not null default 'pendiente'
                         check (estado in ('pendiente','en_curso','finalizada')),
  pregunta_actual_orden  int not null default 1,
  creada_en              timestamptz not null default now(),
  iniciada_en            timestamptz,
  finalizada_en          timestamptz
);

create unique index if not exists una_evaluacion_activa
  on evaluaciones (estado)
  where estado = 'en_curso';

-- ------------------------------------------------------------
-- PREGUNTAS
-- ------------------------------------------------------------
create table if not exists preguntas (
  id                  uuid primary key default gen_random_uuid(),
  evaluacion_id       uuid not null references evaluaciones(id) on delete cascade,
  orden               int not null,
  texto               text not null,
  opcion_a            text not null,
  opcion_b            text not null,
  opcion_c            text not null,
  opcion_d            text not null,
  respuesta_correcta  char(1) not null check (respuesta_correcta in ('A','B','C','D')),
  unique (evaluacion_id, orden)
);

-- ------------------------------------------------------------
-- RESPUESTAS
-- Una fila por (pregunta, estudiante) — la primera detección es
-- definitiva, por eso hay un unique: no se puede sobreescribir.
-- ------------------------------------------------------------
create table if not exists respuestas (
  id                  uuid primary key default gen_random_uuid(),
  evaluacion_id       uuid not null references evaluaciones(id) on delete cascade,
  pregunta_id         uuid not null references preguntas(id) on delete cascade,
  estudiante_id       uuid not null references estudiantes(id) on delete cascade,
  respuesta_elegida   char(1) not null check (respuesta_elegida in ('A','B','C','D')),
  es_correcta         boolean not null,
  registrada_en       timestamptz not null default now(),
  unique (pregunta_id, estudiante_id)
);

-- ------------------------------------------------------------
-- Índices de apoyo para las consultas más frecuentes
-- ------------------------------------------------------------
create index if not exists idx_estudiantes_curso on estudiantes (curso_id);
create index if not exists idx_evaluaciones_curso on evaluaciones (curso_id);
create index if not exists idx_preguntas_evaluacion on preguntas (evaluacion_id);
create index if not exists idx_respuestas_evaluacion on respuestas (evaluacion_id);
create index if not exists idx_respuestas_pregunta on respuestas (pregunta_id);

-- ------------------------------------------------------------
-- REALTIME
-- Habilita la replicación en vivo para que la vista Presentador (PC)
-- reciba automáticamente cada respuesta que registra el celular.
-- ------------------------------------------------------------
alter publication supabase_realtime add table respuestas;
alter publication supabase_realtime add table evaluaciones;

-- ------------------------------------------------------------
-- Nota sobre seguridad (decisión consciente del proyecto):
-- Row Level Security queda DESACTIVADA. Esta app es de uso exclusivo
-- del docente (control total, sin RLS ni login multiusuario), protegida
-- únicamente por la contraseña de acceso a la interfaz. La clave "anon"
-- de Supabase queda visible en el código del frontend por diseño del
-- propio Supabase — es una decisión aceptada para este caso de uso.
-- ------------------------------------------------------------


-- ============================================================
-- BLOQUE DE RESET (comentado) — solo si necesitas borrar todo
-- y empezar de cero durante pruebas. Descomenta y ejecuta con cuidado.
-- ============================================================
-- drop table if exists respuestas cascade;
-- drop table if exists preguntas cascade;
-- drop table if exists evaluaciones cascade;
-- drop table if exists estudiantes cascade;
-- drop table if exists cursos cascade;
