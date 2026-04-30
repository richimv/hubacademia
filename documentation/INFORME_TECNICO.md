# ðŸ“˜ Informe TÃ©cnico Profesional: Chatbot Tutor UC

**Versión del Documento:** 1.1  
**Fecha de Generación:** 27 de Abril de 2026  
**Proyecto:** Hub Academia - Chatbot Tutor UC

---

## 1. ðŸš€ Resumen Ejecutivo

**Hub Academia** es una plataforma educativa integral diseÃ±ada para apoyar a estudiantes universitarios mediante tecnologÃ­as de vanguardia. El sistema combina una **biblioteca digital** centralizada, un **tutor inteligente (IA)** basado en el modelo Gemini 2.5 de Google, y un mÃ³dulo de **gamificaciÃ³n (Quiz Arena)** para reforzar el aprendizaje.

El objetivo principal es democratizar el acceso a recursos acadÃ©micos de calidad y proporcionar asistencia personalizada 24/7, reduciendo la brecha de conocimiento en cursos complejos.

---

## 2. ðŸ—ï¸ Arquitectura del Sistema

El proyecto sigue una arquitectura de software moderna y escalable, basada en principios de **Clean Architecture** y una separaciÃ³n estricta de responsabilidades en cuatro capas.

### 2.1. Diagrama de Capas

```mermaid
graph TD
    P[Presentation Layer] --> A[Application Layer]
    A --> D[Domain Layer]
    A --> I[Infrastructure Layer]
    I --> EXT[External Services (Google AI, Supabase, MercadoPago)]
```

### 2.2. DescripciÃ³n de Componentes

1.  **Presentation Layer (`/presentation`)**:
    *   **Responsabilidad:** Interfaz de usuario (UI) y experiencia de usuario (UX).
    *   **TecnologÃ­as:** HTML5 SemÃ¡ntico, CSS3 Moderno (Variables, Glassmorphism), Vanilla JavaScript (ES6+).
    *   **Componentes Clave:**
        *   `index.html`: Punto de entrada Ãºnico (SPA/MPA hÃ­brido).
        *   `js/search.js`: Motor de bÃºsqueda y renderizado dinÃ¡mico de contenido.
        *   `js/chat.js`: Cliente de Websocket/REST para comunicaciÃ³n con el Tutor IA.
        *   `js/ui/`: Gestores de componentes reutilizables (Modales, Tarjetas, Alertas).

2.  **Application Layer (`/application`)**:
    *   **Responsabilidad:** Casos de uso y reglas de orquestaciÃ³n de la aplicaciÃ³n.
    *   **Componentes Clave:**
        *   `controllers/`: Controladores que manejan las peticiones HTTP (e.g., `chatController.js`, `contentController.js`).
        *   `middleware/`: LÃ³gica intermedia para autenticaciÃ³n (`authMiddleware.js`) y manejo de errores.

3.  **Domain Layer (`/domain`)**:
    *   **Responsabilidad:** LÃ³gica de negocio pura y entidades del sistema.
    *   **Componentes Clave:**
        *   `services/`: Servicios de negocio especializados (e.g., `tutorAiService.js` para el chat, `adminAiService.js` para gestión masiva, `userAiService.js` para simulacros).
        *   `repositories/`: Interfaces abstractas para acceso a datos.

    **Nota:** La plataforma utiliza una arquitectura híbrida inteligente. Mientras que la interacción y la IA generativa residen en servicios especializados en **Node.js**, el procesamiento analítico pesado se mantiene en un microservicio de **Python Local** (`/ml_service`). El sistema RAG ahora opera sobre **Pinecone** para una búsqueda vectorial de élite.

4.  **Infrastructure Layer (`/infrastructure`)**:
    *   **Responsabilidad:** ImplementaciÃ³n tÃ©cnica y comunicaciÃ³n con servicios externos.
    *   **Componentes Clave:**
        *   `database/`: ConexiÃ³n inicial con Supabase (`supabaseClient.js`).
        *   `repositories/`: ImplementaciÃ³n concreta de los repositorios (e.g., `supabaseUserRepository.js`).
        *   `server.js`: ConfiguraciÃ³n del servidor Express y rutas.

---

## 3. ðŸ› ï¸ Stack TecnolÃ³gico

La selecciÃ³n de tecnologÃ­as prioriza el rendimiento, la escalabilidad y la experiencia de usuario.

| Ãrea | TecnologÃ­a | PropÃ³sito |
| :--- | :--- | :--- |
| **Backend** | Node.js + Express | Servidor API RESTful rÃ¡pido y ligero. |
| **Frontend** | Vanilla JS / CSS3 | Interfaz reactiva sin la sobrecarga de frameworks pesados. |
| **Base de Datos** | PostgreSQL (Supabase) | GestiÃ³n relacional robusta de usuarios y contenidos. |
| **Inteligencia Artificial** | Google Vertex AI (Gemini 2.5 Flash) | Motor de razonamiento y generaciÃ³n de respuestas con **Function Calling**. |
| **Machine Learning** | Python Local + Node.js | AnÃ¡lisis de tendencias, Similitud Coseno/Jaccard y PredicciÃ³n de Demanda. |
| **Pagos** | Mercado Pago | Pasarela segura para suscripciones Premium. |
| **Despliegue** | Render / Vercel | Hosting de alta disponibilidad. |

---

## 4. âœ¨ MÃ³dulos y Funcionalidades Clave

### 4.1. Tutor Académico IA (Advanced Semantic RAG V6)
El núcleo inteligente de la plataforma ha evolucionado hacia una arquitectura robusta de Generación Aumentada por Recuperación (RAG) Semántica:
*   **Extracción Híbrida de Documentos:** Mediante un motor de ingesta backend, usamos bibliotecas avanzadas como **Poppler** para el texto y **Tesseract OCR** para diagramas.
*   **Fragmentación y Vectorización:** Los libros y Normas Técnicas son divididos en chunks. Cada pedazo es vectorizado usando la API `text-multilingual-embedding-002` de Google.
*   **Almacenamiento Vectorial en Pinecone:** Hemos migrado de `pgvector` a **Pinecone** (Index: `hub-academia-index`). La búsqueda semántica ahora se realiza en una nube vectorial dedicada, garantizando una precisión clínica superior y una latencia de respuesta de milisegundos.
*   **Cero Alucinaciones:** El contexto recuperado de Pinecone se inyecta en el Prompt de Gemini 2.5 Flash Lite con restricciones absolutas.
*   **Agentic Capabilities:** Sigue utilizando **Function Calling** para identificar información dinámica del usuario.

### 4.1.1. Estructura de Datos RAG y Pinecone
Para posibilitar la búsqueda de información médica semántica, la base de datos vectorial Pinecone almacena los fragmentos bajo el siguiente esquema:
*   **Vector ID**: Un hash único basado en el contenido del chunk.
*   **Values**: Matriz de 768 dimensiones (Multilingual Embedding v2).
*   **Metadata**: Objeto JSON que preserva el hilo conductor: `content` (texto crudo), `source` (nombre del PDF), `category` (área clínica) y `chunk_index`, proveyendo trazabilidad bibliográfica total.

### 4.2. Biblioteca Digital
Sistema de gestiÃ³n de contenidos (CMS) personalizado.
*   **OrganizaciÃ³n:** JerarquÃ­a de `Ãreas -> Carreras -> Cursos -> Temas -> Libros`.
*   **BÃºsqueda:** Motor de bÃºsqueda en tiempo real con filtrado por categorÃ­a.

### 4.3. Centro de Entrenamiento (Training Hub)
MÃ³dulo integral para el refuerzo del aprendizaje mediante prÃ¡ctica activa, refactorizado en v2.0 para escalabilidad y UX.

#### A. Arquitectura del Simulador (Clean Architecture)
El sistema utiliza un flujo unidireccional de datos con responsabilidades claras:
*   **Frontend (`quiz.js`, `simulator-dash.js`):** Gestiona el estado local, temporizadores y renderizado reactivo.
*   **Backend (`QuizController.js`):** Orquestador que valida reglas de negocio (LÃ­mites Freemium, Contextos).
*   **Dominio (`TrainingService.js`):** NÃºcleo inteligente que decide la estrategia de generaciÃ³n de preguntas (HÃ­brida).
*   **Infraestructura (`TrainingRepository.js`):** AbstracciÃ³n de base de datos y optimizaciÃ³n de consultas SQL.

#### B. Componentes Principales

1.  **Dashboard del Simulador (`simulator-dashboard.html`)**
    *   **DiseÃ±o Modular:** "Command Center" con 3 zonas: KPIs (Tope), AnalÃ­tica (Centro) y AcciÃ³n (Fondo).
    *   **AnalÃ­tica Avanzada:**
        *   **GrÃ¡fico de EvoluciÃ³n:** VisualizaciÃ³n de tendencias (`Chart.js`) basada en los Ãºltimos 10 intentos, normalizando puntajes a escala 0-20.
        *   **DiagnÃ³stico IA:** Tarjeta con trigger manual que analiza patrones de error y sugiere Ã¡reas de refuerzo (Cards Mastered vs Weak Topics).
    *   **Modos de Entrenamiento (Grid DinÃ¡mico):**
        *   âš¡ **Simulacro RÃ¡pido:** 10 preguntas (Arcade).
        *   ðŸ“š **Modo Estudio:** 20 preguntas (Feedback inmediato).
        *   ðŸŽ¯ **Simulacro Real:** 100 preguntas (Mock Test oficial, dificultad forzada).
        *   ðŸ§  **Flashcards:** Acceso directo al sistema de Repaso Espaciado.

2.  **Motor de Examen (`quiz.js`)**
    *   **Estado Reactivo:** GestiÃ³n de preguntas, respuestas y progreso en el cliente.
    *   **Batch Loading:** Carga preguntas en lotes de 5 en segundo plano (`fetchNextBatch`) para mantener rendimiento fluido.
    *   **RotaciÃ³n DinÃ¡mica de Opciones:** Los simulacros para ENAM y SERUMS operan con 4 opciones. Aquellos tipificados como **RESIDENTADO** fuerzan la generaciÃ³n y renderizado de **5 opciones** para simular la rigurosidad del examen CONAREME real.
    *   **Rastreo de Datos Granular:** EnvÃ­o de metadata avanzada on-submit (target, Ã¡reas, dificultad, respuestas por pregunta) hacia el backend para analÃ­tica JSONB.

3.  **ConfiguraciÃ³n de Examen (`simulator-dash.js` - Modal v2.0)**

    Sistema de personalizaciÃ³n del simulacro alineado con el sistema educativo mÃ©dico peruano:

    **Tipos de Examen Objetivo:**

    | Target | DescripciÃ³n | Opciones | Estilo IA |
    | :--- | :--- | :--- | :--- |
    | **ENAM** | Examen Nacional de Medicina (ASPEFAM). Obligatorio para egresados. 180-200 preguntas | 4 | ClÃ­nica general, fisiopatologÃ­a, diagnÃ³stico clÃ¡sico. **Incluye NTS bÃ¡sicas** de Salud PÃºblica (Vacunas, TB, Materno-Perinatal, MAIS-BFC). Certificado de DefunciÃ³n (fijo). Enfoque: "El MÃ©dico de Posta" |
    | **SERUMS** | EvaluaciÃ³n SERUMS (ENCAPS) del MINSA para mÃ©dicos, enfermeras, obstetras, odontÃ³logos, etc. | 4 | Prioriza Seguridad del Paciente, Medicina Preventiva/Comunitaria, CategorizaciÃ³n de establecimientos (I-1 al III-2), triaje, y ciencias bÃ¡sicas aplicadas a la salud pÃºblica. Enfoque holÃ­stico de atenciÃ³n primaria. |
    | **RESIDENTADO** | Examen Nacional de Residentado MÃ©dico (CONAREME) | 5 | Especialidad avanzada: diagnÃ³stico diferencial exhaustivo, Gold Standard, tratamiento 2da/3ra lÃ­nea. InvestigaciÃ³n: RR, OR, sesgos. GestiÃ³n: Ishikawa, FODA. 90% casos clÃ­nicos. Enfoque: "El MÃ©dico CientÃ­fico/Gerente" |

    **Niveles de Dificultad (Basados en exigencia cognitiva, NO en materia):**

    | Nivel | EvalÃºa | Ejemplo |
    | :--- | :--- | :--- |
    | **BÃ¡sico** | Memoria pura: etiologÃ­as, definiciones, mecanismos | "Â¿CuÃ¡l es el agente causal de la sÃ­filis?" |
    | **Intermedio** | AnÃ¡lisis clÃ­nico: viÃ±etas diagnÃ³sticas | Caso con fiebre + manchas â†’ pedir diagnÃ³stico |
    | **Avanzado** | Toma de decisiones: manejo terapÃ©utico, excepciones | Tratamiento alternativo en alÃ©rgico a 1ra lÃ­nea |

    **23 Ãreas de Estudio en 4 Grupos:**

    *   **Grupo A â€” Ciencias BÃ¡sicas:** AnatomÃ­a, FisiologÃ­a, FarmacologÃ­a, MicrobiologÃ­a y ParasitologÃ­a.
    *   **Grupo B â€” Las 4 Grandes:** Medicina Interna, PediatrÃ­a, GinecologÃ­a y Obstetricia, CirugÃ­a General.
    *   **Grupo C â€” Especialidades ClÃ­nicas:** CardiologÃ­a, GastroenterologÃ­a, NeurologÃ­a, NefrologÃ­a, NeumologÃ­a, EndocrinologÃ­a, InfectologÃ­a, ReumatologÃ­a, TraumatologÃ­a.
    *   **Grupo D â€” Salud PÃºblica y GestiÃ³n:** Salud PÃºblica y EpidemiologÃ­a, GestiÃ³n de Servicios de Salud, Ã‰tica DeontologÃ­a e Interculturalidad, Medicina Legal, InvestigaciÃ³n y BioestadÃ­stica, Cuidado Integral.

    Las Ã¡reas son idÃ©nticas para los 3 tipos de examen. Lo que cambia es el estilo del prompt de IA y las directrices de generaciÃ³n.

    **UX del Modal:** Renderizado dinÃ¡mico con sub-headers por grupo, scrollable (`max-height: 85vh`). Tooltip de primera visita (15s) + efecto neÃ³n pulsante en el botÃ³n "Configurar Examen" hasta que el usuario guarde una configuraciÃ³n.

