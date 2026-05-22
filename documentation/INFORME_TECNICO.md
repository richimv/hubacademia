# Informe de Auditoría y Propuestas de Optimización Radical

## 1. Arquitectura Actual del Proyecto (Flujos de Datos, Backend, DB y Servicios de IA/GCS)

La plataforma **Hub Academia** está construida sobre una arquitectura modular limpia y orientada a capas, desacoplando la presentación de la lógica de negocio y las integraciones de infraestructura. Su diseño permite el escalado multi-dominio mediante la parametrización dinámica y el aislamiento físico y lógico de los datos.

### 1.1 Estructura del Directorio y Componentes del Sistema

El ecosistema de código fuente se organiza dentro del directorio de código fuente **`src/`** para mantener un desacoplamiento limpio:
- **`src/presentation/`**: Capa del frontend basada en HTML5, CSS3 personalizado (con variables del sistema de diseño unificado, como se define en `DESIGN_SYSTEM.md`) y JavaScript modular vanilla. Los componentes clave del cliente incluyen:
  - `js/chat.js` y `js/tutor-chat.js`: Orquestación de interfaces de chat síncrono e interactivo.
  - `js/utils/markdown-renderer.js`: Procesador de parsing centralizado que consume `marked.js` para renderizar de manera uniforme el formato del LLM, envolviendo tablas en contenedores responsivos (`table-responsive-wrapper`) y resolviendo rutas del proxy de medios.
  - `js/simulator-dash.js`: Tablero interactivo que mapea y renderiza KPIs del simulador a partir del contexto del usuario.
  - `js/quiz.js`: Motor de ejecución del examen clínico/pedagógico con persistencia en el almacenamiento local ante fallos de red.
- **`src/application/`**: Capa de aplicación que contiene controladores y middlewares en NodeJS/Express:
  - `controllers/`: Orquestadores que reciben las peticiones HTTP y delegan la ejecución a los servicios del dominio (ej. `quizController.js`, `deckController.js`, `paymentController.js`, `mediaController.js`).
  - `middlewares/checkLimitsMiddleware.js`: Cortafuegos financiero transaccional encargado de regular el consumo de llamadas a APIs externas de IA y transferencias de archivos según el rol y nivel del usuario en tiempo real.
- **`src/domain/`**: Núcleo lógico del negocio. Define las reglas de dominio, entidades, prompts de IA y servicios de infraestructura:
  - `services/`: Lógica operativa de los módulos (ej. `tutorAiService.js`, `trainingService.js`, `ragService.js`, `questionRagService.js`, `ttsService.js`, `driveService.js`).
  - `prompts/`: Definición de plantillas sistemáticas para Gemini (`generationPrompts.js`, `chatPrompts.js`).
  - `repositories/`: Capa de abstracción de persistencia de datos (ej. `trainingRepository.js`, `analyticsRepository.js`).
- **`src/infrastructure/`**: Enrutamiento, bases de datos y configuraciones globales:
  - `config/`: Archivos de configuración de Express (`server.js`), cliente de base de datos (`supabaseClient.js`) y limitadores de tasa (`rateLimiters.js`).
  - `database/`: Definición de esquemas físicos (`database_schema.sql`), scripts de migración (`monetization_migration.sql`) y procedimientos almacenados avanzados (`stored_procedures.sql`).
  - `middleware/`: Middlewares técnicos de infraestructura como `authMiddleware.js` (validación JWT) y `usageMiddleware.js` (auditoría).
  - `routes/`: Enrutamiento web de endpoints públicos y protegidos (`apiRoutes.js`, `analyticsRoutes.js`).
- **`ml_service/`**: Microservicio local escrito en Python para el procesamiento de datos por lotes y análisis de tendencias fuera de línea.
- **`scripts/`**: Utilidades administrativas, incluyendo `ingest_rag.py` para la ingesta de documentos a la base de datos vectorial.

---

### 1.2 Flujo de Datos RAG y Arquitectura Vectorial (Pinecone & Vertex AI)

El sistema opera bajo un esquema **RAG Semántico Puro (V6.5)** para el chat de tutoría y la autoevaluación, aislando el conocimiento en namespaces del índice `hub-academia-index` de Pinecone (Serverless) para evitar la contaminación contextual cruzada:
- **`medicine`**: Harrison, manuales clínicos y normas técnicas del MINSA (Tutor Clínico).
- **`education`**: CNEB, Ley de Reforma Magisterial y temarios del MINEDU (Tutor Pedagógico).

