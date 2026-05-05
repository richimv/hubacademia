# 🚀 Roadmap Estratégico: Hub Academia v3.0 (Arquitectura Multi-Servicio)

**Estado:** Definición de Flujo de Usuario y Escalabilidad de Servicios  
**Enfoque:** Ecosistema modular donde cada Facultad ofrece servicios especializados y creativos.

---

## 1. 🎯 La Visión: Centro de Entrenamiento Global
El Hub no es solo un banco de preguntas; es un **Centro de Entrenamiento** donde la página principal (`index.html`) actúa como el repartidor de tráfico hacia módulos especializados.

### 🏠 Nivel 1: El Centro de Entrenamiento (Index)
La sección principal presenta tarjetas de acceso directo a los pilares del ecosistema:
- **Flashcards:** Repaso universal (SM-2).
- **Arena:** Competición gamificada global.
- **Ciencias de la Salud:** Puerta de entrada para médicos y estudiantes de salud.
- **Preparación Educación:** (Próximamente) Puerta para docentes.
- **Idiomas:** (Próximamente) Puerta para aprendizaje de lenguas.

---

## 🏗️ 2. Flujo de Dominio: De la Facultad al Servicio
Cada facultad tiene su propia landing de servicios (`simulators.html`) que filtra la experiencia del usuario.

### 🏥 2.1. Dominio: Ciencias de la Salud
**Flujo:** `index.html` -> `simulators.html` (Salud)
En este portal, el usuario elige servicios creativos como:
- **Simulacro de Exámenes:** (Actual) Preparación para ENAM, SERUMS, Residentado.
- **Simulador de Diagnóstico por Imágenes:** Entrenamiento visual con casos radiológicos.
- **Simulador de Diagnóstico Médico:** Casos clínicos interactivos guiados por IA.

### 🍎 2.2. Dominio: Educación (Docente Pro)
**Flujo:** `index.html` -> `simulators.html` (Educación)
Servicios diseñados para la productividad y éxito del docente:
- **Simulador de Nombramiento:** UI de exámenes adaptada a rúbricas magisteriales y escala docente.
- **Creador de Sesiones de Clase:** Herramienta de IA para generar planes de clase alineados a competencias.
- **Generador de Rúbricas:** Herramienta para crear instrumentos de evaluación personalizados.

### 🌎 2.3. Dominio: Idiomas (Language Hub)
**Flujo:** `index.html` -> `simulators.html` (Idiomas)
- **Certificaciones Oficiales:** Simulacros tipo TOEFL, IELTS, Cambridge.
- **Simulador de Conversación:** Práctica interactiva de "Speaking" con IA.

---

## 🛠️ 3. Arquitectura Técnica de Soporte

### 3.1. Dashboards Especializados (`simulator-dashboard.html`)
Cada servicio (como "Simulador de Exámenes") tiene su propio dashboard. 
- Aunque comparten el núcleo lógico (`simulator-dash.js`), la **UI, imágenes y gráficas** cambian según el dominio.
- El dashboard de **Salud** muestra métricas por especialidades médicas.
- El dashboard de **Educación** mostrará métricas por áreas pedagógicas (Comprensión, Especialidad, etc.).

### 3.2. Motor de Evaluación Común (`quiz.html`)
El motor de cuestionarios es agnóstico:
1. Recibe el `contexto` (Ej: MEDICINA o EDUCACION).
2. Llama a la API filtrando el banco de preguntas por ese dominio.
3. Aplica las reglas de puntuación correspondientes.

---

## 🚀 4. Próximos Pasos de Implementación

### Fase 1: Desacoplamiento de Servicios
- Adaptar `simulators.html` para que acepte un parámetro de contexto y pinte las tarjetas de servicios correspondientes (Salud vs Educación vs Idiomas).
- Crear los activos visuales (iconografía y branding) específicos para el sector Educación y Idiomas.

### Fase 2: Especialización de Dashboards
- Refactorizar `simulator-dash.js` para que el mapeo de áreas (`areaToGroupMap`) y los estilos de las gráficas se carguen dinámicamente según el contexto del usuario.

### Fase 3: Servicios Creativos No-Examen
- Desarrollo del primer servicio de productividad: **Creador de Sesiones de Clase** (Integración con Gemini para output estructurado).

---

## ⚖️ Filosofía de Desarrollo
**Creatividad + Escalabilidad:** No creamos aplicaciones aisladas. Creamos un motor inteligente que se viste de médico para el estudiante de salud y de profesor para el docente, reutilizando el 90% de la lógica subyacente pero ofreciendo servicios únicos para cada profesión.

---
**Autor:** Antigravity AI  
**Documento de Visión v3.1** 🛡️✨
