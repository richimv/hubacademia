# 🏛️ PROJECT BRIEF MAESTRO: HUB ACADEMIA (2026)
> **Documento Central de Verdad de Negocio, Producto y Arquitectura Técnica**  
> **Plataforma Web:** `hubacademia.com` | **Ecosistema Móvil:** `HubDocenteApp`, `HubSaludApp`, `HubRepasoApp`  
> **Versión del Sistema:** V6.6 Industrial (Septiembre 2026) | **Estado Operativo:** Producción / Alta Disponibilidad

---

## 1. 📌 Resumen Ejecutivo e Identidad del Proyecto

### 1.1 ¿Qué es Hub Academia?
**Hub Academia** es una plataforma EdTech de alto rendimiento especializada en la preparación, entrenamiento interactivo y certificación oficial de profesionales en el Perú, enfocándose de manera estratégica y prioritaria en dos sectores altamente regulados y de impacto nacional:
1. **Educación (Sector Magisterial):** Preparación para las evaluaciones oficiales del Ministerio de Educación (**MINEDU**), tales como Ascenso de Escala Magisterial (EBR Inicial, Primaria, Secundaria en todas las especialidades, EBA y EBE), Nombramiento Docente y Acceso a Cargos Directivos. Incorpora el sistema de calificación oficial en Base 90 con umbrales aprobatorios dinámicos por Escalas Magisteriales 2 a 8.
2. **Salud (Ciencias Médicas y Asistenciales):** Banco de entrenamiento y simulacros para el Servicio Rural y Urbano Marginal de Salud (**SERUMS**), Examen Nacional de Medicina (**ENAM**) y **Residentado Médico** para egresados de Medicina Humana y Enfermería, alineado estrictamente a las Normas Técnicas de Salud (NTS) y Guías de Práctica Clínica (GPC) del Ministerio de Salud (**MINSA**).

### 1.2 Misión y Visión Corporativa
* **Misión:** Empoderar a docentes, médicos y enfermeros peruanos a través de simuladores hiperrealistas, repasos espaciados basados en evidencia científica y un Tutor Inteligente con RAG Puro, transformando el estudio tradicional en un entrenamiento de máxima eficiencia y rigor académico.
* **Visión:** Consolidarse como el ecosistema tecnológico de preparación profesional más confiable, riguroso y accesible del Perú y Latinoamérica, siendo el estándar de referencia para evaluaciones estatales y colegiaturas.

### 1.3 Valores y Pilares Diferenciales
* **Alineación Oficial Estricta:** Cero contenidos improvisados; 100% de coherencia con los temarios oficiales, leyes magisteriales y protocolos de salud peruanos.
* **Tolerancia Cero a la Alucinación:** Arquitectura RAG Semántica Pura (Pinecone Serverless + Vertex AI) que prohíbe respuestas ficticias y garantiza el sustento normativo y bibliográfico de cada explicación.
* **Pedagogía Constructivista y Psicométrica:** Generador de preguntas "Sniper-RAG" de 5 fases con simetría de distractores y casuística de casos reales.
* **Ciencia del Aprendizaje:** Integración nativa del algoritmo de repetición espaciada SuperMemo-2 (SM-2) para combatir activamente la curva del olvido.
* **Democratización Económica:** Modelo de monetización accesible con tarifas justas (Planes desde S/ 9.90 por 2 meses) y canal de activación directa.

---

## 2. 🏛️ Arquitectura Técnica de 4 Capas (Clean Architecture)

El proyecto sigue estrictamente el patrón de arquitectura limpia desacoplada en cuatro niveles:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            1. PRESENTATION LAYER                            │
│  - Frontend Vanilla JS (ES6+), HTML5 Semántico, CSS3 Modular (Design System)│
│  - Vistas: /library, /repaso, /flashcards, /quiz, /simulator-dashboard      │
│  - Procesador Unificado de Renderizado Markdown (marked.js + Media Proxy)   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP / WebSockets / JWT
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                            2. APPLICATION LAYER                             │
│  - Express Controllers: docenteController, medicoController, deckController,│
│    flashcardController, paymentController, mediaController, authController   │
│  - Middlewares: checkLimitsMiddleware (Cortafuegos financiero y de cuotas), │
│    usageMiddleware (Auditoría), authMiddleware (Validación JWT)             │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Invocación de Dominio
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                              3. DOMAIN LAYER                                │
│  - Lógica de Negocio Pura: docenteService, medicoService, flashcardService, │
│    tutorAiService, ragService, deckService, adminAiService (Sniper-RAG)     │
│  - Repositorios de Persistencia: *Repository.js                             │
│  - Algoritmos: SuperMemo-2 (SM-2 SRS), Fisher-Yates Temario Shuffle         │
│  - Plantillas de Prompts de Grado Industrial: generationPrompts, chatPrompts│
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Integración & Drivers
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                           4. INFRASTRUCTURE LAYER                           │
│  - Base de Datos Relacional: Supabase PostgreSQL con Row Level Security     │
│  - Base de Datos Vectorial: Pinecone Serverless (Namespaces: education/med) │
│  - Modelos de IA: Google Cloud Vertex AI Exclusivo (Gemini Enterprise:      │
│    Cascada 3.5 Flash Lite ➡️ 3.1 Flash Lite ➡️ 2.5 Flash Lite ➡️ 2.5 Flash)   │
│  - Almacenamiento & Multimedia: Google Cloud Storage + Sharp (WebP 1000px)  │
│  - Servicios Externos: Mercado Pago (Webhooks), Resend                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 🧩 Módulos Funcionales del Sistema

