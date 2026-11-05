/** Public editorial reading is separate from course CRUD and account libraries. */
class BulletinController {
    constructor(resourceRepository) {
        this.resources = resourceRepository;
        this.getFeed = this.getFeed.bind(this);
    }

    async getFeed(req, res) {
        try {
            const items = await this.resources.findBulletin({ type: req.query.type, query: String(req.query.q || '') });
            res.set('Cache-Control', 'no-store');
            return res.json(items);
        } catch (error) {
            console.error('[Boletín] No se pudo obtener el feed:', error.code || error.name);
            return res.status(500).json({ error: 'No se pudieron cargar las publicaciones. Intenta nuevamente.' });
        }
    }
}

module.exports = BulletinController;
