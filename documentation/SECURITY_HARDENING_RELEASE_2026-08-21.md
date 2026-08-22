# Hub Academia — Remediación de hallazgos prioritarios

Fecha de cierre técnico local: 22 de agosto de 2026
Estado: código, pruebas y cuatro migraciones verificados; las variables externas y pruebas de humo requieren despliegue controlado.

## Alcance

Esta remediación corrige controles de alto impacto identificados en la revisión técnica. No elimina, modifica ni rota `.env` ni `service-account-key.json`. Ambos permanecen como artefactos locales protegidos por `.gitignore`; la revisión local no los encontró versionados ni en el historial revisado.

## Cambios aplicados

- `/api/auth/sync` exige un Bearer verificado por Supabase y deriva `id`/`email` de esa identidad. El body ya no puede suplantar la identidad.
- `/api/internal/analytics-data` y `/api/internal/ml-data` requieren `ML_SERVICE_TOKEN` o `INTERNAL_API_TOKEN` y fallan cerrado si no existe configuración.
- Se eliminaron tokens de autenticación en query string del backend y del resolutor de imágenes del frontend. La vista previa administrativa de objetos privados ahora realiza un fetch autenticado y usa un Object URL temporal, que se revoca al reemplazarlo.
- Se retiraron los logs de `body` y `rawBody` del endpoint de chat.
- Las rutas GCS rechazan redirects arbitrarios, traversal, prefijos desconocidos y sirven SVG como descarga.
- Las cargas de flashcards registran owner en metadatos GCS; la eliminación no administrativa exige ownership.
- La referencia de Mercado Pago debe tener usuario y plan válidos; se eliminó el fallback silencioso a `basic`.
- Se agregó ledger idempotente `payment_events` para evitar replay de un `payment_id` ya procesado.
- Se retiraron las políticas de lectura pública de `question_bank`; esto bloquea las lecturas PostgREST públicas.
- Se preparó un flujo único de sesiones seguras para Medicina y Educación: la pregunta inicial se proyecta sin answer key ni explicación; la primera respuesta se bloquea con `FOR UPDATE`; el puntaje final se calcula desde PostgreSQL; y `source_session_id` hace idempotente el historial. Su migración ya está aplicada; se activa únicamente con `SECURE_QUIZ_SESSIONS_ENABLED=true` después de las pruebas de humo.
- Se eliminaron varios `onclick` dinámicos y se aplicó escape contextual/allowlists en recursos, perfil, notas, biblioteca, administración, diagnóstico IA, Repaso, dashboard y modales/toasts. Los iconos persistidos ya no pueden contener HTML arbitrario. La revisión completa de templates secundarios continúa como mejora evolutiva.
- El servidor dejó de modificar HTML, permisos de archivo o esquema PostgreSQL durante el arranque. El versionado de assets ahora es determinista y se ejecuta con `npm run build`; el DDL quedó en una migración explícita.
- Las credenciales de Google se resuelven de forma centralizada: `service-account-key.json` se admite como fallback únicamente en desarrollo/test y nunca se borra ni modifica; producción utiliza la ruta configurada o ADC.
- Las cargas de imagen se limitaron a 12 MB, dos archivos y formatos JPG/PNG/WebP; Sharp valida el contenido real, limita píxeles y elimina metadatos al convertir a WebP.
- Se retiraron `/media/explanation/:id` y `/media/resource/:id` porque no tenían implementación. Antes de retirarlos se verificó en la base configurada que no existían URLs almacenadas dependientes de esos endpoints.
- Se habilitó HSTS para tráfico HTTPS en producción y una CSP en modo `Report-Only` para medir compatibilidad antes de hacerla obligatoria.
- El consumo de vidas gratuitas usa una actualización condicional atómica para impedir sobreconsumo por concurrencia.
- El servicio ML reutiliza su pool SQL, parametriza el rango de días, dejó de consultar la columna inexistente `resources.publisher`, carga/vectoriza libros y expone `/health`.
- Se actualizaron Sharp, Mercado Pago, Google Cloud Storage y dependencias transitivas. `npm audit` reporta cero vulnerabilidades en el árbol completo.

## Orden de despliegue

1. Confirmar el backup y registrar que `20260822_remove_runtime_ddl.sql`, `20260821_secure_question_bank_and_payment_events.sql`, `20260821_secure_quiz_sessions.sql` y `20260822_retire_languages_module.sql` ya están aplicadas. La verificación posterior del retiro de Idiomas devolvió 0 mazos y 0 preferencias obsoletas.
2. Configurar `ML_SERVICE_TOKEN` en Render y en el servicio autorizado que consuma las rutas internas. No escribir el valor en Git ni en este documento.
3. Desplegar API y frontend inicialmente con `SECURE_QUIZ_SESSIONS_ENABLED=false`; validar health, autenticación, `/auth/sync`, pagos sandbox, media y simuladores legados.
4. Habilitar `SECURE_QUIZ_SESSIONS_ENABLED=true` primero en un entorno de prueba y ejecutar un intento de 10, 20 y 100 preguntas en Medicina y Educación, además de una demo anónima.
5. Habilitar el indicador en Render para producción y comprobar que la respuesta de `/start` contiene `quizSessionId` pero no `correct_option_index` ni `explanation`.
6. Desplegar/validar Vercel: login, reanudación del simulador, siguiente lote, respuesta, envío/reintento idempotente, carga/vista previa de imágenes, biblioteca, tarjetas y detalle de recursos.
7. Confirmar que ningún consumidor legítimo siga enviando `?token=`. Los tokens deben viajar en `Authorization: Bearer ...`.
8. Revisar logs de Render durante la primera ventana de tráfico y confirmar que no contienen prompts, cuerpos completos ni tokens.

## Validación local

- 27 suites de Jest pasan.
- 178 pruebas pasan.
- 139 archivos JavaScript pasan `node --check`.
- 11 archivos Python pasan validación AST.
- `npm audit`: 0 vulnerabilidades totales.
- El build de assets genera la misma versión en ejecuciones consecutivas y la segunda ejecución no modifica archivos.
- Versión determinista verificada en este cierre: `4dfb61f234f8`.

## Pendientes que no se deben considerar cerrados

- Las cuatro migraciones ya están aplicadas y verificadas; falta confirmar variables de Render y ejecutar las pruebas de humo del despliegue.
- Configurar la CA de PostgreSQL en Render y activar `NODE_DATABASE_SSL_REJECT_UNAUTHORIZED=true`; la conexión actual presenta una cadena autofirmada si se activa sin proporcionar la CA.
- Prueba e2e real de ownership de media con dos usuarios distintos.
- Prueba de replay de webhook contra una base con `payment_events` aplicado.
- Prueba de RLS/grants en Supabase productivo.
- Activar `SECURE_QUIZ_SESSIONS_ENABLED` de forma gradual y completar las pruebas de humo/e2e antes de declarar F-03 cerrado en producción; su migración ya está aplicada.
- Unificación futura de la reserva atómica para contadores diarios/mensuales; el contador global gratuito ya quedó atómico.
- Revisión completa de interpolaciones HTML restantes fuera de los componentes modificados.
- Convertir CSP de `Report-Only` a obligatoria después de revisar reportes y retirar gradualmente `unsafe-inline`/`unsafe-eval`.

Los prompts operativos exactos están en `documentation/PRODUCTION_COMPLETION_PROMPTS_2026-08-22.md`.
