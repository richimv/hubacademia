const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const publicDir = path.join(__dirname, 'public');
const localModuleImportRegex = /(\b(?:from\s*|import\s*)["']\.{1,2}\/[^"']+\.js)(?:\?v=[^"']+)?(?=["'])/g;
const relativePath = file => path.relative(publicDir, file).replace(/\\/g, '/');
const isLandingModule = file => relativePath(file) === 'js/landing-home.js' ||
    (relativePath(file).startsWith('js/landing/') && file.endsWith('.js'));

function walkFiles(directory) {
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const fullPath = path.join(directory, entry.name);
        return entry.isDirectory() ? walkFiles(fullPath) : [fullPath];
    });
}

function collectAssets() {
    return ['css', 'js'].flatMap(folder => walkFiles(path.join(publicDir, folder)))
        .sort((left, right) => {
            const first = relativePath(left);
            const second = relativePath(right);
            return first < second ? -1 : first > second ? 1 : 0;
        });
}

/** Canonical hash shared by the build and CI; versioned imports cannot hash themselves. */
function getAssetVersion() {
    const hash = crypto.createHash('sha256');
    for (const file of collectAssets()) {
        hash.update(relativePath(file));
        let content = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
        if (isLandingModule(file)) content = content.replace(localModuleImportRegex, '$1?v=__ASSET_VERSION__');
        hash.update(content, 'utf8');
    }
    return hash.digest('hex').slice(0, 12);
}

function updateCache() {
    const version = getAssetVersion();
    let updatedFiles = 0;
    let updatedModules = 0;
    for (const file of collectAssets().filter(isLandingModule)) {
        const original = fs.readFileSync(file, 'utf8');
        const content = original.replace(localModuleImportRegex, '$1?v=' + version);
        if (content !== original) {
            fs.writeFileSync(file, content);
            updatedModules++;
        }
    }
    for (const file of fs.readdirSync(publicDir).filter(name => name.endsWith('.html'))) {
        const target = path.join(publicDir, file);
        const original = fs.readFileSync(target, 'utf8');
        const content = original
            .replace(/(href="(?:\/)?css\/[^"]+\.css)(?:\?v=[^"]+)?(?=")/g, '$1?v=' + version)
            .replace(/(src="(?:\/)?js\/[^"]+\.js)(?:\?v=[^"]+)?(?=")/g, '$1?v=' + version);
        if (content !== original) {
            fs.writeFileSync(target, content);
            updatedFiles++;
        }
    }
    console.log('Asset version ' + version + '; HTML files updated: ' + updatedFiles + '; landing modules updated: ' + updatedModules);
}

if (require.main === module) updateCache();
module.exports = { getAssetVersion, updateCache };
