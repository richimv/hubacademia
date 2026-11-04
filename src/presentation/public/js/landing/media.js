/** Scroll-controlled footage: no player chrome, audio, autoplay or perpetual loop.
 * Seek requests are coalesced while a decoder is busy. One orientation per scene.
 * Posters remain available for reduced motion, data saving and media errors.
 */
import { MEDIA_SLOTS } from './media-config.js?v=landing-v6';

export function initMedia() {
    const mobile = matchMedia('(max-width: 640px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const pinnedHero = matchMedia('(min-width: 961px) and (min-height: 800px)');
    const connection = navigator.connection;
    const heroScene = document.getElementById('hero-scroll-scene');
    const states = [];
    let frame = 0;

    const allowed = () => !reduced.matches && !connection?.saveData;
    function requestSync() {
        if (!frame && !document.hidden) frame = requestAnimationFrame(sync);
    }
    function progressFor(state) {
        const hero = state.id === 'hero' && heroScene;
        const target = hero || state.host;
        const bounds = target.getBoundingClientRect();
        if (hero && pinnedHero.matches && heroScene.classList.contains('has-scroll-video')) {
            const distance = Math.max(1, bounds.height - heroScene.querySelector('.home-hero').offsetHeight);
            return Math.max(0, Math.min(1, (72 - bounds.top) / distance));
        }
        // Enter at 85% of the viewport and finish with the scene still visible.
        const viewport = window.innerHeight;
        return Math.max(0, Math.min(1, (viewport * .85 - bounds.top) / (bounds.height + viewport * .55)));
    }
    function sync() {
        frame = 0;
        if (!allowed() || document.hidden) return;
        for (const state of states) {
            const { video } = state;
            if (!state.near || state.failed || video.readyState < 1 || !Number.isFinite(video.duration)) continue;
            const lastFrame = Math.max(0, video.duration - 1 / 24);
            const target = Math.min(lastFrame, Math.round(progressFor(state) * lastFrame * 24) / 24);
            // The seeked handler picks up the newest scroll position, skipping stale requests.
            if (!video.seeking && Math.abs(video.currentTime - target) >= 1 / 30) {
                try { video.currentTime = target; } catch { /* Keep the poster during decoder setup. */ }
            }
        }
    }
    function prepare(state) {
        if (!allowed() || state.loaded || state.failed) return;
        const variant = state.config[mobile.matches ? 'mobile' : 'desktop'];
        if (!variant?.mp4) return;
        state.loaded = true;
        state.video.poster = variant.poster;
        state.video.src = variant.mp4;
        state.video.load();
    }
    function refreshScene() {
        heroScene?.classList.toggle('has-scroll-video', allowed() && states.some((state) => state.id === 'hero' && !state.failed));
        window.ScrollTrigger?.refresh();
        requestSync();
    }

    for (const [id, config] of Object.entries(MEDIA_SLOTS)) {
        if (!config.enabled) continue;
        const host = document.querySelector('[data-media-slot="' + id + '"]');
        if (!host) continue;
        const video = document.createElement('video');
        video.className = 'landing-video';
        video.muted = true;
        video.defaultMuted = true;
        video.playsInline = true;
        video.preload = 'auto';
        video.disablePictureInPicture = true;
        video.setAttribute('muted', '');
        video.setAttribute('playsinline', '');
        video.setAttribute('aria-hidden', 'true');
        video.tabIndex = -1;
        host.dataset.videoMode = 'scroll';
        host.append(video);
        const state = { id, host, video, config, loaded: false, near: false, failed: false };
        states.push(state);
        video.addEventListener('loadedmetadata', requestSync);
        video.addEventListener('loadeddata', () => {
            host.classList.add('has-video-frame');
            requestSync();
        });
        video.addEventListener('seeked', requestSync);
        video.addEventListener('error', () => {
            state.failed = true;
            host.classList.remove('has-video-frame');
            refreshScene();
        });
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver(([entry]) => {
                state.near = entry.isIntersecting;
                if (state.near) { prepare(state); requestSync(); }
            }, { rootMargin: '400px 0px', threshold: 0 });
            observer.observe(host);
        } else if (id === 'hero') {
            state.near = true;
            prepare(state);
        }
    }

    function resetSources() {
        for (const state of states) {
            state.video.pause();
            state.host.classList.remove('has-video-frame');
            state.video.removeAttribute('src');
            state.video.load();
            state.loaded = false;
            state.failed = false;
            if (state.near) prepare(state);
        }
        refreshScene();
    }
    mobile.addEventListener('change', resetSources);
    reduced.addEventListener('change', resetSources);
    connection?.addEventListener('change', resetSources);
    pinnedHero.addEventListener('change', refreshScene);
    window.addEventListener('scroll', requestSync, { passive: true });
    window.addEventListener('resize', requestSync, { passive: true });
    document.addEventListener('visibilitychange', requestSync);
    refreshScene();
}
