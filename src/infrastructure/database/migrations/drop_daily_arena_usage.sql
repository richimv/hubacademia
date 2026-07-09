-- Migration: Drop daily_arena_usage column from users table
ALTER TABLE public.users DROP COLUMN IF EXISTS daily_arena_usage;
