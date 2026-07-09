-- Migration: Update max_free_limit to 20 for free/pending users
UPDATE public.users 
SET max_free_limit = 20 
WHERE subscription_tier = 'free' OR subscription_status = 'pending';
