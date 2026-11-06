/**
 * LANDING ENTRY — orchestration only.
 * Content: index.html / local samples: landing/data.js / media: landing/media-config.js.
 * Global session, account menu and Hubi remain owned by app.js.
 */
import { initProducts, initMemoryCard, initInitialDemo } from './landing/demos.js?v=e86e06546949';
import { initMobileMenu, initGuide, initNavigation } from './landing/navigation.js?v=e86e06546949';
import { initReveals, initScrollMotion } from './landing/motion.js?v=e86e06546949';
import { initMedia } from './landing/media.js?v=e86e06546949';

function initLanding() {
    if (!document.body.classList.contains('landing-page')) return;
    let products;
    const initializers = [
        ['products', () => { products = initProducts(); }],
        ['memory-card', initMemoryCard],
        ['inicial-demo', initInitialDemo],
        ['mobile-menu', initMobileMenu],
        ['guide-link', initGuide],
        ['reveals', initReveals],
        ['navigation', initNavigation],
        ['media', initMedia],
        ['scroll', () => initScrollMotion(products)]
    ];
    for (const [name, initialize] of initializers) {
        try { initialize(); }
        catch (error) { console.error(`[Landing:${name}]`, error); }
    }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initLanding, { once: true });
else initLanding();
