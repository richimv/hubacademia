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

### B. Sistema de Tarjetas (Cards)
- **SRS Algorithm**: Implementación de SuperMemo-2 (SM-2) para calcular los próximos intervalos de repaso basados en la calidad de la respuesta (1-4).
- **Formatos Soportados**: Texto plano y Soporte Visual (Imágenes en GCS).

### C. Generación con IA
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

