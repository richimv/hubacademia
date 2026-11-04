/**
 * Compatibility entry point for old bookmarks. The live simulator owns the catalog.
 * Keep unrelated query parameters; translate the former domain filter to context.
 */
(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = String(params.get('context') || params.get('domain') || '').toUpperCase();
    const medical = ['MEDICINA', 'SALUD', 'MEDICINE', 'HEALTH'].includes(requested);
    params.set('context', medical ? 'MEDICINA' : 'EDUCACION');
    params.delete('domain');
    window.location.replace('/simulator-dashboard?' + params.toString() + window.location.hash);
})();