### 3.1 🎓 Módulo de Simuladores de Evaluación Oficial (Educación & Salud)
* **Simulador Docente Pro:** Casuísticas pedagógicas basadas en el Currículo Nacional de la Educación Básica (CNEB), enfoque por competencias, niveles de retroalimentación (reflexiva vs. elemental) y situaciones de aula reales.
* **Simulador Médico Clínico (SERUMS / ENAM / Residentado):** Casos clínicos estructurados con signos vitales, antecedentes, diagnóstico diferencial, conducta terapéutica y dosificación basada en NTS del MINSA y bibliografía clásica (Harrison, CTO, Nelson).
* **Modos de Examen Configurables:**
  * *Entrenamiento Rápido:* 10 preguntas con feedback instantáneo.
  * *Simulacro Estándar:* 20 preguntas balanceadas por subtemas.
  * *Examen Tipo Oficial:* 60 preguntas (Ascenso Docente MINEDU - 1.5 pts/pregunta, 90 pts máx) o 100 preguntas (SERUMS/Residentado - 0.2 pts/pregunta, 20 pts máx) con cronómetro oficial y bloqueo de pantalla.
* **Sistema de Calificación Oficial MINEDU Base 90 (Escalas Magisteriales 2 a 8):**
  * *Fórmula Proporcional Universal:* $\text{Puntaje Base 90} = \left(\frac{\text{Aciertos}}{\text{Total Preguntas}}\right) \times 90$, aplicable consistentemente a cualquier modo de examen (10, 20 o 60 preguntas).
  * *Umbrales Aprobatorios Oficiales por Escala:*
    * **Segunda Escala:** 54 puntos ($60.0\%$)
    * **Tercera Escala:** 57 puntos ($63.3\%$)
    * **Cuarta Escala:** 60 puntos ($66.7\%$)
    * **Quinta Escala:** 63 puntos ($70.0\%$)
    * **Sexta Escala:** 66 puntos ($73.3\%$)
    * **Séptima Escala:** 69 puntos ($76.7\%$)
    * **Octava Escala:** 69 puntos ($76.7\%$)
  * *Sincronización Web y Móvil (`HubDocenteApp`):* Presentación del puntaje obtenido sobre 90, umbral requerido según la escala seleccionada por el docente, badge de estado oficial (Aprobado / No alcanzado) y desglose de aciertos.
* **Motor Híbrido "Banco Infinito":** Si el banco local de preguntas tiene stock insuficiente para una especialidad seleccionada, el backend genera en tiempo real preguntas balanceadas mediante Gemini sin interrumpir la experiencia de usuario.
* **Diagnóstico Inteligente por IA (Patrones de Error):** Desglose psicométrico y cognitivo post-examen (`area_stats` en JSONB) que correlaciona las fallas con la escala magisterial objetivo, la brecha de puntaje hacia la meta y los subtemas críticos a reforzar.

### 3.2 🎯 Pipeline de Generación "Sniper-RAG" (5 Fases de Calidad Industrial)
Diseñado para alimentar el banco con reactivos de nivel oficial, eliminando sesgos y garantizando validez:
1. **Fase 1 (Lector de Menú):** Recupera el temario oficial desde Pinecone y aplica barajado Fisher-Yates cruzado con el historial de preguntas del usuario para seleccionar un subtema inédito.
2. **Fase 2 (Investigador RAG Doble):**
   * *RAG de Teoría:* Extrae sustento técnico y legal del subtema.
   * *RAG de Identidad (Sniper):* Recupera el molde y estilo formal de un reactivo real mediante un índice aleatorio en Pinecone.
3. **Fase 2.5 (Memoria de Tanda):** Control dinámico que evita la repetición de materias dentro de un mismo lote de generación.
4. **Fase 3 (Diseñador Creativo):** Redacta el caso en Markdown con diálogos directos, tablas de datos y prohibición estricta de aperturas monótonas.
5. **Fase 4 (Cirujano Psicométrico):** Auditoría en JavaScript que verifica la simetría de alternativas (longitud <= 40 caracteres de desviación respecto a distractores) y purga menciones a letras de opciones ("A", "B", "C") con hasta 3 reintentos automáticos.
6. **Fase 5 (Bloqueo de Calidad):** Destrucción del reactivo en memoria y reinicio de ciclo si no supera los estándares psicométricos.

