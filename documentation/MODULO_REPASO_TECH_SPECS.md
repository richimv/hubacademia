# 🧠 Specs Técnicas: Módulo de Repaso (Flashcards)

## 1. Visión General
El **Módulo de Repaso** es el sistema de memorización a largo plazo de Hub Academia. Utiliza tarjetas de aprendizaje dinámicas (Flashcards) organizadas en mazos (Decks) y un algoritmo de repetición espaciada para optimizar la retención de conocimientos médicos.

## Estado de Implementación (Abril 2026)

### ✅ Finalizado: Edición Visual de Tarjetas
- **Persistencia**: Se ha extendido el backend (`trainingRepository`, `deckService`, `deckController`) para soportar el campo `image_url` en flashcards de usuario.
- **Carga de Medios**: Integración con GCS mediante el proxy `/api/media/gcs`. Implementación de carga directa desde el modal de edición con optimización visual.
- **UI/UX**: 
  - Las tarjetas en la lista de repaso ahora muestran una miniatura si contienen imagen.
  - El modal de edición incluye previsualización en tiempo real y gestión de archivos.
  - El modo estudio (`flashcards.html`) renderiza correctamente las imágenes en el anverso.

### ✅ Corrección de Errores y Refactorización
- **Bug de Navegación**: Se corrigió el error donde editar un mazo (nombre/icono) redirigía al usuario a la raíz (`loadDashboard`). Ahora el sistema refresca la vista actual (`loadFolder`) manteniendo el contexto.
- **Reducción de Redundancia**: Se unificaron los flujos de apertura de modales entre `RepasoManager` y `DeckExplorer`.
- **Resiliencia**: Mejora en la captura de errores en `loadFolder` para evitar estados de carga infinitos.

### ✅ Garbage Collection y Métricas Visuales
- **Eliminación en Cascada (GCS)**: Se implementó un sistema de recolección de basura donde al eliminar un mazo (o grupo de tarjetas), el backend recopila recursivamente (mediante CTE en SQL) todas las URLs de imágenes asociadas y las elimina físicamente de Google Cloud Storage antes de borrar los registros de la base de datos.
- **Estadísticas Dinámicas**:
  - Se reparó la inicialización del `ActivityHeatmap` para que consuma datos reales del endpoint `/api/analytics/heatmap`.
  - Se introdujo un **Gráfico de Anillo (Chart.js)** en el modal de estadísticas que desglosa el estado de las tarjetas del mazo actual en tres categorías: "Nuevas/Aprendiendo", "Por Repasar" (Due) y "Dominadas".

## 2. Componentes Clave

### A. Gestión de Mazos (Decks)
- **DeckExplorer**: Componente lateral que gestiona la navegación en árbol. Implementa carga perezosa (lazy loading) para sub-mazos.
- **RepasoManager**: Controlador principal de la vista de contenido. Maneja el renderizado de cabeceras, cuadrículas de mazos y listas de tarjetas.

### C. Sistema de Audio Premium (TTS Neural)
- **Motor de Voz**: Integración con **Google Cloud Text-to-Speech (Neural Voices)** para generar pronunciaciones de alta fidelidad en múltiples idiomas (ES, EN, IT, FR, DE).
- **Consumo Inteligente**: Los audios se generan una sola vez, se optimizan en el backend y se sirven desde GCS para minimizar la latencia.
- **Modo Escucha (Listening)**: Permite ocultar el texto de la tarjeta para forzar el entrenamiento auditivo, centrando automáticamente el botón de audio.

### D. Generación con IA
- **IA Assistant**: Integración con modelos de lenguaje para generar flashcards automáticamente a partir de temas médicos específicos. Soporta la creación de hasta **20 tarjetas por intento**.

---

## 3. Optimizaciones de Seguridad y Control de Uso (Sprint Final - Mayo 2026)

Se ha implementado un sistema estricto de cuotas y protección de recursos para garantizar la sostenibilidad del almacenamiento y el modelo de negocio.

