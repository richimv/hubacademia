# 🎮 Documentación Técnica: Módulo Quiz Arena (Battle Mode)

El **Quiz Arena** es el componente gamificado y universal de Hub Academia. Ofrece una experiencia de trivia rápida y competitiva sobre diversos temas, integrando inteligencia artificial para la generación infinita de desafíos.

---

## 1. Arquitectura del Módulo 🏛️

- **Frontend**: `arena.html` + `arena.js`. Gestiona el estado de la partida, temporizadores (`20s`), vidas y renderizado responsivo.
- **API Controller**: `quizGameController.js`. Punto de entrada para el inicio de partidas, obtención de preguntas extra y persistencia de puntajes.
- **Game Engine**: `TrainingService.js`. Orquesta la obtención de preguntas desde el Banco Local o la Generación Agéntica (IA).
- **Repositorio**: `trainingRepository.js`. Maneja la persistencia y la lógica de deduplicación de contexto.

---

## 2. Flujo de Juego End-to-End (The Game Loop) 🔄

### Fase 1: Lobby y Preparación 🏟️
1.  **Selección de Tema**: El usuario elige un desafío a través de los *Quick Tags* (Carrusel responsivo).
    - **Temas Disponibles**: Cultura General, Medicina, Matemáticas, Química, Ciencias, Informática, Tecnología, Actualidad, Historia, Geografía, Deportes, Cine.
2.  **Validación de Tier (Vidas)**: Al hacer clic en "Iniciar", el sistema verifica el plan del usuario:
    - Se descuenta una "Vida de Arena" (`daily_arena_usage`).
    - Si el límite diario se ha alcanzado, se muestra el `PaywallModal` o `BankExhaustedModal`.

### Fase 2: Inicio de Partida 🚀
1.  **Carga de Lote Inicial**: Se solicitan 5 preguntas al backend.
2.  **Selección Híbrida**:
    - Primero se busca en el **Banco de Preguntas** (`question_bank`) usando el tema normalizado (soporta tildes via `unaccent`).
    - Si el banco tiene menos de 5 preguntas, se activa la **IA Agéntica (Gemini 2.5 Flash Lite)** para completar el lote.

### Fase 3: Gameplay (20 Rondas) ⚔️
- **Renderizado Responsivo**:
    - **PC**: Layout de 2 columnas (Imagen izquierda / Pregunta derecha).
    - **Móvil**: Layout apilado (Imagen arriba / Pregunta abajo).
- **Temporizador**: 20 segundos para responder.
- **Vidas**: El jugador inicia con 3 vidas. Un error o agotamiento de tiempo resta una vida.
- **Puntaje**: Se calcula según la velocidad de respuesta: `100 * (Tiempo Restante / 5)`.

### Fase 4: Sistemas de Inteligencia 🧠
- **Anti-Repetición (User History)**: Cada pregunta entregada se registra en `user_question_history`. El sistema sincroniza los IDs generados por IA en tiempo real para asegurar que el marcado de "visto" sea efectivo y la pregunta no se repita en la siguiente ronda.
- **Deduplicación Semántica (Contexto IA)**: Al generar preguntas nuevas, la IA recibe las **30/75 preguntas más recientes** (`created_at DESC`) para evitar solapamientos temáticos o bucles de repetición.

### Fase 5: Finalización y Ranking 🏆
1.  **Guardado de Score**: Al terminar (por victoria o derrota), se envía el puntaje a `/api/arena/submit`.
2.  **Persistencia**: Se guarda en la tabla `quiz_scores`.
3.  **Ranking Global**: La interfaz actualiza el **Top 10 Global** mediante una consulta recursiva (CTE) que garantiza que solo aparezca el *High Score* único de cada usuario.

---

## 3. Mecánicas y Comodines 🍀

- **50/50**: Elimina dos opciones incorrectas (1 uso por partida).
- **Skip**: Salta la ronda sin perder vida (1 uso por partida).
- **Infinite Preload**: Cuando el pool local baja de 4 preguntas, el sistema solicita un lote extra en segundo plano para garantizar un flujo sin esperas.

---

## 4. Auditoría de Estabilidad (Estado Actual) ✅

- **Integridad de Datos**: Sanitización universal de `target`, `career` y `difficulty`.
- **Dificultad Unificada**: Soporte para niveles dinámicos sin forzar el antiguo estándar "Senior".
- **Visualización GCS**: Integración completa con el proxy de Google Cloud Storage para imágenes WebP.

## 5. Resiliencia de Red (NUEVO) 📡
Dado el carácter competitivo de la Arena, se ha implementado un sistema para evitar la pérdida de récords por inestabilidad:

- **safeFetch con Backoff**: Todas las comunicaciones críticas (Inicio, Carga de lotes, Envío de Score) utilizan reintentos automáticos (1s, 2s, 4s).
- **Consistencia de Score**: El envío final del puntaje es idempotente y se reintenta hasta asegurar la sincronización con el servidor.
- **Modo Offline**: Si la conexión se pierde durante una pregunta, el temporizador se pausa visualmente y el **Status Pill** informa al usuario, reanudando la carga en cuanto vuelve la señal.

---

## 6. Autoevaluación IA Basada en Recursos (NUEVO) 📚

