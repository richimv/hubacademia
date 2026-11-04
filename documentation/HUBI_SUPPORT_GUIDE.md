# Hubi: atención de plataforma, marca y barra de créditos

Actualización: 4 de noviembre de 2026. Implementado localmente; no se ejecutaron pruebas, build, consultas de inferencia ni despliegues por indicación del usuario.

## Separación de servicios

La autorización del usuario introduce una excepción a la política general de Vertex AI: **solo Hubi de atención pública usa Google AI Studio/Gemini Developer API**. Quiz Tutor, Tutor de Flashcards, RAG y analítica conservan Vertex AI y sus cuotas existentes.

Hubi atiende preguntas sobre Hub Academia, sus productos y el uso de la plataforma. No recibe automáticamente preguntas de exámenes, mazos, notas o datos del perfil, no consulta cuentas ni pagos y no ejecuta acciones en nombre del usuario. El prompt lo restringe al contexto de la empresa y le indica derivar la tutoría académica al Tutor de la herramienta correspondiente.

## Contexto compacto y consumo

`domain/prompts/platformSupportContext.js` contiene una ficha curada de `BRIEF_MASTER.md`, `VISION_EMPRESARIAL.md` y el comportamiento vigente de la plataforma. Incluye identidad, servicios, rutas, acceso, pases, contacto y límites entre productos disponibles y proyectos futuros. No se envían los documentos internos completos ni se solicita al modelo que los resuma en cada consulta.

La ficha debe actualizarse al cambiar servicios, rutas, precios o disponibilidad. Ante contradicciones documentales se prioriza la implementación vigente: por ejemplo, el examen docente real usa 60 preguntas, base 90 puntos y 3 horas; no 90 preguntas.

- Mensaje: máximo 1.200 caracteres.
- Historial: hasta 4 mensajes recientes, máximo 800 caracteres por mensaje y 2.400 en total.
- Salida: máximo 512 tokens, con petición de respuesta breve y razonamiento mínimo.
- Las opciones numeradas de menú usan respuestas locales, sin inferencia.
- No hay escrituras de conversaciones en la base de datos.
- La atención no consume vidas, consultas académicas ni cuota de RAG.
- El limitador de atención permite 12 solicitudes/minuto por IP e instancia. Su memoria no representa un límite global distribuido entre funciones serverless; la cuota efectiva del proyecto la controla Google.

## Arquitectura

| Capa | Responsabilidad |
| --- | --- |
| Presentación: `js/chat.js` | Ventana, bienvenida abierta a preguntas, historial breve, mensajes y enlaces seguros. Se retiraron el contador ficticio de dos consultas de visitante y la navegación antigua por carreras/cursos. |
| Aplicación: `chatController.js` | Validación, respuesta HTTP y delegación en el servicio de atención. Mantiene el contrato `/api/chat`. |
| Dominio: `platformSupportService.js` | Contexto curado, historial acotado, menús y respaldo de orientación. Recibe el proveedor por inyección. |
| Infraestructura: `platformSupportGateway.js` | REST de Google, credencial privada, límite de salida, timeout de 10 s y errores sanitizados. |
| Composición: `controllers/index.js` | Conecta servicio y adaptador. |
| Enrutamiento: `apiRoutes.js` | Aplica limitador de atención; solo los contextos de Tutor pasan por el middleware de cuotas académicas. |

Ante timeout, rechazo, respuesta vacía o agotamiento de cuota se devuelve orientación local identificada como respaldo. No se reintenta con Vertex ni se cambia automáticamente a un proveedor de pago. Los errores registrados se limitan a categorías y no imprimen la clave ni los mensajes.

## Configuración privada

| Variable | Uso |
| --- | --- |
| `HUBI_AI_STUDIO_API_KEY` | Clave exclusiva del asistente público; solo servidor. |
| `HUBI_AI_STUDIO_MODEL` | Modelo configurable; valor inicial `gemini-3.5-flash-lite`. |

Las dos variables quedaron creadas en Vercel para Production, Preview y Development. **No se creó ningún despliegue**; los despliegues existentes conservan su configuración hasta que se vuelvan a desplegar.

Para trabajo local, la clave está en `.env.local`, ignorado por Git y excluido del paquete de Vercel. El arranque carga primero ese archivo y después `.env`, sin sobrescribir variables del entorno hospedado. `.env.example` contiene solamente nombres y valores de ejemplo, nunca la clave. Reiniciar el servidor local permite cargar la nueva configuración.

La disponibilidad y el nivel gratuito dependen del proyecto de Google; seleccionar un modelo no cambia la facturación de ese proyecto. Se consultaron las referencias oficiales de [precios](https://aistudio.google.com/docs/pricing#gemini-3.5-flash-lite), [autenticación](https://aistudio.google.com/docs/api-key) y [GenerateContent](https://aistudio.google.com/api-reference/generate-content). No se validó la credencial mediante una inferencia real.

## Privacidad

El enlace del chat dirige a `/privacy#hubi-atencion`. El aviso explica el envío de la consulta y del historial breve a Google, y las condiciones del nivel gratuito respecto de la mejora de sus productos. No se presenta este servicio como si tuviera el mismo tratamiento de datos que los tutores de Vertex. La interfaz pide evitar datos sensibles.

## Marca completa

Los recursos proporcionados `assets/hubacademiadark.png` y `assets/hubacademialight.png` ya contienen el símbolo H y el texto de la marca. Se utilizan completos, sin añadir otro logotipo o nombre a su lado.

`css/brand.css` es propietario de sus medidas y alternancia por `data-theme`. Las cabeceras y pies estáticos y los generados por `public-shell.js`/`workspace-shell.js` utilizan el mismo markup. El enlace tiene nombre accesible y las imágenes interiores son decorativas para evitar una lectura duplicada. Los símbolos de avatar y favicon mantienen su función propia.

## Barra de créditos

La fila de créditos ocupa 46 px sobre la cabecera, con superficies neutrales, contador y enlace a pases. Se retiró la promesa incorrecta «Ilimitado» y el rebote antiguo del contador.

`body.has-trial-mode` define `--trial-bar-height`. Las cabeceras, el relleno superior del cuerpo, las escenas sticky y los destinos de scroll usan esa misma variable en móvil y escritorio. Mostrar u ocultar la fila actualiza el atributo `hidden` y la clase de estado; no inyecta estilos visuales. Quiz, Flashcards y Login no muestran esta barra. Usuarios con pase activo y administradores conservan su exclusión.

La revisión funcional y visual final corresponde al usuario. El despliegue requiere una indicación posterior.
