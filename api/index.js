const Server = require('../src/infrastructure/config/server');

// Instancia cálida reutilizada entre invocaciones de Vercel Serverless
let serverInstance = null;

async function getReadyApp() {
    if (!serverInstance) {
        serverInstance = new Server();
    }
    return serverInstance.setup();
}

module.exports = async function handler(req, res) {
    try {
        const app = await getReadyApp();
        return app(req, res);
    } catch (error) {
        console.error('❌ [Vercel Serverless] Error inicializando aplicación:', error);
        if (!res.headersSent) {
            return res.status(500).json({
                error: 'Servicio temporalmente no disponible. Por favor intenta nuevamente.'
            });
        }
    }
};
