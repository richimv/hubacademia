# 📚 Documentación Consolidada: Mi Biblioteca (Hub Academia)

## 1. 🌟 Visión General y Filosofía de Diseño
**Mi Biblioteca** (`/library`) es el centro de conocimiento, investigación y aprendizaje personalizado de **Hub Academia**. Ha sido diseñada bajo una arquitectura **EdTech Senior, Minimalista y Responsiva**, integrando en un solo espacio:
- **Descubrimiento de Conocimiento:** Catálogo unificado de recursos para los sectores de **Salud (Medicina)** y **Educación**.
- **Boletín de Novedades (Mensual / 30 Días):** Curación periódica e ingesta en vivo de noticias gubernamentales oficiales, normas técnicas, guías clínicas e investigaciones científicas traducidas al español.
- **Buscador Inteligente Senior:** Búsqueda en caliente con auto-reset, botón de limpieza rápida `X`, soporte para tecla `Escape` y lupa responsiva en celulares.
- **Suite de Estudio Personal:** Gestión de recursos guardados, favoritos y tablón de notas vinculado al Tutor IA.
- **Visor Inmersivo Universal:** Lectura y estudio de documentos sin salir del dominio de la plataforma.

---

## 2. 📂 Clasificación de Recursos Educativos
La plataforma clasifica automáticamente cada publicación y material en su sector correspondiente (**Salud** o **Educación**):

| Tipo de Recurso | Identificador | Descripción | Distintivo Visual (UI) |
| :--- | :--- | :--- | :--- |
| **Noticia Oficial** | `noticia` | Comunicados de prensa y noticias oficiales del MINEDU y MINSA. | Badge Morado + Glow Púrpura |
| **Paper Científico** | `paper` | Artículos clínicos e investigaciones peer-reviewed (PubMed, PMC, SciELO, Redalyc, Dialnet). | Badge Azul + Glow Azul |
| **Norma Técnica / Legal** | `norma` | Normas Técnicas de Salud (NTS), leyes y directivas oficiales. | Badge Ámbar + Glow Dorado |
| **Guía Clínica / Técnica**| `guia` | Guías de Práctica Clínica (GPC) y manuales técnicos. | Badge Esmeralda + Glow Verde |
| **Libro / Manual** | `book` | Bibliografía académica y textos de consulta histórica. | Tarjeta Estándar / Poster |
| **Video / Multimedia** | `video` | Clases grabadas, ponencias y recursos audiovisuales. | Tarjeta Multimedia |

---

## 3. 🖥️ Arquitectura UI/UX y Experiencia de Navegación

### A. Layout Elevado de Pantalla Completa (`library.html`)
- **Espacio Vertical Maximizado:** Se eliminó el título estático redundante "Mi Biblioteca" y textos secundarios, elevando la barra de pestañas `.library-tabs` directamente al tope del contenedor principal.
- **Divisor Académico:** Alternancia fluida entre sectores mediante el selector **SALUD | EDUCACIÓN**.

```
+-----------------------------------------------------------------------------------+
|  [Biblioteca de Recursos]    (Guardados)    (Favoritos)    (Notas)                 |  <- Tabs Elevadas al Tope
+-----------------------------------------------------------------------------------+
|  [ 🔍 Busca tu recurso académico...                           [x]  [ 🔍 Buscar ] ]|  <- Buscador Compacto con Clear 'X' y Lupa Mobile
+-----------------------------------------------------------------------------------+
|  SALUD  |  EDUCACIÓN                                                              |  <- Divisor de Sectores Académicos
|  [🔥 Novedades] [Libros y Manuales] [Papers Científicos] [Normas] [Guías] [Otros] |  <- Píldoras de Filtro
+-----------------------------------------------------------------------------------+
|  📰 WIDGET DE NOVEDADES Y BOLETÍN RECIENTE (ÚLTIMOS 30 DÍAS / MENSUAL)            |
|  +-----------------------------------------------------------------------------+  |
|  | [HERO CARD] Badge Resplandeciente + Título + Resumen + [Portada] + [Leer]  |  |  <- Layout con Soporte de Portada/Imagen
|  +-----------------------------------------------------------------------------+  |
|  | [GRILLA SECUNDARIA DE NOVEDADES] (Portadas + Badges + Metadatos)             |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

### B. Buscador Inteligente Senior (`search.js`)
- **Auto-Reset en Tiempo Real (`input` listener):** Si el usuario busca y posteriormente borra todo el texto ingresado en la barra, el sistema ejecuta `resetSearchToBrowse()` restaurando el widget de Novedades y el catálogo original sin necesidad de recargar la página.
- **Botón de Limpieza (`#searchClearBtn`):** Un botón `X` se despliega reactivamente en el campo de texto cuando hay caracteres ingresados. Al hacer clic, borra el campo, enfoca el cursor y restaura la vista inicial.
- **Teclas de Acceso Rápido:** Presionar la tecla `Escape` en el teclado cancela la búsqueda activa y regresa al catálogo.
- **Diseño Adaptativo Móvil:** En smartphones (<= 768px), el botón de búsqueda oculta su etiqueta de texto y se contrae a una lupa circular de 36px x 36px a la derecha del input de texto.

