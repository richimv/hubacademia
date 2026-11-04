# Vercel: medios del quiz y configuración del backend

Actualización: 4 de noviembre de 2026, America/Lima. Estado: el usuario cargó las credenciales y se confirmó la presencia de 21 variables en Production, sin descifrarlas. Las correcciones se publicaron en el despliegue READY `dpl_4sV8LFQP8S3gH7kTbn1k1GQs29Fy`, asignado a los dominios de Hub Academia. Render permanece disponible. La cobertura ampliada, entrega directa firmada, publicación y límites están descritos en [MEDIA_DELIVERY_VERCEL.md](MEDIA_DELIVERY_VERCEL.md).

## Hallazgos comprobados

- Proyecto conectado: `biblioteca-academica`, ID `prj_wcoeOcqAEXFj9S3MYoAQRa0SZJqD`, equipo `richards-projects-531b9e54`. Dominios `hubacademia.com` y `www.hubacademia.com`.
- Al inicio de la revisión, Vercel devolvió cero variables de entorno. La publicación consultada apunta al commit `814645dcda4049b9b0872e109566dcaef1dcf53f`, anterior al código local actual.
- El archivo publicado `/js/config.js` todavía define `API_URL` como `https://tutor-ia-backend.onrender.com`. El código local ya usa `window.location.origin` en producción. Es necesario publicar el código actual para completar la migración.
- La conexión de PostgreSQL y la URL de Supabase configuradas localmente corresponden al mismo proyecto `rayjtupppcbhzjizhamn`. Se consultaron sus esquemas y referencias con transacciones `BEGIN READ ONLY`; no se modificó la base.
- Banco actual: 1.776 preguntas de Educación y 571 de Medicina. Los campos dedicados `image_url` y `explanation_image_url` están vacíos. Los 251 casos de Educación tampoco tienen imagen dedicada.
- Hay 68 preguntas de Educación con imágenes incrustadas en su HTML de TinyMCE. Se encontraron 74 referencias: 69 objetos únicos de GCS y cinco referencias externas. Los metadatos de los 69 objetos de GCS se recuperaron correctamente; no faltan archivos de ese conjunto en el bucket `hubacademia.com`.
- Las referencias internas incrustadas usan el antiguo proxy de Render. El resolver anterior devolvía sin modificación cualquier URL absoluta, conservando esa dependencia aunque el resto del backend hubiese migrado.

Las imágenes externas no se migraron ni se afirmó su disponibilidad. La consulta de metadatos confirma existencia y acceso de lectura con la cuenta local; no sustituye una validación del quiz publicado.

## Campos reales y representación en el quiz

| Contenido | Campo persistido | Uso |
| --- | --- | --- |
| Enunciado, con imágenes insertadas en TinyMCE | `question_bank.question_text` | HTML con etiquetas `<img src="...">`; lo renderiza `MarkdownRenderer`. |
| Explicación, con imágenes insertadas en TinyMCE | `question_bank.explanation` | HTML/Markdown renderizado en la retroalimentación o revisión. |
| Imagen independiente del enunciado | `question_bank.image_url` | Imagen separada, fuera del texto enriquecido. |
| Imagen independiente de la explicación | `question_bank.explanation_image_url` | Contenedor específico de explicación en Quiz. |
| Descripción de caso compartido | `case_scenarios.description_text` | Puede incluir contenido enriquecido propio del caso. |
| Imagen independiente del caso | `case_scenarios.image_url` | La consulta del banco la expone como `case_image_url`; ese alias no es una columna de `question_bank`. |
| Tarjetas | `user_flashcards.image_url`, `explanation_image_url` | Anverso y reverso, respectivamente. |

No hace falta trasladar las imágenes incrustadas a los campos independientes. El HTML ya conserva la asociación correcta con su pregunta. No se ejecutó una migración SQL ni se reasignaron imágenes.

## Correcciones implementadas

1. `js/config.js`: `resolveImageUrl` reconoce los endpoints internos históricos `/api/media/gcs`, `/api/media/explanation` y `/api/media/preview` en Render y los convierte al proxy del origen actual usando `?file=`. También normaliza las rutas internas equivalentes y `&amp;` en los enlaces. Conserva las URLs de terceros.
2. `MarkdownRenderer` ya aplica el resolver a cada `<img>`, incluyendo HTML generado por TinyMCE. Quiz conserva su asociación y sus contenedores; no se cambia la pregunta para resolver la migración de hosting.
3. `mediaController.js`: el envío desde GCS usa `pipeline` con manejo de errores del stream y evita cachear respuestas de error como imágenes inmutables.
4. `adminController.js`: una subida fallida de imagen ahora interrumpe el guardado, en lugar de guardar la pregunta o caso sin el archivo. Las referencias existentes se mantienen al editar solo texto. Las versiones compartidas del bucket se retienen para evitar borrar imágenes reutilizadas por otros contenidos; su limpieza requiere mantenimiento con análisis global de referencias.
5. El sanitizador de imágenes Base64 de TinyMCE requiere persistencia en GCS: se retiró el respaldo que escribía en `public/assets/`, incompatible con la persistencia de una Function. Un fallo devuelve un error al editor y no guarda esa pregunta como si la subida hubiera terminado.
6. `googleCredentials.js`: mantiene credenciales JSON/Base64 en memoria, trata Vercel como entorno remoto y evita que un error de parseo registre fragmentos de una clave.
7. `vercel.json`: tiempo máximo de Function de 300 segundos; los assets estáticos se excluyen del paquete de la Function y se sirven mediante el output público de Vercel.
8. `.vercelignore`: excluye secretos, herramientas locales y originales pesados de producción visual. Los derivados web continúan publicados. El enlace local al proyecto correcto quedó en `.vercel/project.json`, ignorado por Git.

