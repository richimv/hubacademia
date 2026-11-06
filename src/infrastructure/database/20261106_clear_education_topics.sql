-- Keep the column and its NOT NULL contract; only remove education classifications.
-- Save (id, topic) before executing this migration. Historical attempts stay intact.
BEGIN;
UPDATE public.question_bank
SET topic = ''
WHERE domain = 'education' AND topic IS DISTINCT FROM '';
COMMIT;
