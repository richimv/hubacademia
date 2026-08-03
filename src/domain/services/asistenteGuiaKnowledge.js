/**
 * 📚 ASISTENTE GUÍA KNOWLEDGE BASE (Hub Academia)
 * Módulo de respuestas estáticas de alta velocidad (0ms latencia, 0 costo IA).
 * Funciona al 100% como centro de orientación efímero para todos los usuarios.
 * Especialidades oficiales: SERUMS (Salud/Medicina) y ASCENSO (Educación Magisterial).
 */

class AsistenteGuiaKnowledge {
    constructor() {
        const visitorPills = [
            "1. 🚀 Servicios y Simuladores",
            "2. 💳 Planes y Precios",
            "3. 💡 Sustento Oficial y Ventajas",
            "4. 🔑 ¿Cómo registrarme?"
        ];

        const registeredPills = [
            "1. 🚀 Servicios y Simuladores",
            "2. 💳 Planes y Precios",
            "3. 💡 Sustento Oficial y Ventajas"
        ];

        this.pills = {
            visitor: visitorPills,
            registered: registeredPills
        };

        this.responses = {
            servicios: {
                intencion: "informacion_servicios",
                respuesta: `### 🎓 Servicios y Simuladores en Hub Academia

En **Hub Academia** acompañamos tu preparación profesional enfocándonos exclusivamente en **dos grandes pilares oficiales en el Perú**:

1. **🩺 Medicina y Salud — SERUMS**
   - **Simuladores de Examen**: Banco de preguntas oficiales fundamentadas en las **Normas Técnicas de Salud (NTS) del MINSA** y Guías de Práctica Clínica (GPC).
   - **Modos de Evaluación**: Modo Rápido (10q), Modo Estudio con explicación técnica (20q) y Simulacro Real con temporizador (100q).
   - 👉 [Ver simulador de SERUMS](/simulator-dashboard?context=MEDICINA)

2. **🎓 Educación Magisterial — ASCENSO Docente**
   - **Simuladores de Didáctica y Casuística**: Evaluaciones basadas en el **Currículo Nacional (CNEB)**, el **Marco del Buen Desempeño Docente** y la **RVM 094-2020-MINEDU**.
   - **Especialidades**: Inicial, Primaria, Secundaria y áreas pedagógicas.
   - 👉 [Ver simulador de ASCENSO](/simulator-dashboard?context=EDUCACION)

3. **🎴 Módulo Repaso (Flashcards Inteligentes)**
   - **Memorización Activa y Algoritmo SM-2**: Afianza conceptos clave evaluando tu retención (*Olvidé*, *Difícil*, *Bien*, *Fácil*) para optimizar tus intervalos de estudio.
   - **Creación de mazos y tarjetas**: Crea tus propios mazos de flashcards y tarjetas.
   - **Tutor IA Contextual**: Resuelve dudas específicas directamente en cada tarjeta de repaso.
   - 👉 [Ir a Módulo Repaso](/repaso)

4. **📚 Mi Biblioteca (Centro de Recursos, Apuntes y Noticias)**
   - **Gestión Unificada de Notas**: Almacena, organiza y repasa tus apuntes guardados durante los simulacros o sesiones de chat con la IA.
   - **Noticias Oficiales y Novedades Normativas**: Consulta información en tiempo real sobre convocatorias, cronogramas, resoluciones del **MINSA (Salud)** y del **MINEDU (Educación)**.
   - 👉 [Ir a Mi Biblioteca](/library)`,
                sugerencias: this.pills.visitor
            },

            precios: {
                intencion: "informacion_precios",
                respuesta: `### 💳 Planes y Precios Transparentes

Contamos con opciones flexibles diseñadas a tu medida para tu preparación hacia el **SERUMS** o el **ASCENSO**:

* **🌱 Plan Free (Prueba Gratuita)**:
  - **20 Vidas de prueba gratis** automáticas al ingresar con tu cuenta de Google.

* **⚡ Plan Basic (Acceso Estándar)**:
  - **Simuladores ilimitados** para tu especialidad (SERUMS o ASCENSO).
  - Diagnóstico de rendimiento por áreas temáticas y gráficos de evolución.

* **⭐ Plan Advanced (Experiencia Total + IA)**:
  - **Acceso Ilimitado Total** a simuladores de examen y banco de preguntas.
  - **Tutor IA Contextual con RAG Semántico** en cada pregunta de simulacro y tarjeta de repaso.
  - Generación inteligente de Flashcards automatizadas con Inteligencia Artificial.

👉 [💎 Ver Tabla de Planes y Precios](/pricing)`,
                sugerencias: this.pills.visitor
            },

            acceso: {
                intencion: "informacion_acceso",
                respuesta: `### 🔑 ¿Cómo registrarme?

Registrarte en la plataforma es **instantáneo y 100% gratuito**, sin formularios extensos:

1. **Paso 1**: Haz clic en el botón **"Acceder"** ubicado en la barra superior.
2. **Paso 2**: Selecciona tu cuenta de **Google** (vía selección de correos o Google One Tap).
3. **Paso 3**: ¡Listo! Tu acceso se activará en 1 clic y recibirás automáticamente **20 vidas de prueba gratis** para rendir simulacros oficiales de **SERUMS** o **ASCENSO**.`,
                sugerencias: this.pills.visitor
            },

            ventajas: {
                intencion: "informacion_ventajas",
                respuesta: `### 💡 Sustento Oficial y Ventajas Exclusivas

* **🏛️ Rigor y Sustento Oficial**: Nuestras respuestas y explicaciones no son genéricas; están fundamentadas rigurosamente en la normativa peruana vigente (**NTS MINSA / GPC** para Salud y **CNEB / RVM 094-2020-MINEDU** para Educación).
* **🎯 Especialización Exclusiva**: Nos dedicamos al 100% a los dos procesos con mayor demanda profesional en el Perú: **SERUMS** y **ASCENSO**.
* **📊 Analítica y Diagnóstico de Fortalezas**: Mide tu evolución por áreas pedagógicas y médicas antes del examen real.
* **🧠 Tutor IA Contextual con RAG**: En nuestro Plan Advanced, el Tutor IA fundamenta cada duda citando la norma o manual oficial correspondiente.`,
                sugerencias: this.pills.visitor
            },

            invalida: {
                intencion: "opcion_invalida",
                respuesta: `⚠️ **Opción no válida.**

Por favor, ingresa una opción correcta:

1. **🚀 Servicios y Simuladores**
2. **💳 Planes y Precios**
3. **💡 Sustento Oficial y Ventajas**
4. **🔑 ¿Cómo registrarme?**`,
                sugerencias: this.pills.visitor
            }
        };
    }

