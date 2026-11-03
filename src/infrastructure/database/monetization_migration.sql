-- Add subscription_status and payment_id to users table

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_id VARCHAR(255) DEFAULT NULL;

-- Optional: Create an index for performance if querying by status often
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON public.users(subscription_status);

-- Explicit Supabase Data API grants (ACT-04 compliance, RLS auth.uid() = id enforced)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE ON TABLE public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users TO service_role;
