"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Activity, Ambulance, ArrowUpRight, CalendarDays, ClipboardList, Cross, Shield, Star, Trophy, Users, X } from "lucide-react";
import { PlayerField } from "@/components/player-field";

export type Player = {
    id: string;
    name: string;
    position: string;
    number: number | null;
    goals: number;
    assists: number;
    games: number;
    cards: string;
    penalties: string;
    doublePenalties: string;
    directFreeKicks: number;
    injured: boolean;
    injuryDescription?: string | null;
    photo?: string | null;
    video?: string | null;
    matchStats?: Array<{ label: string; goals: number; assists: number; penalties: string; doublePenalties: string; directFreeKicks: number; cards: string }>;
};
export type MatchItem = { key: string; jornada: number; date: string; home: string; away: string; score: string; chronicle: string | null; finalScore?: string | null; status: string; callupPhotoUrl?: string | null; callups?: Array<{ name: string; calledUp: boolean }> };
export type RoundMatchItem = { key: string; jornada: number; home: string; away: string; score: string };
export type KatsuCard = { key: string; jornada: number; home: string; away: string; score: string | null; player: Pick<Player, "id" | "name" | "position" | "number" | "photo"> };
export type Standing = { position: number; name: string; played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; goalDifference: number; points: number };
type CompetitionId = "winter" | "promotion" | "cup";

