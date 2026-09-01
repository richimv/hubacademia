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
Actúa como un Investigador Académico y Curador Científico para Hub Academia. Tu objetivo es descubrir e inyectar PAPERS DE INVESTIGACIÓN CIENTÍFICA (Mínimo 80% del total ingerido) publicados en los últimos 7 días, registrándolos con título traducido y resumen factual en español.

📌 DELIMITACIÓN ESTRICTA DE DOMINIOS Y FUENTES MULTI-PROVEEDOR:

1. DOMINIO MEDICINA (domain: "medicine" -> Para Hub Salud / Serums):
   * Investigaciones clínicas, farmacología, cirugía, ensayos clínicos fase 2/3, epidemiología, cardiología, oncología, neurología, salud pública y FORMACIÓN MÉDICA/ENFERMERÍA CLÍNICA.
   * Fuentes y APIs:
     - PubMed (NCBI E-utilities): https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed...
     - EuropePMC: https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=...
     - The Lancet, BMJ, NEJM, SciELO Salud.
   * URLs comprobadas con estructura PMID (https://pubmed.ncbi.nlm.nih.gov/...) o DOI (https://doi.org/...).

2. DOMINIO EDUCACIÓN (domain: "education" -> Para Hub Docente / Educación Básica Regular):
   * Investigaciones en Pedagogía Escolar, Didáctica de materias (Matemáticas, Lenguaje, Ciencias/STEM), Formación Inicial y Continua Docente, Aprendizaje Autorregulado (SRL), Metacognición, Educación Básica Regular (Inicial, Primaria, Secundaria), Tecnologías Educativas (EdTech en aula escolar), Dinámica de Aula y Clima Escolar.
   * 🚨 REGLA DE EXCLUSIÓN TAJANTE: PROHIBIDO asignar "education" a estudios de educación médica, enfermería clínica hospitalaria, rotaciones médicas o farmacología. Todo estudio en contexto hospitalario/clínico pertenece a "medicine".
   * Fuentes y APIs Multi-Proveedor:
     - Crossref API: https://api.crossref.org/works?query=pedagogia+OR+didactica+OR+"educacion+primaria"&filter=type:journal-article...
     - DOAJ API: https://doaj.org/api/v2/search/articles/education%20pedagogy...
     - OpenAlex API: https://api.openalex.org/works?search=pedagogia+didactica+escolar...
     - EuropePMC API: https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=pedagogy...
     - SciELO Educación, Redalyc, Dialnet, Acta Psychologica, PLOS ONE (pedagogy/learning).

PASO 1: VENTANA SEMANAL DE 7 DÍAS Y PREVENCIÓN DE DUPLICADOS
- Extrae únicamente investigaciones publicadas en el rango de los ÚLTIMOS 7 DÍAS ATRÁS a partir de la fecha actual de ejecución.
- Si no hay papers nuevos en los últimos 7 días o ya están en la base de datos, NO alucines ni forces publicaciones. Finaliza informando: "✅ Investigaciones de la semana al día. No hay papers nuevos que inyectar."
- Lee y valida con tu herramienta de red o consulta HTTP que la URL responda 200 OK y descarte Soft-404 o paywalls inaccesibles.

PASO 2: TRADUCCIÓN Y SÍNTESIS A ESPAÑOL (EXPERIENCIA EDTECH)
- Para papers en inglés (PubMed/Crossref/DOAJ/OpenAlex/EuropePMC):
  * Traduce el título de forma fiel, rigurosa y formal al ESPAÑOL académico.
  * Sintetiza en ESPAÑOL un resumen de 2 a 3 líneas sobre los objetivos, metodología y hallazgos concretos del Abstract.
- Para papers en español (SciELO/Redalyc/Dialnet/Crossref español):
  * Mantiene su título y resumen original en español.

PASO 3: CONSTRUCCIÓN DEL JSON DE INGESTA
Para cada paper real comprobado (Mínimo 80% del total ingerido), genera el objeto JSON:
{
  "title": "[Título traducido o adaptado al español académico]",
  "author": "[Revista Científica / Editorial / Base de Datos / DOI]",
  "url": "[URL pública real comprobada]",
  "resource_type": "paper",
  "domain": "medicine" | "education",
  "visible": true,
  "open_directly": true,
  "is_premium": false,
  "content_html": "<p>[Síntesis factual en español de 2 a 3 líneas del paper.]</p>"
}

PASO 4: EJECUCIÓN DEL SCRIPT DE INGESTA EN BACKEND
Ejecuta mediante run_command en la consola del proyecto:

node scripts/autoIngestResources.js --data='[...ARRAY_JSON_ESCAPADO...]'
o
node scripts/autoIngestResources.js --file=path/to/payload.json

El backend de Hub Academia validará la URL y los campos, guardándolos en la tabla "resources" de PostgreSQL con resource_type = 'paper'.
```

---

## 📊 Historial de Ingestas Recientes

### 🗓️ Ingesta: 31 de Agosto de 2026
- **Estado**: ✅ Ingesta exitosa (10 nuevos papers procesados).
- **Proporción de Papers**: 100% (10/10).
- **Resumen de Recursos Ingeridos**:
  1. `[MEDICINE]` *Seguridad y eficacia del protocolo de 0/1 hora para infarto de miocardio en el servicio de urgencias: ensayo pragmático, escalonado por grupos y controlado aleatorizado internacional* (The Lancet - PMID 42667934)
  2. `[MEDICINE]` *Suspensión de betabloqueantes en pacientes estables con infarto de miocardio previo, fracción de eyección ventricular izquierda preservada y sin insuficiencia cardíaca: metanálisis de datos individuales* (The Lancet - PMID 42669300)
  3. `[MEDICINE]` *Ablación por catéter para fibrilación auricular sintomática (PVI-SHAM-AF): ensayo multicéntrico, aleatorizado, doble ciego y controlado con procedimiento simulado* (The Lancet - PMID 42669307)
  4. `[MEDICINE]` *Preeclampsia: fisiopatología, diagnóstico temprano, estratificación de riesgo y manejo clínico contemporáneo* (The Lancet - PMID 42660153)
  5. `[MEDICINE]` *Etiología, manejo clínico y desenlaces de la insuficiencia cardíaca aguda en 17 países africanos (THESUS-HF II): estudio prospectivo, multicéntrico y observacional de cohorte* (The Lancet - PMID 42669305)
  6. `[MEDICINE]` *Manejo del déficit de testosterona en atención primaria: consenso internacional de expertos* (The Aging Male - PMID 42647144)
  7. `[EDUCATION]` *Relaciones del desarrollo entre la ansiedad matemática y la fluidez aritmética en estudiantes de educación primaria a lo largo de seis puntos temporales* (Developmental Psychology / APA - PMID 42671820)
  8. `[EDUCATION]` *Relaciones longitudinales entre la teoría de la mente representacional y avanzada y el razonamiento científico de los 4 a los 7 años* (Developmental Science - PMID 42640009)
  9. `[EDUCATION]` *Método multisensorial de enseñanza de lenguas en aula para la documentación y evaluación observacional de habilidades lingüísticas receptivas y productivas* (MethodsX / Elsevier - PMID 42662464)
  10. `[EDUCATION]` *Violencia escolar y políticas de convivencia escolar en el contexto postpandemia: análisis de marcos institucionales y dinámicas de aula* (Humanities and Social Sciences Communications / Nature Portfolio - DOI 10.1057/s41599-026-08794-5)

### 🗓️ Ingesta: 17 de Agosto de 2026
- **Estado**: ✅ Ingesta exitosa (10 nuevos papers procesados).
- **Proporción de Papers**: 100% (10/10).
- **Resumen de Recursos Ingeridos**:
  1. `[MEDICINE]` *Eficacia y seguridad de filgotinib en pacientes con espondiloartritis axial radiográfica y no radiográfica activa: resultados de OLINGUITO, un ensayo fase 3* (Annals of the Rheumatic Diseases / BMJ - PMID 42586909)
  2. `[MEDICINE]` *Suspensión de estatinas para la prevención primaria de enfermedad cardiovascular aterosclerótica en adultos de 75 años o más (SAGA/SITE): ensayo clínico aleatorizado pragmático de no inferioridad* (The Lancet Healthy Longevity - PMID 42580354)
  3. `[MEDICINE]` *Protección vacunal a 8 años tras una dosis única de vacuna conjugada Vi-toxoide tetánico en niños de Nepal (TyVOID): estudio de cohorte prospectivo del ensayo TyVAC Nepal* (The Lancet Global Health - PMID 42575113)
  4. `[MEDICINE]` *Mortalidad a largo plazo y riesgo de enfermedad renal crónica en niños tras malaria grave complicada con lesión renal aguda: estudio observacional prospectivo* (The Lancet Global Health - PMID 42575118)
  5. `[MEDICINE]` *Terapias endoscópicas del tercer espacio para trastornos benignos de la motilidad: Revisión narrativa* (DEN Open / JGES - PMID 42597741)
  6. `[EDUCATION]` *Factores que inciden en el rendimiento académico en ciencias de la Tierra en estudiantes de educación secundaria superior: un enfoque de modelos de ecuaciones estructurales* (Acta Psychologica / Elsevier - PMID 42604626)
  7. `[EDUCATION]` *Replicabilidad y estabilidad de los perfiles de autorregulación del aprendizaje en estudiantes de profesorado* (Acta Psychologica / Elsevier - PMID 42594780)
  8. `[EDUCATION]` *Pedagogía del translenguaje y agencia del estudiante en el aula de lenguas extranjeras: un estudio experimental* (PLOS ONE - PMID 42599885)
  9. `[EDUCATION]` *Brechas de género en las calificaciones escolares: conducta de resistencia y composición del aula en cuatro países europeos* (Journal of Youth and Adolescence / Springer - PMID 42599383)
  10. `[EDUCATION]` *Asociación entre las prácticas escolares de educación física y el nivel socioeconómico de la escuela* (The Journal of School Health - PMID 42604964)

### 🗓️ Ingesta: 11 de Agosto de 2026
- **Estado**: ✅ Ingesta exitosa (8 nuevos papers procesados).
- **Proporción de Papers**: 100% (8/8).
- **Resumen de Recursos Ingeridos**:
  1. `[MEDICINE]` *Puntaje Internacional de Riesgo en Hipertensión Pulmonar Pediátrica: Un modelo de predicción de resultados mediante aprendizaje automático* (Circulation / PubMed - PMID 42576812)
  2. `[MEDICINE]` *Tamizaje de oportunidad para la enfermedad de Chagas mediante electrocardiograma impulsado por IA: Evaluación prospectiva de factibilidad y precisión diagnóstica* (Circulation / PubMed - PMID 42576808)
  3. `[MEDICINE]` *Efecto neuroprotector de exosomas derivados de células madre mesenquimales en la mitigación del daño oxidativo e inflamatorio del Alzheimer mediante la vía Nrf2/HO-1* (Ibrain / PubMed - PMID 42577281)
  4. `[MEDICINE]` *Métricas de variabilidad de la frecuencia cardíaca en el dominio del tiempo como predictores de recuperación de concusiones en adolescentes* (Neurorehabilitation and Neural Repair / PubMed - PMID 42576778)
  5. `[MEDICINE]` *Optimización de la autoverificación de laboratorio en análisis de hemograma completo mediante aprendizaje automático: Estudio de evaluación de desempeño* (Journal of Clinical Laboratory Analysis / PubMed - PMID 42576782)
  6. `[MEDICINE]` *De la supervivencia a la recuperación en UCI: Un marco de recuperación domiciliaria dirigido por enfermería adaptado a entornos de escasos recursos* (Neuropsychiatric Disease and Treatment / PubMed - PMID 42577356)
  7. `[MEDICINE]` *Prácticas de comunicación y formación clínica sobre riesgo y equidad en la atención perinatal de mujeres afrodescendientes* (Journal of Midwifery & Women's Health / PubMed - PMID 42576713)
  8. `[MEDICINE]` *Avances recientes en aplicaciones de inteligencia artificial para la mitigación de la resistencia a los antimicrobianos: Desafíos y oportunidades educativas* (JAC-Antimicrobial Resistance / PubMed - PMID 42577011)

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


