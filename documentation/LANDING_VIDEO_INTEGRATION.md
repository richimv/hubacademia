# Videos de la landing y actualización de acceso y Hubi

Actualización: 3 de noviembre de 2026. Implementado en archivos locales; la validación visual y funcional queda a cargo del usuario. No se ejecutaron pruebas, build, lint ni navegador.

## Exportación de videos

Los seis MP4 entregados se conservan en `src/presentation/public/assets/landing/video/`. Las versiones que consume la web están en `video/web-v1/`; sus primeros fotogramas, en `posters/web-v1/`. El archivo original `inicial-deskto.mp4` conserva su nombre y se exporta como `web-v1/inicial-desktop.mp4`.

| Escena | Original, MB decimales | Web, MB decimales | Reducción |
| --- | ---: | ---: | ---: |
| Hero escritorio | 3,26 | 1,57 | 51,8 % |
| Hero móvil | 4,51 | 1,11 | 75,4 % |
| Inicial escritorio | 4,54 | 3,80 | 16,3 % |
| Inicial móvil | 5,68 | 2,52 | 55,6 % |
| Boletín escritorio | 32,01 | 3,79 | 88,1 % |
| Boletín móvil | 13,11 | 2,50 | 80,9 % |
| **Total de las dos orientaciones** | **63,10** | **15,30** | **75,8 %** |

Un visitante solo carga una orientación: aproximadamente 9,16 MB de video al recorrer las tres escenas en escritorio o 6,13 MB en móvil. No se descargan todas las escenas al abrir la página: la carga se inicia al acercarse a cada una. La portada usa inicialmente un WebP; el video se superpone cuando dispone de un fotograma.

Parámetros: MP4/H.264, `yuv420p`, 24 fps, sin audio, sin B-frames y un fotograma clave cada seis fotogramas. Escritorio exportado a 1440 × 810 y móvil a 720 × 1280. La duración resultante es de unos 7,83 segundos en cada escena, conservando la secuencia entregada. `faststart` sitúa el índice al principio del MP4. Los parámetros de codificación e índice se apoyan en la documentación de [libx264 en FFmpeg](https://ffmpeg.org/ffmpeg-codecs.html#libx264_002c-libx264rgb) y [contenedores MOV/MP4](https://ffmpeg.org/ffmpeg-formats.html#mov_002c-mp4_002c-ismv).

La exportación usa `scripts/prepare-landing-videos.py`, independiente del build de la aplicación. Se ejecutó con FFmpeg portátil obtenido del paquete `imageio-ffmpeg==0.6.0` de PyPI, bajo `.tools/media/`, ignorado por Git. No se añadieron dependencias de producción. Para repetirla desde la raíz:

```powershell
python scripts/prepare-landing-videos.py --ffmpeg .tools/media/ffmpeg.exe
```

El script escribe solo derivados y genera `video/web-v1/manifest.json` con tamaños y metadatos. No reemplaza los originales.

## Comportamiento del scroll

- `landing/media-config.js` habilita Hero, Inicial y Boletín y define únicamente rutas a `web-v1`.
- `landing/media.js` mantiene cada video pausado y actualiza `currentTime` a partir de la posición de scroll. Bajar avanza; subir retrocede. No hay reproductor visible, audio, reproducción autónoma ni bucles.
- El Hero usa una escena corta de posición sticky en escritorio desde 961 px de ancho y 800 px de alto. En pantallas menores el contenido mantiene su flujo normal y el video responde al paso por la pantalla.
- Inicial y Boletín avanzan con su entrada y desplazamiento por la ventana, sin bloquear el scroll.
- Una actualización por `requestAnimationFrame` agrupa eventos. Si un decoder sigue buscando, el evento `seeked` toma la posición más reciente, evitando acumular trabajos antiguos.
- `IntersectionObserver` carga solo la orientación elegida al acercarse a 400 px de cada escena. Al cambiar orientación se libera la fuente anterior.
- Reducción de movimiento, ahorro de datos y errores de video conservan el fotograma estático. La selección de imágenes funciona con `picture`, incluso sin JavaScript.
- Se retiró el parallax adicional de los medios con video para evitar dos movimientos superpuestos o saltos entre póster y fotograma.

## Simplificación de la portada

Se retiró la banda «Conocimiento en acción», junto con sus estilos, datos e inicializador. Las demostraciones de productos y conclusiones descriptivas conservan la interacción útil. La portada conecta directamente con Soluciones, sin el contenedor desalineado de la captura.

## Hubi, asistente principal

El asistente guía conserva su controlador `js/chat.js` y sus servicios. `css/chat.css` se sustituyó por una presentación acotada al widget vivo: superficies de tema, panel de 480 px, icono de cabecera de 32 px, compositor de 48 px y geometría equivalente a los tutores de estudio. Se retiraron estilos de menús de historial/persona que el markup actual ya no renderiza, duplicaciones de tema, brillos y estilos de invitación de tamaño fijo.

La invitación es un control compacto sobre el lanzador de 56 px (52 px en móvil), con cierre y apertura separados accesibles por teclado. Ya no tiene avatar duplicado, flecha decorativa ni flotación perpetua. Se oculta tras un intervalo si no está siendo usada; el cierre manual se conserva durante la sesión.

El panel cerrado queda `inert`; Escape cierra, se restaura el foco y el scroll anterior, y el modo modal recorre el foco dentro del chat. El cierre continúa restaurando el estado previo mediante `replaceState`, sin volver a renderizar Biblioteca. Cerrar desde el botón utiliza ahora el mismo flujo que la X. El texto de registro dejó de prometer una cantidad de vidas incrustada.

Se conserva la distinción del producto: Hubi orienta sobre la plataforma; los tutores de simuladores y flashcards profundizan en el material de estudio. No se cambian cuotas, persistencia ni motores del backend.

## Acceso y registro

`login.html` conserva sus IDs de formularios y controles; `auth-page.css` aplica el diseño de acceso mediante `auth-redesign`. La hoja compartida `auth.css` mantiene los componentes OTP que también usa Perfil. El diseño específico incluye cabecera de marca, presentación lateral en escritorio, formulario compacto en móvil, campos y botones planos y modales de recuperación acordes.

`login.js` actualiza título, selección ARIA y foco de tabs, con flechas e Inicio/Fin. Se retiró la carga duplicada de `config.js`. OAuth, correo/contraseña, OTP, validaciones, recuperación y redirección segura conservan sus controladores existentes.

## Alcance de la entrega

Se aplicó la dirección de `design-taste-frontend` ya usada por la landing y las pantallas de trabajo, conservando identidad, Inter y paleta. Las conversiones y la extracción de fotogramas son operaciones de producción de recursos, no pruebas de la aplicación. No se certifican rendimiento medido en navegador, fluidez en dispositivos concretos ni compatibilidad validada.