#### C. LÃ³gica de GeneraciÃ³n HÃ­brida y ReposiciÃ³n Equilibrada (v2.5)
Estrategia costo-eficiente para generar contenido infinito y altamente preciso sin sesgos estadÃ­sticos:
1.  **Balanced Bank First (Cost $0):** Consulta masiva al `question_bank` aplicando un **Sistema de Cuotas Estricto**. Se seleccionan hasta 5 Ã¡reas (muestreo proactivo) y se extraen preguntas respetando un **mÃ¡ximo de 2 por Ã¡rea** en cada tanda de 5.
2.  **Disparador Proactivo de Emergencia:** Si el banco no logra surtir un lote completo de 5 (debido a agotamiento de una Ã¡rea especÃ­fica o falta de stock balanceado), el sistema activa inmediatamente el flujo de reposiciÃ³n.
3.  **Smart Filtering (Anti-RepeticiÃ³n 24h):** Excluye preguntas vistas por el usuario en las Ãºltimas 24 horas (`user_question_history`).
4.  **AI Fallback DinÃ¡mico (RAG Maestro Flow):** Si el banco local tiene stock crÃ­tico o desbalanceado, se invoca a Gemini 2.5 Flash inyectando:
    *   **Muestreo Aleatorio de Ãreas:** MÃ¡ximo 5 Ã¡reas por lote para optimizar el contexto RAG.
    *   **Contexto RAG Local:** BÃºsqueda SQL `ILIKE` en documentos reales del MINSA.
    *   **DeduplicaciÃ³n SemÃ¡ntica:** Scaneo de los Ãºltimos 200 temas generados.
    *   **Estilo de Examen:** AdaptaciÃ³n segÃºn Target (ENAM, SERUMS, Residentado).
5.  **Auto-Learning Global:** Las nuevas preguntas generadas se persisten en el Banco Global y se marcan como vistas para el usuario de forma inmediata.
6.  **ProtecciÃ³n Financiera (Mock Test):** En simulacros masivos (100+ q), se bloquea la generaciÃ³n IA para proteger la rentabilidad, sirviendo solo desde el banco estÃ¡tico.

#### D. AnalÃ­tica de Rendimiento Profunda y JSONB (v2.0)
El sistema migrÃ³ de reportes estÃ¡ticos ("Tema general del Quiz") hacia un modelo granular subatÃ³mico alimentado por base de datos hÃ­brida (Relacional/NoSQL Documental en PostgreSQL):
*   **InyecciÃ³n JSONB:** Al emitir el examen (`submitQuizResult`), el backend recorre cada pregunta iterando Arrays, calculando cuÃ¡ntas preguntas se acertaron y fallaron *por Sub-Tema especÃ­fico* dentro de un mismo simulacro multidisciplinario. El resultado compreso se guarda en la nueva columna `area_stats (JSONB)` de la tabla `quiz_history`.
*   **Motor KPI:** El endpoint `getStats` dispara queries analÃ­ticas sobre la nube estructurada JSON (`jsonb_object_keys`, `SUM`), lo que entrega agregaciones estadÃ­sticas vitales sin sobrecargar la estructura de la base de datos PostgreSQL.
*   **Dashboard Visual (Bar Chart UX):** El ecosistema Frontend intercepta dicho pipeline mediante el propio motor de renderizado HTML/CSS nativo de la plataforma, dibujando un grÃ¡fico de **Barras Horizontales** responsivo que seÃ±ala visual y matemÃ¡ticamente las Fortalezas (ej. PediatrÃ­a: 85%) y Fallas (ej. CirugÃ­a: 20%) de un Doctor.

#### E. Base de Datos (Schema)
*   `question_bank`: Repositorio global de preguntas (compartido). Columnas clave: `domain`, `target` (ENAM/SERUMS/RESIDENTADO), `topic`, `difficulty`, `times_used`.
*   `quiz_history`: Registro de intentos, puntajes y `area_stats` JSONB granular.
*   `user_question_history`: Anti-repeticiÃ³n por usuario (`user_id`, `question_id`, `seen_at`, `times_seen`).
*   `user_flashcards`: Tarjetas generadas automÃ¡ticamente a partir de errores en simulacros.
*   `decks`: Contenedores lÃ³gicos para tarjetas (System Decks vs Custom Decks).

#### F. Funcionalidades Clave
*   **Flashcards AutomÃ¡ticas:** Al fallar una pregunta en Simulacro MÃ©dico, se crea una flashcard automÃ¡ticamente en el mazo "Repaso Medicina" (front = pregunta, back = explicaciÃ³n correcta).
*   **Simulacro RÃ¡pido / Estudio / Real:** ConfiguraciÃ³n dinÃ¡mica de lÃ­mites (`limit=10` / `limit=20` / `limit=100`) desde el backend.
*   **Sistema Freemium de Vidas Globales:** 3 vidas de por vida para usuarios gratuitos. Se consume 1 vida al iniciar un examen (Ronda 1) o al usar funciones de Repaso (Estudiar/Generar IA). VerificaciÃ³n server-side vÃ­a `UsageService.checkAndIncrementUsage()`. Paywall modal con corona dorada al agotar vidas.
*   **NavegaciÃ³n Contextual:** Flujo fluido entre Dashboard -> Quiz -> Resultados -> Dashboard, manteniendo el contexto (ej: Medicina).
*   **Mazos Anidados (Nested Decks):** Sistema de gestiÃ³n de mazos hÃ­brida en Ã¡rbol (Estilo Anki: `CategorÃ­a::Curso::Tema`) con soporte para sub-mazos infinitos.
*   **GrÃ¡fico de RetenciÃ³n:** VisualizaciÃ³n analÃ­tica de barras ("Activity Chart") en el modal de estadÃ­sticas para rastrear la constancia diaria de estudio del usuario sobre los Ãºltimos 14 dÃ­as.

### 4.4. Analytics & Dashboard (Node.js Native)
Sistema de inteligencia de datos completamente integrado en el backend principal.
*   **Algoritmo de Clustering:** Se implementÃ³ el **Ãndice de Jaccard** (Similitud de conjuntos) para agrupar tÃ©rminos de bÃºsqueda similares (ej: "ing sistemas" â‰ˆ "ingenierÃ­a de sistemas") y generar series de tiempo precisas.
*   **KPIs:** MÃ©tricas de adopciÃ³n del chat, tasa de "bÃºsquedas educativas" (vs navegacionales) y CTR de sugerencias de IA.

### 4.5. Pivote Productivo a EdTech MÃ©dico
EstratÃ©gicamente, la plataforma ha dado un giro desde fungir como una amplia "biblioteca genÃ©rica masiva" (riesgosa comercialmente por copyright) hacia un **Hub Formativo EdTech** de alto rigor acadÃ©mico. 
*   **Foco en Material PÃºblico y Vital:** ReestructuraciÃ³n de la base de conocimiento para priorizar **GPC (GuÃ­as de PrÃ¡ctica ClÃ­nica), NTS (Normas TÃ©cnicas Sanitarias)** de MINSA/EsSalud, Regulaciones Legales y Bancos de preguntas oficiales (ENAM, Residentado, SERUMS), ofreciendo un ecosistema blindado a reclamos de terceros.
*   **GamificaciÃ³n Formativa:** PotenciaciÃ³n del esfuerzo mental mediante un entorno que obliga a interactuar y competir en lugar de consumir pasivamente la lectura.

---

## 5. Roadmap & Mejoras Futuras

### 5.1. Modo Voz (Speech-to-Text / TTS)
Implementar interacciÃ³n directa conversando con el tutor usando WebRTC o un wrapper para reconocimiento.

### 5.2. App MÃ³vil Nativa
Wrapper en React Native o Flutter para potenciar notificaciones push de repaso espaciado.

---

## 6. ðŸ“‚ Estructura de Carpetas Detallada

```path
chatbot-tutor-uc/
â”œâ”€â”€ application/            # LÃ³gica de aplicaciÃ³n
â”‚   â””â”€â”€ controllers/        # Controladores (Chat, Auth, Content)
â”œâ”€â”€ domain/                 # Reglas de negocio
â”‚   â”œâ”€â”€ services/           # LÃ³gica compleja (Gemini, Gamification)
â”‚   â””â”€â”€ models/             # Definiciones de tipos/entidades
â”œâ”€â”€ infrastructure/         # ImplementaciÃ³n tÃ©cnica
â”‚   â”œâ”€â”€ database/           # Clientes DB (Supabase)
â”‚   â”œâ”€â”€ repositories/       # Acceso a datos (SQL queries)
â”‚   â””â”€â”€ routes/             # DefiniciÃ³n de endpoints API
â”œâ”€â”€ presentation/           # Frontend PÃºblico
â”‚   â”œâ”€â”€ public/
â”‚   â”‚   â”œâ”€â”€ css/            # Estilos modulares (Glassmorphism)
â”‚   â”‚   â”œâ”€â”€ js/             # LÃ³gica UI (Modules, Services)
â”‚   â”‚   â””â”€â”€ assets/         # ImÃ¡genes y recursos estÃ¡ticos
â”œâ”€â”€ ml_service/             # Microservicio Python
â”‚   â”œâ”€â”€ predictors/         # Modelos de ML
â”‚   â””â”€â”€ app.py              # API Flask/FastAPI para ML
â””â”€â”€ tests/                  # Pruebas automatizadas
```

---

## 6. âš™ï¸ GuÃ­a de InstalaciÃ³n y Despliegue

### Requisitos Previos
*   Node.js v16+
*   Python 3.8+
*   Cuenta Google Cloud (Vertex AI)
*   Instancia Supabase

### Pasos de InstalaciÃ³n

1.  **Clonar Repositorio:**
    ```bash
    git clone https://github.com/tu-org/chatbot-tutor-uc.git
    cd chatbot-tutor-uc
    ```

