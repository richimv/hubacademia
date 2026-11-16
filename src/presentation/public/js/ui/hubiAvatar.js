/**
 * HUBI AVATAR RIG — Interactive SVG Mascot & State Machine
 * Zero external animation runtime; drives idle blink, cursor gaze, wing flutter,
 * thinking telemetry, and reply celebrations while respecting reduced-motion preferences.
 */
(function initHubiAvatarModule(globalScope) {
    'use strict';

    const VALID_STATES = new Set(['idle', 'hover', 'invited', 'thinking', 'reply']);
    let instanceCounter = 0;

    function isMotionReduced() {
        if (typeof document !== 'undefined' && document.documentElement?.dataset?.reduceMotion === 'true') {
            return true;
        }
        if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
            return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        }
        return false;
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function buildMarkup(uid, variant) {
        const isHeader = variant === 'header';
        const bodyGrad = `${uid}-body`;
        const bellyGrad = `${uid}-belly`;
        const wingGrad = `${uid}-wing`;
        const auraGrad = `${uid}-aura`;
        const ringGrad = `${uid}-ring`;
        const orbGrad = `${uid}-orb`;

        return `
        <svg class="hubi-rig-svg hubi-rig-svg--${isHeader ? 'header' : 'launcher'}" viewBox="0 0 120 120" fill="none" aria-hidden="true" focusable="false">
            <defs>
                <radialGradient id="${auraGrad}" cx="50%" cy="54%" r="50%">
                    <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.34"/>
                    <stop offset="55%" stop-color="#2563eb" stop-opacity="0.16"/>
                    <stop offset="100%" stop-color="#050507" stop-opacity="0"/>
                </radialGradient>
                <radialGradient id="${bodyGrad}" cx="40%" cy="32%" r="68%">
                    <stop offset="0%" stop-color="#7dd3fc"/>
                    <stop offset="32%" stop-color="#2563eb"/>
                    <stop offset="76%" stop-color="#172554"/>
                    <stop offset="100%" stop-color="#0b132b"/>
                </radialGradient>
                <radialGradient id="${bellyGrad}" cx="50%" cy="84%" r="52%">
                    <stop offset="0%" stop-color="#67e8f9" stop-opacity="0.92"/>
                    <stop offset="48%" stop-color="#38bdf8" stop-opacity="0.38"/>
                    <stop offset="100%" stop-color="#2563eb" stop-opacity="0"/>
                </radialGradient>
                <linearGradient id="${wingGrad}" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#67e8f9" stop-opacity="0.72"/>
                    <stop offset="55%" stop-color="#2563eb" stop-opacity="0.56"/>
                    <stop offset="100%" stop-color="#0f172a" stop-opacity="0.35"/>
                </linearGradient>
                <linearGradient id="${ringGrad}" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.22"/>
                    <stop offset="50%" stop-color="#7dd3fc" stop-opacity="0.95"/>
                    <stop offset="100%" stop-color="#2563eb" stop-opacity="0.45"/>
                </linearGradient>
                <radialGradient id="${orbGrad}" cx="38%" cy="34%" r="65%">
                    <stop offset="0%" stop-color="#ffffff"/>
                    <stop offset="45%" stop-color="#bae6fd"/>
                    <stop offset="100%" stop-color="#38bdf8"/>
                </radialGradient>
            </defs>

            <circle class="hubi-aura" cx="60" cy="64" r="52" fill="url(#${auraGrad})"/>

            <g class="hubi-float">
                <!-- Back orbital arc behind creature -->
                <ellipse class="hubi-orbit-back" cx="60" cy="70" rx="45" ry="13.5" transform="rotate(-14 60 70)" stroke="rgba(56,189,248,0.28)" stroke-width="2" stroke-dasharray="120 165" stroke-dashoffset="10"/>

                <!-- Wings -->
                <g class="hubi-wings-back">
                    <g class="hubi-wing hubi-wing--ll">
                        <path d="M 45 68 C 28 70, 15 82, 23 92 C 31 99, 44 88, 48 74 Z" fill="url(#${wingGrad})" stroke="rgba(125,211,252,0.55)" stroke-width="1.2"/>
                    </g>
                    <g class="hubi-wing hubi-wing--lr">
                        <path d="M 75 68 C 92 70, 105 82, 97 92 C 89 99, 76 88, 72 74 Z" fill="url(#${wingGrad})" stroke="rgba(125,211,252,0.55)" stroke-width="1.2"/>
                    </g>
                </g>

                <g class="hubi-wings-front">
                    <g class="hubi-wing hubi-wing--ul">
                        <path d="M 44 57 C 24 34, 5 35, 9 56 C 13 73, 31 73, 44 63 Z" fill="url(#${wingGrad})" stroke="rgba(186,230,253,0.72)" stroke-width="1.35"/>
                        <path d="M 40 58 C 28 50, 20 49, 15 53" stroke="rgba(224,242,254,0.45)" stroke-width="1" stroke-linecap="round"/>
                        <circle cx="22" cy="52" r="1.2" fill="#e0f2fe" opacity="0.85"/>
                        <circle cx="27" cy="60" r="0.9" fill="#bae6fd" opacity="0.75"/>
                    </g>
                    <g class="hubi-wing hubi-wing--ur">
                        <path d="M 76 57 C 96 34, 115 35, 111 56 C 107 73, 89 73, 76 63 Z" fill="url(#${wingGrad})" stroke="rgba(186,230,253,0.72)" stroke-width="1.35"/>
                        <path d="M 80 58 C 92 50, 100 49, 105 53" stroke="rgba(224,242,254,0.45)" stroke-width="1" stroke-linecap="round"/>
                        <circle cx="98" cy="52" r="1.2" fill="#e0f2fe" opacity="0.85"/>
                        <circle cx="93" cy="60" r="0.9" fill="#bae6fd" opacity="0.75"/>
                    </g>
                </g>

                <!-- Antennae -->
                <g class="hubi-antenna hubi-antenna--left">
                    <path d="M 51 37 Q 43 22, 33 17" stroke="#60a5fa" stroke-width="3.2" stroke-linecap="round"/>
                    <path d="M 51 37 Q 43 22, 33 17" stroke="#bae6fd" stroke-width="1.2" stroke-linecap="round"/>
                    <circle class="hubi-antenna-halo" cx="32" cy="16" r="8" fill="#38bdf8" opacity="0.22"/>
                    <circle class="hubi-antenna-orb" cx="32" cy="16" r="4.8" fill="url(#${orbGrad})" stroke="#67e8f9" stroke-width="1.2"/>
                </g>
                <g class="hubi-antenna hubi-antenna--right">
                    <path d="M 69 37 Q 77 22, 87 17" stroke="#60a5fa" stroke-width="3.2" stroke-linecap="round"/>
                    <path d="M 69 37 Q 77 22, 87 17" stroke="#bae6fd" stroke-width="1.2" stroke-linecap="round"/>
                    <circle class="hubi-antenna-halo" cx="88" cy="16" r="8" fill="#38bdf8" opacity="0.22"/>
                    <circle class="hubi-antenna-orb" cx="88" cy="16" r="4.8" fill="url(#${orbGrad})" stroke="#67e8f9" stroke-width="1.2"/>
                </g>

                <!-- Plump Bioluminescent Body -->
                <g class="hubi-body">
                    <path d="M 60 35 C 79 35, 86 50, 84 68 C 82 84, 71 96, 60 98 C 49 96, 38 84, 36 68 C 34 50, 41 35, 60 35 Z" fill="url(#${bodyGrad})" stroke="rgba(186,230,253,0.75)" stroke-width="1.4"/>
                    <path d="M 60 35 C 79 35, 86 50, 84 68 C 82 84, 71 96, 60 98 C 49 96, 38 84, 36 68 C 34 50, 41 35, 60 35 Z" fill="url(#${bellyGrad})"/>
                    <!-- Glossy forehead highlight -->
                    <ellipse cx="49" cy="45" rx="9.5" ry="4.6" transform="rotate(-24 49 45)" fill="#ffffff" opacity="0.46"/>
                    <ellipse cx="43.5" cy="50.5" rx="2.8" ry="1.5" transform="rotate(-24 43.5 50.5)" fill="#ffffff" opacity="0.32"/>

                    <!-- Face -->
                    <g class="hubi-face">
                        <ellipse class="hubi-cheek" cx="42.5" cy="67.5" rx="5.2" ry="2.8" fill="#7dd3fc" opacity="0.32"/>
                        <ellipse class="hubi-cheek" cx="77.5" cy="67.5" rx="5.2" ry="2.8" fill="#7dd3fc" opacity="0.32"/>

                        <!-- Open glossy eyes (idle / thinking) -->
                        <g class="hubi-eyes-open">
                            <g class="hubi-gaze">
                                <ellipse cx="48.5" cy="58.5" rx="5.5" ry="6.1" fill="#061024" stroke="#7dd3fc" stroke-width="1.15"/>
                                <circle cx="46.7" cy="56" r="2.2" fill="#ffffff"/>
                                <circle cx="50.5" cy="60.8" r="1.05" fill="#bae6fd"/>

                                <ellipse cx="71.5" cy="58.5" rx="5.5" ry="6.1" fill="#061024" stroke="#7dd3fc" stroke-width="1.15"/>
                                <circle cx="69.7" cy="56" r="2.2" fill="#ffffff"/>
                                <circle cx="73.5" cy="60.8" r="1.05" fill="#bae6fd"/>
                            </g>
                        </g>

                        <!-- Happy crescent eyes (hover / reply) -->
                        <g class="hubi-eyes-happy">
                            <path d="M 42.8 59.5 Q 48.5 52, 54.2 59.5" stroke="#f8fafc" stroke-width="3" stroke-linecap="round"/>
                            <path d="M 65.8 59.5 Q 71.5 52, 77.2 59.5" stroke="#f8fafc" stroke-width="3" stroke-linecap="round"/>
                        </g>

                        <!-- Mouth -->
                        <path class="hubi-mouth-smile" d="M 55.5 66.2 Q 60 70.6, 64.5 66.2" stroke="#f8fafc" stroke-width="2.3" stroke-linecap="round"/>
                        <ellipse class="hubi-mouth-think" cx="60" cy="67.8" rx="2.1" ry="2.4" fill="#e0f2fe"/>
                    </g>
                </g>

                <!-- Front orbital arc + orbiting comet -->
                <g class="hubi-orbit-front">
                    <path d="M 16.5 75.5 A 45 13.5 -14 0 0 103.5 64.5" stroke="url(#${ringGrad})" stroke-width="2.3" stroke-linecap="round"/>
                    <g class="hubi-satellite-wrap">
                        <circle class="hubi-satellite-glow" cx="95" cy="67" r="6.5" fill="#38bdf8" opacity="0.34"/>
                        <circle class="hubi-satellite" cx="95" cy="67" r="3.4" fill="url(#${orbGrad})" stroke="#e0f2fe" stroke-width="1"/>
                    </g>
                </g>
            </g>

            <!-- Sparkle motes -->
            <circle class="hubi-sparkle hubi-sparkle--1" cx="19" cy="30" r="1.7" fill="#7dd3fc"/>
            <circle class="hubi-sparkle hubi-sparkle--2" cx="101" cy="34" r="1.4" fill="#bae6fd"/>
            <circle class="hubi-sparkle hubi-sparkle--3" cx="24" cy="96" r="1.5" fill="#38bdf8"/>
        </svg>`;
    }

    function mountHubiAvatar(host, options = {}) {
        if (!host) return null;
        instanceCounter += 1;
        const uid = `hubi-${instanceCounter}`;
        const variant = options.variant === 'header' ? 'header' : 'launcher';
        const enableGaze = options.enableGaze !== false && variant === 'launcher';

        const wrapper = document.createElement('span');
        wrapper.className = `hubi-rig hubi-rig--${variant}`;
        wrapper.dataset.hubiState = 'idle';
        wrapper.innerHTML = buildMarkup(uid, variant);

        host.replaceChildren(wrapper);

        const eyesOpen = wrapper.querySelector('.hubi-eyes-open');
        const gazeGroup = wrapper.querySelector('.hubi-gaze');
        let currentState = 'idle';
        let blinkTimer = null;
        let replyTimer = null;
        let destroyed = false;

        function setState(nextState) {
            if (destroyed) return;
            const safeState = VALID_STATES.has(nextState) ? nextState : 'idle';
            currentState = safeState;
            wrapper.dataset.hubiState = safeState;
        }

        function flashReply(durationMs = 1500) {
            if (destroyed) return;
            clearTimeout(replyTimer);
            setState('reply');
            replyTimer = setTimeout(() => {
                if (!destroyed && currentState === 'reply') {
                    setState('idle');
                }
            }, durationMs);
        }

        function scheduleBlink() {
            clearTimeout(blinkTimer);
            if (destroyed || isMotionReduced() || (typeof document !== 'undefined' && document.hidden)) {
                return;
            }
            const delay = 3200 + Math.random() * 2400;
            blinkTimer = setTimeout(() => {
                if (!destroyed && !isMotionReduced() && !document.hidden && eyesOpen) {
                    if (currentState === 'idle' || currentState === 'thinking') {
                        if (typeof eyesOpen.animate === 'function') {
                            eyesOpen.animate(
                                [
                                    { transform: 'scaleY(1)' },
                                    { transform: 'scaleY(0.08)' },
                                    { transform: 'scaleY(1)' }
                                ],
                                { duration: 170, easing: 'ease-in-out' }
                            );
                        } else {
                            eyesOpen.classList.add('is-blinking');
                            setTimeout(() => eyesOpen.classList.remove('is-blinking'), 160);
                        }
                    }
                }
                scheduleBlink();
            }, delay);
        }

        const onPointerMove = (event) => {
            if (!enableGaze || destroyed || isMotionReduced() || !gazeGroup || currentState !== 'idle') return;
            const rect = wrapper.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            const cx = rect.left + rect.width * 0.5;
            const cy = rect.top + rect.height * 0.5;
            const dx = clamp((event.clientX - cx) / 260, -1, 1) * 2.1;
            const dy = clamp((event.clientY - cy) / 260, -1, 1) * 1.6;
            gazeGroup.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`;
        };

        const onMotionOrVisibilityChange = () => {
            if (isMotionReduced() || document.hidden) {
                clearTimeout(blinkTimer);
                if (gazeGroup) gazeGroup.style.transform = '';
            } else {
                scheduleBlink();
            }
        };

        if (typeof window !== 'undefined') {
            if (enableGaze) {
                window.addEventListener('pointermove', onPointerMove, { passive: true });
            }
            window.addEventListener('hub:motion-preference-changed', onMotionOrVisibilityChange);
            document.addEventListener('visibilitychange', onMotionOrVisibilityChange);
        }

        scheduleBlink();

        return {
            element: wrapper,
            getState: () => currentState,
            setState,
            flashReply,
            destroy() {
                destroyed = true;
                clearTimeout(blinkTimer);
                clearTimeout(replyTimer);
                if (typeof window !== 'undefined') {
                    if (enableGaze) {
                        window.removeEventListener('pointermove', onPointerMove);
                    }
                    window.removeEventListener('hub:motion-preference-changed', onMotionOrVisibilityChange);
                    document.removeEventListener('visibilitychange', onMotionOrVisibilityChange);
                }
            }
        };
    }

    const api = { mountHubiAvatar, VALID_STATES, buildMarkup };
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    if (globalScope) {
        globalScope.HubiAvatar = api;
    }
})(typeof window !== 'undefined' ? window : globalThis);
