# 🩺 Specs Técnicas: Simulador Médico (Hub Academia)

## 1. Visión General
El **Simulador Médico** es el motor de entrenamiento de alto rendimiento de Hub Academia. Permite realizar simulacros personalizados (ENAM, SERUMS, Residentado) con una mezcla de preguntas de banco y generación por IA (RAG) en tiempo real.

---

## 2. Arquitectura de Archivos

### 🖥️ Frontend (Presentation)
- **`simulator-dashboard.html`**: Tablero de mando con KPIs y analíticas. Presenta un diseño de interfaz de usuario de alta fidelidad (*Premium Sci-Fi UI*) con tarjetas cuadradas en formato 1:1, efectos de "humo" atmosférico e integración de assets visuales temáticos.
- **`quiz.html`**: Interfaz de ejecución del examen (Motor de Quiz).
- **Control de Concurrencia (Anti double-tap)**: Bloqueo semafórico (`_isRating`) en el motor de flashcards para prevenir múltiples peticiones.
- **Filtros de Analítica**: Implementación de filtros por ventana de tiempo (7, 30, 90 días) y áreas clínicas específicas, integrados en el dashboard.

---
*Documentación técnica oficial - Actualizada Abril 2026*
se renderiza usando gráficos **SVG** nativos vectoriales, proporcionando animaciones `stroke-dashoffset` muy fluidas e interactivas.
- **`js/simulator-dash.js`**: Lógica del dashboard: inicialización de charts, manejo de configuración y stats local/API. Contiene visualización *Empty State* para los usuarios sin historial (Demo).
- **`js/quiz.js`**: Motor de interacción: manejo de estados (pregunta actual, respuestas), cronómetros, y batch loading. Permite la **creación manual e interactiva de Flashcards** desde el panel de revisión de desempeño.

### ⚙️ Backend (Application & Domain)
- **`medicoController.js`**: Orquestador de peticiones. Maneja la lógica de inicio, entrega y límites. Ahora soporta filtrado dinámico por `days` y `areas`.
- **`medicoService.js`**: El "cerebro" del módulo. Implementa la lógica híbrida: Banco -> IA Fallback. Gestiona la agregación de estadísticas bajo demanda.
- **`medicoRepository.js`**: Capa de persistencia. Incluye consultas optimizadas en PostgreSQL para análisis de `jsonb` (estadísticas por área) y series temporales de evolución.
- **`mlService.js`**: Interface con Gemini 2.5 Flash Lite para generación RAG y análisis de rendimiento.

### 🗄️ Infraestructura (Persistence)
- **`medicoRepository.js`**: Consultas SQL puras para `question_bank` y `quiz_history`.
- **Tablas Críticas:**
  - `question_bank`: Repositorio global indexado por `target` y `topic`.
  - `quiz_history`: Almacena puntajes y el objeto **JSONB `area_stats`**.
  - `user_question_history`: Tabla de anti-repetición (seen_at, times_seen).

---

## 3. Sistemas Core

El usuario puede cruzar variables fundamentales:
1. **Target**: ENAM, SERUMS (Medicina/Enfermería/Obstetricia), Residentado Médico (CONAREME).
2. **Áreas**: Multi-selección de 22 especialidades médicas agrupadas por categorías.

### 🧠 Motor Híbrido RAG (AI Agéntica)
1. **Fase 1 (Balanced Bank First)**: Intenta llenar el buffer de 5 preguntas desde el banco local balanceadamente (Max 2 por área).
2. **Fase 2 (Pro-Active AI Replenishment)**: Si el banco devuelve < 5 preguntas o no puede cumplir la cuota de balanceo (área agotada), se considera el stock como insuficiente.
3. **Fase 3 (RAG Maestro Flow)**: Invoca a Gemini 2.5 Flash Lite inyectando:
   - **Muestreo Aleatorio**: Máximo 5 áreas por lote para optimizar el contexto RAG.
   - **Guías Clínicas (RAG)**: Contexto extraído de Normas Técnicas/GPCs mediante búsqueda SQL ILIKE local.
   - **Deduplicación Semántica**: Scaneo de los últimos 200 temas generados.
   - **Estilo de Examen**: Adaptación al Target (ENAM, SERUMS, Residentado).

