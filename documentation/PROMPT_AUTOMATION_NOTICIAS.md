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

