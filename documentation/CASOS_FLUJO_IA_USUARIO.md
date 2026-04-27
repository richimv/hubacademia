# 🧪 Casos de Uso: Selección, Optimización y Distribución IA (V6)

Este documento describe el motor de inteligencia de Hub Academia para la gestión de stocks de preguntas. El sistema opera bajo un principio de **Eficiencia de Costos y Balance Estadístico**, priorizando el banco local antes de recurrir a la IA para la reposición de emergencia.

---

## 📦 Fase 1: Optimización de Stock Local (Banco)

Antes de activar la IA, el sistema intenta completar el lote de 5 preguntas usando el contenido existente en la base de datos para **todas** las áreas seleccionadas por el usuario en su configuración de examen.

### 🔝 Caso A: Muchas Áreas seleccionadas (> 5 áreas de los 4 grupos)
**Configuración:** ENAM - [15 áreas seleccionadas entre Básicas, Clínicas, Especialidades y Gestión].

1.  **Escaneo Global**: El sistema busca en el banco preguntas para las **15 áreas** simultáneamente.
2.  **Identificación de Stock**: Identifica cuáles de esas áreas tienen preguntas disponibles (no vistas por el usuario).
3.  **Swapping Inteligente**: Si hay stock suficiente en el conjunto de las 15 áreas:
    - Selecciona 5 preguntas priorizando la diversidad (1 de cada área con stock).
    - Si una área tiene mucho stock y otras poco, intenta balancear para cubrir los 4 grupos.
4.  **Entrega**: Entrega 5 preguntas del banco.
5.  **Resultado**: **IA NO SE ACTIVA**.

---

## 🤖 Fase 2: Distribución de Áreas IA (Generación de Emergencia)

Solo cuando el Escaneo Global detecta que el banco local es insuficiente para completar el lote de 5 preguntas según la configuración aplicada, se activa la IA mediante el servicio `userAiService.js`.

### 🔝 Escenario 1: Reposición con Muchas Áreas (> 5 áreas)
**Configuración:** Usuario elige 15 áreas, pero el banco está agotado.

1.  **Muestreo para IA**: El sistema elige **5 áreas aleatorias de las 15 originales** (respetando la representatividad de los bloques).
2.  **Generación Determinista**: Se le ordena a la IA generar **exactamente 1 pregunta por cada una** de esas 5 áreas.
3.  **Resultado**: Lote de 5 preguntas de alta calidad con 5 tópicos distintos, inyectados al banco para futuras sesiones.

### 📊 Escenario 2: Reposición con Exactamente 5 Áreas
1.  **Muestreo Fiel**: Se toman las 5 áreas.
2.  **Distribución 1:1**: 1 pregunta por área para garantizar que el simulador cubra toda la selección del usuario.

### 📉 Escenario 3: Reposición con Pocas Áreas (< 5 ejes temáticos)
1.  **Distribución Equitativa**: Se distribuyen las 5 preguntas entre los ejes disponibles (ej: 2 temas -> 3 y 2 preguntas respectivamente).
2.  **Repetición Necesaria**: Se generan múltiples preguntas por tema para completar el lote de 5.

---

## 🚦 Lógica de Activación IA (Triggers)

El sistema activa la IA de reposición **SOLO** en los siguientes casos:

1.  **Déficit de Stock Absoluto**: Cuando el Banco Local tiene menos de 5 preguntas disponibles para el conjunto de áreas seleccionadas.
2.  **Déficit de Diversidad Estadística**: Si el usuario selecciona 5 o más áreas, pero el banco solo tiene stock para 4 áreas o menos. **Se fuerza la IA** para garantizar que el examen cumpla con la diversidad configurada por el alumno.
3.  **Optimización Post-Fix**: El sistema permite que un solo tema agote su stock del banco (hasta 5) antes de llamar a la IA, optimizando el uso de recursos locales.

---

## 🛠️ Mecanismo de Selección Local (Garantía de No-Sesgo)

1.  **Aislamiento por Usuario**: Las preguntas vistas se marcan solo para el usuario actual.
2.  **Olvido Saludable (24h Window)**: El sistema excluye preguntas vistas en las últimas 24 horas, permitiendo el repaso posterior.
3.  **rn Adaptive Sampling**: Uso de `ROW_NUMBER()` dinámico particionado por tópico para asegurar que el pool inicial tenga una mezcla equilibrada de todos los grupos académicos.

---

**Documentación Restaurada y Actualizada - 27 de Abril, 2026.**
