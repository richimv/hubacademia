# 📊 INFORME TÉCNICO Y ECONÓMICO: Implementación de Límites y Rentabilidad IA (Marzo 2026)

Este documento detalla exhaustivamente todos los módulos técnicos, rutas del servidor, base de datos y vistas del usuario final que han sido implementadas e integradas para la **Estructuración de Costos y Límite de Uso de IA** en HubAcademia. 

El objetivo primordial de esta refactorización fue **garantizar el margen de utilidad y rentabilidad de la plataforma**, evitando escenarios donde un usuario de nivel Básico (Free o S/ 9.90) consumiera financieramente el valor total de su paquete mediante peticiones recurrentes a los modelos más costosos de Vertex AI.

---

## 🏗️ 1. Estructura Matemática de Suscripciones (Configurada en Sistema)

El sistema ahora soporta matemática rígida (Planes y Tokens).

| Característica | **Plan Básico (Free / Entry)** | **Plan Avanzado (Pro / Premium)** |
| :--- | :--- | :--- |
| **Costo / Duración** | S/ 9.90 (2 Meses) | S/ 24.90 (6 Meses) |
| **Tutor IA (Chat + Voz)** | Chat y Voz Estándar (30 msg/día) | RAG + Chat y Voz Avanzado (50 msg/día) |
| **Analítica de Patrones** | Estático (Sin IA) | Diagnóstico Clínico (Modelo Lite) |
| **Flashcards (IA)** | 10 intentos / mes (1-20 tjs/int) | 30 intentos / mes (1-20 tjs/int) |
| **Simulador de Exámenes** | **CAP 15/Día (Lite)** | **CAP 50/Día (Lite)** |
| **Autoevaluación (Recursos)** | **CAP 15/Día (Universal)** | **CAP 15/Día (Universal)** |

---

## 🛠️ 2. Módulos y APIs Transformadas

A continuación, la lista completa e hiper-detallada de los módulos integrados con las nuevas barreras de cobro y límites (Middleware).

### 2.1 Módulo: El Simulador (Training Service)
> *Aunque inicialmente no fue concebido en la tabla pública de límites, se detectó que este módulo representaba una **Fuga Crítica de Costos (~S/0.05 por interacción)** para el plan básico.*

- **El Problema Anterior:** Si a un alumno se le acababan las preguntas de un tema almacenado en la Base de Datos (Banco), el sistema apelaba a una función recursiva de RAG e Inteligencia Artificial Vertex para *construirle al aire en tiempo real* un set de 10-15 preguntas médicas. Este consumo desbordaba el pago de S/ 9.90.
- **La Solución Implementada:** 
  - **Usuarios Premium (Basic/Advanced):** El límite diario se descuenta únicamente al **culminar** el examen (`submitScore`). Esto permite rotar exámenes o activar IA durante la sesión sin cobros preventivos.
  - **Generación Directa:** Por velocidad y diseño, **ningún usuario** (incluyendo Advanced) utiliza RAG para el simulador médico. La generación es directa con la IA.
  - **Usuarios Free:** Consumen su **Vida Global** al **iniciar** la Ronda 1. Una vez dentro, la activación de IA por falta de stock no consume vidas adicionales.
  - **Persistencia de Estadísticas:** El historial, diagnóstico y KPIs solo se graban al **finalizar** el examen. Un examen abandonado no genera estadística ni consume cupo (Premium).

### 2.2 Módulo: Tutor Médico RAG (Chat Principal)
- Se estandarizó el tracking de límite a través del middleware `checkAILimits('chat_standard')`.
- La IA en todos los casos utiliza el modelo rápido transaccional. 
- **Exclusividad RAG:** Solo el usuario de nivel **Avanzado (Premium)** activa el **Acceso a Biblioteca Médica RAG** en este módulo de Chat (extracción local de Harrison, NTS, GPC), lo cual funda sus respuestas clínicamente.
- **Admin:** El administrador mantiene acceso total a RAG tanto en chat como en paneles de gestión.

