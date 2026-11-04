/**
 * Export approved ImageGen originals for the web and Google Flow.
 * Inputs/prompts: assets/landing/media-manifest.json. No generation or API calls.
 * Originals and earlier visual versions are never overwritten by this script.
 */
const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');

const assetDirectory = path.resolve(__dirname, '../src/presentation/public/assets/landing');

async function prepareLandingAssets() {
    const manifest = JSON.parse(await fs.readFile(path.join(assetDirectory, 'media-manifest.json'), 'utf8'));
    const imageDirectory = path.join(assetDirectory, 'images', 'v5');
    const frameDirectory = path.join(assetDirectory, 'flow', 'v5');
    for (const directory of [imageDirectory, frameDirectory]) {
        await fs.mkdir(directory, { recursive: true });
    }

    for (const asset of manifest.assets) {
        const source = path.join(assetDirectory, asset.source);
        const [width, height] = asset.flowDimensions;
        // Normalize export dimensions for Flow; keep the native ImageGen PNG intact.
        const framePath = path.join(frameDirectory, `${asset.id}.jpg`);
        await sharp(source).resize(width, height, { fit: 'cover' }).jpeg({ quality: 95, chromaSubsampling: '4:4:4' }).toFile(framePath);
        // Loops reuse the start frame as their final reference; do not duplicate it.
        if (asset.frame !== 'start') continue;

        const imageName = `${asset.slot}-${asset.orientation}`;
        for (const imageWidth of asset.orientation === 'desktop' ? [960, 1920] : [640, 1080]) {
            const imageHeight = Math.round(imageWidth * height / width);
            const result = await sharp(source).resize(imageWidth, imageHeight, { fit: 'cover' })
                .webp({ quality: 84, effort: 5 }).toFile(path.join(imageDirectory, `${imageName}-${imageWidth}.webp`));
            console.log(`${imageName}-${imageWidth}.webp: ${Math.round(result.size / 1024)} KB`);
        }
    }
}

prepareLandingAssets().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
