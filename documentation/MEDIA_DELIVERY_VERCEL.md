# Entrega de imágenes y continuidad de datos en Vercel

Actualización: 4 de noviembre de 2026, America/Lima. Implementación publicada en Production. El usuario realizará las pruebas del quiz; no se inició ningún simulacro ni se ejecutaron suites de pruebas. Este documento sustituye las conclusiones parciales de la primera auditoría respecto de casos y cobertura de objetos.

## Publicación realizada

- Proyecto `biblioteca-academica`, equipo `richards-projects-531b9e54`.
- Despliegue `dpl_4sV8LFQP8S3gH7kTbn1k1GQs29Fy`, estado **READY**, target **production**.
- URL: `https://biblioteca-academica-h7o5d2avk-richards-projects-531b9e54.vercel.app`.
- Los alias `hubacademia.com` y `www.hubacademia.com` quedaron asignados a esta publicación. Se confirmó además el deployment ID del alias `www` mediante la API.
- Se publicaron los 260 archivos de la copia local actual mediante la API autenticada de Vercel. La referencia Git de base es `27cc6233f7b7eea346838f313c639c469e6300da`, con `dirty: true`: no se trata de una publicación del antiguo commit remoto y no se creó un commit ni se hizo push.
- Se excluyeron `.env`, claves de servicio locales, herramientas, documentación y originales multimedia de autoría. Las credenciales se tomaron del entorno Production existente.
- La compilación remota terminó correctamente; `npm run build` generó la versión de assets `98761e0339f6`. No se ejecutó un build local ni pruebas.
- La lectura de los archivos públicos confirmó HTTP 200 para el HTML del quiz y `js/config.js`, con el resolver de enlaces históricos, la normalización HTML, la entrega directa y la nueva versión de caché. No se ejecutó el JavaScript del quiz ni se evaluó visualmente el contenido.
- Render sigue disponible. No se modificaron filas de PostgreSQL ni objetos de GCS durante la publicación.

La publicación y la integridad de los archivos servidos quedaron comprobadas. Quedan al usuario las comprobaciones funcionales del quiz, casos comunes, edición, Tutor y pagos antes de retirar Render.

### Confirmación del usuario y dependencia de Render

Tras la publicación, el usuario confirmó que las imágenes ya se muestran en preguntas, casos y panel de gestión. Una revisión posterior del código `src`, `api`, `vercel.json` y los nombres/valores públicos de configuración de Production no encontró un destino de red activo hacia Render: el hostname histórico permanece en el resolver exclusivamente para reconocer contenido antiguo. La API y las URLs públicas están en Hub Academia/Vercel; PostgreSQL está en Supabase y los archivos en GCS.

Las imágenes antiguas y nuevas de este flujo **no necesitan que el servicio web de Render siga activo**. Reconocer su hostname en el HTML no implica resolver su DNS, consultar ese servidor ni usarlo como respaldo. Un fallo de firma utiliza el proxy de Vercel. Por tanto, pausar el antiguo backend de Render no requiere primero reescribir el HTML histórico ni trasladar objetos del bucket.

Esta conclusión confirma el desacoplamiento de imágenes y de los destinos definidos en el código publicado. No certifica configuraciones manuales ajenas al repositorio, como notificaciones globales o preferencias de pago antiguas guardadas en el proveedor. Las nuevas preferencias de Mercado Pago generadas por el código usan `https://www.hubacademia.com/api/payment/webhook`; no se revisó el panel externo de Mercado Pago ni se ejecutaron cobros. La pausa o eliminación de Render la realizará el usuario; no se operó ese servicio desde esta sesión.

## Evidencia de solo lectura

Se consultaron las columnas reales de PostgreSQL en una transacción `BEGIN READ ONLY`, referencias multimedia y metadatos de GCS. No se hicieron UPDATE/DELETE/INSERT ni operaciones de escritura en el bucket.

