"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { RotateCcw, Star } from "lucide-react";
import { FramedPhoto } from "@/components/team/framed-media";
import { KATSU_PHOTO_FRAME } from "@/lib/media-framing";
import type { KatsuCard } from "@/lib/team-types";

// Fases de la apertura del sobre; cada una añade una clase al escenario.
type Step = "opened" | "lit" | "rising" | "dropped" | "centered" | "suspense" | "revealed" | "burst";
type Particle = { x: number; y: number; vx: number; vy: number; life: number; decay: number; size: number; rot: number; vr: number; color: string; confetti: boolean };

const TIMELINE: Array<[number, Step]> = [[0, "opened"], [250, "lit"], [450, "rising"], [1500, "dropped"], [1650, "centered"], [2300, "suspense"]];
const REVEAL_AT = 3200;

function vibrate(pattern: number | number[]) {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
}

function initials(name: string): string {
    return name.split(" ").map((part) => part[0]).join("").slice(0, 3);
}

// Chispas al rasgar y confeti de rombos amarillos y negros al revelar la carta.
function useParticles(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
    const particles = useRef<Particle[]>([]);
    const frame = useRef(0);

    const loopRef = useRef<() => void>(() => undefined);

    useEffect(() => {
        const loop = () => {
            const canvas = canvasRef.current;
            const context = canvas?.getContext("2d");
            if (!canvas || !context) return;
            const ratio = window.devicePixelRatio || 1;
            context.setTransform(ratio, 0, 0, ratio, 0, 0);
            context.clearRect(0, 0, canvas.width, canvas.height);
            particles.current = particles.current.filter((particle) => particle.life > 0);
            for (const particle of particles.current) {
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.vy += particle.confetti ? 0.12 : 0.08;
                particle.vx *= 0.985;
                particle.life -= particle.decay;
                particle.rot += particle.vr;
                context.globalAlpha = Math.max(0, particle.life);
                context.save();
                context.translate(particle.x, particle.y);
                context.rotate(particle.rot);
                context.fillStyle = particle.color;
                if (particle.confetti) {
                    context.beginPath();
                    context.moveTo(0, -particle.size);
                    context.lineTo(particle.size * 0.6, 0);
                    context.lineTo(0, particle.size);
                    context.lineTo(-particle.size * 0.6, 0);
                    context.closePath();
                    context.fill();
                    if (particle.color === "#111111") {
                        context.strokeStyle = "#f2cf18";
                        context.lineWidth = 1;
                        context.stroke();
                    }
                } else {
                    context.shadowColor = "#f2cf18";
                    context.shadowBlur = 8;
                    context.beginPath();
                    context.arc(0, 0, particle.size, 0, Math.PI * 2);
                    context.fill();
                }
                context.restore();
            }
            context.globalAlpha = 1;
            frame.current = particles.current.length ? requestAnimationFrame(loop) : 0;
        };
        loopRef.current = loop;
        return () => cancelAnimationFrame(frame.current);
    }, [canvasRef]);

    const emit = useCallback((x: number, y: number, count: number, power: number, confetti: boolean) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ratio = window.devicePixelRatio || 1;
        const bounds = canvas.getBoundingClientRect();
        if (canvas.width !== Math.round(bounds.width * ratio)) {
            canvas.width = Math.round(bounds.width * ratio);
            canvas.height = Math.round(bounds.height * ratio);
        }
        for (let index = 0; index < count; index++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = power * (0.4 + Math.random());
            particles.current.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - (confetti ? power * 0.4 : 1),
                life: 1,
                decay: confetti ? 0.006 + Math.random() * 0.006 : 0.03 + Math.random() * 0.03,
                size: confetti ? 5 + Math.random() * 7 : 1.5 + Math.random() * 2.5,
                rot: Math.random() * 6,
                vr: (Math.random() - 0.5) * 0.3,
                color: confetti ? (Math.random() < 0.35 ? "#111111" : Math.random() < 0.5 ? "#f2cf18" : "#fff2a0") : (Math.random() < 0.5 ? "#ffffff" : "#f2cf18"),
                confetti,
            });
        }
        if (!frame.current) frame.current = requestAnimationFrame(() => loopRef.current());
    }, [canvasRef]);

    const clear = useCallback(() => {
        particles.current = [];
    }, []);

    return { emit, clear };
}