### C. Widget de Novedades y Boletín Reciente (30 Días / Mensual) (`components.js` & `browse.css`)
- **Alcance Temporal:** Muestra las publicaciones oficiales e investigaciones más recientes del **mes en curso (últimos 30 días)**.
- **Filtrado Estricto de Novedades (Normas y Noticias Exclusivamente):** Tanto en la consulta SQL (`bookRepository.js`: `r.resource_type IN ('norma', 'noticia')`) como en el componente UI (`components.js`: `createNewsBulletinWidgetHTML`), el boletín filtra de forma exclusiva **normas legales y noticias oficiales**, manteniendo papers en su sección académica y guías técnicas en su respectiva categoría.
- **Simetría Completa de Filtros en Salud y Educación (`search.js`):** El sector Educación dispone ahora del repertorio simétrico de 6 píldoras de navegación (*🔥 Novedades*, *Libros y Manuales*, *Papers Científicos*, *Normas y Directivas*, *Guías Técnicas* y *Otros Recursos*).
- **Tarjetas de Recursos con Difuminado Suave (`components.css`):**
  - Se redujo la densidad del degradado inferior en `.unified-resource-card.has-bg-image .urc-visual-overlay` a `linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.35) 35%, transparent 65%)`.
  - Esto despeja el 65% superior de la portada para exhibir con mayor luminosidad y detalle las miniaturas de libros y documentos sin sacrificar la legibilidad del texto en la zona inferior.
- **Estructura Plana y Control de Altura (Zero Box-in-a-Box):**
  - Contenedor plano `.news-bulletin-container` sin marcos dobles ni envoltorios decorativos.
  - Tarjeta principal `.news-lead-card` como contenedor único de 2 columnas (1.25fr / 0.75fr en desktop; 1 columna en móvil) con altura calibrada (`min-height: 220px; max-height: 270px;` en desktop) y padding moderado (`1.5rem 2rem;`), eliminando espacios vacíos desmedidos.
- **Adaptación de Imagen al Contenedor y Difuminado Exclusivo:**
  - La imagen `.news-lead-img` se posiciona de forma absoluta (`position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;`), adaptándose estrictamente al contenedor sin expandir la altura del mismo.
  - La difuminación suave mediante degradado (`linear-gradient`) aplica **únicamente al recurso principal**, desvaneciéndose hacia blanco `#ffffff` (claro) o negro `#0a0a0a` (oscuro).
  - Tarjetas secundarias `.news-item-card` en cuadrícula de 3 columnas con proporción `16:9` nítida y delimitada con borde inferior, **sin difuminación alguna**.
- **Sobriedad Editorial y Ausencia de Artificios:**
  - Prohibición total de insignias inventadas ("VERIFICADO", "EXPEDIENTE DIGITAL", "EDICIÓN OFICIAL"), puntos de ventana simulados o icon clutter.
  - La jerarquía se sostiene exclusivamente en kickers tipográficos, títulos claros, fuentes y botones discretos.

### D. Página de Destino (`/resource?id=X`) y Visor Inmersivo
- **Página de Destino:** Presenta la portada en gran tamaño, metadatos de autoría, botones de acción (*Estudiar*, *Descargar*, *Guardar*) y resumen factual estilo enciclopedia.
- **Visor Inmersivo Universal (Full Screen):** Permite estudiar PDFs, videos (MP4/YouTube) y documentos directamente en pantalla completa sin salir del dominio de Hub Academia.
- **Descargas Directas:** Los archivos en Google Cloud Storage (GCS) se descargan nativamente con el parámetro `download=true` notificando las cabeceras `Content-Disposition`.

---

## 4. 🔒 Control de Acceso y Pestañas Privadas

La biblioteca adapta sus pestañas según el estado de la sesión del usuario:

- **Biblioteca de Recursos (`resources`):** Catálogo general público, buscador avanzado y boletín de novedades. Disponible para todos los visitantes.
- **Guardados (`saved`):** Colección privada de recursos guardados por el estudiante (Requiere inicio de sesión).
- **Favoritos (`favorites`):** Cursos y recursos destacados con el icono de corazón (Requiere inicio de sesión).
- **Notas (`notes`):** Editor de Notas Premium y tablón moderno de notas personales (Requiere inicio de sesión).

> 💡 **Protección de Invitados (`guest-mode`):** Si no hay una sesión activa (`user === null`), las pestañas *Guardados*, *Favoritos* y *Notas* se ocultan automáticamente (`display: none !important`). Si un visitante intenta ingresar por URL (ej. `/library?tab=saved`), el controlador lo redirige de forma limpia a `resources`.

---

## 5. 🛠️ Tablón de Notas Personales y Modal Canónica Universal (Sección 3.17)

