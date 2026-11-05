const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const d = path.join(__dirname, 'public');
const assetRoots = ['css', 'js'];
// Static imports inside the landing also need cache busting. Normalize their
// version while hashing so a build never changes its own hash on the next run.
const localModuleImportRegex = /(\b(?:from\s*|import\s*)["']\.{1,2}\/[^"']+\.js)(?:\?v=[^"']+)?(?=["'])/g;
const isLandingModule = (filePath) => {
    const relativePath = path.relative(d, filePath).replace(/\\/g, '/');
    return relativePath === 'js/landing-home.js' || (relativePath.startsWith('js/landing/') && relativePath.endsWith('.js'));
};

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
    .sort((left, right) => {
        const first = path.relative(d, left).replace(/\\/g, '/');
        const second = path.relative(d, right).replace(/\\/g, '/');
        return first < second ? -1 : first > second ? 1 : 0;
    });

const hash = crypto.createHash('sha256');
assetFiles.forEach((filePath) => {
    hash.update(path.relative(d, filePath).replace(/\\/g, '/'));
    let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
    if (isLandingModule(filePath)) content = content.replace(localModuleImportRegex, '$1?v=__ASSET_VERSION__');
    hash.update(content, 'utf8');
});
const version = hash.digest('hex').slice(0, 12);
let updatedFiles = 0;
let updatedModules = 0;

assetFiles.filter(isLandingModule).forEach((filePath) => {
    const original = fs.readFileSync(filePath, 'utf8');
    const content = original.replace(localModuleImportRegex, `$1?v=${version}`);
    if (content !== original) {
        fs.writeFileSync(filePath, content);
        updatedModules += 1;
    }
});

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

console.log(`Asset version ${version}; HTML files updated: ${updatedFiles}; landing modules updated: ${updatedModules}`);
