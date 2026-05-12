# 🚀 Guía de Estrategia de Demos para Invitados (Guest Demo)

Este documento describe la arquitectura modular para las demostraciones (demos) de Hub Academia. El objetivo es permitir que usuarios no registrados prueben las funcionalidades principales con datos reales, manteniendo una experiencia fluida y realista.

## 🏗️ Arquitectura General (Evolución V2.0)

La estrategia ha evolucionado de datos estáticos a un modelo de **Alta Fidelidad**:
1.  **Demos Dinámicas (Simuladores)**: Uso del endpoint `/api/quiz/demo` para obtener preguntas aleatorias reales de la base de datos, eliminando la dependencia de archivos JS pesados.
2.  **Aislamiento de Dominios**: Separación estricta de historial y estadísticas entre Medicina y Educación mediante sufijos en `localStorage`.
3.  **Sistema de Límites Progresivos**: Control de acceso basado en tiempo y cantidad para incentivar la conversión (registro).

---

## 📂 Componentes Principales

### 1. Motor de Consultas Demo (`/api/quiz/demo`)
- **Funcionamiento**: El controlador `quiz.js` detecta el modo invitado y consulta este endpoint.
- **Ventaja**: El usuario prueba la calidad real de la casuística del banco sin consumir tokens de IA.
- **Anti-Repetición**: Soporta el parámetro `excludeIds` enviado desde el cliente para garantizar contenido nuevo en cada sesión.

### 2. Persistencia Local Segmentada (`localStorage`)
Para evitar cruces de información entre especialidades:
- **Estadísticas**: Se guardan como `guest_demo_stats_medicina` o `guest_demo_stats_educacion`.
- **Historial de Vistas**: Se guardan como `guest_seen_ids_medicina` o `guest_seen_ids_educacion`.

### 3. Motor de Analíticas del Dashboard (`simulator-dash.js`)
- El Tablero detecta si el usuario es invitado y busca los datos en el `localStorage` según el dominio actual.
- **Fallback de Marketing**: Si el usuario no tiene sesiones previas, se muestran **Datos de Ejemplo (Mock)** contextualmente correctos (temas pedagógicos para educación, temas clínicos para medicina) para demostrar el potencial del sistema.

### 4. Reinicio Diario y Límites de Sesión
Para incentivar el registro sin bloquear permanentemente al prospecto:
- **Límite de 3 Sesiones**: El usuario puede realizar hasta 3 simulacros rápidos de 10qs por dominio en un periodo de 24 horas.
- **Lógica de Reinicio (`Daily Reset`)**: El sistema compara la fecha actual con `localStorage.demo_sessions_date`. Si es un nuevo día, el contador se reinicia a 0 automáticamente.
- **Anti-Repetición Persistente**: A diferencia del contador, los `guest_seen_ids` persisten para que, si el usuario vuelve al día siguiente, no vea las mismas preguntas que ya respondió. Solo se limpian si el banco de preguntas se agota totalmente para ese usuario.

---

## 🛡️ Resiliencia y Manejo de Errores

### Mecanismo de Autocuración (Corrupted Session Recovery)
Dado que el simulador guarda el progreso en `localStorage` para permitir recargas de página, existe el riesgo de que los datos se corrompan o queden obsoletos tras una actualización de código.
- **Detección**: En `quiz.js`, el bloque `initQuiz` está envuelto en un `try-catch` global.
- **Acción**: Si se detecta cualquier error de inicialización, el sistema asume que la sesión local está dañada, la elimina automáticamente (`localStorage.removeItem`) y redirige al usuario para iniciar una sesión fresca desde el backend.
- **Bypass de Demo**: Las sesiones en modo demo ignoran intencionalmente cualquier rastro de sesiones guardadas previas para evitar conflictos entre estados de usuario registrado y estados de invitado.

---

## 🛠️ Implementación por Módulo

### 🩺 Módulo de Simuladores (Médico y Educación)
- **Activación**: Al hacer clic en "Simulacro Rápido" (10 preguntas) como invitado.
- **Targeting Forzado**: 
  - **Medicina**: Solo extrae preguntas del banco real con `target = 'SERUMS'`.
  - **Educación**: Solo extrae preguntas del banco real con `target = 'ASCENSO'`.
- **Mapeo de Dominios**: El frontend mapea automáticamente `MEDICINA -> medicine` y `EDUCACION -> education` para compatibilidad con el esquema de la DB.
- **Configuración Gatekeeper**: Los invitados no pueden configurar áreas; reciben un "Popurrí" aleatorio de todo el banco del dominio seleccionado.

### 🚀 Control de Versiones (Cache Busting)
Para asegurar que las correcciones lleguen a todos los usuarios de inmediato (evitando el caché del navegador):
- Se utiliza el parámetro `?v=YYYYMMDD_vX` en la importación de scripts en los archivos HTML (ej: `quiz.html`).
- **IMPORTANTE**: Al realizar cambios críticos en la lógica de `quiz.js` o `simulator-dash.js`, se debe incrementar esta versión en el HTML correspondiente.

---

## 📊 Resumen de Keys en LocalStorage

| Key | Propósito | Reset |
|-----|-----------|-------|
| `demo_sessions_count` | Contador de intentos del día | Diario |
| `demo_sessions_date` | Fecha de la última sesión | N/A |
| `guest_seen_ids_[domain]` | IDs de preguntas ya respondidas | Al agotar banco |
| `guest_demo_stats_[domain]` | Data para gráficos de dashboard | Manual / Nunca |
| `current_exam_session` | Sesión activa (Resiliencia) | Al terminar / Expirar |

---

## 💎 Beneficios
- **Alta Fidelidad**: El usuario prueba el producto REAL, no una maqueta.
- **Conversión Progresiva**: 3 sesiones diarias son suficientes para demostrar el valor antes de pedir el registro.
- **Eficiencia**: Cero consumo de créditos de IA para usuarios no registrados.
- **Orden**: Aislamiento total entre perfiles médicos y docentes desde el primer clic.