2.  **Backend (Node.js):**
    ```bash
    npm install
    # Configurar .env con credenciales
    npm run dev
    # El servidor verificarÃ¡ automÃ¡ticamente extensiones de PostgreSQL (unaccent, fuzzystrmatch).
    ```

    # NOTA: Este servicio estÃ¡ marcado como DEPRECATED en la arquitectura actual.
    # La lÃ³gica de ML reside ahora en `application/domain/services/mlService.js`.
    # Solo necesario si se requiere ejecutar scripts de mantenimiento antiguos.
    ```

---

## 7. ðŸŒ Infraestructura de Dominios y Correo

### 7.1. Dominios (Namecheap)
*   **Principal:** `hubacademia.com` (Adquirido y configurado).
*   **Subdominios:** Apuntan a los servicios desplegados en Vercel/Render.

### 7.2. Servicio de Email (Resend)
*   **Proveedor:** Se utiliza **Resend** como API transaccional para el envÃ­o de correos.
*   **Flujos:**
    1.  **VerificaciÃ³n de Cuenta:** Para usuarios generales (`@gmail.com`, `@hotmail.com`, etc.).
    2.  **RecuperaciÃ³n de ContraseÃ±a:** EnvÃ­o de enlaces seguros con tokens temporales.
*   **Estrategia "Dominio Ficticio" (@hubacademia.com):**
    *   Para facilitar el *onboarding* inmediato en entornos institucionales o de prueba, se implementÃ³ una lÃ³gica de **Auto-VerificaciÃ³n**.
    *   Cualquier registro bajo el dominio `@hubacademia.com` omite el envÃ­o de correo por Resend y activa la cuenta instantÃ¡neamente mediante la Admin API de Supabase. Esto permite el acceso directo a funcionalidades sin fricciÃ³n.

---

## 8. ðŸ”® PrÃ³ximos Pasos (Roadmap)

*   [ ] **Modo Voz:** ImplementaciÃ³n de STT/TTS para interactuar hablando con el tutor.
*   [ ] **App MÃ³vil Nativa:** Wrapper en React Native o Flutter.
*   [ ] **Grupos de Estudio:** Funcionalidad social para compartir resÃºmenes.

---

**Autor:** Equipo de Desarrollo Hub Academia  
**Estado:** ProducciÃ³n (MVP Avanzado) - Despliegue en Render/Vercel Activo.

---

## 9. ðŸ›¡ï¸ Seguridad y ProtecciÃ³n de Datos

La seguridad ha sido una prioridad desde el diseÃ±o inicial ("Security by Design"). A continuaciÃ³n, se detallan las medidas implementadas para proteger la integridad del sistema y los datos de los usuarios.

### 8.1. AutenticaciÃ³n y GestiÃ³n de Identidad (Google-Only v2.0)
*   **Proveedor Ãšnico:** Se utiliza **Google como Ãºnico proveedor de identidad**, eliminando formularios de registro/login con contraseÃ±a. Esto simplifica la UX y delega la seguridad de credenciales a Google.
*   **Supabase Auth:** Se utiliza como capa de gestiÃ³n de sesiones (JWT), integrado con Google OAuth 2.0.
*   **Flujo Dual de AutenticaciÃ³n:**
    *   **Google One Tap (index.html):** Login instantÃ¡neo desde la pÃ¡gina principal via `signInWithIdToken`. Requiere "Skip nonce checks" en Supabase para compatibilidad con Chrome 145+ (FedCM).
    *   **OAuth Redirect (login.html / Modal):** Flujo completo de Google OAuth via `signInWithOAuth` como mÃ©todo alternativo y fallback.
*   **Flag Anti-Cascada (`window._isAuthenticating`):** Previene que el listener `onAuthStateChange` de Supabase dispare modales de UI (paywall, bienvenida) mientras una autenticaciÃ³n estÃ¡ en progreso.
*   **Roles y Permisos:** Sistema RBAC con roles `student` y `admin`. Los administradores se asignan via lista blanca (`adminEmails` en `authService.js`).
*   **Archivos Eliminados (MigraciÃ³n Google-Only):** `register.html`, `change-password.html`, `update-password.html`, `verification-status.html` y sus CSS/JS asociados fueron eliminados por obsolescencia.

### 8.2. ProtecciÃ³n de Base de Datos
*   **PrevenciÃ³n de SQL Injection:** Uso estricto de **Consultas Parametrizadas** en todas las interacciones con PostgreSQL (driver `pg`). Nunca se concatenan cadenas directamente en las consultas SQL.
*   **Integridad Referencial:** Uso de claves forÃ¡neas con `ON DELETE CASCADE` para asegurar que al eliminar un usuario, se eliminen recursivamente todos sds datos asociados (historial, favoritos, notas) sin dejar registros huÃ©rfanos.
*   **Aislamiento:** La base de datos opera bajo una VPC virtual (en producciÃ³n) con acceso restringido solo al backend mediante variables de entorno seguras.

### 8.3. Seguridad en el Frontend
*   **SanitizaciÃ³n:** Limpieza de inputs en formularios para prevenir XSS (Cross-Site Scripting).
*   **Manejo de Errores:** Los mensajes de error expuestos al usuario son genÃ©ricos ("Credenciales invÃ¡lidas") para no revelar si un correo existe o no (Enumeration Attacks), mientras que los logs internos mantienen detalle completo para debugging.

### 8.4. Hardening y AuditorÃ­a
*   **ProtecciÃ³n de Consola:** En entornos de producciÃ³n, se deshabilitan automÃ¡ticamente los logs de consola (`console.log`, `debug`, `info`) para prevenir la fuga de informaciÃ³n tÃ©cnica o de arquitectura a travÃ©s de las herramientas de desarrollador del navegador.
*   **AuditorÃ­a de InyecciÃ³n SQL:** Se verificÃ³ exhaustivamente el uso de consultas parametrizadas en todos los repositorios crÃ­ticos (`userRepository`, `authService`), confirmando la inmunidad contra ataques de inyecciÃ³n SQL estÃ¡ndar.
*   **ValidaciÃ³n de Identidad:** La eliminaciÃ³n de cuentas y operaciones sensibles estÃ¡n protegidas contra *ID Spoofing* al confiar Ãºnicamente en el `sub` (Subject ID) del token JWT verificado, ignorando cualquier manipulacion del cuerpo de la peticiÃ³n.
*   **Resiliencia de Backend (Retry Pattern):** Se implementÃ³ un mecanismo de reintento automÃ¡tico en `authMiddleware.js` para manejar errores de red transitorios (`ECONNRESET`, `ETIMEDOUT`) contra Supabase. Esto asegura una alta disponibilidad incluso ante microcortes de conexiÃ³n, reintentando la validaciÃ³n del token hasta 3 veces antes de fallar.
*   **Extensiones de Base de Datos:** Se habilitaron `unaccent` (para bÃºsquedas insensibles a tildes) y `fuzzystrmatch` (para algoritmo Levenshtein) en PostgreSQL para robustecer la bÃºsqueda y evitar errores por typos.

### 8.5. Resiliencia Global y Offline UX (HubPro Resilience Framework) ðŸ›¡ï¸
En la versiÃ³n 3.0, hemos implementado una capa transversal de resiliencia diseÃ±ada para mitigar el impacto de microcortes de red y cortes prolongados de internet, garantizando que el flujo de aprendizaje nunca se detenga.

1.  **Monitor Visual de Conectividad (Status Pill):** InyecciÃ³n de un componente dinÃ¡mico en el Header que informa al usuario en tiempo real sobre su estado de conexiÃ³n. Opera de forma silenciosa e informativa.
2.  **Persistencia de Estado Local (ExÃ¡menes de 100q):** Los simuladores mÃ©dicos ahora guardan cada respuesta en `localStorage` al instante. El sistema es inmune a recargas (F5), cierres de pestaÃ±a o cortes de luz; al volver a entrar, el progreso se restaura Ã­ntegramente.
3.  **Utilidad safeFetch (Exponential Backoff):** Reemplazo de peticiones estÃ¡ndar por un motor de reintentos inteligente. Si una peticiÃ³n falla por fallo de red, el sistema reintenta automÃ¡ticamente a los 1s, 2s y 4s, sincronizando los datos en cuanto la red es estable.
4.  **Sync Queue (Modo Offline en Flashcards):** El mÃ³dulo de repaso permite calificar tarjetas sin internet. Las decisiones de estudio se encolan y se suben al servidor asincrÃ³nicamente mediante `safeFetch`.
5.  **Manejo Resiliente en Backend:** Softening de logs para errores de DNS/Pooler (`ENOTFOUND`), transformando logs ruidosos en advertencias Ãºtiles para evitar clutter en la terminal de producciÃ³n.
6.  **Estabilidad UX (Pulse & Sync):** Se corrigiÃ³ el estado de 'falso negativo' del monitor de conexiÃ³n mediante la sincronizaciÃ³n del constructor de `UIManager` con `navigator.onLine`. Se resolvieron interferencias visuales aplicando `components.css` y se eliminÃ³ la necesidad de doble clic en flashcards mediante un bloqueo semafÃ³rico de interactividad durante la sincronizaciÃ³n.

---

---

## 10. ðŸ‘¤ Ciclo de Vida del Usuario y Suscripciones

El sistema maneja diferentes estados de usuario para ofrecer una experiencia escalonada y monetizable.

### 9.1. Visitante (No Registrado)
*   **Acceso:** Limitado a la _Landing Page_, informaciÃ³n institucional y vista previa de precios.
*   **Restricciones:** Bloqueo total al Chatbot, Biblioteca y Quiz Arena.
*   **ConversiÃ³n:** Se incentiva el registro mediante **Google One Tap** (modal automÃ¡tico) y botÃ³n **"Acceder"** en el header (abre modal de login con OAuth).

### 10.1. Usuario Free (Registrado via Google)
    *   **Registro Seamless (Sin FricciÃ³n):** Un clic en Google One Tap o "Continuar con Google" crea la cuenta automÃ¡ticamente. No hay formularios de registro.
    *   **SincronizaciÃ³n AutomÃ¡tica:** Al iniciar sesiÃ³n, el sistema sincroniza nombre, email y avatar desde Google al backend (`AuthApiService.syncGoogleUser`).
*   **LÃ­mites (VersiÃ³n 2.0):**
    *   **Consultas al Tutor:** Limitadas a **3 interacciones diarias**.
    *   **Quiz Arena:** Hasta **3 partidas diarias**.
    *   **Flashcards:** LÃ­mite de **1 bloque de generaciÃ³n (5 tarjetas)** al mes.
*   **InteracciÃ³n:** Al alcanzar el lÃ­mite, se muestra un *Paywall Modal* ("Soft Block") invitando a suscribirse. El control de este bloqueo se realiza tanto en frontend (`chat.js`) como en backend (`checkLimitsMiddleware.js`).

### 10.2. Usuario Premium (Basic y Advanced)
El sistema ofrece dos niveles de pago procesados por MercadoPago, con beneficios escalonados:

| CaracterÃ­stica | **Plan BÃ¡sico (Entry)** | **Plan Avanzado (Pro/Premium)** |
| :--- | :--- | :--- |
| **Costo / DuraciÃ³n** | S/ 9.90 (2 Meses) | S/ 24.90 (6 Meses) |
| **Tutor IA (Chat)** | EstÃ¡ndar (15 mensajes/dÃ­a) | Pro con Biblioteca MÃ©dica RAG (50 mensajes/dÃ­a) |
| **Quiz Arena (IA)** | 5 partidas/dÃ­a | 10 partidas/dÃ­a |
| **AnalÃ­tica de Patrones** | EstÃ¡tico (Sin IA) | DiagnÃ³stico ClÃ­nico IA (Consume chat_standard) |
| **Flashcards (IA)** | 10 intentos / mes | 30 intentos / mes |
| **Simulador MÃ©dico** | Banco Local (ILIMITADO) | Banco Local + GeneraciÃ³n RAG (ILIMITADO) |

*   **ConversiÃ³n:** Se activa mediante Webhook de MercadoPago. El servidor actualiza `subscription_tier` ('basic' o 'advanced') y establece `subscription_expires_at = NOW() + INTERVAL 'X months'`.
*   **Reseteo HÃ­brido:** Al activarse un plan, todos los contadores de uso se reinician a cero para garantizar el acceso inmediato.

### 10.3. Arquitectura TÃ©cnica de Cuotas (Middleware Cerbero)
La protecciÃ³n de rentabilidad del sistema se basa en un guardiÃ¡n central: `checkLimitsMiddleware.js`.

1.  **ValidaciÃ³n en Cascada:**
    *   **Vencimiento:** Compara `Date.now() > subscription_expires_at`. Si venciÃ³, rebaja automÃ¡ticamente al usuario a `'free'`.
    *   **Ciclo de DÃ­a:** Utiliza `last_usage_reset` para determinar si es un nuevo dÃ­a y resetear contadores diarios (`daily_ai_usage`, `daily_arena_usage`).
    *   **Ciclo de Mes:** Resetea los consumos mensuales (`monthly_flashcards_usage`) cuando cambia el mes calendario o se renueva la suscripciÃ³n.
2.  **UnificaciÃ³n de Inteligencia (Costo Cero):** El sistema RAG ahora opera de forma 100% local en base de datos. En vez de bloquear a los usuarios con lÃ­mites arbitrarios mensuales, los usuarios del Plan Avanzado pueden invocar a la IA ClÃ­nica con RAG la cantidad de veces que deseen dentro de su tope masivo de 50 chats al dÃ­a.
3.  **ProtecciÃ³n de Base de Datos:** Las peticiones al simulador que requieren RAG (IA generadora) estÃ¡n restringidas en el backend para usuarios de Plan BÃ¡sico, obligando al sistema a servir Ãºnicamente desde el `question_bank` estÃ¡tico, asegurando un margen de utilidad gigantesco.

---

## 11. âš ï¸ Notas de Despliegue CrÃ­ticas

### 11.1. Variables de Entorno y Secret Files (Render / ProducciÃ³n)
Para garantizar la operatividad de los servicios de IA (Gemini), Almacenamiento (GCS), Pagos (Mercado Pago) y Base de Datos (Supabase), se han configurado las siguientes variables en el entorno de producciÃ³n segÃºn las capturas de auditorÃ­a:

| Variable | DescripciÃ³n |
| :--- | :--- |
| `APP_URL` | URL base de la aplicaciÃ³n (ej: `https://hubacademia.com`). |
| `GCS_BUCKET_NAME` | Nombre del cubo en Google Cloud Storage para imÃ¡genes mÃ©dicas. |
| `GEMINI_API_KEY` | Llave de acceso a la API de Vertex AI / Gemini 2.5. |
| `GOOGLE_APPLICATION_CREDENTIALS` | Ruta absoluta al archivo de credenciales (`/etc/secrets/service-account-key.json`). |
| `GOOGLE_CLOUD_LOCATION` | RegiÃ³n del proyecto en Google Cloud (ej: `us-central1`). |
| `GOOGLE_CLOUD_PROJECT` | ID del proyecto en Google Cloud Console. |
| `JWT_SECRET` | Firma secreta para la validaciÃ³n de tokens de sesiÃ³n. |
| `MP_ACCESS_TOKEN` | Token de acceso para la API de Mercado Pago. |
| `NODE_DATABASE_URL` | String de conexiÃ³n directa a PostgreSQL (Supabase). |
| `PORT` | Puerto de escucha del servidor (generalmente `10000` en Render). |
| `SUPABASE_KEY` | Public Anon Key de Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Key (Bypass RLS) para tareas administrativas. |
| `SUPABASE_URL` | URL del endpoint de Supabase. |

#### ConfiguraciÃ³n de Secret Files (Render)
El archivo `service-account-key.json` (que contiene las llaves de la Service Account de Google) **NO** se incluye en el repositorio de GitHub por seguridad. En su lugar, se gestiona mediante el mÃ³dulo de **Secret Files** de Render:
*   **Nombre del Archivo:** `service-account-key.json`
*   **Acceso:** Montado automÃ¡ticamente por Render en el directorio raÃ­z o en `/etc/secrets/` segun configuraciÃ³n. La variable `GOOGLE_APPLICATION_CREDENTIALS` debe apuntar a la ruta correcta para que las librerÃ­as de Google realicen la autenticaciÃ³n automÃ¡tica.

### 10.2. EliminaciÃ³n de Cuenta (Danger Zone)
Esta funcionalidad es irreversible y desencadena una limpieza en cascada:
1.  **Doble VerificaciÃ³n:** El usuario debe reingresar su contraseÃ±a actual.
2.  **ValidaciÃ³n Auth:** Se verifica la identidad contra Supabase Auth.
3.  **Borrado Admin:** Se utiliza la `SUPABASE_SERVICE_ROLE_KEY` para eliminar el usuario del proveedor de identidad.
4.  **Limpieza DB:** Gracias a `ON DELETE CASCADE` en PostgreSQL, se eliminan automÃ¡ticamente todos los registros dependientes (chats, favoritos, historial).

#### 11.2. Arquitectura Multi-Cloud y Proxy (Vercel -> Render)
El proyecto utiliza una arquitectura distribuida para maximizar la velocidad de carga y estabilidad:
*   **Vercel (Frontend):** Procesa el dominio `hubacademia.com` y sirve HTML/CSS/JS.
*   **Render (Backend):** Aloja el servidor Node.js en `https://tutor-ia-backend.onrender.com`.

