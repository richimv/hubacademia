# Sistema visual de Hub Academia

Actualizado: 4 de noviembre de 2026. Referencia vigente para la presentación web.

## Identidad y dirección

Hub Academia desarrolla soluciones de inteligencia artificial aplicada al conocimiento profesional. Los simuladores, Repaso, Notas y el Boletín IA son productos de ese ecosistema. Educación Inicial conserva su sección y plataforma propias.

Se aplica la habilidad `design-taste-frontend`. La dirección de las pantallas de trabajo está guardada en `.taste-skill/workspace/direction.json`: True-black flat, semilla 1169276946. Se conservan Inter y el azul institucional. La landing y las herramientas comparten tipografía, superficies y controles; cada vista mantiene la jerarquía apropiada a su tarea.

## Tokens

Los valores se definen en `src/presentation/public/css/theme.css`. Las hojas de página consumen sus variables.

| Uso | Oscuro | Claro |
| --- | --- | --- |
| Fondo general | `--bg-main: #050505` | `#edf2f7` |
| Panel | `--bg-secondary: #111113` | `#ffffff` |
| Contenedor anidado | `--bg-tertiary: #1c1c20` | `#e2e8f0` |
| Texto principal | `--text-main: #f8fafc` | `#0f172a` |
| Texto de lectura | `--text-secondary: #cbd5e1` | `#334155` |
| Texto secundario | `--text-muted: #94a3b8` | `#64748b` |
| Acción | `--primary: #2563eb` | `#2563eb` |
| Acción al pasar el cursor | `--primary-hover: #1d4ed8` | `#1d4ed8` |
| Enlace o CTA de texto | `--primary-light: #60a5fa` | `#1d4ed8` |
| Texto sobre acción | `--on-primary: #ffffff` | `#ffffff` |

Medicina utiliza un acento teal local definido en `workspace.css` con variantes para ambos temas. Los colores de éxito, aviso y error señalan estados reales; los gráficos conservan sus categorías.

La separación entre paneles combina diferencia de superficie, espacio y bordes discretos. Tema, cuenta y avatar usan rellenos planos con `border: 0`; conservan el indicador de foco. Los contenedores de trabajo tienen radios de 4–6 px y los diálogos 8 px. Las sombras se concentran en elementos superpuestos.

## Tipografía y contenido

Inter es la familia compartida. Las herramientas usan títulos principales de aproximadamente 24–32 px y cifras de analítica de 32 px. La portada y los encabezados comerciales pueden utilizar una escala mayor. Los valores numéricos usan cifras tabulares cuando corresponde.

Los textos describen funciones disponibles. Los pases muestran precio total y duración. La confirmación del servidor determina el acceso tras el pago. Preguntas, casos y tarjetas conservan su material didáctico real.

## Propiedad de componentes

La marca completa utiliza `hubacademiadark.png` y `hubacademialight.png`, alternadas por tema desde `brand.css`. El símbolo y nombre ya están incluidos en las imágenes. La barra de créditos ocupa una fila propia de 46 px mediante `--trial-bar-height`; la cabecera y el contenido reservan ese espacio. Detalle en [HUBI_SUPPORT_GUIDE.md](HUBI_SUPPORT_GUIDE.md).

| Archivo | Responsabilidad |
| --- | --- |
| `theme.css` | Variables de ambos temas y familia tipográfica. |
| `header.css` | Tema, acceso, avatar y desplegable de cuenta. |
| `public-shell.css` | Composición de navegación y pie corporativos. |
| `js/ui/public-shell.js` | Estructura común de precios y páginas legales; índice legal. |
| `workspace.css` | Marco de trabajo, navegación de módulos y adaptación móvil. |
| `js/ui/workspace-shell.js` | Navegación compartida, integrada con la sesión existente. |
| `modal.css` | Diálogos, confirmaciones, formularios de verificación y toasts. |
| `ui-overlays.css` | Visor multimedia, conectividad y barra de créditos. |
| `profile.css`, `admin.css`, `pricing.css`, `legal.css` | Composición de las respectivas pantallas. |
| `workspace-simulator.css` | Modos de examen, recorrido de estudio y superficies. |
| `tutor.css` y `studyTutorView.js` | Presentación compartida de tutores de quiz y flashcards. |
| `landing-home.css` y `js/landing/*` | Narrativa, secciones y movimiento de portada. |

Orden habitual: tema/base, componentes y disposición de página, marco compartido y reglas específicas de vista. Cada componente se corrige en su hoja propietaria. Los estilos dinámicos se reservan para visibilidad, progreso y geometría controlada por JavaScript.

La sesión pertenece a `sessionManager.js` y `app.js`. Las hojas de perfil y landing consumen los controles de `header.css`. UIManager carga una sola vez las hojas de sus overlays; no inyecta bloques CSS.

## Adaptación e interacción

Las acciones principales tienen un área mínima de 44 px. En móvil Acceder conserva texto y la cuenta utiliza el avatar. Las columnas se apilan según el espacio disponible. El menú lateral existente sirve como navegación de herramientas.

Las confirmaciones mantienen Escape, recorrido de foco y devolución al control de origen. Los toasts usan `role` y `aria-live`. Los estilos contemplan `prefers-reduced-motion`.

La portada conserva vídeo controlado por scroll y fotogramas de respaldo. Los recursos de autoría de `assets/landing/` están separados de las imágenes de preguntas, casos y mazos.

## Conservación y referencias

Se conserva `course.html` para formación asíncrona futura. Los accesos `/simulators` y `/deck-editor` conducen a las herramientas vigentes. Se conservan los originales multimedia y el historial SQL necesario para comprender y reconstruir la base.

Guías: [WORKSPACE_FRONTEND_GUIDE.md](WORKSPACE_FRONTEND_GUIDE.md), [LANDING_FRONTEND_GUIDE.md](LANDING_FRONTEND_GUIDE.md), [LANDING_VIDEO_INTEGRATION.md](LANDING_VIDEO_INTEGRATION.md) y [FRONTEND_POLISH_V2.md](FRONTEND_POLISH_V2.md).

Esta entrega incluye revisión de código y referencias locales. Por solicitud del usuario no se ejecutaron pruebas, lint, build ni inspección de navegador. No se desplegó a producción.
