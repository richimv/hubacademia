-- Migration: alter_vocabulary_conjugations_person
-- Alter columns size in public.vocabulary_conjugations to support longer strings (e.g. He/She/It or compound pronons)

ALTER TABLE public.vocabulary_conjugations ALTER COLUMN person TYPE VARCHAR(100);
