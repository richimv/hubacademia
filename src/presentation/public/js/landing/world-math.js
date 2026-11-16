/**
 * PURE WEBGL OBSERVATORY MATH & GEOMETRY — zero DOM/GL dependencies.
 * Consumed by js/landing/world.js and verified directly under Jest.
 */

export const WORLD_SEED = 1169276946;

export const WORLD_MODES = Object.freeze({
    docente: {
        id: 'docente',
        primary: [0.145, 0.388, 0.922],
        secondary: [0.220, 0.741, 0.973],
        tiltBias: 0.16,
        spinScale: 1.0
    },
    medico: {
        id: 'medico',
        primary: [0.059, 0.463, 0.431],
        secondary: [0.176, 0.831, 0.749],
        tiltBias: 0.34,
        spinScale: 0.92
    },
    repaso: {
        id: 'repaso',
        primary: [0.231, 0.510, 0.965],
        secondary: [0.655, 0.545, 0.980],
        tiltBias: -0.22,
        spinScale: 0.85
    }
});

export const CHAPTER_DEFS = Object.freeze([
    { id: 'hero-section', code: '01', centerX: 0.70, centerY: 0.50, zoom: 1.05, opacity: 1.0, camZ: 4.8 },
    { id: 'herramientas-section', code: '02', centerX: 0.24, centerY: 0.52, zoom: 0.92, opacity: 0.62, camZ: 5.8 },
    { id: 'inicial-section', code: '03', centerX: 0.78, centerY: 0.44, zoom: 0.88, opacity: 0.52, camZ: 6.2 },
    { id: 'boletin-section', code: '04', centerX: 0.28, centerY: 0.46, zoom: 0.95, opacity: 0.58, camZ: 5.7 },
    { id: 'vision-section', code: '05', centerX: 0.72, centerY: 0.36, zoom: 1.08, opacity: 0.64, camZ: 5.3 },
    { id: 'planes-section', code: '06', centerX: 0.50, centerY: 0.58, zoom: 0.84, opacity: 0.45, camZ: 6.8 }
]);

export function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

export function lerp(start, end, amount) {
    return start + (end - start) * amount;
}

/** Cap canvas device pixel ratio to protect fill-rate on high-DPI phones and laptops. */
export function computeSafeDpr(devicePixelRatio, viewportWidth) {
    const raw = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
    const cap = viewportWidth <= 640 ? 1.25 : 1.75;
    return clamp(raw, 1, cap);
}

/**
 * Given viewport scroll state and measured section top offsets, compute
 * active chapter, hero scroll progress, and smoothly interpolated shader targets.
 */
export function computeChapterState(scrollY, viewportWidth, viewportHeight, sectionTops = [], heroSceneHeight = 0) {
    const safeScroll = Number.isFinite(scrollY) ? Math.max(0, scrollY) : 0;
    const safeHeight = Number.isFinite(viewportHeight) && viewportHeight > 0 ? viewportHeight : 900;
    const isDesktopWide = (viewportWidth || 1280) > 960;

    const effectiveHeroSpan = heroSceneHeight > safeHeight ? (heroSceneHeight - safeHeight * 0.65) : safeHeight * 0.85;
    const heroProgress = clamp(safeScroll / Math.max(1, effectiveHeroSpan), 0, 1);

    if (!Array.isArray(sectionTops) || sectionTops.length !== CHAPTER_DEFS.length) {
        const first = CHAPTER_DEFS[0];
        return {
            activeIndex: 0,
            activeChapter: first,
            heroProgress,
            centerX: isDesktopWide ? lerp(first.centerX, 0.54, heroProgress) : 0.5,
            centerY: isDesktopWide ? lerp(first.centerY, 0.52, heroProgress) : 0.72,
            zoom: isDesktopWide ? lerp(first.zoom, 1.48, heroProgress) : lerp(0.84, 1.15, heroProgress),
            opacity: first.opacity,
            camZ: lerp(first.camZ, 3.6, heroProgress)
        };
    }

    const focusLine = safeScroll + safeHeight * 0.45;
    let currentIdx = 0;
    for (let i = 0; i < sectionTops.length; i++) {
        if (focusLine >= sectionTops[i]) currentIdx = i;
    }

    const nextIdx = Math.min(currentIdx + 1, CHAPTER_DEFS.length - 1);
    const startTop = sectionTops[currentIdx];
    const endTop = sectionTops[nextIdx];
    const span = Math.max(1, endTop - startTop);
    const segT = currentIdx === nextIdx ? 0 : clamp((focusLine - startTop) / span, 0, 1);

    const a = CHAPTER_DEFS[currentIdx];
    const b = CHAPTER_DEFS[nextIdx];

    // Keep Hero centered at scrollY=0 and glide continuously into Chapter 02 as focusLine reaches tops[1]
    const effectiveSegT = currentIdx === 0
        ? clamp((safeScroll - startTop) / Math.max(1, endTop - startTop - safeHeight * 0.45), 0, 1)
        : segT;

    // Inside Hero sticky zone, sweep the 3D optical core forward toward center-zoom before flying to S02
    const zoomBoost = currentIdx === 0 ? Math.sin(clamp(heroProgress, 0, 1) * Math.PI) * 0.38 : 0;

    return {
        activeIndex: currentIdx,
        activeChapter: a,
        heroProgress,
        centerX: isDesktopWide ? lerp(a.centerX, b.centerX, effectiveSegT) : 0.5,
        centerY: isDesktopWide ? lerp(a.centerY, b.centerY, effectiveSegT) : (currentIdx === 0 ? 0.72 : 0.45),
        zoom: (isDesktopWide ? lerp(a.zoom, b.zoom, effectiveSegT) : lerp(a.zoom, b.zoom, effectiveSegT) * 0.82) + zoomBoost,
        opacity: lerp(a.opacity, b.opacity, effectiveSegT),
        camZ: lerp(a.camZ, b.camZ, effectiveSegT) - zoomBoost * 1.4
    };
}

