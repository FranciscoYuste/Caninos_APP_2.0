import { ChevronDown } from "lucide-react";
import { FEATURED_TEAM } from "@/lib/config";
import { FantasyBoard } from "@/components/team/fantasy-board";
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
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">Puntos de cada jugador partido a partido: quién manda, quién viene en racha y de dónde sale cada punto.</p>
            </div>

            {ranking === null ? (
                <p className="border border-dashed border-[var(--line)] p-4 text-xs text-[var(--muted)]">No se pudo cargar el fantasy. Revisa la conexión y las migraciones de Supabase.</p>
            ) : !ranking.length ? (
                <p className="border border-dashed border-[var(--line)] p-4 text-xs text-[var(--muted)]">Todavía no hay partidos puntuados. El ranking aparecerá cuando haya un partido con resultado y convocatoria.</p>
            ) : (
                <FantasyBoard ranking={ranking} />
            )}

            <div className="mx-auto max-w-3xl"><RulesTable /></div>
        </section>
    );
}