**ConfiguraciÃ³n de Rewrites (vercel.json):**
Para que las llamadas a `/api/*` lleguen correctamente al backend, se utiliza una regla de **Rewrite** con la sintaxis de comodines de Vercel. 
> [!IMPORTANT]
> La regla `/api/:path*` debe ser la **primera** en el array de `rewrites`. Esta sintaxis garantiza que tanto la ruta como los parÃ¡metros de consulta (`?fileId=...`) se transfieran Ã­ntegramente de Vercel a Render.

---

## 11.3 Persistencia de Miniaturas (Drive -> GCS)
Para garantizar una carga instantÃ¡nea y eliminar la fragilidad del proxy de Vercel, el sistema utiliza un flujo de **Almacenamiento Persistente Optimizado**.

**Flujo de Trabajo de Ã‰lite:**
1.  **Escaneo:** El administrador sincroniza carpetas desde el Panel.
2.  **Descarga Cruda:** Render descarga la miniatura de Drive en alta resoluciÃ³n (`s800`).
3.  **OptimizaciÃ³n WebP (Sharp):** El sistema convierte la imagen al formato WebP de Google, reduciendo el peso en ~70% sin pÃ©rdida visual perceptible.
4.  **CachÃ© Agresivo (Cache-Control):** Al subir a GCS, se inyecta la cabecera `public, max-age=31536000` (1 aÃ±o).
5.  **Entrega Directa:** Los alumnos descargan la imagen desde una URL estÃ¡tica de GCS.

**Impacto en la Experiencia de Usuario (UX):**
-   **Velocidad de Carga:** Tras la primera visita, las imÃ¡genes se recuperan de la **Memoria Local/CachÃ©** del dispositivo del alumno (celular o PC) en milisegundos.
-   **Ahorro de Datos:** La optimizaciÃ³n WebP reduce significativamente el consumo de datos mÃ³viles para los estudiantes.
-   **Resiliencia:** El sistema es inmune a caÃ­das temporales de la API de Drive o problemas de red en proxies intermedios.

---

## 12. ðŸ—‘ï¸ GuÃ­a de Funcionalidad: EliminaciÃ³n de Cuenta

Esta secciÃ³n detalla el flujo de eliminaciÃ³n de cuenta ("Danger Zone"), diseÃ±ado para ser seguro, irreversible y adaptativo segÃºn el mÃ©todo de autenticaciÃ³n del usuario.

### 12.1. VisiÃ³n General
La funcionalidad permite a cualquier usuario registrado eliminar permanentemente su cuenta y todos los datos asociados (historial de chats, progreso, suscripciÃ³n) de la plataforma.
*   **UbicaciÃ³n:** Perfil de Usuario (`/profile`) -> Tarjeta "Zona de Peligro".
*   **Consecuencia:** EliminaciÃ³n fÃ­sica de datos en PostgreSQL y baja en Supabase Auth (`Hard Delete`).

### 12.2. Flujo A: Usuarios con Correo y ContraseÃ±a
Para usuarios que se registraron manualmente usando email/password.
1.  **Solicitud:** El usuario hace clic en "Eliminar Cuenta".
2.  **VerificaciÃ³n:** Aparece un modal solicitando la **contraseÃ±a actual**.
3.  **ValidaciÃ³n Backend:**
    *   Se envÃ­a la contraseÃ±a al endpoint `/api/auth/delete-account`.
    *   El backend verifica la contraseÃ±a re-autenticando con Supabase (`signInWithPassword`).
    *   Si es correcta, procede con la eliminaciÃ³n.
4.  **Limpieza:** Se fuerza el cierre de sesiÃ³n (`signOut`) y limpieza de almacenamiento local.

### 12.3. Flujo B: Usuarios OAuth (Google)
Para usuarios que inician sesiÃ³n con Google, quienes **no tienen** una contraseÃ±a establecida en la plataforma.
1.  **DetecciÃ³n:** El frontend detecta automÃ¡ticamente si el usuario es de tipo OAuth (Provider: `google`).
2.  **VerificaciÃ³n Adaptativa:**
    *   En lugar de pedir contraseÃ±a (que no tienen), el modal solicita una **ConfirmaciÃ³n Textual**.
    *   **InstrucciÃ³n:** "Escribe 'ELIMINAR' para confirmar".
3.  **ValidaciÃ³n Backend:**
    *   El servicio `authService.js` verifica en Supabase (vÃ­a Admin API) que el usuario efectivamente provenga de Google.
    *   Si el proveedor es correcto, se omite el chequeo de contraseÃ±a ("bypass") y se autoriza la eliminaciÃ³n.
4.  **Seguridad:** Este flujo impide que un usuario de email intente borrar su cuenta sin contraseÃ±a fingiendo ser de Google, ya que la validaciÃ³n del proveedor es del lado del servidor (Source of Truth).

### 12.4. PrevenciÃ³n de "Cuentas Zombie"
Se implementÃ³ un mecanismo de cierre de sesiÃ³n atÃ³mico (`Async Logout`) para evitar que una cuenta reciÃ©n borrada se regenere automÃ¡ticamente:
*   Al confirmar el borrado, el sistema **espera** (`await`) a que la sesiÃ³n en la nube se destruya completamente.
*   Posteriormente, elimina agresivamente el `authToken` local.
*   Finalmente, redirige a la pÃ¡gina de inicio como usuario anÃ³nimo.

---

## 13. ðŸ“‰ AnÃ¡lisis de Rendimiento y DiagnÃ³stico de Latencia

Este apartado documenta las causas externas identificadas que afectan la percepciÃ³n de carga ("Infinite Loading") y la visualizaciÃ³n de activos en el entorno de producciÃ³n (Split Deployment: Vercel + Render).

### 13.1. Factor CrÃ­tico: "Cold Start" en Render (Backend)
*   **DescripciÃ³n:** El servicio gratuito de Render entra en suspensiÃ³n tras 15 minutos de inactividad.
*   **Impacto:** La primera "llamada" para despertar al servidor tarda entre **50 a 90 segundos**.
*   ** SÃ­ntoma en Frontend:** El usuario ve la estructura estÃ¡tica (HTML/CSS servido por Vercel) inmediatamente, pero los datos dinÃ¡micos (lista de libros, cursos) dejan el spinner de carga activo indefinidamente ("Cargando...").
*   **Causa del "Cuelgue":** Si el frontend lanza mÃºltiples peticiones simultÃ¡neas (`Promise.all` con `/api/books`, `/api/courses`, `/api/careers`) *mientras* el servidor despierta, puede saturar la instancia mÃ­nima (0.5 CPU), provocando un *timeout* o reinicio del proceso antes de responder.

### 13.2. Latencia de Red y LÃ­mites del Navegador
*   **LÃ­mite de Conexiones:** Los navegadores (Chrome/Edge) limitan a **6 conexiones simultÃ¡neas** por dominio (HTTP/1.1).
*   **Cuello de Botella:** Al recibir la lista de 50+ libros del backend, el navegador intenta descargar 50 imÃ¡genes de `hubacademia.vercel.app` al mismo tiempo. Esto crea una cola de espera (Waterfall), haciendo que las Ãºltimas imÃ¡genes tarden mucho en aparecer, simulando una "carga infinita".

### 13.3. Inconsistencia de Rutas EstÃ¡ticas (Vercel - GitHub)
*   **Case Sensitivity:** Vercel (Linux) distingue mayÃºsculas/minÃºsculas, mientras que Windows (Desarrollo local) no.
    *   *Ejemplo:* Si la BD dice `assets/Libro1.JPG` pero en GitHub el archivo es `assets/libro1.jpg`, en local funciona, pero en Vercel devolverÃ¡ **404 Not Found**.
*   **SincronizaciÃ³n:** Si se aÃ±aden registros a la Base de Datos (Backend) pero no se suben las imÃ¡genes correspondientes a la carpeta `public/assets` del repositorio GitHub, Vercel no tendrÃ¡ quÃ© servir.

### 13.4. Agotamiento de Conexiones a Base de Datos
*   **Pool Limit:** Supabase (Capa Gratuita) tiene un lÃ­mite estricto de conexiones concurrentes.
*   **Riesgo:** Si el backend abre una conexiÃ³n nueva por cada peticiÃ³n de la API sin reutilizarlas (Singleton Pattern), el pool se llena rÃ¡pidamente durante el "despertar" del servidor, haciendo que las siguientes consultas queden en espera indefinida (*hanging*), resultando en una pÃ¡gina que nunca termina de cargar los datos.

---

## 14. âš™ï¸ Flujo Avanzado: Simulacros Personalizados (Examen, Dificultad y Ãreas)

El sistema de Simulador MÃ©dico permite a los usuarios crear exÃ¡menes altamente granulares, combinando el Examen Objetivo (Ej. ENAM, SERUMS), la Dificultad tÃ©cnica, y mÃºltiples Ãreas de Estudio simultÃ¡neas. Este es el flujo completo de datos desde la UI hasta las analÃ­ticas:

### 14.1. ConfiguraciÃ³n Frontend y Persistencia
*   **SelecciÃ³n:** A travÃ©s del Modal de ConfiguraciÃ³n en el Dashboard, el usuario elige:
    *   `target`: ENAM, SERUMS, o ENARM.
    *   `difficulty`: BÃ¡sico (teÃ³rico), Intermedio (casos clÃ­nicos), o Avanzado (complejo).
    *   `areas`: Un arreglo dinÃ¡mico de especialidades (ej: `['CardiologÃ­a', 'PediatrÃ­a', 'Salud PÃºblica']`).
*   **Persistencia:** La configuraciÃ³n se almacena en `localStorage` (como `simActiveConfig`) para sobrevivir navegaciones o recargas de pÃ¡gina, garantizando que el usuario no pierda sus filtros al iniciar un "Simulacro RÃ¡pido" o "Modo Estudio".
*   **EnvÃ­o:** Al iniciar el examen, estos parÃ¡metros se envÃ­an mediante un POST al endpoint `/api/quiz/start`.