// Carta KATSU: un sobre que se abre rasgando la tira de arriba (o con un toque). La carta sale
// boca abajo, tiembla y se da la vuelta con un destello y confeti.
export function KatsuPlayerCard({ card }: { card: KatsuCard }) {
    const stageRef = useRef<HTMLDivElement>(null);
    const stripRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const timers = useRef<number[]>([]);
    const tear = useRef(0);
    const tearing = useRef(false);
    const [steps, setSteps] = useState<Step[]>([]);
    const [counts, setCounts] = useState({ goals: 0, assists: 0, penalties: 0 });
    const { emit, clear } = useParticles(canvasRef);
    const opened = steps.includes("opened");
    const revealed = steps.includes("revealed");

    useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

    // Coordenadas de un punto del escenario dentro del lienzo de partículas (que lo desborda por los lados).
    const toCanvas = useCallback((x: number, y: number) => {
        const stage = stageRef.current?.getBoundingClientRect();
        const canvas = canvasRef.current?.getBoundingClientRect();
        if (!stage || !canvas) return { x, y };
        return { x: x + stage.left - canvas.left, y: y + stage.top - canvas.top };
    }, []);

    const countUp = useCallback(() => {
        const line = card.line;
        if (!line) return;
        const started = performance.now();
        const step = (now: number) => {
            const progress = Math.min(1, (now - started) / 700);
            setCounts({ goals: Math.round(line.goals * progress), assists: Math.round(line.assists * progress), penalties: Math.round(line.penalties * progress) });
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [card.line]);

    const open = useCallback(() => {
        if (tear.current >= 2) return;
        tear.current = 2;
        tearing.current = false;
        vibrate(20);
        const later = (ms: number, action: () => void) => timers.current.push(window.setTimeout(action, ms));
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            setSteps(["opened", "lit", "rising", "dropped", "centered", "revealed"]);
            if (card.line) setCounts(card.line);
            return;
        }
        TIMELINE.forEach(([ms, step]) => later(ms, () => setSteps((previous) => [...previous, step])));
        later(2300, () => vibrate(10));
        later(2700, () => vibrate(10));
        later(REVEAL_AT, () => {
            setSteps((previous) => [...previous.filter((step) => step !== "suspense"), "revealed", "burst"]);
            vibrate([30, 40, 60]);
            const stage = stageRef.current?.getBoundingClientRect();
            if (stage) {
                const center = toCanvas(stage.width / 2, stage.height / 2);
                emit(center.x, center.y, 90, 7, true);
                emit(center.x, center.y, 40, 5, false);
            }
            later(900, countUp);
            later(950, () => setSteps((previous) => previous.filter((step) => step !== "burst")));
        });
    }, [card.line, countUp, emit, toCanvas]);

    const setTear = useCallback((value: number) => {
        const strip = stripRef.current;
        const stage = stageRef.current;
        if (!strip || !stage || tear.current >= 2) return;
        const previous = tear.current;
        tear.current = Math.max(previous, Math.min(1, value));
        strip.style.setProperty("--tear", String(tear.current));
        if (tear.current > previous) {
            const stripBox = strip.getBoundingClientRect();
            const stageBox = stage.getBoundingClientRect();
            const point = toCanvas(stripBox.left - stageBox.left + 6 + (stripBox.width - 12) * tear.current, stripBox.bottom - stageBox.top - 2);
            emit(point.x, point.y, 3 + Math.round((tear.current - previous) * 60), 2.4, false);
        }
        if (tear.current >= 0.92) open();
    }, [emit, open, toCanvas]);

    const autoTear = useCallback(() => {
        if (tear.current >= 2) return;
        const started = performance.now();
        const step = (now: number) => {
            setTear((now - started) / 450);
            if (tear.current < 2) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [setTear]);

    const onStripDown = (event: PointerEvent<HTMLDivElement>) => {
        if (tear.current >= 2) return;
        event.stopPropagation();
        tearing.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
    };
    const onStripMove = (event: PointerEvent<HTMLDivElement>) => {
        if (!tearing.current) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        const value = (event.clientX - bounds.left - 6) / (bounds.width - 12);
        if (value > tear.current - 0.08) setTear(value);
    };
    const onStripUp = () => {
        const wasTearing = tearing.current;
        tearing.current = false;
        if (wasTearing && tear.current < 0.05) autoTear();
    };

    const reset = () => {
        timers.current.forEach((timer) => window.clearTimeout(timer));
        timers.current = [];
        tear.current = 0;
        stripRef.current?.style.setProperty("--tear", "0");
        clear();
        setCounts({ goals: 0, assists: 0, penalties: 0 });
        setSteps([]);
    };

    const onPackKey = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        autoTear();
    };

    const matchLine = `${card.home} ${card.score ?? "vs"} ${card.away}`;

    return (
        <div ref={stageRef} className={`kpack-stage ${steps.map((step) => `is-${step}`).join(" ")}`}>
            <span className="kpack-beams" aria-hidden="true" />
            <span className="kpack-ring" aria-hidden="true" />

            <div className="kpack-card" aria-hidden={!revealed}>
                <div className="kpack-card-in">
                    <div className="kpack-face kpack-face-back">
                        <div className="kpack-face-back-in">
                            <Image src="/fotos/escudo-256.png" alt="" width={96} height={96} draggable={false} />
                        </div>
                    </div>
                    <div className="kpack-face kpack-face-front">
                        <div className="kpack-front-in">
                            <div className="kpack-photo">
                                {card.player.photo
                                    ? <FramedPhoto src={card.player.photo} alt={`Foto de ${card.player.name}`} frame={KATSU_PHOTO_FRAME} sizes="340px" />
                                    : <span className="kpack-initials">{initials(card.player.name)}</span>}
                            </div>
                            <div className="kpack-front-top">
                                <b>{card.player.number ?? "—"}</b>
                                <Image src="/fotos/escudo-256.png" alt="" width={48} height={48} draggable={false} />
                            </div>
                            <span className="kpack-front-star"><Star size={11} fill="currentColor" /> Jugador KATSU · J{card.jornada}</span>
                            <div className="kpack-front-plate">
                                <p className="kpack-front-name">{card.player.name}</p>
                                <p className="kpack-front-match">{matchLine}</p>
                                {card.line ? (
                                    <div className="kpack-front-line">
                                        <span><b>{counts.goals}</b>GOL</span>
                                        <span><b>{counts.assists}</b>ASI</span>
                                        <span><b>{counts.penalties}</b>PEN</span>
                                    </div>
                                ) : <p className="kpack-front-position">{card.player.position}</p>}
                            </div>
                            <span className="collect-holo kpack-holo" aria-hidden="true" />
                        </div>
                    </div>
                </div>
            </div>

            <div
                role="button"
                tabIndex={opened ? -1 : 0}
                aria-hidden={opened}
                aria-label={`Sobre KATSU de la jornada ${card.jornada}, ${matchLine}. Rasga la tira de arriba o pulsa para abrirlo.`}
                className="kpack"
                onClick={autoTear}
                onKeyDown={onPackKey}
            >
                <div
                    ref={stripRef}
                    className="kpack-strip"
                    onClick={(event) => event.stopPropagation()}
                    onPointerDown={onStripDown}
                    onPointerMove={onStripMove}
                    onPointerUp={onStripUp}
                    onPointerCancel={onStripUp}
                >
                    <span className="kpack-teeth" />
                    <span className="kpack-strip-label">Desliza para rasgar</span>
                    <span className="kpack-tear-line" />
                    <span className="kpack-torn" />
                    <span className="kpack-grab">›</span>
                </div>
                <div className="kpack-body">
                    <span className="kpack-season">Temporada {card.season.replace("-", "/")}</span>
                    <span className="kpack-mid">
                        <Image src="/fotos/escudo-256.png" alt="" width={64} height={64} draggable={false} />
                        <span className="kpack-title">KATSU</span>
                        <span className="kpack-round">Jornada {String(card.jornada).padStart(2, "0")}</span>
                    </span>
                    <span className="kpack-match"><span>{card.home}</span><span>vs {card.away}</span><b>{card.score ?? "Resultado pendiente"}</b></span>
                </div>
                <span className="kpack-glow" aria-hidden="true" />
            </div>

            <canvas ref={canvasRef} className="kpack-fx" aria-hidden="true" />
            <span className="kpack-flash" aria-hidden="true" />
            {revealed ? (
                <button type="button" onClick={reset} aria-label="Volver a cerrar el sobre" className="kpack-reset">
                    <RotateCcw size={15} />
                </button>
            ) : null}
            <p className="sr-only" aria-live="polite">{revealed ? `${card.player.name} es el Jugador KATSU de la jornada ${card.jornada}.` : ""}</p>
        </div>
    );
}