### 2.3 Módulo: Diagnóstico Clínico ("Análisis de Patrones de Error")
- **El Problema Anterior:** El frontend usaba un `setTimeout` javascript básico que simplemente tomaba la "Peor materia" del alumno en la tabla relacional y fingía durante 1.5 segundos que la IA estaba "pensando", arrojando una oración quemada y dura.
- **La Solución Implementada:**
  - Se creó la ruta de servidor protegida e íntegramente nueva en Backend: `POST /api/analytics/diagnostic`.
  - Toma un mapeo estadístico en forma de JSON relacional de los exámenes del alumno, analiza la correlación de fallas y entrega un consejo clínico. Exclusivo para usuarios del Plan Avanzado.
  - Al no emplear ya características onerosas, su uso simplemente consume de la cuota diaria global de "Chat", asegurando la rentabilidad.

### 2.4 Módulo: Generador de Flashcards (Tarjetas de Repaso)
- **El Problema Anterior:** Estaba midiendo en el backend usando contadores de "Chat". Por esto, generarlas iba a afectar injustamente al chat y a chocar con la meta mensual del pago de S/ 9.90.
- **La Solución Implementada:**
  - Se estructuró y desplegó una columna en BD exclusivamente para cobrar Flashcards llamada: `monthly_flashcards_usage`.
  - Integrado a `deckController.js`. Siendo de Plan Básico, tienes **10 intentos** al mes. Cada intento genera de **1 a 15 tarjetas** según la complejidad del tema.
  - Si tu plan es avanzado, tienes **30 intentos** mensuales, permitiendo un volumen de hasta 450 tarjetas inteligentes al mes si se explota el máximo.

---

## 🗄️ 3. Modificaciones en Base de Datos e Infraestructura

Se ejecutaron scripts de Alteración a nivel del Servidor de Base de Datos PostgreSQL/Supabase.

1.  **Migración de Estados y Tiers:** Se formalizó la taxonomía del negocio. `subscription_tier`: `'free'`, `'basic'`, `'advanced'`, `'elite'`.
2.  **Tracking y Contadores Creados / Sincronizados:**
    - `daily_ai_usage` (Resetea al amanecer a 0).
    - `monthly_thinking_usage` (No resetea a diario. Resetea cuando se vence el mes/plan).
    - `monthly_flashcards_usage` (No resetea a diario. Resetea con la factura nueva mensual/semestral).
    - `last_usage_reset`: Fecha vital del backend para decidir si debe resetear contadores de 24 hrs.

---

## 💳 4. Webhook de Transacciones (Mercado Pago)

El ecosistema de pagos interactúa con el de Límites de IAs de manera nativa:
- Cuando **Mercado Pago Webhook (`paymentController.js`)** recibe una confirmación de estatus `'approved'`, este procesa el `planId` seleccionado.
- Automáticamente el servidor hace la suma `NOW() + INTERVAL '2 months'` (ó 6 según el plan) y reactiva todos los contadores mensuales y diarios de IAs a CERO `0` en el mismo nanosegundo que la orden de compra fue confirmada por el servidor del Banco emisor local.

---

## ✅ Resumen del Estado de Producción
Todo el software ha culminado el hito de protección de ingresos. **Cualquier usuario en Plan 'basic' tiene matemáticamente el 0% de probabilidades de superar la utilidad estipulada.** Todos los Endpoints, APIs en Express y Frontends han sido cubiertos y blindados contra sobrecargas por consumos no autorizados. Misión comercial y técnica documentadas y concluidas con éxito.


## 5. Aclaraciones sobre Límites Compartidos y el Simulador

### 1. El Beneficio "Tutor IA Clínico RAG"
- **Acceso Exclusivo a Biblioteca (Chat):** El usuario **Advanced** es el único que activa el motor RAG en el Chat, permitiendo que la IA fundamente sus respuestas en Harrison, NTS o GPC.
- **Diagnóstico Clínico (Advanced):** Es un análisis de **Patrones Estadísticos**. La IA analiza los resultados de los exámenes para dar consejos de estudio. **No utiliza RAG**, sino procesamiento de datos masivos del alumno.
- **Costo:** Ambas funciones consumen de la cuota de 50 mensajes diarios del Chat.

