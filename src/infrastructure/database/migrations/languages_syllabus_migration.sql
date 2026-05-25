-- 1. Tabla de Temarios Estáticos
CREATE TABLE IF NOT EXISTS public.languages_syllabus (
    id SERIAL PRIMARY KEY,
    language_code VARCHAR(10) NOT NULL REFERENCES public.languages(code) ON DELETE CASCADE,
    level VARCHAR(10) NOT NULL, -- 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'
    unit_number INT NOT NULL,
    topic_name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Progreso del Temario
CREATE TABLE IF NOT EXISTS public.user_language_progress (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    syllabus_id INT NOT NULL REFERENCES public.languages_syllabus(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT TRUE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_language_progress_pkey PRIMARY KEY (id),
    CONSTRAINT user_syllabus_unique UNIQUE (user_id, syllabus_id)
);

-- 3. Tabla de Vocabularios Privados
CREATE TABLE IF NOT EXISTS public.user_vocabularies (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    language_code VARCHAR(10) NOT NULL REFERENCES public.languages(code) ON DELETE CASCADE,
    level VARCHAR(10) NOT NULL, -- 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'
    word VARCHAR(100) NOT NULL,
    translation VARCHAR(255) NOT NULL,
    definition TEXT,
    example_sentence TEXT,
    audio_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT user_vocabularies_pkey PRIMARY KEY (id)
);

-- 4. Seguridad RLS
ALTER TABLE public.languages_syllabus ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Syllabus" ON public.languages_syllabus;
CREATE POLICY "Public Read Syllabus" ON public.languages_syllabus FOR SELECT USING (true);

ALTER TABLE public.user_language_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own progress" ON public.user_language_progress;
CREATE POLICY "Users can manage own progress" ON public.user_language_progress
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.user_vocabularies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own vocabulary" ON public.user_vocabularies;
CREATE POLICY "Users can manage own vocabulary" ON public.user_vocabularies
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Semillas del Temario Inicial (English & Italiano)
INSERT INTO public.languages_syllabus (language_code, level, unit_number, topic_name, description) VALUES
-- Inglés A1
('en-US', 'A1', 1, 'Present Simple & Verbo To Be', 'Uso del presente simple y conjugación del verbo fundamental de estado.'),
('en-US', 'A1', 2, 'Pronombres y Determinantes', 'Pronombres sujeto, objeto y adjetivos posesivos.'),
('en-US', 'A1', 3, 'Present Continuous', 'Describir acciones en desarrollo y planes inmediatos.'),
-- Inglés A2
('en-US', 'A2', 1, 'Past Simple (Regulares e Irregulares)', 'Narración de eventos completados en el pasado.'),
('en-US', 'A2', 2, 'Comparativos y Superlativos', 'Estructuras de comparación física y cualitativa.'),
('en-US', 'A2', 3, 'Preposiciones de Lugar y Tiempo', 'Correcto uso de "in", "on", "at" en contextos reales.'),
-- Italiano A1
('it-IT', 'A1', 1, 'Presente Indicativo & Ausiliari', 'Verbos en presente indicativo y el uso de Essere y Avere.'),
('it-IT', 'A1', 2, 'Articoli e Nomi', 'Género y número de sustantivos con sus artículos respectivos.'),
('it-IT', 'A1', 3, 'Numeri e Saluti', 'Vocabulario esencial de presentación y comunicación elemental.'),
-- Italiano A2
('it-IT', 'A2', 1, 'Passato Prossimo', 'Construcción del pasado utilizando el auxiliar idóneo (essere/avere).'),
('it-IT', 'A2', 2, 'Pronomi Diretti', 'Simplificación de complementos directos.'),
('it-IT', 'A2', 3, 'Preposizioni Articolate', 'Contracción gramatical de preposiciones comunes.')
ON CONFLICT DO NOTHING;
