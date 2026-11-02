"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { IntroCoin } from "@/components/intro-coin";

const TUNNEL = "/intro/tunel.jpg";
const CREST = "/intro/escudo.webp";
const SEEN_KEY = "caninos-intro-vista";
// Punto de fuga del túnel dentro de la imagen (proporción de su alto): de ahí sale el escudo.
const VANISHING_Y = 0.559;

// Tiempos en milisegundos. La versión corta se usa al volver a la portada en la misma visita.
const FULL = { fadeIn: 500, launch: 300, arrive: 2000, hold: 180, flyThrough: 950 };
// Vueltas del escudo durante el lanzamiento (empiezan despacio, aceleran y frenan).
const TURNS = 2;
const SHORT = { fadeIn: 200, launch: 0, arrive: 0, hold: 150, flyThrough: 800 };

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeInCubic = (t: number) => t ** 3;
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

function preload(src: string) {
    const image = new Image();
    image.src = src;
    return image.decode().catch(() => undefined);
}

// Intro de la portada: el escudo sale del fondo del túnel girando, se detiene en el centro y sigue
// hacia la cámara. Al acercarse, su silueta se convierte en un hueco (máscara) por el que aparece la
// web real que hay debajo, hasta que el hueco supera la pantalla y la intro desaparece.
export function IntroOverlay({ targetPath }: { targetPath: string }) {
    const [visible, setVisible] = useState(true);
    const rootRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<HTMLDivElement>(null);
    const tunnelRef = useRef<HTMLDivElement>(null);
    const crestRef = useRef<HTMLDivElement>(null);
    const haloRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const blackRef = useRef<HTMLDivElement>(null);
    const skipRef = useRef<() => void>(() => undefined);

    useEffect(() => {
        const root = rootRef.current, scene = sceneRef.current, tunnel = tunnelRef.current, crest = crestRef.current, halo = haloRef.current, canvas = canvasRef.current, black = blackRef.current;
        if (!root || !scene || !tunnel || !crest || !halo || !canvas || !black) return;

        let seen = false;
        try { seen = sessionStorage.getItem(SEEN_KEY) === "1"; } catch { /* sin almacenamiento: intro completa */ }
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const times = seen ? SHORT : FULL;
        const flyStart = times.launch + times.arrive + times.hold;
        const total = flyStart + times.flyThrough;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        let frame = 0;
        let start = 0;
        let offset = 0; // permite saltar directamente al vuelo final
        let finished = false;
        // Moneda 3D (three.js). Si no hay WebGL o tarda demasiado, se usa el escudo 2D.
        let coin: IntroCoin | null = null;

        const finish = () => {
            if (finished) return;
            finished = true;
            cancelAnimationFrame(frame);
            coin?.dispose();
            coin = null;
            try { sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* no pasa nada */ }
            document.body.style.overflow = previousOverflow;
            // La portada muestra la competición en curso: se deja su dirección real en la barra.
            if (window.location.pathname === "/") window.history.replaceState(window.history.state, "", targetPath);
            setVisible(false);
        };

        if (reduceMotion) {
            root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, easing: "ease-out", fill: "forwards" }).onfinish = finish;
            black.style.opacity = "0";
            return () => { document.body.style.overflow = previousOverflow; };
        }

        const render = (now: number) => {
            const t = now - start + offset;
            const vw = window.innerWidth, vh = window.innerHeight;
            const settled = Math.min(vw, vh) * 0.62;
            const launchY = vh * VANISHING_Y, centerY = vh / 2, centerX = vw / 2;

            black.style.opacity = String(1 - clamp(t / times.fadeIn));

            let size: number, y: number, spin: number, tilt: number, crestOpacity: number, glow: number, push: number;
            if (t < flyStart) {
                // Lanzamiento: de diminuto en el punto de fuga a su tamaño, girando como una moneda.
                // Tras llegar, un leve impulso hacia delante enlaza sin pausa con el vuelo final.
                const progress = times.arrive ? clamp((t - times.launch) / times.arrive) : 1;
                const p = easeOutCubic(progress);
                const turn = easeInOutSine(progress);
                const hold = times.hold ? clamp((t - times.launch - times.arrive) / times.hold) : 1;
                size = settled * 0.05 * (1 / 0.05) ** p * (1 + 0.04 * easeInOutSine(hold));
                y = launchY + (centerY - launchY) * p;
                spin = (1 - turn) * 360 * TURNS;
                // Inclinación hacia atrás mientras viene, para que se aprecie el volumen.
                tilt = 0.35 * Math.sin(Math.PI * turn);
                crestOpacity = clamp((t - times.launch) / 150);
                glow = 0.25 + 0.75 * p;
                push = 0.06 * easeInOutSine(clamp(t / flyStart));
            } else {
                // Vuelo hacia la cámara: el escudo crece sin límite y se vuelve transparente.
                const q = easeInCubic(clamp((t - flyStart) / times.flyThrough));
                size = settled * 1.04 * 30 ** q;
                y = centerY;
                spin = 0;
                tilt = 0;
                crestOpacity = 1 - clamp((q - 0.06) / 0.3);
                glow = 1 - q;
                push = 0.06 + 0.5 * q;
            }

            if (coin) {
                coin.render({ size, centerX, centerY: y, spin, tilt, opacity: crestOpacity });
            } else {
                crest.style.width = crest.style.height = `${size}px`;
                crest.style.transform = `translate(${centerX - size / 2}px, ${y - size / 2}px) perspective(900px) rotateX(${tilt}rad) rotateY(${spin}deg)`;
                crest.style.opacity = String(crestOpacity);
            }
            // Halo dorado detrás del escudo (un filtro sobre el escudo aplanaría el giro 3D).
            const haloSize = size * 1.5;
            halo.style.width = halo.style.height = `${haloSize}px`;
            halo.style.transform = `translate(${centerX - haloSize / 2}px, ${y - haloSize / 2}px)`;
            halo.style.opacity = String(crestOpacity * glow * 0.85);
            tunnel.style.transform = `scale(${1 + push})`;

            // Hueco con la forma del escudo en la capa del túnel, solo durante el vuelo final
            // (antes, mientras gira, se vería la web por detrás del escudo de canto).
            if (t >= flyStart) {
                const holeSize = size * 0.97;
                const position = `${centerX - holeSize / 2}px ${y - holeSize / 2}px, 0 0`;
                const sizes = `${holeSize}px ${holeSize}px, 100% 100%`;
                Object.assign(scene.style, { maskPosition: position, maskSize: sizes, webkitMaskPosition: position, webkitMaskSize: sizes });
                if (!scene.dataset.masked) {
                    scene.dataset.masked = "1";
                    const images = `url(${CREST}), linear-gradient(#000 0 0)`;
                    Object.assign(scene.style, { maskImage: images, webkitMaskImage: images, maskRepeat: "no-repeat", webkitMaskRepeat: "no-repeat", maskComposite: "exclude", webkitMaskComposite: "xor" } as Partial<CSSStyleDeclaration>);
                }
            }

            if (t >= total) finish();
            else frame = requestAnimationFrame(render);
        };

        skipRef.current = () => {
            if (!start || finished) return;
            const current = performance.now() - start + offset;
            if (current < flyStart) offset += flyStart - current;
        };

        let cancelled = false;
        let started = false;
        const begin = () => {
            if (cancelled || started) return;
            started = true;
            canvas.style.display = coin ? "block" : "none";
            crest.style.display = coin ? "none" : "block";
            start = performance.now();
            frame = requestAnimationFrame(render);
        };
        // La moneda 3D se carga aparte (three.js) mientras se descargan las imágenes; sin WebGL ni se descarga.
        const hasWebGL = (() => {
            try { return Boolean(document.createElement("canvas").getContext("webgl2") ?? document.createElement("canvas").getContext("webgl")); } catch { return false; }
        })();
        const coinReady = (hasWebGL ? import("@/components/intro-coin") : Promise.reject(new Error("WebGL no disponible")))
            .then(({ createIntroCoin }) => createIntroCoin(canvas, CREST))
            .then((created) => {
                if (cancelled || started) created.dispose();
                else coin = created;
            })
            .catch((error: unknown) => console.warn("Intro sin 3D, se usa el escudo 2D.", error));
        // Empieza con todo listo o, como mucho, a los 3 s (si el 3D no llegó, sigue en 2D).
        Promise.race([Promise.all([preload(TUNNEL), preload(CREST), coinReady]), new Promise((resolve) => setTimeout(resolve, 3000))]).then(begin);

        return () => {
            cancelled = true;
            cancelAnimationFrame(frame);
            coin?.dispose();
            coin = null;
            document.body.style.overflow = previousOverflow;
        };
    }, [targetPath]);

    if (!visible) return null;

    return (
        <div
            ref={rootRef}
            className="fixed inset-0 z-[100] overflow-hidden"
            onPointerDown={() => skipRef.current()}
            aria-hidden="true"
        >
            {/* Escena del túnel: es la capa que recibe el hueco con forma de escudo. El escudo va fuera
                de ella para poder desvanecerse en lugar de quedar recortado por su propio hueco. */}
            <div ref={sceneRef} className="absolute inset-0 bg-black">
                <div ref={tunnelRef} className="absolute inset-0 will-change-transform" style={{ transformOrigin: `50% ${VANISHING_Y * 100}%` }}>
                    {/* En pantallas anchas, los laterales se rellenan con el mismo túnel desenfocado. */}
                    <div className="absolute inset-0 scale-110 bg-cover bg-center opacity-60 blur-2xl" style={{ backgroundImage: `url(${TUNNEL})` }} />
                    <div
                        className="absolute inset-y-0 left-1/2 aspect-[9/16] h-full max-w-none -translate-x-1/2 bg-cover bg-center"
                        style={{ backgroundImage: `url(${TUNNEL})`, maskImage: "linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)" }}
                    />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_55%,transparent_35%,rgba(0,0,0,0.55)_100%)]" />
                </div>
                <div ref={blackRef} className="absolute inset-0 bg-black" />
            </div>
            <div
                ref={haloRef}
                className="absolute left-0 top-0 rounded-full bg-[radial-gradient(circle,rgba(242,207,24,0.55)_0%,rgba(242,207,24,0.18)_42%,transparent_70%)] opacity-0 will-change-transform"
            />
            {/* Moneda 3D; se muestra solo si three.js y WebGL están disponibles. */}
            <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 hidden h-full w-full" />
            {/* Respaldo 2D: anverso y reverso, como una moneda; el reverso es el mismo escudo oscurecido. */}
            <div ref={crestRef} className="absolute left-0 top-0 opacity-0 will-change-transform [transform-style:preserve-3d]">
                <div className="absolute inset-0 bg-contain bg-center bg-no-repeat [backface-visibility:hidden]" style={{ backgroundImage: `url(${CREST})` }} />
                <div className="absolute inset-0 bg-contain bg-center bg-no-repeat brightness-[0.4] saturate-50 [backface-visibility:hidden] [transform:rotateY(180deg)]" style={{ backgroundImage: `url(${CREST})` }} />
            </div>
        </div>
    );
}
