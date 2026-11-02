"use client";

import { useEffect, useRef, useState } from "react";
import type { IntroCoin } from "@/components/intro-coin";

const TUNNEL = "/intro/tunel.jpg";
const CREST = "/intro/escudo.webp";
const SEEN_KEY = "caninos-intro-vista";
// Punto de fuga del túnel dentro de la imagen (proporción de su alto): de ahí sale el escudo.
const VANISHING_Y = 0.559;

// Tiempos en milisegundos. La versión corta se usa al volver a la portada en la misma visita.
const FULL = { fadeIn: 500, launch: 300, arrive: 2000, hold: 180, dock: 1400 };
// Vueltas del escudo durante el lanzamiento (empiezan despacio, aceleran y frenan).
const TURNS = 2;
const SHORT = { fadeIn: 200, launch: 0, arrive: 0, hold: 150, dock: 1000 };
// Reparto del aterrizaje (proporción de "dock"): viaje, rebote y relevo por el escudo real.
const TRAVEL_END = 0.78;
const SETTLE_END = 0.92;

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

function preload(src: string) {
    const image = new Image();
    image.src = src;
    return image.decode().catch(() => undefined);
}

// Intro de la portada: el escudo sale del fondo del túnel girando y se detiene en el centro. Después
// el túnel se abre desde el centro (máscara difuminada) dejando ver la web real que hay debajo,
// mientras el escudo vuela hasta el escudo de la cabecera y se posa encima; al llegar, se funde con él.
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
        const total = flyStart + times.dock;
        // Escudo de la cabecera donde aterriza la moneda; se oculta hasta el relevo final.
        const target = document.querySelector<HTMLElement>("[data-intro-crest]");
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
            if (target) target.style.opacity = "";
            // La portada muestra la competición en curso: se deja su dirección real en la barra.
            if (window.location.pathname === "/") window.history.replaceState(window.history.state, "", targetPath);
            setVisible(false);
        };

        if (reduceMotion) {
            root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, easing: "ease-out", fill: "forwards" }).onfinish = finish;
            black.style.opacity = "0";
            return () => { document.body.style.overflow = previousOverflow; };
        }
        if (target) target.style.opacity = "0";

        const render = (now: number) => {
            const t = now - start + offset;
            const vw = window.innerWidth, vh = window.innerHeight;
            const settled = Math.min(vw, vh) * 0.62;
            const launchY = vh * VANISHING_Y, centerY = vh / 2;
            let centerX = vw / 2;

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
                // Aterrizaje: el túnel se abre desde el centro y el escudo viaja, dando una última vuelta,
                // hasta el escudo de la cabecera (medido en cada fotograma por si cambia el diseño).
                const d = clamp((t - flyStart) / times.dock);
                const travel = easeInOutCubic(clamp(d / TRAVEL_END));
                const settle = clamp((d - TRAVEL_END) / (SETTLE_END - TRAVEL_END));
                const handoff = clamp((d - SETTLE_END) / (1 - SETTLE_END));
                const startSize = settled * 1.04;
                const rect = target?.getBoundingClientRect();
                const endSize = rect?.width || 0;
                const endX = rect ? rect.left + rect.width / 2 : centerX;
                const endY = rect ? rect.top + rect.height / 2 : centerY;
                // Encoge de forma geométrica (como si se alejara) y con un leve arco hacia arriba.
                size = endSize ? startSize * (endSize / startSize) ** travel : startSize * (1 - travel);
                size *= 1 + 0.12 * Math.sin(Math.PI * settle);
                centerX += (endX - centerX) * travel;
                y = centerY + (endY - centerY) * travel - Math.sin(Math.PI * travel) * vh * 0.05;
                spin = -360 * travel;
                tilt = 0.25 * Math.sin(Math.PI * travel);
                crestOpacity = 1 - handoff;
                const reveal = easeInOutSine(clamp(d / 0.6));
                glow = 1 - reveal;
                push = 0.06 + 0.12 * reveal;
                // Hueco circular difuminado que crece desde el centro hasta descubrir toda la web.
                const feather = Math.hypot(vw, vh) * 0.25;
                const radius = -feather + reveal * (Math.hypot(vw, vh) / 2 + feather);
                const mask = `radial-gradient(circle at 50% 50%, transparent ${radius}px, #000 ${radius + feather}px)`;
                Object.assign(scene.style, { maskImage: mask, webkitMaskImage: mask });
                if (target) target.style.opacity = String(handoff);
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
            if (target) target.style.opacity = "";
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
            {/* Escena del túnel: es la capa que se abre (máscara) para descubrir la web. El escudo va fuera
                de ella para que el hueco no lo recorte. */}
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
