# 🧠 Especificación Maestra de Arquitectura y Mapeo: Módulo Repaso / Flashcards (Web ↔ App Móvil)

> **Documento de Verdad y Coherencia de Negocio (Single Source of Truth)**  
> **Ámbito:** Plataforma Web (`hubacademia`) ↔ Aplicación Celular (`HubRepasoApp`)  
> **Fecha de Sincronización:** Agosto 2026  
> **Regla de Oro:** Cero invención. Todo componente, endpoint, entidad y flujo móvil debe ser un reflejo exacto y adaptado de las capacidades reales existentes en el sistema web.

---

## 1. 🏛️ Estructura de las 4 Capas (Clean Architecture)

```
========================================================================================================
CAPA                   WEB (hubacademia)                                  APP (HubRepasoApp)
========================================================================================================
1. PRESENTATION        • repaso.html / repaso.js (Dashboard & Decks)      • app/(tabs)/home.tsx (Mis Mazos / Mazos Oficiales)
                       • deck-explorer.js (Jerarquía y Árbol de Mazos)    • app/(tabs)/community.tsx (Comunidad & Filtro Áreas)
                       • flashcards.html / flashcards.js (Modo Estudio)   • app/deck/[id].tsx (Detalle, Submazos y Tarjetas)
                       • tutor-chat.js (Tutor IA Contextual Multitema)    • app/study/session.tsx (Sesión de Repaso SM-2 3D)
                       • repaso.css / flashcards.css                      • components/Flashcard3D.tsx, RatingButtons, etc.

2. APPLICATION         • deckController.js                                • application/context/AuthContext.tsx
                       • flashcardController.js                           • application/hooks/useDecks.ts
                       • checkAILimitsMiddleware.js                       • application/hooks/useStudySession.ts

3. DOMAIN              • deckService.js / flashcardService.js             • domain/types/repaso.ts
                       • flashcardRepository.js                           • domain/services/repasoService.ts
                       • Algoritmo SuperMemo-2 (SM-2 SRS)                 • domain/algorithms/sm2.ts
                       • Prompts de IA Flashcards y Tutor Contextual

4. INFRASTRUCTURE      • apiRoutes.js (/api/decks/*, /api/flashcard/*)    • infrastructure/network/NetworkService.ts
                       • Supabase Client (Tablas decks & user_flashcards) • infrastructure/storage/SecureStore.ts
                       • Google Cloud Storage (Imágenes y Audio TTS)      • infrastructure/api/repasoApi.ts
========================================================================================================
```

---

## 2. 🗄️ Esquema de Base de Datos Real (Supabase / PostgreSQL)

### 2.1 Tabla `decks` (Gestión Jerárquica y Temática de Mazos)
```sql
CREATE TABLE public.decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,                         -- Guía de Estudio enriquecida (HTML / Markdown)
    category VARCHAR(50) DEFAULT 'General',   -- 'Medicina', 'Educación', 'Derecho', 'Idiomas', 'Tecnología', 'Ciencia', 'General'
    type VARCHAR(20) DEFAULT 'USER',          -- 'SYSTEM' (Mazos Oficiales), 'USER' (Mazos Creados)
    source_module VARCHAR(50) DEFAULT 'MANUAL',-- 'MANUAL', 'AI_GENERATED', 'QUIZ_FAILURE'
    icon VARCHAR(50) DEFAULT '📚',            -- Emoji o identificador de icono
    is_public BOOLEAN DEFAULT false,          -- Visibilidad en la sección Comunidad
    parent_id UUID REFERENCES public.decks(id),-- Soporte de carpetas y submazos multinivel
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### 2.2 Tabla `user_flashcards` (Tarjetas de Repaso Espaciado SM-2)
```sql
CREATE TABLE public.user_flashcards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    deck_id UUID REFERENCES public.decks(id) ON DELETE CASCADE,
    front_content TEXT NOT NULL,              -- Pregunta / Disparador Mental (máx. 1,000 chars)
    back_content TEXT NOT NULL,               -- Respuesta / Concepto Atómico (máx. 1,000 chars)
    topic VARCHAR(100),                       -- Subtema o etiqueta clínica/pedagógica
    repetition_number INTEGER DEFAULT 0,      -- Veces repasada con éxito
    easiness_factor REAL DEFAULT 2.5,         -- Factor de facilidad SM-2 (mínimo 1.3)
    interval_days INTEGER DEFAULT 0,          -- Intervalo en días hasta el próximo repaso
    last_reviewed_at TIMESTAMP WITH TIME ZONE,
    next_review_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    image_url TEXT,                           -- Imagen en Anverso (GCS / Web)
    explanation_image_url TEXT,               -- Imagen en Reverso
    audio_url_frente TEXT,                    -- Audio TTS Neural para Anverso
    audio_url_dorso TEXT,                     -- Audio TTS Neural para Reverso
    tts_lang_frente VARCHAR(10),              -- 'es-ES', 'en-US', 'fr-FR', 'it-IT', 'de-DE'
    tts_lang_dorso VARCHAR(10),
    hide_text_frente BOOLEAN DEFAULT false,   -- Modo Listening (oculta texto hasta presionar play)
    hide_text_dorso BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

