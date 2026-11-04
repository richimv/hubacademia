# Plan de subsanación y narrativa visual — Landing V3

> Actualización: la iteración vigente y la propuesta audiovisual se encuentran en `PLAN_LANDING_V4_Y_PRODUCCION_FLOW.md`. Se corrigieron las rutas de autenticación, la duplicación de Hubi, el footer, el acceso a `/library` y la taxonomía de Soluciones. Los tres productos de esta sección son ahora Simulador docente, Simulador médico y Flashcards; Inicial conserva su sección propia. Los recursos originales se conservan en `assets/landing/source/` y los derivados web en `assets/landing/images/`.

Este documento refina el plan maestro V2.0. No cambia su reposicionamiento: Hub Academia es una empresa peruana de inteligencia artificial; define cómo expresarlo con una experiencia visual contemporánea, de alto rendimiento y accesible.

## Decisiones conservadas

- El hero no contiene preguntas de examen ni un quiz.
- La educación inicial no utiliza fotos arquitectónicas ni presenta el subdominio como mensaje de producto.
- El Tutor IA no tiene una sección independiente ni compite con Hubi: es una capacidad dentro de Simuladores y Repaso.
- Biblioteca evoluciona a **Boletín de Inteligencia Artificial**.
- Los precios son pases para Simuladores y Repaso con IA, no precios de toda la empresa.
- El footer no incluye créditos de Wikimedia ni material visual ajeno.

## Principio de movimiento

El scroll debe explicar el producto, no distraer. Cada bloque tiene una única acción visual reconocible; se elimina la repetición de grillas de tarjetas negras. La prioridad técnica es HTML semántico y CSS; GSAP ScrollTrigger se reserva para historias fijadas y sincronizadas con el scroll.

| Módulo | Imagen / interacción | Movimiento al desplazarse |
| --- | --- | --- |
| Hero | `hero-ai-peru.png`, ecosistema IA peruano | Parallax muy leve de la imagen y entrada secuencial del titular; no hay vídeo aún. |
| Productos | Interfaz HTML real, tres estados de producto | Sección fijada en escritorio: el texto avanza y cambia el estado de la interfaz. |
| Educación Inicial | `educacion-inicial.png` detrás de un mockup HTML | La foto se revela con máscara; los campos 3/4/5 años activan una conclusión real de ejemplo. |
| Boletín IA | `boletin-ia.png` y artículos HTML | La pieza editorial se desplaza con profundidad y los tres artículos aparecen escalonados. |
| Proyección | Timeline de tres etapas, no tarjetas | La línea de progreso se llena con el scroll y activa una etapa cada vez. |
| Pases | Tres pases de acceso | Entrada sobria, énfasis por foco/hover, sin scroll-jacking. |

## Arquitectura de la portada

1. **Empresa peruana de IA.** Hero con propuesta de valor y panel de capacidades: conclusiones descriptivas, retroalimentación formativa y SM-2. La imagen es soporte narrativo; la demostración sigue siendo HTML accesible.
2. **Productos y herramientas con IA.** Tres productos, un solo escenario visual persistente. Cada producto comunica resultado y acceso, nunca detalles internos de backend.
3. **Educación Inicial.** Demostración de una conclusión descriptiva por edad y competencia; imagen contextual original en vez de fotografías de colegios y facultades.
4. **Boletín de Inteligencia Artificial.** Regulación, educación y ciencia/salud. Es conocimiento editorial, no una biblioteca de balotarios.
5. **Proyección empresarial.** Un timeline que diferencia presente operativo, campus asíncrono y consultoría/laboratorio, sin afirmar que las iniciativas futuras ya están disponibles.
6. **Pases de acceso.** Comunicación clara del alcance: simuladores, repaso y Tutor IA según el pase.

## Implementación de motion

### Base

- `IntersectionObserver` para revelados simples, con variaciones de retraso por elemento.
- Una variable de progreso normalizada para efectos de parallax de imagen, limitada a `transform` y `opacity`.
- `prefers-reduced-motion: reduce` elimina parallax, pinning, transiciones largas y reproducción automática futura.
- En móvil no se fija contenido ni se secuestra el scroll: los módulos se apilan y las demos permanecen operables.

### ScrollTrigger

- Cargar GSAP y ScrollTrigger solo en la portada, con `defer`.
- Usar triggers de entrada/salida para cambiar la demo de producto, y progreso sincronizado para sus indicadores y para el recorrido de Visión. No registrar listeners de `scroll` por componente.
- Aplicar `matchMedia` para activar pinning solo desde 960 px y destruir triggers al cambiar de breakpoint.
- No animar propiedades de layout; se usan `transform`, `opacity` y `clip-path` de forma moderada.

## Activos creados

| Archivo | Uso | Reemplazo futuro por vídeo |
| --- | --- | --- |
| `/assets/landing/hero-ai-peru.png` | Hero corporativo | Un loop breve y sin audio de una visualización de ecosistema IA, con `poster` igual a esta imagen. |
| `/assets/landing/educacion-inicial.png` | Contexto para Educación Inicial | Un clip documental con consentimiento y sin identificar a menores. |
| `/assets/landing/boletin-ia.png` | Fondo editorial del Boletín IA | Microvídeo abstracto de páginas/datos, sin texto integrado. |