### 3.3 🤖 Arquitectura del Chat y Tutores IA (3 Modalidades Reales)

El sistema de chat en Hub Academia no es un chatbot monolítico, sino una suite estructurada en **3 modalidades con propósitos, contextos y costos diferenciados**:

1. **🌐 Modalidad 1: Asistente Guía Hub Academia (Chat General Flotante - `neutral`):**
   - **Frontend:** `chat.js` (Componente de chat flotante con avatar *Hubi*).
   - **Backend:** `chatController.js` ↔ `asistenteGuiaKnowledge.js`.
   - **Mecánica:** **100% Estático y Efímero (0ms de latencia, 0 costo de IA/BD)**. Responde mediante coincidencia inteligente de intención contra la base de conocimientos oficial.
   - **Propósito:** Orientación de la plataforma, explicación de los dos pilares oficiales (**SERUMS** para Salud y **ASCENSO** para Educación), detalle de planes/precios y guía de registro en 1 clic con Google.
   - **Consumo:** **0 vidas y 0 tokens diarios** (tanto para visitantes no autenticados como para usuarios registrados). Sin persistencia en base de datos.

2. **📝 Modalidad 2: Quiz Tutor (Tutor en Simuladores de Examen - `quiz_tutor`):**
   - **Frontend:** `quiz.html` / `quiz-tutor.js` (Panel lateral interactivo con modo pantalla completa).
   - **Backend:** `chatController.js` ↔ `tutorAiService.js` (Modelo Primario: Cascada forward-compatible en **Google Cloud Vertex AI** `gemini-3.5-flash-lite` ➡️ `gemini-3.1-flash-lite` ➡️ `gemini-2.5-flash-lite` ➡️ `gemini-2.5-flash`, 100% pospago corporativo GCP).
   - **Inyección de Contexto en Vivo:** Recibe los datos completos de la casuística: Dominio (`MEDICINA` o `EDUCACION`), Examen (`SERUMS`, `ASCENSO`, etc.), Carrera/Especialidad, Pregunta, Alternativas A-D, Respuesta correcta, Respuesta marcada por el alumno y Justificación oficial.
   - **Especializaciones y RAG:**
     - *Tutor Clínico (`medicine`):* Consulta el namespace `medicine` en Pinecone (NTS MINSA, GPC, tratados clínicos) e inserta proactivamente hasta 3 infografías/esquemas del catálogo visual.
     - *Tutor Pedagógico (`education`):* Consulta el namespace `education` en Pinecone (CNEB, Ley Magisterial 29944, RVM 094-2020) e inserta esquemas pedagógicos oficiales.
   - **Límites:**
     - *Plan Advanced:* RAG Semántico Puro activo (hasta 25 consultas RAG/día, con degradación suave a IA estándar hasta 100 msg/día).
     - *Plan Basic:* IA generativa experta optimizada **sin RAG** (50 msg/día).
     - *Plan Free:* Consume 1 vida de su pool de 10 vidas de prueba semanales, **sin RAG**.

3. **🧠 Modalidad 3: Flashcard Tutor (Tutor en Módulo de Repaso - `flashcard_tutor`):**
   - **Frontend:** `flashcards.html` / `tutor-chat.js` (Activación al girar la tarjeta en la sesión SM-2).
   - **Backend:** `chatController.js` ↔ `tutorAiService.js` (Modelo Primario: Cascada forward-compatible en Vertex AI SDK).
   - **Inyección de Contexto de Tarjeta:** Recibe la disciplina (`deckCategory`), nombre del mazo (`deckName`), tema (`topic`), anverso (`front`), reverso (`back`) e imágenes adjuntas.
   - **Especialización Multidisciplinaria Pura:** Adapta automáticamente su rigor y marco analítico a la materia de la tarjeta (**Derecho**, **Medicina**, **Educación**, **Tecnología / Programación**, **Matemáticas**, **Historia**, **Ciencias**, **General**).
   - **Aislamiento Temático Estricto (CERO CONTAMINACIÓN):**
     - **Sin RAG en Pinecone:** No ejecuta búsquedas vectoriales médicas ni pedagógicas en materias ajenas, garantizando **cero contaminación temática**.
     - Prohibición estricta de emitir descargos médicos o citas del MINSA en materias ajenas a medicina.
   - **Límites:** Sujeto a la cuota diaria de Tutor IA (`daily_ai_usage`) o vidas en Free.