---

## 3. 🎯 Entidades Reales y Modelos de Negocio

### 3.1 Categorías Temáticas Oficiales (`categories`)
1. **Medicina** (Casos clínicos, diagnóstico, farmacología)
2. **Educación** (Pedagogía CNEB, teorías de aprendizaje, didáctica)
3. **Derecho** (Doctrina jurídica, códigos, jurisprudencia)
4. **Idiomas** (Vocabulario puro, pronunciación, gramática)
5. **Tecnología** (Programación, algoritmos, arquitectura de software)
6. **Matemáticas** (Fórmulas, teoremas, cálculo)
7. **Historia** (Cronologías, hitos, acontecimientos)
8. **Ciencia** (Física, química, biología)
9. **General** (Conocimientos generales)

---

### 3.2 Clasificación de Mazos
- **Mazos Oficiales (`type === 'SYSTEM'`):** Mazos curados por la plataforma. Solo lectura para el usuario común.
- **Mis Mazos Creados (`type === 'USER'`):** Mazos personales organizables en submazos (carpetas), editables y exportables.
- **Comunidad (`is_public === true`):** Mazos compartidos por otros usuarios, clonables y filtrables por categoría.

---

### 3.3 Motor de Repetición Espaciada (Algoritmo SM-2 Adaptado)
Durante la sesión de estudio, el usuario voltea la tarjeta (Giro 3D / Flip) y califica su grado de recuerdo:

| Calificación Visual | Botón | Quality Algorítmico | Comportamiento del Algoritmo | Intervalo Inicial |
| :--- | :--- | :--- | :--- | :--- |
| 🔴 **Otra vez** | Rating 1 | `quality = 0` | Reset de repeticiones (`reps = 0`). Se recalcula dentro de 1 min. | `< 1 min` |
| 🟠 **Difícil** | Rating 2 | `quality = 3` | Acierto con esfuerzo. Se reduce ligeramente el Factor EF. | `1 día` |
| 🔵 **Bien** | Rating 3 | `quality = 4` | Acierto estándar. Multiplica intervalo por EF. | `3 días` |
| 🟢 **Fácil** | Rating 4 | `quality = 5` | Acierto instantáneo. Aumenta el Factor EF. | `7 días` |

---

## 4. 🔌 Endpoints de la API Backend (`/api/decks/*` y `/api/flashcard/*`)

### Mazos:
- `GET /api/decks/public`: Mazos públicos para la pestaña Comunidad (soporta `?category=Medicina`).
- `GET /api/decks/tree`: Árbol jerárquico completo de carpetas y submazos.
- `GET /api/decks`: Lista de mazos del usuario (o submazos mediante `?parentId=uuid`).
- `GET /api/decks/:deckId`: Detalle de un mazo con conteo de tarjetas y tarjetas pendientes (`due_cards`).
- `GET /api/decks/:deckId/guide`: Guía de estudio enriquecida del mazo (Lazy Loading).
- `POST /api/decks`: Crear nuevo mazo o submazo (Cobra vida en usuarios Free).
- `PUT /api/decks/:deckId`: Actualizar nombre, descripción o categoría.
- `PUT /api/decks/:deckId/visibility`: Hacer público o privado un mazo.
- `POST /api/decks/:deckId/clone`: Clonar un mazo de la comunidad a "Mis Mazos".
- `DELETE /api/decks/:deckId`: Eliminación de mazo con cascada sobre imágenes y submazos.

### Tarjetas:
- `GET /api/decks/:deckId/cards`: Listado de tarjetas de un mazo.
- `POST /api/decks/:deckId/cards`: Crear nueva tarjeta individual con soporte de imagen y audio TTS.
- `PUT /api/cards/:cardId`: Actualizar contenido de anverso/reverso.
- `DELETE /api/cards/:cardId`: Eliminar tarjeta individual.
- `GET /api/decks/:deckId/cards/due`: Cola de tarjetas listas para repasar hoy en el mazo.
- `GET /api/flashcard/due`: Cola de tarjetas listas para repasar hoy de todos los mazos del usuario.
- `POST /api/flashcard/review`: Registrar calificación SM-2 (`cardId`, `quality`, `currentInterval`, `currentEf`, `currentReps`).
- `POST /api/decks/:deckId/generate`: Generación automática de flashcards con Gemini IA a partir de un tema.
- `POST /api/chat`: Tutor IA contextual de la flashcard (`context: 'flashcard_tutor'`, inyectando `deckCategory`, `front`, `back`).