```
[Consulta del Usuario] 
      │
      ▼
[RagService: Agentic Rewriter (Gemini)] ──→ Expande consulta a términos técnicos
      │
      ▼
[Vertex AI: text-multilingual-embedding-002] ──→ Genera vector (768 d)
      │
      ▼
[Pinecone Index: Query Namespace] ──→ Recupera Top-K fragmentos relevantes
      │
      ▼
[TutorAiService / Prompt Ingestion] ──→ Inyecta contexto + reglas + Few-Shot
      │
      ▼
[Gemini 2.5 Flash Lite] ──→ Respuesta JSON nativa parseada por el frontend
```

#### Regla de Consistencia Absoluta de Embeddings:
Toda la ingesta (`scripts/ingest_rag.py`) y la búsqueda semántica emplean matemáticamente el modelo `text-multilingual-embedding-002` (768 dimensiones). El uso de modelos mixtos reduciría la similitud de coseno del sistema por debajo del umbral de ruido matemático ($<0.15$), provocando el fallo del RAG y obligando al tutor a responder de forma general.

---

### 1.3 Pipeline de Generación "Sniper-RAG" (Grado Industrial)

Para la creación del banco de preguntas, el sistema aplica una secuencia determinista en 5 fases a través del backend (`adminAiService.js`):
1. **Lector de Menú (Anti-Repetición)**: Recupera el temario oficial desde Pinecone y aplica un barajado Fisher-Yates cruzado con el historial de preguntas del usuario para seleccionar un subtema inédito.
2. **Investigador (RAG de Doble Precisión)**:
   - *RAG de Teoría*: Busca sustento técnico y legal del subtema en el namespace correspondiente.
   - *RAG de Identidad (Sniper)*: Recupera la estructura física y estilo formal de una pregunta real (usando un índice aleatorio como término de búsqueda exacto, ej. `78.`) para imitar el molde del examen oficial (ENAM/SERUMS/Nombramiento).
3. **Diseñador (Dinamismo Visual)**: Fuerza la generación del caso en Markdown enriquecido (diálogos directos, tablas de datos) y prohíbe las aperturas genéricas de oraciones repetitivas.
4. **Cirujano Psicométrico (Auditoría de Alternativas)**: JavaScript audita la respuesta generada. Si la opción correcta difiere en más de 40 caracteres respecto a los distractores, o si la explicación comete el error de mencionar explícitamente las letras de las alternativas (A, B, C) —lo cual rompe el barajado dinámico en frontend—, el sistema retroalimenta recursivamente al LLM hasta por 3 ciclos para su corrección.
5. **Bloqueo de Calidad**: Si la pregunta no supera la auditoría tras los 3 reintentos de refinamiento, el objeto es destruido en memoria y el bucle se reinicia desde la Fase 1 con un subtema diferente.

---

### 1.4 Módulo de Simuladores y Autoevaluación de Recursos

El simulador médico y pedagógico implementa una lógica de consulta híbrida de emergencia para optimizar costes de inferencia y garantizar la disponibilidad del servicio:
- **Banco Local Primero**: Intenta recuperar un lote de 5 preguntas directamente de `question_bank` mapeando la configuración seleccionada por el estudiante.
- **IA de Reposición en Vivo**: Si el stock local es insuficiente para cubrir la diversidad de áreas solicitadas, el backend (`userAiService.js` en conjunto con `trainingService.js`) se activa al vuelo. Genera preguntas individuales balanceadas sobre las materias deficientes usando Gemini en modo rápido (sin RAG pesado para usuario final).
- **Autoevaluación IA de Recursos (Regla de los <15k caracteres)**:
  - Si el contenido de texto plano del recurso en base de datos es inferior a 15,000 caracteres, se inyecta directamente en el prompt del LLM para una respuesta instantánea a coste $0 de base de datos vectorial.
  - Si supera los 15,000 caracteres o es nulo, el sistema enruta la consulta hacia Pinecone mediante una búsqueda semántica basada en el título y temas del recurso.
  - Si el motor vectorial reporta fallos, se activa el *Fallback Generativo Experto*, donde Gemini actúa bajo su conocimiento interno para evitar interrupciones en la UI.
- **Tope de Seguridad**: Limitado a 15 autoevaluaciones diarias universales (`daily_arena_usage`) para evitar la saturación de llamadas API en bucles automatizados.

---

### 1.5 Arquitectura de Medios (Google Cloud Storage Proxy & Sharp)

