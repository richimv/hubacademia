# 🏗️ Sistema de Generación IA y RAG (Arquitectura V6)

Este documento detalla la infraestructura distribuida de inteligencia en Hub Academia, diseñada para maximizar la calidad médica mientras se mantiene un costo operativo de **Cero Dólares ($0.00)** en flujos masivos.

---

## 0. Mapa de Servicios de Inteligencia (Personas IA)

A partir de la V6, el sistema se ha descentralizado para evitar la contaminación de lógica y permitir un mantenimiento escalable:

*   **👑 `AdminAiService.js` (Modo High-Fidelity):** Generación oficial para el banco. Usa **RAG FTS ($0)** inyectando fragmentos de la base de datos local para garantizar el sustento legal y bibliográfico (NTS/Harrison).
*   **⚡ `UserAiService.js` (Modo Fast):** Generación inmediata para simulacros diarios del alumno. Prioriza la velocidad y la variabilidad extrema de casos clínicos sin costo de RAG.
*   **🎓 `TutorAiService.js` (Modo Tutoría):** Cerebro del Chat interactivo. Utiliza **RAG Semántico (Pinecone)** para una precisión clínica de élite en conversaciones desarrolladas.
*   **🤖 `mlService.js` (Analítica):** Puente exclusivo hacia los modelos de **Python** para predicción de tendencias y analítica predictiva.

---

## 1. Configuración y Bindeo (Dominio Médico)

Tanto el Simulador como el Panel de Gestión comparten un núcleo de configuración que viaja a los servicios de IA:

*   **Examen Objetivo (`target`):** Define la jerarquía bibliográfica (ENAM, SERUMS, RESIDENTADO).
*   **Carrera Profesional (`career`):** Define el estilo Few-Shot mimetizado (Medicina, Enfermería, Obstetricia).
*   **Áreas Académicas (`topics`):** Más de 22 áreas agrupadas para garantizar la diversidad estadística.

---

## 2. Motor RAG Híbrido (Paso a Paso)

La generación y el chat siguen un flujo de fundamentación médica:

1.  **Deduplicación Profunda:** Los servicios escanean las **30 preguntas más recientes** de la base de datos para prohibir repeticiones conceptuales.
2.  **Búsqueda Especializada:**
    *   **Generación (Admin/User):** Búsqueda léxica (FTS) para ahorro de costos.
    *   **Chat (Tutor):** Búsqueda semántica (Pinecone) para comprensión clínica profunda.
3.  **Inyección de Jerarquía:**
    *   **SERUMS:** Prioriza NTS y RM oficiales del Minsa.
    *   **RESIDENTADO:** Prioriza Tratados (Harrison, Nelson, Williams).
4.  **Modelo Unificado:** Todas las inferencias usan `gemini-2.5-flash-lite`, el modelo más eficiente y rápido de Google Cloud.

---

## 3. Lógica de Distribución (Anti-Sesgo)

El sistema garantiza que el alumno nunca sea evaluado en una sola área, sino de forma integral:
*   **Muestreo 5x5**: Si se eligen múltiples áreas, el sistema rota 5 áreas al azar en cada lote.
*   **Garantía 1-a-1**: Se prohíbe duplicar temas en un mismo lote si hay diversidad disponible.
*   **rn Adaptive Sampling**: El repositorio utiliza particiones dinámicas para asegurar un pool variado de preguntas vistas/no vistas.

---

## 4. Soporte Visual Inteligente (v2.0) 🩺📸

Todos los motores de generación analizan la pertinencia pedagógica de las preguntas:
*   **Campo `visual_support_recommendation`**: Sugiere automáticamente si la pregunta requiere un diagrama, tabla o imagen clínica para mejorar la retención.
*   **Gestión Admin**: Esta información es vital para que el equipo de contenido suba los recursos a **GCS** y los vincule a través del Panel.

---

**Certificado como Estándar de Oro - 27 de Abril, 2026** ✨🛡️
