-- Migration: global_vocabularies_migration
-- 1. Create global_vocabularies table
CREATE TABLE IF NOT EXISTS public.global_vocabularies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    word VARCHAR(100) NOT NULL,
    language_code VARCHAR(10) NOT NULL,
    part_of_speech VARCHAR(50),
    is_variable BOOLEAN DEFAULT FALSE,
    translation VARCHAR(255),
    definition TEXT,
    example_sentence TEXT,
    audio_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_word_lang_pos UNIQUE (word, language_code, part_of_speech)
);

-- Enable RLS on the global table
ALTER TABLE public.global_vocabularies ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read global vocabulary words
DROP POLICY IF EXISTS "Allow authenticated read of global vocabularies" ON public.global_vocabularies;
CREATE POLICY "Allow authenticated read of global vocabularies" 
ON public.global_vocabularies 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Allow all authenticated users to insert global vocabulary words
DROP POLICY IF EXISTS "Allow authenticated insert of global vocabularies" ON public.global_vocabularies;
CREATE POLICY "Allow authenticated insert of global vocabularies"
ON public.global_vocabularies
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Migrate existing unique words from user_vocabularies to global_vocabularies
INSERT INTO public.global_vocabularies (word, language_code, part_of_speech, is_variable, translation, definition, example_sentence, audio_url)
SELECT DISTINCT ON (LOWER(TRIM(word)), language_code, COALESCE(part_of_speech, 'noun')) 
    LOWER(TRIM(word)), language_code, COALESCE(part_of_speech, 'noun'), is_variable, translation, definition, example_sentence, audio_url
FROM public.user_vocabularies
ON CONFLICT (word, language_code, part_of_speech) DO NOTHING;

-- 3. Add vocabulary_id column to user_vocabularies and ensure uniqueness
ALTER TABLE public.user_vocabularies ADD COLUMN IF NOT EXISTS vocabulary_id UUID REFERENCES public.global_vocabularies(id) ON DELETE CASCADE;
ALTER TABLE public.user_vocabularies DROP CONSTRAINT IF EXISTS unique_user_vocabulary;
ALTER TABLE public.user_vocabularies ADD CONSTRAINT unique_user_vocabulary UNIQUE (user_id, vocabulary_id);

-- 4. Match existing user_vocabularies records to their new global_vocabularies equivalents
UPDATE public.user_vocabularies uv
SET vocabulary_id = gv.id
FROM public.global_vocabularies gv
WHERE LOWER(TRIM(uv.word)) = gv.word
  AND uv.language_code = gv.language_code
  AND COALESCE(uv.part_of_speech, 'noun') = gv.part_of_speech
  AND uv.vocabulary_id IS NULL;

-- 5. Set any orphans or remaining user_vocabularies that failed the matching to a new global word dynamically
INSERT INTO public.global_vocabularies (word, language_code, part_of_speech, is_variable, translation, definition, example_sentence, audio_url)
SELECT DISTINCT ON (LOWER(TRIM(word)), language_code, COALESCE(part_of_speech, 'noun')) 
    LOWER(TRIM(word)), language_code, COALESCE(part_of_speech, 'noun'), is_variable, translation, definition, example_sentence, audio_url
FROM public.user_vocabularies
WHERE vocabulary_id IS NULL
ON CONFLICT (word, language_code, part_of_speech) DO NOTHING;

UPDATE public.user_vocabularies uv
SET vocabulary_id = gv.id
FROM public.global_vocabularies gv
WHERE LOWER(TRIM(uv.word)) = gv.word
  AND uv.language_code = gv.language_code
  AND COALESCE(uv.part_of_speech, 'noun') = gv.part_of_speech
  AND uv.vocabulary_id IS NULL;

-- 6. Make vocabulary_id NOT NULL now that migration matches are fully completed
ALTER TABLE public.user_vocabularies ALTER COLUMN vocabulary_id SET NOT NULL;

-- 7. Migrate vocabulary_conjugations keys to reference global_vocabularies instead of user_vocabularies
-- First, identify the current constraint name (if table is created, it is vocabulary_conjugations_vocabulary_id_fkey)
ALTER TABLE public.vocabulary_conjugations DROP CONSTRAINT IF EXISTS vocabulary_conjugations_vocabulary_id_fkey;

-- Update the IDs in vocabulary_conjugations to match the global_vocabularies.id
UPDATE public.vocabulary_conjugations vc
SET vocabulary_id = uv.vocabulary_id
FROM public.user_vocabularies uv
WHERE vc.vocabulary_id = uv.id;

-- Apply the new foreign key reference to global_vocabularies
ALTER TABLE public.vocabulary_conjugations 
ADD CONSTRAINT vocabulary_conjugations_vocabulary_id_fkey 
FOREIGN KEY (vocabulary_id) REFERENCES public.global_vocabularies(id) ON DELETE CASCADE;

-- 8. Clean up redundant columns from user_vocabularies to keep it strictly for student progress & collections
-- Note: We will keep translation in user_vocabularies so users can optionally override translations locally,
-- but remove definitions, examples, audio_url, is_variable, part_of_speech, word, level, as they are now globalized.
ALTER TABLE public.user_vocabularies DROP COLUMN IF EXISTS word;
ALTER TABLE public.user_vocabularies DROP COLUMN IF EXISTS definition;
ALTER TABLE public.user_vocabularies DROP COLUMN IF EXISTS example_sentence;
ALTER TABLE public.user_vocabularies DROP COLUMN IF EXISTS audio_url;
ALTER TABLE public.user_vocabularies DROP COLUMN IF EXISTS part_of_speech;
ALTER TABLE public.user_vocabularies DROP COLUMN IF EXISTS is_variable;
ALTER TABLE public.user_vocabularies DROP COLUMN IF EXISTS level;
ALTER TABLE public.user_vocabularies DROP COLUMN IF EXISTS language_code CASCADE;
