CREATE TABLE IF NOT EXISTS public.languages (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL, -- 'en-US', 'en-GB', 'it-IT'
    name VARCHAR(50) NOT NULL,        -- 'English (USA)', 'English (UK)', 'Italiano'
    tts_voice VARCHAR(50) NOT NULL,   -- Voz neural de Google Cloud TTS
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inserción de Idiomas Iniciales
INSERT INTO public.languages (code, name, tts_voice) VALUES 
('en-US', 'English (USA)', 'en-US-Neural2-F'),
('en-GB', 'English (UK)', 'en-GB-Neural2-F'),
('it-IT', 'Italiano', 'it-IT-Neural2-A')
ON CONFLICT (code) DO UPDATE SET tts_voice = EXCLUDED.tts_voice;

-- Alteración de question_bank para soportar el texto de audio (Listening Comprehension)
ALTER TABLE public.question_bank ADD COLUMN IF NOT EXISTS audio_text TEXT;