* **Pipeline de Renderizado V3 Unificado:** Toda respuesta de la IA es procesada por `markdown-renderer.js` + `marked.js` centralizado, formateando tablas en contenedores responsivos (`table-responsive-wrapper`), saneando JSON crudo y resolviendo imágenes vía el proxy seguro de medios `/api/media/gcs`.

### 3.4 🧠 Módulo de Repaso Espaciado y Flashcards (SuperMemo-2 SRS)
* **Gestión Jerárquica:** Mazos del sistema (oficiales) y mazos personalizados creados por el usuario con soporte de submazos multinivel.
* **Categorías Oficiales:** Medicina, Educación, Derecho, Tecnología, Matemáticas, Historia, Ciencia y General.
* **Algoritmo SuperMemo-2:** Calcula repeticiones, factor de facilidad ($EF \ge 1.3$) e intervalos en días según la autoevaluación del alumno (Otra vez, Difícil, Bien, Fácil).
* **Multimedia y Enfoque de Estudio Atómico:**
  * Texto enriquecido de hasta 1,000 caracteres por cara.
  * Carga y vinculación de imágenes optimizadas en Google Cloud Storage (exclusivo Plan Avanzado).
  * **Erradicación de Voz Neural Cloud TTS:** La síntesis vocal en la nube (Google Cloud Text-to-Speech) fue retirada de la plataforma web y de las aplicaciones móviles para eliminar sobrecostos de infraestructura y dependencias innecesarias, consolidando un aprendizaje visual y atómico de alto impacto cognitivo.
* **Generación e Importación:**
  * Importación masiva desde archivos Excel (hasta 100 tarjetas por archivo con texto enriquecido).
  * Clonación comunitaria de mazos públicos con límite anti-spam (30 clones/día).

### 3.5 📚 Mi Biblioteca de Estudio & Boletín Científico-Normativo
* **Catálogo Unificado de Recursos:** Clasificación por tipos: `paper` (Papers científicos), `norma` (Normas Técnicas y Leyes), `guia` (Guías de Práctica Clínica), `noticia` (Comunicados Oficiales), `book` (Libros/Manuales) y `video` (Clases audiovisuales).
* **Selector Dinámico:** Alternancia rápida entre sectores **SALUD** y **EDUCACIÓN**.
* **Buscador Inteligente:** Búsqueda en caliente con auto-reset, botón de limpieza `X` y soporte de tecla `Escape`.
* **Visor Inmersivo Universal:** Lectura de PDFs y reproducción de videos en pantalla completa sin salir del dominio.
* **Tablón de Notas Personales:** Editor de notas integrado con sincronización directa en 1 clic desde el Tutor IA ("Guardar como Nota") y clasificación por colores.
* **Ingesta Automatizada Inteligente (Scheduled Tasks a las 8:00 PM):**
  * *Diaria:* Escaneo y deduplicación de noticias oficiales MINEDU y MINSA.
  * *Semanal:* Ingesta de papers científicos recientes (PubMed, SciELO, Redalyc, Dialnet) con traducción técnica al español, síntesis conceptual y verificación anti-Soft-404.

### 3.6 🛠️ Panel de Gestión Administrativa (Management Panel)
* **Dashboard de KPIs:** Métricas de visitas únicas, usuarios concurrentes y ranking de engagement por tipo de recurso.
* **Curaduría de Contenido:** Editor Pro enriquecido (TinyMCE 6 en modo oscuro) con soporte completo de tablas de datos, filtros avanzados y semáforo visual de estado (Premium, Visible, Visor Directo).
* **Control de Banco de Preguntas:** Inyección RAG por lote, importación CSV/Excel y depuración de reactivos.
* **Gestión Transaccional de Usuarios:** Asignación de tiers (`basic`, `advanced`, `free`), cálculo automático de vencimientos (+2 / +4 meses), reseteo de cuotas y recuperación de contraseñas.

---

## 4. 💳 Modelo de Negocio, Monetización y Cuotas

| Característica / Módulo | 🆓 Prueba Gratuita (Free) | 🥉 Plan Básico (Basic) | 🥇 Plan Avanzado (Advanced) |
| :--- | :--- | :--- | :--- |
| **Precio y Vigencia** | S/ 0 (Pool de 10 vidas/semana) | **S/ 9.90** (2 Meses) | **S/ 24.90** (4 Meses) |
| **Tutor IA (Chat)** | Estándar (Descuenta vidas, Sin RAG) | 50 mensajes/día (Sin RAG) | **100 mensajes/día (Con hasta 25 RAG/día)** |
| **Simulador de Exámenes** | Descuenta vidas | **15 simulacros / día** | **50 simulacros / día** |
| **Flashcards Manuales** | Texto básico | Ilimitadas (1,000 chars por cara) | Ilimitadas + Imágenes |
| **Carga de Imágenes GCS** | No incluido (Paywall) | No incluido (Paywall) | **Incluido (Almacenamiento seguro)** |
| **Carga Masiva Excel** | Bloqueado | 3 archivos / día (100 cards c/u) | **10 archivos / día** |
| **Síntesis Audio TTS Cloud** | Retirado definitivamente | Retirado definitivamente | Retirado definitivamente (cero costos recurrentes) |
| **Diagnóstico Clínico IA** | Bloqueado | Bloqueado | **Incluido (Correlación de fallas)** |
| **Comunidad y Mazos** | 30 clones / día | 30 clones / día | **30 clones / día** |

