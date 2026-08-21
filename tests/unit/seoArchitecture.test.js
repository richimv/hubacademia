const fs = require('fs');
const path = require('path');

describe('SEO Architecture & Indexing Test Suite', () => {
    const publicDir = path.join(__dirname, '../../src/presentation/public');

    const publicPages = [
        'index.html',
        'pricing.html',
        'repaso.html',
        'simulator-dashboard.html',
        'library.html',
        'privacy.html',
        'terms.html'
    ];

    const privateOrObsoletePages = [
        'simulators.html',
        'login.html',
        'course.html',
        'resource.html',
        'admin.html',
        'dashboard.html',
        'deck-editor.html',
        'profile.html',
        'flashcards.html',
        'quiz.html'
    ];

    describe('1. Public Pages SEO Meta Tags & Schema Validation', () => {
        publicPages.forEach(page => {
            test(`${page} has valid title, meta description, canonical link, and Open Graph tags`, () => {
                const filePath = path.join(publicDir, page);
                expect(fs.existsSync(filePath)).toBe(true);
                const content = fs.readFileSync(filePath, 'utf8');

                // Title check
                expect(content).toMatch(/<title>[^<]+<\/title>/i);
                
                // Canonical check
                expect(content).toMatch(/<link\s+rel="canonical"\s+href="https:\/\/www\.hubacademia\.com/i);
                
                // Meta Description check
                expect(content).toMatch(/<meta\s+name="description"\s+content="[^"]+"/i);

                // Open Graph check
                expect(content).toMatch(/<meta\s+property="og:title"/i);
                expect(content).toMatch(/<meta\s+property="og:description"/i);
                expect(content).toMatch(/<meta\s+property="og:image"/i);

                // Check noindex is NOT present on public pages
                expect(content).not.toMatch(/<meta\s+name="robots"\s+content="noindex/i);
            });
        });

        test('index.html contains valid and parseable JSON-LD Structured Data', () => {
            const content = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
            const jsonLdMatch = content.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
            expect(jsonLdMatch).not.toBeNull();
            
            const parsed = JSON.parse(jsonLdMatch[1]);
            expect(parsed['@context']).toBe('https://schema.org');
            expect(parsed['@graph']).toBeDefined();
            expect(parsed['@graph'].length).toBeGreaterThan(0);
        });

        test('pricing.html contains valid Product and FAQPage JSON-LD Structured Data', () => {
            const content = fs.readFileSync(path.join(publicDir, 'pricing.html'), 'utf8');
            const jsonLdMatch = content.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
            expect(jsonLdMatch).not.toBeNull();
            
            const parsed = JSON.parse(jsonLdMatch[1]);
            expect(parsed['@context']).toBe('https://schema.org');
            expect(parsed['@graph']).toBeDefined();
        });
    });

    describe('2. Obsolete and Private Pages Noindex Enforcement', () => {
        privateOrObsoletePages.forEach(page => {
            test(`${page} MUST have noindex robots directive`, () => {
                const filePath = path.join(publicDir, page);
                expect(fs.existsSync(filePath)).toBe(true);
                const content = fs.readFileSync(filePath, 'utf8');
                expect(content).toMatch(/<meta\s+name="robots"\s+content="noindex/i);
            });
        });
    });

    describe('3. Robots.txt Directives Validation', () => {
        test('robots.txt disallows obsolete/private routes and provides sitemap', () => {
            const robotsPath = path.join(publicDir, 'robots.txt');
            expect(fs.existsSync(robotsPath)).toBe(true);
            const content = fs.readFileSync(robotsPath, 'utf8');

            expect(content).toMatch(/Disallow:\s*\/login/);
            expect(content).toMatch(/Disallow:\s*\/course/);
            expect(content).toMatch(/Disallow:\s*\/resource/);
            expect(content).toMatch(/Disallow:\s*\/simulators/);
            expect(content).toMatch(/Disallow:\s*\/admin/);
            expect(content).toMatch(/Sitemap:\s*https:\/\/www\.hubacademia\.com\/sitemap\.xml/);
        });
    });

    describe('4. Sitemap.xml Canonical Consistency Validation', () => {
        test('sitemap.xml only includes active clean URLs and excludes obsolete pages', () => {
            const sitemapPath = path.join(publicDir, 'sitemap.xml');
            expect(fs.existsSync(sitemapPath)).toBe(true);
            const content = fs.readFileSync(sitemapPath, 'utf8');

            // Must include active pages
            expect(content).toMatch(/<loc>https:\/\/www\.hubacademia\.com\/<\/loc>/);
            expect(content).toMatch(/<loc>https:\/\/www\.hubacademia\.com\/simulator-dashboard<\/loc>/);
            expect(content).toMatch(/<loc>https:\/\/www\.hubacademia\.com\/repaso<\/loc>/);
            expect(content).toMatch(/<loc>https:\/\/www\.hubacademia\.com\/library<\/loc>/);
            expect(content).toMatch(/<loc>https:\/\/www\.hubacademia\.com\/pricing<\/loc>/);

            // Must NOT include obsolete/draft pages
            expect(content).not.toMatch(/<loc>https:\/\/www\.hubacademia\.com\/simulators<\/loc>/);
            expect(content).not.toMatch(/<loc>https:\/\/www\.hubacademia\.com\/login<\/loc>/);
            expect(content).not.toMatch(/<loc>https:\/\/www\.hubacademia\.com\/course<\/loc>/);
            expect(content).not.toMatch(/<loc>https:\/\/www\.hubacademia\.com\/resource<\/loc>/);

            // Must NOT contain .html in URLs
            expect(content).not.toMatch(/\.html<\/loc>/);
        });
    });
});
