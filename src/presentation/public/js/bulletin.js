/** Public editorial feed. Resource CRUD and course materials remain separate concerns. */
(() => {
    const feed = document.getElementById('bulletin-feed');
    if (!feed) return;
    const search = document.getElementById('bulletin-search');
    const status = document.getElementById('bulletin-status');
    const filters = [...document.querySelectorAll('[data-bulletin-type]')];
    let selectedType = new URLSearchParams(location.search).get('type') || '';
    if (!['noticia', 'paper'].includes(selectedType)) selectedType = '';
    search.value = (new URLSearchParams(location.search).get('q') || '').slice(0, 120);
    let controller;
    let debounce;

    function element(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text) node.textContent = text;
        return node;
    }

    function sourceUrl(value) {
        try {
            const url = new URL(value);
            return ['https:', 'http:'].includes(url.protocol) ? url : null;
        } catch { return null; }
    }

    function story(item, index) {
        const url = sourceUrl(item.url);
        if (!url) return null;
        const article = element('article', index === 0 ? 'bulletin-story bulletin-story--lead' : 'bulletin-story');
        const link = element('a', 'bulletin-story-link');
        link.href = url.href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        const type = item.resource_type === 'paper' ? 'Investigación' : 'Noticia';
        if (item.image_url) {
            const figure = element('div', 'bulletin-story-image');
            const image = document.createElement('img');
            image.src = window.resolveImageUrl ? window.resolveImageUrl(item.image_url) : item.image_url;
            image.alt = '';
            image.loading = index === 0 ? 'eager' : 'lazy';
            image.decoding = 'async';
            image.addEventListener('error', () => figure.remove(), { once: true });
            figure.append(image);
            link.append(figure);
        }
        const body = element('div', 'bulletin-story-body');
        body.append(element('p', 'bulletin-story-meta', type + ' · ' + url.hostname.replace(/^www\./, '')));
        body.append(element('h2', 'bulletin-story-title', item.title));
        if (item.excerpt?.trim()) body.append(element('p', 'bulletin-story-excerpt', item.excerpt.trim()));
        const byline = element('p', 'bulletin-story-byline', item.author || url.hostname.replace(/^www\./, ''));
        const date = item.created_at ? new Date(item.created_at) : null;
        if (date && Number.isFinite(date.getTime())) {
            const time = element('time', '', 'En el boletín desde ' + date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }));
            time.dateTime = date.toISOString();
            byline.append(time);
        }
        body.append(byline, element('span', 'bulletin-story-action', 'Leer en la fuente ↗'));
        link.append(body);
        article.append(link);
        return article;
    }

    function render(items) {
        feed.replaceChildren();
        const cards = items.map(story).filter(Boolean);
        if (!cards.length) {
            const empty = element('div', 'bulletin-empty');
            const searching = Boolean(search.value.trim() || selectedType);
            empty.append(element('h2', '', searching ? 'No encontramos publicaciones con ese filtro.' : 'La próxima lectura empieza aquí.'));
            empty.append(element('p', '', searching ? 'Prueba otra búsqueda o consulta todas las publicaciones.' : 'Este espacio reunirá noticias y papers seleccionados sobre inteligencia artificial en el Perú y el mundo.'));
            feed.append(empty);
            return;
        }
        feed.append(...cards);
    }

    async function load() {
        controller?.abort();
        controller = new AbortController();
        const request = controller;
        const params = new URLSearchParams();
        if (selectedType) params.set('type', selectedType);
        if (search.value.trim()) params.set('q', search.value.trim().slice(0, 120));
        const query = params.toString();
        history.replaceState(history.state, '', location.pathname + (query ? '?' + query : ''));
        filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.bulletinType === selectedType)));
        feed.setAttribute('aria-busy', 'true');
        status.textContent = 'Cargando publicaciones…';
        try {
            const response = await fetch((window.AppConfig?.API_URL || '') + '/api/bulletin' + (query ? '?' + query : ''), { signal: request.signal });
            if (!response.ok) throw new Error('FEED_UNAVAILABLE');
            const items = await response.json();
            if (request.signal.aborted) return;
            render(Array.isArray(items) ? items : []);
            status.textContent = items.length ? items.length + (items.length === 1 ? ' publicación' : ' publicaciones') : '';
        } catch (error) {
            if (error.name === 'AbortError') return;
            feed.replaceChildren();
            status.textContent = 'No pudimos cargar el boletín en este momento.';
            const retry = element('button', 'bulletin-retry', 'Volver a cargar');
            retry.type = 'button';
            retry.addEventListener('click', load, { once: true });
            feed.append(retry);
        } finally {
            if (request === controller) feed.setAttribute('aria-busy', 'false');
        }
    }

    filters.forEach(button => button.addEventListener('click', () => {
        clearTimeout(debounce);
        selectedType = button.dataset.bulletinType;
        load();
    }));
    search.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(load, 180);
    });
    document.getElementById('bulletin-search-form').addEventListener('submit', event => {
        event.preventDefault();
        clearTimeout(debounce);
        load();
    });
    load();
})();
