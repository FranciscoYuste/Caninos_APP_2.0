"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Minus, X } from "lucide-react";
import { FramedPhoto, FramedVideo } from "@/components/team/framed-media";
import { useModalDialog } from "@/components/team/use-modal-dialog";
import { categoryTotals, fantasyJornadas, formatPoints, latestHighlight, rankHistory, rankingAt, type FantasyMatchScore, type FantasyPlayerRow } from "@/lib/fantasy";
import { AVATAR_PHOTO_FRAME, FANTASY_PHOTO_FRAME, FANTASY_VIDEO_FRAME } from "@/lib/media-framing";

const MEDALS = [
    { label: "Oro", color: "var(--lime)" },
    { label: "Plata", color: "#c9d1d6" },
    { label: "Bronce", color: "#cd8a4f" },
];

function pointsColor(points: number): string {
    return points > 0 ? "text-[var(--lime)]" : points < 0 ? "text-rose-400" : "text-[var(--muted)]";
}

function prefersReducedMotion(): boolean {
    return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Cuenta de 0 al total la primera vez que el elemento entra en pantalla.
function CountUp({ value, className, signed = false }: { value: number; className?: string; signed?: boolean }) {
    const ref = useRef<HTMLSpanElement>(null);
    const [shown, setShown] = useState<number | null>(null);

    useEffect(() => {
        const element = ref.current;
        if (!element || prefersReducedMotion() || typeof IntersectionObserver === "undefined") return;
        let frame = 0;
        const observer = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting) return;
            observer.disconnect();
            // El inicio es el primer fotograma: su marca de tiempo puede ser anterior a performance.now().
            let start: number | null = null;
            const tick = (now: number) => {
                start ??= now;
                const progress = Math.min(1, Math.max(0, (now - start) / 1100));
                const eased = 1 - (1 - progress) ** 3;
                setShown(progress < 1 ? Math.round(value * eased) : null);
                if (progress < 1) frame = requestAnimationFrame(tick);
            };
            setShown(0);
            frame = requestAnimationFrame(tick);
        }, { threshold: 0.4 });
        observer.observe(element);
        return () => {
            observer.disconnect();
            cancelAnimationFrame(frame);
        };
    }, [value]);

    const current = shown ?? value;
    return <span ref={ref} className={className}>{signed ? formatPoints(current) : current}</span>;
}

// Foto (o vídeo) del jugador encuadrada; sin foto, el escudo.
function PlayerMedia({ player, kind, video = false }: { player: FantasyPlayerRow; kind: "card" | "avatar"; video?: boolean }) {
    if (video && player.video) return <FramedVideo src={player.video} label={`vídeo de ${player.name}`} frame={FANTASY_VIDEO_FRAME} />;
    if (player.photo) {
        return <FramedPhoto src={player.photo} alt={player.name} frame={kind === "card" ? FANTASY_PHOTO_FRAME : AVATAR_PHOTO_FRAME} sizes={kind === "card" ? "(max-width: 640px) 40vw, 220px" : "64px"} />;
    }
    return (
        <span className="absolute inset-0 grid place-items-center opacity-40">
            <Image src="/fotos/escudo-256.png" alt="" width={96} height={96} className="w-1/2 max-w-24 object-contain" draggable={false} />
        </span>
    );
}

function Avatar({ player, size }: { player: FantasyPlayerRow; size: string }) {
    return (
        <span className={`relative block shrink-0 overflow-hidden rounded-full border border-[var(--line)] bg-gradient-to-b from-[#2a2e2a] to-[var(--ink)] ${size}`}>
            <PlayerMedia player={player} kind="avatar" />
        </span>
    );
}

