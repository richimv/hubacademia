/** Product controls and local sample forms. Markup lives in index.html. */
import { INITIAL_EXAMPLES } from './data.js?v=f7918836952f';
import { animate } from './motion.js?v=f7918836952f';

export function initProducts() {
    const stage = document.getElementById('tools-live-stage');
    if (!stage) return null;
    const tabs = [...stage.querySelectorAll('[data-product-tab]')];
    const panels = [...stage.querySelectorAll('[data-product-panel]')];
    const chapters = [...document.querySelectorAll('[data-product-chapter]')];
    let current = tabs[0].dataset.productTab;

    function select(id, automated = false) {
        if (id === current || !panels.some((panel) => panel.dataset.productPanel === id)) return;
        // Scroll must never remove a keyboard user's focused control or reading panel.
        if (automated && stage.contains(document.activeElement)) return;
        current = id;
        tabs.forEach((tab) => {
            const selected = tab.dataset.productTab === id;
            tab.setAttribute('aria-selected', String(selected));
            tab.tabIndex = selected ? 0 : -1;
        });
        panels.forEach((panel) => {
            const selected = panel.dataset.productPanel === id;
            panel.hidden = !selected;
            if (selected) animate(panel, [
                { opacity: .25, transform: 'translateY(14px)' },
                { opacity: 1, transform: 'translateY(0)' }
            ], { duration: 550 });
        });
        chapters.forEach((chapter) => chapter.classList.toggle('is-current', chapter.dataset.productChapter === id));
    }

    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => select(tab.dataset.productTab));
        tab.addEventListener('keydown', (event) => {
            let next = index;
            if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
            else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
            else if (event.key === 'Home') next = 0;
            else if (event.key === 'End') next = tabs.length - 1;
            else return;
            event.preventDefault();
            tabs[next].focus();
            select(tabs[next].dataset.productTab);
        });
    });
    return { select, stage, chapters };
}

export function initMemoryCard() {
    const flip = document.getElementById('memory-flip');
    if (!flip) return;
    flip.addEventListener('click', () => {
        const answer = flip.getAttribute('aria-pressed') !== 'true';
        flip.setAttribute('aria-pressed', String(answer));
        document.getElementById('memory-side').textContent = answer ? 'Respuesta de ejemplo' : 'Pregunta de ejemplo';
        document.getElementById('memory-content').textContent = answer
            ? 'Que el estudiante revise su propio razonamiento y encuentre caminos para mejorar, a través de preguntas y acompañamiento.'
            : '¿Qué busca la retroalimentación por descubrimiento?';
        flip.textContent = answer ? 'Volver a la pregunta' : 'Ver respuesta';
        animate(document.getElementById('memory-content'), [{ opacity: .2, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }]);
    });
}

export function initInitialDemo() {
    const form = document.getElementById('inicial-demo');
    if (!form) return;
    const competency = document.getElementById('demo-competency');
    const evidence = document.getElementById('demo-evidence');
    const conclusion = document.getElementById('demo-conclusion');
    const example = () => INITIAL_EXAMPLES[competency.value][form.querySelector('input[name="demo-age"]:checked').value];
    const render = () => {
        const item = example();
        evidence.textContent = item.evidence;
        conclusion.textContent = item.conclusion;
    };
    form.addEventListener('change', render);
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        render();
        animate(conclusion.parentElement, [{ opacity: .3, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 650 });
    });
}