La **Autoevaluación IA** permite a los estudiantes entrenar activamente sobre cualquier recurso específico del Hub (libros, guías, normas, papers, etc.) mediante preguntas dinámicas auto-generadas al vuelo.

### 6.1 Interfaz de Usuario y Configuración Simplificada (Lobby Premium)
En la página del recurso, un botón premium con gradiente púrpura da acceso a un panel de configuración de diseño glastocéntrico (`premium-glass-dark`):
-   **Cantidad de Preguntas**: Limitado estrictamente a **5 Preguntas (Express)** o **10 Preguntas (Profundización)** para que la capacidad de razonamiento de Gemini se mantenga al máximo nivel sin degradación por longitud de salida.
-   **Dificultad Simplificada**: Dos niveles unificados para evitar confusiones de aprendizaje:
    -   **Fácil (`basic`)**: Centrado en conceptos directos, terminología y definiciones base.
    -   **Difícil (`advanced`)**: Centrado en análisis crítico, casos prácticos de aplicación, diagnóstico y toma de decisiones.

### 6.2 Intercepción y Paywall de Visitantes
-   El clic de entrada en el cliente está envuelto en `window.uiManager.checkAuthAndExecute()`.
-   Si un visitante no autenticado intenta iniciar una autoevaluación, el sistema congela el flujo y presenta de inmediato la modal oficial de login/registro en lugar de abrir los parámetros de quiz.

### 6.3 Gestión Financiera y Consumo de Vidas (Separación Completa y Límite Diario)
-   **Separación Absoluta de Simuladores:** La autoevaluación IA de recursos se encuentra completamente separada e independiente del módulo de Simuladores (Simulacros Médicos o Pedagógicos). De esta forma, el usuario no consume su cuota de simulacros especializados al realizar cuestionarios sobre lecturas específicas del Hub.
-   **Tope Diario Estricto de Seguridad (15 autoevaluaciones/día):**
    -   Con el fin de evitar el abuso automatizado de la API y garantizar la sostenibilidad del servicio, se ha establecido un límite máximo de **15 autoevaluaciones por día** aplicable universalmente a todos los roles y suscripciones (**Free, Basic, Advanced**).
    -   Este límite es auditado de forma transaccional y en tiempo real en el backend mediante el contador de uso diario `daily_arena_usage` en la base de datos de PostgreSQL, el cual es restablecido automáticamente a 0 a la medianoche UTC.
-   **Consumo de Vidas en Usuarios Free/Pending:**
    -   Si un usuario Free tiene vidas disponibles y no ha superado su tope de 15 autoevaluaciones del día, se le descuenta exactamente **1 vida (crédito global de `usage_count`)** al iniciar la autoevaluación.
    -   Si no dispone de vidas o si ya superó el tope diario de 15 autoevaluaciones, el servidor bloquea la solicitud y retorna `403 Forbidden`.
-   **Usuarios Premium (Basic/Advanced Activos):**
    -   Tienen acceso libre a realizar cuestionarios dinámicos de recursos, respetando únicamente el tope de seguridad de **15 autoevaluaciones por día**, sin consumir vidas globales ni interferir en su cuota diaria de simulacros especializados.

### 6.4 Enrutamiento de Contexto Inteligente (La regla de <15k)
Para garantizar la fidelidad absoluta de la evaluación sin disparar los costos de Google Cloud ni saturar la ventana de contexto, el backend (`trainingService.js`) implementa un enrutamiento híbrido:

1.  **Limpieza de Marcado HTML**: El servidor toma el `content_html` del recurso de la base de datos (el cual puede incluir markup complejo, clases, iframes de video, infografías) y remueve todas las etiquetas HTML mediante una expresión regular para medir únicamente el **texto plano real** (`plainText`).
2.  **Ruta A (Texto Plano < 15,000 caracteres)**:
    -   El texto plano es tan compacto que cabe de sobra en un prompt.
    -   El backend inyecta directamente este `plainText` como contexto limpio a Gemini, evitando búsquedas vectoriales redundantes.
3.  **Ruta B (Texto Plano >= 15,000 caracteres o NULO)**:
        -   **Nivel 1 (RAG Semántico Global por Título)**: Se extraen automáticamente 5 subtemas del título del recurso y se eligen 2 al azar. Luego, se realiza una búsqueda semántica de alta precisión en Pinecone utilizando la combinación del título del recurso y los subtemas seleccionados. Esto elimina la dependencia de un filtro físico por nombre de archivo (`filename`), funcionando a la perfección con Google Drive, enlaces externos u otros recursos.
        -   **Nivel 2 (Fallback Generativo Experto)**: Si la base vectorial está caída o no se encuentran fragmentos coincidentes, el sistema actúa de forma autónoma. Gemini asume el rol de Quiz Master experto y genera un examen de alta fidelidad basado únicamente en el título del recurso y su base de conocimiento global, asegurando que la autoevaluación inicie con éxito y eliminando los callejones sin salida.

### 6.5 Carácter Efímero del Quiz
-   A diferencia de la Arena global, las preguntas sobre recursos son **efímeras**: se generan en memoria al vuelo, se barajan mediante Fisher-Yates (libre de ASI hazards) y se entregan al cliente sin guardarse en la base de datos. Esto garantiza un consumo mínimo de almacenamiento en la nube y previene la saturación del histórico del usuario.

---
*Documentación técnica oficial - Actualizada Mayo 2026*