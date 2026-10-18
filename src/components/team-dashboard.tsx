"use client";

import Image from "next/image";
import { useState } from "react";
import { Activity, ArrowUpRight, CalendarDays, ClipboardList, Shield, Trophy, Users } from "lucide-react";

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
    photo?: string | null;
    video?: string | null;
    matchStats?: Array<{ label: string; goals: number; assists: number; penalties: string; doublePenalties: string; directFreeKicks: number; cards: string }>;
};
export type MatchItem = { key: string; date: string; home: string; away: string; score: string; status: string; callups?: Array<{ name: string; calledUp: boolean }> };
export type Standing = { position: number; name: string; played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; goalDifference: number; points: number };
type CompetitionId = "winter" | "promotion" | "cup";

function PlayerCard({ player, index }: { player: Player; index: number }) {
    return (
        <article id={`player-${player.id}`} className="player-card-shell reveal group scroll-mt-24 overflow-hidden" style={{ animationDelay: `${index * 80}ms` }}>
            <div className="player-card-media player-photo relative h-64 overflow-hidden sm:h-60">
                {player.video
                    ? <video className="h-full w-full object-cover" src={player.video} poster={player.photo ?? undefined} controls playsInline preload="none" aria-label={`Vídeo de ${player.name}`} />
                    : player.photo
                        ? <Image src={player.photo} alt={`Foto de ${player.name}`} width={600} height={416} unoptimized className="h-full w-full object-cover" />
                        : null}
                <span className="player-card-number absolute left-3 top-3 grid min-w-12 place-items-center px-3 py-2 font-mono text-lg font-black">
                    {player.number === null ? "—" : `#${player.number}`}
                </span>
                <span className="player-card-crest absolute right-3 top-3 grid size-14 place-items-center rounded-full">
                    <Image src="/fotos/escudo.png" alt="Escudo de Bayern D.L. Caninos" width={48} height={48} className="size-11 object-contain" />
                </span>
                <div className="player-card-caption absolute inset-x-0 bottom-0 px-4 pb-4 pt-14">
                    <p className="text-xl font-black uppercase leading-tight text-white sm:text-lg">{player.name}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--lime)]">{player.position}</p>
                </div>
            </div>
            <div className="player-card-stats p-4">
                <div className="grid grid-cols-4 divide-x divide-white/10">
                    {[{ value: player.goals, label: "GOL" }, { value: player.assists, label: "ASI" }, { value: player.games, label: "CONV." }, { value: player.cards, label: "TARJ." }].map((stat) => (
                        <div key={stat.label} className="px-1 text-center first:pl-0 last:pr-0"><p className="font-mono text-base font-bold text-white sm:text-lg">{stat.value}</p><p className="mt-1 text-[8px] font-bold tracking-[0.1em] text-[var(--muted)]">{stat.label}</p></div>
                    ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5 border-t border-white/10 pt-3 text-[9px] text-[var(--muted)]">
                    <span className="border border-[var(--line)] px-2 py-1">PEN {player.penalties}</span>
                    <span className="border border-[var(--line)] px-2 py-1">DOBLES {player.doublePenalties}</span>
                    <span className="border border-[var(--line)] px-2 py-1">FALTAS DIR. {player.directFreeKicks}</span>
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

function PlayerMini({ player, onSelect }: { player: Player; onSelect: () => void }) {
    return (
        <button type="button" onClick={onSelect} aria-label={`Ver ficha de ${player.name}, ${player.position}`} className="group flex w-full min-w-0 flex-col items-center gap-1 rounded-sm px-0.5 py-1 text-center transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--lime)]">
            <span className="relative grid size-9 place-items-center overflow-hidden rounded-full border border-white/50 bg-[#343a32] text-[10px] font-bold text-white transition group-hover:border-[var(--lime)]">
                {player.photo ? <Image src={player.photo} alt="" fill sizes="36px" unoptimized className="object-cover" /> : player.name.split(" ").map((part) => part[0]).join("")}
            </span>
            <span className="max-w-full truncate text-[8px] font-semibold leading-tight text-white">{player.name}</span>
        </button>
    );
}

function PlayerStatChart({ title, color, players }: { title: string; color: string; players: Array<{ name: string; value: number }> }) {
    const maxValue = Math.max(1, ...players.map((player) => player.value));
    return (
        <article className="border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
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

export function TeamDashboard({ squad, table, results, dataState }: { squad: Player[]; table: Standing[]; results: MatchItem[]; dataState: "ready" | "error" }) {
    const [activeMenu, setActiveMenu] = useState<"competition" | "players" | "callups" | "stats">("competition");
    const [activeCompetition, setActiveCompetition] = useState<CompetitionId>("winter");
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
    ];
    const competitions: Array<{ id: CompetitionId; label: string; status: string }> = [
        { id: "winter", label: "Liga de invierno", status: "En curso" },
        { id: "promotion", label: "Liga de ascenso / descenso", status: "Pendiente" },
        { id: "cup", label: "Copa", status: "Pendiente" },
    ];
    const selectedCompetition = competitions.find(({ id }) => id === activeCompetition) ?? competitions[0];
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
    const openPlayerCard = (player: Player) => {
        setActiveMenu("players");
        window.setTimeout(() => document.getElementById(`player-${player.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
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
                            <p className="font-mono text-2xl font-bold sm:text-5xl">{activeCompetition === "winter" && teamPosition ? String(teamPosition).padStart(2, "0") : "—"}<span className="text-[var(--lime)]">.</span></p>
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
                            <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">{results.length ? results.map((match) => <article key={match.key} className="grid grid-cols-[1fr_auto] gap-3 py-4"><div><p className="mb-2 font-mono text-[9px] tracking-[0.1em] text-[var(--muted)]">{match.date}</p><p className="text-xs font-semibold">{match.home} <span className="mx-1 text-[var(--muted)]">vs</span> {match.away}</p></div><p className={`self-center font-mono text-sm font-bold ${match.status === "next" ? "text-[var(--lime)]" : ""}`}>{match.score}</p></article>) : <p className="py-5 text-sm text-[var(--muted)]">{emptyMessage}</p>}</div>
                        </div>
                    </section>
                ) : null}

                {activeMenu === "players" ? (
                    <section id="plantilla" className="py-10">
                        <div className="mb-7 text-center"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--lime)]">El grupo</p><h2 className="mt-2 text-3xl font-black uppercase sm:text-4xl">Jugadores <span className="font-normal text-[var(--muted)]">/ {squad.length}</span></h2><p className="mt-3 text-sm text-[var(--muted)]">Selecciona un jugador en el campo para ir a su ficha y consultar sus estadísticas.</p></div>
                        {squad.length ? (
                            <div className="mb-10 overflow-hidden border border-[var(--line)] bg-[#1c2920] p-3 sm:p-6">
                                <div className="mb-3 flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.14em] text-white/50"><span>Campo de fútbol sala</span><span>Plantilla · 2026-2027</span></div>
                                <div className="futsal-pitch relative mx-auto aspect-[2/3] w-full max-w-[440px] overflow-hidden border border-orange-300">
                                    <div className="relative grid h-full grid-cols-4 grid-rows-4">
                                        {[
                                            { role: roles[0], placement: "col-start-2 col-span-2 row-start-1" },
                                            { role: roles[1], placement: "col-start-2 col-span-2 row-start-2" },
                                            { role: roles[2], placement: "col-start-1 col-span-2 row-start-3" },
                                            { role: roles[3], placement: "col-start-3 col-span-2 row-start-3" },
                                            { role: roles[4], placement: "col-start-2 col-span-2 row-start-4" },
                                        ].map(({ role, placement }) => (
                                            <div key={role.id} className={`z-[1] flex flex-col items-center justify-center px-1 py-2 ${placement}`}>
                                                <p className="mb-1 bg-black/35 px-2 py-1 text-center text-[8px] font-bold uppercase tracking-[0.06em] text-white sm:text-[9px]">{role.label}</p>
                                                <div className="flex w-full max-w-[208px] flex-wrap justify-center">{(playersByRole.get(role.id) ?? []).map((player) => <div key={player.id} className="w-1/4"><PlayerMini player={player} onSelect={() => openPlayerCard(player)} /></div>)}</div>
                                                {playersByRole.get(role.id)?.length === 0 ? <span className="bg-black/35 px-2 py-1 text-center text-[8px] text-white/80">Sin asignar</span> : null}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {playersByRole.get("unspecified")?.length ? <div className="mt-3 border border-dashed border-white/20 p-3"><p className="mb-2 text-[9px] font-bold uppercase text-white/55">Posición por definir</p><div className="flex flex-wrap gap-2">{playersByRole.get("unspecified")?.map((player) => <div key={player.id} className="w-16"><PlayerMini player={player} onSelect={() => openPlayerCard(player)} /></div>)}</div></div> : null}
                            </div>
                        ) : null}
                        {squad.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{squad.map((player, index) => <PlayerCard key={player.name} player={player} index={index} />)}</div> : <p className="border-y border-[var(--line)] py-6 text-sm text-[var(--muted)]">{emptyMessage}</p>}
                    </section>
                ) : null}

                {activeMenu === "callups" ? (
                    <section className="py-10">
                        <div className="mb-7 text-center"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--lime)]">Convocatorias · Bayern D.L.Caninos</p><h2 className="mt-2 text-3xl font-black uppercase sm:text-4xl">Partido a partido</h2><p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">Consulta quién fue convocado y quién no en cada encuentro. La hora y el campo aparecen cuando se confirman.</p></div>
                        <div className="grid gap-4 md:grid-cols-2">{results.map((match) => {
                            const calledUp = match.callups?.filter((player) => player.calledUp) ?? [];
                            const notCalledUp = match.callups?.filter((player) => !player.calledUp) ?? [];
                            return <article key={match.key} className="border border-[var(--line)] bg-[var(--panel)] p-5"><p className="font-mono text-[9px] tracking-[0.12em] text-[var(--lime)]">{match.date}</p><h3 className="mt-3 text-sm font-bold">{match.home} <span className="font-normal text-[var(--muted)]">vs</span> {match.away}</h3>{match.callups?.length ? <><div className="mt-4"><p className="mb-2 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--lime)]">Convocados · {calledUp.length}</p>{calledUp.length ? <div className="flex flex-wrap gap-2">{calledUp.map((player) => <span key={player.name} className="border border-[var(--lime)]/40 px-2 py-1 text-[10px] text-[var(--lime)]">{player.name}</span>)}</div> : <p className="text-[10px] text-[var(--muted)]">Ninguno indicado todavía.</p>}</div><div className="mt-4 border-t border-[var(--line)] pt-3"><p className="mb-2 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">No convocados · {notCalledUp.length}</p>{notCalledUp.length ? <div className="flex flex-wrap gap-2">{notCalledUp.map((player) => <span key={player.name} className="border border-[var(--line)] px-2 py-1 text-[10px] text-[var(--muted)]">{player.name}</span>)}</div> : <p className="text-[10px] text-[var(--muted)]">Todos los jugadores están convocados.</p>}</div></> : <p className="mt-4 border-t border-[var(--line)] pt-4 text-xs text-[var(--muted)]">Convocatoria todavía no publicada.</p>}</article>;
                        })}</div>
                        {!results.length ? <p className="border-y border-[var(--line)] py-6 text-sm text-[var(--muted)]">{emptyMessage}</p> : null}
                    </section>
                ) : null}

                {activeMenu === "stats" ? (
                    <section className="py-10">
                        <div className="mb-7 text-center"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--lime)]">Temporada 2026-2027 · Bayern D.L.Caninos</p><h2 className="mt-2 text-3xl font-black uppercase sm:text-4xl">Estadísticas generales</h2><p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">Resumen de las estadísticas individuales importadas hasta ahora.</p></div>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                            {[{ label: "Goles", value: totals.goals }, { label: "Asistencias", value: totals.assists }, { label: "Amarillas", value: totals.yellowCards }, { label: "Rojas", value: totals.redCards }].map((stat) => <div key={stat.label} className="border border-[var(--line)] bg-[var(--panel)] p-4"><p className="font-mono text-3xl font-bold text-[var(--lime)]">{stat.value}</p><p className="mt-2 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">{stat.label}</p></div>)}
                        </div>
                        <div className="mt-5 grid gap-5 lg:grid-cols-2">
                            <PlayerStatChart title="Goles por jugador" color="bg-[var(--lime)]" players={chartPlayers((player) => player.goals)} />
                            <PlayerStatChart title="Asistencias por jugador" color="bg-sky-400" players={chartPlayers((player) => player.assists)} />
                            <PlayerStatChart title="Tarjetas rojas por jugador" color="bg-rose-500" players={chartPlayers((player) => Number(player.cards.match(/\d+/g)?.[1] ?? 0))} />
                            <PlayerStatChart title="Tarjetas amarillas por jugador" color="bg-yellow-300" players={chartPlayers((player) => Number(player.cards.match(/\d+/g)?.[0] ?? 0))} />
                            <PlayerStatChart title="Convocatorias por jugador" color="bg-[var(--lime)]" players={chartPlayers((player) => player.games)} />
                        </div>
                        {!squad.some((player) => player.goals || player.assists || player.games) ? <p className="mt-5 border border-dashed border-[var(--line)] p-4 text-xs text-[var(--muted)]">Aún no hay estadísticas importadas. Los gráficos se completarán automáticamente cuando se carguen convocatorias y estadísticas de partidos.</p> : null}
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
        </main>
    );
}