# 📰 Configuración de Scheduled Task en Antigravity 2.0: Ingesta Diaria de Noticias (MINEDU & MINSA)

## 📌 ¿Qué es esta tarea programada?
En **Antigravity 2.0**, las **Scheduled Tasks** permiten programar un agente autónomo en segundo plano utilizando expresiones **Cron**. 

Cada día a las **8:00 PM**, Antigravity 2.0 despierta al agente, el cual lee los portales de noticias oficiales de MINEDU y MINSA, extrae únicamente las noticias publicadas durante ese día, las verifica en tiempo real y ejecuta la ingesta en la base de datos de Hub Academia con `resource_type: "noticia"`.

---

## ⚙️ Parámetros de Configuración en Antigravity 2.0

| Campo | Valor |
| :--- | :--- |
| **Nombre de la Tarea** | `Ingesta Diaria de Noticias Oficiales (MINEDU & MINSA)` |
| **Cron Expression** | `0 20 * * *` *(Todos los días a las 8:00 PM)* |
| **IsDaemon** | `true` *(Tarea independiente recurrente)* |
| **Herramientas requeridas** | `read_url_content`, `run_command` |

---

## 🤖 Prompt Oficial para la Scheduled Task (Copiar en Antigravity 2.0)

```text
Actúa como un Curador Oficial de Noticias Gubernamentales para Hub Academia. Tu objetivo es descubrir e inyectar las NOTICIAS OFICIALES RECIENTES publicadas por el Ministerio de Educación (MINEDU) y el Ministerio de Salud (MINSA) durante el día de HOY.

PASO 1: FUENTES OFICIALES Y NAVEGACIÓN
Utiliza tu herramienta read_url_content para navegar en tiempo real a los siguientes portales de noticias:
- Sector Educación (domain: "education"):
  https://www.gob.pe/institucion/minedu/noticias
- Sector Salud (domain: "medicine"):
  https://www.gob.pe/institucion/minsa/noticias

PASO 2: FILTRADO POR FECHA Y PREVENCIÓN DE ALUCINACIONES / DUPLICADOS
- Extrae únicamente noticias publicadas en la fecha del día de hoy.
- Si no hay noticias publicadas el día de hoy o si las URLs extraídas ya fueron procesadas en días anteriores, NO inventes ni forces ingestas. Detén el flujo respondiendo: "✅ Noticias al día para la fecha actual. No hay nuevas publicaciones para inyectar hoy."
- Ingresa con read_url_content a cada enlace de noticia individual para confirmar que cargue el artículo completo (desecha 404 o Soft-404).

PASO 3: CONSTRUCCIÓN DEL JSON DE INGESTA
Para cada noticia real comprobada del día, genera el siguiente objeto JSON:
{
  "title": "[Título exacto de la noticia oficial]",
  "author": "MINEDU Perú" | "MINSA Perú",
  "url": "[URL pública real comprobada]",
  "resource_type": "noticia",
  "domain": "education" | "medicine",
  "visible": true,
  "open_directly": true,
  "is_premium": false,
  "content_html": "<p>[Primer párrafo o resumen factual de 2 a 3 líneas del comunicado oficial.]</p>"
}

PASO 4: EJECUCIÓN DEL SCRIPT DE INGESTA EN BACKEND
Ejecuta mediante run_command en el proyecto:

node scripts/autoIngestResources.js --data='[...ARRAY_JSON_ESCAPADO...]'

El backend validará la URL y los campos, guardándolos en la tabla "resources" de PostgreSQL con resource_type = 'noticia' para destacarse automáticamente en el Widget de Novedades.
```

---

## 🛠️ Notas de Base de Datos y Compatibilidad
- Se ha aplicado la migración `src/infrastructure/database/migrations/add_noticia_resource_type.sql` para actualizar la restricción CHECK `check_resource_type` en la tabla `resources`, permitiendo el valor `'noticia'`.

---