### A. Límites de Imágenes Universales
Para evitar el abuso del almacenamiento en Google Cloud Storage (GCS), se han establecido límites globales:
- **Guía de Estudio**: Máximo de **2 imágenes** por mazo.
- **Flashcards**: Máximo de **1 imagen por cara** (Anverso/Reverso).
- **Validación Dual**: El sistema valida estos límites tanto en el frontend (TinyMCE images_upload_handler) como en el backend (`DeckController`) con respuestas 400/403.

### B. Sistema de "Vidas" para Usuarios Free (Tier Pending)
Los usuarios sin suscripción activa consumen su saldo global de 50 vidas para las siguientes operaciones de gestión:
- **Operaciones de CRUD**: Crear mazo, editar mazo, añadir tarjetas, editar tarjetas.
- **Operaciones de IA**: Generación masiva de tarjetas con IA (botón morado).
- **Carga de Archivos**: Cada subida de imagen consume una vida.
- **Sincronización en Tiempo Real**: Tras cada acción exitosa, el sistema invoca `sessionManager.refreshUser()` para actualizar el contador de vidas en el header sin recargar la página.

### C. Modernización del Editor (TinyMCE 6)
- **Editor de Guías**: Integración de TinyMCE con soporte para tablas complejas (importadas de Word/Excel).
- **Control de Activos**: Seguimiento de imágenes de sesión (`sessionImages`). Si el usuario cancela la edición, el sistema elimina automáticamente de GCS las imágenes subidas durante esa sesión que no fueron persistidas.
- **Responsive Design**: Modal de guía optimizado para escritorio (1000px) y móviles, con scroll interno y barra de herramientas oscura.

### D. Cascada de Eliminación Progresiva
El método `deleteDeck` ahora recorre jerárquicamente la estructura de mazos, eliminando imágenes de:
1. La descripción (Guía) del mazo actual.
2. Las tarjetas contenidas.
3. Recursivamente, todos los sub-mazos y sus respectivas tarjetas.

---

## 4. Flujos de Datos Principales

### Creación de Tarjeta con Imagen
1. El usuario selecciona un archivo en el modal.
2. `repaso.js` envía el archivo a `POST /api/cards/upload-image`.
3. El backend optimiza a WebP y sube a Google Cloud Storage.
4. Se retorna la ruta GCS y se guarda en la base de datos junto con el contenido textual.

### Sincronización de Repaso
1. Durante el estudio, el usuario califica una tarjeta.
2. `flashcards.js` calcula localmente el progreso y lo envía a `POST /api/training/flashcards/review`.
3. El backend actualiza los parámetros SRS en la base de datos.

---

## 5. UX, Persistencia y Estabilidad (Mayo 2026 - Actualización Crítica)

Se ha realizado una reingeniería del flujo de navegación y persistencia para soportar estructuras de datos complejas y mejorar la resiliencia del sistema.

### A. Persistencia de Explorador Multinivel (8+ Niveles)
- **Restauración Recursiva**: Refactorización de `DeckExplorer` para soportar la reapertura automática de carpetas anidadas sin límite de profundidad. Se utiliza un `Set` en `localStorage` (`repaso_explorer_expanded`) para rastrear nodos abiertos.
- **Lazy Loading Sincronizado**: El sistema ahora espera la carga de hijos antes de intentar expandir niveles inferiores, garantizando que el árbol se reconstruya perfectamente tras un refresco de página.

### B. Navegación Inteligente (Smart Navigation)
- **Estrategia Push vs Replace**: `RepasoManager` ahora decide dinámicamente si añadir una entrada al historial (`pushState`) o sustituir la actual (`replaceState`).
  - **Navegación entre Hermanos**: Si el usuario salta entre mazos del mismo nivel, se usa `replace`.
  - **Navegación Profunda**: Si entra en una subcarpeta, se usa `push`.
- **Botón Atrás Optimizado**: Esta lógica permite que el botón "Atrás" del dispositivo funcione como un botón de "Subir un Nivel", evitando que el usuario tenga que retroceder uno a uno por todos los mazos visitados.