function KatsuPlayerCard({ card }: { card: KatsuCard }) {
    const [revealed, setRevealed] = useState(false);

    return (
        <button
            type="button"
            aria-pressed={revealed}
            aria-label={`${revealed ? "Ocultar" : "Revelar"} carta KATSU de ${card.player.name}, jornada ${card.jornada}`}
            onClick={() => setRevealed((value) => !value)}
            className="katsu-card-shell group relative block aspect-[3/4] w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lime)] [perspective:1400px]"
        >
            <span className={`katsu-card-inner absolute inset-0 ${revealed ? "is-revealed" : ""}`}>
                <span className="katsu-card-face katsu-card-front absolute inset-0 flex flex-col overflow-hidden border border-[var(--lime)]/70 bg-[radial-gradient(ellipse_at_50%_28%,#55592c_0%,#25291d_36%,#111311_80%)] p-4 shadow-[0_16px_50px_#0008] [backface-visibility:hidden] sm:p-6">
                    <span className="pointer-events-none absolute inset-2 border border-white/15" />
                    <span className="katsu-card-orbit pointer-events-none absolute -right-12 top-16 size-48 rounded-full border border-[var(--lime)]/15" />
                    <span className="katsu-card-orbit katsu-card-orbit-inner pointer-events-none absolute -right-7 top-21 size-36 rounded-full border border-[var(--lime)]/20" />
                    <span className="pointer-events-none absolute -left-16 top-1/3 h-px w-[150%] rotate-[-28deg] bg-gradient-to-r from-transparent via-[var(--lime)]/20 to-transparent" />
                    <span className="relative flex items-center justify-between text-xs font-bold uppercase tracking-[0.14em] text-[var(--lime)] sm:text-xs sm:tracking-[0.2em]">
                        <span>Temporada 2026—2027</span><Star size={21} fill="currentColor" />
                    </span>
                    <span className="relative mt-2 flex justify-center">
                        <Image src="/fotos/escudo.png" alt="Escudo de Bayern D.L. Caninos" width={76} height={76} className="size-[4.5rem] object-contain drop-shadow-[0_0_12px_#f2cf1870] sm:size-20" />
                    </span>
                    <span className="relative my-auto flex flex-col items-center text-center">
                        <span className="text-6xl font-black uppercase leading-[0.9] tracking-[-0.06em] text-white sm:text-6xl">Jugador</span>
                        <span className="mt-1 text-[clamp(4.5rem,20vw,6rem)] font-black uppercase leading-[0.78] tracking-[-0.07em] text-[var(--lime)] drop-shadow-[0_4px_18px_#f2cf1855] sm:text-8xl">KATSU</span>
                        <span className="mt-5 border-t border-white/20 px-5 pt-3 text-center sm:mt-6 sm:pt-4">
                            <span className="block text-xs font-bold uppercase tracking-[0.2em] text-white/65 sm:text-sm">Jornada</span>
                            <span className="mt-1 block font-mono text-6xl font-black leading-none text-white sm:text-7xl">{String(card.jornada).padStart(2, "0")}</span>
                        </span>
                    </span>
                    <span className="relative mt-3 flex flex-col items-center gap-2 border-t border-white/20 pt-3 text-center sm:mt-4 sm:pt-4">
                        <span className="max-w-full truncate text-sm font-bold text-white/85 sm:text-sm">{card.home} <span className="text-white/50">vs</span> {card.away}</span>
                        <span className="font-mono text-xl font-black tracking-wide text-white sm:text-2xl">{card.score ?? "Resultado pendiente"}</span>
                    </span>
                    <span className="relative mt-2 flex items-center justify-center gap-2 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--lime)] sm:text-[10px]"><span className="size-1.5 rounded-full bg-[var(--lime)]" /> Pulsa para descubrir</span>
                </span>
                <span className="katsu-card-face katsu-card-back absolute inset-0 flex flex-col overflow-hidden border border-[var(--lime)]/75 bg-[#171a15] shadow-[0_16px_50px_#0008] [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <span className="relative min-h-0 flex-1 overflow-hidden bg-[radial-gradient(ellipse_at_50%_30%,#55592c,#1a1d1a_74%)]">
                        {card.player.photo
                            ? <Image src={card.player.photo} alt={`Foto de ${card.player.name}`} fill unoptimized sizes="(max-width: 768px) 100vw, 33vw" className="katsu-card-player-image object-cover object-top" />
                            : <span className="absolute inset-0 grid place-items-center font-black text-8xl text-[var(--lime)]">{card.player.name.split(" ").map((part) => part[0]).join("").slice(0, 3)}</span>}
                        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#111311] via-transparent to-black/20" />
                        <span className="player-card-number absolute left-2 top-3 font-sans text-7xl font-black italic leading-[0.75] sm:left-3 sm:text-6xl">{card.player.number ?? "—"}</span>
                        <span className="player-card-crest absolute right-2 top-2 sm:right-3 sm:top-3">
                            <Image src="/fotos/escudo.png" alt="Escudo de Bayern D.L. Caninos" width={80} height={80} className="size-16 object-contain drop-shadow-lg sm:size-20" />
                        </span>
                        <span className="absolute inset-x-0 bottom-0 px-4 pb-5 pt-16 sm:px-5 sm:pb-6">
                            <span className="block text-[1.65rem] font-black uppercase leading-tight tracking-[0.08em] text-[var(--lime)] sm:text-lg sm:tracking-[0.12em]">Jugador KATSU · J{card.jornada}</span>
                            <span className="mt-1 block text-[2.75rem] font-black uppercase leading-tight text-white sm:text-3xl">{card.player.name}</span>
                            <span className="mt-2 block text-lg font-bold uppercase tracking-[0.16em] text-white/85 sm:text-sm">{card.player.position}</span>
                        </span>
                    </span>
                </span>
            </span>
        </button>
    );
}

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

function PlayerCard({ player, index, featured = false }: { player: Player; index: number; featured?: boolean }) {
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
                    <Image src="/fotos/escudo.png" alt="Escudo de Bayern D.L. Caninos" width={80} height={80} className="size-20 object-contain" />
                </span>
                {player.injured ? <span className="absolute right-4 top-24 z-[2] inline-flex items-center gap-1.5 border border-red-300/70 bg-red-950/85 px-2 py-1 text-[9px] font-black uppercase text-red-100"><Cross size={13} strokeWidth={3} /> Lesionado</span> : null}
                <div className="player-card-caption absolute inset-x-0 bottom-0 px-4 pb-4 pt-14">
                    <p className="text-xl font-black uppercase leading-tight text-white sm:text-lg">{player.name}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--lime)]">{player.position}</p>
                </div>
            </div>
            <div className="player-card-stats p-4">
                <div className="grid grid-cols-4 divide-x divide-white/15">
                    {[{ value: player.goals, label: "GOL" }, { value: player.assists, label: "ASI" }, { value: player.games, label: "CONV." }, { value: player.cards, label: "TARJ." }].map((stat) => (
                        <div key={stat.label} className="flex min-h-20 min-w-0 flex-col items-center justify-center gap-2 px-1 text-center">
                            <p className={`whitespace-nowrap font-mono text-2xl font-black leading-none tabular-nums text-white ${stat.label === "TARJ." ? "md:text-base md:tracking-[-0.08em] lg:text-lg" : "sm:text-3xl"}`}>{stat.value}</p>
                            <p className="whitespace-nowrap text-[8px] font-bold tracking-[0.12em] text-[var(--muted)]">{stat.label}</p>
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
                        <summary className="cursor-pointer text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--lime)]">Detalle por partido</summary>
                        <div className="mt-3 space-y-3">
                            {player.matchStats.map((match) => (
                                <div key={match.label} className="border-l border-[var(--lime)]/50 pl-3 text-[10px] leading-5 text-[var(--muted)]">
                                    <p className="font-semibold text-white/80">{match.label}</p>
                                    <p>{match.goals} goles · {match.assists} asistencias · PEN {match.penalties} · DOBLES {match.doublePenalties}</p>
                                    <p>Faltas directas {match.directFreeKicks} · {match.cards}</p>
                                </div>
                            ))}
                        </div>
                    </details>
                ) : null}
            </div>
        </article>
    );
}

function PlayerStatChart({ title, color, players, className = "" }: { title: string; color: string; players: Array<{ name: string; value: number }>; className?: string }) {
    const maxValue = Math.max(1, ...players.map((player) => player.value));
    return (
        <article className={`border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6 ${className}`}>
            <h3 className="text-sm font-bold uppercase">{title}</h3>
            <div className="mt-5 space-y-4" role="list" aria-label={`Gráfico de ${title.toLowerCase()} por jugador`}>
                {players.map((player) => (
                    <div key={player.name} role="listitem">
                        <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                            <span className="truncate text-[var(--muted)]">{player.name}</span>
                            <span className="shrink-0 font-mono font-bold">{player.value}</span>
                        </div>
                        <div className="h-2 bg-[var(--ink)]" role="progressbar" aria-label={`${player.name}: ${player.value} ${title.toLowerCase()}`} aria-valuemin={0} aria-valuemax={maxValue} aria-valuenow={player.value}>
                            <div className={`h-full ${color}`} style={{ width: `${player.value ? Math.max(2, (player.value / maxValue) * 100) : 0}%` }} />
                        </div>
                    </div>
                ))}
                {!players.length ? <p className="text-xs text-[var(--muted)]">Todavía no hay jugadores cargados.</p> : null}
            </div>
        </article>
    );
}

