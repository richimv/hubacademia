/**
 * ASISTENTE GUÍA KNOWLEDGE BASE (Hub Academia)
 * Respuestas locales para opciones de menú y respaldo del servicio de atención Hubi.
 * Orienta a visitantes y usuarios sobre el ecosistema de Inteligencia Artificial
 * y herramientas operativas de Hub Academia en el Perú.
 */

class AsistenteGuiaKnowledge {
    constructor() {
        const visitorPills = [
            "1. Herramientas y Ecosistema",
            "2. Planes y Mercado Pago",
            "3. Sustento Oficial y Ventajas",
            "4. ¿Cómo registrarme?"
        ];

        const registeredPills = [
            "1. Herramientas y Ecosistema",
            "2. Planes y Mercado Pago",
            "3. Sustento Oficial y Ventajas"
        ];

        this.pills = {
            visitor: visitorPills,
            registered: registeredPills
        };

        this.responses = {
            servicios: {
                intencion: "informacion_servicios",
                respuesta: `### Herramientas Operativas en Hub Academia

**Hub Academia** es un ecosistema peruano de soluciones e **Inteligencia Artificial aplicada**, con foco prioritario en el magisterio nacional y herramientas especializadas de evaluación profesional:

1. **Plataforma Docente Inicial (\`docentes.hubacademia.com\`)**
   - Entorno especializado del ecosistema diseñado para docentes de **Educación Inicial** en el Perú.
   - [Abrir Docentes Inicial](https://docentes.hubacademia.com/)

2. **Simuladores de Exámenes Oficiales**
   - **Educación Magisterial (MINEDU)**: Entrenamiento para **Ascenso Docente (Base 90)** con bancos oficiales auditados bajo el **CNEB**, el **Marco del Buen Desempeño Docente** y la **RVM 094-2020-MINEDU**.
   - **Vertical Salud (SERUMS)**: Herramienta especializada con bancos oficiales del **MINSA**, Normas Técnicas de Salud (NTS) y Guías de Práctica Clínica (GPC) en modos Rápido (10q), Estudio (20q) y Real (100q).
   - [Ir a Simuladores de Exámenes](/simulator-dashboard?context=EDUCACION)

3. **Repaso Espaciado (SM-2) y Notas Unificadas**
   - **Flashcards con Algoritmo SuperMemo-2**: Optimiza tu retención evaluando cada tarjeta (*Olvidé*, *Difícil*, *Bien*, *Fácil*).
   - **Mis Notas Integradas**: Crea apuntes personales y conserva explicaciones guardadas directamente desde el Tutor IA en un solo lugar.
   - [Ir a Repaso y Notas](/repaso)

4. **Boletín informativo de Inteligencia Artificial**
   - Contenidos, novedades y divulgación sobre inteligencia artificial en el Perú y el mundo, con foco en educación, ciencia y trabajo profesional.
   - [Explorar el Boletín IA](/library)`,
                sugerencias: this.pills.visitor
            },

            precios: {
                intencion: "informacion_precios",
                respuesta: `### Planes Transparentes y Pago Exclusivo con Mercado Pago

Todos nuestros planes de pago son de **pago único**, sin cargos recurrentes ni renovaciones automáticas, procesados al 100% de forma segura y con activación inmediata vía **Mercado Pago**:

* **Plan Gratuito (Inicio)**:
  - **10 vidas mensuales** renovadas automáticamente cada 30 días para explorar simulacros oficiales.

* **Plan Básico — S/ 9.90 (Acceso por 2 meses)**:
  - **15 Simulacros Oficiales Curados/Día**.
  - Flashcards ilimitadas, Mis Notas y carga Excel (3 archivos/día).
  - Tutor Académico Estándar y diagnóstico estadístico.

* **Plan Avanzado — S/ 24.90 (Acceso por 4 meses)**:
  - **50 Simulacros Oficiales Curados/Día**.
  - Flashcards ilimitadas personalizadas y carga masiva Excel (10 archivos/día).
  - **Tutor Académico Inteligente** con razonamiento profundo sobre normativa oficial en cada pregunta y tarjeta.
  - Diagnóstico estadístico avanzado por áreas.

[Ver Planes y Activar con Mercado Pago](/pricing)`,
                sugerencias: this.pills.visitor
            },

            acceso: {
                intencion: "informacion_acceso",
                respuesta: `### ¿Cómo registrarme en Hub Academia?

El registro es **instantáneo y gratuito**:

1. Haz clic en el botón **Acceder** ubicado en la barra superior.
2. Ingresa en **1 clic con tu cuenta de Google** (o mediante tu correo electrónico).
3. Tu cuenta quedará activa al instante con **10 vidas gratuitas** para probar nuestras herramientas y simuladores oficiales.`,
                sugerencias: this.pills.visitor
            },

            ventajas: {
                intencion: "informacion_ventajas",
                respuesta: `### Sustento Oficial y Rigor de nuestro Ecosistema IA

* **Bancos 100% Oficiales Auditados**: Nuestros simulacros operan exclusivamente sobre preguntas reales y curadas en base de datos, sin preguntas sintéticas improvisadas.
* **Tutoría IA Fundamentada en Normativa Peruana**: El Tutor IA explica cada alternativa citando documentos vigentes del **MINEDU (CNEB / MBDD / RVM 094-2020)** y del **MINSA (NTS / GPC)**.
* **Ecosistema Conectado**: Integra la plataforma especializada **Docentes Inicial** (\`docentes.hubacademia.com\`), simuladores oficiales, memoria científica **SM-2 + Notas** y el Boletín informativo de IA.
* **Activación Inmediata**: Pagos procesados de manera exclusiva y automatizada mediante **Mercado Pago**.`,
                sugerencias: this.pills.visitor
            },

            invalida: {
                intencion: "opcion_invalida",
                respuesta: `**Selecciona una consulta disponible para orientarte de inmediato:**

1. **Herramientas y Ecosistema**
2. **Planes y Mercado Pago**
3. **Sustento Oficial y Ventajas**
4. **¿Cómo registrarme?**`,
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
            normalized.includes('herramienta') ||
            normalized.includes('ecosistema') ||
            normalized.includes('servicio') ||
            normalized.includes('simulador') ||
            normalized.includes('inicial') ||
            normalized.includes('docente') ||
            normalized.includes('ascenso') ||
            normalized.includes('serums') ||
            normalized.includes('biblioteca') ||
            normalized.includes('boletin') ||
            normalized.includes('noticia') ||
            normalized.includes('repaso') ||
            normalized.includes('nota') ||
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
            normalized.includes('mercado pago') ||
            normalized.includes('mercadopago') ||
            normalized.includes('pago') ||
            normalized.includes('suscripcion') ||
            normalized.includes('basic') ||
            normalized.includes('basico') ||
            normalized.includes('advanced') ||
            normalized.includes('avanzado')
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
            normalized.includes('inteligencia artificial') ||
            normalized.includes('minedu') ||
            normalized.includes('minsa')
        ) {
            return this.responses.ventajas;
        }

        // 3. Fallback cuando la entrada no coincide con ninguna opción válida
        return this.responses.invalida;
    }
}

const instance = new AsistenteGuiaKnowledge();
instance.AsistenteGuiaKnowledge = AsistenteGuiaKnowledge;
module.exports = instance;
