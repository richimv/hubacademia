const fs = require('fs');
const path = require('path');
const { getAssetVersion } = require('../../src/presentation/update-cache');

describe('Cache Busting Deterministic Artifacts Integrity', () => {
    const rootDir = path.join(__dirname, '../..');
    const publicDir = path.join(rootDir, 'src/presentation/public');

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

            const iconMatches = [...content.matchAll(/<link\b[^>]*\bhref="((?:\/)?(?:favicon\.ico|assets\/logo\.png)(?:\?v=[^"]*)?)"/g)];
            iconMatches.forEach(([, href]) => {
                const versionMatch = href.match(/\?v=([^"]+)$/);
                const iconVersion = versionMatch ? versionMatch[1] : null;
                if (iconVersion !== expectedVersion) {
                    outOfSyncFiles.push({ file, href, foundVersion: iconVersion, expectedVersion });
                }
            });
        });

        if (outOfSyncFiles.length > 0) {
            console.error('❌ Archivos HTML con hash de cache desactualizado:', outOfSyncFiles);
        }

        expect(outOfSyncFiles).toEqual([]);
    });

    it('keeps root favicon.ico and public/favicon.ico synchronized without immutable cache lock', () => {
        const rootFavicon = fs.readFileSync(path.join(rootDir, 'favicon.ico'));
        const publicFavicon = fs.readFileSync(path.join(publicDir, 'favicon.ico'));
        expect(publicFavicon.equals(rootFavicon)).toBe(true);

        const vercelConfig = JSON.parse(fs.readFileSync(path.join(rootDir, 'vercel.json'), 'utf8'));
        const faviconRule = vercelConfig.headers.find(rule => rule.source === '/favicon.ico');
        const logoRule = vercelConfig.headers.find(rule => rule.source === '/assets/logo.png');

        expect(faviconRule).toBeDefined();
        expect(logoRule).toBeDefined();
        expect(faviconRule.headers.find(h => h.key === 'Cache-Control').value).not.toContain('immutable');
        expect(logoRule.headers.find(h => h.key === 'Cache-Control').value).not.toContain('immutable');
    });
});
