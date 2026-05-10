# Módulo Educación (Docente Pro) — Tech Specs

> **Última actualización:** 2026-05-05  
> **Estado:** ✅ Implementado (Frontend + Backend + Prompts)  
> **Versión:** 3.0 — Multi-Dominio

---

## 1. Visión General

El módulo **Docente Pro** es la expansión del sistema de simuladores de Hub Academia hacia el dominio de **Educación**. Permite a docentes peruanos prepararse para los exámenes de:

- **Nombramiento Docente** — Ingreso a la Carrera Pública Magisterial (CPM)
- **Ascenso de Escala** — Escalafón Magisterial
- **Acceso a Cargos** — Directivos y Especialistas (UGEL/MINEDU)

El módulo reutiliza la misma infraestructura del simulador médico (quiz engine, flashcards, analytics) pero con configuración de dominio específica.

---

## 2. Arquitectura Multi-Dominio

```
Frontend (simulators.html)
    ├── ?domain=salud       → Tarjetas de Medicina
    └── ?domain=educacion   → Tarjetas de Educación
                                  │
                                  ▼
                simulator-dashboard.html?context=EDUCACION
                                  │
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
    NOMBRAMIENTO             ASCENSO              ACCESO_CARGOS
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  ▼
                   quizController.js (POST /api/quiz/start)
                                  │
                     target: "NOMBRAMIENTO" ──→ domain: "education"
                                  │
                   trainingService.js (getQuestions)
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                                       ▼
     question_bank (local)                generationPrompts.js
     WHERE domain='education'             (buildEducationAdminPrompt)
     AND target='NOMBRAMIENTO'            (buildEducationUserPrompt)
```

### Detección Automática de Dominio

El sistema detecta el dominio basándose en el `target`, NO en un campo separado de "domain" del frontend:

```javascript
const EDUCATION_TARGETS = ['NOMBRAMIENTO', 'ASCENSO', 'ACCESO_CARGOS'];
const isEducation = EDUCATION_TARGETS.includes(target);
const dbDomain = isEducation ? 'education' : 'medicine';
```

---

## 3. Flujo de Datos (End-to-End)

### 3.1 Flujo del Usuario

1. **Página principal** → Clic en tarjeta "Docente Pro" del carrusel
2. **`/simulators?domain=educacion`** → Selecciona "Simulador de Nombramiento"
3. **`/simulator-dashboard?context=EDUCACION`** → Ve KPIs, configura examen
4. **Modal de Configuración** → Selecciona target, modalidad/nivel, áreas
5. **Iniciar Simulacro** → `POST /api/quiz/start` con `{ target: "NOMBRAMIENTO", areas: [...], career: "EBR - Primaria" }`
6. **Quiz Engine** → Recibe preguntas de `question_bank` (domain='education') o generadas por IA

### 3.2 Fallback de Áreas

Cuando un usuario inicia sin configuración previa:

| Dominio | Áreas por Defecto |
|---|---|
| **Medicina** | Salud Pública, Gestión de Servicios, Ética e Interculturalidad, Investigación, Cuidado Integral |
| **Educación** | Comprensión Lectora, Razonamiento Lógico, Teorías del Aprendizaje, Principios CNEB, Evaluación Formativa |

---

## 4. Configuración del Modal (Frontend)

El modal de configuración se renderiza dinámicamente según el contexto. Para educación:

### 4.1 Examen Objetivo (Targets)

| Target | Valor backend | Descripción |
|---|---|---|
| NOMBRAMIENTO | `NOMBRAMIENTO` | Ingreso CPM |
| ASCENSO | `ASCENSO` | Escala Magisterial |
| ACCESO A CARGOS | `ACCESO_CARGOS` | Directivos (Beta) |

### 4.2 Modalidad / Nivel (Career)

| Opción | Valor en `career` |
|---|---|
| EBR - Nivel Inicial | `EBR - Inicial` |
| EBR - Nivel Primaria | `EBR - Primaria` |
| EBR - Nivel Secundaria | `EBR - Secundaria - {Especialidad}` |

Cuando se selecciona **Secundaria**, aparece un selector secundario con las especialidades:
`Matemática, Comunicación, Ciencias Sociales, Ciencia y Tecnología, Educación Física, Arte y Cultura, Inglés, Educación Religiosa, Educación para el Trabajo`

### 4.3 Áreas de Estudio

