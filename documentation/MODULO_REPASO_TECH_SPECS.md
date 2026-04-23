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

## Arquitectura de Medios en Vercel
Para evitar que Vercel bloquee peticiones directas a Google Cloud Storage o existan problemas de expiración de URLs firmadas, el sistema utiliza:
1. `window.resolveImageUrl(path)`: Resuelve rutas relativas de GCS a través del proxy del backend.
2. `MediaController`: Centraliza la subida, validación de tipo MIME y almacenamiento organizado por carpetas (`/flashcards`).

## Futuras Mejoras
- **IA Agéntica**: Vincular estadísticas de error con recursos específicos de la base de datos IPRESS.
- **Bulk Import**: Carga masiva de tarjetas desde Excel/CSV con soporte de URLs de imágenes.

---

## 2. Componentes Clave

### A. Gestión de Mazos (Decks)
- **DeckExplorer**: Componente lateral que gestiona la navegación en árbol. Implementa carga perezosa (lazy loading) para sub-mazos.
- **RepasoManager**: Controlador principal de la vista de contenido. Maneja el renderizado de cabeceras, cuadrículas de mazos y listas de tarjetas.

### B. Sistema de Tarjetas (Cards)
- **SRS Algorithm**: Implementación de SuperMemo-2 (SM-2) para calcular los próximos intervalos de repaso basados en la calidad de la respuesta (1-4).
- **Formatos Soportados**: Texto plano y Soporte Visual (Imágenes en GCS).

### C. Generación con IA
- **IA Assistant**: Integración con modelos de lenguaje para generar flashcards automáticamente a partir de temas médicos específicos. Soporta la creación de hasta **20 tarjetas por intento**, adaptando el contenido a la densidad del tema solicitado.

---

## 3. Flujos de Datos Principales

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

## 4. Métricas y Análisis de Actividad

El sistema implementa un motor de analíticas para motivar la constancia del estudiante mediante retroalimentación visual inmediata.

### A. Gráfico de Retención y Constancia (Heatmap)
- **Alcance**: **Global**. Refleja la actividad del usuario en toda la plataforma, no solo en el mazo actual.
- **Fuentes de Datos**:
    - `quiz_history`: Registra la finalización de simulacros (Peso: 2pts).
    - `user_flashcards`: Registra el campo `last_reviewed_at` durante el estudio (Peso: 1pt).
- **Visualización**:
    - **Intensidad**: Los colores varían de azul a púrpura según la densidad de puntos acumulados por día (Normalizado respecto al "Mejor Día" de las últimas 2 semanas).
    - **Interactividad**: Tooltips HTML con `z-index` máximo para visualización sobre modales, mostrando conteo exacto y fecha.

### B. KPIs de Mazo (Doughnut Chart)
- **Aprendiendo (Azul)**: Tarjetas con `interval_days` < 1 o recién creadas.
- **Por Repasar (Rojo)**: Tarjetas donde `next_review_at` <= `NOW()`.
- **Dominadas (Verde)**: Tarjetas con intervalos de madurez (> 21 días de recordación activa).

### C. Almacenamiento y Persistencia
Los datos se persisten en PostgreSQL y se sirven a través del endpoint unificado `/api/analytics/heatmap`. Este endpoint requiere autenticación JWT para filtrar la actividad por el `user_id` correspondiente.


## 5. Optimizaciones de UX (Abril 2026 - Sprint Final)

1. **Carga Masiva de Flashcards (Excel Engine)**: Integración de un motor de importación basado en SheetJS (XLSX) dentro del módulo de repaso.
    - **UX Directa**: Permite al usuario descargar una plantilla optimizada y subir cientos de tarjetas en segundos.
    - **Backend Batching**: Endpoint /api/decks/:deckId/cards/batch con validación de duplicados.
    - **Feedback Visual**: Contador en tiempo real y spinners de carga.
