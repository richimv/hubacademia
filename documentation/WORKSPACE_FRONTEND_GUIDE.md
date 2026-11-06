# Interfaz de estudio de Hub Academia

Actualización: 4 de noviembre de 2026. Implementación en la capa `presentation/`, con HTML, CSS y JavaScript existentes. Pendiente de validación por el usuario; no se ejecutaron pruebas, lint, build ni inspección en navegador por su indicación expresa. No se desplegó a producción.

El pulido de cabeceras, perfil, gestión, analítica, precios, páginas legales y overlays está documentado en [FRONTEND_POLISH_V2.md](FRONTEND_POLISH_V2.md). `header.css` es el único propietario del aspecto de tema, acceso y cuenta. `modal.css` contiene los diálogos y `ui-overlays.css` las barras de estado y el visor multimedia. Perfil, gestión, analítica y el lector de recursos también utilizan `workspace-page` y la navegación compartida.

## Dirección y alcance

Se aplicó `design-taste-frontend`, ruta de pantallas de aplicación (`references/app-screens.md`). Dirección guardada en `.taste-skill/workspace/direction.json`: **True-black flat**, semilla **1169276946**, conservando paleta y tipografía de la marca. Las superficies negras y grafito, Inter, botones planos y espaciado comparten lenguaje con la landing; la aplicación usa títulos más compactos y controles de trabajo. El azul de acción se conserva por identidad de marca. Medicina usa un acento teal local, con variante legible de enlace para tema claro. Los colores de datos existentes conservan sus categorías.

La secuencia real del producto organiza la interfaz: configurar una práctica, responder, profundizar con Tutor IA y conservar respuestas en Notas. No se añadieron fotografías decorativas ni recursos generados al material de preguntas o tarjetas: ese contenido pertenece a los bancos y mazos reales. Los recursos narrativos de la landing siguen separados en `assets/landing/`.

## Mapa de responsabilidades

| Archivo | Responsabilidad |
| --- | --- |
| `css/theme.css` | Tokens de tema claro/oscuro ya existentes. |
| `css/header.css` | Tema, acceso, avatar y desplegable de cuenta. |
| `css/workspace.css` | Marco compartido, composición de cabecera, menú lateral, tipografía y controles. Alcance: `body.workspace-page`. |
| `css/workspace-simulator.css` | Configuración, modos, métricas y paneles del simulador. |
| `css/workspace-study.css` | Lectura del quiz, estados de respuesta, revisión, carga y superficie de las flashcards. |
| `css/workspace-repaso.css` | Explorador, mazos, editor, acciones y tablero de Notas. |
| `css/repaso-page.css` | Estilos antes incrustados en `repaso.html`: contenido de guía y selectores. |
| `css/bulletin.css` y `js/bulletin.js` | Página editorial pública del Boletín IA y lectura de publicaciones seleccionadas. |
| `css/tutor.css` | Única presentación del Tutor del quiz y del Tutor de flashcards, incluido modo ampliado y móvil. |
| `js/ui/workspace-shell.js` | Navegación común y conexión con el renderizador de cuenta existente de `app.js`. |
| `js/ui/studyTutorView.js` | Panel compartido, contexto visible, foco, Escape y pantalla completa. No llama a IA ni persiste notas. |
| `js/quiz-tutor.js`, `js/tutor-chat.js` | Conservan mensajes, contexto enviado al backend, historial, cuotas, citas y guardado de Notas. |

Orden de CSS: tema/base → hojas de componentes y página existentes → `workspace.css` → hoja específica `workspace-*`. Los estilos de presentación comunes quedan al final para que su prioridad sea explícita. Las hojas existentes conservan reglas necesarias de layout y estado, especialmente el motor 3D y los contenedores multimedia.

Se conservan las reglas necesarias de otras vistas, la mecánica de tarjetas y los atributos dinámicos de estado. Los estados antiguos de los modos de examen, las definiciones duplicadas de cuenta y los bloques CSS inyectados por UIManager se retiraron en el pulido del 4 de noviembre. Las declaraciones `!important` restantes se reservan a compatibilidad de estados y del editor. El inventario de limpieza está en [FRONTEND_POLISH_V2.md](FRONTEND_POLISH_V2.md).

## Páginas integradas

| Página | Identificador de presentación | Hoja específica |
| --- | --- | --- |
| `/simulator-dashboard?context=EDUCACION` o `MEDICINA` | `data-workspace="simulator"` | `workspace-simulator.css` |
| `/quiz` con sus parámetros actuales | `data-workspace="quiz"` | `workspace-study.css` |
| `/repaso`, `/repaso?view=notes` | `data-workspace="repaso"` | `workspace-repaso.css` |
| `/flashcards` con el mazo y parámetros actuales | `data-workspace="flashcards"` | `workspace-study.css` |
| `/library` | `corporate-page bulletin-page` | `bulletin.css` y navegación corporativa pública |
| `/profile` | `data-workspace="profile"` | `profile.css` |
| `/admin` | `data-workspace="admin"` | `admin.css` |
| `/dashboard` | `data-workspace="dashboard"` | `dashboard.css` |
| `/resource` | `data-workspace="resource"` | `resource.css` |