function Movement({ value, compact = false }: { value: number | null; compact?: boolean }) {
    if (value === null) return null;
    if (value === 0) {
        return <span className="inline-flex items-center text-[var(--muted)]" title="Mismo puesto que antes del último partido"><Minus size={12} /><span className="sr-only">Mismo puesto</span></span>;
    }
    const up = value > 0;
    const text = `${up ? "Sube" : "Baja"} ${Math.abs(value)} ${Math.abs(value) === 1 ? "puesto" : "puestos"} con el último partido`;
    return (
        <span className={`inline-flex items-center gap-0.5 font-mono text-[11px] font-black ${up ? "text-emerald-400" : "text-rose-400"}`} title={text}>
            {up ? <ArrowUp size={12} strokeWidth={3} /> : <ArrowDown size={12} strokeWidth={3} />}
            {compact ? null : Math.abs(value)}
            <span className="sr-only">{text}</span>
        </span>
    );
}

// Barritas de los últimos partidos: hacia arriba si sumó, hacia abajo si restó.
function MatchBars({ matches, scale }: { matches: FantasyMatchScore[]; scale: number }) {
    const recent = matches.slice(-10);
    const height = 22;
    const half = height / 2;
    return (
        <svg width={recent.length * 7} height={height} viewBox={`0 0 ${recent.length * 7} ${height}`} className="block shrink-0" role="img" aria-label={`Puntos por partido: ${recent.map((match) => `J${match.jornada} ${formatPoints(match.total)}`).join(", ")}`}>
            <line x1={0} x2={recent.length * 7} y1={half} y2={half} stroke="var(--line)" strokeWidth={1} />
            {recent.map((match, index) => {
                const size = match.total === 0 ? 1 : Math.max(2, (Math.abs(match.total) / scale) * (half - 1));
                return (
                    <rect key={match.id} x={index * 7 + 1} width={5} rx={1.5} y={match.total >= 0 ? half - size : half} height={size} fill={match.total > 0 ? "var(--lime)" : match.total < 0 ? "#fb7185" : "var(--muted)"}>
                        <title>{`J${match.jornada} · ${match.opponent}: ${formatPoints(match.total)}`}</title>
                    </rect>
                );
            })}
        </svg>
    );
}

