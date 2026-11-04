# Arquitectura de medios: GCS y Vercel

Actualizado el 4 de noviembre de 2026, America/Lima. Implementación publicada en Production en el despliegue READY `dpl_4sV8LFQP8S3gH7kTbn1k1GQs29Fy`, con los dominios de Hub Academia asignados. Comprobación funcional por el usuario pendiente. Ver [MEDIA_DELIVERY_VERCEL.md](MEDIA_DELIVERY_VERCEL.md) para el inventario, la publicación, las limitaciones y el criterio de retirada de Render.

## Persistencia y asociación

- Los archivos multimedia se almacenan en el bucket privado de Google Cloud Storage; PostgreSQL/Supabase conserva referencias y contenido enriquecido.
- TinyMCE guarda imágenes incrustadas en `question_bank.question_text`, `question_bank.explanation`, `case_scenarios.description_text` y `resources.content_html`.
- Los campos dedicados `image_url` y `explanation_image_url` son opcionales y distintos de los `<img>` del HTML. No es necesario duplicar las imágenes de TinyMCE en estos campos.
- `question_bank.case_id` mantiene el enunciado común del caso; `case_image_url` es un alias de `case_scenarios.image_url` en las consultas del quiz.
- El inventario ampliado encontró 68 preguntas y 22 casos con imágenes incrustadas, además de diez imágenes de tarjetas: 99 objetos de GCS referenciados y existentes. Las referencias externas conservan su proveedor.

## Visualización

1. `resolveImageUrl` en `js/config.js` interpreta rutas de GCS, assets locales, URLs externas y los endpoints históricos propios de Render.
2. `resolveHtmlMediaUrls` normaliza los atributos de imágenes, TinyMCE, srcset y enlaces multimedia internos. El renderer común mantiene su sanitización independiente.
3. Las imágenes raster usan la ruta estable `/api/media/gcs?file=...&delivery=direct`.
4. El backend valida el prefijo y genera una firma V4 de lectura de una hora. Devuelve un 302 no cacheable; GCS entrega los bytes al navegador. La URL temporal no se almacena en la base.
5. Si no se puede firmar, el controlador usa el proxy del origen actual. No depende del servidor de Render.

El mismo recorrido cubre preguntas, enunciados comunes de casos, opciones, explicaciones, recursos, notas, tarjetas y el editor de guías. El panel administrativo ya no conserva sin normalizar los enlaces absolutos históricos de Render al abrir contenido.

## Rutas, acceso y caché

- `/api/media/gcs`: lectura general con `optionalAuth` y validación de prefijos. No debe describirse como una ruta que exige JWT a cada etiqueta `<img>`.
- `/api/media/preview`: requiere autenticación y rol de administración. Conserva la entrega binaria del mismo origen para clientes que usan `fetch().blob()`.
- `file` es el parámetro recomendado; se conserva `path` por compatibilidad.
- `download=true` fuerza descarga; SVG siempre se entrega como adjunto. Descargas y preview mantienen el proxy.
- La entrega directa se aplica a GET de imágenes PNG/JPG/WebP/GIF/AVIF. El bucket no se hace público ni se cambia IAM.
- Redirects firmados y errores usan `Cache-Control: no-store` y `Vercel-CDN-Cache-Control: no-store`.
- El proxy admite caché de un día para imágenes de estudio; medios personales, descargas y preview usan caché privada/no-store.
- Mostrar una imagen en `<img>` no requiere añadir CORS a GCS. Leer sus bytes por `fetch` o canvas a través del redirect sí requiere contemplar CORS; para esos consumidores se conserva el proxy sin `delivery=direct`.

## Carga desde administración

El editor conserva los datos localmente durante la redacción (`automatic_uploads: false`). Al pulsar Guardar, llama explícitamente `editor.uploadImages()`: cada imagen se envía por separado como binario a `/api/admin/upload-editor`. Solo cuando terminan las subidas se sincronizan los campos y se envía el formulario.

El formulario de casos usa `coverImage`, conforme al contrato de Multer. Se limita cada imagen a 4 MiB y se comprueba el tamaño total del formulario para dejar margen bajo los 4,5 MB admitidos por Vercel. Importaciones grandes y archivos mayores requieren división o un futuro flujo de subida directa a GCS; no se deben enviar como un único JSON Base64.

El backend conserva un sanitizador Base64 defensivo para otros clientes. Una subida fallida interrumpe el guardado, tanto en preguntas/casos como en recursos. Se retiraron los respaldos en disco de `public/assets`: una Function no ofrece persistencia para esas escrituras.

Sharp valida el formato real, aplica orientación, limita el ancho a 1.000 px sin ampliar y convierte a WebP con calidad 80. No se afirma conservación de metadatos que el código no realiza. Las nuevas versiones reciben nombres únicos.

## Integridad y versiones anteriores

Las carpetas compartidas `cases`, `questions`, `explanations`, `editor-content`, `recursos`, `cursos`, `carreras` y `thumbnails` se retienen aunque un formulario retire una referencia. Esa retirada no demuestra que ninguna otra entidad use el objeto.

`deleteFile` solo permite borrar físicamente esos archivos mediante una operación interna explícita con `deleteSharedAsset: true`; los flujos habituales no pasan esa opción. Se necesita un análisis global de referencias antes de habilitar una recolección de versiones antiguas. No existe un endpoint nuevo que fuerce ese borrado. Las políticas de eliminación y propiedad de archivos personales siguen siendo independientes.

La consecuencia deliberada es conservar algunas versiones sin uso hasta contar con mantenimiento seguro, a cambio de proteger contenido compartido. La auditoría y las modificaciones actuales no borraron objetos ni cambiaron filas de la base de datos.

## Entorno

Vercel utiliza `GCS_BUCKET_NAME` y las credenciales en memoria de `GOOGLE_SERVICE_ACCOUNT_JSON` (JSON completo o Base64). La ruta de un Secret File de Render no es una credencial utilizable por sí sola en Vercel. El archivo local de cuenta de servicio y `.env` se excluyen del despliegue.

La presencia de variables no verifica por sí sola su contenido, permisos ni funcionamiento. Los detalles del proyecto y los pasos pendientes figuran en [VERCEL_ONLY_MEDIA_HANDOFF.md](VERCEL_ONLY_MEDIA_HANDOFF.md).