Para evitar la exposición pública del bucket y centralizar la seguridad de los activos de la plataforma, el acceso a archivos multimedia (infografías, imágenes de enunciados, portadas y miniaturas) se realiza a través de un proxy intermedio en el backend (`mediaController.js`):
- **Endpoint Seguro**: `/api/media/gcs?file=<path>` (Validación obligatoria de JWT de sesión).
- **Disposición de Contenido Dinámica**: 
  - `Content-Disposition: inline` por defecto para previsualización inmersiva en el navegador.
  - `Content-Disposition: attachment; filename="..."` si se añade el query param `download=true`, forzando la descarga local directa desde el cliente.
- **Optimización de Carga con Sharp**:
  - Conversión de formato a **WebP**.
  - Redimensionamiento proporcional a un ancho máximo de **1000px** para prevenir errores de memoria (*Out-Of-Memory*) en contenedores con recursos limitados.
  - Compresión del **80%** de calidad con *Smart Subsampling* (preservando nitidez en infografías y esquemas médicos de texto pequeño) y conservación de metadatos de color (`.withMetadata()`).

---

### 1.6 Ciclo de Transacción Segura (Pasarela Mercado Pago)

La conversión de planes y activación de privilegios premium opera de manera asíncrona y robusta:

```
[Usuario presiona Comprar]
      │
      ▼
[paymentController: createOrder] ──→ Genera preferencia con external_reference: "USER_ID|advanced"
      │
      ▼
[Pasarela Mercado Pago] ──→ Procesa tarjeta y envía Webhook asíncrono Back-to-Back
      │
      ▼
[paymentController: handleWebhook] ──→ status === 'approved' + Valida monto recibido vs base
      │
      ▼
[Database Transactional Update]
 1. subscription_tier: 'advanced' | 'basic'
 2. subscription_status: 'active'
 3. subscription_expires_at: NOW() + INTERVAL '6 months' (o '2 months')
 4. Reseteo de contadores de IA (daily_ai_usage, etc.)
      │
      ▼
[Redirect Callback success] ──→ sessionManager.validateSession() ──→ Refresca JWT e inicia UI Premium
```

---

### 1.7 Analítica de Tráfico e IA Predictiva Local (Python)

El monitoreo de interacción recopila señales de tráfico en tiempo real (`web_traffic`) y métricas de clicks en recursos (`resource_interactions`) mapeando interacciones tanto para alumnos autenticados como para invitados (vía `session_id`). 

El motor de analíticas predictivas (`ml_service/run_batch.py`) procesa el histórico de búsquedas y visualizaciones de forma offline en la máquina local para calcular las tendencias de consumo del catálogo académico:
- **Decaimiento Exponencial Temporal**: Aplica la fórmula $W = e^{-0.05 \cdot t}$ (donde $t$ representa los días de antigüedad) para dar mayor peso a la intención de búsqueda actual del estudiante.
- **Similitud Semántica Local**: Emplea un modelo local de embeddings para mapear conceptos (ej. "corazón" $\rightarrow$ Cardiología) cruzado con la **Similitud de Jaccard** para evitar falsas asociaciones semánticas no deseadas.
- **Multiplicador de Match Directo**: Aplica un boost de **x5** a los términos que coinciden exactamente con el nombre de un recurso del catálogo.

---

## 2. Puntos Críticos y Cuellos de Botella Detectados

Tras un análisis forense de la infraestructura, se han identificado las siguientes vulnerabilidades estructurales y de rendimiento que amenazan la estabilidad operativa del proyecto en producción:

### 2.1 Dependencia Crítica de Almacenamiento Efímero en Cloud (Render/Vercel)
El microservicio de inteligencia artificial predictiva local (`ml_service/run_batch.py`) escribe la salida de su análisis en un archivo plano en la carpeta `data_dump/` local.
- **Vulnerabilidad**: Hosting de despliegue tipo *serverless* o contenedores efímeros (Render/Vercel) recrean el sistema de archivos local en cada reinicio o despliegue. Los datos del dump predictivo se perderán recurrentemente.
- **Riesgo**: Inconsistencia en las métricas de tendencias que visualiza el administrador en su dashboard de gestión.

