"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { Cross, Star } from "lucide-react";
import { useCardSpin } from "@/components/team/use-card-spin";
import type { Player } from "@/lib/team-types";

const POSITION_CODES: Record<string, string> = {
    Portero: "POR",
    Cierre: "CIE",
    "Ala izquierda": "ALA",
    "Ala derecha": "ALA",
    "Pívot": "PÍV",
};

function initials(name: string): string {
    return name.split(" ").map((part) => part[0]).join("").slice(0, 3);
}

// Vídeo de la ficha: se reproduce una vez, sin sonido, y se queda en el último fotograma.
function PlayerVideo({ player }: { player: Player }) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        void videoRef.current?.play().catch((error: unknown) => {
            console.error(`No se pudo reproducir el vídeo de ${player.name}.`, error);
        });
    }, [player.name]);

    return (
        <video
            ref={videoRef}
            className="h-full w-full object-contain object-bottom"
            src={player.video ?? undefined}
            muted
            playsInline
            autoPlay
            preload="auto"
            aria-label={`Vídeo de ${player.name}`}
            onEnded={(event) => {
                const video = event.currentTarget;
                video.pause();
                if (Number.isFinite(video.duration)) video.currentTime = Math.max(0, video.duration - 0.05);
            }}
            onError={(event) => console.error(`Error al cargar el vídeo de ${player.name}.`, event.currentTarget.error)}
        />
    );
}

function CardShine() {
    return <><span className="collect-holo" aria-hidden="true" /><span className="collect-glare" aria-hidden="true" /></>;
}

