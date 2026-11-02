"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { Cross } from "lucide-react";
import type { Player } from "@/lib/team-types";

function PlayerVideo({ player, autoPlay = false }: { player: Player; autoPlay?: boolean }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const isActive = useRef(autoPlay);

    const seekToLastFrame = () => {
        const video = videoRef.current;
        if (video && Number.isFinite(video.duration) && video.duration > 0) {
            video.currentTime = Math.max(0, video.duration - 0.05);
        }
    };

    const playVideo = () => {
        const video = videoRef.current;
        if (!video) return;

        isActive.current = true;
        if (video.readyState >= HTMLMediaElement.HAVE_METADATA) video.currentTime = 0;
        void video.play().catch((error: unknown) => {
            console.error(`No se pudo reproducir el vídeo de ${player.name}.`, error);
        });
    };

    const freezeVideo = () => {
        const video = videoRef.current;
        isActive.current = false;
        if (!video) return;

        video.pause();
        seekToLastFrame();
    };

    useEffect(() => {
        if (!autoPlay) return;

        const video = videoRef.current;
        if (!video) return;

        isActive.current = true;
        void video.play().catch((error: unknown) => {
            console.error(`No se pudo reproducir el vídeo de ${player.name}.`, error);
        });
    }, [autoPlay, player.name]);

    return (
        <video
            ref={videoRef}
            className="h-full w-full object-contain focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--lime)]"
            src={player.video ?? undefined}
            poster={autoPlay ? undefined : player.photo ?? undefined}
            muted
            playsInline
            autoPlay={autoPlay}
            loop={false}
            preload={autoPlay ? "auto" : "metadata"}
            tabIndex={0}
            aria-label={autoPlay ? `Vídeo de ${player.name}` : `Vídeo de ${player.name}. Pasa el ratón o enfoca para reproducir.`}
            onLoadedMetadata={() => {
                if (!isActive.current) seekToLastFrame();
            }}
            onMouseEnter={autoPlay ? undefined : playVideo}
            onMouseLeave={autoPlay ? undefined : freezeVideo}
            onFocus={autoPlay ? undefined : playVideo}
            onBlur={autoPlay ? undefined : freezeVideo}
            onEnded={(event) => {
                event.currentTarget.pause();
                seekToLastFrame();
            }}
            onError={(event) => console.error(`Error al cargar el vídeo de ${player.name}.`, event.currentTarget.error)}
        />
    );
}

export function PlayerCard({ player, index, featured = false }: { player: Player; index: number; featured?: boolean }) {
    return (
        <article id={`player-${player.id}`} className={`player-card-shell reveal group w-full overflow-hidden ${featured ? "player-card-featured" : "scroll-mt-24 sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)]"}`} style={{ animationDelay: `${index * 80}ms` }}>
            <div className={`player-card-media relative aspect-[4/5] overflow-hidden ${player.video ? "bg-black" : "player-photo"}`}>
                {player.video
                    ? <PlayerVideo player={player} autoPlay={featured} />
                    : player.photo
                        ? <Image src={player.photo} alt={`Foto de ${player.name}`} width={600} height={416} unoptimized className="h-full w-full object-cover" />
                        : null}
                <span className="player-card-number absolute left-2 top-3 font-sans text-[6rem] font-black italic leading-[0.75] sm:text-[8rem]">
                    {player.number ?? "—"}
                </span>
                <span className="player-card-crest absolute right-3 top-3">
                    <Image src="/fotos/escudo-256.png" alt="Escudo de Bayern D.L. Caninos" width={80} height={80} className="size-20 object-contain" />
                </span>
                {player.injured ? <span className="absolute right-4 top-24 z-[2] inline-flex items-center gap-1.5 border border-red-300/70 bg-red-950/85 px-2 py-1 text-[10px] font-black uppercase text-red-100"><Cross size={13} strokeWidth={3} /> Lesionado</span> : null}
                <div className="player-card-caption absolute inset-x-0 bottom-0 px-4 pb-4 pt-14">
                    <p className="text-xl font-black uppercase leading-tight text-white sm:text-lg">{player.name}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--lime)]">{player.position}</p>
                </div>
            </div>
            <div className="player-card-stats p-4">
                <div className="grid grid-cols-4 divide-x divide-white/15">
                    {[{ value: player.goals, label: "GOL" }, { value: player.assists, label: "ASI" }, { value: player.games, label: "CONV." }, { value: `${player.yellowCards}A ${player.redCards}R`, label: "TARJ." }].map((stat) => (
                        <div key={stat.label} className="flex min-h-20 min-w-0 flex-col items-center justify-center gap-2 px-1 text-center">
                            <p className={`whitespace-nowrap font-mono text-2xl font-black leading-none tabular-nums text-white ${stat.label === "TARJ." ? "md:text-base md:tracking-[-0.08em] lg:text-lg" : "sm:text-3xl"}`}>{stat.value}</p>
                            <p className="whitespace-nowrap text-[10px] font-bold tracking-[0.12em] text-[var(--muted)]">{stat.label}</p>
                        </div>
                    ))}
                </div>
                <div className="mt-4 flex flex-wrap justify-center gap-2 border-t border-white/10 pt-4 text-[10px] text-[var(--muted)]">
                    <span className="inline-flex min-h-10 items-center justify-center border border-[var(--line)] px-3 py-2 text-center font-semibold">PEN {player.penalties}</span>
                    <span className="inline-flex min-h-10 items-center justify-center border border-[var(--line)] px-3 py-2 text-center font-semibold">DOBLES {player.doublePenalties}</span>
                    <span className="inline-flex min-h-10 items-center justify-center border border-[var(--line)] px-3 py-2 text-center font-semibold">FALTAS DIR. {player.directFreeKicks}</span>
                </div>
                {player.matchStats?.length ? (
                    <details className="mt-3 border-t border-white/10 pt-3">
                        <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--lime)]">Detalle por partido</summary>
                        <div className="mt-3 space-y-3">
                            {player.matchStats.map((match) => (
                                <div key={match.label} className="border-l border-[var(--lime)]/50 pl-3 text-[10px] leading-5 text-[var(--muted)]">
                                    <p className="font-semibold text-white/80">{match.label}</p>
                                    <p>{match.goals} goles · {match.assists} asistencias · PEN {match.penalties} · DOBLES {match.doublePenalties}</p>
                                    <p>Faltas directas {match.directFreeKicks} · {match.yellowCards}A {match.redCards}R</p>
                                </div>
                            ))}
                        </div>
                    </details>
                ) : null}
            </div>
        </article>
    );
}
