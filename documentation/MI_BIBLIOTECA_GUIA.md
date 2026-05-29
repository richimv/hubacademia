# 📚 Guía de Usuario: Mi Biblioteca (Personal Library)

## 1. 🌟 Visión General
**Mi Biblioteca** es el centro de conocimiento personalizado de cada estudiante en Hub Academia. Permite centralizar recursos educativos de la plataforma, así como generar y gestionar notas propias, integrándose perfectamente con el Tutor IA y el sistema de Flashcards.

---

## 2. 📂 Estructura de Recursos
La biblioteca organiza automáticamente el contenido según su naturaleza:
- **Libros**: Textos completos y bibliografía oficial.
- **Papers**: Artículos científicos y publicaciones de investigación.
- **Guías**: Guías de Práctica Clínica (GPC) y manuales.
- **Normas**: Normas Técnicas de Salud (NTS) y reglamentos legales.
- **Videos**: Clases grabadas y material multimedia.
- **Otros**: Recursos complementarios.

---

## 3. 📝 Gestión de Notas (Personal Notes)
El sistema incluye un **Editor de Notas Premium** con las siguientes capacidades:

### A. Guardar desde el Chat
- Cada respuesta del Tutor IA (Chat General o Tutor de Flashcards) incluye un icono de **"Guardar como Nota"**.
- Al hacer clic, el contenido se formatea automáticamente y se guarda en tu biblioteca.

### B. Creación Manual
- Puedes crear notas desde cero con un título personalizado.
- **Formato Inteligente**: Soporte para saltos de línea y visualización limpia.

### C. Organización y Limpieza
- **Favoritos**: Marca tus notas o recursos más importantes para acceso rápido.
- **Eliminación**: Gestión sencilla para mantener tu espacio de estudio ordenado.

---

---

## 4. 🛠️ Deta### Visualización y Navegación Dedicada (/library)
- **Modo Página Completa**: La biblioteca opera en una página web dedicada en `/library` (`library.html`).
- **Control de Pestañas**: La interfaz se divide estrictamente en 4 pestañas de estudio/catálogo:
  1. **Biblioteca de Recursos** (resources): Catálogo general público de recursos (libros, guías, normas) y buscador avanzado. Disponible para todos los usuarios. Excluye cursos y videos de los resultados de búsqueda.
  2. **Guardados** (saved): Recursos educativos guardados (requiere autenticación). Se muestran consistentemente en una grilla responsiva de alta calidad (6 columnas en PC / 3 en celulares) usando la plantilla premium universal de tarjetas de recursos (`createUnifiedResourceCardHTML`).
  3. **Favoritos** (favorites): Cursos y recursos destacados con el ícono de corazón (requiere autenticación). Se muestran consistentemente en la misma grilla responsiva de alta calidad.
  4. **Notas** (notes): Editor de Notas Premium y tablón moderno de notas personales (requiere autenticación).
- **Tablón de Notas Moderno (UI/UX)**: Se ha eliminado el listado clásico con icono genérico por una grilla premium de tarjetas de notas (`.note-card`) con una barra decorativa de color dinámico y controles rápidos (editar/eliminar). Incorpora una barra de herramientas (`.notes-toolbar`) que permite:
  - **Buscador interactivo**: Filtrado en caliente del listado según el título o contenido de la nota.
  - **Selector de Ordenación**: Organizar notas dinámicamente por fecha de creación (Recientes/Antiguas), alfabéticamente (A-Z), por color asignado, o agrupadas por origen (Chat, Flashcard o Manual).
- **Visibilidad y Control de Acceso**: Si el usuario no ha iniciado sesión, las pestañas privadas ("Guardados", "Favoritos" y "Notas") se ocultan automáticamente en el frontend. Si un visitante intenta forzar el acceso a ellas mediante parámetros de URL, se le redirige automáticamente a la pestaña pública "Biblioteca de Recursos".
- **Sincronización del Estado**: La URL cambia dinámicamente utilizando `window.history.replaceState` al alternar entre pestañas (`/library?tab=resources`, `/library?tab=saved`, `/library?tab=favorites`, `/library?tab=notes`).

