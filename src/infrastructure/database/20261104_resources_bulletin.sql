-- Deploy compatible application code before the final DROP COLUMN in a live rollout.
-- Resource links and course/topic relationships remain intact.
BEGIN;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS publish_in_bulletin BOOLEAN NOT NULL DEFAULT false;
UPDATE public.resources SET resource_type = 'paper' WHERE resource_type = 'article';
ALTER TABLE public.resources DROP CONSTRAINT IF EXISTS check_resource_type;
ALTER TABLE public.resources ADD CONSTRAINT check_resource_type CHECK (resource_type IN ('book','paper','noticia','norma','guia','video','other'));
ALTER TABLE public.resources DROP CONSTRAINT IF EXISTS resources_bulletin_type_check;
ALTER TABLE public.resources ADD CONSTRAINT resources_bulletin_type_check CHECK (NOT publish_in_bulletin OR resource_type IN ('noticia','paper'));
ALTER TABLE public.resources ALTER COLUMN url TYPE TEXT;
ALTER TABLE public.resources ALTER COLUMN image_url TYPE TEXT;
ALTER TABLE public.resources DROP COLUMN IF EXISTS domain;
CREATE INDEX IF NOT EXISTS idx_resources_bulletin_created ON public.resources (created_at DESC, id DESC) WHERE publish_in_bulletin AND visible;
COMMIT;
