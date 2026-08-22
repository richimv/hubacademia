-- Autoridad de respuestas y puntaje del simulador en servidor.
-- Aplicar antes de desplegar el código que consume quiz_sessions.

BEGIN;

CREATE TABLE IF NOT EXISTS public.quiz_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NULL REFERENCES public.users(id) ON DELETE CASCADE,
    domain VARCHAR(20) NOT NULL CHECK (domain IN ('medicine', 'education')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'submitted')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    quiz_history_id UUID NULL REFERENCES public.quiz_history(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.quiz_session_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
    bank_question_id UUID NULL,
    position INTEGER NOT NULL CHECK (position >= 0),
    public_payload JSONB NOT NULL,
    answer_payload JSONB NOT NULL,
    selected_option_index INTEGER,
    is_correct BOOLEAN,
    answered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT quiz_session_questions_position_unique UNIQUE (session_id, position),
    CONSTRAINT quiz_session_questions_answer_consistency CHECK (
        (selected_option_index IS NULL AND is_correct IS NULL AND answered_at IS NULL)
        OR
        (selected_option_index IS NOT NULL AND is_correct IS NOT NULL AND answered_at IS NOT NULL)
    )
);

ALTER TABLE public.quiz_history
    ADD COLUMN IF NOT EXISTS source_session_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS quiz_history_source_session_unique
    ON public.quiz_history(source_session_id)
    WHERE source_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS quiz_sessions_user_status_idx
    ON public.quiz_sessions(user_id, status, expires_at DESC);

CREATE INDEX IF NOT EXISTS quiz_session_questions_session_idx
    ON public.quiz_session_questions(session_id, position);

ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_session_questions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.quiz_sessions FROM PUBLIC;
REVOKE ALL ON TABLE public.quiz_session_questions FROM PUBLIC;
REVOKE ALL ON TABLE public.quiz_sessions FROM anon, authenticated;
REVOKE ALL ON TABLE public.quiz_session_questions FROM anon, authenticated;

COMMIT;
