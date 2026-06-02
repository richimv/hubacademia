-- remediate_supabase_security.sql
-- Migración consolidada para resolver las 17 advertencias de seguridad del linter de Supabase.
-- Fecha: 2026-06-02

-- =================================================================
-- 1. CREACIÓN DE ESQUEMA SEGURO Y REUBICACIÓN DE EXTENSIONES
-- =================================================================
CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
BEGIN
    -- unaccent
    BEGIN
        ALTER EXTENSION unaccent SET SCHEMA extensions;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'No se pudo mover unaccent a extensions: %', SQLERRM;
    END;

    -- fuzzystrmatch
    BEGIN
        ALTER EXTENSION fuzzystrmatch SET SCHEMA extensions;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'No se pudo mover fuzzystrmatch a extensions: %', SQLERRM;
    END;

    -- pg_trgm
    BEGIN
        ALTER EXTENSION pg_trgm SET SCHEMA extensions;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'No se pudo mover pg_trgm a extensions: %', SQLERRM;
    END;

    -- vector
    BEGIN
        ALTER EXTENSION vector SET SCHEMA extensions;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'No se pudo mover vector a extensions: %', SQLERRM;
    END;
END $$;

-- =================================================================
-- 2. ACTIVACIÓN DE ROW LEVEL SECURITY (RLS) EN TABLAS FALTANTES
-- =================================================================
ALTER TABLE IF EXISTS public.careers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.course_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.course_careers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.course_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.topic_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_book_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_course_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_question_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.web_traffic ENABLE ROW LEVEL SECURITY;

-- =================================================================
-- 3. CREACIÓN DE POLÍTICAS DE ACCESO SEGURO
-- =================================================================

-- Catálogos públicos: lectura libre para todos (PostgREST), escritura denegada por defecto
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Read Careers" ON public.careers;
    CREATE POLICY "Public Read Careers" ON public.careers FOR SELECT USING (true);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Read Courses" ON public.courses;
    CREATE POLICY "Public Read Courses" ON public.courses FOR SELECT USING (true);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Read Topics" ON public.topics;
    CREATE POLICY "Public Read Topics" ON public.topics FOR SELECT USING (true);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Read Resources" ON public.resources;
    CREATE POLICY "Public Read Resources" ON public.resources FOR SELECT USING (true);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Read Course Books" ON public.course_books;
    CREATE POLICY "Public Read Course Books" ON public.course_books FOR SELECT USING (true);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Read Course Careers" ON public.course_careers;
    CREATE POLICY "Public Read Course Careers" ON public.course_careers FOR SELECT USING (true);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Read Course Topics" ON public.course_topics;
    CREATE POLICY "Public Read Course Topics" ON public.course_topics FOR SELECT USING (true);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Read Topic Resources" ON public.topic_resources;
    CREATE POLICY "Public Read Topic Resources" ON public.topic_resources FOR SELECT USING (true);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Read Question Bank" ON public.question_bank;
    CREATE POLICY "Public Read Question Bank" ON public.question_bank FOR SELECT USING (true);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Datos privados de usuario y logs de actividad: lectura/escritura exclusiva del propietario
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
    CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
    
    DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
    CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can manage own conversations" ON public.conversations;
    CREATE POLICY "Users can manage own conversations" ON public.conversations FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can manage own messages" ON public.chat_messages;
    CREATE POLICY "Users can manage own messages" ON public.chat_messages FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.conversations c 
            WHERE c.id = chat_messages.conversation_id AND c.user_id = auth.uid()
        )
    );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can manage own book library" ON public.user_book_library;
    CREATE POLICY "Users can manage own book library" ON public.user_book_library FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can manage own course library" ON public.user_course_library;
    CREATE POLICY "Users can manage own course library" ON public.user_course_library FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can manage own question history" ON public.user_question_history;
    CREATE POLICY "Users can manage own question history" ON public.user_question_history FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can manage own feedback" ON public.feedback;
    CREATE POLICY "Users can manage own feedback" ON public.feedback FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can manage own search history" ON public.search_history;
    CREATE POLICY "Users can manage own search history" ON public.search_history FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- =================================================================
-- 4. ELIMINACIÓN DE POLÍTICAS PERMISIVAS (RESTRICTIVE DEFAULT)
-- =================================================================
-- page_views y web_traffic no requieren acceso desde el cliente. El backend las maneja directamente.
DO $$
BEGIN
    DROP POLICY IF EXISTS "Authenticated users can insert page views" ON public.page_views;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Permitir registro de pulsos público" ON public.web_traffic;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- =================================================================
-- 5. CONFIGURACIÓN DE SEARCH_PATH EN FUNCIONES (SECURITY DEFINER)
-- =================================================================
DO $$
BEGIN
    -- public.sp_register_user
    BEGIN
        ALTER FUNCTION public.sp_register_user(uuid, varchar, varchar, text, varchar) SET search_path = public;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'No se pudo alterar search_path para sp_register_user (uuid, varchar, varchar, text, varchar): %', SQLERRM;
    END;
    BEGIN
        ALTER FUNCTION public.sp_register_user(uuid, text, text, text, text) SET search_path = public;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'No se pudo alterar search_path para sp_register_user (uuid, text, text, text, text): %', SQLERRM;
    END;

    -- public.f_unaccent
    BEGIN
        ALTER FUNCTION public.f_unaccent(text) SET search_path = public, extensions;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'No se pudo alterar search_path para f_unaccent: %', SQLERRM;
    END;

    -- public.match_documents (vector, double precision, integer)
    BEGIN
        ALTER FUNCTION public.match_documents(extensions.vector, double precision, integer) SET search_path = public;
    EXCEPTION WHEN OTHERS THEN
        BEGIN
            ALTER FUNCTION public.match_documents(public.vector, double precision, integer) SET search_path = public;
        EXCEPTION WHEN OTHERS THEN
            BEGIN
                ALTER FUNCTION public.match_documents(vector, double precision, integer) SET search_path = public;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'No se pudo alterar search_path para match_documents: %', SQLERRM;
            END;
        END;
    END;

    -- public.update_updated_at_column
    BEGIN
        ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'No se pudo alterar search_path para update_updated_at_column: %', SQLERRM;
    END;

    -- public.find_courses_by_career_name
    BEGIN
        ALTER FUNCTION public.find_courses_by_career_name(text) SET search_path = public;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'No se pudo alterar search_path para find_courses_by_career_name: %', SQLERRM;
    END;

    -- public.handle_updated_at
    BEGIN
        ALTER FUNCTION public.handle_updated_at() SET search_path = public;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'No se pudo alterar search_path para handle_updated_at: %', SQLERRM;
    END;
END $$;

-- =================================================================
-- 6. RESTRICCIÓN DE EJECUCIÓN PÚBLICA EN sp_register_user
-- =================================================================
DO $$
BEGIN
    REVOKE EXECUTE ON FUNCTION public.sp_register_user(uuid, varchar, varchar, text, varchar) FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
    REVOKE EXECUTE ON FUNCTION public.sp_register_user(uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- =================================================================
-- 7. RESTRICCIÓN DE LISTADO EN EL BUCKET portadas (STORAGE)
-- =================================================================
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Access" ON storage.objects;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'No se pudo remover la política Public Access de storage.objects: %', SQLERRM;
END $$;
