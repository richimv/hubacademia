/**
 * home-animations.js
 * Controla las animaciones de entrada al hacer scroll en la página de inicio.
 * Utiliza IntersectionObserver para un rendimiento de 60fps libre de lag.
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Vincular el scroll suave del botón Explorar
    const exploreBtn = document.getElementById('hero-explore-btn');
    if (exploreBtn) {
        exploreBtn.onclick = (e) => {
            e.preventDefault();
            const targetSection = document.querySelector('.scroll-animate-section');
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        };
    }

    // 2. IntersectionObserver para las secciones animadas
    const animatedSections = document.querySelectorAll('.scroll-animate-section');
    if (animatedSections.length > 0) {
        const observerOptions = {
            root: null,
            rootMargin: '0px 0px -100px 0px', // Se activa un poco antes de estar totalmente visible
            threshold: 0.12 // 12% visible para iniciar la transición
        };

        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target); // Animación de un solo disparo
                }
            });
        }, observerOptions);

        animatedSections.forEach(section => {
            observer.observe(section);
        });
    }
});
