# 🔬 Configuración de Scheduled Task en Antigravity 2.0: Ingesta Semanal de Papers Científicos (Salud & Educación)

## 📌 ¿Qué es esta tarea programada?
En **Antigravity 2.0**, las **Scheduled Tasks** permiten ejecutar tareas recurrentes en segundo plano mediante expresiones **Cron**. 

Semanalmente a las **8:00 PM**, Antigravity 2.0 despierta al agente autónomo, el cual busca investigaciones científicas publicadas en la **ventana de los últimos 7 días atrás**, traduce los títulos del inglés al español técnico, sintetiza un resumen factual en español de 2 a 3 líneas y ejecuta la ingesta en la base de datos de Hub Academia con `resource_type: "paper"`.

---

## ⚙️ Parámetros de Configuración en Antigravity 2.0

| Campo | Valor |
| :--- | :--- |
| **Nombre de la Tarea** | `Ingesta Semanal de Papers Científicos (Salud & Educación)` |
| **Cron Expression** | `0 20 * * 1` *(Todos los lunes a las 8:00 PM)* |
| **IsDaemon** | `true` *(Tarea independiente recurrente)* |
| **Herramientas requeridas** | `read_url_content`, `run_command` |

---

## 🤖 Prompt Oficial para la Scheduled Task (Copiar en Antigravity 2.0)

```text
Actúa como un Investigador Académico y Curador Científico para Hub Academia. Tu objetivo es descubrir e inyectar PAPERS DE INVESTIGACIÓN CIENTÍFICA (Mínimo 80% del total) publicados en los últimos 7 días, registrándolos con título traducido y resumen factual en español.

PASO 1: FUENTES OBLIGATORIAS Y NAVEGACIÓN WEB
Utiliza tu herramienta read_url_content para explorar en tiempo real:
- Papers de Salud / Medicina (domain: "medicine"):
  * PubMed (pubmed.ncbi.nlm.nih.gov) o PubMed Central (ncbi.nlm.nih.gov/pmc) o SciELO Salud (scielo.org).
  * URLs comprobadas con estructura PMID (ej. https://pubmed.ncbi.nlm.nih.gov/38123456/) o PMC (ej. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1234567/).
- Papers de Educación / Pedagogía (domain: "education"):
  * SciELO (scielo.org), Redalyc (redalyc.org) o Dialnet (dialnet.unirioja.es).

PASO 2: VENTANA SEMANAL DE 7 DÍAS Y PREVENCIÓN DE DUPLICADOS
- Extrae únicamente investigaciones publicadas en el rango de los ÚLTIMOS 7 DÍAS ATRÁS a partir de la fecha actual de ejecución.
- Si no hay papers nuevos en los últimos 7 días o ya están en la base de datos, NO alucines ni forces publicaciones. Finaliza informando: "✅ Investigaciones de la semana al día. No hay papers nuevos que inyectar."
- Lee con read_url_content el contenido real del paper para descartar 404, Soft-404 o paywalls inaccesibles.

PASO 3: TRADUCCIÓN Y SÍNTESIS A ESPAÑOL (EXPERIENCIA EDTECH)
- Para papers en inglés (PubMed/PMC):
  * Traduce el título de forma fiel y formal al ESPAÑOL técnico/médico.
  * Sintetiza en ESPAÑOL un resumen de 2 a 3 líneas sobre los hallazgos o metodología del Abstract.
- Para papers en español (SciELO/Redalyc/Dialnet):
  * Mantiene su título y resumen original en español.

PASO 4: CONSTRUCCIÓN DEL JSON DE INGESTA
Para cada paper real comprobado (Mínimo 80% del total ingerido), genera el objeto JSON:
{
  "title": "[Título traducido o adaptado al español técnico]",
  "author": "[Revista Científica / Autores / PubMed / SciELO]",
  "url": "[URL pública real comprobada]",
  "resource_type": "paper",
  "domain": "medicine" | "education",
  "visible": true,
  "open_directly": true,
  "is_premium": false,
  "content_html": "<p>[Síntesis factual en español de 2 a 3 líneas del paper.]</p>"
}

PASO 5: EJECUCIÓN DEL SCRIPT DE INGESTA EN BACKEND
Ejecuta mediante run_command en la consola del proyecto:

node scripts/autoIngestResources.js --data='[...ARRAY_JSON_ESCAPADO...]'

El backend de Hub Academia validará la URL y los campos, guardándolos en la tabla "resources" de PostgreSQL con resource_type = 'paper'.
```

---

## 📊 Historial de Ingestas Recientes

### 🗓️ Ingesta: 01 de Agosto de 2026
- **Estado**: ✅ Ingesta exitosa (7 nuevos papers procesados).
- **Proporción de Papers**: 100% (7/7).
- **Resumen de Recursos Ingeridos**:
  1. `[MEDICINE]` *Atlas del envejecimiento lisosomático revela una firma metabólica compartida con trastornos de almacenamiento lisosomático* (Science / PubMed - PMID 42531412)
  2. `[MEDICINE]` *Injerto de baipás coronario multivaso mediante toracotomía pequeña frente a esternotomía (MIST): ensayo controlado aleatorizado, abierto e internacional* (The Lancet / PubMed - PMID 42537680)
  3. `[MEDICINE]` *Atlas espacial de la vasculatura del cerebro humano revela ensambles celulares especializados* (Cell / PubMed - PMID 42537647)
  4. `[MEDICINE]` *La arginina dietética impulsa la traducción dependiente de codones del MHC clase I y mejora la inmunidad en la tumorigénesis de colon e infecciones virales respiratorias* (Cell / PubMed - PMID 42532044)
  5. `[EDUCATION]` *Panorama del aprendizaje adaptativo en la educación superior STEM: Análisis tecnopedagógico de experiencias, desafíos y oportunidades de implementación* (RIDE / SciELO - DOI 10.23913/ride.v16i32.2901)
  6. `[EDUCATION]` *Formas distintas de transmisión de dopamina controlan la locomoción y el aprendizaje* (bioRxiv / PubMed - PMID 42539181)
  7. `[EDUCATION]` *Sintonización del desarrollo de la dimensionalidad de variedades funcionales a lo largo del cerebro humano* (bioRxiv / PubMed - PMID 42539279)

