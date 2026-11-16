-- ==============================================================================
-- HUB ACADEMIA — OPTIMIZACIÓN DE MEMORIA RAM, SWAP E ÍNDICES EN SUPABASE
-- Fecha: 2026-11-16
-- Propósito:
--   1. Erradicar la tabla legacy `public.documents` (RAG migrado 100% a Pinecone)
--      y extensiones/tablas obsoletas que consumen shared_buffers y Swap (>1.1 GB).
--   2. Garantizar `unaccent`, `pg_trgm` y la función `IMMUTABLE` `public.f_unaccent`
--      a nivel de esquema para eliminar llamadas DDL (`CREATE EXTENSION`) en runtime.
--   3. Eliminar índices duplicados/redundantes que desperdician RAM en PostgreSQL.
--   4. Crear índices compuestos B-Tree y GIN (`pg_trgm`) para erradicar Seq Scans
--      en `question_bank`, `case_scenarios`, `user_question_history`, `resources`
--      y `search_history`.
--   5. Purgar filas efímeras caducadas (`web_traffic`, `quiz_sessions`,
--      `user_question_history`) y proveer `public.purge_stale_operational_data()`.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONES BASE Y FUNCIÓN INMUTABLE f_unaccent (EJECUCIÓN ÚNICA EN MIGRACIÓN)
-- ------------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS "unaccent" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.f_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE PARALLEL SAFE STRICT
SET search_path = public, extensions, pg_temp
AS $func$
    SELECT extensions.unaccent($1);
$func$;

-- ------------------------------------------------------------------------------
-- 2. RETIRO DE TABLAS VECTORIALES/FTS OBSOLETAS Y EXTENSIONES SIN USO
-- ------------------------------------------------------------------------------
-- El motor RAG opera exclusivamente en Pinecone Serverless (hub-academia-index).
-- La tabla legacy `public.documents` (vectores de 768 dim + tsvector fts) causaba
-- escaneos de 19s-32s y saturación del 95.8% de RAM / 108.9% de Swap en Supabase.
DROP TABLE IF EXISTS public.documents CASCADE;

-- Retiro seguro de tablas legacy de versiones previas fuera del esquema vigente
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.feedback CASCADE;
DROP TABLE IF EXISTS public.section_careers CASCADE;
DROP TABLE IF EXISTS public.sections CASCADE;

-- Retiro de extensiones de vectores/diagnóstico que ya no tienen tablas asociadas
DROP EXTENSION IF EXISTS "hypopg";
DROP EXTENSION IF EXISTS "index_advisor";
DROP EXTENSION IF EXISTS "vector";

-- ------------------------------------------------------------------------------
-- 3. ELIMINACIÓN DE ÍNDICES DUPLICADOS O REDUNDANTES (AHORRO DE SHARED_BUFFERS)
-- ------------------------------------------------------------------------------
-- user_question_history tenía 3 índices idénticos sobre (user_id, question_id).
-- Se conserva únicamente `user_question_history_user_id_question_id_key`.
DROP INDEX IF EXISTS public.idx_uhist_user_q;
DROP INDEX IF EXISTS public.unique_user_question;

-- question_bank tenía índices simples redundantes cubiertos por índices compuestos:
-- `idx_question_bank_case_id` está cubierto por `idx_question_bank_case_id_order (case_id, case_order ASC)`.
-- `idx_qbank_domain` está cubierto por `idx_question_bank_domain_topic_sub` y `idx_question_bank_domain_created_at`.
DROP INDEX IF EXISTS public.idx_question_bank_case_id;
DROP INDEX IF EXISTS public.idx_qbank_domain;

-- ------------------------------------------------------------------------------
-- 4. CREACIÓN DE ÍNDICES COMPUESTOS Y TRIGRAM (GIN) DE ALTO RENDIMIENTO
-- ------------------------------------------------------------------------------

-- A. question_bank: Paginación y listado administrativo por dominio + fecha (evita leer 722k filas)
CREATE INDEX IF NOT EXISTS idx_question_bank_domain_created_at
    ON public.question_bank USING btree (domain, created_at DESC);

-- B. question_bank: Selección rápida de lotes para simuladores (Docente y Médico)
CREATE INDEX IF NOT EXISTS idx_question_bank_simulator_lookup
    ON public.question_bank USING btree (domain, target, difficulty, topic);

-- C. question_bank: Filtrado por tópico normalizado sin acentos en Medicina
CREATE INDEX IF NOT EXISTS idx_question_bank_domain_topic_unaccent
    ON public.question_bank USING btree (domain, public.f_unaccent(upper((topic)::text)));

