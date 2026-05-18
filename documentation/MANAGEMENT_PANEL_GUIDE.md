# 🛠️ Guía Técnica: Panel de Gestión - Hub Academia

Este documento detalla el funcionamiento técnico, flujos de datos y lógica de negocio de los módulos que componen el Panel de Administración de Hub Academia. Toda la información ha sido auditada directamente del código fuente.

---

## 1. 📊 Dashboard y Análisis de Tendencias
El Dashboard es el centro de control donde se visualiza la salud de la plataforma.

*   **KPIs de Tráfico:** 
    *   **Visitas en Vivo:** Rastrea usuarios activos en tiempo real (Socket/Analytics).
    *   **Visitas Únicas (Hoy):** Cuenta usuarios distintos que han accedido en las últimas 24 horas.
*   **Ranking de Recursos:** 
    *   Se calcula mediante el conteo de clics/vistas (`recordView`).
    *   **Audiencia:** Registra métricas de dos perfiles:
        1.  **Usuarios Registrados:** Conteo vinculado a su `user_id` para historiales personalizados.
        2.  **Visitantes (Invitados):** Conteo basado en `session_id` persistente para medir el interés del tráfico orgánico.
    *   **Alcance:** El ranking de "Top Recursos" diferencia tipos automáticamente (PDFs, Guías, Videos, Libros) permitiendo identificar qué formato genera más engagement.
*   **IA de Tendencias:** 
    *   **Funcionamiento Local:** El sistema exporta la base de datos a CSV y ejecuta un script en Python (`run_batch.py`) de forma local para predecir temas en tendencia y libros recomendados.
    *   **Seguridad:** Toda la data se procesa en el servidor local (`data_dump/`), protegiendo la privacidad del usuario.

---

## 2. 📑 Módulo de Recursos (Multimedia y Documentación)
El sistema ha evolucionado de una "Biblioteca de Libros" a un repositorio multimedia versátil.

### Tipos de Contenido Soportados:
1.  **Videos (YouTube/Vimeo):**
    *   **Detección:** El sistema extrae automáticamente el ID de los enlaces de YouTube.
    *   **Visualización:** Se abren en un **Modal de Video** personalizado con soporte `autoplay` e interfaz cinematográfica.
    *   **Interfaz Premium:** Las tarjetas de video cuentan con un diseño distintivo, etiquetas de "Premium" (coroncica) y estados de bloqueo sugerentes (desenfoque ligero) que incitan a la suscripción sin ocultar el valor.
    *   **Móvil:** Diseño responsivo que optimiza el tamaño del reproductor y asegura que los controles de YouTube (adelantar/retroceder) sean siempre accesibles mediante un "Safe Area" inferior.
    *   **Tipos de Recursos:** Se clasifican específicamente en *Normas Técnicas*, *Guías de Práctica Clínica*, *Papers/Artículos*, *Libros Históricos*, *Videos Explicativos*, e *Infografías/Otros*.
3.  **Seguridad y Acceso:**
    *   **Ofuscación:** Las URLs reales no se exponen en el HTML; se gestionan mediante un registro seguro en `uiManager.js`.
    *   **Pases (Vidas):** Los recursos marcados como **Premium** descuentan pases a usuarios gratuitos cada vez que se desbloquean.
    *   **Interceptación Directa (UI):** Para los recursos con página web dedicada (`/resource.html`), el candado Premium actúa directamente al intentar hacer clic en la tarjeta (`components.js`). Si el usuario es visitante o agotó sus vidas, el sistema levanta nativamente el **Modal de Autenticación** o el **Paywall Modal** bloqueando el acceso a la vista dedicada sin consumos de base de datos innecesarios ni filtraciones de links.

### Administración de Recursos:
*   **Editor Pro (TinyMCE 6):** Migración completa de Quill.js a **TinyMCE 6** (Mini-Word) para la gestión de resúmenes enriquecidos.
    *   **Tablas de Datos:** Soporte nativo para crear y editar tablas complejas (estilo Excel) con control de celdas, bordes y alineación.
    *   **Estética Pro:** Selector de colores de fuente/fondo, encabezados jerárquicos y formato de listas avanzadas.
    *   **Modo Oscuro Editorial:** Configuración `oxide-dark` que garantiza que el texto sea perfectamente legible (blanco) durante el proceso de edición, eliminando el problema del texto invisible.
    *   **Espacio de Trabajo:** El modal de edición se ha ampliado a **1100px** de ancho y **95vh** de alto para maximizar el área de redacción científica.
*   **Buscador con Filtro Dual:** El panel `admin.js` ahora incorpora filtrado en tiempo real por el tipo exacto (`book`, `paper`, `guia`, `norma`, `video`, `other`), combinándose instantáneamente con la barra de texto (`admin-search-input`) permitiendo curar catálogos sin latencias de red.

---

## 3. 🧠 Módulo de Preguntas e IA (Multi-Dominio)
Es el core académico de la plataforma, diseñado para simular exámenes de alto nivel tanto en **Ciencias de la Salud** (Medicina, Enfermería, Obstetricia) como en **Educación** (Docente Pro).

