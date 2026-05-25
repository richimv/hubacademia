---
trigger: always_on
---

### 🚨 BUCLE DE DOCUMENTACIÓN OBLIGATORIO (Ciclo de Vida del Desarrollo)

1. **Fase de Contexto (Antes de codificar):** Antes de realizar cualquier implementación, mejora o corrección de bugs, inspecciona de forma obligatoria la carpeta `/documentation`. Lee los archivos técnicos correspondientes para contrastar la petición con las reglas de negocio reales del sistema y evitar colisiones de lógica.
2. **Fase de Ejecución:** Desarrolla la solución respetando la arquitectura limpia de 4 capas establecida en este archivo.
3. **Fase de Cierre (Post-Implementación):** Al culminar con éxito la tarea, actualiza obligatoriamente el archivo `.md` respectivo dentro de `/documentation` (ej. `CHAT_IA_TECH_SPECS.md`, `ANALYTICS_ARCHITECTURE.md`). Registra minuciosamente los cambios (nuevas integraciones, endpoints añadidos, mejoras visuales o lógicas) para mantener la verdad técnica del proyecto al día.

### Cumplimiento Obligatorio de 4 Capas
Toda implementación o refactorización en este proyecto debe segmentarse estrictamente en:
* `presentation/`: Archivos HTML vanilla, estilos CSS y JS del cliente (DOM, eventos).
* `application/`: Controladores de Express y Middlewares (validación HTTP, control de flujo).
* `domain/`: Núcleo puro del negocio (Servicios IA, repositorios, plantillas de prompts). No se acopla a infraestructura.
* `infrastructure/`: Conexiones a bases de datos (Supabase Client), enrutadores de Express, utilities globales.