-- D. question_bank & case_scenarios: Índices GIN pg_trgm para búsquedas ILIKE '%...%' en Panel Admin
CREATE INDEX IF NOT EXISTS idx_question_bank_qtext_trgm
    ON public.question_bank USING gin (question_text extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_question_bank_topic_trgm
    ON public.question_bank USING gin (topic extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_question_bank_subtopic_trgm
    ON public.question_bank USING gin (subtopic extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_case_scenarios_title_trgm
    ON public.case_scenarios USING gin (title extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_case_scenarios_code_trgm
    ON public.case_scenarios USING gin (code extensions.gin_trgm_ops);

-- E. user_question_history: Index-Only Scan para el motor anti-repetición de 24 horas
CREATE INDEX IF NOT EXISTS idx_user_question_history_user_seen_at
    ON public.user_question_history USING btree (user_id, seen_at DESC) INCLUDE (question_id);

-- F. resources & courses & topics: Índices GIN trigram con f_unaccent(lower(...)) para el buscador
CREATE INDEX IF NOT EXISTS idx_resources_title_trgm
    ON public.resources USING gin (public.f_unaccent(lower((title)::text)) extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_courses_name_lower_trgm
    ON public.courses USING gin (public.f_unaccent(lower((name)::text)) extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_topics_name_lower_trgm
    ON public.topics USING gin (public.f_unaccent(lower((name)::text)) extensions.gin_trgm_ops);

-- G. search_history: Series temporales y analíticas filtradas por fecha y origen
CREATE INDEX IF NOT EXISTS idx_search_history_created_source
    ON public.search_history USING btree (created_at DESC, source);

-- ------------------------------------------------------------------------------
-- 5. PURGA DE DATOS EFÍMEROS CADUCADOS Y FUNCIÓN DE MANTENIMIENTO PERIÓDICO
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_stale_operational_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
    v_deleted_traffic INTEGER := 0;
    v_deleted_sessions INTEGER := 0;
    v_deleted_seen INTEGER := 0;
BEGIN
    -- web_traffic solo requiere sesiones del día actual y pulsos de los últimos 5 minutos
    DELETE FROM public.web_traffic
    WHERE last_ping < NOW() - INTERVAL '7 days'
      AND created_at < CURRENT_DATE - INTERVAL '7 days';
    GET DIAGNOSTICS v_deleted_traffic = ROW_COUNT;

    -- Sesiones de simulador expiradas y no enviadas (libera payloads JSONB en cascada)
    DELETE FROM public.quiz_sessions
    WHERE expires_at < NOW() - INTERVAL '7 days'
      AND status <> 'submitted';
    GET DIAGNOSTICS v_deleted_sessions = ROW_COUNT;

    -- Historial de preguntas vistas mayor a 7 días (anti-repetición usa ventana de 24h)
    DELETE FROM public.user_question_history
    WHERE seen_at < NOW() - INTERVAL '7 days';
    GET DIAGNOSTICS v_deleted_seen = ROW_COUNT;

    RETURN jsonb_build_object(
        'deleted_web_traffic', v_deleted_traffic,
        'deleted_quiz_sessions', v_deleted_sessions,
        'deleted_user_question_history', v_deleted_seen,
        'executed_at', NOW()
    );
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.purge_stale_operational_data() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_stale_operational_data() TO service_role;

-- Ejecutar limpieza inicial dentro de la migración
SELECT public.purge_stale_operational_data();

COMMIT;

-- ------------------------------------------------------------------------------
-- 6. ACTUALIZACIÓN DE ESTADÍSTICAS DEL PLANIFICADOR (EJECUTAR TRAS EL COMMIT)
-- ------------------------------------------------------------------------------
ANALYZE public.question_bank;
ANALYZE public.case_scenarios;
ANALYZE public.user_question_history;
ANALYZE public.web_traffic;
ANALYZE public.quiz_sessions;
ANALYZE public.quiz_session_questions;
ANALYZE public.users;
ANALYZE public.resources;
ANALYZE public.courses;
ANALYZE public.topics;
ANALYZE public.search_history;

-- Nota para SQL Editor de Supabase (ejecutar fuera de bloque transaccional si se desea):
-- VACUUM (ANALYZE) public.web_traffic, public.question_bank, public.user_question_history, public.quiz_sessions, public.quiz_session_questions;
-- SELECT extensions.pg_stat_statements_reset();