## 📋 Registro de Ejecución y Noticias Ingestadas (Logs)
- **Fecha:** 25 de agosto de 2026
- **Recursos Ingestados:**
  1. **MINEDU (education):** [Minedu impulsará titulación de colegios de Ica para mejorar su infraestructura](https://www.gob.pe/institucion/minedu/noticias/1434484-minedu-impulsara-titulacion-de-colegios-de-ica-para-mejorar-su-infraestructura)
  2. **MINSA (medicine):** [Ministro Dyer premia a los “Bebés Mamoncitos 2026” y destaca la lactancia materna como el mejor alimento](https://www.gob.pe/institucion/minsa/noticias/1434638-ministro-dyer-premia-a-los-bebes-mamoncitos-2026-y-destaca-la-lactancia-materna-como-el-mejor-alimento)
  3. **MINSA (medicine):** [Ministro de Salud recorre el San Bartolomé y anuncia acciones para mejorar la atención](https://www.gob.pe/institucion/minsa/noticias/1434614-ministro-de-salud-recorre-el-san-bartolome-y-anuncia-acciones-para-mejorar-la-atencion)
  4. **MINSA (medicine):** [Diris Lima Este reconoce a 33 brigadistas de la Municipalidad de Santa Anita por fortalecer su preparación ante emergencias](https://www.gob.pe/institucion/minsa/noticias/1434496-diris-lima-este-reconoce-a-33-brigadistas-de-la-municipalidad-de-santa-anita-por-fortalecer-su-preparacion-ante-emergencias)
  5. **MINSA (medicine):** [En jornada de 24 horas, especialistas del Hospital Nacional Cayetano Heredia salvan la vida de 14 pacientes con arritmias](https://www.gob.pe/institucion/minsa/noticias/1434481-en-jornada-de-24-horas-especialistas-del-hospital-nacional-cayetano-heredia-salvan-la-vida-de-14-pacientes-con-arritmias)
  6. **MINSA (medicine):** [Semana de lactancia materna: conoce a los bebés mamoncitos Minsa](https://www.gob.pe/institucion/minsa/noticias/1434282-semana-de-lactancia-materna-conoce-a-los-bebes-mamoncitos-minsa)
- **Estado de Ingesta:** ✅ 6/6 Noticias verificadas e ingestadas exitosamente en la tabla `resources` de PostgreSQL.

- **Fecha:** 15 de agosto de 2026
- **Recursos Ingestados:**
  1. **MINEDU (education):** [Minedu alista beca para mejores talentos de los COAR](https://www.gob.pe/institucion/minedu/noticias/1430869-minedu-alista-beca-para-mejores-talentos-de-los-coar)
  2. **MINEDU (education):** [Minedu y Sunarp se unen para destrabar títulos de propiedad de colegios](https://www.gob.pe/institucion/minedu/noticias/1430817-minedu-y-sunarp-se-unen-para-destrabar-titulos-de-propiedad-de-colegios)
  3. **MINSA (medicine):** [Día del Niño: Minsa Cuentos lleva mensajes de prevención en salud a niños de Villa María del Triunfo](https://www.gob.pe/institucion/minsa/noticias/1430885-dia-del-nino-minsa-cuentos-lleva-mensajes-de-prevencion-en-salud-a-ninos-de-villa-maria-del-triunfo)
  4. **MINSA (medicine):** [Minsa realiza jornada de salud por el Día del Niño en Villa María del Triunfo](https://www.gob.pe/institucion/minsa/noticias/1430873-minsa-realiza-jornada-de-salud-por-el-dia-del-nino-en-villa-maria-del-triunfo)
  5. **MINSA (medicine):** [Más de 1200 personas accedieron a servicios gratuitos para la detección de tuberculosis en Lima Norte](https://www.gob.pe/institucion/minsa/noticias/1430860-mas-de-1200-personas-accedieron-a-servicios-gratuitos-para-la-deteccion-de-tuberculosis-en-lima-norte)
  6. **MINSA (medicine):** [Minsa fortalece la vigilancia sanitaria de juguetes por campaña del Día del Niño](https://www.gob.pe/institucion/minsa/noticias/1430826-minsa-fortalece-la-vigilancia-sanitaria-de-juguetes-por-campana-del-dia-del-nino)
- **Estado de Ingesta:** ✅ 6/6 Noticias verificadas e ingestadas exitosamente en la tabla `resources` de PostgreSQL.

- **Fecha:** 12 de agosto de 2026
- **Recursos Ingestados:**
  1. **MINEDU (education):** [Minedu aprueba expediente técnico para nueva infraestructura de la IE Juan Pablo II de San Genaro](https://www.gob.pe/institucion/minedu/noticias/1429624-minedu-aprueba-expediente-tecnico-para-nueva-infraestructura-de-la-ie-juan-pablo-ii-de-san-genaro)
  2. **MINSA (medicine):** [Minsa resalta las bondades del consumo de frutas verdes](https://www.gob.pe/institucion/minsa/noticias/1429677-minsa-resalta-las-bondades-del-consumo-de-frutas-verdes)
  3. **MINSA (medicine):** [Ministerio de Salud brinda atención médica y soporte psicológico a ciudadano afectado por hecho de violencia](https://www.gob.pe/institucion/minsa/noticias/1429600-ministerio-de-salud-brinda-atencion-medica-y-soporte-psicologico-a-ciudadano-afectado-por-hecho-de-violencia)
  4. **MINSA (medicine):** [Día Internacional de la Juventud: Minsa promueve el cuidado Integral para los jóvenes en el Perú](https://www.gob.pe/institucion/minsa/noticias/1429538-dia-internacional-de-la-juventud-minsa-promueve-el-cuidado-integral-para-los-jovenes-en-el-peru)
  5. **MINSA (medicine):** [Ministro Luis Dyer y representantes del Colegio Médico del Perú trabajarán juntos para mejorar la gestión administrativa en el sector Salud](https://www.gob.pe/institucion/minsa/noticias/1429526-ministro-luis-dyer-y-representantes-del-colegio-medico-del-peru-trabajaran-juntos-para-mejorar-la-gestion-administrativa-en-el-sector-salud)
  6. **MINSA (medicine):** [‘Kallpa’: puesto médico de avanzada implementado por Diris Lima Este para responder ante emergencias](https://www.gob.pe/institucion/minsa/noticias/1429307-kallpa-puesto-medico-de-avanzada-implementado-por-diris-lima-este-para-responder-ante-emergencias)
  7. **MINSA (medicine):** [Minsa: Instituto de Salud Mental y Colegio Médico obtienen certificación de Buena Práctica en Gestión Pública 2026](https://www.gob.pe/institucion/minsa/noticias/1429291-minsa-instituto-de-salud-mental-y-colegio-medico-obtienen-certificacion-de-buena-practica-en-gestion-publica-2026)
  8. **MINSA (medicine):** [INSN Breña obtiene certificación de Buena Práctica en Gestión Pública 2026 por innovador sistema de terapia de infusión](https://www.gob.pe/institucion/minsa/noticias/1429190-insn-brena-obtiene-certificacion-de-buena-practica-en-gestion-publica-2026-por-innovador-sistema-de-terapia-de-infusion)
- **Estado de Ingesta:** ✅ 8/8 Noticias verificadas e ingestadas exitosamente en la tabla `resources` de PostgreSQL.

- **Fecha:** 8 de agosto de 2026
- **Recursos Ingestados:**
  1. **MINEDU (education):** [Minedu refuerza la educación hospitalaria en las 25 regiones del país](https://www.gob.pe/institucion/minedu/noticias/1427360-minedu-refuerza-la-educacion-hospitalaria-en-las-25-regiones-del-pais)
  2. **MINSA (medicine):** [Minsa: llevamos prevención a estudiantes de Villa El Salvador para protegerse frente al fenómeno El Niño](https://www.gob.pe/institucion/minsa/noticias/1427408-minsa-llevamos-prevencion-a-estudiantes-de-villa-el-salvador-para-protegerse-frente-al-fenomeno-el-nino)
  3. **MINSA (medicine):** [Serums 2026-II: Consulta el lugar donde rendirán la evaluación este domingo 9 de agosto](https://www.gob.pe/institucion/minsa/noticias/1427398-serums-2026-ii-consulta-el-lugar-donde-rendiran-la-evaluacion-este-domingo-9-de-agosto)
  4. **MINSA (medicine):** [Cesantes y jubilados del Minsa fueron reconocidos por su trayectoria y años de servicio](https://www.gob.pe/institucion/minsa/noticias/1427390-cesantes-y-jubilados-del-minsa-fueron-reconocidos-por-su-trayectoria-y-anos-de-servicio)
  5. **MINSA (medicine):** [Junín: ministro de Salud cumplió jornada de trabajo supervisando avances del nuevo Hospital El Carmen y entregando una ambulancia a Chupaca](https://www.gob.pe/institucion/minsa/noticias/1427388-junin-ministro-de-salud-cumplio-jornada-de-trabajo-supervisando-avances-del-nuevo-hospital-el-carmen-y-entregando-una-ambulancia-a-chupaca)
  6. **MINSA (medicine):** [Ministerio de Salud reafirma atención integral y basada en evidencia para personas con trastorno del espectro autista](https://www.gob.pe/institucion/minsa/noticias/1427369-ministerio-de-salud-reafirma-atencion-integral-y-basada-en-evidencia-para-personas-con-trastorno-del-espectro-autista)
  7. **MINSA (medicine):** [Serums 2026-II: ¿Qué debes tener en cuenta para la evaluación que se realizará este domingo 9 de agosto?](https://www.gob.pe/institucion/minsa/noticias/1427351-serums-2026-ii-que-debes-tener-en-cuenta-para-la-evaluacion-que-se-realizara-este-domingo-9-de-agosto)
- **Estado de Ingesta:** ✅ 7/7 Noticias verificadas e ingestas exitosamente en la tabla `resources` de PostgreSQL.

- **Fecha:** 9 de agosto de 2026
- **Recursos Ingestados:**
  1. **MINSA (medicine):** [Más de 23 mil profesionales de la salud participaron en la Evaluación para el SERUMS 2026-II](https://www.gob.pe/institucion/minsa/noticias/1427423-mas-de-23-mil-profesionales-de-la-salud-participaron-en-la-evaluacion-para-el-serums-2026-ii)
- **MINEDU (education):** Sin nuevas publicaciones oficiales durante el día de hoy.
- **Estado de Ingesta:** ✅ 1/1 Noticia verificada e ingestada exitosamente en la tabla `resources` de PostgreSQL.

- **Fecha:** 7 de agosto de 2026
- **Recursos Ingestados:**
  1. **MINEDU (education):** [Gobierno cumple compromiso y entrega primeros domos en Chongos Bajo, en la región Junín](https://www.gob.pe/institucion/minedu/noticias/1427112-gobierno-cumple-compromiso-y-entrega-primeros-domos-en-chongos-bajo-en-la-region-junin)
  2. **MINSA (medicine):** [Minsa Móvil inició atención médica especializada en Carhuapaccha, Junín en beneficio de la población afectada por sismos en esta zona](https://www.gob.pe/institucion/minsa/noticias/1427314-minsa-movil-inicio-atencion-medica-especializada-en-carhuapaccha-junin-en-beneficio-de-la-poblacion-afectada-por-sismos-en-esta-zona)
  3. **MINSA (medicine):** [SIS es reconocido por modelo de traslados aeromédicos que acerca atención especializada a pacientes críticos](https://www.gob.pe/institucion/minsa/noticias/1427310-sis-es-reconocido-por-modelo-de-traslados-aeromedicos-que-acerca-atencion-especializada-a-pacientes-criticos)
  4. **MINSA (medicine):** [Minsa refuerza toma de pruebas moleculares para el diagnóstico oportuno de tuberculosis en todo el país](https://www.gob.pe/institucion/minsa/noticias/1427283-minsa-refuerza-toma-de-pruebas-moleculares-para-el-diagnostico-oportuno-de-tuberculosis-en-todo-el-pais)
  5. **MINSA (medicine):** [Minsa: la construcción del nuevo Centro de Salud Materno Infantil Santa Rosa en Puente Piedra tiene un avance del 97.3 %](https://www.gob.pe/institucion/minsa/noticias/1427091-minsa-la-construccion-del-nuevo-centro-de-salud-materno-infantil-santa-rosa-en-puente-piedra-tiene-un-avance-del-97-3)
  6. **MINSA (medicine):** [Minsa lleva servicios de salud ocular pediátrica gratuita a niños de la región Tumbes](https://www.gob.pe/institucion/minsa/noticias/1426935-minsa-lleva-servicios-de-salud-ocular-pediatrica-gratuita-a-ninos-de-la-region-tumbes)
- **Estado de Ingesta:** ✅ 6/6 Noticias verficadas e ingestas exitosamente en la tabla `resources` de PostgreSQL.

- **Fecha:** 6 de agosto de 2026
- **Recursos Ingestados:**
  1. **MINEDU (education):** [Minedu: espacios alquilados en instituciones educativas públicas serán inspeccionados](https://www.gob.pe/institucion/minedu/noticias/1426850-minedu-espacios-alquilados-en-instituciones-educativas-publicas-seran-inspeccionados)
  2. **MINSA (medicine):** [Minsa: Especialistas en Salud Ambiental brindan asistencia técnica y capacitación sobre agua segura en Carabayllo](https://www.gob.pe/institucion/minsa/noticias/1426838-minsa-especialistas-en-salud-ambiental-brindan-asistencia-tecnica-y-capacitacion-sobre-agua-segura-en-carabayllo)
- **Estado de Ingesta:** ✅ 2/2 Noticias verified & ingested successfully in PostgreSQL `resources` table.




