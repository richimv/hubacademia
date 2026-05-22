-- SCRIPT PARA CREAR LA TABLA DE NOTAS EN SUPABASE/POSTGRES
-- Ejecutar esto en el SQL Editor de Supabase

-- 1. Crear la tabla
CREATE TABLE IF NOT EXISTS public.user_notes (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source_type TEXT DEFAULT 'manual', -- 'chat', 'flashcard', 'manual'
    source_conversation_id BIGINT, -- Opcional: referencia al chat original
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar RLS (Seguridad a nivel de fila)
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;

-- 3. Crear políticas de acceso
-- Los usuarios solo pueden ver sus propias notas
CREATE POLICY "Usuarios pueden ver sus propias notas" 
ON public.user_notes FOR SELECT 
USING (auth.uid() = user_id);

-- Los usuarios solo pueden insertar sus propias notas
CREATE POLICY "Usuarios pueden crear sus propias notas" 
ON public.user_notes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Los usuarios solo pueden actualizar sus propias notas
CREATE POLICY "Usuarios pueden editar sus propias notas" 
ON public.user_notes FOR UPDATE 
USING (auth.uid() = user_id);

-- Los usuarios solo pueden borrar sus propias notas
CREATE POLICY "Usuarios pueden borrar sus propias notas" 
ON public.user_notes FOR DELETE 
USING (auth.uid() = user_id);

-- 4. Crear trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_notes_updated_at
    BEFORE UPDATE ON public.user_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Confirmación
COMMENT ON TABLE public.user_notes IS 'Almacena notas personales de los usuarios creadas desde el chat o manualmente.';
