# Guía del frontend de la landing

Actualización: 3 de noviembre de 2026, V6. Videos entregados, comprimidos y conectados al scroll. Implementación en HTML, CSS, JavaScript del navegador y GSAP/ScrollTrigger locales. Las pruebas siguen a cargo del usuario. Detalles y tamaños en [LANDING_VIDEO_INTEGRATION.md](LANDING_VIDEO_INTEGRATION.md).

## Dónde realizar cada cambio

| Necesidad | Archivo responsable |
| --- | --- |
| Texto, orden y estructura de secciones | `src/presentation/public/index.html` |
| Colores y tipografía institucionales | `src/presentation/public/css/theme.css` |
| Variables de la página pública y estructura de navegación | `src/presentation/public/css/public-shell.css` |
| Avatar y desplegable de sesión compartidos | `src/presentation/public/css/header.css` y `js/app.js` |
| Disposición, componentes, medios y adaptación móvil de la landing | `src/presentation/public/css/landing-home.css` |
| Footer compartido | `src/presentation/public/css/footer.css` |
| Arranque de la landing | `src/presentation/public/js/landing-home.js` |
| Ejemplos locales de Inicial | `src/presentation/public/js/landing/data.js` |
| Tabs de productos, Flashcard y formulario de Inicial | `src/presentation/public/js/landing/demos.js` |
| Menú móvil, anclas y enlace heredado `?openChat=true` | `src/presentation/public/js/landing/navigation.js` |
| Apariciones y escenas sincronizadas con scroll | `src/presentation/public/js/landing/motion.js` |
| Activar cada vídeo y configurar sus archivos | `src/presentation/public/js/landing/media-config.js` |
| Selección de orientación, carga diferida y fotograma según scroll | `src/presentation/public/js/landing/media.js` |
| Originales, derivados y prompts de imágenes | `src/presentation/public/assets/landing/` |
| Exportar imágenes responsivas y fotogramas | `scripts/prepare-landing-assets.js` |
| Comprimir videos y extraer primeros fotogramas reales | `scripts/prepare-landing-videos.py` |
| Cache bust de HTML e imports locales | `src/presentation/update-cache.js` |

`landing-home.js` es un módulo ES que únicamente importa y coordina inicializadores. No contiene ejemplos, lógica de sesión ni HTML generado para toda la página. Los módulos usan imports estáticos; el build actualiza sus versiones junto con las referencias del HTML.

## Mapa de secciones

| Etiqueta | ID / elemento | Función |
| --- | --- | --- |
| S01 | `hero-section` | Identidad de la empresa y póster/vídeo de marca |
| S02 | `herramientas-section` | Simulador docente, Simulador médico y Flashcards |
| S03 | `inicial-section` | Plataforma especializada y demo de conclusiones |
| S04 | `boletin-section` | Presentación editorial y enlace a `/library` |
| S05 | `vision-section` | Herramientas actuales, campus futuro y proyección institucional |
| S06 | `planes-section` | Pases de Simuladores y Repaso |
| Footer | `home-footer` | Enlaces institucionales, soporte y condiciones |

El namespace estable de CSS es `body.landing-page`. Las versiones de medios pertenecen a las carpetas de activos, no al nombre de la clase de la página.

## Separación de responsabilidades

## Ajustes finales — 4 de noviembre de 2026

Las anclas de cabecera y los enlaces internos de sección usan un recorrido controlado en `landing/navigation.js`. El destino se recalcula durante el desplazamiento para absorber los cambios de altura de paneles y medios; se reserva la altura real de la cabecera y la barra de créditos. La rueda, el toque y las teclas de desplazamiento cancelan la animación. Se respeta movimiento reducido y se actualiza el hash al finalizar. El scroll nativo suave queda desactivado solo durante ese recorrido, evitando dos animaciones simultáneas.

«Abrir mis tarjetas» apunta a `/repaso?view=dashboard`, que selecciona Mis Mazos aunque la última vista guardada fuera Notas. La opción 4 del asistente describe el Boletín informativo de IA, con destino `/library`.

Las modales de acceso y paywall muestran beneficios reales con mayor jerarquía, espaciado y acciones claras. Los estilos del encabezado de configuración de simuladores se acotaron a `.config-modal` para que no desconfiguren otras modales. No se ejecutaron pruebas por indicación del usuario. El usuario autorizó el commit y push a `origin/main` para publicar estos cambios junto con el trabajo acumulado.

