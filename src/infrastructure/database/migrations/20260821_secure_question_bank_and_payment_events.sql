-- Hub Academia: security hardening migration.
-- Apply this migration explicitly in the production database before deploying
-- the corresponding application code. It does not touch local .env files or
-- service-account-key.json.

BEGIN;

-- The answer key must never be available through anonymous or authenticated
-- PostgREST reads. The Node API reads the table through its database role and
-- returns only the fields required by each protected flow.
DROP POLICY IF EXISTS "Public Read Question Bank" ON public.question_bank;
DROP POLICY IF EXISTS "Public Read Questions" ON public.question_bank;
REVOKE SELECT ON TABLE public.question_bank FROM PUBLIC, anon, authenticated;

-- Idempotency ledger for Mercado Pago webhooks. payment_id is the provider's
-- unique payment identifier and prevents a replay from re-crediting a user.
CREATE TABLE IF NOT EXISTS public.payment_events (
    payment_id TEXT PRIMARY KEY,
    user_id UUID NOT NULL,
    plan_id TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'processing'
        CHECK (status IN ('processing', 'processed', 'failed')),
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_payment_events_user_id
    ON public.payment_events (user_id, received_at DESC);

REVOKE ALL ON TABLE public.payment_events FROM PUBLIC, anon, authenticated;

COMMIT;