// Carta coleccionable del jugador: delante la foto y los totales, detrás el partido a partido.
export function PlayerCard({ player }: { player: Player }) {
    const { ref, flipped, handlers } = useCardSpin<HTMLDivElement>();
    const katsuRounds = player.katsuRounds ?? [];
    const matches = player.matchStats ?? [];
    const maxGoals = Math.max(1, ...matches.map((match) => match.goals));
    const best = matches.reduce<(typeof matches)[number] | null>((top, match) => (match.goals > (top?.goals ?? 0) ? match : top), null);
    const goalsPerGame = player.games ? (player.goals / player.games).toLocaleString("es-ES", { maximumFractionDigits: 2 }) : "—";
    const positionCode = POSITION_CODES[player.position];
    const stats = [
        { value: player.goals, label: "GOL" },
        { value: player.assists, label: "ASI" },
        { value: player.games, label: "CONV" },
        { value: player.penalties, label: "PEN" },
        { value: player.doublePenalties, label: "DOB" },
        { value: player.directFreeKicks, label: "FD" },
    ];

    return (
        <div id={`player-${player.id}`} className="collect-stage">
            <div
                ref={ref}
                role="button"
                tabIndex={0}
                aria-pressed={flipped}
                aria-label={`Carta de ${player.name}. ${flipped ? "Muestra el partido a partido" : "Muestra los totales"}. Pulsa para darle la vuelta o arrástrala a un lado.`}
                className="collect-card"
                {...handlers}
            >
                <div className="collect-face">
                    <div className="collect-face-in">
                        <div className="collect-media">
                            {player.video
                                ? <PlayerVideo player={player} />
                                : player.photo
                                    ? <Image src={player.photo} alt={`Foto de ${player.name}`} fill unoptimized sizes="320px" className="object-contain object-bottom" draggable={false} />
                                    : <span className="collect-initials">{initials(player.name)}</span>}
                        </div>
                        <div className="collect-corner">
                            <span className="collect-number">{player.number ?? "—"}</span>
                            {positionCode ? <span className="collect-position">{positionCode}</span> : null}
                        </div>
                        <Image src="/fotos/escudo-256.png" alt="" width={56} height={56} className="collect-crest" draggable={false} />
                        <div className="collect-badges">
                            {katsuRounds.length ? <span className="collect-badge" title={`Jugador KATSU ${katsuRounds.length} ${katsuRounds.length === 1 ? "vez" : "veces"}`}><Star size={11} fill="currentColor" />{katsuRounds.length}</span> : null}
                            {player.injured ? <span className="collect-badge collect-badge-injured" title="Lesionado"><Cross size={14} strokeWidth={3} /></span> : null}
                        </div>
                        <div className="collect-plate">
                            <p className="collect-name">{player.name}</p>
                            <span className="collect-rule" />
                            <div className="collect-stats">
                                {stats.map((stat) => <p key={stat.label}><b>{stat.value}</b><span>{stat.label}</span></p>)}
                            </div>
                            <div className="collect-foot">
                                <span>{player.position}</span>
                                <span>{player.yellowCards} A · {player.redCards} R</span>
                            </div>
                        </div>
                        <CardShine />
                    </div>
                </div>

                <div className="collect-face collect-back">
                    <div className="collect-face-in collect-back-in">
                        <div className="collect-back-head">
                            <b>{player.name}</b>
                            <span>#{player.number ?? "—"}</span>
                        </div>
                        <p className="collect-back-title">Goles por jornada{katsuRounds.length ? " · ★ KATSU" : ""}</p>
                        {matches.length ? (
                            <div>
                                <div className="collect-bars">
                                    {matches.map((match) => (
                                        <i key={match.jornada} className={katsuRounds.includes(match.jornada) ? "is-katsu" : ""} style={{ height: `${Math.max(4, (match.goals / maxGoals) * 100)}%` }} title={`${match.label}: ${match.goals} goles`} />
                                    ))}
                                </div>
                                <div className="collect-bars-axis">
                                    {matches.length <= 12
                                        ? matches.map((match) => <span key={match.jornada}>J{match.jornada}</span>)
                                        : <><span>J{matches[0].jornada}</span><span>J{matches.at(-1)?.jornada}</span></>}
                                </div>
                            </div>
                        ) : <p className="collect-empty">Todavía no hay estadísticas por partido.</p>}
                        <dl className="collect-rows">
                            <div><dt>Mejor partido</dt><dd>{best ? `${best.goals} ${best.goals === 1 ? "gol" : "goles"} · J${best.jornada}` : "—"}</dd></div>
                            <div><dt>Goles por convocatoria</dt><dd>{goalsPerGame}</dd></div>
                            <div><dt>Tarjetas</dt><dd>{player.yellowCards} A · {player.redCards} R</dd></div>
                            <div><dt>Jugador KATSU</dt><dd>{katsuRounds.length ? katsuRounds.map((round) => `J${round}`).join(", ") : "Todavía no"}</dd></div>
                            {player.injured ? <div><dt>Lesión</dt><dd>{player.injuryDescription || "Lesionado"}</dd></div> : null}
                        </dl>
                        <Image src="/fotos/escudo-256.png" alt="" width={40} height={40} className="collect-back-crest" draggable={false} />
                        <CardShine />
                    </div>
                </div>
            </div>
        </div>
    );
}

// Detalle completo de cada partido, debajo de la carta.
export function PlayerMatchDetail({ player }: { player: Player }) {
    if (!player.matchStats?.length) return null;
    return (
        <details className="mx-auto mt-4 w-full max-w-[320px] border border-[var(--line)] bg-black/60 px-4 py-3">
            <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--lime)]">Detalle por partido</summary>
            <div className="mt-3 space-y-3">
                {player.matchStats.map((match) => (
                    <div key={match.jornada} className="border-l border-[var(--lime)]/50 pl-3 text-[11px] leading-5 text-[var(--muted)]">
                        <p className="font-semibold text-white/85">{match.label}</p>
                        <p>{match.goals} goles · {match.assists} asistencias · PEN {match.penalties} · DOBLES {match.doublePenalties}</p>
                        <p>Faltas directas {match.directFreeKicks} · {match.yellowCards} A {match.redCards} R</p>
                    </div>
                ))}
            </div>
        </details>
    );
}
