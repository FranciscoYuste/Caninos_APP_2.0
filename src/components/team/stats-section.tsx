import { ACTIVE_SEASON, FEATURED_TEAM } from "@/lib/config";
import type { Player } from "@/lib/team-types";

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

export function StatsSection({ squad }: { squad: Player[] }) {
    const totals = squad.reduce((sum, player) => ({
        goals: sum.goals + player.goals,
        assists: sum.assists + player.assists,
        yellowCards: sum.yellowCards + player.yellowCards,
        redCards: sum.redCards + player.redCards,
    }), { goals: 0, assists: 0, yellowCards: 0, redCards: 0 });
    const chartPlayers = (value: (player: Player) => number) => [...squad]
        .sort((first, second) => value(second) - value(first) || first.name.localeCompare(second.name, "es"))
        .map((player) => ({ name: player.name, value: value(player) }));

    return (
        <section className="py-10">
            <div className="mb-7 text-center"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--lime)]">Temporada {ACTIVE_SEASON} · {FEATURED_TEAM}</p><h2 className="mt-2 text-3xl font-black uppercase sm:text-4xl">Estadísticas generales</h2><p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">Resumen de las estadísticas individuales importadas hasta ahora.</p></div>
            <div className="flex flex-wrap justify-center gap-3">
                {[{ label: "Goles", value: totals.goals }, { label: "Asistencias", value: totals.assists }, { label: "Amarillas", value: totals.yellowCards }, { label: "Rojas", value: totals.redCards }].map((stat) => <div key={stat.label} className="w-[calc(50%-0.375rem)] border border-[var(--line)] bg-[var(--panel)] p-4 sm:w-[calc(33.333%-0.5rem)] lg:w-[calc(25%-0.5625rem)]"><p className="font-mono text-3xl font-bold text-[var(--lime)]">{stat.value}</p><p className="mt-2 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">{stat.label}</p></div>)}
            </div>
            <div className="mt-5 flex flex-wrap justify-center gap-5">
                <PlayerStatChart className="w-full lg:w-[calc(50%-0.625rem)]" title="Goles por jugador" color="bg-[var(--lime)]" players={chartPlayers((player) => player.goals)} />
                <PlayerStatChart className="w-full lg:w-[calc(50%-0.625rem)]" title="Asistencias por jugador" color="bg-sky-400" players={chartPlayers((player) => player.assists)} />
                <PlayerStatChart className="w-full lg:w-[calc(50%-0.625rem)]" title="Tarjetas rojas por jugador" color="bg-rose-500" players={chartPlayers((player) => player.redCards)} />
                <PlayerStatChart className="w-full lg:w-[calc(50%-0.625rem)]" title="Tarjetas amarillas por jugador" color="bg-yellow-300" players={chartPlayers((player) => player.yellowCards)} />
                <PlayerStatChart className="w-full lg:w-[calc(50%-0.625rem)]" title="Convocatorias por jugador" color="bg-[var(--lime)]" players={chartPlayers((player) => player.games)} />
            </div>
            {!squad.some((player) => player.goals || player.assists || player.games) ? <p className="mt-5 border border-dashed border-[var(--line)] p-4 text-xs text-[var(--muted)]">Aún no hay estadísticas importadas. Los gráficos se completarán automáticamente cuando se carguen convocatorias y estadísticas de partidos.</p> : null}
        </section>
    );
}