### 4.1 Pasarelas de Pago Habilitadas
1. **Mercado Pago (Automático):** Procesamiento de tarjetas y billeteras digitales con activación en tiempo real mediante Webhook transaccional y redirección `/?payment=success`.
2. **Yape / Plin (Contacto Oficial WhatsApp):** Canal asistido mediante enlace directo al WhatsApp oficial de Hub Academia (**+51 993 869166**) con mensaje preconfigurado con el correo del usuario para activación inmediata desde el Panel de Gestión.

---

## 5. 🛡️ Seguridad, Infraestructura y Buenas Prácticas

* **Seguridad a Nivel de Filas (Supabase RLS):** 100% de las tablas privadas (`user_notes`, `user_flashcards`, `user_book_library`, `quiz_history`, `user_simulator_preferences`) protegidas con políticas `auth.uid() = user_id`.
* **Media Proxy Seguro (GCS + Sharp):** Los archivos multimedia se distribuyen mediante `/api/media/gcs` con validación JWT, convirtiendo a formato WebP optimizado (máx 1000px, 80% calidad) para acelerar la carga en dispositivos móviles.
* **Autenticación Robusta:** JWT con cookies seguras y cabeceras Bearer, soporte de inicio de sesión con Google OAuth y restablecimiento administrativo de contraseñas.
* **Resiliencia y Monitoreo:** Suite de pruebas unitarias automatizadas (`npm test`) con cobertura total de controladores, servicios de negocio y repositorios.

---

## 6. 📱 Sincronización Multiplataforma (Web ↔ Ecosistema Móvil)

El backend de Hub Academia actúa como la fuente única de verdad para la suite de aplicaciones móviles React Native / Expo:
* **`HubDocenteApp`:** Aplicación móvil especializada para profesores peruanos.
* **`HubSaludApp`:** Aplicación móvil para médicos, internos y enfermeros en preparación SERUMS.
* **`HubRepasoApp`:** Aplicación móvil centrada en el estudio activo de flashcards con soporte offline.

Todas las aplicaciones consumen exactamente los mismos endpoints (`/api/docente/*`, `/api/medico/*`, `/api/decks/*`, `/api/flashcard/*`), comparten las cuotas de usuario en tiempo real y garantizan coherencia absoluta de datos.

---

## 7. 💻 Stack Tecnológico Exhaustivo (100% Backend, Frontend, Cloud & Bases de Datos)

A continuación se detalla la totalidad de las tecnologías, frameworks, librerías, motores de base de datos, servicios en la nube y modelos de inteligencia artificial que impulsan a **Hub Academia**:

### 7.1 Backend, Runtime & Frameworks
| Tecnología / Paquete | Versión | Capa Arquitectural | Propósito y Función en el Sistema |
| :--- | :--- | :--- | :--- |
| **Node.js** | `v20+ (LTS)` | Runtime Backend | Entorno de ejecución asíncrono y de alto rendimiento basado en eventos. |
| **Express.js** | `^4.21.2` | Application Layer | Framework web modular para orquestación de APIs RESTful, enrutamiento y middlewares. |
| **Dotenv** | `^16.6.1` | Infrastructure | Carga y gestión segura de variables de entorno del servidor. |
| **CORS** | `^2.8.5` | Infrastructure | Control de políticas de acceso HTTP de origen cruzado para clientes web y móviles. |
| **Body-Parser** | `^1.20.3` | Application | Decodificación y parseo estructurado de payloads HTTP (JSON y URL-encoded). |
| **Express-Rate-Limit** | `^8.2.1` | Application | Limitador de tasa y protección perimetral contra saturación de peticiones y fuerza bruta. |
| **Multer** | `^2.0.2` | Application | Middleware para procesamiento y carga de archivos binarios en memoria (`multipart/form-data`). |
| **Nodemon** | `^3.1.10` | Dev Tooling | Recarga en caliente automática del servidor Express durante el desarrollo. |
| **Jest** | `^30.2.0` | Testing Suite | Framework de pruebas unitarias automatizadas con cobertura total de controladores y servicios (60 suites, 503 tests en verde al 100%). |

---