function Podium({ players, onOpen }: { players: FantasyPlayerRow[]; onOpen: (player: FantasyPlayerRow) => void }) {
    // Orden visual: 2º, 1º, 3º.
    const slots = players.length >= 2 ? [players[1], players[0], players[2]].filter(Boolean) : players;
    return (
        <div className={`mx-auto grid max-w-xl items-end gap-2 sm:gap-4 ${slots.length === 3 ? "grid-cols-3" : slots.length === 2 ? "max-w-sm grid-cols-2" : "max-w-[12rem] grid-cols-1"}`}>
            {slots.map((player) => {
                const place = players.indexOf(player);
                // La medalla sigue el puesto (empatados, la misma); el escalón, el orden.
                const medal = MEDALS[Math.min(player.rank, 3) - 1];
                const leader = place === 0;
                return (
                    <button
                        key={player.id}
                        type="button"
                        onClick={() => onOpen(player)}
                        className={`fantasy-podium group flex min-w-0 flex-col text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lime)] ${leader ? "is-leader" : ""}`}
                        style={{ "--medal": medal.color } as CSSProperties}
                        aria-label={`${player.rank}º ${player.name}, ${player.total} puntos. Ver detalle`}
                    >
                        <span className={`fantasy-podium-card relative block w-full overflow-hidden rounded-xl ${leader ? "aspect-[3/4.3]" : "aspect-[3/4]"}`}>
                            <PlayerMedia player={player} kind="card" video />
                            <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/70 to-transparent" />
                            <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-black uppercase" style={{ color: "var(--medal)" }}>
                                {medal.label}
                                <Movement value={player.movement} compact />
                            </span>
                            <span className="absolute inset-x-0 bottom-0 p-2 sm:p-3">
                                <span className="block truncate font-[family-name:var(--font-card)] text-sm font-bold uppercase leading-none text-white sm:text-lg">{player.name}</span>
                                <span className="mt-1 flex items-baseline gap-1">
                                    <CountUp value={player.total} className={`font-[family-name:var(--font-card)] font-bold leading-none ${leader ? "text-3xl sm:text-5xl" : "text-2xl sm:text-4xl"} ${player.total < 0 ? "text-rose-400" : "text-white"}`} />
                                    <span className="text-[9px] font-bold uppercase text-white/60">pts</span>
                                </span>
                            </span>
                        </span>
                        <span className={`fantasy-podium-step mt-2 grid w-full place-items-center rounded-t-md font-[family-name:var(--font-card)] font-bold text-[var(--ink)] ${leader ? "h-12 text-3xl" : place === 1 ? "h-9 text-2xl" : "h-7 text-xl"}`}>
                            {player.rank}º
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

function Highlight({ ranking, onOpen }: { ranking: FantasyPlayerRow[]; onOpen: (player: FantasyPlayerRow) => void }) {
    const best = latestHighlight(ranking);
    if (!best || best.match.total <= 0) return null;
    const { player, match } = best;
    // Lo que hizo, sin lo que tiene todo el que va (ir al partido, goles encajados).
    const actions = match.lines
        .filter((line) => line.points > 0 && line.category !== "asistencia" && line.category !== "defensa")
        .map((line) => line.label);
    return (
        <button type="button" onClick={() => onOpen(player)} className="fantasy-highlight mx-auto mt-8 flex w-full max-w-3xl items-center gap-4 border border-[var(--lime)]/50 bg-[var(--panel)] p-3 text-left sm:p-4">
            <Avatar player={player} size="size-16 sm:size-20" />
            <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--lime)]">Lo mejor de la J{match.jornada}</span>
                <span className="mt-0.5 block truncate text-lg font-black uppercase">{player.name}</span>
                <span className="block truncate text-xs text-[var(--muted)]">{actions.length ? actions.join(" · ") : `vs ${match.opponent}`}</span>
            </span>
            <CountUp value={match.total} signed className="shrink-0 font-[family-name:var(--font-card)] text-5xl font-bold leading-none text-[var(--lime)]" />
        </button>
    );
}

// Puntos acumulados partido a partido. Tocar un punto muestra su puesto y sus puntos en esa jornada.
function EvolutionChart({ matches, ranks }: { matches: FantasyMatchScore[]; ranks: Map<number, number> }) {
    const [selected, setSelected] = useState(matches.length - 1);
    if (matches.length < 2) return null;
    const cumulative = matches.reduce<number[]>((list, match) => [...list, (list.at(-1) ?? 0) + match.total], []);
    const width = 320;
    const height = 140;
    const pad = { top: 22, right: 14, bottom: 22, left: 14 };
    const min = Math.min(0, ...cumulative);
    const max = Math.max(0, ...cumulative);
    const span = max - min || 1;
    const x = (index: number) => pad.left + (index / (matches.length - 1)) * (width - pad.left - pad.right);
    const y = (value: number) => pad.top + (1 - (value - min) / span) * (height - pad.top - pad.bottom);
    const path = cumulative.map((value, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(" ");
    const area = `${path} L${x(matches.length - 1).toFixed(1)},${y(min).toFixed(1)} L${x(0).toFixed(1)},${y(min).toFixed(1)} Z`;
    const labelEvery = Math.ceil(matches.length / 8);
    const current = cumulative[selected];

    return (
        <figure>
            <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" role="img" aria-label={`Evolución de puntos: ${matches.map((match, index) => `J${match.jornada} ${cumulative[index]}`).join(", ")}`}>
                <defs>
                    <linearGradient id="fantasy-area" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="var(--lime)" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="var(--lime)" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <line x1={pad.left} x2={width - pad.right} y1={y(0)} y2={y(0)} stroke="var(--line)" strokeDasharray="3 3" />
                <path d={area} fill="url(#fantasy-area)" />
                <path d={path} fill="none" stroke="var(--lime)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                <line x1={x(selected)} x2={x(selected)} y1={pad.top - 6} y2={height - pad.bottom} stroke="var(--muted)" strokeOpacity={0.5} />
                {cumulative.map((value, index) => (
                    <g key={matches[index].id}>
                        <circle cx={x(index)} cy={y(value)} r={index === selected ? 5 : 4} fill={index === selected ? "var(--lime)" : "var(--ink)"} stroke="var(--lime)" strokeWidth={2} />
                        {index % labelEvery === 0 || index === matches.length - 1 ? (
                            <text x={x(index)} y={height - 6} textAnchor="middle" fontSize={9} fill="var(--muted)">J{matches[index].jornada}</text>
                        ) : null}
                        <rect x={x(index) - 14} y={0} width={28} height={height} fill="transparent" className="cursor-pointer" onMouseEnter={() => setSelected(index)} onClick={() => setSelected(index)}>
                            <title>{`J${matches[index].jornada}: ${ranks.get(matches[index].jornada) ?? "—"}º, ${value} puntos (${formatPoints(matches[index].total)})`}</title>
                        </rect>
                    </g>
                ))}
                <text x={Math.min(Math.max(x(selected), 70), width - 70)} y={12} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--paper)">
                    J{matches[selected].jornada}{ranks.has(matches[selected].jornada) ? ` · ${ranks.get(matches[selected].jornada)}º` : ""} · {current} pts ({formatPoints(matches[selected].total)})
                </text>
            </svg>
        </figure>
    );
}

function CategoryBars({ matches }: { matches: FantasyMatchScore[] }) {
    const totals = categoryTotals(matches).filter((item) => item.points !== 0 || item.id === "asistencia");
    const scale = Math.max(1, ...totals.map((item) => Math.abs(item.points)));
    return (
        <ul className="space-y-2">
            {totals.map((item) => (
                <li key={item.id} className="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-x-3 gap-y-1 text-xs">
                    <span className="truncate text-white/80">{item.label}</span>
                    <CountUp value={item.points} signed className={`row-span-2 text-right font-mono text-sm font-black ${pointsColor(item.points)}`} />
                    <span className="relative block h-2 bg-[var(--line)]/40">
                        <span className="absolute inset-y-0 left-1/2 w-px bg-[var(--line)]" />
                        <span
                            className={`absolute inset-y-0 ${item.points >= 0 ? "left-1/2 rounded-r bg-[var(--lime)]" : "right-1/2 rounded-l bg-rose-400"}`}
                            style={{ width: `${(Math.abs(item.points) / scale) * 50}%` }}
                        />
                    </span>
                </li>
            ))}
        </ul>
    );
}

function StatTile({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="border border-[var(--line)] bg-[var(--ink)]/50 p-2 text-center">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">{label}</p>
            <p className="mt-1 font-[family-name:var(--font-card)] text-xl font-bold leading-none">{children}</p>
        </div>
    );
}

function PlayerSheet({ player, ranks, onClose }: { player: FantasyPlayerRow; ranks: Map<number, number>; onClose: () => void }) {
    const dialogRef = useModalDialog<HTMLElement>(onClose);
    const playedMatches = player.matches.filter((match) => match.played);
    const average = playedMatches.length ? playedMatches.reduce((sum, match) => sum + match.total, 0) / playedMatches.length : 0;
    const best = player.matches.reduce<FantasyMatchScore | null>((top, match) => (!top || match.total > top.total ? match : top), null);

    return (
        <div
            className="fantasy-sheet-backdrop fixed inset-0 z-50 flex justify-center bg-black/80 sm:items-center sm:p-6"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="fantasy-player-title" className="fantasy-sheet relative h-[100dvh] w-full max-w-lg overflow-y-auto overscroll-contain bg-[var(--panel)] sm:h-auto sm:max-h-[90vh] sm:border sm:border-[var(--lime)]/60">
                <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute right-3 top-3 z-10 grid size-11 place-items-center border border-[var(--line)] bg-black/70 text-white hover:border-[var(--lime)]">
                    <X size={18} />
                </button>
                <div className="flex items-end gap-4 bg-gradient-to-b from-[var(--lime)]/15 to-transparent p-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
                    <span className="relative block aspect-[3/4] w-32 shrink-0 overflow-hidden rounded-lg border border-[var(--lime)]/50 bg-gradient-to-b from-[#2a2e2a] to-[var(--ink)] sm:w-36">
                        <PlayerMedia player={player} kind="card" video />
                    </span>
                    <div className="min-w-0 pb-1">
                        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--lime)]">{player.rank}º en el fantasy <Movement value={player.movement} /></p>
                        <h3 id="fantasy-player-title" className="mt-1 font-[family-name:var(--font-card)] text-3xl font-bold uppercase leading-none">{player.name}</h3>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-[var(--muted)]">{player.number !== null ? `#${player.number} · ` : ""}{player.played} {player.played === 1 ? "partido" : "partidos"}</p>
                        <p className="mt-2 flex items-baseline gap-1">
                            <CountUp value={player.total} className={`font-[family-name:var(--font-card)] text-5xl font-bold leading-none ${player.total < 0 ? "text-rose-400" : "text-white"}`} />
                            <span className="text-[10px] font-bold uppercase text-[var(--muted)]">pts</span>
                        </p>
                    </div>
                </div>

                <div className="space-y-5 p-4 pt-2">
                    <div className="grid grid-cols-3 gap-2">
                        <StatTile label="Media">{average.toLocaleString("es-ES", { maximumFractionDigits: 1 })}</StatTile>
                        <StatTile label="Mejor partido">{best ? <span className={pointsColor(best.total)}><CountUp value={best.total} signed /><span className="ml-1 text-xs text-[var(--muted)]">J{best.jornada}</span></span> : "—"}</StatTile>
                        <StatTile label="Jugados"><CountUp value={player.played} /></StatTile>
                    </div>

                    {player.matches.length > 1 ? (
                        <div>
                            <h4 className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--lime)]">Evolución</h4>
                            <div className="mt-2"><EvolutionChart matches={player.matches} ranks={ranks} /></div>
                        </div>
                    ) : null}

                    <div>
                        <h4 className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--lime)]">De dónde salen sus puntos</h4>
                        <div className="mt-2"><CategoryBars matches={player.matches} /></div>
                    </div>

                    <div>
                        <h4 className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--lime)]">Partido a partido</h4>
                        <div className="mt-2 space-y-3">
                            {[...player.matches].reverse().map((match) => (
                                <div key={match.id} className="border-l-2 pl-3" style={{ borderColor: match.total > 0 ? "var(--lime)" : match.total < 0 ? "#fb7185" : "var(--line)" }}>
                                    <p className="flex items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.06em]">
                                        <span className="min-w-0 truncate">J{match.jornada} · {match.opponent} <span className="font-mono text-[var(--muted)]">{match.score}</span></span>
                                        <span className={`shrink-0 font-mono text-sm ${pointsColor(match.total)}`}>{formatPoints(match.total)}</span>
                                    </p>
                                    <ul className="mt-1 space-y-0.5 text-xs text-white/75">
                                        {match.lines.map((line, index) => (
                                            <li key={index} className="flex items-center justify-between gap-3">
                                                <span className="min-w-0">{line.label}</span>
                                                <span className={`shrink-0 font-mono ${pointsColor(line.points)}`}>{formatPoints(line.points)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

// Botones de jornada para ver la clasificación tal como estaba al terminar cada una.
function JornadaPicker({ jornadas, value, onChange }: { jornadas: number[]; value: number; onChange: (jornada: number) => void }) {
    const listRef = useRef<HTMLDivElement>(null);
    const last = jornadas.at(-1);

    // Al entrar, la jornada actual (la última) a la vista.
    useEffect(() => {
        const list = listRef.current;
        if (list) list.scrollLeft = list.scrollWidth;
    }, []);

    if (jornadas.length < 2) return null;
    return (
        <div className="mx-auto mb-6 max-w-3xl">
            <p className="text-center text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
                {value === last ? "Clasificación de hoy" : `Clasificación tras la jornada ${value}`}
            </p>
            <div ref={listRef} role="group" aria-label="Ver la clasificación tras una jornada" className="mt-2 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] sm:justify-center">
                {jornadas.map((jornada) => {
                    const active = jornada === value;
                    return (
                        <button
                            key={jornada}
                            type="button"
                            aria-pressed={active}
                            onClick={() => onChange(jornada)}
                            className={`min-h-10 shrink-0 border px-3 text-xs font-black uppercase transition-colors ${active ? "border-[var(--lime)] bg-[var(--lime)] text-[var(--ink)]" : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--lime)] hover:text-white"}`}
                        >
                            {jornada === last ? `J${jornada} · Hoy` : `J${jornada}`}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// Fantasy de una competición: selector de jornada, podio, lo mejor de la jornada, ranking y ficha de
// cada jugador. La ficha muestra siempre todos los partidos hasta hoy.
export function FantasyBoard({ ranking }: { ranking: FantasyPlayerRow[] }) {
    const jornadas = useMemo(() => fantasyJornadas(ranking), [ranking]);
    const latest = jornadas.at(-1) ?? 0;
    const [jornada, setJornada] = useState(latest);
    const [openId, setOpenId] = useState<string | null>(null);
    const close = useCallback(() => setOpenId(null), []);
    const open = useCallback((player: FantasyPlayerRow) => setOpenId(player.id), []);
    const shown = jornadas.includes(jornada) ? jornada : latest;
    const view = useMemo(() => (shown === latest ? ranking : rankingAt(ranking, shown)), [ranking, shown, latest]);
    const podium = view.slice(0, 3);
    const rest = view.slice(3);
    const scale = Math.max(1, ...ranking.flatMap((player) => player.matches.map((match) => Math.abs(match.total))));
    const selected = ranking.find((player) => player.id === openId) ?? null;
    const selectedRanks = useMemo(() => (openId ? rankHistory(ranking, openId) : new Map<number, number>()), [ranking, openId]);

    return (
        <>
            <JornadaPicker jornadas={jornadas} value={shown} onChange={setJornada} />
            <Podium key={shown} players={podium} onOpen={open} />
            <Highlight ranking={view} onOpen={open} />

            {rest.length ? (
                <ol className="mx-auto mt-6 max-w-3xl divide-y divide-[var(--line)] border border-[var(--line)] bg-[var(--panel)]" start={4}>
                    {rest.map((player) => (
                        <li key={player.id}>
                            <button type="button" onClick={() => open(player)} className="grid min-h-16 w-full grid-cols-[2rem_auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-white/5 sm:px-4">
                                <span className="flex flex-col items-center">
                                    <span className="font-mono text-base font-black text-[var(--muted)]">{player.rank}º</span>
                                    <Movement value={player.movement} />
                                </span>
                                <Avatar player={player} size="size-11" />
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-black uppercase">{player.name}</span>
                                    <span className="mt-1 flex items-center gap-2">
                                        <MatchBars matches={player.matches} scale={scale} />
                                        <span className="truncate text-[10px] uppercase tracking-[0.06em] text-[var(--muted)]">{player.played} {player.played === 1 ? "partido" : "partidos"}</span>
                                    </span>
                                </span>
                                <span className={`text-right font-[family-name:var(--font-card)] text-2xl font-bold leading-none ${pointsColor(player.total)}`}>
                                    <CountUp value={player.total} /><span className="ml-0.5 text-[9px] font-bold text-[var(--muted)]">PTS</span>
                                </span>
                            </button>
                        </li>
                    ))}
                </ol>
            ) : null}

            <p className="mt-3 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Toca un jugador para ver su ficha fantasy</p>

            {selected ? <PlayerSheet player={selected} ranks={selectedRanks} onClose={close} /> : null}
        </>
    );
}
