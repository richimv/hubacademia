const fs = require('fs');
const path = require('path');
const { getAssetVersion } = require('../../src/presentation/update-cache');

describe('Cache Busting Deterministic Artifacts Integrity', () => {
    const publicDir = path.join(__dirname, '../../src/presentation/public');
    it('ensures all committed HTML files have the exact deterministic asset version hash', () => {
        const expectedVersion = getAssetVersion();

        const htmlFiles = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));
        expect(htmlFiles.length).toBeGreaterThan(0);

        const outOfSyncFiles = [];

        htmlFiles.forEach(file => {
            const content = fs.readFileSync(path.join(publicDir, file), 'utf8');
            const cssMatch = content.match(/href="(?:\/)?css\/[^"]+\.css\?v=([^"]+)"/);
            const jsMatch = content.match(/src="(?:\/)?js\/[^"]+\.js\?v=([^"]+)"/);

            const foundVersion = (cssMatch && cssMatch[1]) || (jsMatch && jsMatch[1]);
            if (foundVersion && foundVersion !== expectedVersion) {
                outOfSyncFiles.push({ file, foundVersion, expectedVersion });
            }
        });

        if (outOfSyncFiles.length > 0) {
            console.error('❌ Archivos HTML con hash de cache desactualizado:', outOfSyncFiles);
        }

        expect(outOfSyncFiles).toEqual([]);
    });
});