Las imágenes son suficientes para esta fase: permiten profundidad, máscaras, parallax y narrativa sin el coste de rendimiento ni la dependencia de producción audiovisual. El vídeo se añadirá únicamente cuando exista material propio y una versión WebM/MP4 optimizada, `poster`, subtítulos si aplica y una alternativa estática.

## Criterios de aceptación para S1–S3

- La landing comunica IA aplicada antes que preparación de exámenes.
- No queda un quiz en el hero, una galería arquitectónica, ni un bloque autónomo de Tutor IA.
- Cada sección cuenta algo distinto visualmente.
- El primer render funciona sin JavaScript; los controles y enlaces mantienen teclado, foco y contraste.
- Lighthouse móvil no se degrada por activos: imágenes responsivas, `loading="lazy"` fuera del hero y dimensiones explícitas.
- Se prueban escritorio, tableta, móvil y reducción de movimiento antes de desplegar.

## Implementación S1–S3 — 3 de noviembre de 2026

Estado: código implementado localmente; revisión y pruebas a cargo del usuario por indicación expresa. No se ejecutaron Jest, lint, inspección de navegador, capturas ni pruebas de rendimiento. No se desplegó.

### Archivos y decisiones

- `src/presentation/public/index.html`: portada corporativa reestructurada en seis secciones, footer y navegación por anclas. El hero presenta la empresa y las capacidades Crear/Comprender/Recordar. Se retiraron el quiz del hero, la galería arquitectónica, el bloque independiente de Tutor IA y sus atribuciones de Wikimedia en esta página.
- `src/presentation/public/css/landing-home.css`: estilos exclusivos de `body.landing-v3`. Utiliza los tokens de marca, conserva Inter y los temas claro/oscuro; el hero mantiene texto blanco sobre la imagen oscura. El sombreado sobre fotografías es una excepción funcional para legibilidad. La tipografía de marketing adopta una escala mayor que la interfaz de la aplicación.
- `src/presentation/public/js/landing-home.js`: módulo aislado para capacidades del hero, tabs con navegación por teclado, tarjeta de repaso, ejemplos locales de Inicial, menú móvil, vínculos con Hubi, imagen del simulador según tema, apariciones por intersección y escenas de scroll.
- `src/presentation/public/js/vendor/gsap-3.15.0/`: distribuciones oficiales de GSAP y ScrollTrigger con sus cabeceras de licencia. Se sirven localmente y con `defer`, únicamente en la portada. El sticky es CSS nativo y no se intercepta la rueda ni se impone scroll suave por librería.
- `scripts/prepare-landing-assets.js`: exporta derivados WebP de 960 y 1680 px de las tres imágenes aprobadas. Los PNG originales se conservan. La portada selecciona los WebP mediante `picture`/`srcset`; solo el hero tiene prioridad de carga alta.

### Comportamiento concreto

- Productos: la demo permanece fija en escritorio, mientras cada capítulo selecciona Inicial, Simuladores o Repaso. La selección manual y el foco del teclado se respetan; nunca se oculta un panel que mantiene el foco debido al scroll.
- Inicial: nueve ejemplos preparados (tres edades por tres competencias). Cada selección actualiza observación y borrador. El botón muestra la transición del ejemplo; no llama al modelo, no consume créditos ni almacena evaluaciones.
- Visión: línea de progreso sincronizada, etapa activa y dial de Aplicar/Aprender/Construir. Se distinguen lo disponible hoy y las iniciativas futuras.
- Las entradas usan Web Animations e IntersectionObserver sin dejar contenido oculto esperando JavaScript. Si GSAP no carga, siguen disponibles los textos, enlaces y controles.
- En móvil se retiran los bloques fijados y el parallax; permanecen las apariciones de sección y las interacciones por toque. `prefers-reduced-motion` retira desplazamientos, animaciones y smooth scroll, y revierte los triggers al cambiar la preferencia.
- Se eliminaron del JSON-LD de la portada las valoraciones y reseñas de ejemplo. El esquema describe la organización y el sitio, sin inventar evidencia comercial.

### Alcance editorial y siguiente fase

El Boletín se presenta en la landing como una iniciativa en preparación editorial. Sus tres columnas describen líneas temáticas, no simulan artículos publicados. El enlace de consulta abre Hubi. La ruta `/library` conserva por ahora su implementación y datos: su transformación, el ajuste integral de `/pricing` y la sincronización de documentos empresariales pertenecen a S4–S5. Las etiquetas de la portada distinguen los pases de Simuladores y Repaso de las condiciones propias de Educación Inicial.

El usuario realizará la revisión funcional y visual. Los tests anteriores que fijan literalmente el quiz, la galería o el Tutor IA independiente describen la portada previa y deberán adaptarse cuando se retome el trabajo de pruebas. No fueron modificados ni ejecutados en esta fase.