### 📊 Real-Feel Analytics (JSONB Intelligence)
- Al finalizar, el sistema calcula el desempeño por cada una de las 22 áreas.
- Estos datos se inyectan en una columna **JSONB** (`area_stats`).
- El dashboard lee esta estructura para renderizar un diagrama semántico ultra-rápido en barras HTML/CSS, permitiendo identificar fortalezas y debilidades subatómicas. A su vez, el **Motor IA Fallback** simula la presencia de Inteligencia Artificial para cuentas "Guest/Demo" imprimiendo evaluaciones y diagnósticos extendidos de la casuística particular de cada alumno.
- **Futura Mejora: Análisis Agéntico de Patrones de Error**: Se implementará un motor de IA que, procesando el historial completo de `area_stats`, generará automáticamente una **Guía de Estudio Dinámica**. Esta guía vinculará directamente los recursos académicos (PDFs, Videos, Lecturas) almacenados en la base de datos de la IPRESS con los puntos de dolor detectados del alumno.

---

## 4. Modos de Ejecución
- ⚡ **Simulacro Rápido (10 q)**: Feedback visual inmediato (Rojo/Azul) con auto-avance. La justificación médica y revisión profunda se reserva exclusivamente para el final del examen para maximizar la agilidad. *(Modo accesible también para cuentas Invitadas/Demo)*.
- 📚 **Modo Estudio (20 q)**: Enfoque formativo sin presión de tiempo.
- 🎯 **Simulacro Real (100 q)**: "Modo Ciego" (sin feedback), cronómetro de 120min y revisión diferida al final con generación de Flashcards selectivas.

---

## 🛡️ Integridad y Seguridad
- **Anti-Repetición**: Ciclo de enfriamiento de 24 horas (`seen_at`).
- **Validación server-side**: Los resultados se auditan en el backend para evitar manipulación de puntajes.
- **Deduplicación MD5**: Cada pregunta generada o inyectada tiene un hash único para evitar redundancia en el banco global.

---

## 📡 Resiliencia y Offline UX (v3.0)
Para garantizar la continuidad en exámenes de alta exigencia (100q) que duran entre 1 y 3 horas, el simulador incorpora un sistema de resiliencia avanzada:

1. **Persistencia de Sesión (Local Storage):** Cada respuesta marcada se serializa instantáneamente en el navegador. En caso de recarga accidental (F5) o caída de energía, al reabrir la ventana el examen se recupera tal cual.
2. **Longevidad Extendida de Sesión (24 Horas):** Se amplió el umbral de limpieza cronológica de `loadSession()` de 1 hora a 24 horas, eliminando descartes accidentales de exámenes de larga duración que se toman en varios bloques de tiempo.
3. **Cola de Sincronización Offline:** Si el envío de un examen completado falla por red al final, los resultados se encolan en `simulator_pending_submissions` y se libera la sesión activa. Un trabajador en segundo plano en `app.js` sincroniza estas entregas en cuanto detecta conectividad (al cargar cualquier página o en el evento `online` del navegador).
4. **Interfaz de Reintento ante Fallos de Lote:** Si la carga de lotes (`fetchNextBatch`) falla por corte de red, el sistema detiene el flujo de interacción mostrando un overlay con botón "Reintentar Carga" en lugar de finalizar y calificar prematuramente el simulacro.
5. **Validación de Integridad:** Al restaurar una sesión, el sistema verifica que el mazo coincida con la configuración actual para evitar colisiones.
6. **Estandarización de Errores:** Se eliminaron los `ReferenceError` mediante la migración a bloques `catch (error)` unificados y la invalidación de caché forzada (`v=20240410`).

---

## 7. Refinamiento UI/UX y Renderizado de Exámenes (Abril 2026)
Como parte de la evolución hacia un producto Premium (*High-fidelity UI*), se aplicaron rediseños estructurales al front-end del simulador:

