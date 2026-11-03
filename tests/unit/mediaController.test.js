const sharp = require('sharp');
const mediaController = require('../../src/application/controllers/mediaController');

describe('MediaController image hardening', () => {
    test('validates and converts a real PNG buffer to WebP', async () => {
        const png = await sharp({
            create: {
                width: 8,
                height: 8,
                channels: 4,
                background: { r: 10, g: 20, b: 30, alpha: 1 }
            }
        }).png().toBuffer();

        await expect(mediaController._validateImageBuffer(png)).resolves.toEqual(
            expect.objectContaining({ format: 'png', width: 8, height: 8 })
        );

        const optimized = await mediaController._optimizeImage(png);
        await expect(sharp(optimized).metadata()).resolves.toEqual(
            expect.objectContaining({ format: 'webp', width: 8, height: 8 })
        );
    });

    test('rejects spoofed or malformed image content', async () => {
        await expect(
            mediaController._validateImageBuffer(Buffer.from('<script>alert(1)</script>'))
        ).rejects.toThrow();
    });
});
