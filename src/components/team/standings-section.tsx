"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { CalendarDays, Trophy } from "lucide-react";
import { ChronicleDialog } from "@/components/team/chronicle-dialog";
import { ACTIVE_SEASON, FEATURED_TEAM } from "@/lib/config";
import type { MatchItem, RoundMatchItem, Standing } from "@/lib/team-types";

export function StandingsSection({ table, results, roundMatches, emptyMessage }: { table: Standing[]; results: MatchItem[]; roundMatches: RoundMatchItem[]; emptyMessage: string }) {
    const [expandedJornada, setExpandedJornada] = useState<number | null>(null);
    const [selectedChronicle, setSelectedChronicle] = useState<MatchItem | null>(null);
    const closeChronicle = useCallback(() => setSelectedChronicle(null), []);

    return (
        <>
        <section id="liga" className="py-10">
            <div className="mb-8 flex flex-col items-center text-center"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--lime)]">Temporada {ACTIVE_SEASON} · Liga de invierno</p><h2 className="mt-2 text-3xl font-black uppercase sm:text-4xl">Clasificación</h2><Trophy className="mt-3 text-[var(--lime)]" /></div>
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
                    <tr key={team.name} className={`border-b border-[var(--line)] ${team.name === FEATURED_TEAM ? "bg-[#f2cf1810] text-[var(--lime)]" : ""}`}>
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
                                <div className="mt-3 flex flex-wrap gap-2">
                                {match.chronicle ? (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedChronicle(match)}
                                        className="border border-[var(--lime)]/50 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--lime)] transition hover:bg-[var(--lime)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--lime)]"
                                    >
                                        Leer crónica
                                    </button>
                                ) : null}
                                <Link href={`/equipo/partido/${match.key}`} className="border border-[var(--line)] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)] transition hover:border-[var(--lime)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--lime)]">
                                    Ver partido
                                </Link>
                                </div>
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
            {selectedChronicle ? <ChronicleDialog match={selectedChronicle} onClose={closeChronicle} /> : null}
        </>
    );
}
