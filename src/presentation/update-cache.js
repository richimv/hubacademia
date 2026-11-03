const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const d = path.join(__dirname, 'public');
const assetRoots = ['css', 'js'];

function walkFiles(directory) {
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory, { withFileTypes: true })
        .flatMap((entry) => {
            const fullPath = path.join(directory, entry.name);
            return entry.isDirectory() ? walkFiles(fullPath) : [fullPath];
        });
}

const assetFiles = assetRoots
    .flatMap((folder) => walkFiles(path.join(d, folder)))
    .sort((left, right) => left.localeCompare(right));

const hash = crypto.createHash('sha256');
assetFiles.forEach((filePath) => {
    hash.update(path.relative(d, filePath).replace(/\\/g, '/'));
    const content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
    hash.update(content, 'utf8');
});
const version = hash.digest('hex').slice(0, 12);
let updatedFiles = 0;

fs.readdirSync(d).filter(f => f.endsWith('.html')).forEach(f => {
    const p = path.join(d, f);
    let c = fs.readFileSync(p, 'utf8');
    const original = c;

    // 1. Cache bust all local CSS files (href="css/..." or href="/css/...")
    const cssRegex = /(href="(?:\/)?css\/[^"]+\.css)(?:\?v=[^"]+)?(?=")/g;
    c = c.replace(cssRegex, `$1?v=${version}`);

    // 2. Cache bust all local JS files (src="js/..." or src="/js/...")
    const jsRegex = /(src="(?:\/)?js\/[^"]+\.js)(?:\?v=[^"]+)?(?=")/g;
    c = c.replace(jsRegex, `$1?v=${version}`);

    if (c !== original) {
        fs.writeFileSync(p, c);
        updatedFiles += 1;
    }
});

console.log(`Asset version ${version}; HTML files updated: ${updatedFiles}`);
