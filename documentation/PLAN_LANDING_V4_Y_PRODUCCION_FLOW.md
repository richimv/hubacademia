# Landing V4: correcciones funcionales y producción audiovisual

> Entrega V5: ya se generaron e integraron las imágenes aprobadas de Hero, Inicial y Boletín, con versiones horizontales y verticales. Los ocho originales y prompts están en `assets/landing/media-manifest.json`; los primeros/finales para Flow están en `assets/landing/flow/v5/`, con una guía de producción. La arquitectura actual se describe en `LANDING_FRONTEND_GUIDE.md`. La producción de vídeos sigue a cargo del usuario; no está habilitada por defecto.

Fecha: 3 de noviembre de 2026. Estado: correcciones de contenido y conexión implementadas localmente; nueva dirección audiovisual propuesta para revisión. Las pruebas quedan a cargo del usuario. No se ha generado vídeo ni se ha desplegado.

## La empresa y sus productos

Hub Academia desarrolla soluciones inteligentes y aplica IA al conocimiento profesional. La portada conserva ese mensaje corporativo. La sección de soluciones se concentra en tres experiencias de estudio: Simulador docente, Simulador médico y Repaso con Flashcards. Educación Inicial ocupa únicamente su sección especializada.

Los tres productos de estudio disponen de Tutor IA contextual. Sus respuestas se pueden guardar en una misma libreta de Notas, accesible en `/repaso?view=notes`. El tutor se ofrece según las condiciones del modo de examen: la portada no debe prometer asistencia durante un simulacro que la restringe. Hubi es el asistente de orientación general del sitio y cumple una función diferente.

Evidencia consultada: `MODULO_REPASO_TECH_SPECS.md`, `CHAT_IA_TECH_SPECS.md`, `MI_BIBLIOTECA.md`, `SISTEMA_AUTENTICACION.md` y los métodos `saveAsNote` de `quiz-tutor.js` y `tutor-chat.js`. Ambos guardan mediante `/api/library/notes`; los tipos de origen son `quiz` y `flashcard`. No se modificaron estos flujos de dominio.

## Correcciones aplicadas en esta iteración

| Punto observado | Causa en el código | Cambio |
| --- | --- | --- |
| Hubi duplicado y una imagen suelta al pie | `index.html` incluía IDs de chat y botón que `ChatComponent` vuelve a inyectar en `body`. | Retirado el HTML manual. El componente compartido mantiene una única ventana y un único botón. Su tamaño en la landing baja a 72 px en escritorio y 60 px en móvil. |
| Perfil de sesión ausente | La portada apuntaba a `services/authService.js`, `services/sessionManager.js` y `utils/uiManager.js`, rutas inexistentes. También faltaban el SDK de Supabase y los estilos del menú de cuenta. | Cargados los módulos reales: NetworkService, AuthApiService, SessionManager, UIManager y los estilos compartidos de cabecera. Se conserva la sesión existente y su renderizado de avatar, nombre, nivel, perfil, gestión si corresponde y salida. |
| Menú de perfil que solo cerraba una vez al pulsar fuera | El listener compartido usaba `{ once: true }`. | El cierre fuera funciona en cada apertura; Escape cierra y devuelve el foco; el botón mantiene `aria-expanded`. |
| Footer con un segundo bloque publicitario y marca gigante | La composición anterior añadía un CTA hacia Hubi y un wordmark sobredimensionado. | Ambos retirados. Permanecen cuatro columnas y la información institucional, legal y de pago. |
| Boletín sin acceso a su página | El CTA de la sección abría el asistente y el footer volvía a un ancla. | Ambos enlazan a `/library`. La página adopta el nombre Boletín de Inteligencia Artificial y ofrece tres fuentes de IA verificadas; el catálogo previo permanece como Archivo de consulta. |
| Inicial repetido en soluciones | La historia de producto incluía la misma plataforma que se desarrollaba en la sección siguiente. | Tabs y capítulos pasan a Docentes, Salud y Flashcards. Inicial conserva su sección propia. |
| Relación entre módulos poco clara | Tutor y Notas no figuraban como capacidades comunes. | Explicación explícita en los tres productos y un bloque compartido con enlace a Mis Notas. |
| Captura antigua de producto en la landing | Se reutilizaba una imagen general de `assets/`. | Retirada. Los recorridos de ambos simuladores se explican mediante HTML. La siguiente producción usará recursos exclusivos de la landing. |

