# Guía: Creación de Cuentas de Servicio Específicas en Google Cloud

Esta guía detalla los pasos para crear cuentas de servicio individuales en Google Cloud Platform (GCP). Seguir este proceso te permitirá aislar los permisos, administrar cuotas individuales y controlar los costos de manera independiente para cada una de tus aplicaciones (Hub Academia, Proyecto de Idiomas, KiaraBot, etc.).

---

## 1. ¿Por qué usar una Cuenta de Servicio por Aplicación?
* **Aislamiento de Privilegios (Seguridad):** Si una credencial se ve comprometida, solo afectará a esa aplicación específica.
* **Control de Costos:** Permite ver exactamente cuánto consume cada aplicación (IA, almacenamiento, traducción) en los paneles de facturación.
* **Cuotas Independientes:** Evita que el uso intensivo de una aplicación (ej. KiaraBot) bloquee las llamadas de otra app por exceder la cuota por minuto.

---

## 2. Paso a Paso para Crear una Cuenta de Servicio

Sigue estos pasos en la consola de Google Cloud:

### Paso 2.1: Acceder a IAM y Administración
1. Ve a la consola de Google Cloud: [https://console.cloud.google.com/](https://console.cloud.google.com/).
2. Selecciona tu **Proyecto GCP** en la barra superior.
3. Abre el menú lateral izquierdo (hamburguesa) y dirígete a **IAM y administración** > **Cuentas de servicio**.

### Paso 2.2: Crear la Cuenta de Servicio
1. Haz clic en el botón superior **+ Crear cuenta de servicio**.
2. **Detalles de la cuenta de servicio:**
   * **Nombre de la cuenta de servicio:** Escribe un nombre descriptivo (ej. `idiomas-backend-service` o `kiarabot-service`).
   * **ID de la cuenta de servicio:** Se generará automáticamente a partir del nombre (ej. `idiomas-backend-service@tu-proyecto.iam.gserviceaccount.com`).
   * **Descripción de la cuenta de servicio:** Describe su propósito (ej. "Acceso a IA y TTS para el nuevo portal de Idiomas").
3. Haz clic en **Crear y continuar**.

### Paso 2.3: Otorgar Roles (Permisos Mínimos Necesarios)
Asigna únicamente los permisos que la aplicación requiere. Haz clic en **Seleccionar un rol** y añade los siguientes según tu app:

*   **Para Modelos de IA (Gemini / Vertex AI):**
    *   Rol: `Usuario de Vertex AI` (Vertex AI User) - *Permite enviar prompts y recibir respuestas de Gemini.*
*   **Para Texto a Voz (Google Cloud TTS - Audio del Tutor):**
    *   Rol: `Lector de Cloud Text-to-Speech` (Cloud Text-to-Speech Viewer) o `Administrador de Cloud Text-to-Speech` (según nivel de acceso requerido).
*   **Para Almacenamiento (Google Cloud Storage - Imágenes y Audios):**
    *   Rol: `Creador de objetos de Storage` (Storage Object Creator) - *Para subir archivos.*
    *   Rol: `Lector de objetos de Storage` (Storage Object Viewer) - *Para leer archivos.*
    *   *(O usa `Administrador de objetos de Storage` si necesitas que la app también elimine archivos obsoletos).*

Haz clic en **Continuar** y luego en **Listo**.

---

## 3. Generar y Descargar la Clave Privada (JSON)

Una vez creada la cuenta de servicio, debes obtener el archivo de credenciales para tu servidor backend:

1. En la lista de cuentas de servicio, haz clic sobre el correo de la cuenta que acabas de crear.
2. Ve a la pestaña **Claves** (Keys) en la parte superior.
3. Haz clic en el botón **Agregar clave** > **Crear clave nueva**.
4. Selecciona el formato **JSON** (recomendado) y haz clic en **Crear**.
5. Se descargará automáticamente un archivo `.json` en tu computadora (ej. `nombre-proyecto-xxxxxx.json`).
6. **Importante:** Renombra este archivo a `service-account-key.json` y colócalo en la raíz de tu respectivo proyecto (`idiomas-project/` o `kiarabot/`).

---

## 4. Configurar las Variables de Entorno (.env)

En el archivo `.env` de tu nueva aplicación independiente, configura la ruta absoluta o relativa al archivo JSON:

```env
# Ruta de credenciales de Google
GOOGLE_APPLICATION_CREDENTIALS="./service-account-key.json"

# Configuración del Bucket de Storage exclusivo (Recomendado)
GCS_BUCKET_NAME="bucket-exclusivo-idiomas-prod"
```

---

## 5. Recomendaciones de Seguridad Críticas

*   **NUNCA subas el archivo `service-account-key.json` a GitHub/GitLab.**
    Asegúrate de agregar la ruta al archivo `.gitignore` de tu proyecto:
    ```gitignore
    # Credenciales de Google Cloud
    service-account-key.json
    *.json
    ```
*   **Limita los permisos (Principio de Menor Privilegio):** No le otorgues el rol de `Propietario` (Owner) o `Editor` de la cuenta de Google Cloud a la cuenta de servicio. Dale solo los roles específicos listados en el Paso 2.3.
*   **Rotación periódica:** Es una buena práctica eliminar las claves antiguas y generar claves nuevas cada 6 o 12 meses en producción.
