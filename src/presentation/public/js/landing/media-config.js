/**
 * Supplied Flow videos, exported by scripts/prepare-landing-videos.py.
 * Only web-v1 derivatives ship to the visitor; masters stay in video/.
 * Playback is a paused timeline driven by scroll, not an autoplay loop.
 */
const base = '/assets/landing';
export const MEDIA_SLOTS = {
    hero: {
        enabled: true,
        desktop: { mp4: `${base}/video/web-v1/hero-desktop.mp4`, poster: `${base}/posters/web-v1/hero-desktop.webp` },
        mobile: { mp4: `${base}/video/web-v1/hero-mobile.mp4`, poster: `${base}/posters/web-v1/hero-mobile.webp` }
    },
    inicial: {
        enabled: true,
        desktop: { mp4: `${base}/video/web-v1/inicial-desktop.mp4`, poster: `${base}/posters/web-v1/inicial-desktop.webp` },
        mobile: { mp4: `${base}/video/web-v1/inicial-mobile.mp4`, poster: `${base}/posters/web-v1/inicial-mobile.webp` }
    },
    boletin: {
        enabled: true,
        desktop: { mp4: `${base}/video/web-v1/boletin-desktop.mp4`, poster: `${base}/posters/web-v1/boletin-desktop.webp` },
        mobile: { mp4: `${base}/video/web-v1/boletin-mobile.mp4`, poster: `${base}/posters/web-v1/boletin-mobile.webp` }
    }
};