1. **Retroalimentación Global (Omnipresent Feedback Box)**: Se eliminaron las bifurcaciones rígidas que forzaban el auto-avance ciego en los Simulacros Rápidos (10qs). Ahora, **todos** los exámenes interactivos (salvo el Modo Ciego del Simulacro Real) despliegan invariablemente la `feedbackBox`, permitiendo al usuario revisar la caja de **Explicación Médica** de manera pausada y requerir un clic manual para avanzar a la siguiente pregunta.
2. **Pintado de Explicaciones Médicas**: Se abandonó el color gris oscuro/verde clásico por un **sistema cromático Azul Premium** (`#60a5fa` y `#93c5fd`) para alinear de forma nativa la respuesta correcta y la explicación justificada al concepto de acierto (*Blue = Correct, Red = Wrong*).
3. **Manejo Seguro de Párrafos (Multi-paragraph rendering)**: Se parcheó la asignación asfixiante de `.textContent` migrando a una inyección controlada por `.replace(/\n/g, '<br>')` vía `.innerHTML`. Esto permite aprovechar al máximo la entrada del panel administrativo, asegurando que guiones o listas enviadas en la DB sean leídas limpiamente en Modo Estudio y Modo Revisión.
4. **Refactorización CSS a Flexbox**: Se eliminó la dependencia de arquitecturas Grid complejas causantes de parpadeos y desalineaciones de 13px en el Hub Academia. Se migró a *Flexbox* central para las tarjetas (`.mode-card`), asegurando que todos los iconos (`fa-layer-group`, `fa-rocket`) coincidan geométricamente exactos sin depender de resoluciones.
5. **Session Strict Expiration & Limit Validation**: Se reforzó la lógica de `loadSession()` para invalidar exámenes "zombis".
   - Limpieza cronológica de exámenes dejados a medias por más de 2 horas.
   - Restricción de colisiones cruzadas (`expectedLimit !== stored.maxQuestions`), impidiendo que un simulacro interrumpido de 20 preguntas ahogue e invada el inicio en limpio de un Simulacro Rápido de 10 preguntas.
6. **Aggressive Cache Busting**: Ante la persistencia de Service Workers / Cache del navegador, se implementó una agresiva cadena de invalidación (`?v=...`) en `quiz.html`, forzando en el cliente una recarga de todos los componentes gráficos y módulos ECMAScript sin necesidad de que el usuario vacíe su historial explícitamente.

---

## 8. Anti-Repetición y Sincronización de Sesiones (Mayo 2026)
Para evitar la duplicidad de preguntas durante las sesiones de estudio y simulacros, se implementaron mejoras en el flujo de datos:
1. **Historial Persistente (`user_question_history`)**: Al culminar y enviar las respuestas de un simulacro a través del endpoint `/submit`, el backend registra inmediatamente todas las preguntas de ese examen en `user_question_history`. Si el usuario ya vio la pregunta, se incrementa `times_seen` y se actualiza `seen_at` a la hora actual.
2. **Exclusión Dinámica**: Al generar preguntas (`generateQuiz`), el backend consulta las preguntas respondidas en las últimas 24 horas y las excluye de la búsqueda. Si el stock del banco local se agota, se activa la reposición con IA (RAG) para generar reactivos inéditos.
3. **Exclusión en la Misma Sesión**: Al solicitar lotes adicionales (`/next-batch`) en un mismo examen, el cliente envía la lista de IDs de preguntas actualmente presentadas en la sesión (`seenIds`). El backend concatena este vector con las preguntas de las últimas 24 horas para garantizar la exclusión absoluta de preguntas ya mostradas en la sesión activa actual.
4. **Detección de Duplicados en IA (Jaccard & Normalización)**: En los flujos de generación asistida por IA (Admin y User), el backend recupera hasta 50 preguntas existentes de la base de datos para la misma área y target. Estas preguntas se inyectan en el prompt como historial prohibido. Adicionalmente, se ejecuta un algoritmo de similitud por palabras (coeficiente Jaccard > 0.65) en la fase de auditoría de calidad (`checkQuality`) que, de ser activado, obliga a la IA a regenerar el reactivo en un ciclo de refinamiento iterativo.

---

## 9. Visualización Responsiva de Imágenes e Integración de Visor Lightbox Premium (Junio 2026)
Para asegurar que cuentos, infografías y diagramas largos inyectados como imágenes en `question_text` o `explanation` no sufran recortes y mantengan una legibilidad impecable en dispositivos móviles, se implementó el siguiente flujo de visualización:
1. **Desactivación de Recorte Forzado (Flexible Aspect-Ratio)**: Se eliminó la relación de aspecto rígida `1:1` (`aspect-ratio`) en los contenedores de imágenes (`.q-image-container-premium`, `.q-explanation-image-container-premium`, y `.review-q-image-container`) a favor de una adaptación fluida. Las imágenes se pintan en su proporción original sin deformación utilizando `object-fit: contain`.
2. **Visor Interactivo Lightbox (Zoom & Pan)**: Al hacer clic o tocar una imagen, se despliega una modal premium translúcida (`.lightbox-modal`) con controles flotantes de zoom.
3. **Controles y Gestos Integrados**:
   - **Controles UI**: Botones flotantes de Acercar (`+`), Alejar (`-`) y Restablecer (`1:1`).
   - **Gestos Móviles (Pinch-to-Zoom)**: Soporte nativo para pellizcar con dos dedos y escalar la imagen con fluidez.
   - **Arrastre (Drag/Pan)**: Permite navegar el contenido arrastrándolo de forma intuitiva con un dedo o el cursor del ratón.
   - **Doble Click / Doble Tap**: Amplía la imagen de forma inteligente a `2.5x` o la restablece si ya tiene zoom.
   - **Teclado**: Cierre inmediato mediante la tecla `Escape`.
