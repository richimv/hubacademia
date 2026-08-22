# Prompts para completar Hub Academia en producción

Fecha: 22 de agosto de 2026

Estos prompts cubren únicamente acciones que requieren acceso a Supabase, Render, Vercel o cuentas de prueba. No autorizan borrar, copiar, mostrar, rotar ni versionar `.env` o `service-account-key.json`.

Estado verificado contra la base configurada el 22 de agosto de 2026: las cuatro migraciones están aplicadas. La comprobación posterior de solo lectura confirmó 0 preferencias obsoletas y 0 mazos con clasificación heredada del módulo Idiomas. La migración de retiro preservó mazos y tarjetas al reclasificarlos para Repaso general.

## 1. Supabase: respaldo, migraciones y verificación

```text
Trabaja sobre el proyecto Hub Academia y actúa como DBA de producción. No modifiques ni muestres secretos. Antes de ejecutar SQL:
1) confirma visualmente el project ref/host de la base objetivo y que corresponde a producción;
2) crea y verifica un respaldo recuperable;
3) registra hora, operador y punto de restauración;
4) detente si no puedes confirmar el respaldo o si el tipo real de alguna columna contradice la migración.

Confirma el estado de las migraciones idempotentes del repositorio y ejecuta únicamente las pendientes. En la base configurada ya fueron verificadas las cuatro; no las repitas salvo que la comprobación corresponda a otro entorno:
- src/infrastructure/database/migrations/20260822_remove_runtime_ddl.sql
- src/infrastructure/database/migrations/20260821_secure_question_bank_and_payment_events.sql
- src/infrastructure/database/migrations/20260821_secure_quiz_sessions.sql
- src/infrastructure/database/migrations/20260822_retire_languages_module.sql

Después valida sin exponer datos de usuarios:
- existen payment_events, quiz_sessions y quiz_session_questions;
- quiz_history.source_session_id existe y tiene índice único parcial;
- decks.category y decks.updated_at existen;
- unaccent y fuzzystrmatch están instaladas;
- anon y authenticated no tienen SELECT en question_bank;
- no existen políticas SELECT públicas en question_bank;
- anon/authenticated no tienen privilegios en payment_events, quiz_sessions ni quiz_session_questions.

Confirma que no quedan categorías/orígenes obsoletos ni preferencias del dominio retirado; el resultado verificado actual es 0/0. Ejecuta además una prueba transaccional que haga ROLLBACK para comprobar inserción y unicidad en payment_events y quiz_sessions, sin dejar filas. Entrega evidencia de cada verificación, tiempos, cualquier warning y el procedimiento exacto de rollback. No habilites todavía SECURE_QUIZ_SESSIONS_ENABLED.
```

## 2. Render: configuración y despliegue gradual

```text
Configura y despliega el backend de Hub Academia en Render desde el commit aprobado. No leas ni imprimas valores de secretos; solo confirma presencia y alcance.

Precondiciones:
- las cuatro migraciones SQL del runbook fueron verificadas;
- npm audit reporta 0 vulnerabilidades;
- npm test -- --runInBand pasa;
- el servicio usa Node 22.

Configuración:
- Build Command: npm ci && npm run build
- Start Command: npm start
- NODE_ENV=production
- mantener SECURE_QUIZ_SESSIONS_ENABLED=false en el primer despliegue;
- configurar ML_SERVICE_TOKEN o INTERNAL_API_TOKEN con el mismo valor solo en consumidores autorizados;
- confirmar SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NODE_DATABASE_URL, GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION, GCS_BUCKET_NAME, MP_ACCESS_TOKEN y MP_WEBHOOK_SECRET sin mostrar sus valores;
- para Google usar ADC o una ruta de archivo secreto válida; no copiar service-account-key.json al repositorio;
- cargar el certificado CA correcto de la conexión PostgreSQL como NODE_DATABASE_SSL_CA_BASE64 y activar NODE_DATABASE_SSL_REJECT_UNAUTHORIZED=true. Si falla, revertir ambas variables y documentar el error; no desactivar la verificación silenciosamente.

Despliega primero con el flag seguro apagado. Verifica /health, login Google, POST /api/auth/sync, carga/lectura de una imagen, biblioteca, TTS, chat, simulador legado y webhook sandbox firmado/idempotente. Comprueba HSTS y Content-Security-Policy-Report-Only.

Después habilita SECURE_QUIZ_SESSIONS_ENABLED=true y vuelve a desplegar. Ejecuta simuladores de Medicina y Educación de 10, 20 y modalidad real. Confirma que /start devuelve quizSessionId pero nunca correct_option_index, answer_payload ni explanation antes de responder; confirma que un doble submit no duplica quiz_history. Monitorea errores 4xx/5xx y latencia durante 30 minutos. Si falla un criterio, restaura el flag a false y vuelve al deploy anterior.
```

## 3. Vercel: frontend y pruebas de humo

```text
Despliega el frontend de Hub Academia en Vercel conservando el dominio hubacademia.com y el rewrite /api hacia Render. No cambies DNS ni dominios sin autorización explícita.

Antes del deploy ejecuta npm ci, npm run build dos veces y confirma que la segunda ejecución indique 0 HTML modificados. Verifica que el Output Directory efectivo siga siendo src/presentation/public según la configuración actual del proyecto.

Tras desplegar:
- valida desktop y móvil en /, /login, /dashboard, /library, /profile, /pricing, /quiz, /repaso y /simulator-dashboard;
- inicia sesión, recarga, cambia de pestaña y espera una renovación de token; POST /api/auth/sync debe responder 200 y no entrar en bucle;
- confirma que JS/CSS usan la misma versión hash y reciben cache immutable;
- confirma que HTML usa no-cache;
- prueba carga, preview y eliminación autorizada de una imagen;
- revisa consola y Network: no debe haber 401/503 repetitivos, mixed content, tokens en query string ni respuestas con answer keys;
- valida que CSP está en Report-Only y recopila violaciones reales sin bloquear al usuario.

Entrega URLs verificadas, capturas de Network sin tokens, estado por criterio y rollback al deployment anterior si aparece una regresión crítica.
```

## 4. E2E de autorización con dos usuarios

```text
Ejecuta una prueba E2E de seguridad de Hub Academia con dos cuentas de prueba no administrativas A y B y una cuenta admin. No uses cuentas reales de clientes.

Casos obligatorios:
1) A sube una imagen de flashcard y puede verla/eliminarla.
2) B puede verla solo si la funcionalidad lo permite, pero no puede eliminarla ni alterar su path.
3) A y B no pueden usar traversal, prefijos GCS no permitidos ni redirects externos.
4) Solo admin accede a /api/media/preview y rutas /api/admin/*.
5) un Bearer inválido, expirado o de otra identidad no puede sincronizar ni suplantar id/email en /api/auth/sync.
6) las rutas internas rechazan ausencia o token incorrecto y aceptan solo el token de servicio.
7) repetir el mismo webhook sandbox firmado no activa dos veces la suscripción.
8) repetir submit del mismo quizSessionId no crea dos historiales.

Entrega matriz caso/resultado/status HTTP/evidencia y limpia únicamente los datos de prueba creados, dejando registro de lo eliminado. No borres buckets, tablas, usuarios reales ni archivos de credenciales.
```