Las páginas mantienen sus clases previas y añaden `workspace-page`. La landing conserva `corporate-page landing-page` y sus propias hojas; los nuevos estilos no la alcanzan.

`workspace-shell.js` se carga con `defer`. Crea una cabecera estándar donde faltaba, antes de los inicializadores de `DOMContentLoaded`, y reutiliza `updateHeaderUI`/`sessionManager`. En las sesiones mueve el botón de salida original a la cabecera, manteniendo su ID y su manejador de pausa/salida. El logo delega en ese mismo control. No se crea un segundo mecanismo de guardado de sesión.

En Repaso, `_syncViewSwitcher` emite `repaso:view-changed` con `{ view }`. La cabecera escucha el evento para marcar Notas o Flashcards también cuando se cambia desde el explorador; no depende únicamente de clics sobre los tabs. Las rutas y el historial siguen siendo propiedad de `repaso.js`.

## Reglas del producto conservadas

- Rápido: 10 preguntas y corrección inmediata; Tutor disponible en revisión.
- Estudio: 20 preguntas, explicación y Tutor después de responder.
- Real: 60 preguntas/3 horas en Educación; 100 preguntas/2 horas en Medicina. La disponibilidad del Tutor durante el examen sigue controlada por el motor del quiz.
- Ascenso y SERUMS permanecen como objetivos disponibles; los demás objetivos conservan sus estados deshabilitados existentes.
- El Tutor del simulador guarda en `POST /api/library/notes` con `sourceType: 'quiz'`; el de flashcards con `sourceType: 'flashcard'`. Ambos apuntan a `/repaso?view=notes`.
- No se modificaron endpoints, cuotas, cálculos de puntuación, selección de preguntas, SM-2 ni permisos de cuenta.
- Las imágenes clínicas, pedagógicas y de tarjetas conservan su origen y visualizador; no se reemplazan con imágenes decorativas.

## Limpieza realizada

- Una plantilla compartida sustituye los dos encabezados/compositores del Tutor duplicados.
- El manejo de pantalla completa vive en `StudyTutorView.setExpanded`; al cerrar restaura el desplazamiento anterior del documento.
- Los paneles cerrados quedan `inert` y con estado ARIA actualizado; Escape cierra y el foco vuelve al control que los abrió. El modo ampliado mantiene el recorrido de Tab dentro del panel.
- Los estados visuales del guardado de notas usan clases CSS en lugar de colores incrustados en JavaScript.
- Se retiraron los estilos de carga duplicados de `quiz.html` y los bloques `<style>` de Repaso y Biblioteca.
- Se retiraron referencias a imágenes de modos inexistentes, el antiguo fallback de radar sin instancia y campos del contexto que ya no tenían consumidor.
- La descripción del gráfico educativo ahora depende de `currentContext`, en lugar de un antiguo nombre de producto.
- Los acentos de Medicina se resuelven con `data-study-context` y CSS, sin inyectar colores desde el dashboard.

## Adaptación y próxima revisión

Se escribieron reglas para navegación lateral móvil, cabeceras compactas, columnas apiladas, acciones de notas visibles y panel de Tutor ajustado a `dvh`. El espaciado respeta la barra de prueba cuando existe. `prefers-reduced-motion` conserva el contenido y reduce transiciones.

La validación visual y funcional sigue a cargo del usuario. No se atribuyen puntuaciones de auditoría, compatibilidad medida ni resultados de pruebas a esta entrega. Las instrucciones habituales de inspección de la skill quedaron exceptuadas por la solicitud explícita de no hacer pruebas.

Para ampliar otra vista, reutilizar el marco común y añadir una hoja específica; no copiar plantillas de Tutor ni implementar otro menú de usuario. Para sustituir material didáctico, trabajar sobre el contenido del banco o mazo correspondiente, separado de los recursos de marketing.


## Cabecera del simulador — 6 de noviembre de 2026

Las pestañas «Educación» y «Salud» quedan fuera del marco introductorio. Ambos simuladores utilizan `assets/fondo_simulador.png` a todo el ancho de la cabecera en escritorio. Hasta 1050 px no se carga el fondo y la altura vuelve a adaptarse al contenido. La franja de herramientas conserva su superficie independiente.

El título, Guía, configuración y recorrido de estudio comparten `simulator-intro`, conservando superficies diferenciadas. El resumen del examen se sitúa junto a Modos de Entrenamiento y reutiliza `kpi-tabs-group`; sus estilos específicos pertenecen a `workspace-simulator.css`. Se retiraron las reglas históricas y colores inline de ese resumen. En móvil los encabezados se apilan y los valores se ajustan en varias filas. La Guía describe las diferencias entre Educación y Medicina y apunta al título visible de analítica. Sin pruebas ni despliegue.