### 7.2 Bases de Datos, Persistencia & Motores Vectoriales
| Tecnología / Driver | Versión / Tipo | Propósito y Función en el Sistema |
| :--- | :--- | :--- |
| **PostgreSQL** | `15+` (Supabase) | Base de datos relacional ACID primaria con agregaciones JSON nativas (`JSON_AGG`), subconsultas CTE y 14 índices compuestos. |
| **pg (`node-postgres`)** | `^8.16.3` | Pool de conexiones nativas a PostgreSQL con soporte SSL y ejecución de transacciones atómicas. |
| **Supabase JS Client** | `^2.83.0` | Abstracción de base de datos con políticas estrictas de seguridad por fila (**Row Level Security - RLS**). |
| **Pinecone Serverless** | `^7.2.0` | Base de datos vectorial serverless (`hub-academia-index`, 768 dimensiones, métrica coseno) con namespaces independientes: `medicine` y `education`. |
| **pgvector (`extensions.vector`)** | Extensión Postgres | Indexación y almacenamiento de vectores densos de 768 dimensiones en el motor relacional. |
| **uuid-ossp (`extensions.uuid-ossp`)** | Extensión Postgres | Generador criptográfico de identificadores únicos universales (`UUIDv4`). |

---

### 7.3 Inteligencia Artificial, LLMs & Computación Cognitiva
| Modelo / Servicio | Proveedor / SDK | Propósito y Función en el Sistema |
| :--- | :--- | :--- |
| **Gemini Enterprise AI (Vertex AI)** | `@google-cloud/vertexai` (`^1.10.0`) | **Canal Exclusivo de Producción (100% Pospago GCP):** Inferencia empresarial de ultra-baja latencia con cascada forward-compatible: `gemini-3.5-flash-lite` ➡️ `gemini-3.1-flash-lite` ➡️ `gemini-2.5-flash-lite` ➡️ `gemini-2.5-flash` para Tutores IA, generadores Sniper-RAG y Diagnóstico IA. |
| **text-multilingual-embedding-002** | Google Vertex AI (`aiplatform`) | Vectorización semántica multilingüe estándar de 768 dimensiones para chunks y consultas vectoriales en Pinecone. |
| **Google AI Studio REST** | Erradicado al 100% | Desactivado y eliminado del código para evitar bloqueos por esquemas prepago/recargas de créditos de Google AI Studio. |
| **Google Cloud Text-to-Speech (TTS)** | Retirado / Deprecado | Síntesis vocal en la nube retirada de los flujos de usuario web y móvil para optimizar costos de infraestructura. |

---

### 7.4 Almacenamiento Cloud & Procesamiento Multimedia
| Servicio / Librería | Versión | Propósito y Función en el Sistema |
| :--- | :--- | :--- |
| **Google Cloud Storage (GCS)** | `@google-cloud/storage` (`^7.19.0`) | Repositorio de objetos en la nube para infografías médicas, imágenes pedagógicas, portadas y miniaturas. |
| **Sharp** | `^0.33.5` | Motor de compresión y transformación de imágenes en C++ (conversión a WebP, 1000px ancho max, 80% calidad y retención de metadatos). |
| **Google Drive API** | `googleapis` (`^171.4.0`) | Sincronización masiva de carpetas académicas de Drive y descarga de miniaturas de alta resolución. |

---

### 7.5 Seguridad, Criptografía & Pasarelas Transaccionales
| Tecnología / Librería | Versión | Propósito y Función en el Sistema |
| :--- | :--- | :--- |
| **JSON Web Token (JWT)** | `jsonwebtoken` (`^9.0.2`) | Firma y verificación criptográfica de sesiones de usuario y autorización Bearer. |
| **Bcrypt.js** | `^2.4.3` | Hashing unidireccional con salting para contraseñas de cuentas locales. |
| **Google Auth Library** | `google-auth-library` (`^10.6.2`) | Verificación criptográfica de tokens ID de Google OAuth 2.0 en el backend. |
| **Mercado Pago SDK** | `mercadopago` (`^2.11.0`) | Creación de preferencias de pago, suscripciones recurrentes y validación de Webhooks con firma HMAC SHA-256 (`x-signature`). |
| **Crypto** | Nativo de Node.js | Generación de hashes MD5/SHA-256 para deduplicación atómica de preguntas (`question_hash`). |

---

### 7.6 Algoritmos & Procesamiento de Lenguaje Natural (Backend)
| Librería / Algoritmo | Versión | Propósito y Función en el Sistema |
| :--- | :--- | :--- |
| **Natural** | `^8.1.0` | Tokenización, análisis léxico y procesamiento de lenguaje natural en JavaScript. |
| **Fast-Levenshtein** | `^3.0.0` | Coincidencia difusa de términos para el motor de búsqueda de cursos y recursos bibliográficos. |
| **Snowball** | `^0.3.1` | Lematización y reducción de raíces morfológicas (stemming) en español. |
| **SuperMemo-2 (SM-2)** | Algoritmo Custom | Motor de repetición espaciada para cálculo psicométrico de factores de facilidad ($EF \ge 1.3$) e intervalos de repaso. |

