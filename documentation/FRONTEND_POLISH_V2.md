# Pulido y limpieza de interfaz — 4 de noviembre de 2026

## Estado de entrega

Cambios implementados localmente, pendientes de revisión manual del usuario. Por su indicación no se ejecutaron pruebas, lint, build, inspección de navegador ni despliegues. El usuario autorizará expresamente el despliegue a producción.

Se reutilizó la dirección True-black flat de `design-taste-frontend`, semilla 1169276946, conservando Inter y el azul institucional. Se aplicaron las reglas de salud de código de `.agents/rules/code-health-rules.md`. La presentación sigue separada de las reglas del negocio y del acceso a datos.

## Cambios visibles

- Cabeceras: aspecto único para tema, avatar y cuenta, con rellenos sin marco decorativo. Acceder conserva su texto en móvil y se mantiene el foco visible.
- Simuladores: propósito y número de preguntas organizan cada modo. Superficies diferenciadas y CTA de texto legible en ambos temas, también al pasar el cursor. Se retiraron fondos ilustrados y reglas móviles incompatibles.
- La franja de apoyo explica el recorrido real: responder, profundizar con Tutor IA y guardar en Notas. La disponibilidad del Tutor sigue dependiendo del modo de examen.
- Perfil: ajustes, consumo, pase, verificación y acciones de cuenta. El CSS incrustado pasó a `profile.css`. Se retiraron una carga duplicada de configuración y el doble manejador de guardar nombre.
- Gestión: cabecera compartida, filtros, listas, formularios, carga de imágenes, selección por lotes y editor de unidades con superficies comunes. Se conservan el bloqueo inicial de permisos, TinyMCE y la lógica de edición y almacenamiento.
- Analítica de gestión: título, agrupación de cifras reales y paneles neutrales. Se conserva la mecánica del explorador que comparte `dashboard.css`.
- Pases de acceso: comparación reconstruida, recorrido de uso y preguntas frecuentes. Se retiraron valoraciones ficticias y recursos antiguos. Se conservan los IDs de planes y el endpoint de Mercado Pago.
- Privacidad y términos: lectura con índice por secciones, cabecera y pie comunes. Se conserva el texto legal existente y su fecha editorial.
- Modales y alertas: superficies comunes, formularios legibles, confirmación con foco contenido, estados semánticos y avisos accesibles. Los estilos del visor multimedia y la barra de créditos se extrajeron de JavaScript.
- Los avisos de retorno de Mercado Pago se centralizan en `UIManager.checkPaymentStatus`. El retorno informa del proceso; la activación corresponde a la confirmación del servidor.
- El lector de recursos adopta la navegación de trabajo. Los pies ajustados describen a la empresa como desarrolladora de soluciones de IA.

## Reglas conservadas

Los modos Rápido y Estudio mantienen 10 y 20 preguntas. El examen real conserva 60 preguntas/3 horas en Educación y 100 preguntas/2 horas en Medicina. Tutor IA y Notas mantienen su relación con quiz y flashcards.

Pases: Básico S/ 9.90 por 2 meses; Avanzado S/ 24.90 por 4 meses. El acceso gratuito mantiene 10 créditos cada 30 días. Los límites diarios se comunican por plan; no se cambian precios ni cuotas del backend.

## Limpieza y consolidación

Se retiraron 30 archivos obsoletos o duplicados, aproximadamente 10 MB:

- JavaScript de `hero-slider`, `training-carousel` y `home-animations`.
- Hojas `landing.css`, `simulators.css` y `admin-units.css`, sustituidas por las hojas y componentes vigentes.
- Implementación duplicada del editor de mazos: `js/deck-editor.js` y `css/deck-editor.css`. La creación y edición se realizan en Repaso.
- Ocho antiguos fondos de modos y cuatro portadas/iconos del catálogo sin referencias activas.
- Seis WebP duplicados de `landing/posters/v5/`, consolidados en las imágenes V5 a tamaño completo.
- Cuatro fotogramas finales idénticos a sus iniciales. La guía de Flow indica reutilizar el mismo inicial como final de bucle.

`prepare-landing-assets.js` ya no exporta esas copias. La portada usa `posters/web-v1` para sus vídeos y una imagen V5 para compartir en redes.

Las rutas antiguas mantienen compatibilidad: `/simulators` dirige al dashboard traduciendo dominio a contexto; `/deck-editor` conduce a Repaso.

Se retiraron los casos de prueba exclusivos del módulo visual eliminado `home-animations`. Se conservaron los de conocimiento del asistente y estructura vigente de portada, ajustando sus referencias. No se ejecutaron.

Dependencias directas sin consumidor retiradas del manifiesto y lock: `@pinecone-database/pinecone`, `body-parser`, `fast-levenshtein`, `node-fetch` y `snowball`. El acceso Pinecone por HTTP y las dependencias requeridas por las funciones actuales se conservan.