- **Guardado Directo desde el Chat:** Cada respuesta generada por el Tutor IA incluye el control de un clic **"Guardar como Nota"**, formateando y almacenando el contenido en la biblioteca del estudiante.
- **Creación Manual de Notas (`openNoteModal`):** Permite al estudiante redactar notas de estudio desde cero a través del botón "Nueva Nota" en el tablón, delegando limpiamente a `openNoteEditor(noteId)` en `libraryUI.js`.
- **Modal Canónica de Notas (Estándar Universal de Modales):**
  - **Estructura Estricta de 4 Capas:** `.modal-overlay.note-modal-overlay` > `.modal-content.note-modal` > `.modal-header` con `<h2>` + `.modal-close-btn` > `.modal-body` con scroll confinado > `.modal-footer`.
  - **Tokens Dinámicos Dual-Theme:** El editor de notas consume estrictamente `var(--input-bg)` y `var(--border-color)` en lugar de tonos rígidos, garantizando legibilidad nítida con fondo claro y borde suave en tema claro, y mate slate en tema oscuro.
  - **Grupo de Acción en Modo Edición (`#note-edit-actions`):** Contiene de forma exclusiva el botón secundario **"Cancelar"** (`.btn-action.btn-secondary-action`) y el botón primario **"Guardar"** (`.btn-action.btn-primary`), erradicando botones huérfanos o duplicados.
  - **Grupo de Acción en Modo Lectura (`#note-view-actions`):** Proporciona **"Eliminar"** (`.btn-secondary-action.note-delete-btn`), **"Cerrar"** (`.btn-secondary-action`) y **"Editar"** (`.btn-primary`).
- **Visualización en Tarjetas Modernas (`.note-card`):** Sustituye los listados planos por tarjetas visuales con indicador cromático.
- **Herramientas de Tablón (`.notes-toolbar`):**
  - **Buscador de Notas:** Filtrado en caliente por palabras clave en título o contenido en cápsula redondeada de 44px.
  - **Selector de Orden:** Organiza notas por fecha (Recientes/Antiguas), alfabéticamente (A-Z), por color asignado o por origen (Chat / Manual).

---

## 6. 🗄️ Modelo de Datos y Seguridad (PostgreSQL & Supabase RLS)

```sql
-- Tabla Principal de Recursos Educativos
CREATE TABLE IF NOT EXISTS public.resources (
    id SERIAL PRIMARY KEY,
    resource_id VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255),
    url VARCHAR(255) UNIQUE,
    image_url VARCHAR(500),
    resource_type VARCHAR(50) DEFAULT 'book', -- 'paper', 'norma', 'guia', 'noticia', 'book', 'video', 'other'
    is_premium BOOLEAN DEFAULT false,
    content_html TEXT,
    domain VARCHAR(50) DEFAULT 'medicine',   -- 'medicine', 'education'
    visible BOOLEAN DEFAULT true,
    open_directly BOOLEAN DEFAULT false
);

-- Relación de Recursos Guardados por Usuario
CREATE TABLE IF NOT EXISTS public.user_book_library (
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    book_id INTEGER REFERENCES public.resources(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, book_id)
);

-- Tabla de Notas Personales
CREATE TABLE IF NOT EXISTS public.user_notes (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'manual', -- 'chat', 'manual'
    color VARCHAR(20) DEFAULT '#3b82f6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

- **Seguridad RLS (Row Level Security):** Políticas configuradas en Supabase asegurando que cada usuario acceda **únicamente a sus propios registros guardados y notas personales**, validando mediante `auth.uid()`.
- **Clean URLs:** Configurado mediante `"cleanUrls": true` en `vercel.json` y la ruta Express `/library` para navegación sin extensión `.html`.

---

## 7. 🤖 Curaduría Científica e Ingesta Automática (Antigravity 2.0)

La biblioteca se actualiza de forma autónoma mediante **Scheduled Tasks** en **Antigravity 2.0** a las **8:00 PM**:

1. **Ingesta Diaria de Noticias Oficiales (`0 20 * * *`)**:
   - Escanea diariamente los portales de noticias MINEDU ([gob.pe/institucion/minedu/noticias](https://www.gob.pe/institucion/minedu/noticias)) y MINSA ([gob.pe/institucion/minsa/noticias](https://www.gob.pe/institucion/minsa/noticias)).
   - Extrae noticias del día con deduplicación por URL y almacena con `resource_type: "noticia"`.
2. **Ingesta Semanal de Papers Científicos (`0 20 * * 1`)**:
   - Escanea PubMed, PMC, SciELO, Redalyc y Dialnet en la ventana de los **últimos 7 días**.
   - Garantiza mínimo **80% Papers Científicos** (`resource_type: "paper"`).
   - **Traducción e Interpretación Hispana:** Traduce títulos en inglés al español técnico y elabora la síntesis factual en español de 2 a 3 líneas para `content_html`.
3. **Verificación Anti-Soft-404:** Todo recurso es analizado mediante `read_url_content` e inspección HTTP antes de insertarse en la BD. Si la URL devuelve 404, Soft-404 o paywall bloqueado, es descartada automáticamente.

---

## 🧪 Verificación y Suite de Pruebas Unitarias
El sistema de biblioteca y el ecosistema completo cuentan con una suite de pruebas unitarias pasando al **100% (57/57 test suites, 477/477 pruebas pasando en verde)**.