## Configuración ya registrada en Vercel

Todas estas variables están limitadas a **Production**. No es necesario volver a copiarlas desde Render:

| Variable | Valor |
| --- | --- |
| `GCS_BUCKET_NAME` | `hubacademia.com` |
| `GOOGLE_CLOUD_PROJECT` | `gen-lang-client-0179928353` |
| `GOOGLE_CLOUD_LOCATION` | `us-central1` para embeddings regionales |
| `VERTEX_GENERATIVE_LOCATION` | `global` para generación Gemini |
| `VERTEX_MODEL_PRIMARY` | `gemini-3.5-flash-lite` |
| `VERTEX_MODEL_FALLBACK` | `gemini-3.8-flash` |
| `BACKEND_PUBLIC_URL` | `https://www.hubacademia.com` |
| `FRONTEND_URL` | `https://www.hubacademia.com` |
| `APP_URL` | `https://www.hubacademia.com` |
| `PG_POOL_MAX` | `2` |
| `NODE_ENV` | `production` |

Se corrigió el identificador por defecto `gemini-3.6-flash-lite`, que no corresponde al Flash-Lite documentado. Los IDs de los modelos actuales y sus regiones se contrastaron con [Gemini 3.5 Flash-Lite](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-5-flash-lite), [Gemini 3.8 Flash](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-8-flash) y el [ciclo de vida de modelos de Google](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/model-versions). El respaldo anterior `gemini-3.6-flash` tiene retirada anunciada para el 19 de noviembre de 2026.

`getVertexGenerativeEndpoint()` centraliza el endpoint global para Tutor, reescritura RAG y diagnóstico. El SDK instalado admite `apiEndpoint: 'aiplatform.googleapis.com'`. Los embeddings conservan su endpoint regional y el índice Pinecone; no se cambiaron sus dimensiones ni se reindexaron documentos. No se hicieron llamadas de generación de IA.

## Variables cargadas manualmente — 4 de noviembre

Las siguientes entradas ya figuran en [Environment Variables del proyecto](https://vercel.com/richards-projects-531b9e54/biblioteca-academica/settings/environment-variables), con alcance **Production**, tras la carga manual del usuario. Se verificaron nombres, tipos y alcance; no valores descifrados ni su funcionamiento:

| Variable | Tipo recomendado | Finalidad |
| --- | --- | --- |
| `NODE_DATABASE_URL` | Secret/sensible | Conexión PostgreSQL de Supabase. |
| `SUPABASE_URL` | Config | URL del proyecto de autenticación. |
| `SUPABASE_KEY` | Secret/sensible | Clave de Supabase que utiliza el servidor. |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret/sensible | Operaciones administrativas del backend. |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Secret/sensible | JSON completo de la cuenta de servicio para GCS, Google Enterprise AI y servicios Google existentes. |
| `PINECONE_API_KEY` | Secret/sensible | Acceso al índice RAG. |
| `PINECONE_HOST` | Config | Host del índice actual. |
| `MP_ACCESS_TOKEN` | Secret/sensible | Mercado Pago. |
| `MP_WEBHOOK_SECRET` | Secret/sensible | Validación de webhooks de Mercado Pago. |

En `GOOGLE_SERVICE_ACCOUNT_JSON`, pegar el contenido JSON completo de la cuenta de servicio, incluidas `project_id`, `client_email` y `private_key`. En Vercel se lee desde memoria. `GOOGLE_APPLICATION_CREDENTIALS` es la ruta usada para un archivo local; una ruta `/etc/secrets/...` de Render no proporciona a Vercel ese archivo.

`PINECONE_INDEX` no es necesario para el backend actual: las consultas usan `PINECONE_HOST` directamente. Tampoco hace falta copiar `PYTHON_DATABASE_URL`, `PORT` ni las rutas de archivos secretos de Render para esta Function Node.js. Los tokens de servicios internos solo aplican si se vuelve a habilitar un consumidor interno que los use.

El bucket usa las credenciales de la cuenta de servicio y sus permisos IAM; no necesita una API key diferente exclusiva del bucket. La cuenta existente pudo leer los 69 objetos auditados. No se alteraron sus roles, el bucket ni las credenciales de Google.

Las claves privadas se cargan como Secret/sensible, con alcance Production y sin prefijos públicos. La configuración de variables de Vercel se documenta en [Environment Variables](https://vercel.com/docs/environment-variables). Los secretos no se incluyen en los archivos del despliegue.

## Publicación completada

Tras la carga manual y la autorización del usuario se creó un despliegue **del código local actual** en `biblioteca-academica`, mediante la API de Vercel con target Production. El build remoto ejecutó `npm run build`, que generó la versión de assets `98761e0339f6`. La publicación terminó en READY y recibió los dominios `hubacademia.com` y `www.hubacademia.com`.

Se confirmó mediante lectura de archivos estáticos que el HTML del quiz utiliza la versión nueva de caché y que `config.js` publicado contiene los resolvers actuales y la entrega directa. No se ejecutó el quiz ni se inició ningún examen. No se eliminaron servicios de Render. La revisión automática rechazó anteriormente la transferencia de claves privadas sin aprobación explícita del payload; el usuario completó la carga manual como alternativa.

## Validación y límites

Se leyeron el proyecto y la publicación de Vercel, su configuración pública, columnas de Supabase, referencias HTML y metadatos de GCS. No se modificaron filas de la base ni objetos del bucket. No se ejecutaron suites de pruebas, navegador, inferencias de IA, cobros, ni build local. El código actual ya está publicado; queda al usuario la comprobación funcional antes de retirar Render. Un despliegue READY y los archivos correctos no se presentan como una validación completa de producción.