### 3.1 Soporte de Dominios
El panel detecta el contexto y ajusta los formularios automáticamente:
*   **Medicina:** Targets como ENAM, SERUMS, RESIDENTADO. Áreas clínicas (Medicina Interna, Pediatría, etc.).
*   **Educación:** Targets como NOMBRAMIENTO, ASCENSO, ACCESO A CARGOS. Áreas pedagógicas (Comprensión Lectora, Currículo Nacional, Evaluación Formativa).

### 3.2 Generador RAG (Retrieval-Augmented Generation)
*   **Fuentes de Medicina:** Bibliografía de élite (Harrison, CTO) y Normas Técnicas MINSA.
*   **Fuentes de Educación:** Currículo Nacional (CNEB), Marco del Buen Desempeño Docente y Resoluciones Viceministeriales del MINEDU.
*   **Control de Calidad:** 
    *   **Anti-duplicidad:** Escaneo de los últimos 200 registros antes de inyectar.
    *   **Enfoque Constructivista:** Para el dominio educativo, la IA tiene prohibido generar respuestas conductistas o puramente memorísticas.
*   **Inyección Masiva (3 Botones):**
    1.  **Importar:** Permite subir archivos Excel/CSV con el campo `domain` definido para clasificar preguntas automáticamente.
    2.  **Generar IA:** Motor basado en **Gemini 2.0 Flash**. Permite seleccionar el dominio y las áreas de estudio específicas para generar lotes de 5 preguntas de alta fidelidad.
    3.  **Nueva:** Formulario manual que cambia sus opciones de target y carrera según el dominio seleccionado en tiempo real.

---

## 4. 🎓 Módulo de Carreras y Cursos
Gestión de la malla curricular y su relación con el material de estudio.

*   **Carreras:** Clasificadas por Áreas (Salud, Ingeniería, etc.) con portadas personalizadas.
*   **Cursos:** 
    *   **Gestor de Unidades:** Permite estructurar el contenido en Unidades (I, II, III).
    *   **Asociación Inteligente:** Un curso se vincula a múltiples carreras y temas específicos.
*   **Temas:** Actúan como el "puente" que vincula los cursos con los recursos bibliográficos.

---

## 5. 👥 Módulo de Alumnos
Administración de la base de usuarios de la plataforma.

*   **Registro Admin:** Permite dar de alta alumnos manualmente.
*   **Contraseñas:** Al crear un alumno, el sistema genera automáticamente una **contraseña temporal de 8 caracteres** alfanuméricos para su primer acceso.
*   **Vínculos:** Cada alumno tiene un seguimiento de su progreso, vidas gastadas y estado de suscripción.

---

## 6. 🔄 Sincronización Masiva (Google Drive)
Optimización de la carga de bibliografía y guías clínicas mediante el escaneo de carpetas de Drive.

*   **Funcionamiento:** 
    *   Permite importar decenas de archivos (PDFs, Videos, Documentos) en un solo paso.
    *   **Identificador de Carpeta:** Se obtiene de la URL de Drive (ej: `https://drive.google.com/drive/folders/ID_AQUI`).
    *   **Lógica de Actualización:** Si agregas archivos nuevos a una carpeta ya sincronizada, el sistema los detecta e inserta sin duplicar los existentes (Upsert).
*   **Controles de Lote Pre-Sincronización (Switches iOS Modernos) 👑👁️⚡:**
    *   **Acceso Premium:** Configura todo el lote importado como contenido Premium con descuento de pases/vidas para usuarios gratuitos.
    *   **Visible al Público:** Permite activar o desactivar la visibilidad de todo el lote en los buscadores y catálogos de estudiantes al instante.
    *   **Apertura Inmersiva:** Si se activa, todos los archivos del lote sincronizado se configurarán para omitir la página de detalles y abrirse instantáneamente al hacer un clic en el visor modal.
*   **Persistencia de Miniaturas (GCS):** 
    *   **Generación Automática:** Durante el escaneo, el sistema descarga la miniatura de alta resolución de Drive.
    *   **Optimización WebP:** La imagen se procesa con Sharp para reducir su peso y se sube permanentemente al Bucket de Google Cloud Storage (`/thumbnails`).
    *   **Estabilidad:** Al estar guardadas en GCS, las miniaturas ya no dependen de la API de Drive para visualizarse, eliminando errores de carga (404) en el frontend.
*   **Atribución de Autor:** Permite definir un autor universal (ej: "MINSA", "AMIR") para todo el lote sincronizado.

---

## 7. 🛠️ Reglas de Operación (Resumen Técnico)
*   **Imágenes:** Portadas y miniaturas se guardan en el servidor (`assets/`) y se gestionan mediante `FormData` para subida fluida.
*   **KPI Financiero:** El panel estima ganancias basándose en la suscripción activa (s/ 9.90 mensual).
*   **Ofuscación de Enlaces:** Implementada para proteger la integridad de los recursos compartidos.

---
> [!IMPORTANT]
> Esta guía ha sido verificada contra el código fuente al 30 de marzo de 2026. Cualquier cambio en la lógica de `MLService.js` o `admin.js` debe ser reflejado aquí.
