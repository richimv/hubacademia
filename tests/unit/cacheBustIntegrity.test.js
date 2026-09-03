const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

describe('Cache Busting Deterministic Artifacts Integrity', () => {
    const publicDir = path.join(__dirname, '../../src/presentation/public');
    const assetRoots = ['css', 'js'];

    function walkFiles(directory) {
        if (!fs.existsSync(directory)) return [];
        return fs.readdirSync(directory, { withFileTypes: true })
            .flatMap((entry) => {
                const fullPath = path.join(directory, entry.name);
                return entry.isDirectory() ? walkFiles(fullPath) : [fullPath];
            });
    }

    it('ensures all committed HTML files have the exact deterministic asset version hash', () => {
        const assetFiles = assetRoots
            .flatMap((folder) => walkFiles(path.join(publicDir, folder)))
            .sort((left, right) => left.localeCompare(right));

        const hash = crypto.createHash('sha256');
        assetFiles.forEach((filePath) => {
            hash.update(path.relative(publicDir, filePath).replace(/\\/g, '/'));
            const content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
            hash.update(content, 'utf8');
        });
        const expectedVersion = hash.digest('hex').slice(0, 12);

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
