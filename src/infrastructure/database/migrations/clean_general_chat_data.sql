-- Migration: Limpieza de datos históricos de conversaciones y mensajes del chat general
-- Hub Academia - Liberación de espacio en base de datos PostgreSQL / Supabase

BEGIN;

-- 1. Eliminar todos los mensajes de chat existentes
DELETE FROM public.chat_messages;

-- 2. Eliminar todas las conversaciones registradas
DELETE FROM public.conversations;

-- 3. Reiniciar contadores de secuencia de ID si aplican
ALTER SEQUENCE IF EXISTS public.conversations_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS public.chat_messages_id_seq RESTART WITH 1;

COMMIT;
