# Fotogramas y prompts para Google Flow

Los vídeos ya están integrados en la landing mediante desplazamiento. Estos fotogramas y prompts se conservan como material de autoría para futuras versiones.

## Archivos de entrada

| Pieza | Fotograma inicial | Fotograma final | Tamaño de ambos | Duración propuesta |
| --- | --- | --- | --- | --- |
| Hero escritorio | `hero-desktop-start.jpg` | `hero-desktop-start.jpg` | 1920 × 1080, 16:9 | 8 s |
| Hero móvil | `hero-mobile-start.jpg` | `hero-mobile-start.jpg` | 1080 × 1920, 9:16 | 8 s |
| Inicial escritorio | `inicial-desktop-start.jpg` | `inicial-desktop-end.jpg` | 1920 × 1080, 16:9 | 6 s |
| Inicial móvil | `inicial-mobile-start.jpg` | `inicial-mobile-end.jpg` | 1080 × 1920, 9:16 | 6 s |
| Boletín escritorio, opcional | `boletin-desktop-start.jpg` | `boletin-desktop-start.jpg` | 1920 × 1080, 16:9 | 6 s |
| Boletín móvil, opcional | `boletin-mobile-start.jpg` | `boletin-mobile-start.jpg` | 1080 × 1920, 9:16 | 6 s |

En Hero y Boletín, el mismo archivo inicial se selecciona también como final para pedir un bucle; no se guardan copias idénticas. En Inicial son dos estados de la misma acción. El fotograma final es opcional: si Flow produce una transición forzada al utilizarlo, prueba con el inicial y el mismo prompt de movimiento. Los PNG nativos se conservan en `source/v5/`; estos JPEG son exportaciones a las dimensiones de producción.

## Procedimiento

1. En tu proyecto de Flow selecciona Vídeo y Fotogramas; carga el archivo inicial y, si lo deseas, el final de la misma fila.
2. Selecciona 16:9 o 9:16 según esa fila y una duración compatible con el modelo disponible en tu cuenta.
3. Pega el prompt correspondiente de abajo. En la versión móvil conserva el encuadre vertical; no pidas recortar el horizontal.
4. Descarga el MP4 y guárdalo con el nombre indicado en `../../video/README.md`.

La ubicación visual de los controles y las funciones disponibles pueden variar según modelo/cuenta. Referencias: [Crear vídeos con Flow](https://support.google.com/flow/answer/16353334?hl=es) y [modelos y funciones](https://support.google.com/flow/answer/16352836?hl=es-ES).

## Hero — prompt para 8 segundos

```text
Produce un plano cinematográfico de estudio de ocho segundos, usando los fotogramas proporcionados como inicio y final. Conserva exactamente la escultura geométrica H de Hub Academia: dos pilares, el travesaño angular, las proporciones, el grafito cepillado y sus caras interiores azules. Es un objeto físico sólido sobre una superficie negra, no un holograma. Respeta el encuadre de referencia y las zonas oscuras vacías reservadas para el título de una página web; no añadas texto al vídeo.

0–2 segundos: una luz lateral tenue revela la textura del metal; el objeto permanece inmóvil.
2–5 segundos: movimiento de cámara casi imperceptible, de unos pocos centímetros, y un reflejo suave recorren los cantos. Mantén toda la silueta visible.
5–8 segundos: vuelve de manera continua a la cámara y la iluminación del fotograma inicial. Termina en el fotograma final suministrado para facilitar un bucle.

Iluminación de producto sobria, óptica realista y materiales mates. Sin cortes, partículas, circuitos, mapas, letras, logotipos adicionales, humo, resplandores de neón, deformaciones del objeto, voz ni música. En el formato vertical conserva la escultura en la mitad inferior y el espacio oscuro superior.
```

Salida: `hero-desktop.mp4` / `hero-mobile.mp4`. No hace falta que el vídeo incluya el titular ni el botón; se superponen mediante HTML. El modelo puede variar el tiempo de cada movimiento: el cierre del bucle se ajusta en edición si resulta necesario.

## Inicial — prompt para 6 segundos

```text
Crea una toma continua de seis segundos de la misma escena de trabajo docente mostrada en la referencia. Cámara completamente fija. Conserva el encuadre, la ropa de la docente adulta, sus manos, el cuaderno, la tarjeta marfil, el lápiz azul, la mesa de madera y los materiales de aula. La tarjeta no tiene texto legible.

0–1,5 segundos: la mano derecha sostiene la tarjeta justo sobre el cuaderno, en la posición inicial.
1,5–4,5 segundos: baja la tarjeta suavemente y la apoya en el lugar situado directamente debajo. La mano izquierda permanece en reposo.
4,5–6 segundos: la mano derecha descansa junto al borde superior izquierdo de la tarjeta, como en el fotograma final.

Luz natural constante, texturas de piel y papel reales, movimiento cotidiano pequeño y continuidad anatómica de dedos y manos. Sin cambios en el mobiliario, objetos nuevos, texto nuevo, pantallas flotantes, efectos digitales, voz ni música. Respeta la orientación y la composición del fotograma, sea horizontal o vertical.
```

Salida: `inicial-desktop.mp4` / `inicial-mobile.mp4`. Esta acción se reproduce una vez por activación; no requiere un bucle que levante artificialmente la tarjeta.

## Boletín — prompt opcional para 6 segundos

```text
Anima durante seis segundos la naturaleza muerta editorial de la referencia, con cámara bloqueada. Mantén inmóviles los documentos, el diagrama impreso abstracto, los pliegues de papel y el clip azul. No conviertas las líneas impresas en texto, no hagas aparecer letras ni inventes titulares.

Durante los primeros tres segundos, una luz de estudio muy suave se desplaza ligeramente y revela la fibra del papel. Durante los últimos tres segundos regresa a la iluminación inicial y termina exactamente en la composición suministrada como fotograma final. El movimiento debe ser apenas perceptible y el aspecto debe seguir siendo una fotografía física realista.

Sin movimientos de objetos, paso de páginas, destellos, partículas, pantallas, hologramas, elementos nuevos, cortes, voz ni música. Conserva el espacio negativo y el encuadre original de la versión horizontal o vertical.
```

Salida opcional: `boletin-desktop.mp4` / `boletin-mobile.mp4`. La fotografía estática actual ya funciona como pieza final si prefieres no generar este vídeo.

## Simuladores y Flashcards

La landing mantiene sus recorridos en HTML, con textos y controles editables. Sus futuros clips deben capturar el producto real con una sesión de demostración: pregunta/tarjeta, respuesta, Tutor IA y guardar en Notas. No se generaron pantallas ficticias mediante IA. Esto evita presentar botones, resultados o comportamientos que no existan en la plataforma.

## Trazabilidad de las imágenes

Se usó la herramienta integrada `image_gen`. Ocho originales: Hero horizontal/vertical, Inicial inicio/final horizontal/vertical y Boletín horizontal/vertical. Los prompts completos de generación y sus roles se encuentran en `../../media-manifest.json`. El logo institucional fue referencia de geometría para el hero; no se reutilizaron los antiguos fondos de la landing.