4. **Micro-interacciones**: Al pasar el cursor sobre las miniaturas de imágenes en dispositivos de escritorio, se muestra un indicador flotante de lupa premium (`fa-search-plus`) y el cursor de ayuda `zoom-in`.

---

## 10. Mejoras de Usabilidad y Control de Historial en Simuladores (Junio 2026)
Para perfeccionar la experiencia interactiva, se optimizaron cinco aspectos críticos del simulador:
1. **Desplazamiento Suave e Imperceptible (`easeInOutQuad`)**: Se aumentó el retraso de inicio del scroll a **500ms** para dar tiempo a procesar visualmente el acierto/error de las opciones marcadas, y se refinó la velocidad de scroll hacia el botón Siguiente usando una curva cuadrática (`easeInOutQuad`) con una duración de **2200ms** y un desfase de 40px, proporcionando una transición sumamente suave, gradual e imperceptible.
2. **Redimensión del Botón Siguiente**: Se redujeron las dimensiones del botón `.btn-next-premium` (padding de `0.6rem 1.4rem`, font-size a `0.92rem` y min-width a `140px`) para asegurar una compatibilidad impecable y compacta tanto en teléfonos móviles como en ordenadores.
3. **Cierre Seguro del Lightbox y Botón Atrás**: Se integró la modal `#lightboxModal` con el gestor de estados centralizado de `window.uiManager`. Al abrir la modal se registra el estado `'lightboxModal'` en la pila de historial del navegador. Al hacer clic en "Atrás" (o deslizar hacia atrás en móviles), el UIManager intercepta el evento e invoca a `window.closeLightbox(true)` para ocultar el visor, restablecer el zoom y restaurar el scroll de la página de forma limpia, evitando salir del examen de manera accidental.
4. **Ocultación del Botón Siguiente en la Revisión**: Se programó la ocultación del `#nextBtnContainer` al iniciar `showExamReview` agregando la clase `hidden` (con fallback de búsqueda directa en el DOM para evitar fugas de referencias), impidiendo que el botón flotante "Siguiente Pregunta" se muestre de forma redundante sobre la cabecera de la corrección del examen.
5. **Rediseño Premium y Flujo Seguro de ConfirmationModal**: 
   - **Estética de la Modal**: Se aplicó una re-estilización completa a `#confirmation-modal` en `modal.css` de acuerdo al `DESIGN_SYSTEM.md`, utilizando un fondo negro mate `#0a0a0a`, esquinas redondeadas de `24px`, borde con halo azul translúcido, botones con `border-radius: 12px`, botón primario en degradado azul con sombra hover y botón secundario outlined transparente.
   - **Indicadores de Acción Dinámicos**: Se añadió un contenedor de icono flotante `#confirmation-modal-icon-container` que cambia de forma dinámica según el título del modal: un icono de historial (`fa-history`) y color púrpura para reanudación de simulacro, un triángulo de advertencia (`fa-exclamation-triangle`) y color rojo para alertas/borrado de elementos, y un círculo de confirmación (`fa-check-circle`) y color verde para acciones exitosas.
   - **Cierre Seguro (Null-Safe)**: Al cerrar el modal de reanudación haciendo clic en la `x`, fuera de la ventana o pulsando Escape, la promesa de confirmación se resuelve a `null` (en lugar de `false`). El simulador interpreta este valor para cancelar la operación, conservando intacta la sesión anterior y redirigiendo al usuario de vuelta al panel (`simulator-dashboard`), eliminando por completo el riesgo de borrar por error un simulacro en curso.
6. **Exclusividad de Explicación en 20qs (Modo Estudio)**: Con el objetivo de agilizar los simulacros rápidos de 10qs, se modificó el comportamiento del simulador para que no se muestre la caja de explicación técnica (`feedbackBox`) al responder a una pregunta en el modo de 10qs. Este sustento ahora es exclusivo del Modo Estudio (20qs), acelerando considerablemente el flujo interactivo de los simulacros rápidos.
