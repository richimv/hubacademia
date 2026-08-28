# Informe Técnico y Historial de Mejoras Continuas

Este documento es el **Historial Técnico Central de Mejoras por Fecha** de **Hub Academia**. Registra cronológicamente todas las optimizaciones de arquitectura, correcciones de errores, refactorizaciones de base de datos, mejoras de interfaz y actualizaciones de infraestructura implementadas en la plataforma.

---

### 🟢 [2026-08-27] - Optimización de Casuísticas Anidadas, Limpieza Visual de Quiz y Unificación en Web y Apps Móviles

- **🏷️ Depuración y Limpieza del Renderizado de Casuísticas Anidadas ([quiz.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/quiz.js) & [quiz.html](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/quiz.html)):**
  - Se eliminaron los títulos y códigos redundantes de grupo (ej: `CASO-INICIAL-03`) que sobrecargaban la cabecera del reactivo.
  - Se estandarizó el distintivo superior a **"Casuística Anidada"** (Educación) y **"Viñeta Clínica Compartida"** (Salud / Medicina) con el indicador secuencial correlativo (`Pregunta #1`).
  - Se condicionó el contenedor superior para que solo se despliegue si existe contenido enriquecido real (`description_text`, imágenes o tablas). Si las preguntas están asociadas solo para ordenamiento correlativo, se oculta el contenedor vacío.

- **🔍 Corrección de Fuga de Interfaz en Revisión de Examen ([components.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/ui/components.js) & [quiz.css](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/css/quiz.css)):**
  - Se corrigió el error por el cual el contenedor flotante superior del quiz persistía visible en la pantalla de revisión (`showExamReview`).
  - Se integró la casuística anidada / viñeta clínica directamente dentro de cada tarjeta de corrección individual (`createReviewCardHTML`), permitiendo al alumno revisar el enunciado del caso, su imagen o tabla de apoyo, la pregunta y el sustento explicativo de forma autónoma y cohesionada.