export function TeamDashboard({ squad, table, results, roundMatches, katsuCards, dataState }: { squad: Player[]; table: Standing[]; results: MatchItem[]; roundMatches: RoundMatchItem[]; katsuCards: KatsuCard[]; dataState: "ready" | "error" }) {
    const [activeMenu, setActiveMenu] = useState<"competition" | "players" | "callups" | "stats" | "katsu" | "injuries">("competition");
    const [activeCompetition, setActiveCompetition] = useState<CompetitionId>("winter");
    const [expandedJornada, setExpandedJornada] = useState<number | null>(null);
    const [selectedChronicle, setSelectedChronicle] = useState<MatchItem | null>(null);
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const [cardTilt, setCardTilt] = useState({ x: 0, y: 0 });
    const emptyMessage = dataState === "error"
        ? "No se pudieron cargar datos. Revisa la conexión y las migraciones de Supabase."
        : "Todavía no hay registros en Supabase.";
    const teamPosition = table.find((team) => team.name === "Bayern D.L.Caninos")?.position;
    const nextMatch = results.find((match) => match.status === "next");
    const menuItems = [
        { id: "competition" as const, label: "Clasificación y partidos", icon: Trophy },
        { id: "players" as const, label: "Jugadores", icon: Users },
        { id: "callups" as const, label: "Convocatorias", icon: ClipboardList },
        { id: "stats" as const, label: "Estadísticas", icon: Activity },
        { id: "katsu" as const, label: "Jugador KATSU", icon: Star },
        { id: "injuries" as const, label: "Lesionados", icon: Ambulance },
    ];
    const competitions: Array<{ id: CompetitionId; label: string; status: string }> = [
        { id: "winter", label: "Liga de invierno", status: "En curso" },
        { id: "promotion", label: "Liga de ascenso / descenso", status: "Pendiente" },
        { id: "cup", label: "Copa", status: "Pendiente" },
    ];
    const selectedCompetition = competitions.find(({ id }) => id === activeCompetition) ?? competitions[0];
    useEffect(() => {
        if (!selectedChronicle && !selectedPlayer) return;
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setSelectedChronicle(null);
                setSelectedPlayer(null);
                setCardTilt({ x: 0, y: 0 });
            }
        };
        document.addEventListener("keydown", closeOnEscape);
        return () => document.removeEventListener("keydown", closeOnEscape);
    }, [selectedChronicle, selectedPlayer]);
    const roles = [
        { id: "goalkeeper", label: "Portero" },
        { id: "defender", label: "Cierre" },
        { id: "left-wing", label: "Ala izquierda" },
        { id: "right-wing", label: "Ala derecha" },
        { id: "pivot", label: "Pívot" },
        { id: "unspecified", label: "Posición por definir" },
    ];
    const getRole = (position: string) => {
        const normalized = position.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        if (normalized.includes("port")) return "goalkeeper";
        if (normalized.includes("cierre")) return "defender";
        if (normalized.includes("pivot")) return "pivot";
        if (normalized.includes("ala")) {
            if (normalized.includes("izq")) return "left-wing";
            if (normalized.includes("der")) return "right-wing";
        }
        return "unspecified";
    };
    const playersByRole = new Map(roles.map((role) => [role.id, squad.filter((player) => getRole(player.position) === role.id)]));
    const closePlayerCard = () => {
        setSelectedPlayer(null);
        setCardTilt({ x: 0, y: 0 });
    };
    const totals = squad.reduce((sum, player) => {
        const [yellow = "0", red = "0"] = player.cards.match(/\d+/g) ?? [];
        return {
            goals: sum.goals + player.goals,
            assists: sum.assists + player.assists,
            yellowCards: sum.yellowCards + Number(yellow),
            redCards: sum.redCards + Number(red),
        };
    }, { goals: 0, assists: 0, yellowCards: 0, redCards: 0 });
    const chartPlayers = (value: (player: Player) => number) => [...squad]
        .sort((first, second) => value(second) - value(first) || first.name.localeCompare(second.name, "es"))
        .map((player) => ({ name: player.name, value: value(player) }));
    return (
        <main className="min-h-screen">
            <header className="flex min-h-[72px] flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-3 sm:px-10">
                <a href="#inicio" className="flex items-center gap-3" aria-label="Bayern D.L.Caninos, inicio"><Image src="/fotos/escudo.png" alt="" width={44} height={44} priority className="size-11 object-contain" /><span className="text-sm font-bold tracking-[0.08em]">Bayern D.L.Caninos</span></a>
                <a href="/login?next=%2Fadmin" className="flex items-center gap-2 border border-[var(--line)] px-3 py-2 text-xs font-semibold hover:border-[var(--lime)]">Administración</a>
            </header>

            <section id="inicio" className="team-hero-background relative isolate min-h-[300px] overflow-hidden border-b border-[var(--line)] sm:min-h-[360px]">
                <div className="pitch-lines pointer-events-none absolute inset-0 z-0 opacity-30" />
                <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-[#111311]/90 via-[#111311]/65 to-[#111311]/35" />
                <div className="relative z-20 mx-auto flex min-h-[300px] max-w-7xl items-center gap-2 px-4 py-6 sm:min-h-[360px] sm:gap-8 sm:px-10 sm:py-10">
                    <div className="min-w-0 flex-1 text-left">
                        <p className="mb-3 flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--lime)] sm:mb-4 sm:gap-2 sm:text-xs sm:tracking-[0.2em]"><span className="size-2 shrink-0 rounded-full bg-[var(--lime)]" /> Temporada 2026-2027 · {selectedCompetition.label}</p>
                        <h1 className="text-[clamp(1.5rem,7vw,2.75rem)] font-black uppercase leading-[0.94] sm:text-7xl">Un equipo.<br /><span className="text-[var(--lime)]">Dos rodillas</span> sanas.</h1>
                        <div className="mt-5 flex flex-col items-start gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
                            <button onClick={() => { setActiveMenu("competition"); document.getElementById("contenido")?.scrollIntoView({ behavior: "smooth" }); }} className="inline-flex items-center gap-1.5 whitespace-nowrap bg-[var(--lime)] px-2.5 py-3 text-[9px] font-black uppercase text-[var(--ink)] sm:gap-2 sm:px-4 sm:text-xs">Ver competición <ArrowUpRight size={14} className="sm:size-4" /></button>
                            <span className="max-w-full font-mono text-[9px] leading-relaxed text-white/70 sm:text-xs">{activeCompetition === "winter" ? `PRÓXIMA FECHA · ${nextMatch?.date ?? "POR ANUNCIAR"}` : "COMPETICIÓN PENDIENTE DE INICIO"}</span>
                        </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-center gap-2 sm:flex-row sm:gap-6">
                        <Image src="/fotos/escudo.png" alt="Escudo de Bayern D.L. Caninos" width={104} height={104} priority className="size-14 object-contain drop-shadow-lg sm:size-24" />
                        <div className="text-center sm:border-l sm:border-white/25 sm:pl-6 sm:text-right">
                            <p className="font-mono text-2xl font-bold sm:text-5xl">{activeCompetition === "winter" && teamPosition ? <>{teamPosition}<sup className="ml-0.5 text-[0.48em] text-[var(--lime)]">º</sup></> : "—"}</p>
                            <p className="mt-1 max-w-20 text-[7px] uppercase leading-tight tracking-[0.06em] text-white/65 sm:max-w-none sm:text-[10px] sm:tracking-[0.15em]">{activeCompetition === "winter" ? "en la tabla" : "clasificación pendiente"}</p>
                        </div>
                    </div>
                </div>
            </section>

            <div id="contenido" className="mx-auto max-w-7xl px-5 sm:px-10">
                <div className="-mx-5 border-b border-[var(--line)] bg-[var(--ink)] px-5 py-3 sm:hidden">
                    <label htmlFor="competition-select" className="mb-2 block text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Competición</label>
                    <select id="competition-select" value={activeCompetition} onChange={(event) => {
                        const selected = competitions.find(({ id }) => id === event.target.value);
                        if (selected) setActiveCompetition(selected.id);
                    }} className="w-full border border-[var(--line)] bg-[var(--panel)] px-3 py-3 text-center text-xs font-bold uppercase text-[var(--paper)] focus:border-[var(--lime)] focus:outline-none">
                        {competitions.map(({ id, label, status }) => <option key={id} value={id}>{label} · {status}</option>)}
                    </select>
                </div>
                <nav aria-label="Competiciones" className="hidden justify-center gap-2 border-b border-[var(--line)] bg-[var(--ink)] px-5 py-3 sm:-mx-10 sm:flex sm:px-10">
                    {competitions.map(({ id, label, status }) => (
                        <button key={id} type="button" aria-current={activeCompetition === id ? "page" : undefined} onClick={() => setActiveCompetition(id)} className={`flex shrink-0 flex-col items-center gap-1 border px-4 py-3 text-center transition-colors ${activeCompetition === id ? "border-[var(--lime)] bg-[var(--lime)] text-[var(--ink)]" : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--lime)] hover:text-white"}`}>
                            <span className="text-[10px] font-bold uppercase tracking-[0.08em]">{label}</span>
                            <span className={`text-[9px] uppercase tracking-[0.1em] ${activeCompetition === id ? "opacity-70" : ""}`}>{status}</span>
                        </button>
                    ))}
                </nav>

                {activeCompetition === "winter" ? (
                    <>
                <nav aria-label="Secciones del equipo" className="sticky top-0 z-10 -mx-5 grid grid-cols-2 gap-2 border-b border-[var(--line)] bg-[var(--ink)] px-5 py-3 sm:-mx-10 sm:flex sm:flex-wrap sm:justify-center sm:px-10">
                    {menuItems.map(({ id, label, icon: Icon }) => (
                        <button key={id} type="button" aria-current={activeMenu === id ? "page" : undefined} onClick={() => setActiveMenu(id)} className={`flex min-w-0 items-center justify-center gap-1.5 border px-2 py-3 text-[9px] font-bold uppercase leading-tight tracking-[0.04em] transition-colors sm:shrink-0 sm:gap-2 sm:px-4 sm:text-[10px] sm:tracking-[0.08em] ${activeMenu === id ? "border-[var(--lime)] bg-[var(--lime)] text-[var(--ink)]" : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--lime)] hover:text-white"}`}>
                            <Icon size={15} className="shrink-0" />{label}
                        </button>
                    ))}
                </nav>

                {activeMenu === "competition" ? (
                    <section id="liga" className="py-10">
                        <div className="mb-8 flex flex-col items-center text-center"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--lime)]">Temporada 2026-2027 · Liga de invierno</p><h2 className="mt-2 text-3xl font-black uppercase sm:text-4xl">Clasificación</h2><Trophy className="mt-3 text-[var(--lime)]" /></div>
                        <table className="w-full table-fixed border-collapse text-left text-[9px] sm:text-xs">
                            <colgroup>
                                <col className="w-6 sm:w-12" />
                                <col />
                                <col className="w-5 sm:w-12" />
                                <col className="w-[18px] sm:w-12" />
                                <col className="w-[18px] sm:w-12" />
                                <col className="w-[18px] sm:w-12" />
                                <col className="w-[22px] sm:w-12" />
                                <col className="w-[22px] sm:w-12" />
                                <col className="w-6 sm:w-12" />
                                <col className="w-7 sm:w-14" />
                            </colgroup>
                            <thead><tr className="border-y border-[var(--line)] text-[8px] tracking-normal text-[var(--muted)] sm:text-[9px] sm:tracking-[0.12em]">
                                <th className="py-3 pl-1 sm:pl-2">POS</th><th className="px-1">EQUIPO</th>
                                <th className="text-center">PJ</th><th className="text-center">G</th><th className="text-center">E</th><th className="text-center">P</th>
                                <th className="text-center">GF</th><th className="text-center">GC</th><th className="text-center">DG</th><th className="pr-1 text-right sm:pr-2">PTS</th>
                            </tr></thead>
                            <tbody>{table.length ? table.map((team) => (
                                <tr key={team.name} className={`border-b border-[var(--line)] ${team.name === "Bayern D.L.Caninos" ? "bg-[#f2cf1810] text-[var(--lime)]" : ""}`}>
                                    <td className="py-4 pl-1 font-mono sm:pl-2">{String(team.position).padStart(2, "0")}</td>
                                    <td className="overflow-hidden px-1 font-semibold"><span className="block truncate">{team.name}</span></td>
                                    <td className="text-center font-mono">{team.played}</td><td className="text-center font-mono">{team.won}</td><td className="text-center font-mono">{team.drawn}</td><td className="text-center font-mono">{team.lost}</td>
                                    <td className="text-center font-mono">{team.goalsFor}</td><td className="text-center font-mono">{team.goalsAgainst}</td><td className="text-center font-mono">{team.goalDifference > 0 ? "+" : ""}{team.goalDifference}</td><td className="pr-1 text-right font-mono font-bold sm:pr-2">{team.points}</td>
                                </tr>
                            )) : <tr><td colSpan={10} className="border-b border-[var(--line)] py-5 text-center text-[var(--muted)]">{emptyMessage}</td></tr>}</tbody>
                        </table>
                        <div id="partidos" className="mt-12">
                            <div className="mb-6 flex flex-col items-center text-center"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--lime)]">Calendario y resultados del Bayern</p><h2 className="mt-2 text-3xl font-black uppercase">Partidos</h2><CalendarDays className="mt-3 text-[var(--lime)]" /></div>
                            <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">{results.length ? results.map((match) => {
                                const isExpanded = expandedJornada === match.jornada;
                                const otherMatches = roundMatches.filter((roundMatch) => roundMatch.jornada === match.jornada && roundMatch.key !== match.key);
                                return (
                                    <article key={match.key} className="grid grid-cols-[1fr_auto] gap-3 py-4">
                                        <div>
                                            <p className="mb-2 font-mono text-[9px] tracking-[0.1em] text-[var(--muted)]">{match.date}</p>
                                            <button
                                                type="button"
                                                aria-expanded={isExpanded}
                                                aria-controls={`jornada-${match.jornada}`}
                                                onClick={() => setExpandedJornada(isExpanded ? null : match.jornada)}
                                                className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--lime)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--lime)]"
                                            >
                                                Jornada {match.jornada} · {isExpanded ? "Ocultar otros partidos" : "Ver otros partidos"}
                                            </button>
                                            <p className="text-xs font-semibold">{match.home} <span className="mx-1 text-[var(--muted)]">vs</span> {match.away}</p>
                                            {match.chronicle ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedChronicle(match)}
                                                    className="mt-3 border border-[var(--lime)]/50 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--lime)] transition hover:bg-[var(--lime)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--lime)]"
                                                >
                                                    Leer crónica
                                                </button>
                                            ) : null}
                                        </div>
                                        <p className={`self-center font-mono text-sm font-bold ${match.status === "next" ? "text-[var(--lime)]" : ""}`}>{match.score}</p>
                                        {isExpanded ? (
                                            <div id={`jornada-${match.jornada}`} className="col-span-full border-t border-[var(--line)] pt-3">
                                                <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Otros partidos · Jornada {match.jornada}</h3>
                                                {otherMatches.length ? (
                                                    <ul className="space-y-2">
                                                        {otherMatches.map((roundMatch) => (
                                                            <li key={roundMatch.key} className="flex items-center justify-between gap-3 text-xs">
                                                                <span className="min-w-0 truncate">{roundMatch.home} <span className="mx-1 text-[var(--muted)]">vs</span> {roundMatch.away}</span>
                                                                <span className="shrink-0 font-mono font-bold">{roundMatch.score}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : <p className="text-xs text-[var(--muted)]">No hay otros partidos cargados para esta jornada.</p>}
                                            </div>
                                        ) : null}
                                    </article>
                                );
                            }) : <p className="py-5 text-sm text-[var(--muted)]">{emptyMessage}</p>}</div>
                        </div>
                    </section>
                ) : null}

                {activeMenu === "players" ? (
                    <section id="plantilla" className="py-10">
                        <div className="mb-7 text-center"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--lime)]">El grupo</p><h2 className="mt-2 text-3xl font-black uppercase sm:text-4xl">Jugadores <span className="font-normal text-[var(--muted)]">/ {squad.length}</span></h2><p className="mt-3 text-sm text-[var(--muted)]">Elige el modo de campo que prefieras y selecciona un jugador para abrir su ficha y consultar sus estadísticas.</p></div>
                        {squad.length ? (
                            <PlayerField playersByRole={playersByRole} roles={roles} onSelect={(player) => { setSelectedPlayer(player); setCardTilt({ x: 0, y: 0 }); }} />
                        ) : <p className="border-y border-[var(--line)] py-6 text-sm text-[var(--muted)]">{emptyMessage}</p>}
                    </section>
                ) : null}

                {activeMenu === "callups" ? (
                    <section className="py-10">
                        <div className="mb-7 text-center"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--lime)]">Convocatorias · Bayern D.L.Caninos</p><h2 className="mt-2 text-3xl font-black uppercase sm:text-4xl">Partido a partido</h2><p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">Consulta quién fue convocado y quién no en cada encuentro. La hora y el campo aparecen cuando se confirman.</p></div>
                        <div className="flex flex-wrap justify-center gap-4">{results.map((match) => {
                            const calledUp = match.callups?.filter((player) => player.calledUp) ?? [];
                            const notCalledUp = match.callups?.filter((player) => !player.calledUp) ?? [];
                            return <article key={match.key} className="w-full border border-[var(--line)] bg-[var(--panel)] p-5 md:w-[calc(50%-0.5rem)]"><p className="font-mono text-[9px] tracking-[0.12em] text-[var(--lime)]">{match.date}</p><h3 className="mt-3 text-sm font-bold">{match.home} <span className="font-normal text-[var(--muted)]">vs</span> {match.away}</h3>{match.finalScore ? <p className="mt-3 text-xs uppercase tracking-[0.1em] text-[var(--muted)]">Resultado <span className="ml-2 font-mono text-lg font-black tracking-normal text-white">{match.finalScore}</span></p> : null}{match.callupPhotoUrl ? <div className="relative mt-4 aspect-[4/3] overflow-hidden bg-black/30"><Image src={match.callupPhotoUrl} alt={`Foto del equipo: ${match.home} vs ${match.away}`} fill unoptimized sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" /></div> : null}{match.callups?.length ? <><div className="mt-4"><p className="mb-2 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--lime)]">Convocados · {calledUp.length}</p>{calledUp.length ? <div className="flex flex-wrap gap-2">{calledUp.map((player) => <span key={player.name} className="border border-[var(--lime)]/40 px-2 py-1 text-[10px] text-[var(--lime)]">{player.name}</span>)}</div> : <p className="text-[10px] text-[var(--muted)]">Ninguno indicado todavía.</p>}</div><div className="mt-4 border-t border-[var(--line)] pt-3"><p className="mb-2 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">No convocados · {notCalledUp.length}</p>{notCalledUp.length ? <div className="flex flex-wrap gap-2">{notCalledUp.map((player) => <span key={player.name} className="border border-[var(--line)] px-2 py-1 text-[10px] text-[var(--muted)]">{player.name}</span>)}</div> : <p className="text-[10px] text-[var(--muted)]">Todos los jugadores están convocados.</p>}</div></> : <p className="mt-4 border-t border-[var(--line)] pt-4 text-xs text-[var(--muted)]">Convocatoria todavía no publicada.</p>}</article>;
                        })}</div>
                        {!results.length ? <p className="border-y border-[var(--line)] py-6 text-sm text-[var(--muted)]">{emptyMessage}</p> : null}
                    </section>
                ) : null}

                {activeMenu === "stats" ? (
                    <section className="py-10">
                        <div className="mb-7 text-center"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--lime)]">Temporada 2026-2027 · Bayern D.L.Caninos</p><h2 className="mt-2 text-3xl font-black uppercase sm:text-4xl">Estadísticas generales</h2><p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">Resumen de las estadísticas individuales importadas hasta ahora.</p></div>
                        <div className="flex flex-wrap justify-center gap-3">
                            {[{ label: "Goles", value: totals.goals }, { label: "Asistencias", value: totals.assists }, { label: "Amarillas", value: totals.yellowCards }, { label: "Rojas", value: totals.redCards }].map((stat) => <div key={stat.label} className="w-[calc(50%-0.375rem)] border border-[var(--line)] bg-[var(--panel)] p-4 sm:w-[calc(33.333%-0.5rem)] lg:w-[calc(25%-0.5625rem)]"><p className="font-mono text-3xl font-bold text-[var(--lime)]">{stat.value}</p><p className="mt-2 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">{stat.label}</p></div>)}
                        </div>
                        <div className="mt-5 flex flex-wrap justify-center gap-5">
                            <PlayerStatChart className="w-full lg:w-[calc(50%-0.625rem)]" title="Goles por jugador" color="bg-[var(--lime)]" players={chartPlayers((player) => player.goals)} />
                            <PlayerStatChart className="w-full lg:w-[calc(50%-0.625rem)]" title="Asistencias por jugador" color="bg-sky-400" players={chartPlayers((player) => player.assists)} />
                            <PlayerStatChart className="w-full lg:w-[calc(50%-0.625rem)]" title="Tarjetas rojas por jugador" color="bg-rose-500" players={chartPlayers((player) => Number(player.cards.match(/\d+/g)?.[1] ?? 0))} />
                            <PlayerStatChart className="w-full lg:w-[calc(50%-0.625rem)]" title="Tarjetas amarillas por jugador" color="bg-yellow-300" players={chartPlayers((player) => Number(player.cards.match(/\d+/g)?.[0] ?? 0))} />
                            <PlayerStatChart className="w-full lg:w-[calc(50%-0.625rem)]" title="Convocatorias por jugador" color="bg-[var(--lime)]" players={chartPlayers((player) => player.games)} />
                        </div>
                        {!squad.some((player) => player.goals || player.assists || player.games) ? <p className="mt-5 border border-dashed border-[var(--line)] p-4 text-xs text-[var(--muted)]">Aún no hay estadísticas importadas. Los gráficos se completarán automáticamente cuando se carguen convocatorias y estadísticas de partidos.</p> : null}
                    </section>
                ) : null}

                {activeMenu === "katsu" ? (
                    <section className="py-10">
                        <div className="mb-8 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--lime)]">Bayern D.L. Caninos · Temporada 2026—2027</p>
                            <h2 className="mt-2 text-4xl font-black uppercase sm:text-5xl">Jugador KATSU</h2>
                            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">Un reconocimiento especial en cada partido. Pulsa la carta para descubrir quién se lleva la distinción.</p>
                        </div>
                        {katsuCards.length ? (
                            <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-6">
                                {katsuCards.map((card) => <div key={card.key} className="w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)]"><KatsuPlayerCard card={card} /></div>)}
                            </div>
                        ) : (
                            <div className="mx-auto max-w-xl border border-dashed border-[var(--line)] px-6 py-12 text-center">
                                <Star className="mx-auto text-[var(--lime)]" size={28} />
                                <p className="mt-4 text-sm font-bold uppercase">Todavía no hay jugadores KATSU</p>
                                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Cuando se asigne un jugador a un partido del Bayern, su carta aparecerá aquí.</p>
                            </div>
                        )}
                    </section>
                ) : null}

                {activeMenu === "injuries" ? (
                    <section className="py-10">
                        <div className="mb-8 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-red-300">Parte médico · Bayern D.L. Caninos</p>
                            <h2 className="mt-2 text-4xl font-black uppercase sm:text-5xl">Lesionados</h2>
                            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">Seguimiento de los jugadores actualmente lesionados.</p>
                        </div>
                        {squad.some((player) => player.injured) ? (
                            <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-3">
                                {squad.filter((player) => player.injured).map((player) => (
                                    <article key={player.id} className="w-full overflow-hidden border border-red-300/30 bg-[var(--panel)] sm:w-[calc(50%-0.375rem)]">
                                        <button type="button" onClick={() => { setSelectedPlayer(player); setCardTilt({ x: 0, y: 0 }); }} className="group flex w-full items-center gap-4 p-4 text-left transition hover:bg-white/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--lime)]">
                                            <span className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-full border border-red-300/50 bg-black/30 text-lg font-black text-red-100">
                                                {player.photo ? <Image src={player.photo} alt="" fill sizes="64px" unoptimized className="object-cover" /> : player.name.split(" ").map((part) => part[0]).join("")}
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-base font-black uppercase text-white">{player.name}</span>
                                                <span className="mt-1 block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">{player.position} · #{player.number ?? "—"}</span>
                                            </span>
                                            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-red-600 text-white shadow-[0_0_18px_#dc262655]"><Cross size={22} strokeWidth={3} /></span>
                                        </button>
                                        {player.injuryDescription ? <p className="border-t border-red-300/15 px-4 py-3 text-xs leading-5 text-white/75 sm:px-5">{player.injuryDescription}</p> : null}
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div className="mx-auto max-w-xl border border-dashed border-[var(--line)] px-6 py-12 text-center">
                                <Ambulance className="mx-auto text-[var(--muted)]" size={30} />
                                <p className="mt-4 text-sm font-bold uppercase">No hay jugadores lesionados</p>
                                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Si hay alguna baja, se añadirá aquí desde Administración.</p>
                            </div>
                        )}
                    </section>
                ) : null}
                    </>
                ) : (
                    <section className="mx-auto max-w-3xl py-16 text-center sm:py-24">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--lime)]">Temporada 2026-2027 · Próximamente</p>
                        <h2 className="mt-3 text-3xl font-black uppercase sm:text-4xl">{activeCompetition === "promotion" ? "Liga de ascenso / descenso" : "Copa"}</h2>
                        <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                            {activeCompetition === "promotion"
                                ? "Esta competición se activará cuando termine la Liga de invierno y se confirme en qué grupo jugará Bayern D.L.Caninos. Aquí tendrá sus propios partidos, clasificación, convocatorias y estadísticas."
                                : "La sección se activará cuando se confirmen el formato y el calendario de la Copa. Sus partidos, convocatorias y estadísticas se mantendrán separados de los de liga."}
                        </p>
                        <span className="mt-7 inline-flex items-center gap-2 border border-[var(--line)] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]"><CalendarDays size={14} /> Pendiente de inicio</span>
                    </section>
                )}
            </div>
            <footer className="flex flex-nowrap items-center justify-between gap-1.5 border-t border-[var(--line)] px-2 py-5 text-[7px] uppercase tracking-[0.01em] text-[var(--muted)] sm:gap-3 sm:px-10 sm:py-6 sm:text-[10px] sm:tracking-[0.12em]"><span className="whitespace-nowrap">Bayern D.L.Caninos. Creado para fumar en equipo.</span><span className="flex shrink-0 items-center gap-1 whitespace-nowrap sm:gap-3"><Image src="/fotos/CORONA MAS PUA.png" alt="" aria-hidden="true" width={42} height={42} className="footer-emblem-glow size-6 object-contain sm:size-9" /><span className="flex items-center gap-1 sm:gap-2"><Shield size={12} className="hidden sm:block" /><span className="hidden sm:inline">Temporada </span>2026-2027</span></span></footer>
            {selectedChronicle ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 sm:p-8"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) setSelectedChronicle(null);
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="match-chronicle-title"
                        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto border border-[var(--lime)]/50 bg-[var(--panel)] p-5 shadow-2xl sm:p-8"
                    >
                        <button
                            type="button"
                            aria-label="Cerrar crónica"
                            onClick={() => setSelectedChronicle(null)}
                            className="absolute right-4 top-4 grid size-10 place-items-center border border-[var(--line)] text-white hover:border-[var(--lime)] hover:text-[var(--lime)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--lime)]"
                        >
                            <X size={20} />
                        </button>
                        <p className="pr-12 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--lime)]">Crónica · Jornada {selectedChronicle.jornada}</p>
                        <h2 id="match-chronicle-title" className="mt-3 pr-12 text-xl font-black uppercase sm:text-2xl">
                            {selectedChronicle.home} <span className="text-[var(--muted)]">vs</span> {selectedChronicle.away}
                        </h2>
                        <p className="mt-3 border-b border-[var(--line)] pb-4 font-mono text-xs leading-5 text-[var(--muted)]">
                            {selectedChronicle.date}<span className="mx-2">·</span><span className="font-bold text-white">{selectedChronicle.score}</span>
                        </p>
                        <div className="mt-6 space-y-4 text-sm leading-7 text-white/85">
                            {selectedChronicle.chronicle?.split(/\n\s*\n/).filter((paragraph) => paragraph.trim()).map((paragraph, index) => (
                                <p key={index} className="whitespace-pre-wrap">{paragraph}</p>
                            ))}
                        </div>
                    </section>
                </div>
            ) : null}
            {selectedPlayer ? (
                <div
                    className="player-profile-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-8"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) closePlayerCard();
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="selected-player-title"
                        className="player-profile-dialog relative max-h-[92vh] w-full max-w-xl overflow-y-auto p-2 sm:p-4"
                    >
                        <button
                            type="button"
                            aria-label="Cerrar ficha del jugador"
                            onClick={closePlayerCard}
                            className="player-profile-close absolute right-4 top-4 z-20 grid size-11 place-items-center border border-[var(--lime)]/70 bg-black/85 text-white transition hover:bg-[var(--lime)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                        >
                            <X size={21} />
                        </button>
                        <h2 id="selected-player-title" className="sr-only">Ficha de {selectedPlayer.name}</h2>
                        <div
                            className="player-profile-card"
                            onPointerMove={(event) => {
                                if (event.pointerType !== "mouse") return;
                                const bounds = event.currentTarget.getBoundingClientRect();
                                const x = (event.clientX - bounds.left) / bounds.width - 0.5;
                                const y = (event.clientY - bounds.top) / bounds.height - 0.5;
                                setCardTilt({ x: x * 8, y: y * -8 });
                            }}
                            onPointerLeave={() => setCardTilt({ x: 0, y: 0 })}
                            style={{ transform: `perspective(1200px) rotateX(${cardTilt.y}deg) rotateY(${cardTilt.x}deg)` }}
                        >
                            <PlayerCard player={selectedPlayer} index={0} featured />
                        </div>
                        <p className="mt-3 text-center text-[9px] font-bold uppercase tracking-[0.16em] text-white/50">Mueve el puntero sobre la carta · Esc para cerrar</p>
                    </section>
                </div>
            ) : null}
        </main>
    );
}