    getVisitorPills() {
        return this.pills.visitor;
    }

    getRegisteredPills() {
        return this.pills.registered;
    }

    matchIntent(message) {
        if (!message || typeof message !== 'string') return this.responses.servicios;

        const raw = message.trim();
        const normalized = raw
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();

        // 1. Coincidencia directa por número de opción (1, 2, 3, 4)
        if (normalized === '1' || normalized === '1.' || normalized.startsWith('1 ') || normalized.startsWith('1.')) {
            return this.responses.servicios;
        }
        if (normalized === '2' || normalized === '2.' || normalized.startsWith('2 ') || normalized.startsWith('2.')) {
            return this.responses.precios;
        }
        if (normalized === '3' || normalized === '3.' || normalized.startsWith('3 ') || normalized.startsWith('3.')) {
            return this.responses.ventajas;
        }
        if (normalized === '4' || normalized === '4.' || normalized.startsWith('4 ') || normalized.startsWith('4.')) {
            return this.responses.acceso;
        }

        // 2. Coincidencias por palabras clave
        if (
            normalized.includes('servicio') ||
            normalized.includes('simulador') ||
            normalized.includes('serums') ||
            normalized.includes('ascenso') ||
            normalized.includes('biblioteca') ||
            normalized.includes('repaso') ||
            normalized.includes('que ofrece') ||
            normalized.includes('que tienen')
        ) {
            return this.responses.servicios;
        }

        if (
            normalized.includes('precio') ||
            normalized.includes('plan') ||
            normalized.includes('costo') ||
            normalized.includes('cuanto cuesta') ||
            normalized.includes('suscripcion') ||
            normalized.includes('basic') ||
            normalized.includes('advanced')
        ) {
            return this.responses.precios;
        }

        if (
            normalized.includes('acceder') ||
            normalized.includes('acceso') ||
            normalized.includes('registro') ||
            normalized.includes('registra') ||
            normalized.includes('crear cuenta') ||
            normalized.includes('cuenta gratis') ||
            normalized.includes('google') ||
            normalized.includes('ingresar') ||
            normalized.includes('como me uno') ||
            normalized.includes('pasos')
        ) {
            return this.responses.acceso;
        }

        if (
            normalized.includes('ventaja') ||
            normalized.includes('sustento') ||
            normalized.includes('por que') ||
            normalized.includes('oficial') ||
            normalized.includes('minsa') ||
            normalized.includes('minedu')
        ) {
            return this.responses.ventajas;
        }

        // 3. Fallback cuando la entrada no coincide con ninguna opción válida
        return this.responses.invalida;
    }
}

module.exports = new AsistenteGuiaKnowledge();
