/**
 * VOLUMETRIC APPLIED AI WEBGL CORE & SCROLL CONDUCTOR
 * Renders an interactive ray-shaded 3D obsidian-glass optical core with tilted orbital rings,
 * constellation depth particles, scroll-linked camera flythrough across S01–S06,
 * and automatic domain spectrum shifting via 'hub:product-focus'.
 */
import {
    WORLD_MODES,
    CHAPTER_DEFS,
    clamp,
    lerp,
    computeSafeDpr,
    computeChapterState,
    buildPerspectiveMatrix,
    buildModelViewMatrix,
    buildObservatoryGeometry
} from './world-math.js?v=5df7c36bdf87';

const CORE_VERT = `
attribute vec2 aQuadPos;
varying mediump vec2 vUv;
void main() {
    vUv = aQuadPos * 0.5 + 0.5;
    gl_Position = vec4(aQuadPos, 0.0, 1.0);
}
`;

const CORE_FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying mediump vec2 vUv;
uniform vec2 uResolution;
uniform vec2 uCenter;
uniform vec3 uPrimary;
uniform vec3 uSecondary;
uniform float uOpacity;
uniform float uYaw;
uniform float uPitch;
uniform float uZoom;
uniform float uTime;
uniform sampler2D uSphereTex;

const float PI = 3.14159265359;
const float TAU = 6.28318530718;

mat2 rot2(float a) {
    float c = cos(a);
    float s = sin(a);
    return mat2(c, -s, s, c);
}

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

vec3 rotateVec(vec3 v, float yaw, float pitch) {
    v.yz = rot2(pitch) * v.yz;
    v.xz = rot2(yaw) * v.xz;
    return v;
}

