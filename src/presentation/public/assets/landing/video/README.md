# Videos de la landing — integrados

Los seis originales entregados se conservan en esta carpeta. La web consume únicamente los derivados de `web-v1/`; no apunta a los originales.

- `hero-desktop.mp4` y `hero-mobile.mp4`
- `inicial-deskto.mp4` y `inicial-mobile.mp4` (nombre del original conservado)
- `boletin-desktop.mp4` y `boletin-mobile.mp4`

La exportación normaliza el nombre derivado a `web-v1/inicial-desktop.mp4`. Copias web: H.264/MP4, 24 fps, sin audio, fotogramas clave cada 6 cuadros e índice de inicio rápido. Escritorio: 1440 × 810; móvil: 720 × 1280; duración aproximada: 7,83 segundos. Los primeros fotogramas están en `../posters/web-v1/`.

Se pasó de 63,10 MB a 15,30 MB entre las dos orientaciones (75,8 % menos). El detalle exacto está en `web-v1/manifest.json`. Cada visitante carga una única orientación y las escenas se solicitan al acercarse a ellas.

Hero, Inicial y Boletín están habilitados en `js/landing/media-config.js`. El video avanza o retrocede con el scroll, sin reproductor visible, sonido ni reproducción autónoma. Reducción de movimiento, ahorro de datos o error conservan el póster.

Para producir nuevamente los derivados desde la raíz del proyecto:

```powershell
python scripts/prepare-landing-videos.py --ffmpeg .tools/media/ffmpeg.exe
```

El ejecutable local de FFmpeg se conserva en `.tools/`, ignorado por Git. No es una dependencia de producción. La guía completa está en `documentation/LANDING_VIDEO_INTEGRATION.md`. Los prompts originales siguen en `../flow/v5/README.md`.
