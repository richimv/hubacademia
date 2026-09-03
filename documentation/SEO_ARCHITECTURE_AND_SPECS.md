# 🌐 ESPECIFICACIONES TÉCNICAS Y ARQUITECTURA SEO: HUB ACADEMIA (2026)

> **Dominio Oficial:** `https://www.hubacademia.com`  
> **Estado Operativo:** Producción / Alta Visibilidad e Indexación en Google  
> **Última Actualización:** 2026-08-21  

---

## 1. 📌 Resumen Ejecutivo de la Arquitectura SEO

La infraestructura de posicionamiento orgánico de **Hub Academia** está diseñada para capturar la máxima cuota de tráfico de alta intención de búsqueda en dos sectores profesionales críticos del Perú:
1. **Sector Magisterial (Educación):** Búsquedas asociadas a Nombramiento Docente MINEDU, Ascenso de Escala Magisterial (EBR Inicial, Primaria, Secundaria, EBA, EBE), Directivos y Casuísticas oficiales.
2. **Sector Salud (Ciencias Médicas y Asistenciales):** Búsquedas orientadas a SERUMS Medicina y Enfermería, Examen Nacional de Medicina (ENAM), Residentado Médico y protocolos MINSA.
3. **Sector EdTech / Métodos de Estudio:** Algoritmo SuperMemo-2 (SM-2), repetición espaciada y flashcards interactivas con IA.

---

## 2. 🗺️ Matriz de Indexación y Visibilidad

| Ruta Limpia | Vista HTML | Rol / Intención SEO | Estado Indexación | Prioridad Sitemap | Changefreq |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | `index.html` | Ecosistema Maestro, Hub Multidisciplinario, One Tap Google | `index, follow` | **1.0** | `daily` |
| `/simulator-dashboard` | `simulator-dashboard.html` | Hub de Simulacros Oficiales MINEDU / MINSA con IA | `index, follow` | **0.9** | `weekly` |
| `/repaso` | `repaso.html` | Centro de Repaso Espaciado SM-2 y Creador de Mazos | `index, follow` | **0.9** | `weekly` |
| `/library` | `library.html` | Repositorio Digital de Balotarios, Normas y Recursos | `index, follow` | **0.8** | `weekly` |
| `/pricing` | `pricing.html` | Planes de Acceso Premium (S/ 9.90 y S/ 24.90) | `index, follow` | **0.8** | `monthly` |
| `/privacy` | `privacy.html` | Políticas de Privacidad y Tratamiento de Datos | `index, follow` | **0.3** | `monthly` |
| `/terms` | `terms.html` | Términos y Condiciones del Servicio | `index, follow` | **0.3** | `monthly` |
| `/simulators` | `simulators.html` | *Página Draft / Pendiente (Herramientas futuras)* | `noindex, nofollow` | **Excluido** | N/A |
| `/course` | `course.html` | *Página Draft / Obsoleta (Cursos deshabilitados)* | `noindex, nofollow` | **Excluido** | N/A |
| `/login` | `login.html` | *Página Draft / Método Alternativo* | `noindex, nofollow` | **Excluido** | N/A |
| `/resource` | `resource.html` | *Página Draft / Legacy* | `noindex, nofollow` | **Excluido** | N/A |
| `/admin` | `admin.html` | Panel Administrativo Privado | `noindex, nofollow` | **Excluido** | N/A |
| `/dashboard` | `dashboard.html` | Panel de Usuario Privado | `noindex, nofollow` | **Excluido** | N/A |
| `/deck-editor` | `deck-editor.html` | Editor Privado de Tarjetas | `noindex, nofollow` | **Excluido** | N/A |
| `/profile` | `profile.html` | Perfil de Usuario | `noindex, nofollow` | **Excluido** | N/A |
| `/flashcards` | `flashcards.html` | Sesión Activa de Estudio | `noindex, nofollow` | **Excluido** | N/A |
| `/quiz` | `quiz.html` | Sesión Activa de Simulacro | `noindex, nofollow` | **Excluido** | N/A |

---

## 3. 🏷️ Estandarización de Metadatos y Social Graphs