float ringMask(vec3 ro, vec3 rd, vec3 planeN, float innerR, float outerR, float maxDist, out float hitDist, out float angleVal) {
    float denom = dot(rd, planeN);
    hitDist = 100000.0;
    angleVal = 0.0;
    if (abs(denom) < 0.0015) return 0.0;
    float t = -dot(ro, planeN) / denom;
    if (t <= 0.1 || t > maxDist) return 0.0;
    vec3 hit = ro + rd * t;
    float r = length(hit);
    float radial = smoothstep(innerR - 0.015, innerR + 0.004, r) * (1.0 - smoothstep(outerR - 0.004, outerR + 0.015, r));
    if (radial <= 0.001) return 0.0;
    hitDist = t;
    vec3 refAxis = abs(planeN.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 tanU = normalize(cross(refAxis, planeN));
    vec3 tanV = cross(planeN, tanU);
    angleVal = atan(dot(hit, tanV), dot(hit, tanU));
    return radial;
}

void main() {
    float aspect = uResolution.x / max(1.0, uResolution.y);
    vec2 p = vec2((vUv.x - uCenter.x) * aspect, vUv.y - uCenter.y) / max(0.35, uZoom);

    // Pure Dark Cinema base (#050507) with subtle volumetric atmosphere
    vec3 bg = vec3(0.0196, 0.0196, 0.0275);
    float rad = length(p);
    bg += uPrimary * exp(-rad * rad * 3.0) * 0.22 * uOpacity;
    bg += uSecondary * exp(-pow(abs(rad - 0.36) * 5.0, 2.0)) * 0.11 * uOpacity;

    // 3D Ray setup rotated by user drag/hover + scroll yaw
    vec3 ro = rotateVec(vec3(0.0, 0.0, 3.0), uYaw, uPitch);
    vec3 rd = rotateVec(normalize(vec3(p, -1.7)), uYaw, uPitch);

    // Analytic intersection with photorealistic 360-deg equirectangular astrolabe sphere (R = 0.56)
    float sphereR = 0.56;
    float b = dot(ro, rd);
    float c = dot(ro, ro) - sphereR * sphereR;
    float disc = b * b - c;
    float sphereT = 100000.0;

    vec3 sphereCol = vec3(0.0);
    float sphereAlpha = 0.0;

    if (disc > -0.025) {
        float safeDisc = max(0.0, disc);
        sphereT = -b - sqrt(safeDisc);
        vec3 hit = ro + rd * sphereT;
        vec3 n = normalize(hit);

        float ndotv = clamp(dot(-rd, n), 0.0, 1.0);
        float fresnel = pow(1.0 - ndotv, 2.65);

        // Sample continuous 2:1 equirectangular planet texture on rotated sphere normal
        vec3 nTex = rotateVec(n, uTime * 0.08, 0.0);
        float eqU = atan(nTex.z, nTex.x) / TAU + 0.5;
        float eqV = acos(clamp(nTex.y, -1.0, 1.0)) / PI;
        vec3 eqTex = texture2D(uSphereTex, vec2(eqU, eqV)).rgb;

        // Subtle planetary relief bump from texture luminance gradient
        float lC = dot(eqTex, vec3(0.299, 0.587, 0.114));
        float lU = dot(texture2D(uSphereTex, vec2(eqU + 0.0025, eqV)).rgb, vec3(0.299, 0.587, 0.114));
        float lV = dot(texture2D(uSphereTex, vec2(eqU, clamp(eqV + 0.004, 0.0, 1.0))).rgb, vec3(0.299, 0.587, 0.114));
        vec3 bumpN = normalize(n + vec3(lC - lU, lC - lV, 0.0) * 1.6);

        // Dramatic Eclipse day/night terminator + atmospheric Fresnel scattering
        vec3 keyDir = normalize(vec3(0.72, 0.48, 0.50));
        vec3 fillDir = normalize(vec3(-0.65, -0.35, 0.35));
        float ndotl = max(0.0, dot(bumpN, keyDir));
        float terminator = smoothstep(-0.08, 0.72, dot(n, keyDir));
        float keyDiff = 0.06 + 1.12 * pow(ndotl, 1.1) * terminator;
        float oceanSpec = pow(max(0.0, dot(reflect(-keyDir, bumpN), -rd)), 22.0) * (1.0 - smoothstep(0.08, 0.25, lC)) * 0.32;
        float fillDiff = max(0.0, dot(n, fillDir)) * 0.08;

        vec3 planetBody = eqTex * keyDiff + uPrimary * fillDiff + vec3(0.75, 0.88, 1.0) * oceanSpec;
        vec3 atmoRim = mix(uPrimary, uSecondary, 0.65) * (fresnel * (0.55 + 0.95 * terminator));

        sphereCol = planetBody + atmoRim;
        sphereAlpha = smoothstep(-0.02, 0.015, disc);
    }

    vec3 col = mix(bg, mix(bg, sphereCol, clamp(0.55 + uOpacity * 0.45, 0.0, 1.0)), sphereAlpha);

    // Back/front depth-tested tilted orbital rings (genuine 3D occlusion around the sphere)
    float occludeDist = disc > 0.0 ? sphereT : 100000.0;
    vec3 n1 = normalize(vec3(0.18, 0.92, 0.34));
    float d1 = 100000.0;
    float a1 = 0.0;
    float r1 = ringMask(ro, rd, n1, 0.78, 0.812, occludeDist, d1, a1);
    if (r1 > 0.001) {
        float pulse1 = 0.30 + 0.70 * pow(0.5 + 0.5 * cos(a1 * 2.0 - uTime * 0.85), 2.0);
        col += mix(vec3(0.58, 0.64, 0.74), mix(uPrimary, uSecondary, 0.65), 0.75) * (r1 * pulse1 * 1.05 * uOpacity);
    }

    vec3 n2 = normalize(vec3(-0.42, 0.76, -0.49));
    float d2 = 100000.0;
    float a2 = 0.0;
    float r2 = ringMask(ro, rd, n2, 0.98, 1.005, occludeDist, d2, a2);
    if (r2 > 0.001) {
        float pulse2 = 0.22 + 0.78 * pow(0.5 + 0.5 * sin(a2 * 3.0 + uTime * 0.55), 3.0);
        col += mix(vec3(0.52, 0.58, 0.68), uSecondary, 0.72) * (r2 * pulse2 * 0.82 * uOpacity);
    }

    // Dither removes 8-bit dark monitor banding
    float dither = (hash12(gl_FragCoord.xy + fract(uTime) * 17.0) - 0.5) * 0.01;
    gl_FragColor = vec4(col + dither, 1.0);
}
`;

const GEOM_VERT = `
attribute vec3 aPos;
attribute float aWeight;
uniform mat4 uProjection;
uniform mat4 uModelView;
uniform mediump float uPointMode;
uniform float uDpr;
varying mediump float vDepth;
varying mediump float vWeight;

void main() {
    vec4 mvPos = uModelView * vec4(aPos, 1.0);
    gl_Position = uProjection * mvPos;
    vDepth = clamp((-mvPos.z - 1.5) / 8.5, 0.0, 1.0);
    vWeight = aWeight;
    if (uPointMode > 0.5) {
        gl_PointSize = clamp((aWeight * 4.8 * uDpr) / max(1.0, -mvPos.z * 0.4), 2.0, 13.0 * uDpr);
    }
}
`;

const GEOM_FRAG = `
precision mediump float;
uniform vec3 uPrimary;
uniform vec3 uSecondary;
uniform float uOpacity;
uniform mediump float uPointMode;
varying mediump float vDepth;
varying mediump float vWeight;

void main() {
    float alpha = (1.0 - vDepth * 0.5) * vWeight * uOpacity;
    if (uPointMode > 0.5) {
        vec2 c = gl_PointCoord - vec2(0.5);
        float d = length(c) * 2.0;
        if (d > 1.0) discard;
        alpha *= 0.24 * smoothstep(1.0, 0.08, d);
    }
    vec3 col = mix(uSecondary, uPrimary, clamp(vDepth + 0.15, 0.0, 1.0));
    col = mix(col, vec3(0.95, 0.97, 1.0), (1.0 - vDepth) * 0.42);
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.95));
}
`;

function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Unable to create WebGL shader');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader) || 'Shader compilation failed';
        gl.deleteShader(shader);
        throw new Error(info);
    }
    return shader;
}

function linkProgram(gl, vertSrc, fragSrc) {
    const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
    const program = gl.createProgram();
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    gl.deleteShader(vert);
    gl.deleteShader(frag);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(program) || 'Program link failed';
        gl.deleteProgram(program);
        throw new Error(info);
    }
    return program;
}

export function initLandingWorld() {
    const canvas = document.getElementById('landing-webgl-stage');
    if (!canvas) return null;

    const root = document.documentElement;
    const osReduceQuery = typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : { matches: false };
    let manualReduced = root.dataset.reduceMotion === 'true';
    const isMotionReduced = () => Boolean(manualReduced || osReduceQuery.matches);

    const rig = {
        mode: WORLD_MODES.docente,
        pointerX: 0,
        pointerY: 0,
        dragYaw: 0,
        dragPitch: 0,
        smoothYaw: 0.3,
        smoothPitch: 0.16,
        centerX: 0.70,
        centerY: 0.50,
        zoom: 1.05,
        opacity: 1.0,
        camZ: 4.8,
        primary: [...WORLD_MODES.docente.primary],
        secondary: [...WORLD_MODES.docente.secondary],
        time: 0,
        sectionTops: [],
        heroSceneHeight: 0
    };

    const motionButtons = [...document.querySelectorAll('[data-motion-toggle]')];
    let rafId = null;
    let tickerFn = null;
    let lastTimestamp = 0;
    let glReady = false;
    let renderFrame = () => {};

    function stopLoop() {
        if (tickerFn && window.gsap?.ticker) {
            window.gsap.ticker.remove(tickerFn);
            tickerFn = null;
        }
        if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
    }

    function startLoop() {
        stopLoop();
        if (!glReady || isMotionReduced() || document.hidden) return;

        if (window.gsap?.ticker) {
            tickerFn = (_time, deltaMs) => renderFrame((deltaMs || 16.67) / 1000);
            window.gsap.ticker.add(tickerFn);
            return;
        }

        lastTimestamp = performance.now();
        const step = (now) => {
            const dt = (now - lastTimestamp) / 1000;
            lastTimestamp = now;
            renderFrame(dt);
            rafId = requestAnimationFrame(step);
        };
        rafId = requestAnimationFrame(step);
    }

    function syncMotionUI() {
        const reduced = isMotionReduced();
        root.dataset.reduceMotion = reduced ? 'true' : 'false';
        motionButtons.forEach((btn) => {
            btn.setAttribute('aria-pressed', String(reduced));
            btn.textContent = reduced ? 'Animación pausada' : 'Pausar animación';
        });
        window.dispatchEvent(new CustomEvent('hub:motion-preference-changed', { detail: { reduced } }));
    }

    function measureSections() {
        const scrollTop = window.scrollY || window.pageYOffset || 0;
        const heroScene = document.getElementById('hero-scroll-scene');
        rig.heroSceneHeight = heroScene ? heroScene.offsetHeight : 0;
        rig.sectionTops = CHAPTER_DEFS.map((chapter) => {
            const el = document.getElementById(chapter.id);
            if (!el) return 0;
            return el.getBoundingClientRect().top + scrollTop;
        });
    }

    function setDomainFocus(productId) {
        rig.mode = WORLD_MODES[productId] || WORLD_MODES.docente;
        if (glReady && isMotionReduced()) renderFrame(0);
    }

    motionButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            manualReduced = !manualReduced;
            syncMotionUI();
            if (manualReduced) stopLoop();
            else startLoop();
            if (glReady) renderFrame(0);
        });
    });

    window.addEventListener('hub:product-focus', (event) => {
        setDomainFocus(event.detail?.product);
    });

    const heroStage = document.querySelector('[data-hero-stage]');
    let dragging = false;
    let lastClientX = 0;
    let lastClientY = 0;

    if (heroStage) {
        heroStage.addEventListener('pointerdown', (e) => {
            if (e.target.closest('a, button, input, select, label')) return;
            dragging = true;
            lastClientX = e.clientX;
            lastClientY = e.clientY;
            heroStage.classList.add('is-dragging');
            try { heroStage.setPointerCapture(e.pointerId); } catch (_) {}
        });

        heroStage.addEventListener('pointermove', (e) => {
            if (window.innerWidth > 960) {
                rig.pointerX = ((e.clientX / Math.max(1, window.innerWidth)) - 0.5) * 0.55;
                rig.pointerY = ((e.clientY / Math.max(1, window.innerHeight)) - 0.5) * 0.35;
            }
            if (!dragging) return;
            const dx = e.clientX - lastClientX;
            const dy = e.clientY - lastClientY;
            lastClientX = e.clientX;
            lastClientY = e.clientY;
            rig.dragYaw += dx * 0.0085;
            rig.dragPitch = clamp(rig.dragPitch + dy * 0.0065, -0.9, 0.9);
            if (isMotionReduced()) renderFrame(0);
        }, { passive: true });

        const endDrag = (e) => {
            if (!dragging) return;
            dragging = false;
            heroStage.classList.remove('is-dragging');
            try {
                if (e && e.pointerId != null) heroStage.releasePointerCapture(e.pointerId);
            } catch (_) {}
        };
        heroStage.addEventListener('pointerup', endDrag, { passive: true });
        heroStage.addEventListener('pointercancel', endDrag, { passive: true });
        window.addEventListener('pointerup', endDrag, { passive: true });
    }

    syncMotionUI();
    measureSections();

    let gl = null;
    try {
        gl = canvas.getContext('webgl2', { alpha: false, antialias: true, powerPreference: 'high-performance' })
            || canvas.getContext('webgl', { alpha: false, antialias: true, powerPreference: 'high-performance' });
    } catch (e) {
        gl = null;
    }

    if (!gl) {
        root.dataset.webgl = 'fallback';
        return { destroy: () => {} };
    }

    let coreProg;
    let geomProg;
    let geometry;
    let quadBuf;
    let linePosBuf;
    let lineWeightBuf;
    let pointPosBuf;
    let pointMetaBuf;
    let sphereTex;

    function createSolidTexture(r, g, b, wrapS) {
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([r, g, b, 255]));
        return tex;
    }

    function loadImageTexture(tex, url, useMipmap) {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
            if (!glReady) return;
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            if (useMipmap) {
                gl.generateMipmap(gl.TEXTURE_2D);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            } else {
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            }
            if (isMotionReduced()) renderFrame(0);
        };
        img.src = url;
    }

    try {
        coreProg = linkProgram(gl, CORE_VERT, CORE_FRAG);
        geomProg = linkProgram(gl, GEOM_VERT, GEOM_FRAG);
        geometry = buildObservatoryGeometry(240);

        sphereTex = createSolidTexture(10, 12, 18, gl.REPEAT);
        loadImageTexture(sphereTex, '/assets/landing/textures/astrolabe-equirect-2048.webp?v=planet1', true);

        quadBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

        linePosBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, linePosBuf);
        gl.bufferData(gl.ARRAY_BUFFER, geometry.linePositions, gl.STATIC_DRAW);

        lineWeightBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, lineWeightBuf);
        gl.bufferData(gl.ARRAY_BUFFER, geometry.lineIntensities.map((v) => v * 0.2), gl.STATIC_DRAW);

        pointPosBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, pointPosBuf);
        gl.bufferData(gl.ARRAY_BUFFER, geometry.pointPositions, gl.STATIC_DRAW);

        pointMetaBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, pointMetaBuf);
        gl.bufferData(gl.ARRAY_BUFFER, geometry.pointMeta, gl.STATIC_DRAW);

        root.dataset.webgl = 'active';
    } catch (shaderErr) {
        console.warn('[Landing:world] WebGL fallback:', shaderErr);
        root.dataset.webgl = 'fallback';
        return { destroy: () => {} };
    }

    const uCore = {
        res: gl.getUniformLocation(coreProg, 'uResolution'),
        center: gl.getUniformLocation(coreProg, 'uCenter'),
        primary: gl.getUniformLocation(coreProg, 'uPrimary'),
        secondary: gl.getUniformLocation(coreProg, 'uSecondary'),
        opacity: gl.getUniformLocation(coreProg, 'uOpacity'),
        yaw: gl.getUniformLocation(coreProg, 'uYaw'),
        pitch: gl.getUniformLocation(coreProg, 'uPitch'),
        zoom: gl.getUniformLocation(coreProg, 'uZoom'),
        time: gl.getUniformLocation(coreProg, 'uTime'),
        sphereTex: gl.getUniformLocation(coreProg, 'uSphereTex')
    };
    const aQuadPos = gl.getAttribLocation(coreProg, 'aQuadPos');

    const uGeom = {
        proj: gl.getUniformLocation(geomProg, 'uProjection'),
        mv: gl.getUniformLocation(geomProg, 'uModelView'),
        primary: gl.getUniformLocation(geomProg, 'uPrimary'),
        secondary: gl.getUniformLocation(geomProg, 'uSecondary'),
        opacity: gl.getUniformLocation(geomProg, 'uOpacity'),
        pointMode: gl.getUniformLocation(geomProg, 'uPointMode'),
        dpr: gl.getUniformLocation(geomProg, 'uDpr')
    };
    const aGeomPos = gl.getAttribLocation(geomProg, 'aPos');
    const aGeomWeight = gl.getAttribLocation(geomProg, 'aWeight');

    let safeDpr = 1;
    let width = 1;
    let height = 1;
    let projectionMatrix = buildPerspectiveMatrix(0.76, 16 / 9, 0.1, 45.0);

    function resize() {
        const vw = window.innerWidth || canvas.clientWidth || 1280;
        const vh = window.innerHeight || canvas.clientHeight || 800;
        safeDpr = computeSafeDpr(window.devicePixelRatio, vw);
        width = Math.max(1, Math.round(vw * safeDpr));
        height = Math.max(1, Math.round(vh * safeDpr));
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }
        gl.viewport(0, 0, width, height);
        projectionMatrix = buildPerspectiveMatrix(0.76, width / height, 0.1, 45.0);
        measureSections();
        if (isMotionReduced()) renderFrame(0);
    }

    renderFrame = (dtSeconds) => {
        if (!glReady) return;
        const dt = clamp(dtSeconds || 0, 0, 0.05);
        const state = computeChapterState(
            window.scrollY || 0,
            window.innerWidth,
            window.innerHeight,
            rig.sectionTops,
            rig.heroSceneHeight
        );

        const reduced = isMotionReduced();
        const follow = reduced ? 1.0 : Math.min(1, dt * 7.0 || 0.14);

        if (!reduced) {
            rig.time += dt * rig.mode.spinScale;
        }

        const scrollTwist = (window.scrollY || 0) * 0.0011;
        const targetYaw = (reduced ? 0.35 : rig.time * 0.16) + rig.dragYaw + rig.pointerX + scrollTwist;
        const targetPitch = rig.mode.tiltBias + rig.dragPitch + rig.pointerY;

        rig.smoothYaw = lerp(rig.smoothYaw, targetYaw, follow);
        rig.smoothPitch = lerp(rig.smoothPitch, targetPitch, follow);
        rig.centerX = lerp(rig.centerX, state.centerX, follow);
        rig.centerY = lerp(rig.centerY, state.centerY, follow);
        rig.zoom = lerp(rig.zoom, state.zoom, follow);
        rig.opacity = lerp(rig.opacity, state.opacity, follow);
        rig.camZ = lerp(rig.camZ, state.camZ, follow);

        for (let i = 0; i < 3; i++) {
            rig.primary[i] = lerp(rig.primary[i], rig.mode.primary[i], follow);
            rig.secondary[i] = lerp(rig.secondary[i], rig.mode.secondary[i], follow);
        }

        // Pass 1: Photorealistic 360-deg Equirectangular Astrolabe Sphere + Depth-Tested Orbital Rings
        gl.disable(gl.BLEND);
        gl.useProgram(coreProg);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, sphereTex);
        gl.uniform1i(uCore.sphereTex, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
        if (aQuadPos >= 0) {
            gl.enableVertexAttribArray(aQuadPos);
            gl.vertexAttribPointer(aQuadPos, 2, gl.FLOAT, false, 0, 0);
        }
        gl.uniform2f(uCore.res, width, height);
        gl.uniform2f(uCore.center, rig.centerX, 1.0 - rig.centerY);
        gl.uniform3fv(uCore.primary, rig.primary);
        gl.uniform3fv(uCore.secondary, rig.secondary);
        gl.uniform1f(uCore.opacity, rig.opacity);
        gl.uniform1f(uCore.yaw, rig.smoothYaw);
        gl.uniform1f(uCore.pitch, rig.smoothPitch);
        gl.uniform1f(uCore.zoom, rig.zoom);
        gl.uniform1f(uCore.time, rig.time);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        if (aQuadPos >= 0) gl.disableVertexAttribArray(aQuadPos);

        // Pass 2: Geodesic Constellation Nodes & Bokeh Particles aligned to camera core
        if (aGeomPos < 0 || aGeomWeight < 0) return;

        const offsetWorldX = (rig.centerX - 0.5) * 3.6;
        const offsetWorldY = -(rig.centerY - 0.5) * 2.2;
        const mvMatrix = buildModelViewMatrix(
            rig.smoothYaw * 0.72,
            rig.smoothPitch * 0.72,
            offsetWorldX,
            offsetWorldY,
            -rig.camZ
        );

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        gl.useProgram(geomProg);
        gl.uniformMatrix4fv(uGeom.proj, false, projectionMatrix);
        gl.uniformMatrix4fv(uGeom.mv, false, mvMatrix);
        gl.uniform3fv(uGeom.primary, rig.primary);
        gl.uniform3fv(uGeom.secondary, rig.secondary);
        gl.uniform1f(uGeom.opacity, rig.opacity);
        gl.uniform1f(uGeom.dpr, safeDpr);

        gl.uniform1f(uGeom.pointMode, 1.0);
        gl.bindBuffer(gl.ARRAY_BUFFER, pointPosBuf);
        gl.enableVertexAttribArray(aGeomPos);
        gl.vertexAttribPointer(aGeomPos, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, pointMetaBuf);
        gl.enableVertexAttribArray(aGeomWeight);
        gl.vertexAttribPointer(aGeomWeight, 1, gl.FLOAT, false, 8, 0);
        gl.drawArrays(gl.POINTS, 0, geometry.pointCount);

        gl.disableVertexAttribArray(aGeomPos);
        gl.disableVertexAttribArray(aGeomWeight);
    };

    const onVisibilityChange = () => {
        if (document.hidden) stopLoop();
        else startLoop();
    };
    const onScrollStatic = () => {
        if (glReady && (isMotionReduced() || document.hidden)) renderFrame(0);
    };

    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('scroll', onScrollStatic, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);
    document.fonts?.ready?.then?.(measureSections, () => {});
    osReduceQuery.addEventListener?.('change', () => {
        syncMotionUI();
        if (isMotionReduced()) stopLoop();
        else startLoop();
        renderFrame(0);
    });

    glReady = true;
    resize();
    setDomainFocus('docente');
    renderFrame(0);
    startLoop();

    return {
        setDomainFocus,
        destroy() {
            stopLoop();
            window.removeEventListener('resize', resize);
            window.removeEventListener('scroll', onScrollStatic);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        }
    };
}