No se ejecutaron tests, lint, navegador, capturas ni auditorías de rendimiento. Estas correcciones se fundamentan en lectura del código y en las capturas aportadas por el usuario; su comportamiento queda pendiente de su revisión.

## Dirección audiovisual propuesta

La siguiente versión debe expresar una empresa de producto con identidad propia. Retiraremos gradualmente el mapa luminoso del Perú, los pictogramas holográficos, los filamentos azules y el libro con conexiones de neón. Las imágenes actuales continúan temporalmente para no sustituirlas por espacios vacíos mientras se decide la nueva producción.

Propongo una pieza cinematográfica de marca en el hero y demostraciones de producto hechas con interfaz real. El resto combina fotografía editorial y animación HTML al hacer scroll. La página no necesita seis vídeos reproduciéndose a la vez.

### Portada: una identidad que se reconoce

- Pieza propuesta: vídeo de 8 segundos, sin voz, con una escultura de estudio basada en la geometría del símbolo de Hub Academia. Material grafito mate, detalles azules de marca y luz de estudio. La forma se diseña y se aprueba en una imagen antes de animarla.
- Fotograma inicial: símbolo completo en el tercio derecho, perspectiva de tres cuartos, plano amplio y estable; fondo negro neutro. El 45% izquierdo queda libre de objetos y destellos para el titular HTML. La referencia de identidad es exclusivamente el logo institucional, sin reutilizar ilustraciones antiguas.
- Segundos 0–2: una luz lateral revela la textura y los cantos del objeto. El símbolo ya existe desde el inicio; no nace de partículas.
- Segundos 2–5: desplazamiento de cámara muy pequeño y un reflejo suave recorren la geometría. El objeto conserva su forma y posición principal.
- Segundos 5–8: cámara e iluminación regresan lentamente al encuadre de partida.
- Fotograma final: el mismo plano de inicio, con posición y luz compatibles para cerrar el bucle. Usar la misma imagen como referencia inicial y final ayuda a exigir el retorno, aunque el empalme final deberá ajustarse en edición si la generación no cierra de forma limpia.
- Texto, logo completo, CTA y controles permanecen en HTML. No se solicita a Flow que dibuje letras ni interfaces.
- Versión móvil: composición vertical nueva, con el símbolo en la mitad inferior y espacio superior para el titular. No se dependerá de recortar el centro de la versión horizontal.

Prompt propuesto para Flow (requiere los fotogramas aprobados):

> Plano cinematográfico de estudio del objeto de marca mostrado en los fotogramas de referencia. Conserva exactamente su geometría, proporciones y materiales durante los ocho segundos. Grafito mate, cantos precisos y luz lateral suave con un acento azul contenido. Mantén el objeto en el tercio derecho y todo el lado izquierdo tranquilo y oscuro. Durante los primeros dos segundos, una luz rasante revela su textura. Entre los segundos dos y cinco, realiza un desplazamiento de cámara de apenas unos centímetros. Entre cinco y ocho, regresa de forma continua a la posición e iluminación iniciales y termina como el fotograma final suministrado. Sin cortes, sin deformaciones, sin partículas, sin hologramas, sin mapas, sin elementos nuevos, sin texto, sin voz y sin música.

No se garantiza que el modelo siga el tiempo con precisión de edición. El montaje debe seleccionar el tramo útil y ajustar el bucle; el sitio siempre dispone del póster estático.

### Soluciones: mostrar cómo estudia una persona

Esta sección mantiene tres capítulos, cada uno con su propio material visual. No se generan pantallas de producto con Flow porque puede alterar las etiquetas o inventar controles.