### 2.2 Sobrecarga y Consumo de CPU por Servido de Archivos (Proxy GCS)
El proxy `/api/media/gcs` obliga a NodeJS a actuar como intermediario de red para cada imagen, PDF e infografía que se carga en el cliente.
- **Vulnerabilidad**: Node es monohilo. Descargar un PDF de 80MB de GCS y enviarlo en bloques (*chunked transmission*) a través del hilo principal bloquea el bucle de eventos (*Event Loop*), elevando drásticamente el tiempo de respuesta de las peticiones HTTP del API y elevando el consumo de CPU.
- **Riesgo**: Caídas del servicio ante ráfagas simultáneas de estudiantes abriendo el visor inmersivo durante exámenes simulados.

### 2.3 Procesamiento OCR Local Pesado y Bloqueante
El script de ingesta vectorial (`scripts/ingest_rag.py`) depende de la instalación local del binario Tesseract OCR para extraer texto de PDFs escaneados página por página de forma síncrona.
- **Vulnerabilidad**: El procesamiento de PDFs de gran tamaño (más de 300 páginas) consumirá gigabytes de memoria RAM local y tiempo de procesador en entornos de contenedores limitados.
- **Riesgo**: Error de falta de memoria (*Out-Of-Memory*) en los servidores de integración continua o en la máquina local de ingesta, abortando la actualización de la base de datos vectorial de Pinecone.

### 2.4 Brecha de Seguridad en la Validación de Pagos (Webhook sin Firma)
El webhook del controlador de pagos (`paymentController.js`) actualiza el estado de las cuentas a nivel Premium basándose únicamente en el parámetro `status === 'approved'` y una comparación básica de valores de referencia recibidos en el payload HTTP del POST.
- **Vulnerabilidad**: Falta una verificación de autenticidad criptográfica rigurosa que valide que la petición provino realmente de los servidores de Mercado Pago y que los datos del cuerpo no fueron interceptados o falsificados.
- **Riesgo**: Un atacante con conocimientos del endpoint podría enviar peticiones preparadas imitando pagos exitosos con identificadores UUID aleatorios para activar suscripciones premium gratis.

### 2.5 Multiplicidad de Peticiones de Sincronización en Entrada (Race Conditions)
A pesar de las refactorizaciones en `SessionManager`, la inicialización simultánea del cliente web de Supabase y las llamadas de carga del dashboard pueden disparar peticiones de verificación de límites e historial de manera concurrente al iniciar la aplicación.
- **Vulnerabilidad**: La concurrencia transaccional en PostgreSQL sin bloqueos explícitos a nivel de fila (*select for update*) puede provocar lecturas sucias y actualizar saldos de vidas de forma incorrecta.
- **Riesgo**: Un usuario Free astuto podría abrir múltiples pestañas a la vez e iniciar exámenes de la Quiz Arena en el mismo segundo exacto, burlando el decremento del contador de vidas (`usage_count`).

---

## 3. Propuestas Radicales de Optimización

Para transformar la plataforma en un ecosistema de alta disponibilidad, costo de mantenimiento eficiente y seguridad militar, se deben implementar las siguientes soluciones de ingeniería:

### 3.1 Desacoplamiento de Medios: URLs Firmadas de GCS con CDN (Cloudflare)
Eliminar el paso de descarga a través del proxy de NodeJS en Express.
- **Solución**: Refactorizar `mediaController.js` para que, en lugar de descargar y transmitir el archivo, genere una **URL Firmada de GCS (Signed URL)** con una vigencia corta (ej. 15 minutos).
- **Beneficio**: El navegador del usuario descargará los recursos (PDFs de 100MB, videos) de forma directa desde la CDN global de Google Cloud Storage. El Event Loop de Node queda 100% liberado de la transferencia de bytes pesados.

### 3.2 Caché de Control de Límites en Memoria (Upstash Redis)
Desplazar la auditoría de límites diarios del motor relacional PostgreSQL a una capa en memoria persistente de bajísima latencia.
- **Solución**: Integrar un cliente Redis Serverless (como Upstash) en `checkLimitsMiddleware.js`.
- **Mecánica**: Los contadores diarios de los usuarios (`daily_ai_usage`, `daily_arena_usage`) se inicializan y decrementan mediante comandos atómicos de Redis (`INCRBY`, `EXPIRE`). Al finalizar el día, se sincroniza el acumulado a PostgreSQL de forma asíncrona.
- **Beneficio**: Reducción de latencia del middleware de 60ms a $<3\text{ms}$ y eliminación del 90% de las transacciones de escritura repetitivas en PostgreSQL.