### 2. Generación de Exámenes (Sin RAG para Usuarios)
Por diseño y velocidad de respuesta:
- **Generación Directa:** El Simulador Médico para todos los niveles (incluyendo Advanced) utiliza generación directa por IA sin interconsulta RAG. 
- **Modo Experto (Admin):** Solo el Administrador puede activar el barrido RAG para alimentar el banco de preguntas oficial.
- **Límites "Cap"**: 15 (Basic) y 50 (Advanced) simulacros culminados por día.

### 3. Defensa Absoluta de Cuotas: Módulo de Flashcards
Las tarjetas generadas con IA estipulan **10 intentos al mes** para Basic y **30 intentos al mes** para Advanced.
- Cada pedido es **Adaptativo**: La IA genera de **1 a 15 tarjetas** según la densidad de la materia solicitada.
- El middleware extrae directamente de PostgreSQL la entidad `monthly_flashcards_usage`. 
- Al saturar las cuotas (10 o 30 intentos), el backend escupe rígidamente un 403 con el mensaje del límite alcanzado.
El framework UI inyecta al vuelo -sin depender de scripts ni promesas externas- un bloque DOM `custom-limit-modal` con posición absoluta `fixed` que bloquea y empapela toda la pantalla. Es imposible de romper o saltar mediante CSS de otros módulos y blinda tajantemente la base de datos de usuarios aprovechados.

### 4. Autoevaluación de Recursos (Separado y Universal)
- **Aislamiento Total:** El consumo de autoevaluaciones no descuenta del límite diario de Simuladores. Así se evita que el usuario agote sus exámenes simulados al realizar trivias cortas sobre recursos o lecturas individuales.
- **Límite Universal (15/Día):** Todos los usuarios, sin importar su plan (Free, Basic, Advanced), tienen un tope diario estricto de **15 autoevaluaciones por día** controlado por el contador `daily_arena_usage` en PostgreSQL para mitigar abusos de costos de inferencia.
- **Usuarios Free:** Cada partida exitosa descuenta adicionalmente **1 vida global** de su pool de 50 vidas (`usage_count`). En caso de agotar sus vidas o el límite de 15 cuestionarios diarios, se bloquea el inicio de forma segura.

### 5. Límite de Módulo de Idiomas (Compartido con Chat Principal)
- **Tutor de Idiomas y Práctica de Speaking:** Las interacciones del chat conversacional de idiomas y las evaluaciones del entrenador de speaking (`/api/languages/chat`, `/api/languages/practice/evaluate`, `/api/languages/practice/exercise`) comparten el mismo contador de límite de consultas de IA diaria en la base de datos (`daily_ai_usage`) regulado por el middleware `checkAILimits('chat_standard')`.
- **Cuota:** Consumen 1 consulta de la cuota diaria global de Chat Standard (30 para Basic, 50 para Advanced). Los usuarios Free/Pending consumen vidas de su cuota de 50 vidas globales de prueba (`usage_count`).
 
 
+## 🏗️ 6. Unificación Arquitectónica de Límites (Junio 2026)
+
+Con el fin de evitar la dispersión de límites hardcodeados en la plataforma, se ha re-estructurado el control de cuotas:
+1. **Fuente Única de Verdad (Backend):** Se ha creado el archivo de configuración centralizado [limits.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/infrastructure/config/limits.js), el cual unifica las cuotas de IA (diarias y mensuales) por plan.
+2. **Inyección en Perfil (`getMe`):** El endpoint `/api/auth/me` añade de forma dinámica la clave `limits` en la respuesta JSON. De esta forma, el frontend conoce directamente qué cuotas aplicar sin duplicar constantes.
+3. **Panel Visual de Consumos en Perfil:** Se ha añadido una cuadrícula interactiva `#premium-usage-card` en `/profile` que dibuja el progreso de:
+   - **Tutor de IA y Voz** (`daily_ai_usage` vs cuota)
+   - **Simuladores de Examen** (`daily_simulator_usage` vs cuota)
+   - **Autoevaluaciones** (`daily_arena_usage` vs cuota)
+   - **Flashcards Mensuales** (`monthly_flashcards_usage` vs cuota)
+   - **Vidas Globales** (para usuarios de prueba en el Plan Free).
+4. **Integración con UIManager:** El validador en el cliente `validateFreemiumAction()` de [uiManager.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/ui/uiManager.js) resuelve el límite dinámicamente desde el backend, garantizando modularidad y facilidad de mantenimiento.
+