| Producto | Material a preparar | Inicio | Desarrollo | Cierre |
| --- | --- | --- | --- | --- |
| Simulador docente | Captura nueva y vídeo real de 8–12 s con datos de demostración, o composición HTML equivalente. | Una casuística pedagógica en modo estudio. | Se revisa una respuesta y se abre el Tutor IA contextual. | Una explicación se guarda en Notas; se ve la confirmación real. |
| Simulador médico | Captura nueva y vídeo real de 8–12 s, o HTML. | Caso de Salud en el simulador. | Revisión de la explicación y consulta al tutor. | El concepto se conserva en la misma libreta de Notas. |
| Repaso | Tarjeta nueva en HTML o grabación real de 6–8 s. | Anverso con una pregunta breve. | Se gira, aparece la respuesta y se consulta una duda al tutor. | Guardado de una explicación en Notas y elección del siguiente repaso. |

El scroll sincroniza los cambios de estado de la interfaz HTML. Si se usan grabaciones, se activan al entrar su capítulo en pantalla y se pausan al salir. No hacen falta reproducción inversa ni búsqueda de fotogramas por cada píxel de scroll para comunicar el recorrido. Las grabaciones deben omitir datos personales y reflejar exactamente los permisos reales del modo elegido.

### Educación Inicial: una escena de trabajo verosímil

- Primera entrega recomendada: fotografía editorial original. Una docente adulta observa materiales y evidencias de aprendizaje en un ambiente peruano contemporáneo. Su gesto y los materiales comunican el trabajo; la interfaz se muestra en HTML, al lado.
- Composición horizontal con la actividad a la izquierda y área tranquila hacia la derecha para la demostración. Versión móvil vertical con encuadre propio.
- Si después se decide animarla en Flow: clip de 6 segundos. Fotograma inicial con las manos sobre el cuaderno; movimiento único de pasar una página o colocar una ficha; fotograma final con las manos en reposo. Cámara fija, luz natural y continuidad de manos y objetos. No se simula una evaluación real ni se inventa texto legible en el cuaderno.
- La demo sigue explicando que la docente aporta las evidencias, revisa el borrador y mantiene el criterio profesional.

Prompt orientativo:

> Conserva el encuadre, la docente adulta y los materiales de la fotografía inicial. Cámara fija. Durante seis segundos, la docente coloca con calma una ficha de observación sobre el cuaderno y deja las manos en reposo, como indica el fotograma final. Luz natural suave, texturas reales, movimiento cotidiano mínimo. Sin hologramas, pantallas flotantes, texto nuevo, voces ni cambios del mobiliario. Mantén la continuidad anatómica de las manos.

### Boletín IA: portada editorial, no iconografía tecnológica genérica

- Reemplazo propuesto: una composición editorial original con tres piezas que representen investigación, educación y políticas públicas. Fotografía de materiales impresos y detalles de lectura, con tratamiento tipográfico hecho en HTML.
- Nada de mapas iluminados, libros de los que salen circuitos o portadas ajenas tomadas del catálogo general.
- Los bloques enlazan a contenido real de `/library`. Hoy hay tres fuentes seleccionadas; el siguiente paso editorial es publicar fichas propias con fecha, autor/fuente y enlace original. No se presenta la selección actual como un feed automático de noticias.
- Si se añade vídeo, usar únicamente 4–6 segundos de movimiento de papel/luz, sin simular titulares. Prioridad menor que el vídeo del hero.

### Visión, pases y footer

El timeline sigue funcionando con ilustraciones/diagramas de producto dibujados en HTML o SVG cuando aporten información: herramientas disponibles, campus por desarrollar e iniciativas institucionales. El scroll activa el capítulo y su progreso. El campus continúa indicado como futuro. Pases y footer se mantienen ligeros, sin vídeos de fondo ni fotografías de relleno.

## Cómo producir en Google Flow

