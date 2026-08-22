-- Retiro definitivo del antiguo módulo Idiomas.
-- Conserva los mazos y tarjetas de usuarios: solo los integra al módulo Repaso general.

BEGIN;

UPDATE public.decks
SET category = 'General',
    source_module = CASE
        WHEN LOWER(COALESCE(source_module, '')) IN ('idiomas', 'language', 'languages')
            THEN 'MANUAL'
        ELSE source_module
    END,
    updated_at = NOW()
WHERE LOWER(COALESCE(category, '')) IN ('idiomas', 'language', 'languages')
   OR LOWER(COALESCE(source_module, '')) IN ('idiomas', 'language', 'languages');

DELETE FROM public.user_simulator_preferences
WHERE LOWER(domain) IN ('idiomas', 'language', 'languages');

COMMIT;
