// ✅ API_URL se obtiene directamente de AppConfig para evitar conflictos globales
console.log('✅ [SearchService] Loading...');

(() => {
    const API_URL = window.AppConfig.API_URL;

    class SearchService {
        static async loadAllData() {
            const [careers, courses, sections, instructors, topics, books] = await Promise.all([
                this._fetchData('/api/careers'),
                this._fetchData('/api/courses'),
                this._fetchData('/api/sections'),
                this._fetchData('/api/instructors'),
                this._fetchData('/api/topics'),
                this._fetchData('/api/books')
            ]);
            return { careers, courses, sections, instructors, topics, books };
        }

        static async _fetchData(endpoint) {
            const response = await window.NetworkService.fetch(`${API_URL}${endpoint}`);
            if (!response.ok) throw new Error(`Error fetching ${endpoint}`);
            return response.json();
        }

        static async search(query) {
            const response = await window.NetworkService.fetch(`${API_URL}/api/buscar?q=${encodeURIComponent(query)}`, {
                method: 'GET'
            });

            if (!response.ok) throw new Error(`Error del servidor: ${response.statusText}`);
            return response.json();
        }
    }

    // ✅ EXPOSICION GLOBAL
    window.SearchService = SearchService;
})();
