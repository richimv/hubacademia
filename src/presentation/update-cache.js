const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const d = path.join(__dirname, 'public');
const version = crypto.randomBytes(4).toString('hex');

fs.readdirSync(d).filter(f => f.endsWith('.html')).forEach(f => {
    const p = path.join(d, f);
    let c = fs.readFileSync(p, 'utf8');

    // 1. Cache bust all local CSS files (href="css/..." or href="/css/...")
    const cssRegex = /(href="(?:\/)?css\/[^"]+\.css)(?:\?v=[^"]+)?(?=")/g;
    c = c.replace(cssRegex, `$1?v=${version}`);

    // 2. Cache bust all local JS files (src="js/..." or src="/js/...")
    const jsRegex = /(src="(?:\/)?js\/[^"]+\.js)(?:\?v=[^"]+)?(?=")/g;
    c = c.replace(jsRegex, `$1?v=${version}`);

    fs.writeFileSync(p, c);
    console.log(`Updated ${f} to version ${version}`);
});