### C. Estabilidad y Blindaje de Red
- **Mitigación de Error 429**: Implementación de un **Throttling Atómico de 5 segundos** en `sessionManager.js`. Se bloquean ráfagas de peticiones de sincronización de Supabase/Google Auth, protegiendo al usuario de bloqueos por IP.
- **Integridad de Sesión de Estudio**:
  - Salida de flashcards mediante `window.location.replace()` para eliminar la página de estudio de la pila del historial, previniendo bucles infinitos al retroceder.
  - Resolución de errores de referencia global (`deckId` -> `currentDeckId`) para garantizar que el endpoint de estudio siempre sea válido.
  - Invalidadación de caché mediante versionamiento agresivo de scripts (`?v=v12`) en el HTML.

### D. Asistencia IA: Tutor Contextual (Modo Efímero)
- **Motor**: Gemini 2.5 Flash Lite para latencia mínima.
- **Personalidad de Mentor**: Evolución de "asistente conciso" a "tutor proactivo". El sistema ahora permite explicaciones extensas, ejemplos prácticos y expansión de conocimientos (gramática, dosis, etimología, etc.) aunque no estén en la tarjeta.
- **Contexto Dinámico**: El sistema inyecta el contenido de la tarjeta como punto de partida, pero el tutor utiliza su conocimiento interno completo para resolver dudas laterales.
- **Memoria de Sesión**: Historial volátil gestionado por el frontend que se resetea al cambiar de flashcard, manteniendo el enfoque en el tema actual.
- **Versatilidad Disciplinaria**: El tutor adapta su lenguaje y rigor técnico según la materia (Medicina, Idiomas, Leyes, etc.).
- **Descubrimiento de UX (Neon Glow Pulse)**: Animación sutil de borde neón (tonos azul/púrpura) y pulsación de brillo en el botón flotante al revelar la respuesta. Este diseño minimalista reemplaza al antiguo sistema de partículas, garantizando un TTI (Time To Interactive) óptimo en dispositivos móviles y guiando el ojo del usuario de manera no intrusiva.

### E. Visualización Adaptativa y Escena 3D
- **Layout de Seguridad**: Introducción del `study-header` para separar la navegación (Volver/Pendientes) del área de estudio, evitando colisiones en móviles.
- **Escalado Inteligente (Fitting)**: Algoritmo en `flashcards.js` que ajusta el tamaño de fuente (0.9rem a 2.8rem) basándose en la densidad de caracteres y la presencia de imágenes 9:16.
- **Scroll de Alta Accesibilidad**: Configuración de Flexbox para garantizar que el texto largo siempre sea legible desde el inicio en celulares, manteniendo el centrado vertical en textos cortos.

### F. Generación Multidisciplinar Adaptativa
- **Motor de IA Multidominio**: El prompt maestro en `trainingService.js` ha sido refactorizado para aplicar estrategias pedagógicas específicas según el área:
    - **Medicina**: Enfoque en razonamiento clínico, síntomas y diagnósticos diferenciales (Juicio clínico vs. Definición).
    - **Educación**: Enfoque en teorías del aprendizaje, gestión de aula y estrategias aplicadas para docentes.
    - **Idiomas (Listening/Speaking)**: Regla de "Pureza Lingüística" que obliga a un anverso 100% puro en el idioma objetivo para una síntesis de voz (TTS) impecable, con traducción aislada en el reverso.
- **Active Recall Reforzado**: Todas las generaciones fuerzan el formato "Disparador Mental" -> "Respuesta Atómica", optimizando la retención a largo plazo.

### G. Seguridad, Monetización y Control de Cuotas (V16)
- **Escudos de Caracteres (Safety Caps)**:
    - **Límite de Texto**: Restricción estricta de **400 caracteres** por cara para garantizar tarjetas atómicas y evitar el almacenamiento de documentos extensos.
    - **Límite de Síntesis (TTS)**: Para optimizar costos de Google Cloud, el audio premium solo procesa los primeros **500 caracteres** de cada cara.