### 3.3 Procesamiento de Ingesta Asíncrona (Google Cloud Document AI)
Eliminar la dependencia local de Tesseract OCR y el chunking síncrono.
- **Solución**: Migrar el pipeline de ingesta a una arquitectura orientada a eventos. Al subir un PDF al panel administrativo, este se deposita en un bucket de GCS, lo que dispara una Cloud Function que invoca a la API de **Google Cloud Document AI** (u OCR en la nube de alta disponibilidad).
- **Beneficio**: Ingesta infinitamente rápida y tolerante a fallos, sin riesgo de cuelgues del servidor principal de NodeJS ni consumo de RAM local.

### 3.4 Blindaje Criptográfico de Webhooks de Pago
- **Solución**: Implementar la comprobación de la firma HMAC de Mercado Pago en `paymentController.js` utilizando la clave secreta proporcionada en el portal de desarrolladores.
- **Mecánica**: El servidor calcula el hash SHA-256 del cuerpo del mensaje utilizando el secreto y lo compara con la cabecera `x-signature` del request. Si no coinciden, la petición es rechazada de inmediato con un `401 Unauthorized`.

---

## 4. Estándares de Seguridad y Buenas Prácticas

La infraestructura técnica debe alinearse de forma estricta a los siguientes pilares de blindaje operativo:

### 4.1 Principio de Privilegio Mínimo en Base de Datos (Supabase RLS)
- Ninguna consulta del frontend debe tener acceso directo a colecciones globales.
- Habilitar **Row Level Security (RLS)** en el 100% de las tablas relacionales que interactúan con el cliente.
- Las consultas en Supabase deben restringirse exclusivamente a través de la identidad del token JWT inyectado en el encabezado `Authorization: Bearer <JWT>`, forzando la cláusula de seguridad:
  ```sql
  ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users can only access their own notes" 
  ON public.user_notes FOR ALL 
  USING (auth.uid() = user_id);
  ```

### 4.2 Sanitización del Editor Enriquecido (TinyMCE XSS Shield)
Dado que el administrador puede ingresar HTML a la base de datos a través de TinyMCE 6, se debe garantizar la inocuidad de las etiquetas renderizadas en el cliente:
- Implementar una librería de sanitización en el backend (ej. `dompurify` o `sanitize-html`) antes de persistir el registro del recurso en PostgreSQL.
- Bloquear explícitamente la ejecución de tags reactivos como `<script>`, `<iframe>` (no autorizados), `onerror`, `onload` u otros atributos capaces de perpetrar ataques de Cross-Site Scripting (XSS).

### 4.3 Hardening del Servidor Express
- **Helmet JS**: Inyectar el middleware `helmet()` en `server.js` para ocultar cabeceras de servidor que delatan el uso de NodeJS/Express (ej. `X-Powered-By`) y establecer políticas seguras de contenido (CSP).
- **CORS Restrictivo**: Configurar la lista de orígenes permitidos únicamente al dominio de producción del cliente web, bloqueando accesos cruzados externos no autorizados.

---

## 5. Conclusión de Infraestructura

La arquitectura técnica de **Hub Academia** es sumamente robusta, destacando por su aproximación madura a problemas clásicos de los sistemas basados en IA (tales como la deduplicación temática, la homogeneización cromática en el pintado de datos médicos/pedagógicos y la gestión inteligente de reposición para evitar la inactividad del simulador). 

No obstante, su viabilidad comercial a gran escala y su resiliencia técnica dependen directamente de la erradicación del acoplamiento de archivos locales (los dumps de Python en disco y el OCR local) y de la optimización del canal de transferencia de Google Cloud Storage a través de redirecciones CDN y firmado de accesos en lugar de actuar como un proxy de red clásico.

---

## 6. Anexo: Hallazgos de QA y Errores Lógicos (Estado: Corregidos / Mitigados)

A continuación, se presenta el informe detallado de la auditoría de control de calidad (QA) realizada sobre el código fuente del proyecto, junto con el estado de su resolución tras las correcciones aplicadas:

### 6.1 Errores Lógicos y Excepciones en Tiempo de Ejecución (Frontend) - [ESTADO: SOLUCIONADO]

> [!NOTE]
> **Resolución:** Se reemplazó la variable inexistente `instructor.name` por la variable local correcta `user.name` en `handleResetPassword()`.