---

### 7.7 Frontend, UI/UX & Librerías de Cliente (Browser)
| Tecnología / Librería | Versión / CDN | Propósito y Función en la Interfaz |
| :--- | :--- | :--- |
| **Vanilla JavaScript (ES6+)** | Nativo Navegador | Lógica modular desacoplada en componentes (`uiManager.js`, `libraryUI.js`, `quiz.js`, `repaso.js`, `simulator-dash.js`) con 0ms de sobrecarga de frameworks. |
| **CSS3 Modular & Design System** | Custom Architecture | Sistema de diseño centralizado en Negro Mate Puro (`#030303` - `#0f111a`), degradados Manta Pill y Glassmorphism responsivo. |
| **Google Fonts (Inter / Outfit)** | CDN Google Fonts | Tipografía moderna optimizada para máxima legibilidad en tablas clínicas y exámenes. |
| **FontAwesome** | `6.4.0` (CDN) | Iconografía vectorial técnica para navegación, badges y estados de interacción. |
| **Marked.js** | `v4.0+` | Renderizado ultra-rápido de Markdown a HTML con envoltura de tablas responsivas (`table-responsive-wrapper`). |
| **TinyMCE 6** | `6.8.3` (CDN) | Editor enriquecido Pro en modo oscuro editorial con soporte avanzado para creación y edición de tablas complejas. |
| **SheetJS (XLSX)** | `0.18.5` (CDN) | Parseo e importación local de archivos Excel (`.xlsx`, `.csv`) directamente en el navegador del cliente. |
| **Chart.js** | `v4+` (CDN) | Renderizado de gráficos de rendimiento psicométrico, diagramas de radar y métricas de avance estudiantil. |
| **Canvas-Confetti** | CDN JS | Efectos visuales de celebración ante el aprobado de simulacros de examen. |
| **Supabase JS Client Web** | `v2` (CDN) | Inicialización de sesión y flujo de autenticación con Google OAuth en el cliente. |

---

### 7.8 Microservicio de Machine Learning & Pipeline Vectorial (Python)
| Tecnología / Paquete | Entorno | Propósito y Función en el Sistema |
| :--- | :--- | :--- |
| **Python** | `3.10+` | Entorno para procesamiento por lotes fuera de línea e ingesta OCR. |
| **Pandas** | `pandas` | Agregación de tráfico, métricas de interacción de recursos y análisis de series temporales. |
| **Sentence-Transformers** | Python ML | Embeddings locales para predicción de tendencias de búsqueda con decaimiento exponencial ($W = e^{-0.05 \cdot t}$). |
| **PyMuPDF (fitz)** | Python OCR/PDF | Extracción rápida de texto y metadatos de documentos PDF académicos. |
| **Pdf2image + Pytesseract** | Tesseract OCR | Extracción óptica de caracteres en documentos escaneados antiguos. |
| **Psycopg2** | Python DB | Conexión directa a PostgreSQL para persistencia de datos vectoriales y chunks RAG. |

---

## 8. 🧠 Estrategia de IA: Google Cloud Vertex AI Exclusivo (Gemini Enterprise Agent Platform) & Gobernanza de Modelos

### 8.1 Erradicación de Google AI Studio y Consolidación en Vertex AI Empresarial (2026)
A partir de setiembre de 2026, la infraestructura de inteligencia artificial de Hub Academia opera **exclusivamente sobre Google Cloud Vertex AI (Gemini Enterprise Agent Platform)** con facturación mensual postpago corporativa en el proyecto `gen-lang-client-0179928353` (región `us-central1`).

**Decisión Técnica de Erradicación de Google AI Studio:**
Google AI Studio modificó sus políticas de acceso requiriendo la recarga obligatoria de saldo prepago en créditos (mínimo $5 USD). Ante el agotamiento de saldo prepago, los endpoints de AI Studio cortan de inmediato el servicio. Dado que la plataforma opera bajo un modelo de facturación postpago empresarial en Google Cloud Platform (GCP), **se erradicó al 100% Google AI Studio (`generativelanguage.googleapis.com`) del backend**, eliminando cualquier riesgo de suspensión por saldo prepago y garantizando alta disponibilidad continua mediante acuerdos de nivel de servicio (SLA) corporativos.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   ARQUITECTURA DE IA EXCLUSIVA DE PRODUCCIÓN                │
├─────────────────────────────────────────────────────────────────────────────┤
│ ☁️ GOOGLE CLOUD VERTEX AI (GEMINI ENTERPRISE AGENT PLATFORM)                 │
│ • Facturación: Mensual postpago empresarial vía Google Cloud Billing        │
│ • Autenticación: Google Cloud Service Account IAM (`googleCredentials.js`)  │
│ • Región Primaria: `us-central1`                                            │
│ • SDK Oficial: `@google-cloud/vertexai` (^1.10.0)                           │
│ • Google AI Studio: ERRADICADO (0 dependencias prepago, 0 llaves de prueba) │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Calendario Oficial de Retiro de Google Cloud para la Familia Gemini 2.5
Según la notificación oficial emitida por Google Cloud para los endpoints de *Gemini Enterprise Agent Platform*:

