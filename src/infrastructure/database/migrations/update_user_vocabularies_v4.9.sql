-- Migration: Update user_vocabularies table for V4.9 and V4.10
-- Decouples level column (making it nullable) and adds SRS, variables, and metadata columns.

-- 1. Make level nullable
ALTER TABLE public.user_vocabularies ALTER COLUMN level DROP NOT NULL;

-- 2. Add POS and variables columns
ALTER TABLE public.user_vocabularies ADD COLUMN IF NOT EXISTS part_of_speech VARCHAR(50) DEFAULT NULL;
ALTER TABLE public.user_vocabularies ADD COLUMN IF NOT EXISTS is_variable BOOLEAN DEFAULT FALSE;

-- 3. Add SRS parameters
ALTER TABLE public.user_vocabularies ADD COLUMN IF NOT EXISTS srs_state VARCHAR(20) DEFAULT 'new';
ALTER TABLE public.user_vocabularies ADD COLUMN IF NOT EXISTS next_review_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.user_vocabularies ADD COLUMN IF NOT EXISTS interval_days INT DEFAULT 0;
ALTER TABLE public.user_vocabularies ADD COLUMN IF NOT EXISTS ease_factor NUMERIC(4, 2) DEFAULT 2.50;
ALTER TABLE public.user_vocabularies ADD COLUMN IF NOT EXISTS practice_count INT DEFAULT 0;

-- 4. Add rich JSONB metadata
ALTER TABLE public.user_vocabularies ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 5. Add update timestamp
ALTER TABLE public.user_vocabularies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
