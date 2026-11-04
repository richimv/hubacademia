# Recursos exclusivos de la landing — producción y autoría

## Material actual

- `source/v5/`: ocho PNG originales generados con `image_gen`; conservan su resolución nativa.
- `images/v5/`: doce WebP responsivos para Hero, Inicial y Boletín, en composiciones de escritorio y móvil.
- `posters/web-v1/`: seis fotogramas optimizados de los vídeos entregados. Los pósteres V5 duplicados se consolidaron en `images/v5/*-1920.webp` y `*-1080.webp`.
- `flow/v5/`: ocho JPEG de inicio/final, exportados a 1920×1080 o 1080×1920, y prompts de movimiento para Flow.
- `video/web-v1/`: seis MP4 optimizados, controlados por scroll. Los maestros originales permanecen en `video/` y no se publican; conserva su material de autoría.
- `media-manifest.json`: inventario y prompts exactos de los ocho originales, referencia de geometría y dimensiones de exportación.
- `archive/v3/`: imágenes y originales de la primera propuesta, conservados para recuperación. No los carga la portada actual.

La imagen inicial de Hero y Boletín también es su referencia final de bucle. Inicial tiene finales propios: la mano termina de colocar la tarjeta sobre el cuaderno. Los textos comerciales y las interfaces permanecen en HTML, no incrustados en las imágenes.

## Regenerar derivados

Desde la raíz del proyecto: `node scripts/prepare-landing-assets.js`.

El script usa los originales del manifiesto, exporta tamaños web y fotogramas, y no llama a ningún modelo ni modifica los PNG. Se utilizó para crear los derivados de esta entrega; no es una prueba de aplicación ni una auditoría visual.

Los medios de esta landing son independientes del catálogo general de `assets/`. Se conserva el uso compartido del logo institucional y el avatar funcional de Hubi. Para el hero, el logo fue únicamente la referencia de geometría de la escultura generada.

Guía de arquitectura: `documentation/LANDING_FRONTEND_GUIDE.md`. Guía de vídeos: `flow/v5/README.md`.