* **Ubicación:** [admin.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/admin.js#L2563)
* **Detalle Técnico:** En el método `handleResetPassword(userId)`, el frontend realiza una petición HTTP al endpoint de restablecimiento de credenciales de usuario. Al obtener la respuesta exitosa, ejecuta la siguiente instrucción:
  ```javascript
  await window.confirmationModal.showAlert(`¡Éxito! La nueva contraseña temporal para ${user.name} es:\n\n${newPassword}...`, 'Contraseña Restablecida');
  ```
* **Impacto Operativo:** Solucionado. La alerta visual ahora se renderiza de forma correcta y muestra la nueva contraseña temporal generada, previniendo fallos irreversibles de acceso para el estudiante.

---

### 6.2 Fallas en la Persistencia de Filtros y Desincronización de UI - [ESTADO: SOLUCIONADO]

> [!NOTE]
> **Resolución:** Se modificó `loadAllData()` para instanciar la URL de consulta mediante `new URL()` y propagar dinámicamente los parámetros activos `domain` y `search` de la UI.

* **Ubicación:** [admin.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/admin.js#L425-L440)
* **Detalle Técnico:** La recarga de datos tras operaciones de edición, guardado o eliminación ahora incluye los parámetros activos en la UI (`this.currentQuestionDomain` y `this.currentQuestionSearch`) en su petición fetch:
  ```javascript
  const questionsUrl = new URL(`${window.AppConfig.API_URL}/api/admin/questions`);
  questionsUrl.searchParams.append('domain', this.currentQuestionDomain || 'all');
  if (this.currentQuestionSearch) {
      questionsUrl.searchParams.append('search', this.currentQuestionSearch);
  }
  ```
* **Impacto Operativo:** Solucionado. Se elimina la desincronización donde la UI conservaba los inputs con textos filtrados pero la tabla renderizaba todas las preguntas del banco.

---

### 6.3 Pérdida de Foco en Inputs de Búsqueda por Regeneración Agresiva del DOM - [ESTADO: DOCUMENTADO]

* **Ubicación:** [admin.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/admin.js#L354-L380) (Método `switchTab()`)
* **Detalle Técnico:** Cada vez que se cambia el ordenamiento usando el select `tab-sort-select`, se regenera la estructura HTML interna mediante `innerHTML`, destruyendo el foco activo.
* **Impacto Operativo:** Identificado como una limitación menor de renderizado nativo. El comportamiento se mantiene documentado para evitar refactorizaciones mayores que comprometan la estabilidad del DOM.

---

### 6.4 Problemas de Concurrencia y Condiciones de Carrera (Backend) - [ESTADO: MITIGADO]

> [!NOTE]
> **Resolución:** Se inyectó un bloque `try/catch` dentro del bucle de sincronización en `syncDriveFolder` que aísla de forma segura los fallos individuales de base de datos. Los errores son capturados en un arreglo `syncErrors` y reportados al final de la respuesta JSON sin abortar el procesamiento del lote de archivos.

* **Ubicación:** [adminController.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/application/controllers/adminController.js#L327-L385)
* **Detalle Técnico:** El endpoint captura de manera individual las excepciones arrojadas por `adminService.syncResource(...)` (por ejemplo, fallos de violación de clave única por duplicación en peticiones paralelas concurrentes):
  ```javascript
  try {
      const result = await adminService.syncResource(...);
      // ...
  } catch (syncErr) {
      failedCount++;
      syncErrors.push({ file: file.name, url: driveUrl, error: syncErr.message });
  }
  ```
* **Impacto Operativo:** Mitigado. La sincronización masiva es tolerante a fallos y no aborta bruscamente la petición completa si un archivo individual sufre un error de persistencia.

---

### 6.5 Vulnerabilidad de Crash por Spawning No Capturado (Backend) - [ESTADO: SOLUCIONADO]

> [!NOTE]
> **Resolución:** Se añadió un listener `.on('error', ...)` en el objeto de proceso `pythonProcess` y se inyectó validación de `res.headersSent` en el listener `'close'` para evitar excepciones por duplicidad de envíos.

* **Ubicación:** [adminController.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/application/controllers/adminController.js#L54-L68)
* **Detalle Técnico:** Se capturan de forma asíncrona las fallas de spawn (por ejemplo, si la ruta del ejecutable Python es incorrecta o no está en el PATH del servidor):
  ```javascript
  pythonProcess.on('error', (err) => {
      console.error('❌ Error al iniciar el script de IA (spawn):', err);
      if (!res.headersSent) {
          res.status(500).json({ error: 'No se pudo iniciar el proceso de análisis de IA.' });
      }
  });
  ```
* **Impacto Operativo:** Solucionado. La inexistencia o falla del proceso de Python es manejada de manera segura respondiendo con código de error HTTP 500, eliminando la posibilidad de que Express experimente un crash catastrófico.
