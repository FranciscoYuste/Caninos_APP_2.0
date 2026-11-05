import { ChevronDown } from "lucide-react";
import { FEATURED_TEAM } from "@/lib/config";
import { FANTASY_CONCEDED_RULES, FANTASY_RULES, formatPoints, type FantasyPlayerRow } from "@/lib/fantasy";

function pointsColor(points: number): string {
    return points > 0 ? "text-[var(--lime)]" : points < 0 ? "text-rose-400" : "text-[var(--muted)]";
}

function RulesTable() {
    return (
        <details className="group mt-8 border border-[var(--line)] bg-[var(--panel)]">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-black uppercase marker:hidden">
                Cómo se puntúa
                <ChevronDown size={16} className="shrink-0 text-[var(--muted)] transition-transform group-open:rotate-180" />
            </summary>
            <div className="grid gap-5 border-t border-[var(--line)] p-4 sm:grid-cols-2">
                {FANTASY_RULES.map((group) => (
                    <div key={group.title}>
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--lime)]">{group.title}</h3>
                        <ul className="mt-2 divide-y divide-[var(--line)] text-xs">
                            {group.rows.map(([label, points]) => (
                                <li key={label} className="flex items-center justify-between gap-3 py-2">
                                    <span className="text-white/80">{label}</span>
                                    <span className={`shrink-0 font-mono font-bold ${typeof points === "number" ? pointsColor(points) : ""}`}>{typeof points === "number" ? formatPoints(points) : points}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
                <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--lime)]">Goles encajados</h3>
                    <table className="mt-2 w-full text-xs">
                        <thead>
                            <tr className="text-left text-[10px] uppercase text-[var(--muted)]">
                                <th className="py-2 font-bold">Goles</th>
                                <th className="py-2 text-right font-bold">Portero</th>
                                <th className="py-2 text-right font-bold">Equipo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--line)]">
                            {FANTASY_CONCEDED_RULES.map((row) => (
                                <tr key={row.goals}>
                                    <td className="py-2 text-white/80">{row.goals}</td>
                                    <td className={`py-2 text-right font-mono font-bold ${typeof row.goalkeeper === "number" ? pointsColor(row.goalkeeper) : "text-rose-400"}`}>{typeof row.goalkeeper === "number" ? formatPoints(row.goalkeeper) : row.goalkeeper}</td>
                                    <td className={`py-2 text-right font-mono font-bold ${typeof row.field === "number" ? pointsColor(row.field) : "text-rose-400"}`}>{typeof row.field === "number" ? formatPoints(row.field) : row.field}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">Solo para quienes jugaron. El portero suma su columna y los jugadores de campo la de Equipo. No tiene tope: cada gol más resta 1.</p>
                </div>
            </div>
        </details>
    );
}

export function FantasySection({ ranking, season }: { ranking: FantasyPlayerRow[] | null; season: string }) {
    return (
        <section className="py-10">
            <div className="mb-7 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--lime)]">Temporada {season} · {FEATURED_TEAM}</p>
                <h2 className="mt-2 text-3xl font-black uppercase sm:text-4xl">Fantasy</h2>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">Puntos de cada jugador partido a partido. Toca un jugador para ver de dónde salen.</p>
            </div>

            {ranking === null ? (
                <p className="border border-dashed border-[var(--line)] p-4 text-xs text-[var(--muted)]">No se pudo cargar el fantasy. Revisa la conexión y las migraciones de Supabase.</p>
            ) : !ranking.length ? (
                <p className="border border-dashed border-[var(--line)] p-4 text-xs text-[var(--muted)]">Todavía no hay partidos puntuados. El ranking aparecerá cuando haya un partido con resultado y convocatoria.</p>
            ) : (
                <ol className="mx-auto max-w-3xl space-y-2">
                    {ranking.map((player, index) => {
                        const position = ranking.findIndex((other) => other.total === player.total) + 1;
                        return (
                            <li key={player.id}>
                                <details className={`group border bg-[var(--panel)] ${index === 0 ? "border-[var(--lime)]/60" : "border-[var(--line)]"}`}>
                                    <summary className="grid min-h-16 cursor-pointer list-none grid-cols-[2.25rem_minmax(0,1fr)_auto_1rem] items-center gap-3 px-3 py-3 marker:hidden sm:px-4">
                                        <span className={`font-mono text-lg font-black ${position === 1 ? "text-[var(--lime)]" : "text-[var(--muted)]"}`}>{position}º</span>
                                        <span className="min-w-0">
                                            <span className="block truncate text-sm font-black uppercase">{player.name}</span>
                                            <span className="block text-[10px] uppercase tracking-[0.08em] text-[var(--muted)]">{player.number !== null ? `#${player.number} · ` : ""}{player.played} {player.played === 1 ? "partido" : "partidos"}</span>
                                        </span>
                                        <span className={`font-mono text-2xl font-black ${pointsColor(player.total)}`}>{player.total}<span className="ml-1 text-[10px] font-bold text-[var(--muted)]">PTS</span></span>
                                        <ChevronDown size={16} className="text-[var(--muted)] transition-transform group-open:rotate-180" />
                                    </summary>
                                    <div className="space-y-3 border-t border-[var(--line)] p-3 sm:p-4">
                                        {player.matches.map((match) => (
                                            <div key={match.id}>
                                                <p className="flex items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.06em]">
                                                    <span className="min-w-0 truncate">J{match.jornada} · {match.opponent} <span className="font-mono text-[var(--muted)]">{match.score}</span></span>
                                                    <span className={`shrink-0 font-mono ${pointsColor(match.total)}`}>{formatPoints(match.total)}</span>
                                                </p>
                                                <ul className="mt-1 space-y-0.5 text-xs text-white/75">
                                                    {match.lines.map((line, lineIndex) => (
                                                        <li key={lineIndex} className="flex items-center justify-between gap-3 pl-3">
                                                            <span className="min-w-0">{line.label}</span>
                                                            <span className={`shrink-0 font-mono ${pointsColor(line.points)}`}>{formatPoints(line.points)}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                </details>
                            </li>
                        );
                    })}
                </ol>
            )}

            <div className="mx-auto max-w-3xl"><RulesTable /></div>
        </section>
    );
}