### Menú Lateral Global y Colapsable (Sidebar)
- **Estructura Global**: La navegación del sitio se centraliza en una barra lateral global inyectada de forma dinámica por `js/ui/sidebar.js` y estilizada mediante `css/sidebar.css`.
- **Intercepción Local de Navegación**: Para evitar recargas completas del navegador al alternar entre pestañas de biblioteca desde el menú lateral (cuando el usuario ya está en `/library`), el script del sidebar intercepta los clics en los enlaces de biblioteca y conmuta la vista reactivamente usando `window.libraryUI.switchTab(tab)`.
- **Restauración Inteligente de Scroll**: El sidebar guarda dinámicamente su posición de scroll en `localStorage` y la restaura en cada renderizado y sincronización de estado de sesión, evitando saltos molestos o reinicios de scroll a la parte superior de la página.
- **Visibilidad Dinámica de Menús**: Los enlaces a pestañas privadas de biblioteca ("Guardados", "Mis Favoritos" y "Notas") se ocultan del sidebar dinámicamente si el usuario no tiene una sesión activa (`user === null`).
- **Modo Colapsable (Desktop)**: La barra se expande a `260px` y se colapsa a `70px` (iconos-only) al hacer clic en el botón de hamburguesa (`☰`). El estado se persiste en `localStorage` mediante la clave `sidebar_collapsed`.
- **Comportamiento Responsivo (Mobile)**: En dispositivos móviles (<= 768px), la barra se transforma en un panel deslizante lateral con un backdrop oscuro.

### Base de Datos (PostgreSQL)
- **Tabla `user_book_library`**: Gestiona la relación entre el usuario y los recursos (libros, videos, etc.).
- **Tabla `user_notes`**: Almacena las notas de texto puro o provenientes del chat.
  - Columnas: `id`, `user_id`, `title`, `content`, `type` ('chat' o 'manual'), `created_at`, `updated_at`, `color`.

### Seguridad (RLS - Row Level Security)
- Se han implementado políticas de **Supabase RLS** para asegurar que cada usuario SOLO pueda ver, crear, editar o eliminar sus propias notas y biblioteca.
- La identidad se valida mediante el `user_id` vinculado al `auth.uid()` de Supabase.

### Responsividad y Estilo de Cuadrículas de Biblioteca
- **Layout de Recursos (3 Columnas en Móvil / 6 en PC)**: El catálogo general de recursos (`.manta-content-grid`, `.books-grid`, `.documents-grid-premium`, `.medical-books-grid`) y las listas de biblioteca/búsqueda se configuran mediante Grid CSS de alta densidad:
  - **Celulares/Móviles (<= 768px)**: Muestran exactamente **3 columnas por fila** (`grid-template-columns: repeat(3, minmax(0, 1fr)) !important`) para un diseño responsivo y uniforme.
  - **PC/Escritorio (>= 769px)**: Muestran exactamente **6 columnas por fila** (`grid-template-columns: repeat(6, minmax(0, 1fr)) !important`).
  - Las tarjetas `.unified-resource-card` tienen un ancho adaptativo del `100%` con `box-sizing: border-box` para encajar perfectamente dentro de las celdas sin desbordar el viewport horizontal.
- **Scroll Horizontal de Píldoras y Categorías**: Para evitar el apilamiento vertical que rompe la estética en pantallas estrechas, los filtros de categorías (`.manta-filters-container` y `.library-category-filters`) implementan `display: flex !important; flex-wrap: nowrap !important; overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; width: 100% !important;` y sus elementos hijos (`.manta-filter-pill`, `.library-cat-btn`) tienen `flex-shrink: 0 !important; white-space: nowrap !important;`, habilitando un desplazamiento horizontal táctil nativo y fluido.
- **Buscador Compacto Horizontal**: La barra de búsqueda permanece en orientación horizontal en móviles. El botón de búsqueda oculta su texto y se contrae a una lupa circular de `36px x 36px` colocada a la derecha del campo de entrada de texto flexible.
- **Clean URLs en Producción**: Se implementó compatibilidad nativa para acceder a la biblioteca en `/library` sin necesidad de la extensión `.html`, usando `"cleanUrls": true` en `vercel.json` y la ruta Express `/library` en backend.

---

## 5. 🚀 Próximas Mejoras
- [ ] Soporte para imágenes dentro de las notas.
- [ ] Exportación de notas a PDF.
- [ ] Vincular notas directamente a mazos de Flashcards para repaso espaciado.- [ ] Exportación de notas a PDF.
- [ ] Vincular notas directamente a mazos de Flashcards para repaso espaciado.