Todas las páginas públicas cuentan con:
- **Etiqueta Canónica:** `<link rel="canonical" href="https://www.hubacademia.com/...">` para prevenir contenido duplicado entre subdominios o parámetros URL.
- **Open Graph Protocol (Facebook, LinkedIn, WhatsApp):** `og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `og:site_name`, `og:locale="es_PE"`.
- **Twitter Cards:** `twitter:card="summary_large_image"`, `twitter:title`, `twitter:description`, `twitter:image`.
- **Google Search Console Verification:** `<meta name="google-site-verification" content="google9e7db62b59fd1348">` y endpoint `/google9e7db62b59fd1348.html`.

---

## 4. 🧬 Datos Estructurados Schema.org (JSON-LD)

Se han integrado esquemas validados para rich snippets en Google:

### 4.1 Index (`index.html`)
- `EducationalOrganization`: Entidad legal corporativa, logotipo, mercado atendido (`Peru`).
- `WebSite`: Sitio web con declaración idiomática (`es-PE`).
- `SoftwareApplication`: Aplicación educativa con categoría `EducationalApplication` y oferta base de S/ 9.90 PEN.

### 4.2 Precios (`pricing.html`)
- `Product` + `OfferCatalog`: Desglose formal de planes en Soles (PEN) para aparecer en Google Merchant y resultados comerciales.
- `FAQPage`: Esquema de preguntas frecuentes para desplegar acordeones interactivos en los resultados de búsqueda de Google.

### 4.3 Repaso (`repaso.html`) y Simuladores (`simulator-dashboard.html`, `simulators.html`)
- `WebApplication` / `EducationalApplication` / `CollectionPage`: Mapeo de herramientas de software educativo para enriquecimiento visual en SERPs.

---

## 5. 🤖 Configuración de Rastreo (Robots.txt y Sitemap)

### 5.1 `robots.txt`
* Permite explícitamente el rastreo de todas las landing pages públicas y de los assets requeridos por Googlebot para el renderizado visual (`/css/`, `/js/`, `/assets/`, `/favicon.ico`).
* Bloquea terminantemente rutas de sesión privada (`/admin`, `/dashboard`, `/deck-editor`, `/profile`, `/flashcards`, `/quiz`, `/api/`) y páginas obsoletas (`/login`, `/course`, `/resource`).
* Vincula directamente el sitemap canónico: `https://www.hubacademia.com/sitemap.xml`.

### 5.2 `sitemap.xml`
* Solo contiene rutas canónicas limpias (sin `.html`).
* Integra `<lastmod>`, `<changefreq>` y `<priority>` estratégicas.
* Se encuentra totalmente depurado de páginas draft o sin oferta comercial.

---

## 6. ⚡ Optimización de Rendimiento y Core Web Vitals (CWV)

1. **Compresión Gzip/Deflate:** Middleware `compression` activado en el servidor Express para reducir el peso de las transferencias hasta en un 75%.
2. **Políticas de Caché (Express y Vercel):**
   * CSS, JS e Imágenes: `public, max-age=31536000, immutable` (apoyado por el sistema determinista de Cache-Busting SHA256 generado en build con `src/presentation/update-cache.js`).
   * HTML: `Cache-Control: no-store, no-cache, must-revalidate` para garantizar entrega inmediata de cambios.
   * `sitemap.xml`: `public, max-age=3600, stale-while-revalidate=86400`.
   * `robots.txt`: `public, max-age=86400`.
3. **Preconnect y DNS-Prefetch:** Conexiones anticipadas a `fonts.googleapis.com`, `fonts.gstatic.com` y `cdnjs.cloudflare.com`.
4. **Lazy Loading:** Atributos `loading="lazy"` y dimensiones explícitas `width` y `height` en imágenes secundarias para mitigar el Cumulative Layout Shift (CLS).

---

## 7. 🧪 Suite de Pruebas Automatizadas

Los archivos de prueba ejecutan aserciones automatizadas mediante Jest para validar:
- `tests/unit/seoArchitecture.test.js`: Valida presencia de metaetiquetas clave, canonicals, `robots.txt`, `sitemap.xml` y JSON-LD.
- `tests/unit/cacheBustIntegrity.test.js`: Valida que los 17 archivos HTML mantengan sincronizado el hash determinista SHA256 de los assets estáticos para garantizar paso limpio en CI de GitHub Actions (`git diff --exit-code -- src/presentation/public`).