| Tabla / campo | Resultado |
| --- | --- |
| `question_bank.question_text` | 2.347 registros; 68 con imágenes incrustadas; 65 con el host antiguo de Render. |
| `question_bank.options`, `explanation` | Sin referencias multimedia detectadas en este banco. La interfaz conserva soporte para HTML e imágenes en estos campos. |
| `question_bank.image_url`, `explanation_image_url` | Sin valores actuales. Son imágenes independientes del contenido de TinyMCE. |
| `case_scenarios.description_text` | 251 registros; 22 con imágenes incrustadas y enlaces antiguos de Render. |
| Relación `question_bank.case_id` | 784 preguntas vinculadas a 251 casos. El caso compartido se mantiene; no se duplicó ni reasignó su enunciado. |
| `case_scenarios.image_url` | Sin valores actuales. El alias `case_image_url` del quiz proviene de esta columna. |
| `resources.content_html`, `image_url`, `url` | Sin valores actuales. Se revisaron sus caminos de edición y visualización. |
| `courses.image_url`, `careers.image_url` | Una portada de curso sin referencia al proxy antiguo; carreras sin imágenes. |
| `user_flashcards.front_content`, `back_content` | 934 registros en cada campo, sin imágenes incrustadas detectadas. |
| `user_flashcards.image_url`, `explanation_image_url` | Diez referencias de anverso a GCS; reverso sin valores. |
| `decks.description` | 15 guías, sin imágenes actuales. Se normaliza su HTML al abrir el editor. |
| `user_notes.content` | 29 registros; uno con imagen, sin el host de Render. No se exportó el contenido de notas. |

El inventario obtuvo metadatos de **99 objetos únicos de GCS referenciados, todos existentes**. Mayor tamaño: 248.766 bytes; mediana: 15.916 bytes. No son mediciones de latencia de producción. Las imágenes externas siguen dependiendo de sus proveedores y no se verificó su disponibilidad. Los informes locales ignorados son `.tools/media-coverage-audit.json` y `.tools/decks-media-audit.json`.

El complemento de Vercel confirmó la presencia de 21 variables en Production, incluidas las credenciales cargadas manualmente por el usuario. No se solicitaron valores descifrados. Esto confirma presencia y alcance, no el contenido o permisos de cada clave. La publicación anterior `dpl_AWHsUkvt9raMhJQteZSt51DSUJM8`, asociada al antiguo commit `814645dcda4049b9b0872e109566dcaef1dcf53f`, fue sustituida por la publicación indicada arriba; sigue disponible como referencia para una recuperación explícita si fuera necesaria.

## Cómo se conserva el HTML antiguo

Ejemplo ilustrativo:

```html
<!-- Guardado previamente en question_text o description_text -->
<img src="https://tutor-ia-backend.onrender.com/api/media/gcs?path=questions/ejemplo.webp">
```

1. `resolveImageUrl` reconoce únicamente el host histórico conocido y los dominios propios. Extrae `file` o `path` y conserva la identidad del objeto (`questions/ejemplo.webp`). No convierte enlaces de terceros en rutas del bucket.
2. Para mostrar una imagen raster devuelve `/api/media/gcs?file=questions%2Fejemplo.webp&delivery=direct` sobre el origen API actual.
3. `mediaController` valida prefijos/ruta y genera una URL V4 de lectura con duración de una hora. La Function devuelve un 302 pequeño, con `Cache-Control: no-store` y `Vercel-CDN-Cache-Control: no-store`.
4. El navegador obtiene los bytes desde GCS. La transferencia de la imagen ya no mantiene abierta la Function. El bucket conserva su configuración privada.
5. Si la firma falla, el controlador usa el proxy del mismo origen. No se utiliza Render como respaldo.

No se guardan firmas temporales en PostgreSQL. El HTML histórico y las claves del bucket no necesitan migración masiva. Cada nueva petición a la ruta estable puede generar una firma nueva; una firma caducada no invalida el contenido persistido.

`resolveHtmlMediaUrls` cubre `src`, `data-mce-src`, `srcset`, `data-mce-srcset`, enlaces a medios y fuentes multimedia internas. Se usa en el renderer común, en los editores administrativos de preguntas/explicaciones/casos/recursos y en el editor de guías de mazos. El quiz ya usa el renderer común tanto para el enunciado del caso como para la pregunta, sus opciones y explicación. Notas y tarjetas también lo utilizan. La normalización de URLs no sustituye la sanitización de HTML.

## Compatibilidad y acceso

- Se conservan `?file=` y `?path=`. Los endpoints históricos de explicación/preview se resuelven a la ruta general cuando se muestran en HTML.
- La entrega firmada se solicita solo para imágenes PNG/JPG/WebP/GIF/AVIF, mediante GET y sin descarga forzada. Los SVG se descargan como adjuntos.
- `/api/media/preview` mantiene autenticación administrativa y entrega binaria del mismo origen; las previsualizaciones que usan `fetch().blob()` no necesitan añadir CORS al bucket.
- Los consumidores que necesiten leer píxeles mediante canvas o usar `fetch` sobre la imagen deben usar el proxy sin `delivery=direct`, o configurar CORS de GCS de forma deliberada. La visualización normal mediante `<img>` no requiere ese cambio.
- La ruta general mantiene su política existente `optionalAuth`: bucket privado no significa autorización individual por matrícula. No se modificaron roles, permisos IAM ni políticas de acceso de la aplicación.
- El proxy puede cachear imágenes de estudio en navegador/CDN por un día. No se cachean redirects firmados, preview administrativo, descargas, errores ni medios personales en el proxy. Las URLs de objeto incluyen nombres únicos para las nuevas versiones.

