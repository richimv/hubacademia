# 🎮 Documentación Técnica: Módulo de Autoevaluación de Recursos (Active Recall)

El **Módulo de Autoevaluación** es el componente de aprendizaje activo y autoevaluación inteligente de Hub Academia. Permite a los estudiantes realizar autoevaluaciones dinámicas personalizadas a partir de cualquier recurso de la biblioteca (libros, guías, normas, papers, etc.), aplicando técnicas de *Active Recall* y generación agéntica mediante Inteligencia Artificial.

---

## 1. Arquitectura del Módulo 🏛️

El módulo sigue estrictamente los principios de **Clean Architecture** (Arquitectura en Capas) y está completamente desacoplado de los simuladores especializados de carrera:

- **Capa de Presentación (Frontend)**: 
  - [self-evaluation.html](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/self-evaluation.html): Interfaz limpia de juego/autoevaluación con diseño oscuro y micro-animaciones.
  - [self-evaluation.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/self-evaluation.js): Controla el ciclo de juego (Game Loop), temporizadores por pregunta y el envío de respuestas.
  - [self-evaluation.css](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/css/self-evaluation.css): Estilos exclusivos del módulo.
- **Capa de Aplicación (Controller)**:
  - [selfEvaluationController.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/application/controllers/selfEvaluationController.js): Expone los endpoints de la API (`/api/self-evaluation/*`) y gestiona el flujo de juego en memoria.
- **Capa de Dominio (Service)**:
  - [selfEvaluationService.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/domain/services/selfEvaluationService.js): Orquesta la generación de preguntas a partir de un recurso utilizando Gemini 2.5 Flash Lite (Vertex AI), aplicando RAG semántico si el texto supera los 15,000 caracteres.
- **Capa de Datos (Repository)**:
  - [selfEvaluationRepository.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/domain/repositories/selfEvaluationRepository.js): Controla el registro seguro de límites de consumo diario en PostgreSQL.

---

## 2. Flujo de Juego End-to-End (The Game Loop) 🔄

### Fase 1: Configuración e Inicio 🚀
1. **Acceso desde el Recurso**: El usuario inicia la autoevaluación desde la vista de lectura de un libro o guía.
2. **Parámetros**: Se configuran la cantidad de preguntas (5 o 10) y la dificultad (Fácil/Dificil).
3. **Validación de Límites**: El middleware de cuotas evalúa el saldo disponible antes de llamar al backend.
4. **Inicio**: El frontend realiza un POST a `/api/self-evaluation/start` para gatillar el motor de IA.

### Fase 2: Gameplay ⚔️
- **Renderizado Responsivo**: Layout optimizado para PC (2 columnas) y móviles (apilado vertical).
- **Control de Tiempo**: Temporizador de 35 segundos por pregunta.
- **Vidas**: El jugador tiene 3 vidas. Cada respuesta incorrecta o vencimiento del temporizador resta una vida.
- **Puntaje**: Se asigna una puntuación acumulada de acuerdo a la velocidad de acierto.

### Fase 3: Retroalimentación y Cierre 🏆
- **Feedback Inmediato**: Al responder, el sistema muestra la explicación o sustento pedagógico detallado con soporte Markdown.
- **Ciclo Efímero**: Dado el carácter formativo del módulo, los resultados se evalúan en memoria y no saturan el historial del usuario ni se guardan permanentemente en tablas de ranking global.

---

## 3. Lógica de Generación IA y RAG Semántico 🧠

Para ofrecer preguntas de la más alta fidelidad sin comprometer los límites de tokens o costos de la API, el servicio aplica las siguientes reglas de enrutamiento de contexto:

1. **Remoción de Markup**: Se limpia todo el HTML de `content_html` para medir únicamente el texto plano real.
2. **Ruta Corta (< 15,000 caracteres)**: Inyecta el texto plano directamente en el prompt del modelo generativo.
3. **Ruta Extensa (>= 15,000 caracteres)**:
   - Se ejecuta un **RAG Semántico por Título**: Extrae de forma inteligente conceptos clave del título y realiza búsquedas de precisión vectorial en Pinecone.
   - **Generación Autónoma (Fallback)**: Si el RAG no devuelve fragmentos, la IA asume el rol de Quiz Master experto y genera preguntas utilizando su conocimiento base sobre el tema general del recurso.

---

## 4. Gestión de Cuotas y Límites Financieros 🪙

El módulo opera de manera independiente a la cuota mensual de flashcards o simulacros avanzados de medicina/educación:

- **Límite Diario Estricto**: Todo usuario (sin importar su suscripción) está sujeto a un tope de seguridad de **15 autoevaluaciones diarias** para evitar abusos automatizados de la API.
- **Consumo de Créditos**: 
  - Los usuarios **Free** consumen un crédito global de su saldo de `usage_count` (además de incrementar `daily_arena_usage`) por cada partida.
  - Los usuarios **Premium (Basic/Advanced)** no consumen vidas globales, solo están sujetos al tope diario de 15 partidas.

---
*Documentación técnica oficial de Hub Academia - Actualizada Mayo 2026*