## Material conservado deliberadamente

- `course.html` y su soporte para cursos asíncronos futuros.
- Originales ImageGen/Flow, MP4 maestros y derivados optimizados. Los originales siguen excluidos del despliegue.
- Imágenes asociadas a preguntas, casos, tarjetas, cursos y recursos: su uso puede depender de referencias guardadas en la base de datos.
- SQL de esquema, permisos, monetización y procedimientos. Conserva historial y capacidad de recuperación. No se eliminaron migraciones ni se ejecutó SQL.
- Autenticación, OTP, permisos, cuotas, sesiones de examen, Tutor y entrega de imágenes GCS/Vercel.
- Mecánica del motor de tarjetas, TinyMCE, zoom multimedia y estados dinámicos.

## Mantenimiento y revisión del usuario

`header.css` es propietario de los controles de cuenta y tema. `modal.css` contiene diálogos y toasts. `ui-overlays.css` contiene visor multimedia y barras de estado. `public-shell.js` y `workspace-shell.js` comparten navegación con el renderizador de cuenta existente. El CSS actualizado está separado por responsabilidad y formateado para lectura.

Para revisar manualmente: cabeceras con/sin sesión en móvil, ambos simuladores en ambos temas, perfil y verificación, formularios de preguntas/casos con imágenes, mazos, notas, confirmaciones y página de pases. El despliegue queda reservado a una indicación posterior.

## Optimización de Rendimiento Cliente, Telemetría y Memoria — 16 de noviembre de 2026

- **Telemetría y Heartbeat (`src/presentation/public/js/app.js`):**
  - Se eliminó la lógica legacy de *keep-alive* de Render y se incrementó el intervalo de `initTrafficTracking()` de 3 a 5 minutos (`PULSE_INTERVAL_MS = 300000`), alineado con la ventana de sesión activa de analítica.
  - Se integró `Page Visibility API` (`document.visibilityState === 'hidden'` / `document.hidden`) para detener por completo el envío de pulsos cuando la pestaña está en segundo plano y retomar limpiamente al volver a primer plano si venció la ventana.
  - Se implementó deduplicación transversal entre vistas MPA mediante `sessionStorage` (`hub_visitor_last_pulse_ts`) y limpieza de timers/listeners previos (`_hubTrafficTimeoutId`, `_hubTrafficIntervalId`, `_hubTrafficVisibilityHandler`).
- **Deduplicación de Sincronización de Sesión (`src/presentation/public/js/sessionManager.js`, `app.js`):**
  - `SessionManager.refreshUser()` incorpora deduplicación de promesas en vuelo (`_refreshPromise`) y ventana de enfriamiento (`_lastRefreshTime`, 1.5s; 30s en `visibilitychange`), evitando peticiones concurrentes o redundantes a `/api/auth/me`.
  - El listener `pageshow` en `app.js` restringe `refreshUser()` exclusivamente a restauraciones desde BFCache (`event.persisted`).
- **Carga Selectiva y Perezosa (`src/presentation/public/js/admin.js`, `ui/repasoNotesUI.js`):**
  - `AdminManager.refreshEntityByType(type)` refresca únicamente la entidad afectada tras operaciones CRUD, borrado en lote o sincronización con Drive, evitando re-descargar todo el banco de preguntas (`/api/admin/questions`) y casuísticas (`/api/admin/cases`) en cada cambio administrativo.
  - `RepasoNotesUI.init()` difiere la carga completa de `/api/library/my-library` hasta que el usuario abre efectivamente el tablero de Notas (`renderNotesBoard()`).
- **Corrección de Bugs y Fugas de Event Listeners (`deck-explorer.js`, `simulator-dash.js`, `ui/uiManager.js`, `quiz.js`, `repaso.js`):**
  - `DeckExplorer._cleanupSessionImages(urls)`: corregido `ReferenceError: url is not defined` iterando sobre la lista de URLs huérfanas, y añadidas guardas en `init()`.
  - `SimulatorDash`: añadidas guardas `dataset.bound` en `setupModeTabs`, `setupTimeTabs`, `bindModeClicks`, `setupConfigModal` y `setupOnboardingGuide` para impedir listeners duplicados al re-ejecutar `init()` en `pageshow`.
  - `UIManager.openVideoModal` / `closeVideoModal`: limpieza garantizada del listener `keydown` (`_videoEscListener`) al cerrar el modal por botón o clic en overlay.
  - `quiz.js` (`initLightbox`) y `repaso.js` (`enableCategoryBarDrag`): añadidas guardas `dataset.lightboxBound` y `dataset.wheelBound` para evitar acumulación de listeners globales.