| Grupo | Áreas | Condición |
|---|---|---|
| **Habilidades Generales** | Comprensión Lectora, Razonamiento Lógico | Siempre visible |
| **Conocimientos Pedagógicos** | Teorías del Aprendizaje, Principios CNEB, Evaluación Formativa, Convivencia Escolar | Siempre visible |
| **Didáctica de la Especialidad** | Estrategias de Enseñanza, Uso de Materiales Educativos, Casuística de Errores Frecuentes | Siempre visible |
| **Gestión Institucional** | Liderazgo Pedagógico, Planificación Estratégica (PEI, PAT) | **Solo ACCESO_CARGOS** |

---

## 5. Sistema de Prompts (IA)

### 5.1 Arquitectura del Catálogo

```
generationPrompts.js
├── EDUCATION_TARGETS = ['NOMBRAMIENTO', 'ASCENSO', 'ACCESO_CARGOS']
├── getAdminPrompt(target, area, career, ragContext, styleExamples)
│   ├── isEducation? → getEducationAdminRules() → buildEducationAdminPrompt()
│   └── else        → getMedicineAdminRules()  → buildMedicineAdminPrompt()
└── getUserPrompt(target, area, career, historyText)
    ├── isEducation? → buildEducationUserPrompt()
    └── else        → buildMedicineUserPrompt()
```

### 5.2 Reglas por Target

#### NOMBRAMIENTO
- **Perfil:** Postulante a CPM
- **Enfoque:** Casuística de aula básica + CNEB + Conflictos cognitivos
- **Fuentes:** CNEB (MINEDU) > Rutas de Aprendizaje > Marco del Buen Desempeño Docente
- **Regla de Oro:** La pregunta DEBE presentar un "Caso Pedagógico" con acción docente requerida

#### ASCENSO
- **Perfil:** Docente experimentado
- **Enfoque:** Retroalimentación Formativa + Evaluación por Competencias
- **Fuentes:** Rúbricas de Evaluación MINEDU + CNEB
- **Regla de Oro:** Las incorrectas parecen "buenas acciones tradicionales" pero carecen de andamiaje

#### ACCESO_CARGOS
- **Perfil:** Futuro Director/Especialista UGEL
- **Enfoque:** Liderazgo Pedagógico + Instrumentos de Gestión (PEI, PAT, PCI, RI)
- **Fuentes:** Ley de Reforma Magisterial > Guías de Gestión Escolar > Marco del Buen Desempeño Directivo
- **Regla de Oro:** Escenario con gestión de recursos, personal o comunidad educativa

### 5.3 Diferencias clave con Medicina

| Aspecto | Medicina | Educación |
|---|---|---|
| Extensión de opciones | Máx. 12 palabras | Máx. 25 palabras |
| Estilo de pregunta | Telegrama MINSA (datos + pregunta) | Casuística MINEDU (caso + acción) |
| Tip final | `💡 TIP SERUMS:` | `💡 TIP PEDAGÓGICO:` |
| Opción correcta | Basada en evidencia clínica | Refleja enfoque por competencias |
| Opciones incorrectas | Basadas en errores clínicos comunes | Parecen buenas pero son conductistas |
| Citación | NTS, RM, GPC | CNEB, Marco del Buen Desempeño |
| Nro. opciones | 4 (ENAM/SERUMS), 5 (Residentado) | 4 (todos los targets) |

### 5.4 Instrucción Anti-Conductismo

Regla crítica inyectada en todos los prompts educativos:

> *"ENFOQUE CONSTRUCTIVISTA: La opción correcta SIEMPRE debe reflejar el enfoque por competencias (MINEDU). Castiga el conductismo y la memorización."*

Esto permite que la IA genere **distractores realistas** que simulan las trampas clásicas de los exámenes oficiales.

---

## 6. Base de Datos

### 6.1 Tabla `question_bank`

Las preguntas educativas se almacenan en la misma tabla que las médicas, diferenciadas por:

```sql
-- Preguntas de educación
SELECT * FROM question_bank 
WHERE domain = 'education' 
AND target = 'NOMBRAMIENTO'
AND topic = 'Evaluación Formativa y Retroalimentación';
```

**Campos relevantes:**

| Campo | Ejemplo (Educación) |
|---|---|
| `domain` | `'education'` |
| `target` | `'NOMBRAMIENTO'`, `'ASCENSO'`, `'ACCESO_CARGOS'` |
| `career` | `'EBR - Primaria'`, `'EBR - Secundaria - Matemática'` |
| `topic` | `'Comprensión Lectora'`, `'Planificación Curricular'` |
| `subtopic` | `'Niveles de comprensión lectora'` (generado por IA) |
| `difficulty` | `'Senior'` (estándar para todos) |