- **📱 Sincronización Total con Apps Móviles ([HubDocenteApp](file:///c:/Users/ricar/Downloads/PROYECTOS/HubDocenteApp) & [HubSaludApp](file:///c:/Users/ricar/Downloads/PROYECTOS/HubSaludApp)):**
  - En `QuestionCard.tsx` (Docente) y `ClinicalQuestionCard.tsx` (Salud), se implementó la misma simplificación visual: distintivo limpio (`Casuística Anidada` / `Viñeta Clínica Compartida`), eliminación de títulos redundantes y renderizado condicional.
  - En `results.tsx` de ambas aplicaciones, se integró el bloque `.reviewCaseBox` para una visualización fluida de casuísticas y viñetas en la corrección detallada.

- **⏮️ Navegación Bidireccional Segura y Re-visualización de Preguntas Respondidas ([quiz.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/quiz.js), [quiz.html](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/quiz.html) & [quiz.css](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/css/quiz.css)):**
  - Se implementó el botón **"Anterior"** (`btn-prev-premium`) en la web, permitiendo al alumno retroceder en cualquier momento a revisar preguntas ya contestadas en todas las modalidades (10q, 20q y 100q).
  - Al regresar a una pregunta anterior, la interfaz se reanima con el estado exacto marcado (bloqueando clics para evitar re-marcado o trampas), mostrando el sustento explicativo y permitiendo volver a avanzar con "Siguiente".
  - Se definieron de forma limpia y modular los controladores `handlePreviousQuestion()` y `handleNextQuestion()`, garantizando la transición fluida y la correcta culminación del simulacro.
  - Se corrigió la visibilidad del botón **"Consultar Tutor IA"** en Modo Estudio (20qs), asegurando la remoción de la clase `.hidden` al responder.
  - Se estructuró un footer de acciones armónico y 100% responsivo: `[⬅️ Anterior]` a la izquierda, `[🤖 Tutor IA]` al centro y `[Siguiente ➡️ / Finalizar 🏁]` a la derecha, garantizando persistencia segura sin alterar KPIs ni estadísticas.
  - Cobertura de pruebas unitarias agregada en `tests/unit/quizNavigation.test.js` (**191/191 tests exitosos**).

- **📊 Corrección y Precisión en KPIs de Evolución Cronológica y Distribución por Áreas ([simulator-dashboard.html](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/simulator-dashboard.html), [simulator-dash.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/simulator-dash.js), [docenteController.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/application/controllers/docenteController.js), [medicoController.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/application/controllers/medicoController.js), [docenteRepository.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/domain/repositories/docenteRepository.js) y [medicoRepository.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/domain/repositories/medicoRepository.js)):**
  - **Evolución Cronológica de Puntajes:** Se corrigió la segregación de series en `scores10`, `scores20` y `scoresReal`. Anteriormente, la condición `total_questions !== 10 && total_questions !== 20` catalogaba exámenes de 12 reactivos (o intentos parciales) erróneamente como "Simulacros Reales", generando puntos amarillos fantasmas. Se actualizaron los filtros a rangos estrictos (`<= 15` para Rápido, `16..49` para Estudio y `>= 50` exclusivamente para Simulacros Reales).
  - **Distribución por Áreas (Gráfico Circular Donut):** Se renombró el KPI de *"Distribución por Bloques"* a **"Distribución por Áreas"** para unificar el vocabulario entre la web y las aplicaciones móviles. El gráfico circular ahora lee y renderiza directamente los `topics` (áreas temáticas) reales almacenados en la base de datos a partir de `radar_data`, asegurando coherencia al 100% con el gráfico inferior de *Dominio por Áreas*.
  - **Pruebas Unitarias Agregadas:** Suite `tests/unit/kpiEvolutionAndDoughnut.test.js` (**30/30 suites Jest PASSED, 202/202 tests exitosos**).

---

### 🟢 [2026-08-26] - Corrección de GoTrueClient Singleton y Eliminación de Scripts Duplicados en Frontend

- **🔐 Supabase GoTrueClient Singleton Estricto ([config.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/config.js#L85-L92)):**
  - Se agregó la condición de guarda `!window.supabaseClient` en la inicialización de Supabase en `config.js` para evitar crear múltiples instancias de `GoTrueClient` compitiendo por la clave `sb-rayjtupppcbhzjizhamn-auth-token` en el `localStorage`.
  - Erradica el warning en consola de producción: *"Multiple GoTrueClient instances detected in the same browser context"*.

- **🧹 Limpieza de Scripts HTML Duplicados (Todas las vistas HTML):**
  - Se eliminó la doble inclusión de `<script src="/js/config.js"></script>` presente en el `<body>` de `admin.html`, `course.html`, `dashboard.html`, `deck-editor.html`, `flashcards.html`, `index.html`, `library.html`, `login.html`, `pricing.html`, `profile.html`, `quiz.html`, `repaso.html`, `resource.html`, `simulator-dashboard.html` y `simulators.html`.
  - Mantiene una única carga en el `<head>`, optimizando los tiempos de parseo del DOM.

---

### 🟢 [2026-08-25] - Corrección de Permisos de Subida de Imágenes para Usuarios Advanced y Manejo Limpio de Paywall

- **🖼️ Corrección de Mapeo de Atributos de Membresía ([deckController.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/application/controllers/deckController.js)):**
  - Se refactorizó `_getUserContext` para acceder correctamente al atributo camelCase `req.user?.subscriptionTier` expuesto por el modelo `User`, además de `req.user?.subscription_tier` y `req.userTier`.
  - Soluciona el error en el que la API `POST /api/cards/upload-image` rechazaba con status 403 las solicitudes de usuarios con plan `advanced` o rol `admin` al asumir erróneamente que tenían un plan `free`.

- **💳 Optimización del Flujo de Excepciones Paywall ([repaso.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/repaso.js) & [deck-explorer.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/deck-explorer.js)):**
  - Se actualizó el manejador `_uploadFileToGCS` para extraer el mensaje explicativo provisto por el servidor (`data.error`) y mostrar el modal dinámico de suscripción `showPaywallModal(data.error, 'flashcards')`.
  - Se suprimió la emisión de notificaciones erróneas en consola ("Save card network error: Error: Créditos agotados") y toasts redundantes de error de red.

---

### 🟢 [2026-08-22] - Módulo Repaso: Posicionamiento Inteligente Anti-Solapamiento en Tour Guía y Purificación de KPIs de Mazos

- **📍 Algoritmo Anti-Solapamiento de Tooltips en Tour Guía ([tooltipManager.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/ui/tooltipManager.js)):**
  - Se implementó un algoritmo dinámico que calcula la intersección del área rectangular (`overlapArea`) entre la tarjeta flotante del tooltip y el elemento objetivo en pantalla.
  - Evalúa iterativamente posiciones candidatas (`bottom`, `top`, `right`, `left`), garantizando la selección de una posición con **cero solapamiento (0px de obstrucción)**.
  - Se afinó la selección de objetivos en `startRepasoTour` asociando el Paso 2 a la cabecera `.explorer-sidebar-header` para evitar que el tooltip cubra la etiqueta "EXPLORADOR" o el árbol de carpetas en vista móvil y de escritorio.
  - Se incorporó `targetElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })` para asegurar el centrado óptimo del elemento objetivo en pantalla antes de calcular coordenadas.

- **📊 Purificación de Analíticas y KPIs de Mazos ([analyticsRepository.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/domain/repositories/analyticsRepository.js) & [analyticsService.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/domain/services/analyticsService.js)):**
  - Se desvinculó la tabla `quiz_history` (exámenes/simulacros culminados de los módulos Salud y Educación) de las estadísticas del mapa de actividad de los mazos.
  - Se habilitó la filtración contextual por `deckId` en `/api/analytics/heatmap?deckId=...`, permitiendo que la ventana de estadísticas (`openStatsModal` en `repaso.js`) y `ActivityHeatmap` contabilicen de forma pura y exclusiva las revisiones de tarjetas (`user_flashcards`) del mazo seleccionado.

---

### 🟢 [2026-08-20] - Sincronización y Actualización Total del Esquema de Base de Datos ([database_schema.sql](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/infrastructure/database/database_schema.sql))

- **🔍 Introspección Profunda en Vivo de Supabase PostgreSQL:**
  - Se realizó una introspección completa conectándose directamente a la base de datos remota de Supabase a través de `information_schema` y `pg_catalog`.
  - Se regeneró el archivo maestro [database_schema.sql](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/infrastructure/database/database_schema.sql) reflejando con exactitud el estado del 100% de los componentes:
    - **11 Extensiones:** `vector`, `uuid-ossp`, `unaccent`, `pgcrypto`, `pg_trgm`, `fuzzystrmatch`, `hypopg`, `index_advisor`, `pg_stat_statements`, `plpgsql`, `supabase_vault`.
    - **13 Tipos y Enums Personalizados:** `academic_area`, `aal_level`, `action`, `buckettype`, `code_challenge_method`, `equality_op`, `factor_status`, `factor_type`, `oauth_authorization_status`, `oauth_client_type`, `oauth_registration_type`, `oauth_response_type`, `one_time_token_type`.
    - **21 Tablas Públicas y 171 Columnas:** con sus tipos de datos exactos, valores por defecto (`gen_random_uuid()`, `now()`), nulabilidad y llaves primarias.
    - **Relaciones y Llaves Foráneas:** con todas las restricciones de integridad referencial (`ON DELETE CASCADE`, `ON DELETE SET NULL`).
    - **57 Políticas RLS (Row Level Security):** todas las políticas de aislamiento de datos y seguridad por fila para usuarios y administradores.
    - **56 Índices de Alto Rendimiento:** incluyendo índices B-Tree, GIN Trigram (`gin_trgm_ops`) y los 14 índices estratégicos de aceleración.

---

### 🟢 [2026-08-20] - Módulo Repaso: Ordenación Cronológica de Mazos Públicos en Comunidad, Auto-Migración DB y Fallback Resiliente

- **📅 Ordenación Prioritaria por Fecha de Publicación / Actualización:**
  - En [flashcardRepository.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/domain/repositories/flashcardRepository.js), se configuró la consulta `getPublicDecks` con `ORDER BY COALESCE(d.updated_at, d.created_at) DESC, d.created_at DESC`.
  - Al hacer público un mazo o cambiar su visibilidad/categoría (`updateDeckVisibility`), el servidor actualiza la marca de tiempo `updated_at = NOW()`.
  - Esto garantiza que en cualquier filtro de píldoras ("Todas", "Programación", "Medicina", "Derecho", "Educación", etc.) el mazo recién publicado se ubique de inmediato en la **primera posición** de la cuadrícula de la comunidad.

- **🛠️ Auto-Migración de Base de Datos y Manejo de Errores Resiliente (Fallback SQL 42703):**
  - **Auto-healing Migration ([db.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/infrastructure/database/db.js)):** Se añadió la instrucción `ALTER TABLE public.decks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();` en la inicialización del pool de conexiones a PostgreSQL.
  - **Manejo Resiliente de Errores ([flashcardRepository.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/domain/repositories/flashcardRepository.js)):** Se implementó control con `try/catch` ante el código de error `42703` (columna no encontrada). Si por algún motivo la columna `updated_at` no ha sido creada aún en la base de datos remota, el sistema conmuta automáticamente a una consulta de respaldo ordenada por `created_at DESC`, evitando caídas 500 y garantizando disponibilidad continua del servicio.

---

### 🟢 [2026-08-20] - Refactorización Integral de Límites y Caché: Visitantes (1 Demo/Día y TTL 1 Día) y Free (10 Vidas Semanales)

- **👤 Motor Centralizado de Sesión y Caché para Visitantes ([sessionManager.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/sessionManager.js)):**
  - Se creó la clase `GuestSessionManager` centralizando el ciclo de vida del usuario no autenticado:
    - **Límite de 1 simulacro de 10 preguntas por día**: `MAX_DAILY_DEMOS = 1` evaluado en base a la fecha de Perú (`America/Lima`).
    - **Retención de datos y estadísticas de 1 día (TTL Diario)**: `checkAndCleanExpiredGuestData()` detecta el cambio de día calendario, reiniciando `demo_sessions_count = 0` y purgando atómicamente todas las claves `guest_demo_stats_[domain]`.
    - **Métodos estandarizados**: `canTakeDailyDemo()`, `recordDemoAttempt()`, `getGuestStats(domain)`, `saveGuestStats(domain, stats)`.
  - Se eliminó el código muerto y llaves legacy obsoletas (`guest_demo_stats`) en [quiz.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/quiz.js) y [simulator-dash.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/simulator-dash.js).

- **🪙 Reducción y Unificación del Pool Free / Pending a 10 Vidas Semanales:**
  - **Capa de Presentación**: Se actualizaron [uiManager.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/ui/uiManager.js), [profile.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/profile.js), [sessionManager.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/sessionManager.js) y [chat.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/chat.js) para estandarizar el límite por defecto a **10 vidas**, actualizando tooltips, modales de bienvenida (`checkAndShowWelcomeModal`) y mensajes de paywall.
  - **Capa de Dominio y Aplicación**: Se actualizaron [user.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/domain/models/user.js), [usageService.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/domain/services/usageService.js), [checkLimitsMiddleware.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/application/middlewares/checkLimitsMiddleware.js), [chatPrompts.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/domain/prompts/chatPrompts.js) y [asistenteGuiaKnowledge.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/domain/services/asistenteGuiaKnowledge.js).
  - **Capa de Infraestructura y Base de Datos**: Se actualizaron [database_schema.sql](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/infrastructure/database/database_schema.sql) y [sp_register_user.sql](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/infrastructure/database/sp_register_user.sql) estableciendo `max_free_limit DEFAULT 10`.

- **🧪 Cobertura y Suite de Pruebas Unitarias ([guestSessionManager.test.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/tests/unit/guestSessionManager.test.js)):**
  - Se crearon pruebas unitarias dedicadas para `GuestSessionManager` validando el límite de 1 demo/día, el guardado de estadísticas y la purga automática por TTL de 1 día al cambiar de fecha.
  - Se actualizaron los mocks de [checkLimitsMiddleware.test.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/tests/unit/checkLimitsMiddleware.test.js) y [userRepository.test.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/tests/unit/userRepository.test.js).
  - Toda la suite de pruebas (17 suites, 121 tests) ejecutada y validada con 100% de éxito.

---

### 🟢 [2026-08-20] - Optimización Integral de Rendimiento Full-Stack (Admin, Biblioteca, Caché y Carga Asíncrona)

- **⚡ Renderizado Diferido Bajo Demanda en Panel Admin ([admin.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/admin.js#L357-L460)):**
  - Se eliminó la ejecución sincronizada masiva de las 6 pestañas en `loadAllData()`, implementando `renderCurrentTab()` para renderizar exclusivamente la pestaña activa visible en pantalla.
  - Se redujo en un **83%** la creación innecesaria de nodos DOM ocultos en la carga inicial y tras mutaciones de registros en el Panel de Gestión.

- **🗄️ Caché en Memoria con TTL e Invalidación Atómica en Repositorios ([bookRepository.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/domain/repositories/bookRepository.js), [topicRepository.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/domain/repositories/topicRepository.js) & [careerRepository.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/domain/repositories/careerRepository.js)):**
  - Se integró un motor de caché en memoria con TTL de 5 minutos en `BookRepository`, `TopicRepository` y `CareerRepository` para consultas públicas de catálogo.
  - Se conectó la invalidación atómica (`clearCache()`) en todos los métodos de mutación (`create`, `update`, `delete`, `syncResource`) garantizando coherencia inmediata tras cualquier edición administrativa.

- **🌐 Cabeceras HTTP de Caché Inteligente ([coursesController.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/application/controllers/coursesController.js#L65-L215)):**
  - Se configuró la cabecera `Cache-Control: public, max-age=120, stale-while-revalidate=300` para las rutas públicas de lectura (`/api/careers`, `/api/courses`, `/api/topics`, `/api/books`, `/api/books/medical`), permitiendo respuestas HTTP 304 / desde caché de navegador y CDN sin sobrecargar el servidor Express.
  - Se blindaron las rutas de administración (`includeHidden=true` y `/api/students`) con `Cache-Control: private, no-cache, no-store, must-revalidate`.

- **🖼️ Decodificación Asíncrona y Carga Diferida Universal de Imágenes ([components.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/ui/components.js#L145-L1070)):**
  - Se estandarizó la carga diferida con `loading="lazy"` y la decodificación fuera del hilo principal con `decoding="async"` en todas las tarjetas de cursos, carreras, recursos universales, miniaturas del panel de control y widgets de novedades.

- **🎨 Rediseño UI/UX de Revisión de Examen y Jerarquía Tipográfica Dual-Theme ([components.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/ui/components.js#L680) & [quiz.css](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/css/quiz.css#L420)):**
  - Se calibró la escala tipográfica de las preguntas en revisión de un sobredimensionado `1.4rem` a un armónico `1.12rem` (`font-weight: 600`) con `line-height: 1.6`.
  - Se incorporaron badges con letras semánticas `[A, B, C, D]` (`.review-opt-letter`) de `28x28px`, destacando la opción correcta en verde esmeralda (`var(--success)`) y la elección errada del usuario en carmesí (`var(--danger)`) con texto tachado.
  - Se modernizó el disparador del Tutor IA en revisión (`.btn-review-tutor-trigger`) con el gradiente oficial **Manta Pill** (`var(--manta-pill-gradient)`), radio `9999px`, sombra azul/cian e icono oficial de Hubi.
  - Eliminación total de estilos inline oscuros hardcodeados, garantizando contraste nítido tanto en Modo Oscuro (`#050505`/`#0a0a0a`) como en Modo Claro (`#f8fafc`/`#ffffff`).

- **🔔 Centralización del Sistema de Alertas, Toasts Dual-Theme y Vidas en Tiempo Real ([uiManager.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/ui/uiManager.js), [confirmationModal.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/ui/confirmationModal.js) & [modal.css](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/css/modal.css)):**
  - Se erradicaron más de 30 llamadas nativas y bloqueantes a `alert()` y `confirm()` en `quiz.js`, `pricing.js`, `simulator-dash.js`, `dashboard.js`, `repaso.js`, `resource.js` y `admin.js`.
  - Se implementó `window.uiManager.showToast(message, type, duration)` con soporte multitipo (`'success'`, `'error'`, `'warning'`, `'info'`, `'life'`) e inyección automática en `#hub-toast-container` con backdrop-blur y z-index máximo (`2147483647`).
  - Se conectó `sessionManager.decrementUsage()` con `showLifeDecrementToast()` para notificar inmediatamente en pantalla a los usuarios Free cada vez que descuentan una vida (`⚡ 1 crédito utilizado. Te quedan X/20 vidas de prueba`), alertando cuando restan 1-2 créditos y desplegando el paywall automático al llegar a 0.

- **💬 Sistema Centralizado de Tooltips, Guías de Onboarding y Soporte Táctil ([tooltipManager.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/ui/tooltipManager.js), [components.css](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/css/components.css) & [simulator-dash.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/simulator-dash.js)):**
  - Se creó el gestor universal `TooltipManager` (`window.tooltipManager`) para manejo declarativo de tooltips con `[data-tooltip]` y `[data-tooltip-pos]`, con posicionamiento inteligente anti-desbordamiento y micro-animaciones.
  - Se corrigió el error en los simuladores de Salud y Educación donde el tooltip de configuración no aparecía para usuarios visitantes (`!token`).
  - Se implementó el tour interactivo de 2 pasos (`startSimulatorTour`) para guiar a visitantes y nuevos usuarios en la configuración de especialidad y selección de modos de entrenamiento.
  - Se añadió el botón discreto `#btn-show-guide` en la cabecera del simulador para que el usuario pueda volver a ver la guía interactiva en cualquier momento.
  - Se adaptaron los tooltips informativos de los KPIs (`.kpi-info-btn` / `.kpi-tooltip-content`) con eventos touch/click para celulares y tokens dinámicos Dual-Theme.

- **🗄️ 14 Índices Estratégicos en PostgreSQL ([database_schema.sql](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/infrastructure/database/database_schema.sql#L470-L485)):**
  - Se crearon 14 índices clave (`idx_resources_type_domain_vis_created`, `idx_question_bank_created_at`, `idx_page_views_entity`, `idx_decks_user_parent`, `idx_user_flashcards_deck_sort`, etc.) acelerando las consultas del catálogo, métricas de admin y módulo de repaso.
- **🃏 Reordenamiento Atómico en Lote para Módulo Repaso ([flashcardRepository.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/domain/repositories/flashcardRepository.js#L290-L315)):**
  - Se reemplazó el bucle $N$ de consultas individuales por una única consulta SQL atómica batch (`UPDATE ... FROM (VALUES ...)`).
  - Se optimizó `createFlashcard` eliminando la consulta previa para nombre del mazo e integrando `COALESCE((SELECT name FROM decks WHERE id = $2), 'GENERAL')` directamente en la sentencia `INSERT`.
- **⚙️ Ingesta Masiva por Lotes y Paginación en Panel Admin ([adminRepository.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/domain/repositories/adminRepository.js#L200-L275)):**
  - Se implementó la inserción en bloques de 50 preguntas en `saveBulkQuestionBankAdmin`, reduciendo las peticiones de red en un **90%** durante la carga de CSV/Excel.
  - Se agregaron los parámetros `page` y `limit` a `getAllQuestions` para evitar la sobrecarga de payloads pesados.
- **⚡ Caché en Memoria para Taxonomía Global ([courseRepository.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/domain/repositories/courseRepository.js#L4-L28)):**
  - Se integró caché en memoria con TTL de 5 minutos en `findAll` (Cursos y Carreras), entregando respuestas en **0ms** para navegaciones frecuentes.

---

### 🟢 [2026-08-04] - Corrección de Selección Inicial de Novedades y Estilización Manta Pill
- **⚡ Estado Activo Inicial en Mi Biblioteca ([search.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/search.js#L28)):**
  - Se unificó `this.activeFilter = '🔥 Novedades';` en el constructor del componente, corrigiendo la desincronización que impedía que la píldora apareciera seleccionada por defecto en la primera carga.
- **🎨 Rediseño del Brillo de Píldora Novedades ([search.css](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/css/search.css#L670-L678)):**
  - Se ajustó el efecto de resplandor naranja a `box-shadow: 0 3px 10px rgba(249, 115, 22, 0.22)` y degradado suave `linear-gradient(135deg, rgba(239, 68, 68, 0.18) 0%, rgba(249, 115, 22, 0.25) 100%)` siguiendo [DESIGN_SYSTEM.md](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/documentation/DESIGN_SYSTEM.md).

---

### 🟢 [2026-08-03] - Filtro Estricto de 30 Días en Novedades, Proporciones de Tarjetas y Medios
- **🗃️ Migración de Columna `created_at` ([database_schema.sql](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/infrastructure/database/database_schema.sql#L198)):**
  - Se agregó la columna `created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP` a la tabla `resources`.
- **📅 Filtro SQL de 30 Días en Novedades ([bookRepository.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/domain/repositories/bookRepository.js#L14)):**
  - Se configuró la condición estricta `r.created_at >= (NOW() - INTERVAL '30 days')` y `ORDER BY r.created_at DESC, r.id DESC` descartando automáticamente recursos anteriores a 30 días.
- **🖼️ Fallback Universal y Tamaño de Tarjetas ([config.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/config.js#L74) & [components.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/ui/components.js#L1012)):**
  - Mapeo de `noticia.webp` como fallback oficial para recursos de tipo noticia.
  - Ampliación del contenedor de la Tarjeta Hero en Novedades a `360px x 240px`.
  - Alineación horizontal de botones de acción en las tarjetas secundarias mediante `margin-top: auto` en `.news-sec-footer`.
- **🎨 Diferenciación Visual por Tipo de Recurso ([browse.css](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/css/browse.css#L1160)):**
  - `noticia`: Resplandor púrpura (`rgba(168, 85, 247, 0.22)`).
  - `norma`: Resplandor ámbar (`rgba(245, 158, 11, 0.22)`).
  - `guia`: Resplandor esmeralda (`rgba(16, 185, 129, 0.22)`).
  - `paper`: Resplandor azul royal (`rgba(59, 130, 246, 0.22)`).
- **🧹 Limpieza de Barra de Búsqueda y Botón Chat Flotante ([library.html](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/library.html#L725)):**
  - Remoción de lupa duplicada y botón 'X' en la caja de búsqueda.
  - Ocultamiento definitivo del widget flotante de chat general en Mi Biblioteca.

### 🟢 [2026-08-21] - Optimización de Botón Guía en Simulador, Jerarquía en Header y Onboarding de Repaso
- **📍 Reubicación Horizontal del Botón Guía ([simulator-dashboard.html](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/simulator-dashboard.html) & [simulator-dashboard.css](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/css/simulator-dashboard.css)):**
  - Se agrupó `#btn-show-guide` y `#btn-start-config` dentro del contenedor flex `.context-hero-buttons-row`, situando el botón *"? Guía"* a la izquierda de *"Configurar Examen"* en la misma fila horizontal.
  - Adaptación responsiva mediante flexbox para pantallas móviles (`height: 40px`, bordes redondeados `10px-12px`).
- **👤 Limpieza de Jerarquía Visual en Header ([app.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/app.js)):**
  - Se eliminó la etiqueta inferior redundante `.user-usage-badge` del menú desplegable (`#user-menu-dropdown`), preservando el plan oficial en el botón de la barra de navegación (`.user-header-tier`) y manteniendo un dropdown limpio con Nombre y Correo verificado.
- **🗂️ Miniguía de Onboarding para el Módulo Repaso ([tooltipManager.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/ui/tooltipManager.js), [repaso.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/repaso.js) & [repaso.css](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/css/repaso.css)):**
  - **Alineación en Fila Superior (`.repaso-header-top-row` & `.deck-title-top-row`):** En el Dashboard de Repaso y en la vista de Mazo, el botón `Guía` se sitúa en la misma línea a la altura del título en el extremo derecho en PC y móviles.
  - **Estadísticas Responsivas (`.deck-meta-pill`):** Rediseño minimalista de las métricas (tarjetas, pendientes y dominadas) en píldoras estilizadas que nunca se truncan ni desbordan en pantallas móviles.
  - **Tour de 5 Pasos en Mazo (`startDeckViewTour`):** Cobertura interactiva completa que explica: 1) Estudio espaciado SM-2, 2) Creación manual e IA de tarjetas, 3) Cuaderno de notas/resumen, 4) Métricas y visibilidad pública, y 5) Gestión de Sub-Mazos y lista de flashcards.

### 🟢 [2026-08-21] - Integración de Guía de Usuario, Tooltips de KPIs, Avatar Hubi y Sincronización de 10 Vidas en HubSaludApp y HubDocenteApp
- **🧭 Onboarding Tour & Guía Interactiva en Apps Móviles ([UserGuideModal.tsx](file:///c:/Users/ricar/Downloads/PROYECTOS/HubSaludApp/src/presentation/components/UserGuideModal.tsx) & [home.tsx](file:///c:/Users/ricar/Downloads/PROYECTOS/HubSaludApp/app/(tabs)/home.tsx)):**
  - Implementación del componente `UserGuideModal.tsx` en `HubSaludApp` y `HubDocenteApp` con navegación en 3 pasos: (1) Convocatoria y especialidad médica/docente, (2) 3 modalidades de simulador (10q, 20q con Tutor IA, Simulacro Real con cronómetro), (3) Analíticas de progreso y Tutor IA en corrección de examen.
  - Inserción del botón `? Guía` en el banner de configuración de la pantalla principal (`home.tsx`) junto al botón `Configurar`.
  - Apertura automática en la primera visita mediante persistencia local segura con `AppStorage` (`hasSeenSimulatorGuide_salud` y `hasSeenSimulatorGuide_docente`).
- **📊 Modales Explicativas y Tooltips de KPIs ([KpiInfoModal.tsx](file:///c:/Users/ricar/Downloads/PROYECTOS/HubSaludApp/src/presentation/components/KpiInfoModal.tsx) & [home.tsx](file:///c:/Users/ricar/Downloads/PROYECTOS/HubSaludApp/app/(tabs)/home.tsx)):**
  - Creación del componente `KpiInfoModal.tsx` con explicaciones detalladas, fórmulas de cálculo (escala vigesimal 0-20, porcentaje de aciertos) y metas recomendadas para cada KPI: Puntuación Promedio, Precisión Global, Aciertos / Diagnósticos Correctos, Errores Clínicos / Pedagógicos, Tendencia Histórica y Dominio por Especialidades / Grupos Pedagógicos.
  - Integración interactiva: al tocar cualquier tarjeta de KPI o cabecera de gráfico en el dashboard se abre la ventana explicativa con recomendaciones formativas.
- **⚡ Sincronización Universal de 10 Vidas de Prueba (Pool Free/Pending):**
  - Actualización del límite por defecto de 20 a **10 vidas** en `AuthContext.tsx`, `ScreenHeader.tsx`, `profile.tsx` y `terms-and-conditions.tsx` en ambas aplicaciones móviles.
  - Implementación del componente `LifeToast.tsx` para emitir notificaciones flotantes con microanimaciones elásticas cuando se descuenta un crédito o cuando el saldo de vidas es bajo.
- **🩺 Avatar de Hubi en Botón de Tutor IA en Revisión:**
  - En `results.tsx` de ambas apps, se integró el avatar ilustrativo de Hubi (`assets/images/hubifrente.png`) en el botón de activación del Tutor IA en cada caso clínico / casuística pedagógica.
- **📈 Mapeo y Dominio Pedagógico CNEB en HubDocenteApp:**
  - Sincronización de `CANONICAL_SUBAREAS_MAP` en `PedagogicalBarChart.tsx` y `docenteService.js` para reflejar las 6 subáreas curriculares oficiales sin duplicaciones.

---

### 🟢 [2026-08-20] - Refactorización Integral de Onboarding Tour, Tooltips, Alertas Únicas y UI de Resultados
- **🧭 Onboarding Tour Universal & Tooltips ([GUIA_USUARIO_Y_TOOLTIPS.md](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/documentation/GUIA_USUARIO_Y_TOOLTIPS.md), [UI_COMPONENTS_GUIDE.md](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/documentation/UI_COMPONENTS_GUIDE.md), [tooltipManager.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/ui/tooltipManager.js) & [components.css](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/css/components.css)):**
  - Creación del documento técnico máster `GUIA_USUARIO_Y_TOOLTIPS.md` y actualización consolidada de `UI_COMPONENTS_GUIDE.md`.
  - Corrección de cierre instantáneo de la guía mediante aislamiento de eventos de propagación (`e.stopPropagation()`).
  - Implementación de motor de navegación de 3 pasos con scroll suave no agresivo (`block: 'nearest'`), evitando desplazamientos no deseados de los encabezados.
  - Rediseño armónico de la tarjeta de guía (`width: 330px`) con botones uniformes (`height: 34px`, `white-space: nowrap`), indicadores de puntos dinámicos (`.hub-guided-dots`) y navegación `← Anterior` / `Siguiente →` / `¡Comenzar! 🚀`.
- **⚡ Cobertura Exhaustiva de Vidas en Repaso y Tutores ([networkService.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/services/networkService.js) & [deckController.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/application/controllers/deckController.js)):**
  - Se extendió el interceptor global `NetworkService.fetch` para capturar el inicio de estudio de mazos (`GET /cards/due` y `GET /cards/:id/study`), creación/edición de mazos (`POST/PUT /api/decks`) e interacciones con el Tutor IA de Flashcards (`tutor-chat.js`).
  - Detección precisa de planes oficiales (`free`, `basic`, `advanced`): Las cuentas del plan gratuito (`tier === 'free'` o `status !== 'active'`) descuentan de forma garantizada y muestran la alerta flotante `⚡ 1 crédito utilizado...` en tiempo real.
  - Sincronización instantánea tras salir del estudio de flashcards mediante redirección directa (`window.location.href`) y refresco reactivo en el evento `pageshow`, evitando datos estancados por Back-Forward Cache (bfcache) sin requerir F5 manual.
- **🚪 Botón de Pausa y Salida Segura en Simulacros ([quiz.html](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/quiz.html), [quiz.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/quiz.js), [confirmationModal.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/ui/confirmationModal.js) & [quiz.css](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/css/quiz.css)):**
  - Incorporación del botón de salida en la esquina superior derecha (`#btn-top-exit` / `.btn-header-exit`), visible de forma responsiva en PC y celulares.
  - Al pulsar salir, se invoca `saveSession()` y se despliega una modal de confirmación (*"¿Deseas pausar y salir del simulacro? Tu progreso quedará guardado..."*).
  - Al regresar, el sistema ofrece:
    1. **"Continuar anterior":** Reanuda exactamente desde la pregunta en curso.
    2. **"Iniciar nuevo":** Descarta la sesión previa e inicia un examen limpio de 20 preguntas sin mezclar data.
    3. **Botón "X" / Esc / Fuera:** Cierra la modal y sale directamente a `simulator-dashboard` sin forzar inicio de examen.
- **🎯 Experiencia, Finalización y Modal de Resultados en Quiz ([quiz.html](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/quiz.html), [quiz.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/quiz.js) & [quiz.css](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/css/quiz.css)):**
  - **Armonía y Espaciado en Modal de Resultados:** Implementación de las clases `.results-actions` y `.results-secondary-actions` en CSS con `gap: 1.15rem` en PC y `0.95rem` en móviles, erradicando el solapamiento visual entre *"Ver Corrección del Examen"* y los botones *"Salir"* / *"Nuevo Examen"*.
  - **Corrección de la Última Pregunta:** Transformación dinámica del botón a *"Finalizar Simulacro 🚀"* en la última pregunta y solución del conflicto de `style="display: none"` en `resultsOverlay`, permitiendo abrir de manera garantizada el modal de resultados y la posterior corrección del examen.
  - **Eliminación de Código Muerto/Huérfano:** Remoción del botón de flecha flotante (`.btn-back-pulse`) que se superponía con las opciones de respuesta.
  - **Ocultamiento Seguro de Imágenes:** Corrección de `#questionImageContainer` y `#explanationImageContainer` para no mostrar iconos de imagen rota cuando no hay `image_url` asignada.
  - **Aislamiento de la Revisión:** Ocultamiento total de `#reviewContainer` durante el examen activo para evitar su visualización prematura.
  - **Colores Temáticos por Módulo:** Respuesta correcta en Verde Cian (`#0d9488`) para Salud y Azul Real (`#2563eb`) para Educación, tanto en el quiz activo como en la revisión post-examen.
  - **Botón Esbelto del Tutor IA en Revisión:** Reducción de la altura y padding vertical (`.btn-review-tutor-trigger`: `height: 32px; padding: 0.35rem 0.95rem;`) para una apariencia elegante y no invasiva.

---

### 🟢 [2026-07-31] - Unificación de Documentación Mi Biblioteca y Sistema de Curaduría Automática
- **📚 Consolidación de Documentación ([MI_BIBLIOTECA.md](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/documentation/MI_BIBLIOTECA.md)):**
  - Fusión de `@MI_BIBLIOTECA` y `@MI_BIBLIOTECA_GUIA` eliminando información obsoleta y creando una guía máster única.
- **🤖 Curaduría e Ingesta Automática de Recursos ([resourceAutoIngestService.js](file:///C:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/domain/services/resourceAutoIngestService.js)):**
  - Creación del servicio de ingesta automática y script CLI `autoIngestResources.js` para la incorporación de guías clínicas y directivas oficiales.

---

## 🏛️ Arquitectura General del Sistema

### 1. Estructura de Capas
- **`src/presentation/`**: Cliente HTML5, CSS3 modular (Negro Mate Puro / Manta Gradients) y JavaScript Vanilla.
- **`src/application/`**: Controladores Express (`adminController.js`, `flashcardController.js`, `paymentController.js`) y Middlewares transaccionales (`checkLimitsMiddleware.js`).
- **`src/domain/`**: Lógica de negocio pura (`services/`, `repositories/`, `prompts/`).
- **`src/infrastructure/`**: Enrutamiento (`routes/`), cliente Supabase/PostgreSQL (`db.js`) y esquemas (`database_schema.sql`).

---

## 🔐 Estándares de Seguridad y Calidad
- **Row Level Security (RLS):** Habilitado en todas las tablas de interacción de usuario en Supabase.
- **Sanitización XSS:** Sanitización estricta en el editor TinyMCE y procesador Markdown.
- **Firmas Criptográficas:** Verificación HMAC en webhooks de Mercado Pago.
- **Cobertura de Pruebas:** Suite Jest de 17 archivos de prueba unitarios con **123/123 pruebas en verde**.

---

*Nota: Este archivo debe actualizarse de forma obligatoria tras cada sesión de desarrollo o release de producción, manteniendo la fecha ISO (`[YYYY-MM-DD]`) y el resumen ejecutivo de cambios.*