- **Política de Consumo de Vidas (Usuarios Free)**:
    El sistema aplica una filosofía de **"Mantenimiento Gratuito vs. Valor de Pago"**:
    - **Acciones Gratuitas (0 Vidas)**: 
        - Edición de texto en tarjetas existentes.
        - Gestión de metadatos de mazo (Renombrar, cambiar icono o color).
        - Eliminación de tarjetas o mazos.
        - Reordenamiento de tarjetas.
    - **Acciones de Pago (1 Vida)**:
        - **Creación**: Nuevo mazo (incluye sub-mazos/carpetas) y nuevas tarjetas individuales.
        - **Estudio**: Inicio de sesión de estudio ("Estudiar Ahora") y revisión de tarjetas individuales (botón Play).
        - **Valor Agregado**: Guardado de **Guía de Estudio** (Descripción enriquecida) y Generación de tarjetas con IA (Gemini).

- **Restricciones Premium (Planes Pagados)**:
    - **Carga Masiva (Excel)**: Función **exclusiva para usuarios Premium**. Los usuarios Free tienen el acceso bloqueado tanto en la interfaz (UI) como en la API para proteger la integridad operativa del sistema de importación masiva.

- **Validación Preventiva**: El frontend (`repaso.js`) audita el contenido antes de la subida, proporcionando feedback inmediato sobre límites de caracteres o cuotas de vida insuficientes.

### H. UX Discovery y Micro-interacciones (Tutor IA)
- **Efecto Neon Glow Pulse**: Animación optimizada por hardware (CSS keyframes) que aplica un resplandor de neón vibrante al botón del Tutor al girar la flashcard. Se eliminó la inyección de partículas en el DOM para favorecer la fluidez de renderizado a 60fps en smartphones, manteniendo la alta visibilidad requerida.
- **Efecto Shimmer**: Animación de resplandor sutil en la interfaz de chat para indicar actividad y guiar el enfoque del usuario hacia las herramientas de soporte.

### I. Optimizaciones de Alto Rendimiento y Ruteo (V15 - Mayo 2026)
- **Higiene de Enrutamiento (Client-Side Routing)**: Se ha corregido la contaminación del historial de navegación que ocurría durante el arranque de la aplicación (Deep Linking y restauraciones BFCache). La función `init()` y las ediciones de tarjetas ahora utilizan cargas silenciosas (`pushState=false`), evitando inyectar estados basura.
- **Salida de Sesión Nativa**: La función de salida en el modo estudio (`handleExit`) ha abandonado las redirecciones duras. Ahora evalúa el `document.referrer` y utiliza un `window.history.back()` nativo, garantizando que el usuario regrese impecablemente al nivel exacto del mazo sin duplicar páginas en el historial.
- **Resolución de Condición de Carrera (Última Tarjeta)**: Se implementó una barrera asíncrona (`await syncPromise`) en la calificación de la última flashcard de la cola. Esto fuerza al sistema a esperar que la base de datos confirme la revisión antes de pedir la siguiente tanda, erradicando el bug de repetición de tarjetas.
- **Renderizado por Lotes (DocumentFragment)**: Las cuadrículas de mazos masivos (`renderDeckCards` y `renderCommunityDecks`) fueron refactorizadas para ensamblar las tarjetas en memoria temporal (`DocumentFragment`) antes de inyectarlas al DOM en una sola operación. Esto elimina el bloqueo del hilo principal y reduce los costosos cálculos de *reflow/repaint* del navegador al mínimo.

### J. Arquitectura Lite y Optimización de Red (V17 - Mayo 2026)
- **Data Thinning (Lazy Loading)**: Refactorización del modelo de datos para excluir el campo `description` (Guía de Estudio) de todas las consultas de listado. El contenido enriquecido ahora se carga bajo demanda mediante el endpoint `/api/decks/:id/guide` solo cuando el usuario abre el modal correspondiente.
- **Shared Request Pool**: Implementación de un gestor de promesas compartidas en el frontend para evitar peticiones duplicadas durante el arranque de la aplicación (Barra lateral y Dashboard compartiendo el mismo flujo de datos).
- **Optimistic UI Updates**: Mejora de la percepción de velocidad mediante la actualización inmediata del DOM en acciones de edición y renombrado, sincronizando con la base de datos en segundo plano.

---

**Documentación Técnica Actualizada - 12 de Mayo, 2026.**