### 6.2 Índices de Rendimiento

```sql
CREATE INDEX IF NOT EXISTS idx_question_bank_domain_target 
ON public.question_bank(domain, target);
```

---

## 7. KPI / Analytics Pipeline

### 7.1 Stats Endpoint

```
GET /api/quiz/stats?context=EDUCACION&target=NOMBRAMIENTO&areas=Comprensión+Lectora,...
```

El endpoint `getStats` en `quizController.js` filtra `quiz_history` por `target` de forma unificada (tanto medicina como educación). El servicio `getUserQuizStats` agrega:
- **Score promedio** (escala /20)
- **Accuracy** (%)
- **Radar Data** (desglose por área con correct/total)
- **Strongest / Weakest topic**

### 7.2 Bar Chart (Rendimiento por Área)

El `renderBarChart()` en `simulator-dash.js` agrupa automáticamente las barras usando `areaToGroupMap`, que se construye desde `examAreasGrouped` del contexto activo.

**Mapeo para Educación:**

| Grupo | Color | Áreas |
|---|---|---|
| Habilidades Generales | 🟢 Esmeralda | Comprensión Lectora, Razonamiento Lógico |
| Conocimientos Pedagógicos | 🔵 Azul | Teorías, CNEB, Evaluación Formativa, Convivencia |
| Didáctica de la Especialidad | 🟡 Ámbar | Estrategias, Materiales, Casuística |
| Gestión Institucional | 🟠 Naranja | Liderazgo, PEI/PAT |

### 7.3 Guest Demo Data (Context-Aware)

Los invitados ven datos de demostración adaptativos:
- **Contexto EDUCACION:** Barras con Comprensión Lectora (88%), Razonamiento Lógico (75%), etc.
- **Contexto MEDICINA:** Barras con Ginecología (90%), Medicina Interna (85%), etc.

Esto aplica tanto al frontend (`renderGuestDemoData()`) como al backend (Guest Mode en `quizController.getStats`).

---

## 8. Archivos Modificados / Creados

### Frontend

| Archivo | Descripción |
|---|---|
| `presentation/public/index.html` | Tarjeta carrusel + nav link "Docente Pro" |
| `presentation/public/simulators.html` | Grid dinámico con `simulatorsHub.js` |
| `presentation/public/js/simulatorsHub.js` | **NUEVO** — Controlador de landing por dominio |
| `presentation/public/js/simulator-dash.js` | Targets dinámicos, career selector, áreas condicionales, KPIs context-aware |
| `presentation/public/css/modules.css` | `.action-edu` color naranja |
| `presentation/public/css/simulators.css` | Estilos para tarjetas educativas |
| `presentation/public/assets/custom-edu-bg.png` | Imagen del carrusel |

### Backend

| Archivo | Descripción |
|---|---|
| `domain/prompts/generationPrompts.js` | Reescrito: arquitectura multi-dominio con funciones separadas |
| `domain/services/trainingService.js` | Domain routing dinámico + fallback context-aware + stats filter unificado |
| `application/controllers/quizController.js` | Fallback áreas/career context-aware + Guest demo context-aware |

### Infraestructura

| Archivo | Descripción |
|---|---|
| `infrastructure/database/database_schema.sql` | Actualizado: tabla `user_notes`, índices, RLS |

---

## 9. Configuración Persistida

La configuración del simulador se almacena en:

### 9.1 LocalStorage (Respaldo local)
```javascript
localStorage.setItem('simActiveConfig', JSON.stringify({
    target: 'NOMBRAMIENTO',
    areas: ['Comprensión Lectora', 'Razonamiento Lógico', ...],
    career: 'EBR - Primaria'
}));
```

### 9.2 Base de datos (Cross-device sync)
```sql
-- Tabla: user_simulator_preferences
INSERT INTO user_simulator_preferences (user_id, domain, config_json)
VALUES ($1, 'educacion', '{"target":"NOMBRAMIENTO","areas":[...],"career":"EBR - Primaria"}');
```

---

## 10. Preparación para Escalar

### Pendientes para Fase 2:
- [ ] RAG con Pinecone namespace `education` para inyectar fragmentos del CNEB y normativas MINEDU
- [ ] Imágenes de fondo para tarjetas del dashboard educativo
- [ ] Módulo "Creador de Sesiones de Clase" (próximamente)
- [ ] Módulo "Generador de Rúbricas" (próximamente)
- [ ] Chat con especialidad educativa (`chatPrompts.js` con context=EDUCACION)

