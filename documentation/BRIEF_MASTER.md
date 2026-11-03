# 🏛️ PROJECT BRIEF MAESTRO: HUB ACADEMIA (2026)
> **Fuente Central de Verdad de Negocio, Producto y Arquitectura Técnica**  
> **Ecosistema Web:** `hubacademia.com` | **Subdominio Inicial:** `docentes.hubacademia.com`  
> **Versión del Sistema:** V7.0 Corporate & Enterprise AI (Noviembre 2026) | **Infraestructura:** 100% Vercel Serverless

---

## 1. 📌 Resumen Ejecutivo y Tesis de Transformación

### 1.1 ¿Qué es Hub Academia?
**Hub Academia** es una empresa peruana de Inteligencia Artificial aplicada, enfocada en democratizar herramientas inteligentes de productividad, estudio activo y evaluación profesional rigurosa para el **magisterio nacional del Perú** y profesionales de la salud.

La plataforma evoluciona desde un portal de simuladores hacia un **ecosistema integral de herramientas con IA**, estructurado bajo cuatro productos operativos inmediatos y una hoja de ruta de formación asíncrona en video, consultoría institucional y divulgación científica.

### 1.2 Misión y Visión Corporativa
*   **Misión:** Potenciar el criterio pedagógico y la capacidad resolutiva del profesional peruano mediante herramientas inteligentes, fundamentadas rigurosamente en marcos normativos oficiales (CNEB, MBDD, MINSA) y arquitecturas éticas de IA sin alucinaciones.
*   **Visión al 2030:** Ser la empresa líder del Perú en soluciones de Inteligencia Artificial aplicada a la educación básica y superior, reconocida por su contribución tangible a la reducción de la sobrecarga burocrática docente y la soberanía del criterio humano.

### 1.3 Pilares Innegociables
1.  **Soberanía Pedagógica:** La IA asiste y amplifica el criterio del educador; nunca lo sustituye ni genera automatizaciones que vulneren el enfoque por competencias.
2.  **100% Reactivos Oficiales Auditados:** Erradicación total de preguntas sintéticas generadas por IA. Toda casuística proviene de exámenes nacionales oficiales del MINEDU y MINSA.
3.  **Gobernanza Google Enterprise AI:** Operación exclusiva sobre Google Cloud Vertex AI (cuentas IAM corporativas). Prohibición absoluta de API keys o servicios prepago de Google AI Studio.
4.  **Transparencia Transaccional:** Pasarela de pago 100% automatizada vía Mercado Pago Perú en modalidad de pago único (cero suscripciones forzosas y cero cobros manuales por WhatsApp).

---

## 2. 🏛️ Arquitectura Técnica de 4 Capas (Clean Architecture)

