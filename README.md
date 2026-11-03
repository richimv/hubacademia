# 🎓 Hub Académico

![Hub Académico Banner](https://www.hubacademia.com/assets/logo.png)

**Tu compañero de estudios inteligente.**  
Plataforma educativa integral que combina una vasta biblioteca virtual, un tutor basado en Inteligencia Artificial y un sistema de gamificación para potenciar el aprendizaje universitario.

🌐 **Sitio Web Oficial:** [hubacademia.com](https://hubacademia.com)

---

## 🚀 Características Principales

### 1. 📚 Biblioteca Virtual Especializada
Acceso centralizado a recursos educativos organizados por Carreras y Cursos.
- **Libros:** Catálogo extenso de bibliografía digital.
- **Videos y Artículos:** Material complementario curado.
- **Organización:** Filtrado inteligente por áreas de estudio.

### 2. 🤖 Tutor IA Personalizado (Vertex AI / Gemini)
Un asistente virtual disponible 24/7 para resolver dudas teóricas.
- **RAG (Retrieval Augmented Generation):** El tutor no "alucina"; consulta nuestra base de datos de libros antes de responder para dar referencias precisas.
- **Contexto Académico:** Entiende sobre los cursos y mallas curriculares de la institución.
- **Ayuda en Tiempo Real:** Resúmenes, explicaciones de conceptos y recomendaciones de lectura.

### 3. ⚔️ Quiz Arena (Gamificación)
Refuerza lo aprendido compitiendo.
- **Retos Académicos:** Pon a prueba tus conocimientos en desafíos cronometrados.
- **Ranking Global:** Compite con otros estudiantes de tu carrera.

---

## 🛠️ Stack Tecnológico

El proyecto utiliza una arquitectura moderna y escalable de 4 capas.

### Frontend
- **Tecnología:** Vanilla JS (ES6+), HTML5, CSS3.
- **Diseño:** Responsive, Mobile-First con Glassmorphism y UI moderna.
- **Hosting:** **Vercel** (CDN Global).

### Backend
- **Tecnología:** Node.js + Express.
- **IA Engine:** Google Vertex AI (Gemini 3.1 Flash-Lite, con modelos de contingencia en el tutor).
- **Despliegue:** **Render** (Web Service).

### Base de Datos
- **Proveedor:** **Supabase** (PostgreSQL).
- **Características:** Tablas relacionales para usuarios, cursos, libros e historial de chat.

### Infraestructura Adicional
- **Almacenamiento:** Google Cloud Storage para imágenes, audio y recursos.
- **RAG:** Pinecone y PostgreSQL/Supabase.

---

## 💳 Pasarela de Pagos

Integración nativa con **Mercado Pago** para la venta del "Mega Pack Universitario".

- **Seguridad:** Gestión segura de webhooks para activación automática de cuentas.
- **Métodos:** Yape, Plin y Tarjetas (Débito/Crédito).
- **Flujo:** Activación inmediata de la suscripción `Premium` tras la confirmación del pago.

---

## 🔧 Instalación y Despliegue Local

### Requisitos
- Node.js 20 a 24 (Node 22 recomendado)
- Cuenta en Google Cloud (Vertex AI)
- Cuenta en Supabase
- Credenciales de Mercado Pago

### Pasos

1. **Clonar el repositorio**
   ```bash
    git clone https://github.com/tu-org/hubacademia.git
    cd hubacademia
   ```

2. **Instalar Dependencias**
   ```bash
   npm ci
   ```

3. **Configurar Servicio de ML (Python)**
   ```bash
   # Crear entorno virtual
   python -m venv venv
   
   # Activar entorno (Windows)
   .\venv\Scripts\activate
   # Activar entorno (Mac/Linux)
   # source venv/bin/activate
   
   # Instalar dependencias
   pip install -r requirements.txt
   ```

3. **Configurar Variables de Entorno (.env)**
   ```env
   # Servidor
   PORT=3000
   NODE_ENV=development
   
   # Base de Datos (Supabase)
   NODE_DATABASE_URL=postgresql://usuario:password@host:6543/postgres
   PYTHON_DATABASE_URL=postgresql://usuario:password@host:5432/postgres
   
   # Google Vertex AI
   GOOGLE_CLOUD_PROJECT=tu-proyecto-id
   GOOGLE_CLOUD_LOCATION=us-central1
   GCS_BUCKET_NAME=tu-bucket
   
   # Mercado Pago
   MP_ACCESS_TOKEN=APP_USR-xxxxxx
   
   # Configuración Web
   FRONTEND_URL=http://localhost:3000
   BACKEND_URL=http://localhost:3000
   ```

4. **Generar versiones deterministas de assets**
   ```bash
   npm run build
   ```

5. **Correr en Desarrollo**
   ```bash
   # Terminal 1: Backend & Frontend
   npm run dev

   # Terminal 2: Servicio de ML (Python)
   # Asegúrate de tener el entorno activado
   python -m ml_service.app
   ```

Usa [.env.example](.env.example) como inventario de variables, sin copiar valores reales al repositorio. El archivo local `.env` y `service-account-key.json` permanecen ignorados.

## Despliegue controlado

Antes de desplegar cambios de seguridad o esquema, consulta [SECURITY_HARDENING_RELEASE_2026-08-21.md](documentation/SECURITY_HARDENING_RELEASE_2026-08-21.md) y [PRODUCTION_COMPLETION_PROMPTS_2026-08-22.md](documentation/PRODUCTION_COMPLETION_PROMPTS_2026-08-22.md). Las migraciones deben aplicarse con respaldo verificado antes de activar `SECURE_QUIZ_SESSIONS_ENABLED`.

---

## 📂 Estructura del Proyecto

```
hubacademia/
├── src/
│   ├── application/       # Lógica de aplicación (Controllers, Middlewares)
│   ├── domain/            # Lógica de negocio (Services, Repositories, Entities, Models)
│   ├── infrastructure/    # DB, Server, Rutas, Middlewares, Configuración externa
│   └── presentation/      # Frontend (Public assets, HTML, JS UI)
├── ml_service/            # Microservicio Python (Analytics & Trends)
├── scripts/               # Scripts de utilidad (ej. extracción de contexto RAG)
└── tests/                 # Tests unitarios
```

---

## 📞 Soporte

Para consultas técnicas o soporte sobre la plataforma:
- **Email:** hubacademia01@gmail.com
- **Web:** [hubacademia.com/soporte](https://hubacademia.com)

---

© 2026 **Hub Academia**. Todos los derechos reservados.