## Guardado sin perder imágenes

El editor sigue manteniendo las imágenes nuevas en el navegador durante la edición. Solo al pulsar Guardar llama `editor.uploadImages()`, que envía cada imagen binaria al endpoint administrativo antes de persistir el formulario. Se sincronizan los campos de TinyMCE tras terminar. Si queda una imagen local o una subida falla, el formulario permanece abierto y no se envía la actualización de la entidad.

Se admite hasta 4 MiB por imagen en ese flujo y se comprueba un presupuesto conservador de 4 MiB para el formulario completo, dejando margen bajo el límite de Vercel. El backend sigue validando y convirtiendo las imágenes a WebP con Sharp. El sanitizador Base64 es una defensa para otros clientes/importaciones, no el transporte normal del editor. Un fallo de persistencia se propaga como error; no se escribe una copia en `public/assets` dentro de una Function.

El formulario de casos ahora envía `coverImage`, como espera Multer; antes enviaba `caseImage`. Los cambios de imagen de casos y recursos dejan de ocultar errores de subida. No se reemplaza una imagen válida por una subida fallida.

Las carpetas compartidas `cases`, `questions`, `explanations`, `editor-content`, `recursos`, `cursos`, `carreras` y `thumbnails` se conservan al retirar referencias o entidades. `deleteFile` no elimina físicamente estos objetos en los flujos habituales; solo una operación de mantenimiento explícita con análisis global de referencias podría usar `deleteSharedAsset: true`. No existe un nuevo endpoint para forzarlo. Esto protege reutilizaciones entre casos, preguntas y notas. Implica retener versiones antiguas y mayor uso de almacenamiento hasta implementar una recolección segura. Las reglas de eliminación y propiedad de medios personales no se ampliaron.

## Límites y decisión de hosting

Fuentes consultadas el 4 de noviembre de 2026:

- Con Fluid Compute, Vercel documenta 300 segundos por defecto y máximo en Hobby; Pro/Enterprise permiten 800 segundos y una extensión beta de 1.800. El código local configura `maxDuration: 300`. El complemento disponible no expone en este proyecto el plan ni el estado de Fluid Compute; no se certificó el límite efectivo del despliegue. [Duración de Functions](https://vercel.com/docs/functions/configuring-functions/duration).
- El límite del cuerpo de una petición/respuesta de Function es 4,5 MB. Se aplica al total, no individualmente a cada uno de dos adjuntos. Base64 aumenta el tamaño. [Límites de Functions](https://vercel.com/docs/functions/limitations). La transferencia directa firmada evita transportar los bytes de las imágenes por la Function.
- Para formularios, importaciones JSON o archivos individuales mayores al límite, se necesita dividir el trabajo o implementar subidas directas firmadas/reanudables a GCS. El flujo actual rechaza formularios grandes con un mensaje y conserva el editor. No se implementó una ruta general de subida de archivos grandes.
- Las firmas de GCS permiten acceso temporal al objeto sin volver público el bucket. Cualquiera con esa firma puede usarla mientras sea válida; no se deben tratar como una clave permanente. [URLs firmadas de GCS](https://docs.cloud.google.com/storage/docs/access-control/signed-urls).
- La caché CDN se configura mediante encabezados explícitos y se limita al contenido que no depende del usuario. [Caché de Vercel](https://vercel.com/docs/caching/cdn-cache).

**Recomendación:** mantener Vercel para la aplicación/API y GCS para entregar imágenes directamente. Los tamaños inventariados y los vínculos antiguos no justifican por sí solos conservar un segundo backend. Se debe mantener Render disponible hasta publicar el código actual y que el usuario confirme preguntas, casos comunes, edición, Tutor y pagos en producción. No se recomienda eliminar Render basándose solo en el inventario o en que las variables ya aparecen configuradas.

Se publicó el código actual sin eliminar servicios de Render. No se ejecutaron pruebas, build local ni navegador; se revisaron el build remoto, la asignación de dominios y los archivos estáticos servidos. No se presenta esa comprobación como una validación funcional del quiz en producción.