El sistema opera bajo un desacoplamiento estricto de responsabilidades, distribuido en cuatro capas independientes:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            1. PRESENTATION LAYER                            │
│  - Frontend Vanilla JS (ES6+), HTML5 Semántico, CSS3 Modular (landing.css,  │
│    base.css, footer.css, legal.css, pricing.css)                            │
│  - Design System Dual-Theme: Matte Black (#050505/#121212) & Studio Slate   │
│  - Prohibición Estricta de Superficies Azules en Dark Mode                  │
│  - Vistas: /index, /pricing, /privacy, /terms, /simulators, /repaso, /library│
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP REST / JWT / Eventos
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                            2. APPLICATION LAYER                             │
│  - Express Controllers: docenteController, medicoController, flashcardController,│
│    paymentController, assistantController, authController                   │
│  - Middlewares: authIdentityMiddleware (JWT Supabase), checkLimitsMiddleware │
│    (control de cuotas Mercado Pago), rateLimitMiddleware                     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Invocación de Servicios
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                              3. DOMAIN LAYER                                │
│  - Servicios de Negocio: tutorAiService, docenteService, medicoService,      │
│    flashcardService (Algoritmo SM-2 y Notas), assistantGuideService         │
│  - Base de Conocimiento Estática: asistenteGuiaKnowledge.js                 │
│  - CERO Generación Sintética de Preguntas (Sniper-RAG 100% Retirado)         │
│  - Prompt Templates Oficiales: CNEB, MBDD, NTS-MINSA                        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Drivers & Conectores
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                           4. INFRASTRUCTURE LAYER                           │
│  - Hosting & Compute: 100% Vercel Serverless Functions (Cero Render)        │
│  - Base de Datos Relacional: Supabase PostgreSQL con RLS y explicit GRANTs  │
│  - Motor de IA: Google Cloud Vertex AI (Gemini 3.6 Flash Lite / Flash)      │
│  - Pasarela de Pago: Mercado Pago SDK Perú (Webhooks verificados HMAC)      │
│  - Almacenamiento Estático: Google Cloud Storage (Assets documentales)      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. ☁️ Justificación Técnica: Migración Integral de Render a Vercel Serverless

El proyecto descontinúa de manera definitiva el uso de servidores en Render (`onrender.com`), consolidando toda su infraestructura en **Vercel Serverless Functions**.

### Matriz Comparativa de Decisión de Infraestructura

| Criterio Técnico | Arquitectura Render (Descontinuada) | Vercel Serverless (Estándar Oficial) | Impacto para Hub Academia |
| :--- | :--- | :--- | :--- |
| **Modelo de Cómputo** | Contenedor monolítico Always-On / Sleep | Funciones Serverless orientadas a eventos | Eliminación de costos de cómputo ocioso y recursos redundantes. |
| **Latencia en Perú** | ~450ms (Servidores en US-East / Frankfurt) | ~80–120ms (Nodos Edge en Sudamérica / Brasil) | Carga instantánea de la landing page y respuesta ágil del Tutor IA. |
| **Manejo de Picos** | Escalado lento (reinicio de contenedores) | Escalado elástico instantáneo de micro-instancias | Soporta concurrencia masiva durante el día de pruebas nacionales MINEDU. |
| **Cold Starts** | 45–60 segundos tras inactividad en planes bajos | < 800ms en el primer arranque serverless | Cero abandono de usuarios al ingresar desde dispositivos móviles. |
| **Despliegues** | Recompilación lenta de Dockerfile | Despliegues atómicos globales con Preview URLs | Integración continua limpia y reversión instantánea (rollbacks seguros). |
| **Subdominios** | Configuración manual compleja de reverse-proxy | Gestión nativa multi-dominio (`docentes.hubacademia.com`) | Consolidación del ecosistema bajo un mismo proveedor de CDN y SSL. |

---

## 4. 🤖 Gobernanza de Inteligencia Artificial (Google Enterprise AI / Vertex AI)

Toda la infraestructura de IA opera y operará de forma obligatoria y exclusiva sobre **Google Cloud Vertex AI (Gemini Enterprise Agent Platform)**.

### 4.1 Prohibición Absoluta de Google AI Studio
Está terminantemente prohibido utilizar, recomendar o integrar Google AI Studio (`generativelanguage.googleapis.com` o API keys prepago). AI Studio exige recargas manuales por tarjeta incompatibles con la arquitectura y facturación de producción empresarial.

### 4.2 Estándar de Modelos y Retiro de Gemini 2.5
*   Los modelos de la familia 2.5 (`Gemini 2.5 Flash Lite`, `Gemini 2.5 Flash`, `Gemini 2.5 Pro`) entran en fase de retiro programado en Google Cloud (retirada pública: 20 de octubre de 2026; discontinuación: principios de 2027).
*   El modelo estándar oficial para Hub Academia es **`Gemini 3.6 Flash Lite`** (y `Gemini 3.6 Flash` para tareas de alta densidad documental).

### 4.3 Directrices de Parámetros y Reasoning
1.  **Retiro de Parámetros de Muestreo Depreciados:** Queda prohibido enviar `temperature`, `top_p`, `top_k` o `thinking_budget` en llamadas a modelos de la generación Gemini 3.
2.  **Adopción de `thinking_level`:** Se controla la profundidad del razonamiento lógico mediante el parámetro oficial `thinking_level`.
3.  **Circulación Obligatoria de Firmas de Pensamiento (*Thought Signatures*):** En diálogos interactivos multi-turno con el Tutor IA, el sistema registra las firmas de pensamiento recibidas y las reenvía íntegras en las solicitudes de seguimiento (*follow-up*) para preservar la deducción lógica clínica y pedagógica.
4.  **Durable Caching y Parches Ephemeral:** El sistema aprovecha el almacenamiento en caché persistente (24 horas por defecto en Vertex AI) para reducir costos y latencia en el contexto normativo curricular. En caso de requerir almacenamiento volátil, se despacha un PATCH con modalidad `EPHEMERAL`.
5.  **Ruta hacia Interactions API:** Arquitectura preparada para migrar los controladores conversacionales hacia la Google Interactions API.

---

## 5. 🚫 Erradicación Total de la Generación Sintética de Preguntas (Retiro de Sniper-RAG)

> [!CAUTION]
> ### Política de Calidad Psicométrica: Cero Reactivos Sintéticos
> El pipeline denominado "Sniper-RAG" y cualquier generador automático de preguntas mediante IA han sido **desmantelados y retirados en su totalidad del código fuente**.

1.  **Integridad Académica:** Las evaluaciones para ascenso de escala magisterial y plazas médicas SERUMS determinan la estabilidad laboral y económica de los profesionales peruanos. No es admisible exponerlos a reactivos generados sintéticamente que puedan presentar ambigüedades, sesgos o distractores inválidos.
2.  **Bancos 100% Reales y Auditados:** Todos los reactivos provienen de pruebas nacionales oficiales administradas por el MINEDU y el MINSA, auditados previamente por especialistas en contenido y almacenados en Supabase PostgreSQL.
3.  **Rol Restringido de la IA:** Vertex AI interviene exclusivamente como **Tutor Reflexivo Post-Examen**, guiando al estudiante a comprender la fundamentación pedagógica o clínica de la respuesta correcta mediante el método socrático.

---

## 6. 🧰 Catálogo de Productos Operativos vs. Roadmap Futuro

```
                                  Ecosistema Hub Academia
                                             │
         ┌───────────────────────────────────┴───────────────────────────────────┐
         ▼                                                                       ▼
[Herramientas Activas en UI]                                         [Temas en Maduración - Roadmap]
• Docentes Inicial (docentes.hubacademia.com)                        • Campus Asíncrono de Videos:
• Simuladores Oficiales (MINEDU + SERUMS)                              - Planificación Curricular Anual (PCA)
• Repaso y Notas (SM-2 + Libreta de Notas con IA)                      - Unidades y Proyectos de Aprendizaje
• Biblioteca de Consulta Directa                                       - Sesiones de Aprendizaje
                                                                       - Rúbricas RVM 094-2020-MINEDU
                                                                     • Consultoría y Talleres a Colegios / UGEL
                                                                     • Boletín de Investigación en IA
```

---

## 7. 🔒 Seguridad, Base de Datos y Políticas Supabase (ACT-04)

### 7.1 Mandato ACT-04: Sentencias Explícitas de GRANT en Esquema `public`
En cumplimiento del comunicado técnico oficial de Supabase, toda nueva tabla, vista o función creada dentro del esquema `public` debe incluir sentencias explícitas de asignación de privilegios:

```sql
-- Estándar Mandatorio para Migraciones Supabase
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.nombre_tabla TO authenticated;
GRANT SELECT ON TABLE public.nombre_tabla TO anon;
GRANT ALL ON TABLE public.nombre_tabla TO service_role;
```

### 7.2 Row Level Security (RLS) Estricto
*   Cada tabla con datos de usuario (`user_profiles`, `user_progress`, `user_notes`, `user_decks`, `user_payments`) opera bajo RLS activo.
*   Políticas de lectura y escritura restringidas a `auth.uid() = user_id`.
*   Aislamiento estricto de credenciales: Service Accounts de GCP y llaves `service_role` de Supabase se ejecutan exclusivamente en Node.js serverless del lado del servidor.

---

## 8. 💳 Monetización y Transaccionalidad Exclusiva vía Mercado Pago

*   **Pasarela Automatizada:** Integración oficial vía Mercado Pago SDK Node.js con webhooks autenticados mediante firma `x-signature` (HMAC-SHA256).
*   **Catálogo de Tarifas Transparentes:**
    *   **Acceso Libre:** S/ 0 (10 créditos de práctica y acceso abierto a biblioteca).
    *   **Plan Básico:** S/ 9.90 (Acceso total por 60 días en pago único).
    *   **Plan Avanzado:** S/ 24.90 (Acceso total por 120 días con analítica y Tutor IA en pago único).
*   **Retiro Definitivo de Flujos Manuales:** Cero números telefónicos de WhatsApp, cero códigos QR de Yape manual y cero validaciones informales de capturas de pantalla.

---

## 9. 🔍 Marcado Semántico y Cumplimiento SEO Google Merchant (ACT-05 / ACT-06)

Las páginas de aterrizaje (`index.html` y `pricing.html`) implementan datos estructurados JSON-LD conformes a los lineamientos oficiales de Google Search Console:

*   **ACT-05 (Fichas de Comerciante):** Inclusión obligatoria de `hasMerchantReturnPolicy` (plazo de 7 días, garantía y reembolso) y `shippingDetails` (costo S/ 0.00 por tratarse de entrega digital inmediata en el territorio peruano `addressCountry: "PE"`).
*   **ACT-06 (Fragmentos de Producto):** Inclusión mandatoria de `aggregateRating` (valoración 4.9/5 basada en egresados reales) y matriz de `review` con fecha de publicación y testimonio verificado.

---

*Documento Maestro de Arquitectura y Negocio.*  
*Hub Academia — Lima, Perú.*