### 14.2. Procesamiento Backend e HÃ­brido Artificial (IA)
El `quizController` recibe los parÃ¡metros y delega la tarea al `TrainingService`.
1.  **Consulta a Base de Datos (Prioridad #1):** El sistema intenta primero extraer preguntas del `question_bank` que coincidan exactamente con el `target`, la `difficulty` y *cualquiera* de las `areas` solicitadas (`topic = ANY($1::text[])`).
2.  **Fallback a Vertex AI (Prioridad #2):** Si el banco local no tiene suficientes preguntas inÃ©ditas (excluyendo las ya vistas por el usuario), entra en acciÃ³n el motor LLM (Gemini 2.5 Flash).
3.  **Prompt Condicional DinÃ¡mico:**
    *   **Contexto RAG:** La IA utiliza BÃºsqueda Vectorial para inyectar guÃ­as clÃ­nicas reales basÃ¡ndose en el "Target" (ej: Normas del MINSA para SERUMS) y en la lista de Ã¡reas combinadas.
    *   **Especificidad del Target (ExÃ¡menes MÃ©dicos):**
        *   **ENAM (Examen Nacional de Medicina):** AvalÃºa el conocimiento clÃ­nico teÃ³rico general de un interno. Se prohÃ­be explÃ­citamente a la IA incluir preguntas sobre flujogramas puramente administrativos o aspectos especÃ­ficos de las Normas TÃ©cnicas de Salud (NTS). Enfoque en diagnÃ³stico clÃ¡sico y clÃ­nica.
        *   **SERUMS (Servicio Rural):** Enfocado enteramente en el trabajo de primer nivel de atenciÃ³n (Puesto y Centro de Salud), requiriendo un enfoque 100% en las Normas TÃ©cnicas de Salud (NTS) vigentes del MINSA y programas de salud pÃºblica peruanos.
        *   **ENARM (Residentado MÃ©dico):** Examen para futuros especialistas. Obliga a la IA a proveer casos clÃ­nicos complejos, manejo de excepciones, tratamientos de segunda lÃ­nea y uso de "Gold Standards" diagnÃ³sticos.
    *   **Dificultad Estricta:** El prompt varÃ­a drÃ¡sticamente. Si el usuario elige "BÃ¡sico", se prohÃ­be la redacciÃ³n de viÃ±etas o casos clÃ­nicos largos, forzando preguntas de opciones directas, conceptos y etiologÃ­as. Para "Intermedio/Avanzado", se fuerza el uso de casos clÃ­nicos progresivamente mÃ¡s complejos.
    *   **Etiquetado Exacto:** Se le exige a la IA que retorne, como parte del JSON de cada pregunta generada, el sub-atributo `"topic"` indicando a cuÃ¡l de las Ã¡reas seleccionadas corresponde la pregunta inventada.

### 14.3. Persistencia de Resultados y AnalÃ­ticas Sensibles al Contexto (AuditorÃ­a de Integridad)

El sistema garantiza que cada respuesta se asigne a su especialidad real, resolviendo el "Fallo de la Primera Ãrea" mediante un pipeline de datos blindado:

1.  **Integridad en el Origen (Repository Level):** Se auditÃ³ que las funciones `findQuestionsInBank` y `findQuestionsInBankBatch` en `TrainingRepository.js` recuperaban el tema de la BD pero lo omitÃ­an en el mapeo hacia el objeto JSON. Se corrigiÃ³ esto para asegurar que el campo `topic` viaje siempre desde PostgreSQL hasta el Frontend.
2.  **SanitizaciÃ³n Inteligente (Service Level):** En `TrainingService.js`, la funciÃ³n `submitQuizResult` fue refactorizada para:
    *   **Respeto a la Especialidad:** Si la pregunta trae un tema especÃ­fico (ej. "NeurologÃ­a"), este se preserva intacto.
    *   **Tratamiento de GenÃ©ricos:** Solo si el tema es genÃ©rico ("MEDICINA", "General") o estÃ¡ vacÃ­o, el sistema lo mapea inteligente al primer Ã¡rea seleccionada por el usuario para evitar inconsistencias.
    *   **NormalizaciÃ³n:** Limpia temas combinados (ej. "PediatrÃ­a, NeonatologÃ­a" -> "PediatrÃ­a") para mantener el Radar Chart limpio.
3.  **Trazabilidad en Flashcards:** El repositorio ahora utiliza el `q.topic` individual de cada error para crear tarjetas, permitiendo que el mazo de "Repaso MÃ©dico" se categorice por sub-especialidades reales y no por el tÃ­tulo global del examen.
*   **Etiquetado del Examen Padre:** Para no contaminar el historial del usuario (`quiz_history`) con el nombre de una sola especialidad cuando se abarcan varias, el frontend evalÃºa la longitud del arreglo de Ã¡reas seleccionadas (`state.areas.length`). Si es mayor a 1, la "carÃ¡tula" del examen se grabarÃ¡ permanentemente en base de datos como **"Multi-Ãrea"**.
*   **Columna JSONB `area_stats`:** En la tabla `quiz_history`, se crea de manera dinÃ¡mica un objeto JSON que agrupa aciertos y errores por especialidad. Por ejemplo:
    ```json
    {
      "CardiologÃ­a": { "correct": 4, "total": 5 },
      "PediatrÃ­a": { "correct": 2, "total": 5 }
    }
    ```
*   **DesagregaciÃ³n Lateral en PostgreSQL:** Para leer este JSONB de cara al Dashboard, se utiliza la funciÃ³n `jsonb_each()` de manera lateral en el bloque `FROM` (`FROM quiz_history, jsonb_each(area_stats)`). Esto descompone la matriz JSON limpiamente, permitiendo sumar aciertos globales por materia mediante funciones agregadas `SUM()`. (Nota: utilizar `jsonb_object_keys()` directamente dentro de `SUM()` arroja un fatal error SQL al ser una *set-returning function*).
*   **VisualizaciÃ³n en UX (Bar Chart):** El endpoint `/api/quiz/stats` extrae las llaves de este JSONB, suma los valores y calcula la PrecisiÃ³n (Accuracy %). Estos datos se envÃ­an de vuelta al Frontend, alimentando el **GrÃ¡fico de Barras Horizontales (Dominio por Ãreas)**. AsÃ­, el estudiante diagnostica visualmente quÃ© especialidad exacta dentro de su mix de estudio estÃ¡ fallando mÃ¡s y dÃ³nde sus fortalezas son sÃ³lidas.

### 14.4. AnÃ¡lisis de Patrones de Error e Inteligencia Artificial
Como capa final del dashboard, se cuenta con una herramienta de **DiagnÃ³stico de Rendimiento por IA**:
*   **Funcionamiento:** Tras completar varios simulacros, el sistema acumula los KPIs (incluyendo las Ã¡reas mÃ¡s fuertes y mÃ¡s dÃ©biles detectadas en el JSONB).
*   **Motor de Insights:** Al hacer clic en "Generar AnÃ¡lisis", la plataforma procesa estas estadÃ­sticas cacheadas en `simulator-dash.js`.
*   **Resultados Visibles:** Emite recomendaciones naturalizadas (UX Conversacional) resaltando:
    *   *Puntos Fuertes:* Reconoce el Ã¡rea con mayor dominio (ej. `strongest_topic`) para mantener la motivaciÃ³n.
    *   *Ãreas de Mejora:* Identifica el cuello de botella tÃ©cnico (ej. `weakest_topic`) y aconseja enfocar las siguientes rondas de estudio y configuraciÃ³n de simulacros en dicha especialidad mÃ©dica para nivelar el GrÃ¡fico Radial.

---

## 15. ðŸ›ï¸ Arquitectura del Ecosistema de Simulacros

Para ofrecer versatilidad extrema al proceso de estudio, la plataforma divide el flujo del motor de preguntas en tres **Modos de Examen** distintos, cada uno con reglas de negocio asimÃ©tricas para la interfaz (UX) y el procesamiento en la Base de Datos.

### 15.1. Tipos de Examen y Modos de EjecuciÃ³n

1.  **Simulacro RÃ¡pido (Fast Mode)**
    *   **PropÃ³sito:** Repasos de micro-momentos (microlearning) en transporte pÃºblico o salas de espera.
    *   **Volumen:** Fijo a 10 preguntas.
    *   **UX del Feedback:** Interfaz amigable. Tras presionar una alternativa, el sistema revela instantÃ¡neamente si es correcta (verde) o incorrecta (roja), y despliega una tarjeta de justificaciÃ³n mÃ©dica inferior.
    *   **MÃ©tricas:** Sus resultados nutren de forma ligera a las estadÃ­sticas agregadas sin desbalancear la retenciÃ³n profunda.

2.  **Modo Estudio (Study Mode)**
    *   **PropÃ³sito:** Anclaje de conocimiento a mediano plazo y estudio focalizado.
    *   **Volumen:** Configurable (10, 20 o 50 preguntas).
    *   **UX del Feedback:** IdÃ©ntico al Simulacro RÃ¡pido (revelaciÃ³n inmediata + justificaciÃ³n clÃ­nica). El estudiante toma su tiempo para leer las explicaciones largas generadas por la IA despuÃ©s de cada decisiÃ³n.
    *   **CronÃ³metro:** Relajado / Invisible, priorizando precisiÃ³n sobre velocidad.

3.  **Simulacro Real (Real Mock - Examen Oficial)**
    *   **PropÃ³sito:** Simulador de presiÃ³n extrema para certificar viabilidad de aprobaciÃ³n en ENAM/SERUMS/ENARM.
    *   **Volumen:** Obligatoriamente anclado a 100 preguntas.
    *   **CronÃ³metro:** Temporizador de Barra Superior rÃ­gido de 120 minutos (7200 segundos). Al llegar a `00:00`, intercepta al usuario arrebatÃ¡ndole el control y forzando la evaluaciÃ³n.

### 15.2. El "Modo Ciego" (Blind Mode) y la UI de RevisiÃ³n
Como eje central de la experiencia del **Simulacro Real**, interviene el algoritmo de *Blind Mode*:
*   **Aislamiento PsicolÃ³gico:** Cuando el mÃ³dulo `quiz.js` detecta `limit === 100`, apaga automÃ¡ticamente *toda* la colorimetrÃ­a de feedback y desactiva el renderizado de la "JustificaciÃ³n IA".
*   **Flujo EstocÃ¡stico:** El clic del estudiante (ej. opciÃ³n C) solo genera un pulso azul pasivo de 600ms e inmediatamente lo expulsa hacia la siguiente pregunta. Esto impide al alumno saber si estÃ¡ aprobando o reprobando durante el transcurso del certamen de 120 minutos.
*   **CorrecciÃ³n (Exam Review UI):** Dado que la informaciÃ³n clÃ­nica estuvo oculta, al presionar "Salir" o agotar el cronÃ³metro, la medalla final de resultado ofrece un botÃ³n **"Ver CorrecciÃ³n del Examen"**. Este botÃ³n destruye visualmente el juego e inyecta dinÃ¡micamente ("Infinite Scroll") un *feed* vertical reconstruyendo la totalidad del examen donde, por primera vez, el estudiante puede visualizar quÃ© marco (en rojo si errÃ³), la respuesta dorada real, y la justificaciÃ³n mÃ©dica.

### 15.3. El Motor de Forzado de Dificultad (Override System)
Para evitar que un estudiante adultere las estadÃ­sticas rindiendo un "Simulacro Real" de 100 preguntas con un filtro artificial suavizado en su Dashboard (Ej: Configurar "ENARM" pero en dificultad "BÃ¡sico"), el backend implementa un mecanismo de **Forzado Oficial**:
*   En `trainingService.js`, cuando se procesa un flujo de `limit >= 100`, el sistema **sobrescribe ignominiosamente** el `difficulty` enviado por el navegador.
*   Si el `target` solicitado es `ENARM`, se sobreescribe rÃ­gidamente a **Avanzado** (Alta complejidad, gold standards).
*   Si el `target` es `ENAM` o `SERUMS`, se ancla irreversiblemente a **Intermedio** (Casos clÃ­nicos estÃ¡ndar, NTS).
Esto certifica matemÃ¡ticamente el rigor de la plataforma frente a sus usuarios.

### 15.4. Impacto Dual en la Base de Datos (100 Preguntas SimultÃ¡neas)
El volumen masivo del "Simulacro Real" opera a dos niveles asÃ­ncronos bajo la superficie (`analyticsController` & `trainingRepository`):
1.  **ExplosiÃ³n en el Dashboard:** La calificaciÃ³n de las 100 variables segmentadas choca contra la BD, provocando un rediseÃ±o inmediato, drÃ¡stico y preciso de las fortalezas y debilidades del estudiante, evidenciables de inmediato en el *GrÃ¡fico Radial* y en las *Tendencias Lineales*.
2.  **GeneraciÃ³n de Fallos (Flashcards):** Durante la correcciÃ³n silenciosa, cada una de las preguntas que el estudiante fallÃ³ en el Modo Ciego son depositadas automÃ¡ticamente por la rutina `saveStudyCards()` en su `flashcards_deck` predeterminado (Centro de Repaso), obligÃ¡ndolo a lidiar a corto plazo con los vacÃ­os conceptuales que mermaron su nota oficial.

---

## 16. ðŸ§  DeduplicaciÃ³n Avanzada de IA y Semantic Sub-Drift

Para resolver el problema del LLM repitiendo conceptos clÃ­nicos a travÃ©s de mÃºltiples simulacros generados secuencialmente, se implementÃ³ una arquitectura de deduplicaciÃ³n de 3 capas en la inyecciÃ³n de contexto:

### 16.1. Capa 1: ExclusiÃ³n HistÃ³rica Estricta (Base de Datos a Prompt)
A nivel de arquitectura, antes de que el backend solicite la confecciÃ³n de 20 preguntas nuevas, el servicio (`mlService.js`) escudriÃ±a atÃ³micamente la base de datos PostgreSQL, extrayendo las **Ãºltimas 200 preguntas previamente inyectadas** bajo esa misma configuraciÃ³n exacta (Target + Ãrea + Dificultad + Carrera). Esta rÃ¡faga de datos reales se incrusta textualmente como una "RestricciÃ³n Absoluta" en el System Prompt de Gemini, forzando matemÃ¡ticamente a la IA a virar su creatividad hacia patologÃ­as, tratamientos o casos clÃ­nicos completamente vÃ­rgenes y no tocar nunca la lista de temas "Bloqueados".

### 16.2. Capa 2: Contexto Negativo Aleatorio (Randomized RAG Constraint)
Cada vez que el backend (`trainingService.js`) invoca a Gemini, `trainingRepository.js` extrae en paralelo un bloque ligero de 15 preguntas *aleatorias* del banco histÃ³rico pertenecientes a esa misma Ã¡rea (Ej. "CardiologÃ­a"). Estas se inyectan en el prompt maestro bajo una directiva restrictiva absoluta ("Regla de Oro de DeduplicaciÃ³n"), prohibiÃ©ndole a la IA evaluar o retornar los escenarios clÃ­nicos contenidos en este extracto, forzando matemÃ¡ticamente la novedad.

### 16.3. Capa 3: RotaciÃ³n DinÃ¡mica de Enfoque (Semantic Sub-Drift)
Se instaurÃ³ un sistema de "EntropÃ­a ClÃ­nica". El array `clinicalFocuses` elige aleatoriamente un Ã¡ngulo de evaluaciÃ³n (Ej. "EtiologÃ­a y FisiopatologÃ­a", "Tratamiento de Primera LÃ­nea", "DiagnÃ³stico por ImÃ¡genes"). El prompt le ordena a Gemini que concentre un alto porcentaje de las preguntas requeridas especÃ­ficamente bajo ese prisma diagnÃ³stico, evitando que la IA cicle crÃ³nicamente alrededor de las mismas patologÃ­as tÃ­picas.

---

## 17. ðŸ“¦ Escalabilidad de Dominio MÃºltiple y Panel de InyecciÃ³n

Para transformar el motor de "Simulador MÃ©dico" a un "Hub AcadÃ©mico Multi-Dominio" (Ej. Medicina, InglÃ©s, etc.) de forma sostenible, se rediseÃ±Ã³ la ingesta y persistencia de datos:

### 17.1. Hydration Activa (ConfiguraciÃ³n JSONB) 
Se erradicÃ³ la gestiÃ³n de estado basada puramente en el `localStorage` del navegador. Se implementÃ³ la tabla `user_simulator_preferences` utilizando el tipo de dato **JSONB** nativo de PostgreSQL. Al cargar el Dashboard, el Frontend consume la API REST `GET /api/users/preferences?domain=medicine` y restaura exactamente el *Target*, *Dificultad* y selecciÃ³n multi-Ã¡rea transversal a todos los dispositivos mÃ³viles y navegadores del usuario (Cross-Device Sync).

### 17.2. InyecciÃ³n Masiva Profesional (Upload Excel/CSV)
En el portal `/admin`, se implementÃ³ una interfaz grÃ¡fica avanzada sustituyendo la antigua caja de texto JSON por un cargador nativo de archivos binarios tabulares.
*   **Motor Interpretativo en Cliente:** Se integrÃ³ la librerÃ­a **SheetJS** (`xlsx`) vÃ­a CDN para que el propio navegador del administrador descifre asÃ­ncronamente archivos `.xlsx`, `.xls` y `.csv` pesados.
*   **Estructura Estricta:** El sistema valida y transfiere un mapa de 13 columnas rÃ­gido (`pregunta, dominio, target, carrera, tema, dificultad, opt0... explicacion`). Adicionalmente, cuenta con un botÃ³n interactivo para generar y descargar dinÃ¡micamente una "Plantilla Oficial" preformateada lista para el llenado en Excel.
*   **Backend Bulk:** Tras ser convertido silenciosamente a JSON por SheetJS, este es capturado por `/api/admin/questions/bulk` y ejecutado sobre una Ãºnica transacciÃ³n SQL (`BEGIN/COMMIT`) minimizando la carga de red.

### 17.3. Motor de ImÃ¡genes EstÃ¡ticas Desacoplado (CDN jsDelivr)
Para reducir agresivamente el consumo de Ancho de Banda (Transferencia) de la capa gratuita del servidor Backend (Supabase/Vercel) al cargar casos clÃ­nicos radiolÃ³gicos o multimedia, se integrÃ³ soporte nativo para `image_url` en los esquemas de visualizaciÃ³n del Quiz (`quiz.html`). Como directiva oficial, el Administrador aloja directamente los pesados *assets* de imagen en un branch de infraestructura de GitHub y propaga estas imÃ¡genes instantÃ¡neamente al frontend mediante la red de Edge Caching global de **jsDelivr**, resultando en un costo marginal de transferencia de $0 para la instituciÃ³n educativa.

### 17.4. GestiÃ³n de Preguntas Individuales y UI de AdministraciÃ³n (CRUD Full)
Como evoluciÃ³n lÃ³gica a la inyecciÃ³n masiva, se desarrollÃ³ una suite completa de administraciÃ³n unitaria (`GET`, `POST`, `PUT`, `DELETE` en `/api/admin/questions`). En el portal Admin, la pestaÃ±a "Preguntas" ahora presenta un Grid dinÃ¡mico robusto que renderiza metadatos mÃ©dicos (`domain`, `target`). Se construyÃ³ un modal de ediciÃ³n avanzado que permite a los supervisores importar JSON o utilizar un formulario generativo para corregir sobre la marcha opciones o explicaciones de la IA sin depender exclusivamente de operaciones masivas (Bulk).

### 17.5. EspecializaciÃ³n ProfilÃ¡ctica (Careers Mapping para SERUMS)
Ante la necesidad legal de adaptar el examen SERUMS (ENCAPS) a mÃºltiples carreras de ciencias de la salud, el modelo de datos PostgreSQL de `question_bank` y de `quiz_history` fue alterado para alojar la columna `career`.
*   **Comportamiento DinÃ¡mico UI:** Tanto en el Dashboard del Alumno como en el portal Admin, seleccionar "SERUMS" como Target despliega reactivamente un menÃº secundario bloqueando o revelando 3 carreras (Medicina Humana, EnfermerÃ­a).
*   **RAG ProfilÃ¡ctico:** Al generar preguntas con IA para SERUMS, la variable `career` viaja hacia el Cerebro LLM, el cual adapta su lÃ©xico, prioridades y escenarios clÃ­nicos en exclusiva sintonÃ­a a las competencias legales de la carrera elegida.

---

## 18. ðŸ›¡ï¸ Integridad de Datos y ReparaciÃ³n de CachÃ© Infinito (Anti-RepeticiÃ³n)

Se detectÃ³ una falla crÃ­tica estructural en la persistencia del historial de usuario y la indexaciÃ³n criptogrÃ¡fica que permitÃ­a a la plataforma ciclar sobre las mismas preguntas repetidamente ignorando el periodo de enfriamiento de 24 horas. 

### 18.1. RestauraciÃ³n de Restricciones y CachÃ© "Time Capsule" (DDL PostgreSQL)
*   **Problema Dual:** La transacciÃ³n optimista `ON CONFLICT (user_id, question_id) DO NOTHING` presentaba dos fallas fatales. Primero, PostgreSQL **carecÃ­a** de una restricciÃ³n `UNIQUE` en la tabla `user_question_history`, lanzando excepciones silenciosas. Segundo, incluso si la inserciÃ³n funcionaba, la instrucciÃ³n `DO NOTHING` congelaba mecÃ¡nicamente el campo `seen_at` en el pasado. Esto creaba una "CÃ¡psula de Tiempo" donde el algoritmo de exclusiÃ³n (`seen_at > NOW() - INTERVAL '24 hours'`) percibÃ­a que el estudiante no habÃ­a visto la pregunta recientemente, atrapÃ¡ndolo en un bucle infinito que repetÃ­a las mismas mÃ©tricas una y otra vez.
*   **SoluciÃ³n:** Se intervino en vivo el esquema aÃ±adiendo `ALTER TABLE user_question_history ADD CONSTRAINT unique_user_question UNIQUE (user_id, question_id);` y se recodificÃ³ el Driver en NodeJS reemplazando `DO NOTHING` por `DO UPDATE SET seen_at = CURRENT_TIMESTAMP, times_seen = user_question_history.times_seen + 1;`. Al restaurarse el Ã­ndice y obligar al reloj a actualizarse, la API filtrÃ³ existosamente todas las repeticiones rindiendo una tasa efÃ­mera del 100%.

### 18.2. Mapeo Ortogonal de Variables (Domain vs Target)
*   **Problema:** El backend enviaba invariablemente `domain="ENAM"`, bloqueando a la IA RAG la lectura del propio banco, permitiendo infinitas repeticiones temÃ¡ticas.
*   **SoluciÃ³n:** En `trainingService.js` se instaurÃ³ un riguroso desacoplamiento lÃ©xico creando variables `dbDomain` ('medicine') y `dbTarget` ('ENAM'). Esta dicotomÃ­a unificÃ³ el RAG alimentador (15 preguntas lÃ­mite excluyentes) a lo largo de todos los motores (Simulador Nativo y Quiz Arena).

### 18.3. Analytics Unitarios y Hashes CriptogrÃ¡ficos
*   **MÃ©tricas DinÃ¡micas (`times_used`):** Se interceptÃ³ lÃ³gicamente el *query* de recolecciÃ³n principal (`findQuestionsInBankBatch`). Ahora el motor PostgreSQL realiza una operaciÃ³n atÃ³mica sub-query actualizando `UPDATE question_bank SET times_used = times_used + 1` de manera transparente para cada bloque recuperado, sirviendo para futuras proyecciones de popularidad y desgaste de banco.
*   **Huellas MD5 Manuales:** Las preguntas aÃ±adidas individualmente por administradores carecÃ­an de Hash, generando tuplas Null. El `adminController.js` ahora importa `crypto` (Node.js nativo) y forja de manera imperativa una huella Hexagonal `MD5` (`Topic + Pregunta + Opciones`) asegurando la estabilidad global del motor transaccional `ON CONFLICT`.

### 18.4. AuditorÃ­a de Integridad TemÃ¡tica (Anti-AnatomÃ­a Bug)
Se detectÃ³ y resolviÃ³ un fallo de "atrapamiento" donde el sistema asumiÌa que todas las respuestas de un multi-examen pertenecÃ­an al primer tema de la lista (ej. AnatomÃ­a).
*   **Causa RaÃ­z:** El repositorio recuperaba el `topic` de la base de datos pero lo omitÃ­a en la transferencia. Esto forzaba al servicio a "adivinar" el tema, fallando hacia el valor por defecto.
*   **Blindaje:** Se forzÃ³ la inclusiÃ³n de `topic` en todas las consultas del Banco Global y se implementÃ³ una sanitizaciÃ³n inteligente que prioriza el tema mÃ©dico de la pregunta sobre el tema general del examen.

---

## 19. ðŸŽ¨ Refinamientos ArquitectÃ³nicos y LÃ³gicos en "Quiz Arena"
Se implementaron una serie de mejoras estructurales para la variante "Arcade" del simulador (Quiz Arena) orientadas a la retenciÃ³n de usuarios, correcciÃ³n de desincronizaciones de Estado (UI vs JS) y optimizaciÃ³n del lienzo visual.

### 19.1. SincronizaciÃ³n de Estado y Adaptabilidad (State Sync)
*   **DesincronizaciÃ³n de Dificultad:** ExistÃ­a un falso positivo donde un usuario inciaba la Arena en Dificultad "BÃ¡sica" pero el motor JS (`arena.js`) mantenÃ­a un estado interno `state.difficulty='Profesional'`, forzando llamados a Vertex AI altamente complejos. Se acoplÃ³ y forzÃ³ la inicializaciÃ³n del objeto `state` para reflejar el DOM visible de las tarjetas seleccionadas.
*   **Fluidez HÃ¡ptica:** El reloj de cuenta regresiva (Progress Bar) exhibÃ­a un descenso entrecortado (100ms Javascript Ticks). Se inyectÃ³ una propiedad arquitectÃ³nica CSS `transition: width 0.1s linear` transfiriÃ©ndole la interpolaciÃ³n del relleno numÃ©rico directamente a la tarjeta de video (GPU Rendering) logrando 60 FPS lÃ­quidos en la barra.

### 19.2. Bloqueo Elegante para Visitantes (Auth Guards)
La arena intentaba cargar agresivamente *Leaderboards* y perfiles incluso si el visitante no tenÃ­a cuenta, disparando errores tipo "Cargando..." y colapsos de Consola.
*   **IntercepciÃ³n Condicional (`startMatch`):** Se re-ordenÃ³ la validaciÃ³n arquitectÃ³nica. La existencia de Token (Login) ahora se valida estrictamente **antes** que la selecciÃ³n del Tema. Si el usuario es un visitante, la interfaz aborta el juego y lanza reactivamente la tarjeta `uiManager.showAuthPromptModal()` invitÃ¡ndolo a unirse a Hub Academia sin expulsarlo de la ruta actual.
*   **Ruteo Limpio de Controles:** El botÃ³n "Iniciar SesiÃ³n" del Header fue redirigido formalmente hacia `/login.html` en lugar de abrir la caja de "Registro Invitado", respetando la convenciÃ³n de UX global.

---

## 20. ðŸ”‘ Cierre de Brecha de Seguridad: Supabase Password Recovery Interceptor
Se descubriÃ³ un "Punto Ciego" crÃ­tico en la arquitectura de autenticaciÃ³n cuando un correo registrado enviaba la peticiÃ³n de `"OlvidÃ© mi contraseÃ±a"`.

### 20.1. El Bucle Silencioso de Autologueo
**El Problema:** Al hacer clic en el correo de recuperaciÃ³n, Supabase generaba un enlace con `type=recovery` y un Token Seguro inyectado en el Fragmento Decimal (`#access_token=...`). Sin embargo, los `onAuthStateChange` listeners (ubicados en `app.js`) detectaban ese Token, asumÃ­an credenciales correctas, arrojaban un evento **SIGNED_IN**, y logueaban automÃ¡ticamente al usuario *sin mostrar jamÃ¡s la pantalla para escribir una nueva contraseÃ±a*.

### 20.2. First-Line Hash Interceptor
**La SoluciÃ³n:** En lugar de parchar las interacciones profundas de `SessionManager`, se instalÃ³ un interceptor bloqueante en las primeras lÃ­neas del evento DOM `DOMContentLoaded` dentro de `app.js` y `login.html`.
*   Apenas la aplicaciÃ³n arranca, verifica si el objeto `window.location.hash` contiene `type=recovery`.
*   Si arroja `true`, se bloquea de inmediato cualquier rastro de inicializaciÃ³n, interrumpiendo el ciclo natural de Supabase, y el navegador ejecuta un redirect manual: `window.location.href = '/update-password.html' + window.location.hash`.
*   Esto captura el Token ileso y lo translada a la vista donde se forza al usuario a redefinir y guardar criptogrÃ¡ficamente su clave.

**Efecto Secundario Positivo (Supabase Account Linking):** Esta arquitectura no solo beneficia a las cuentas estÃ¡ndar (User/Password), sino que tambiÃ©n autoriza a usuarios originalmente registrados velozmente mediante el puente de Google OAuth a "setear" por primera vez una contraseÃ±a si lo desean, convirtiendo su perfil silenciosamente a una cuenta "HÃ­brida" (Dual Login).

---

## 21. Nuevos MÃ³dulos, UI/UX y Sistema Premium

### 21.1 Single Source of Truth para UI de Recursos

Previamente, las tarjetas de recursos (*Documents*, *Books*, *Videos*) se generaban de formas dispersas en diferentes archivos (`category.js`, `course.js`, `search.js`), lo que generaba inconsistencias visuales y parches de seguridad.

**SoluciÃ³n Implementada:**
Hemos consolidado la lÃ³gica en dos funciones maestras ubicadas en `/js/ui/components.js`:
- `createUnifiedResourceCardHTML(item)`: Empleada para *Libros*, *Documentos* y *Papers*.
- `createVideoCardHTML(video)`: Empleada estrictamente para *Videos*.

**Impacto:** Cualquier cambio de diseÃ±o, icono premium (ðŸ‘‘), candado (ðŸ”’) o comportamiento al hacer click, se propaga instantÃ¡neamente a todas las carruseles, bÃºsquedas y pÃ¡ginas de cursos de la plataforma.

### 21.2 Seguridad SÃ­ncrona vs Race Conditions

Anteriormente, la plataforma mostraba el icono de candado basÃ¡ndose en estados asÃ­ncronos que provocaban un "parpadeo" o mostraban el candado a usuarios Premium por milisegundos.

**SoluciÃ³n (`uiManager.js` & `components.js`):**
Ahora la renderizaciÃ³n evalÃºa *sÃ­ncronamente* el estado de autenticaciÃ³n leyendo directamente de `localStorage` al momento de dibujar el HTML garantizando que los candados premium jamÃ¡s fastidien a quienes tienen una suscripciÃ³n o pase vÃ¡lido.

### 21.3 DelegaciÃ³n de Eventos: `unlockResource`

Antes los usuarios podÃ­an bypassear el "Paywall" si hacÃ­an "click derecho -> abrir enlace".

**SoluciÃ³n:**
Ninguna tarjeta expone la etiqueta `href` directa hacia su contenido subyacente de ser *is_premium = true*. 
En su lugar, inyectan el evento: `onclick="window.uiManager.unlockResource(id, type, isPremium)"`

Esta funciÃ³n intermedia en `uiManager.js` actÃºa como el **Gran GuardiÃ¡n**:
1. Comprueba si el usuario estÃ¡ Logueado. Si no, lanza el modal *"Ãšnete a Hub Academia"*.
2. Comprueba si el recurso es Premium.
3. Si lo es, revisa si es *Freemium*. Si lo es, evalÃºa si tiene *vidas* (`free_trials`).
4. **Cero vidas?** Lanza el modal *"Te encantÃ³ la prueba"* (MembresÃ­a).
5. **Tiene vidas?** Resta 1 vida, y navega reciÃ©n al visualizador de PDF/Video.

### 21.4 Fix del Payload Backend en Repositorio de Cursos

Un bug crÃ­tico causaba que dentro del detalle de los cursos, los recursos no funcionaran a pesar de tener la funciÃ³n `unlockResource`. 

**SoluciÃ³n en `CourseRepository.js`:**
El backend construÃ­a un `JSON_BUILD_OBJECT` en PostgreSQL omitiendo declarar la llave `r.is_premium`. Se parcheÃ³ la base de datos para que la Query inyecte `'is_premium', r.is_premium` asegurando que el Frontend entienda cuÃ¡ndo detener al usuario.

### 21.5 ReorganizaciÃ³n de MÃ³dulos (UI)

Se reasignÃ³ la secciÃ³n *"Cursos Populares"* al lugar ideal sugerido (`search.js`), intermedio entre la invocaciÃ³n del *"Hub Quiz Arena"* y las *"Ãreas de Estudio"*. TambiÃ©n, los botones principales del centro de llamadas *"Bibliotecas Oficiales"* se actualizaron utilizando portadas en `background-image` fotogrÃ¡ficas consumidas sobre la red con efecto graduado lineal (Linear Gradient) para denotar calidad y esteticidad superior.

---

## 22. RefactorizaciÃ³n UX/UI del MÃ³dulo de Repaso (Flashcards)

Se implementaron mejoras sustanciales en la interacciÃ³n y experiencia de usuario para la pantalla principal de estudio y gestiÃ³n de mazos (`repaso.html` y `repaso.js`).

### 22.1 Reordenamiento Inteligente (Drag & Drop)
Los usuarios ahora pueden cambiar el orden de las tarjetas (Flashcards) arrastrando desde un Ã­cono (`fa-grip-vertical`).
- **Arquitectura Backend:** Se agregÃ³ la columna `sort_order` en `user_flashcards` y un nuevo endpoint batch (`PUT /api/decks/:id/cards/reorder`).
- **InteracciÃ³n MÃ³vil HÃ­brida:** Dado que el estÃ¡ndar Drag & Drop de HTML5 no soporta dispositivos tÃ¡ctiles nativamente, se integrÃ³ el *Polyfill* `mobile-drag-drop`. Esto permite que con un simple gesto sostenido ("Long Press") sobre la agarradera, los usuarios mÃ³viles puedan reordenar tarjetas con fluidez.

### 22.2 SelecciÃ³n Masiva y Modos TÃ¡ctiles (Bulk Actions)
Para la eliminaciÃ³n en bloque de flashcards ("estilo Gmail"), se construyÃ³ un "Modo de SelecciÃ³n" seguro:
- **Checkbox y Tap (Escritorio/MÃ³vil):** El modo selecciÃ³n se activa al hacer clic en un Checkbox o al mantener presionada cualquier parte de una tarjeta en celular.
- Una vez en *Modo SelecciÃ³n*, toda la tarjeta fÃ­sica se vuelve un botÃ³n gigantesco que alterna el estado (seleccionado / no seleccionado), previniendo que clicks accidentales abran modales indeseados.

### 22.3 Search Bar Reactiva (BÃºsqueda Real-Time)
Se incorporÃ³ un `input type="search"` que filtra sÃ­ncronamente los arrays cargados en memoria. Se evaluÃ³ que la paginaciÃ³n backend no era necesaria asumiendo mazos locales (decenas/cientos de tarjetas), privilegiando la velocidad y el feedback visual instantÃ¡neo con un `input` interconectado al Render DOM.

### 22.4 SoluciÃ³n de Fallas Estructurales de UI (CSS Overlaps)
- **Desbordamiento del Explorador de Mazos:** Los nombres de los sub-mazos anidados no se truncan cortando el texto. El panel lateral (`.explorer-sidebar`) ahora ostenta `overflow-x: auto` con fondos Flex elÃ¡sticos que expanden su horizonte segÃºn la profundidad del nivel del Ã¡rbol.
- **Bug Fatal del MenÃº Desplegable:** El menÃº principal superior ("Cerrar SesiÃ³n") se veÃ­a tapado por las tarjetas secundarias a causa de la propiedad `backdrop-filter` (Glassmorphism) que forzaba un nuevo contexto de apilamiento en el HTML. Se aplicÃ³ `position: relative` interconstruido con `z-index: 2147483647` al header principal, aislando al menÃº de cualquier conflicto z-index en la aplicaciÃ³n.

---

## 23. ðŸŽ¨ Mega-RefactorizaciÃ³n Visual y Comportamental (UI/UX Absoluta)

Para consolidar a **Hub Academia** como una plataforma EdTech de rango Premium, se realizÃ³ una reestructuraciÃ³n dramÃ¡tica de las reglas CSS globales, layouts responsivos y mecÃ¡nicas emergentes (Modales) a travÃ©s de todos los mÃ³dulos.

### 23.1. Layout "True Edge-to-Edge" y EliminaciÃ³n de Cajas Duras
HistÃ³ricamente, los contenedores principales (`.main-container`, `.dashboard-container`) estaban restringidos por un bloqueo mÃ¡ximo de `1200px` (`max-width: 1200px`), provocando que subpÃ¡ginas como el Buscador o Cursos se vieran truncadas o atrapadas en el medio de monitores grandes.
- **LiberaciÃ³n Absoluta:** Se erradicaron estas limitantes rÃ­gidas de `search.css`, `course.css` y `dashboard.css`. Todos los contenedores respiran horizontalmente al **100% de la pantalla**, limitados armÃ³nicamente por la variable fluida `--page-padding-x`.
- **Headers/Footers Aislados (Single Source of Truth):** Se identificÃ³ que vistas internas crÃ­ticas (ej. Simulador MÃ©dico, Editor de Mazos) poseÃ­an cabeceras `<header>` codificadas directamente (`<header class="header-glass">`), causando diseÃ±os asimÃ©tricos. Fueron purgados e inyectadÃ³s con los bloques universales `<header class="main-header">` y `<footer class="main-footer">`.

### 23.2. FormulaciÃ³n GeomÃ©trica Estricta en CuadrÃ­culas
- **El 6x3 Grid:** En listados panorÃ¡micos enormes (Ej. PestaÃ±as Biblioteca y Cursos), CSS *Grid Auto-Fill* variaba impredeciblemente tamaÃ±os de libros perdiendo la estÃ©tica. En Escritorio, el `browse.css` restringe la exhibiciÃ³n a exactamente **6 columnas inquebrantables**. En dispositivos mÃ³viles (Smartphones), la proporciÃ³n es forzada milimÃ©tricamente a **3 columnas verticales**, garantizando que las portadas tengan la perfecta silueta tipo *Spotify* o *Netflix*.
- **Cierre SemÃ¡ntico de Recursos:** Los tÃ³picos de separaciÃ³n ya no tienen mÃ¡rgenes inmensos abajo (`marginBottom: 0.25rem`), lo que empalma visualmente las portadas de los recursos directamente bajo su temÃ¡tica, condensando drÃ¡sticamente el uso visual de pantalla e impidiendo la necesidad de `scroll` interminable al alumno.

### 23.3. Tema "Manta Black" (ErradicaciÃ³n del Slate Residual)
Originalmente, el dashboard principal ostentaba un profundo Negro Mate (`#141414`), pero mÃ³dulos independientes como el **Quiz Arena**, la interfaz del **Examen Simulado** (`quiz.html`), y el Repaso (`flashcards.html`) mantenÃ­an variables duras nativas heredadas de esquemas grises azulados pasados (*Slate*: `#0f172a`, `#1e293b`).
- **InyecciÃ³n AcromÃ¡tica:** Se ejecutÃ³ una purga del espectro azul en `quiz.css`, `dashboard.css` y `components.css`. 
- **Fondo Global (Main):** Estandarizado implacablemente a `--bg-main: #141414`.
- **ElevaciÃ³n de Superficies (Cards/Modals):** Modificado a `--bg-tertiary: #1f1f1f`.
- **Bordes Invisibles:** Transiciones azules (`#334155`) neutralizadas a `rgba(255, 255, 255, 0.05)`, fusionÃ¡ndose enteramente en la oscuridad armÃ³nica dictada inicialmente por el *footer*.

### 23.4. Motor Interactivo API "PopState" (Back-Button UX)
El fallo tÃ©cnico mÃ¡s frustrante en *Mobile Web Apps* es perder la pÃ¡gina entera cuando el usuario despliega un menÃº modal y presiona el gesto "AtrÃ¡s" en Android, ocasionando que retroceda la historia de navegaciÃ³n del navegador en lugar de solo ocultar la ventana.
- **InyecciÃ³n HistÃ³rica Transversal:** `uiManager.js` fue fortificado con dos comandos: `pushModalState` y `popModalState`.
- **Registro Ficticio:** Cada vez que el motor abre el Paywall, el modal Generador IA de Flashcards, o el Configurador CrÃ­tico de Simulacros, empuja un "estado oculto" (`window.history.pushState`) al navegador de internet. 
- **InterceptaciÃ³n Segura:** El listener central `handlePopState` entra en acciÃ³n cuando el usuario ejecuta fÃ­sicamente el "Volver". Dicho comando identifica modales vivos por su ID en el `openModals Set` y remueve sus trazos (sean `style.display="none"` o `.classList.remove('active')`) cerrÃ¡ndolos instantÃ¡neamente sin expulsar al usuario fuera de su progreso formativo. 

### 23.5. Apilamiento Universal Z-Index (Z-Stack Bug)
Inesperadamente, menÃºs descolgables nativos del Header (Ej. Caja de Cuenta de Usuario) colapsaban al desplegarse solapados por Cajas Modales gigantescas (Ej. "SuscrÃ­bete" u "OpiniÃ³n IA"), creando la imposibilidad grÃ¡fica de interactuar si el usuario ignoraba dicho modal. 
- **CÃ¡lculo FÃ­sico Definitivo:** En lugar de malabares de 1000 en 1000, los Modales y overlays transparentes ostentan rigidez matemÃ¡tica extrema: `z-index: 2147483647;`.
- **EvasiÃ³n Contextual:** Para contrarrestar apilamiento irresoluble del HTML (`stacking context`), el nav-bar decreciÃ³ forituitamente a `z-index: 999;` brindÃ¡ndole prioridad absoluta a modales de importancia crÃ­tica transversalmente para salvar flujos de transaccionalidad interrumpidos en Desktop y Mobile.

### 23.6. SimplificaciÃ³n de la UX del Tutor IA
Para reducir la carga cognitiva del usuario al abrir el chat, se simplificÃ³ el mensaje de bienvenida inicial.
- **ReducciÃ³n de Mensaje:** El saludo inicial fue refinado a una Ãºnica pregunta directa: "Â¿En quÃ© puedo ayudarte hoy?".
- **Sugerencias de Contexto:** Se actualizaron las `defaultSuggestions` para incluir accesos rÃ¡pidos a Simulacros y Repasos, alineando el chat con las funcionalidades principales de la plataforma.

### 23.7. Visibilidad de Botones de AcciÃ³n sobre Fondos Oscuros
Con la implementaciÃ³n del tema **Manta Black**, ciertos iconos heredados (Editar y Eliminar) que carecÃ­an de color definido se volvieron invisibles al mostrarse como negro sobre negro.
- **CorrecciÃ³n Croma Global:** Se inyectÃ³ `color: var(--text-main, #ffffff)` en los selectores `.edit-btn-small` y `.delete-btn-small` de `admin.css`.
- **Refinamiento en Chat:** Los controles de gestiÃ³n de conversaciones en `chat.css` fueron ajustados a un blanco translÃºcido (`rgba(255, 255, 255, 0.7)`), garantizando legibilidad sin romper la estÃ©tica minimalista del sidebar.

### 23.8. Exactitud MatemÃ¡tica e Interfaz del Algoritmo Anki (SM-2)
Se identificÃ³ y resolviÃ³ una desconexiÃ³n crÃ­tica profunda entre la persistencia de datos visuales y los cÃ¡lculos matemÃ¡ticos estructurales del motor Spaced Repetition (SM-2) embebido en la plataforma.
- **Traductor de MÃ©tricas (Mapper Visual-AlgorÃ­tmico):** El motor SM-2 exige matemÃ¡ticamente los valores de calidad `0, 3, 4, 5` para originar su curva del olvido. Sin embargo, el Frontend esperaba la indexaciÃ³n estÃ¡ndar `1 (Rojo), 2 (Naranja), 3 (Azul), 4 (Verde)` para renderizar el coloreado CSS `srs-status`. Se programÃ³ una capa middleware de traducciÃ³n directa antes de la inyecciÃ³n PostgreSQL, permitiendo a la UI usar Ã­ndices ordenados inalterando el coeficiente EF de SuperMemo.
- **SincronizaciÃ³n de Semilla Inicial (First-Rep UI Bind):** El SM-2 original castigaba toda tarjeta nueva/fallada (`reps = 0`) agendÃ¡ndola a 24 horas (1 dÃ­a) como bloque inicial de hielo, ignorando pasivamente los marcadores de `3 dÃ­as` (Bien) o `7 dÃ­as` (FÃ¡cil) descritos por el front. Se reescribiÃ³ el escalÃ³n base del algoritmo algorÃ­tmico para forzar la adopciÃ³n milimÃ©trica del indicador textual de los botones HTML para el primer intervalo. Las repeticiones subsecuentes mantienen inalterada la rigurosidad multiplicativa.
- **Condicionamiento AnalÃ­tico (Mastery > 21):** Para purificar las mÃ©tricas del "Mastered Cards" (Dominadas), se purgaron los atajos falsos (ej. `last_quality = 4`). Hoy, el Dashboard General y el Backend SQL filtran como Masterizadas estrictamente solo aquellas tarjetas que empÃ­ricamente han sobrevivido la barrera del "Intervalo Maduro (> 21 dÃ­as al futuro sin fallar)".
- **Indicador Focus Glow:** Se implementÃ³ visualmente la clase CSS `.is-due-glow` combinada con `@keyframes duePulseGlow`. Suscitada condicionalmente desde el DOM javascript (`repaso.js` y `deck-details.js`), inyecta un suave campo de fuerza resplandeciente pulsante alrededor del borde azul-neÃ³n de toda aquella tarjeta puntual cuya fecha `next_review_at` ha caducado y solicita estudio inmediato el dÃ­a de hoy.

---

## 24. ðŸ“‚ IntegraciÃ³n Avanzada de Google Drive y Smart Routing (v2.6)

Se implementÃ³ un sistema robusto para la gestiÃ³n y visualizaciÃ³n de recursos alojados en Google Drive, optimizando la carga visual y garantizando la compatibilidad con las polÃ­ticas de seguridad de los navegadores.

### 24.1. Drive Thumbnail Proxy (Backend)
Para mostrar miniaturas de documentos de Drive sin exponer las URLs originales y evitar bloqueos de CORS:
*   **Servicio (`driveService.js`):** Utiliza `google-auth-library` para autenticarse con una Service Account y solicitar el `thumbnailLink` de archivos especÃ­ficos vÃ­a Google Drive API v3.
*   **Endpoint Proxy (`/api/media/drive-thumbnail`):** ActÃºa como un puente seguro que descarga la miniatura desde los servidores de Google y la sirve al cliente, permitiendo el almacenamiento en cachÃ© y protegiendo las credenciales del servidor.

### 24.2. Smart Cover en Tarjetas (UI Components)
Las tarjetas de recursos en la biblioteca ahora poseen inteligencia visual (`components.js`):
*   **PriorizaciÃ³n:** 1. Imagen manual del Admin -> 2. Miniatura de Drive -> 3. Icono de Fallback.
*   **DetecciÃ³n de Carpetas:** El sistema identifica si el enlace de Drive es una carpeta (Folder). Si es asÃ­, omite la peticiÃ³n de miniatura (ya que Drive no genera miniaturas para carpetas) y muestra el icono de carpeta automÃ¡ticamente, evitando errores de red.
*   **Manejo de Errores (Self-Healing):** Si una miniatura falla al cargar, la imagen se oculta silenciosamente y activa el icono de fallback mediante un ID Ãºnico por tarjeta, manteniendo la estÃ©tica impecable.

### 24.3. Smart Routing del Visor (Security First)
Se rediseÃ±Ã³ el motor de visualizaciÃ³n en `uiManager.js` para resolver problemas de `Content Security Policy (CSP)` de Google Drive:
*   **Documentos (PDF, Drive, Externos):** Dado que Google bloquea el incrustado en `iframes` por seguridad, el sistema ahora detecta estos archivos y los abre automÃ¡ticamente en una **PestaÃ±a Nueva** (`_blank`), permitiendo el uso de los potentes visores nativos de Drive y del navegador.
*   **ImÃ¡genes (GCS/Locales):** Mantienen su comportamiento inmersivo abriÃ©ndose dentro del **Modal de la plataforma**, garantizando velocidad y fluidez visual para diagramas o esquemas mÃ©dicos.

### 24.5. SincronizaciÃ³n Masiva (Drive Folder Scanner)
Se integrÃ³ un motor de escaneo masivo para poblar la biblioteca de recursos directamente desde carpetas de Google Drive, optimizando la gestiÃ³n administrativa:
*   **Endpoint:** `POST /api/admin/drive/sync-folder`.
*   **LÃ³gica de Upsert:** El sistema identifica cada archivo por su Drive File ID. Si el recurso ya existe en la base de datos (basado en la URL), actualiza el tÃ­tulo y tipo; si es nuevo, genera un `resource_id` Ãºnico y lo inserta.
*   **Procesamiento de TÃ­tulos:** Elimina automÃ¡ticamente las extensiones de archivo (ej: ".pdf", ".mp4") para mantener la limpieza visual en la plataforma.
*   **AtribuciÃ³n DinÃ¡mica:** Permite definir un autor global y el tipo de recurso (Libro, GuÃ­a, Norma, etc.) para todo el lote sincronizado.

---

## 25. ðŸ“‚ Estructura de Carpetas Detallada (Actualizada)

---

## 25. ðŸ’° AnÃ¡lisis de Costos e Infraestructura de Almacenamiento (GCS vs Drive)

Para optimizar la rentabilidad del proyecto, se ha definido una estrategia dual de almacenamiento basada en el tipo de recurso y su nivel de exclusividad.

### 25.1. Google Cloud Storage (GCS) - Almacenamiento Propietario
*   **Uso:** Recursos de autorÃ­a propia, materiales Premium exclusivos e imÃ¡genes de perfil.
*   **Modelo de Costos:**
    *   **Almacenamiento:** Pago por GB/mes (aprox. $0.02 USD/GB).
    *   **Transferencia (Egress):** Costo por descarga fuera de la red de Google tras superar el primer 1GB gratuito mensual.
*   **Seguridad:** Permite un control de acceso granular y firmado (Signed URLs), siendo ideal para contenido que **no debe ser pÃºblico** fuera de la plataforma.

### 25.2. Google Drive - Almacenamiento PÃºblico/SemipÃºblico
*   **Uso:** Material bibliogrÃ¡fico general, normas tÃ©cnicas pÃºblicas y recursos de apoyo masivos.
*   **Modelo de Costos:** **$0 USD** (Dentro de los lÃ­mites de cuota de la cuenta de Google y la API).
*   **LimitaciÃ³n EstratÃ©gica:** Drive requiere que los archivos sean "PÃºblicos con el enlace" para que el visor y las miniaturas funcionen fluidamente. 
*   **Riesgo de ExposiciÃ³n:** Al ser enlaces pÃºblicos, si un usuario copia la URL, podrÃ­a compartirla externamente, lo que debilita el valor de un "Recurso Premium".

### 25.3. Estrategia "Safe-Profit" Recomendada
1.  **Material Gratuito/PÃºblico:** Alojar en **Google Drive** para ahorrar costos de almacenamiento y transferencia en GCS.
2.  **Material Premium/Propio:** Alojar en **GCS**. Aunque genera un costo marginal, garantiza que el archivo solo sea accesible a travÃ©s de los guardias de nuestra plataforma (`unlockResource`), protegiendo la propiedad intelectual y el modelo de negocio de suscripciones.

---

### [15/04/2026] Actualización: Optimización Global de Multimedia y Visor Móvil

**Frontend (Multimedia & UX):**
- **Sistema Lazy-Load para Videos:** Se eliminó la inyección directa de iframes en la página de Recursos. Ahora los videos de YouTube generan dinámicamente 'Carátulas de Póster' interactivas con botones de reproducción. Esto disminuye dramáticamente el tiempo de carga y el consumo de RAM en dispositivos móviles.
- **Visor Inmersivo de Video (Global):** Se extrajo la estructura del Modal de Video de *course.css* a *modal.css* y *uiManager.js*, volviéndolo una característica universal del sistema. Clica un póster y abrirá el visor flotante.
- **Corrección 'F11' en Móviles:** En navegadores móviles propensos a errores de flexbox con spect-ratio (Safari/Chrome Mobile), el reproductor se estiraba ocupando 100vh rompiendo la interacción táctil. Se corrigió forzando CSS inline en uiManager.js con el método infalible de padding-bottom: 56.25% y anulando lex:1 en .modal-body.
- **Interacciones Táctiles Liberadas:** Se eliminaron las capas de safe-wrapper que interceptaban los toques (pointer-events), y se añadieron parámetros de YouTube playsinline=1 y s=0 para evitar que el navegador envíe el video automáticamente a pantalla completa nativa.
- **Scope Global (Bugfix):** Se expusieron las funciones openResourceLink y saveResource globalmente en window al final de 
esource.js tras salir del bloque de seguridad de DOMContentLoaded, reparando los botones de 'Ver Recurso'.

**Seguridad & Backend (authMiddleware.js):**
- **Smart Token Error Handling:** Se documentó que Supabase a veces emite errores HTTP 400 (AuthSessionMissingError) durante recargas de la tabla en clientes con sesión rota. El middleware interpretará correctamente esto como un Status 401 Unauthorized normal, limitando inmensamente el ruido rojo (? Supabase Auth Connectivity Error) en la consola central.

- **Intercepción Nativa de TinyMCE (GCS):** Se completó la integración silenciosa del Content-Editor. Al copiar y pegar (Ctrl+V) imágenes directamente en el panel de texto enriquecido, el interceptor de imágenes del administrador sube el archivo binario automáticamente a Google Cloud Storage mediante /api/media/upload, convirtiéndolo a WebP nativo y devolviendo una etiqueta <img src> optimizada en CND sin interrupción del UX para el adminstrador.

## Requisitos de Despliegue en Render (IMPORTANTE)

Para que las imágenes y recursos de GCS funcionen en el servidor de producción (Render), se DEBEN configurar las siguientes variables de entorno en el Dashboard de Render:

1. **GCS_BUCKET_NAME**: El nombre del bucket de producción (ej: chatbot-tutor-medical-images).
2. **GCS_SERVICE_ACCOUNT_JSON**: Pega el contenido íntegro del archivo JSON de tu Service Account de Google Cloud. El sistema ahora lo parseará automáticamente para autenticarse sin necesidad del archivo físico en el servidor.

> Si tras configurar estas variables el error 404 persiste, verifica que la Service Account tenga el rol 'Storage Object Viewer' en el bucket correspondiente.

---

### [29/04/2026] Actualización: Gestión de Sesiones, Perfil y Estabilización

**Gestión de Perfil de Usuario (UX/UI):**
- **Modal de Edición de Nombre:** Se implementó la UI interactiva (`profile.html` y `profile.js`) permitiendo al usuario modificar su nombre visual. Los cambios se actualizan instantáneamente en la interfaz y en el backend mediante el método asíncrono `updateProfile`.
- **Invalidación de Caché:** Se configuraron incrementos de versión en la cadena de consulta (query string `?v=X`) al cargar scripts vitales como `profile.js`, `repaso.js` y `flashcards.js`, previniendo errores de "Uncaught ReferenceError" tras la integración de nuevos métodos.

**Estabilización del Flujo de Autenticación (Auth & Session):**
- **Sintaxis Crítica (Error Domino):** Se resolvió un error de sintaxis en `authApiService.js` que colapsaba al `SessionManager`, paralizando todo el sistema de sesión.
- **Inyección Transversal CSS (UI Manager):** Se corrigió la importación faltante de `modal.css` y `components.css` en `pricing.html`. Esto evitaba que la modal "Únete a Hub Academia" inyectada por el `uiManager` apareciera como un bloque de texto no formateado rompiendo la estructura inferior de la página web.
- **Seguridad en Modo Invitado (Null checks):** Se implementó un control de tipo riguroso sobre `localStorage.getItem('authToken')` en `repaso.js` comprobando los literales de cadena `'null'` o `'undefined'`. Esto previene a los usuarios invitados visualizar opciones destructivas exclusivas (Edición/Eliminación) en los mazos demo o saltarse la conversión (Paywall/Auth Prompt) al momento de iniciar tarjetas individuales.
- **Limpieza de Recursos Muertos (404 Not Found):** Se podaron dependencias de scripts no existentes (`aiApiService`, `courseApiService`, `bookApiService`) desde la cabecera del Admin Dashboard (`dashboard.html`), evitando interrupciones asíncronas perjudiciales para la carga del DOM en administradores.

---

### [30/04/2026] Actualización: Unificación de Diseño y Branding (Manta Black v3.0)

Se ejecutó una reingeniería estética total para transicionar de un esquema de grises azulados (Slate) a una identidad **Dark Mode Premium** basada en negro puro y acentos de luz neón.

**Infraestructura de Diseño (Source of Truth):**
- **DESIGN_SYSTEM.md:** Se creó el manifiesto de diseño oficial que centraliza la paleta de colores, tipografía y comportamientos de componentes.
- **Estandarización de Modales:** Se rediseñó el sistema de ventanas emergentes en `modal.css` siguiendo el patrón del "Modal de Edición de Perfil": fondo `#0a0a0a`, bordes con brillo azul (`var(--border-glow)`), radio de 24px y desenfoque de fondo de 12px.

**Purga Estética Global:**
- **Erradicación del Azulado Residual:** Se realizó una sustitución masiva en todo el directorio `/css/` eliminando colores como `#1e293b`, `#15172a` y similares. Fueron reemplazados por una escala de negros mate: `#050505` (Fondo), `#0a0a0a` (Superficie) y `#121212` (Elevación).
- **Refinamiento de Botones:** Los botones primarios ahora ostentan un gradiente de 135 grados de Azul a Púrpura, alineándose con la estética de "Hub Académico Inteligente".

**Aplicación en Páginas Críticas:**
- **Perfil de Usuario:** Se eliminaron los estilos inline antiguos y se actualizaron las tarjetas de configuración para usar el nuevo sistema de cristal (Glassmorphism) oscuro.
- **Admin Dashboard:** Se actualizaron las tarjetas KPI y el panel de IA para mejorar la legibilidad y el contraste sobre el fondo negro puro.
- **Precios y Autenticación:** Se unificaron los contenedores de planes y formularios de login para reflejar la robustez y modernidad de la plataforma.

**Correcciones de Estabilidad Post-Lanzamiento:**
- **Sincronización Reactiva de Biblioteca:** Se corrigió un error donde los "Favoritos" y "Guardados" no se cargaban inmediatamente tras iniciar sesión sin recargar la página. Ahora, el `LibraryUI` escucha activamente al `sessionManager` para disparar una re-inicialización del `LibraryService` apenas se detecta un usuario activo.
- **Renderizado de Iconos CSS:** Se eliminó un conflicto de renderizado en el estado vacío de la biblioteca que mostraba el código Unicode `\F002` en lugar del icono correspondiente, y se suprimió la duplicidad de iconos mediante pseudo-elementos CSS.
