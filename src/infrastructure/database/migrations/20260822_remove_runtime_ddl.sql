-- Hub Academia - DDL que antes se ejecutaba durante cada arranque de Node.
-- Ejecutar una vez con un rol propietario, después de un respaldo verificado.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "fuzzystrmatch";

ALTER TABLE public.decks
    ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'General';

ALTER TABLE public.decks
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

COMMIT;
