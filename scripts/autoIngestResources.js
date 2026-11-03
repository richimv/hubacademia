/**
 * autoIngestResources.js
 * Script de Ingesta Automática de Recursos (Papers, Guías, Normas, Libros).
 * Permite a la IA de Antigravity 2.0 registrar directamente nuevos hallazgos en la BD.
 * 
 * Uso:
 *   node scripts/autoIngestResources.js --data='[{"title":"...","url":"...","resource_type":"paper","domain":"medicine"}]'
 *   node scripts/autoIngestResources.js --file=path/to/payload.json
 */

const fs = require('fs');
const path = require('path');
const ResourceAutoIngestService = require('../src/domain/services/resourceAutoIngestService');

async function main() {
    const args = process.argv.slice(2);
    let payload = [];

    let dataArg = args.find(a => a.startsWith('--data='));
    let fileArg = args.find(a => a.startsWith('--file='));

    if (dataArg) {
        const rawJson = dataArg.replace('--data=', '').trim();
        try {
            payload = JSON.parse(rawJson);
        } catch (e) {
            console.error('❌ Error parsing JSON in --data:', e.message);
            process.exit(1);
        }
    } else if (fileArg) {
        const filePath = fileArg.replace('--file=', '').trim();
        const absPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
        try {
            const content = fs.readFileSync(absPath, 'utf8');
            payload = JSON.parse(content);
        } catch (e) {
            console.error(`❌ Error reading JSON file ${filePath}:`, e.message);
            process.exit(1);
        }
    } else {
        console.log('ℹ️ No se especificó --data o --file. Intentando leer de stdin...');
        let stdinData = '';
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', chunk => stdinData += chunk);
        await new Promise(resolve => process.stdin.on('end', resolve));

        if (stdinData.trim()) {
            try {
                payload = JSON.parse(stdinData.trim());
            } catch (e) {
                console.error('❌ Error parsing stdin JSON:', e.message);
                process.exit(1);
            }
        }
    }

    if (!Array.isArray(payload)) {
        payload = [payload];
    }

    console.log(`🚀 Procesando ${payload.length} recurso(s) para ingesta automática...`);
    const service = new ResourceAutoIngestService();
    const result = await service.ingestBatch(payload);

    console.log('----------------------------------------------------');
    console.log(`✅ Ingesta finalizada exitosamente:`);
    console.log(`   - Nuevos Creados: ${result.createdCount}`);
    console.log(`   - Omitidos (Duplicados/Inválidos): ${result.skippedCount}`);
    console.log('----------------------------------------------------');

    if (result.created.length > 0) {
        console.log('📄 Recursos agregados:');
        result.created.forEach(r => console.log(`   + [${r.resource_type.toUpperCase()}] ${r.title} (${r.domain})`));
    }
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Error no controlado en la ingesta:', err);
    process.exit(1);
});
