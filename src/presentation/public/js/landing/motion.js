/** Scroll and reveal effects; content is visible before this module runs. */
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const runningAnimations = new Set();

function isMotionDisabled() {
    return reducedMotion.matches || document.documentElement.dataset.reduceMotion === 'true';
}

export function animate(element, keyframes, options = {}) {
    if (!element || isMotionDisabled() || !element.animate) return;
    const animation = element.animate(keyframes, {
        duration: 500, easing: 'cubic-bezier(.22,1,.36,1)', ...options
    });
    runningAnimations.add(animation);
    const release = () => runningAnimations.delete(animation);
    animation.finished.then(release, release);
}

export function initReveals() {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(({ target, isIntersecting }) => {
            if (!isIntersecting) return;
            observer.unobserve(target);
            if (target.dataset.reveal === 'image') {
                animate(target, [
                    { clipPath: 'inset(8% 4% 8% 4%)', opacity: .5 },
                    { clipPath: 'inset(0% 0% 0% 0%)', opacity: 1 }
                ], { duration: 1100, easing: 'cubic-bezier(.16,1,.3,1)' });
            } else {
                const siblings = [...target.parentElement.querySelectorAll(':scope > [data-reveal]')];
                animate(target, [{ opacity: .2, transform: 'translateY(24px)' }, { opacity: 1, transform: 'translateY(0)' }], {
                    duration: 800, delay: Math.min(siblings.indexOf(target), 3) * 80
                });
            }
        });
    }, { threshold: .06, rootMargin: '0px 0px -6% 0px' });
    document.querySelectorAll('[data-reveal]').forEach((element) => observer.observe(element));
}

export function initScrollMotion(products) {
    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    if (!gsap || !ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();

    // All scenes are reverted automatically on reduced-motion or breakpoint changes.
    media.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.to('#home-reading-progress', {
            scaleX: 1, ease: 'none',
            scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: true }
        });
    });
    media.add('(min-width: 961px) and (prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo('.home-hero-copy', { y: 0, opacity: 1, scale: 1 }, {
            y: -56, opacity: 0.14, scale: 0.96, ease: 'none',
            scrollTrigger: { trigger: '#hero-scroll-scene', start: 'top top', end: 'bottom top', scrub: 0.4 }
        });
        document.querySelectorAll('[data-image-drift]').forEach((image) => {
            if (image.closest('[data-video-mode="scroll"]')) return;
            gsap.fromTo(image, { scale: 1.08, yPercent: -2 }, {
                scale: 1.02, yPercent: 2, ease: 'none',
                scrollTrigger: { trigger: image.closest('figure'), start: 'top bottom', end: 'bottom top', scrub: .35 }
            });
        });
        document.querySelectorAll('.inicial-visual, .bulletin-art').forEach((figure) => {
            gsap.fromTo(figure, {
                transformPerspective: 1200,
                rotateX: 3.5,
                y: 26,
                scale: 0.975
            }, {
                transformPerspective: 1200,
                rotateX: -2.0,
                y: -18,
                scale: 1.015,
                ease: 'none',
                scrollTrigger: { trigger: figure, start: 'top 90%', end: 'bottom 15%', scrub: 0.45 }
            });
        });
        if (products) {
            products.chapters.forEach((chapter) => {
                const select = () => products.select(chapter.dataset.productChapter, true);
                ScrollTrigger.create({ trigger: chapter, start: 'top 55%', end: 'bottom 55%', onEnter: select, onEnterBack: select });
            });
            gsap.to('.product-story-meter span', {
                scaleX: 1, ease: 'none',
                scrollTrigger: { trigger: '#product-story', start: 'top 30%', end: 'bottom 75%', scrub: true }
            });
        }
        const steps = [...document.querySelectorAll('[data-vision-step]')];
        gsap.to('.vision-timeline', {
            '--vision-progress': 1, ease: 'none',
            scrollTrigger: { trigger: '.vision-timeline', start: 'top 60%', end: 'bottom 60%', scrub: true }
        });
        steps.forEach((step, index) => {
            function selectStep() {
                steps.forEach((candidate) => candidate.classList.toggle('is-current', candidate === step));
                document.getElementById('vision-dial-word').textContent = step.dataset.visionStep;
                gsap.to('.vision-dial-fill', { strokeDashoffset: 527.79 * (1 - (index + 1) / steps.length), duration: .65, overwrite: true, ease: 'power2.out' });
            }
            ScrollTrigger.create({ trigger: step, start: 'top 60%', end: 'bottom 60%', onEnter: selectStep, onEnterBack: selectStep });
        });
    });

    // Refresh geometry after lazy-loaded pictures and fonts settle, not every frame.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    document.querySelectorAll('main img').forEach((image) => {
        if (!image.complete) image.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
    });
    window.addEventListener('pageshow', () => ScrollTrigger.refresh());
}

reducedMotion.addEventListener('change', (event) => {
    if (event.matches) runningAnimations.forEach((animation) => animation.cancel());
});
window.addEventListener('hub:motion-preference-changed', (event) => {
    if (event.detail?.reduced) runningAnimations.forEach((animation) => animation.cancel());
});
