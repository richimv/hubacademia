# Boletín IA y catálogo compartido de recursos

Actualización: 4 de noviembre de 2026.

## Separación de responsabilidades

`/library` es una página editorial pública de noticias y papers sobre inteligencia artificial. No muestra un archivo de Educación/Salud ni los materiales de todos los cursos. Su diseño usa cabecera corporativa, portada editorial, búsqueda, filtros por tipo y tarjetas con fuente, autor, miniatura y fecha de incorporación. Cada lectura abre su enlace original.

El catálogo `resources` sigue siendo compartido. El formato del recurso y su destino editorial son conceptos distintos:

| Campo | Función |
| --- | --- |
| `resource_type` | `book`, `paper`, `noticia`, `norma`, `guia`, `video`, `other`. La entrada antigua `article` se normaliza a `paper`. |
| `url` | Enlace HTTP/HTTPS al contenido externo, incluido Google Drive. |
| `image_url` | Miniatura/portada; las imágenes pueden estar en Google Cloud Storage. |
| `publish_in_bulletin` | Selección editorial explícita de una noticia o paper relacionado con IA. Predeterminado: false. |
| `visible` | Control de visibilidad del registro. |
| `course_books` y `topic_resources` | Asociaciones del mismo recurso con cursos y temas; no se duplican archivos. |

Se retira únicamente `resources.domain`. Los sectores de preguntas, casos y cursos se conservan. Los documentos PDF, Word o Excel enlazados permanecen en su origen. La carga masiva de Drive guarda enlaces y puede persistir miniaturas; no sube esos documentos al bucket.

## Publicar desde gestión

1. Crear o editar un Recurso y seleccionar Noticia o Paper.
2. Introducir título y enlace externo. Añadir autor/fuente y portada si corresponde.
3. Marcar «Publicar en el Boletín IA» únicamente para contenido relacionado con inteligencia artificial y mantenerlo visible.
4. Guardar. El Boletín lee la selección directamente, sin caché de publicaciones en el navegador.

El control editorial está disponible tanto en edición individual como en sincronización de Drive. El Boletín es público: al publicarlo se usa apertura directa del enlace y no se marca como material premium. Para otros formatos el control editorial queda deshabilitado; esos registros conservan su uso como materiales para cursos. Gestión permite filtrar por tipo y destino, sin clasificar recursos en Educación o Salud.

## Contrato técnico

- Presentación: `library.html`, `css/bulletin.css`, `js/bulletin.js`. El antiguo `library-layout.css` se retiró; esta página no inicia el buscador del catálogo académico.
- Aplicación: `BulletinController.getFeed`; ruta pública `GET /api/bulletin?type=noticia|paper&q=texto`.
- Dominio: `BookRepository.findBulletin` y `resourcePolicy.js`. El feed exige visible=true, publish_in_bulletin=true y tipo noticia/paper. Límite: 60 registros, más recientes primero.
- Infraestructura: PostgreSQL/Supabase y migración `20261104_resources_bulletin.sql`. Los parámetros de búsqueda son preparados; no se concatenan valores del usuario al SQL.
- Los endpoints de recursos/cursos se conservan, sin filtrar ni escribir el antiguo dominio del recurso.
- Las escrituras de recurso y sus relaciones usan un mismo cliente transaccional; no se reparte BEGIN/COMMIT entre conexiones del pool.
- El catálogo visual opcional del Tutor deriva el sector de la asociación con el curso. Las imágenes de preguntas y casos mantienen sus campos propios.

El Boletín no obtiene actualidad de un modelo generativo ni convierte automáticamente todos los papers en publicaciones de IA. La selección corresponde al editor. La fecha mostrada identifica la incorporación al catálogo, no una fecha de publicación original que no se haya registrado.

## Migración de producción

La inspección encontró 0 recursos, 0 relaciones course_books y 0 topic_resources. Se preservan IDs, enlaces y relaciones. La migración añade el indicador editorial, amplía URL y miniatura a TEXT, normaliza el alias article y retira domain; mantiene los permisos/RLS existentes.

El despliegue se hace en dos fases: preparar el campo nuevo manteniendo domain para la versión anterior; publicar el código compatible; después retirar domain y aplicar restricciones/índice editorial. Se conserva una copia local ignorada de la clasificación anterior antes del cambio final.

## Cursos futuros

El catálogo y sus asociaciones permiten un campus independiente en `cursos.hubacademia.com` sin copiar los materiales. Ese proyecto podrá compartir la API y los registros, configurando expresamente su autenticación y CORS para el nuevo origen. La página `course.html` y la infraestructura de cursos actuales se conservan.

## Correcciones móviles y CI de esta entrega

- Cabecera: se elimina «Mi cuenta» del menú móvil y se agrupan los detalles de perfil, incluida la flecha, para ocultarlos juntos en móvil.
- Hubi: sugerencias en una sola fila con desplazamiento horizontal nativo y placeholder «¿Qué necesitas saber?».
- Modos de examen: se retiran las reglas históricas que imponían dos columnas con !important. La hoja del simulador usa una columna hasta 900 px y adaptación por ancho disponible en escritorio.
- Navegación de portada: recorrido de 280 ms; los vídeos suspenden sus seeks durante la navegación y se sincronizan al terminar. Se conservan cancelación manual y movimiento reducido.
- Los CSS cargados dinámicamente usan ASSET_VERSION del script de configuración para evitar reutilizar una URL constante durante un año de caché.
- Se regeneró el lockfile desde un directorio limpio. npm ci --ignore-scripts completó en un directorio aislado y la revisión npm audit con umbral high terminó correctamente. Las dependencias locales se restauraron tras un bloqueo de DLL en Windows.
- El build genera las versiones del frontend que CI exige tener comprometidas; el orden del hash usa rutas normalizadas y comparación independiente del sistema.

No se ejecutaron pruebas funcionales locales ni inferencias. Los contratos de pruebas que dependían del campo retirado y de interfaces reemplazadas se actualizaron; el workflow existente de GitHub los ejecutará al publicar.