| Hito Oficial de Google | Fecha Límite | Impacto Operativo y Acción en Hub Academia |
| :--- | :--- | :--- |
| **Fase 1: Retiro Público** | **20 de Octubre de 2026** | Los modelos de Gemini 2.5 entran en fase de retiro público. Los proyectos activos con tráfico continuo (como `gen-lang-client-0179928353`) **mantienen acceso ininterrumpido sin variación de tarifas**. |
| **Fase 2: Shutdown `2.5 Flash Lite`** | **28 de Enero de 2027** | Apagado definitivo y retiro de servicio de `gemini-2.5-flash-lite`. |
| **Fase 2: Shutdown `2.5 Flash / Pro`** | **31 de Marzo de 2027** | Apagado definitivo y retiro de servicio de `gemini-2.5-flash` y `gemini-2.5-pro`. |
| **Destinos Oficiales de Migración GA** | **Gemini 3.1 Flash Lite / 3.5 Flash Lite** | Los modelos sucesores recomendados por Google son `gemini-3.1-flash-lite` y `gemini-3.5-flash-lite`. |

### 8.3 Cascada Forward-Compatible Resiliente de Invocación
Para anticipar y neutralizar el calendario de retiros de Google sin requerir migraciones de emergencia ni provocar downtime, todos los servicios de inferencia generativa del backend (`adminAiService.js`, `tutorAiService.js`, `analyticsController.js`, `ragService.js`) implementan la siguiente **cascada progresiva hacia adelante**:

```
[Invocación de Servicio]
         │
         ▼
┌─────────────────────────────────┐
│  1. gemini-3.5-flash-lite (GA)  │  ◄── Adopción automática instantánea
└────────┬────────────────────────┘
         │ (Fallback si 404 en región)
         ▼
┌─────────────────────────────────┐
│  2. gemini-3.1-flash-lite (GA)  │  ◄── Adopción automática instantánea
└────────┬────────────────────────┘
         │ (Fallback si 404 en región)
         ▼
┌─────────────────────────────────┐
│  3. gemini-2.5-flash-lite       │  ◄── Activo hoy en us-central1 (SLA Enterprise)
└────────┬────────────────────────┘
         │ (Fallback ante micro-corte)
         ▼
┌─────────────────────────────────┐
│  4. gemini-2.5-flash            │  ◄── Respaldo de alta capacidad analítica
└────────┬────────────────────────┘
         │ (Solo en Diagnóstico IA)
         ▼
┌─────────────────────────────────┐
│  5. Motor Heurístico de Reserva │  ◄── Generador algorítmico local sin dependencias
└─────────────────────────────────┘
```

1. **Adopción Automática de Nueva Generación:** Tan pronto Google habilite la disponibilidad general (GA) de `gemini-3.5-flash-lite` o `gemini-3.1-flash-lite` en la región `us-central1` de Vertex AI, el sistema comenzará a consumir dichos modelos inmediatamente sin requerir actualizaciones de código ni despliegues adicionales.
2. **Alta Resiliencia en Producción Actual:** Durante la fase de transición actual, si los modelos 3.x responden con código 404 por despliegue regional progresivo de Google, la cascada conmuta en milisegundos a `gemini-2.5-flash-lite` (y secundariamente a `gemini-2.5-flash`), garantizando respuestas ultra-rápidas y exitosas.
3. **Red de Seguridad Heurística (Diagnóstico Inteligente):** Si ocurriese un corte global de red externa, el módulo de analítica conmuta de forma transparente al motor determinístico (`AnalyticsService.generateHeuristicDiagnostic`), entregando al estudiante su diagnóstico de brechas por escala sin arrojar jamás un error HTTP 500.

### 8.4 Protocolo de Monitoreo y Validación Continua
* **Verificación en Vivo:** Pruebas empíricas automatizadas contra el proyecto GCP para validar códigos de estado HTTP 200 y tiempos de respuesta (< 1.5s).
* **Suite de Regresión Automatizada:** Validación obligatoria mediante `npm test -- --runInBand`, asegurando que el 100% de las 60 suites de pruebas (503 pruebas unitarias) pasen limpiamente en verde antes de cada despliegue a producción.
