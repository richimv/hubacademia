/**
 * Generate a seamless 2:1 (2048x1024) 3D-spherical fBM planet equirectangular texture
 * plus matching planet fallback posters for no-WebGL environments.
 */
const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');

const PUBLIC_ASSETS = path.resolve(__dirname, '../src/presentation/public/assets');
const V6_DIR = path.join(PUBLIC_ASSETS, 'landing/images/v6');
const TEX_DIR = path.join(PUBLIC_ASSETS, 'landing/textures');

function clampByte(v) {
    return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

// Fast deterministic 3D integer hash -> [0, 1]
function hash3(ix, iy, iz) {
    let n = (ix * 374761393 + iy * 668265263 + iz * 2147483647) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function noise3(x, y, z) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const iz = Math.floor(z);
    const fx = x - ix;
    const fy = y - iy;
    const fz = z - iz;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    const uz = fz * fz * (3 - 2 * fz);

    const n000 = hash3(ix, iy, iz);
    const n100 = hash3(ix + 1, iy, iz);
    const n010 = hash3(ix, iy + 1, iz);
    const n110 = hash3(ix + 1, iy + 1, iz);
    const n001 = hash3(ix, iy, iz + 1);
    const n101 = hash3(ix + 1, iy, iz + 1);
    const n011 = hash3(ix, iy + 1, iz + 1);
    const n111 = hash3(ix + 1, iy + 1, iz + 1);

    const nx00 = lerp(n000, n100, ux);
    const nx10 = lerp(n010, n110, ux);
    const nx01 = lerp(n001, n101, ux);
    const nx11 = lerp(n011, n111, ux);

    const nxy0 = lerp(nx00, nx10, uy);
    const nxy1 = lerp(nx01, nx11, uy);
    return lerp(nxy0, nxy1, uz);
}

function fbm3(x, y, z, octaves) {
    let val = 0;
    let amp = 0.5;
    let freq = 1.0;
    for (let i = 0; i < octaves; i++) {
        val += amp * noise3(x * freq, y * freq, z * freq);
        freq *= 2.07;
        amp *= 0.5;
    }
    return val;
}

function ridged3(x, y, z, octaves) {
    let val = 0;
    let amp = 0.5;
    let freq = 1.0;
    for (let i = 0; i < octaves; i++) {
        const n = 1.0 - Math.abs(noise3(x * freq, y * freq, z * freq) * 2.0 - 1.0);
        val += amp * n * n;
        freq *= 2.15;
        amp *= 0.5;
    }
    return val;
}

function samplePlanetColor(nx, ny, nz) {
    // Domain-warped continents & tectonic basalt ridges on the 3D unit sphere (zero seams, zero polar pinch)
    const wx = fbm3(nx * 2.1 + 1.3, ny * 2.1 - 0.7, nz * 2.1 + 2.4, 3) - 0.5;
    const wy = fbm3(nx * 2.1 - 3.1, ny * 2.1 + 1.8, nz * 2.1 - 0.9, 3) - 0.5;
    const wz = fbm3(nx * 2.1 + 0.6, ny * 2.1 + 2.9, nz * 2.1 - 1.7, 3) - 0.5;

    const px = nx * 2.6 + wx * 1.15;
    const py = ny * 2.6 + wy * 1.15;
    const pz = nz * 2.6 + wz * 1.15;

    const elevation = fbm3(px, py, pz, 5);
    const ridges = ridged3(px * 1.8 + 4.1, py * 1.8 - 2.3, pz * 1.8 + 1.1, 4);
    const micro = noise3(nx * 24.0, ny * 24.0, nz * 24.0);

    // Deep obsidian ocean vs slate-basalt continents vs crisp highland peaks
    const seaLevel = 0.49;
    const landMask = smoothstep(seaLevel - 0.03, seaLevel + 0.04, elevation);
    const highland = smoothstep(0.56, 0.78, elevation + ridges * 0.22);

    // Ocean palette: deep abyssal obsidian -> dark slate-blue shelf
    const shelf = smoothstep(0.36, seaLevel, elevation);
    let r = lerp(6, 15, shelf);
    let g = lerp(8, 22, shelf);
    let b = lerp(14, 38, shelf);

    // Land palette: dark basaltic rock -> weathered titanium slate -> bright mineral ridges
    const landR = lerp(18, 58, highland) + (micro - 0.5) * 10;
    const landG = lerp(22, 68, highland) + (micro - 0.5) * 11;
    const landB = lerp(30, 86, highland) + (micro - 0.5) * 13;

    r = lerp(r, landR, landMask);
    g = lerp(g, landG, landMask);
    b = lerp(b, landB, landMask);

    // Subtle coastal / tectonic energy veins (muted, realistic planetary glow)
    const coast = smoothstep(0.0, 0.025, Math.abs(elevation - seaLevel));
    const coastGlow = (1.0 - coast) * 0.22;
    r += coastGlow * 36;
    g += coastGlow * 125;
    b += coastGlow * 195;

    // Polar ice / frost caps (subtle cool slate-silver at high latitudes)
    const polar = smoothstep(0.76, 0.94, Math.abs(ny) + (elevation - 0.5) * 0.18);
    r = lerp(r, 118, polar * 0.48);
    g = lerp(g, 134, polar * 0.52);
    b = lerp(b, 158, polar * 0.58);

    // Wispy high-altitude planetary cloud bands (swirled along latitude)
    const cloudWarp = fbm3(nx * 3.2 - 1.1, ny * 3.2 + 0.4, nz * 3.2 + 3.7, 3);
    const cloud = fbm3(nx * 4.4 + cloudWarp * 1.4, ny * 6.8, nz * 4.4 - cloudWarp * 1.4, 4);
    const cloudAlpha = smoothstep(0.56, 0.79, cloud) * 0.42;
    r = lerp(r, 175, cloudAlpha);
    g = lerp(g, 198, cloudAlpha);
    b = lerp(b, 224, cloudAlpha);

    return [clampByte(r), clampByte(g), clampByte(b)];
}

async function buildPlanetEquirectangular() {
    const W = 2048;
    const H = 1024;
    const out = Buffer.alloc(W * H * 3);

    for (let y = 0; y < H; y++) {
        const v = (y + 0.5) / H;
        const lat = (0.5 - v) * Math.PI;
        const cosLat = Math.cos(lat);
        const sinLat = Math.sin(lat);

        for (let x = 0; x < W; x++) {
            const u = (x + 0.5) / W;
            const lon = (u - 0.5) * Math.PI * 2;
            const nx = cosLat * Math.cos(lon);
            const ny = sinLat;
            const nz = cosLat * Math.sin(lon);

            const [r, g, b] = samplePlanetColor(nx, ny, nz);
            const idx = (y * W + x) * 3;
            out[idx] = r;
            out[idx + 1] = g;
            out[idx + 2] = b;
        }
    }

    const texPath = path.join(TEX_DIR, 'astrolabe-equirect-2048.webp');
    const info = await sharp(out, { raw: { width: W, height: H, channels: 3 } })
        .webp({ quality: 88, effort: 5 })
        .toFile(texPath);
    console.log(`astrolabe-equirect-2048.webp: ${Math.round(info.size / 1024)} KB`);
}

async function buildPlanetFallbackPoster(width, height, cxFrac, cyFrac, radiusFrac, outName) {
    const out = Buffer.alloc(width * height * 3);
    const minDim = Math.min(width, height);
    const cx = width * cxFrac;
    const cy = height * cyFrac;
    const radius = minDim * radiusFrac;

    // Key light from upper-right
    const lx = 0.68, ly = 0.48, lz = 0.55;
    const lLen = Math.hypot(lx, ly, lz);
    const kx = lx / lLen, ky = ly / lLen, kz = lz / lLen;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const dx = (x - cx) / radius;
            const dy = -(y - cy) / radius;
            const r2 = dx * dx + dy * dy;

            let r = 5, g = 5, b = 7;

            // Subtle atmospheric halo outside limb
            const dist = Math.sqrt(r2);
            if (dist >= 0.96 && dist < 1.55) {
                const halo = Math.exp(-(dist - 0.98) * (dist - 0.98) * 18.0) * 0.32;
                r += halo * 38;
                g += halo * 110;
                b += halo * 225;
            }

            if (r2 < 1.0) {
                const nz = Math.sqrt(Math.max(0, 1.0 - r2));
                const nx = dx;
                const ny = dy;
                // Slight axial tilt for fallback render
                const [pr, pg, pb] = samplePlanetColor(nx, ny * 0.96 - nz * 0.28, nz * 0.96 + ny * 0.28);
                const ndotl = Math.max(0, nx * kx + ny * ky + nz * kz);
                const fresnel = Math.pow(1.0 - nz, 2.8);
                const light = 0.08 + 1.05 * Math.pow(ndotl, 1.15);
                r = pr * light + fresnel * 55;
                g = pg * light + fresnel * 145;
                b = pb * light + fresnel * 245;
            }

            const idx = (y * width + x) * 3;
            out[idx] = clampByte(r);
            out[idx + 1] = clampByte(g);
            out[idx + 2] = clampByte(b);
        }
    }

    const outPath = path.join(V6_DIR, outName);
    const info = await sharp(out, { raw: { width, height, channels: 3 } })
        .webp({ quality: 86, effort: 5 })
        .toFile(outPath);
    console.log(`${outName}: ${Math.round(info.size / 1024)} KB`);
}

async function main() {
    await fs.mkdir(V6_DIR, { recursive: true });
    await fs.mkdir(TEX_DIR, { recursive: true });
    await buildPlanetEquirectangular();
    await buildPlanetFallbackPoster(1376, 768, 0.70, 0.50, 0.34, 'hero-planet-desktop-1376.webp');
    await buildPlanetFallbackPoster(768, 1376, 0.50, 0.72, 0.36, 'hero-planet-mobile-768.webp');
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