/** Column-major 4x4 OpenGL perspective projection matrix. */
export function buildPerspectiveMatrix(fovRadians, aspect, near, far) {
    const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
    const f = 1.0 / Math.tan(fovRadians * 0.5);
    const nf = 1.0 / (near - far);
    return new Float32Array([
        f / safeAspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (far + near) * nf, -1,
        0, 0, 2 * far * near * nf, 0
    ]);
}

/** Column-major 4x4 rotation (Ry * Rx) + camera translation matrix. */
export function buildModelViewMatrix(yaw, pitch, translateX, translateY, translateZ) {
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const cx = Math.cos(pitch);
    const sx = Math.sin(pitch);

    return new Float32Array([
        cy, sx * sy, -cx * sy, 0,
        0, cx, sx, 0,
        sy, -sx * cy, cx * cy, 0,
        translateX, translateY, translateZ, 1
    ]);
}

function appendIcosahedronEdges(outPositions, outIntensities, radius, intensity) {
    const phi = (1 + Math.sqrt(5)) / 2;
    const rawVerts = [
        [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
        [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
        [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]
    ].map(([vx, vy, vz]) => {
        const len = Math.hypot(vx, vy, vz);
        return [(vx / len) * radius, (vy / len) * radius, (vz / len) * radius];
    });

    const faces = [
        [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
        [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
        [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
        [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
    ];

    const seenEdges = new Set();
    for (const face of faces) {
        for (let i = 0; i < 3; i++) {
            const a = face[i];
            const b = face[(i + 1) % 3];
            const key = a < b ? `${a}-${b}` : `${b}-${a}`;
            if (seenEdges.has(key)) continue;
            seenEdges.add(key);
            outPositions.push(...rawVerts[a], ...rawVerts[b]);
            outIntensities.push(intensity, intensity);
        }
    }
}

function createPrng(seed) {
    let state = seed >>> 0;
    return () => {
        state = (Math.imul(1664525, state) + 1013904223) >>> 0;
        return state / 4294967296;
    };
}

/**
 * Deterministic 3D vertex geometry for cosmic constellation particles
 * and elevated geodesic nodes surrounding the ray-traced core.
 */
export function buildObservatoryGeometry(particleCount = 240) {
    const linePositions = [];
    const lineIntensities = [];

    appendIcosahedronEdges(linePositions, lineIntensities, 1.38, 0.55);

    const rand = createPrng(WORLD_SEED);
    const pointPositions = [];
    const pointMeta = [];
    for (let i = 0; i < particleCount; i++) {
        const theta = rand() * Math.PI * 2;
        const cosPhi = rand() * 2 - 1;
        const sinPhi = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi));
        const r = 1.25 + rand() * 4.2;
        pointPositions.push(
            r * sinPhi * Math.cos(theta),
            r * cosPhi * 0.85,
            r * sinPhi * Math.sin(theta)
        );
        // [pointSizeFactor, brightnessSeed]
        pointMeta.push(1.8 + rand() * 3.4, 0.4 + rand() * 0.6);
    }

    return {
        linePositions: new Float32Array(linePositions),
        lineIntensities: new Float32Array(lineIntensities),
        lineVertexCount: linePositions.length / 3,
        pointPositions: new Float32Array(pointPositions),
        pointMeta: new Float32Array(pointMeta),
        pointCount: particleCount
    };
}
