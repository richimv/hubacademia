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

## 4. 🛠️ Detalles Técnicos (Para Desarrolladores)

### Base de Datos (PostgreSQL)
- **Tabla `user_book_library`**: Gestiona la relación entre el usuario y los recursos (libros, videos, etc.).
- **Tabla `user_notes`**: Almacena las notas de texto puro o provenientes del chat.
  - Columnas: `id`, `user_id`, `title`, `content`, `type` ('chat' o 'manual'), `created_at`, `updated_at`.

### Seguridad (RLS - Row Level Security)
- Se han implementado políticas de **Supabase RLS** para asegurar que cada usuario SOLO pueda ver, crear, editar o eliminar sus propias notas y biblioteca.
- La identidad se valida mediante el `user_id` vinculado al `auth.uid()` de Supabase.

---

## 5. 🚀 Próximas Mejoras
- [ ] Soporte para imágenes dentro de las notas.
- [ ] Exportación de notas a PDF.
- [ ] Vincular notas directamente a mazos de Flashcards para repaso espaciado.
