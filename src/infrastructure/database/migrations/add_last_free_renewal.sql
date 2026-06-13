-- Migration: Add last_free_renewal column to users table
-- This column tracks when a free/pending user last had their lives renewed.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_free_renewal TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