- **HTML:** contenido semántico, enlaces reales, formularios locales y fuentes responsivas. El archivo está indentado y sus secciones tienen comentarios identificadores.
- **CSS:** estructura, componentes, estados, tipografía, breakpoints y alternativas de movimiento. No se oculta contenido esperando que termine de cargar JavaScript.
- **JavaScript:** comportamiento y estado local. No cambia precios, permisos, cuotas o reglas del backend. Las demos no llaman a IA ni guardan datos de alumnos.
- **Sesión y Hubi:** siguen en los componentes compartidos. Nunca volver a declarar manualmente `chatbot-container`, `chatbot-toggle` o el menú de cuenta dentro de la landing.
- **Datos de producto:** Tutor IA y Notas son capacidades compartidas por ambos simuladores y Flashcards; Notas sigue en `/repaso?view=notes`. Inicial tiene su sección propia. No introducir prestaciones que no existan en la documentación del módulo correspondiente.

## Motion y accesibilidad

Los productos y la visión usan CSS sticky en escritorio. ScrollTrigger cambia estados y progreso; el scroll conserva su comportamiento nativo. En móvil se apilan las secciones y se retira el parallax. `prefers-reduced-motion` revierte las animaciones y elimina el desplazamiento suave.

Los tabs permiten flechas e Inicio/Fin. El cambio automático por scroll no oculta un control o panel que conserva el foco. Las apariciones se ejecutan al intersectar la pantalla; su estado inicial visible no depende de un script en el `head`.

## Videos integrados y fotogramas

Los seis pósteres actuales corresponden a tres escenas con composición horizontal y vertical. `picture` selecciona el recurso de móvil; no se sirve un único fondo recortado para todos los tamaños. Las imágenes de Hero y Boletín son ilustraciones editoriales, no pruebas de clientes ni publicaciones reales. La escena de Inicial también es ilustrativa.

Los tres slots están habilitados con los seis archivos recibidos. La web consume las copias MP4/H.264 de `assets/landing/video/web-v1/` y sus fotogramas en `posters/web-v1/`. Bajar avanza el video y subir retrocede; los elementos permanecen pausados y sin controles de reproductor. Se carga una orientación y solo al acercarse a la escena. El Hero incorpora una escena sticky breve en escritorios amplios; móvil mantiene el flujo normal. Reducción de movimiento, ahorro de datos o error conservan el póster. La banda «Conocimiento en acción» y sus dependencias se retiraron; las demos útiles continúan en productos e Inicial.

## Limpieza realizada y compatibilidad

- La landing dejó de cargar `landing.css`, que contiene los componentes de la portada anterior. La reemplazan la base `public-shell.css` y la presentación `landing-home.css`.
- `landing.css` y `home-animations.js` se conservan porque todavía los carga `pricing.html`. No eliminarlos sin migrar primero esa página. Su presencia en el repositorio no implica una dependencia de la portada actual.
- Se retiraron las reglas de los antiguos cuadros de observación/salida, el CTA redundante de Hubi, el estado editorial sin enlace y otros estilos que ya no tenían markup en la landing.
- Se retiró el modal manual de acceso que había quedado como contenedor vacío. La autenticación usa el flujo OAuth y las ventanas de los componentes compartidos.
- Los ejemplos salieron del archivo de arranque y quedaron en `landing/data.js`; las funciones de navegación, motion y controles están en módulos separados.
- Las imágenes antiguas se movieron a `assets/landing/archive/v3/`; se conservaron originales y derivados. No se borraron recursos compartidos del proyecto.
- `update-cache.js` contempla ahora los imports de los módulos de la landing y normaliza sus versiones al calcular el hash, evitando que ese hash se modifique a sí mismo en cada build.

## Entrega y límites de verificación

Se generaron ocho originales con la herramienta integrada `image_gen`, se inspeccionaron sus resultados como imágenes y se exportaron sus derivados web/fotogramas. No se ejecutaron pruebas unitarias, lint, navegador, capturas de la web, build ni mediciones de rendimiento por solicitud del usuario. Por ello no se certifican resultados de pruebas ni puntuaciones visuales.

La exportación de imágenes ejecutada fue `node scripts/prepare-landing-assets.js`. Para los próximos cambios, leer primero esta guía y el documento del módulo afectado; mantener las reglas de negocio en sus capas actuales.