La ayuda oficial explica el flujo **Vídeo → Fotogramas**: añadir una imagen inicial y otra final, describir la acción entre ellas, elegir formato/modelo/duración y generar. Los controles pueden variar según el modelo y la disponibilidad de la cuenta. Fuente: [Crear vídeos en Google Flow](https://support.google.com/flow/answer/16353334?hl=es).

1. Primero producir y aprobar el fotograma principal en 16:9 y su composición móvil en 9:16. No generar todavía lotes completos de vídeos.
2. Preparar el final partiendo de la misma escena. Para un bucle, conservar el encuadre inicial; para una acción, definir exactamente dónde terminan manos, cámara y objetos.
3. En Flow, elegir Vídeo y Fotogramas, adjuntar inicio y final e introducir el prompt de movimiento. Solicitar inicialmente una sola variación.
4. Usar 8 s para el hero y 6 s para la acción de Inicial si el modelo seleccionado ofrece esas duraciones. La [matriz oficial de modelos y funciones](https://support.google.com/flow/answer/16352836?hl=es-ES) permite consultar la compatibilidad de fotogramas y formatos. Los nombres y costes se revisan en la interfaz antes de generar.
5. Exportar el máster. Crear después MP4/WebM de distribución y un póster WebP/AVIF. El máster de producción no se descarga automáticamente al abrir la web.

Las recomendaciones creativas y las duraciones de montaje de este documento son decisiones de diseño, no garantías de comportamiento del modelo. No se ha ejecutado una generación de Flow en esta fase.

## Organización de recursos

Todo el material de portada se mantiene bajo `src/presentation/public/assets/landing/`:

```text
landing/
  source/     originales y, a futuro, másteres de producción
  images/     imágenes responsivas para la web
  posters/    póster de cada vídeo, escritorio y móvil
  video/      MP4 y WebM optimizados
  README.md   procedencia y organización
```

Los PNG de la primera propuesta se movieron a `source/` y sus WebP a `images/`. No se borraron originales. Se actualizaron sus referencias y el script de exportación. El logo y el avatar funcional de Hubi conservan su uso institucional; las futuras piezas visuales serán independientes del catálogo general de `assets/`.

Nombres de próxima producción: `hero-brand-desktop-start`, `hero-brand-mobile-start`, `hero-brand-desktop-loop`, `hero-brand-mobile-loop`, `inicial-editorial-desktop`, `inicial-editorial-mobile`, `boletin-editorial-desktop` y sus derivados. Estos nombres son propuestas, no archivos ya producidos.

## Integración responsiva de los futuros vídeos

- El póster es el primer contenido visible. El título y los botones no esperan al vídeo.
- Hero: `muted`, `playsinline`, control de pausa accesible y carga del archivo según el breakpoint. Nunca descargar ambas versiones a la vez por mantener dos vídeos ocultos con CSS.
- En móvil, reducción de movimiento o ahorro de datos, priorizar póster; el vídeo puede quedar como reproducción voluntaria.
- Fuera de pantalla, pausar vídeos. No mantener varios decodificadores activos por capítulos invisibles.
- Objetivos iniciales de exportación, sujetos al contenido: hero de escritorio 2–4 MB, móvil 1–2 MB, póster 100–200 KB. Son presupuestos de producción, no resultados de mediciones realizadas.
- Mantener la demostración y el CTA operables con teclado, foco visible y contenido estático legible cuando no hay animación.

## Orden de la siguiente entrega

1. Revisión del usuario de las correcciones funcionales ya escritas.
2. Acordar la dirección del hero y producir sus imágenes de inicio/final, escritorio y móvil.
3. Producir el primer clip en Flow y preparar sus derivados web.
4. Crear visuales nuevos de producto e Inicial, sin reutilizar imágenes generales del proyecto.
5. Sustituir las tres imágenes actuales y completar el diseño editorial del Boletín.

No se requiere volver a decidir la estructura de productos ni la libreta compartida: ya están definidas por el usuario y la documentación. La decisión pendiente es creativa: aceptar o ajustar los encuadres y el tratamiento del nuevo material antes de producirlo.
