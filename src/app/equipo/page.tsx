import { TeamDashboard } from "@/components/team-dashboard";
import type { MatchItem, Player, Standing } from "@/components/team-dashboard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const FEATURED_TEAM = "Bayern D.L.Caninos";

type PlayerRecord = {
    id: string; nombre: string; posicion: string; dorsal: number | null; foto_url: string | null; video_url: string | null;
};

type PlayerStatsRecord = {
    jugador_id: string;
    goles: number;
    asistencias: number;
    penaltis_marcados: number;
    penaltis_tirados: number;
    dobles_penaltis_marcados: number;
    dobles_penaltis_tirados: number;
    faltas_directas_marcadas: number;
    amarillas: number;
    rojas: number;
    partidos: {
        jornada: number;
        fecha: string | null;
        fecha_prevista: string | null;
        equipo_local: string;
        equipo_visitante: string;
    } | null;
};

type PlayerSeasonTotals = Omit<PlayerStatsRecord, "partidos">;

type CallupRecord = {
    partido_id: string;
    jugador_id: string;
    convocado: boolean;
};

export default async function TeamPage() {
    try {
        const supabase = await createSupabaseServerClient();
        const temporada = "2026-2027";
        const [playerResult, matchResult, tableResult, callupResult, statsResult] = await Promise.all([
            supabase.from("jugadores").select("id,nombre,posicion,dorsal,foto_url,video_url").eq("activo", true).order("dorsal", { nullsFirst: false }),
            supabase.from("partidos").select("id,fecha,fecha_prevista,campo,equipo_local,equipo_visitante,goles_local,goles_visitante,estado,foto_convocatoria_url").eq("temporada", temporada).eq("fase", "campeon_invierno").order("fecha_prevista"),
            supabase.from("clasificacion").select("equipo,posicion,jugados,ganados,empatados,perdidos,goles_favor,goles_contra,diferencia,puntos").eq("temporada", temporada).eq("fase", "campeon_invierno").eq("grupo", "").order("posicion"),
            supabase.from("convocatorias").select("partido_id,jugador_id,convocado,partidos!inner(temporada,fase)").eq("partidos.temporada", temporada).eq("partidos.fase", "campeon_invierno"),
            supabase.from("estadisticas").select("jugador_id,goles,asistencias,penaltis_marcados,penaltis_tirados,dobles_penaltis_marcados,dobles_penaltis_tirados,faltas_directas_marcadas,amarillas,rojas,partidos!inner(jornada,fecha,fecha_prevista,equipo_local,equipo_visitante,temporada,fase)").eq("partidos.temporada", temporada).eq("partidos.fase", "campeon_invierno"),
        ]);
        const queryErrors = [
            { table: "jugadores", error: playerResult.error },
            { table: "partidos", error: matchResult.error },
            { table: "clasificacion", error: tableResult.error },
            { table: "convocatorias", error: callupResult.error },
            { table: "estadisticas", error: statsResult.error },
        ].flatMap(({ table, error }) => error
            ? [{
                table,
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint,
            }]
            : []);
        if (queryErrors.length) {
            console.error("Supabase dashboard queries failed", queryErrors);
            throw new Error("No se pudieron consultar las tablas de Supabase.");
        }

        const seasonStats = new Map<string, PlayerSeasonTotals>();
        const matchStats = new Map<string, Player["matchStats"]>();
        for (const record of (statsResult.data ?? []) as unknown as PlayerStatsRecord[]) {
            const total = seasonStats.get(record.jugador_id) ?? {
                jugador_id: record.jugador_id,
                goles: 0,
                asistencias: 0,
                penaltis_marcados: 0,
                penaltis_tirados: 0,
                dobles_penaltis_marcados: 0,
                dobles_penaltis_tirados: 0,
                faltas_directas_marcadas: 0,
                amarillas: 0,
                rojas: 0,
            };
            total.goles += record.goles;
            total.asistencias += record.asistencias;
            total.penaltis_marcados += record.penaltis_marcados;
            total.penaltis_tirados += record.penaltis_tirados;
            total.dobles_penaltis_marcados += record.dobles_penaltis_marcados;
            total.dobles_penaltis_tirados += record.dobles_penaltis_tirados;
            total.faltas_directas_marcadas += record.faltas_directas_marcadas;
            total.amarillas += record.amarillas;
            total.rojas += record.rojas;
            seasonStats.set(record.jugador_id, total);
            if (record.partidos) {
                const fixture = record.partidos;
                const opponent = fixture.equipo_local === FEATURED_TEAM ? fixture.equipo_visitante : fixture.equipo_local;
                const date = fixture.fecha
                    ? new Date(fixture.fecha).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "short" }).toUpperCase()
                    : fixture.fecha_prevista
                        ? new Date(`${fixture.fecha_prevista}T12:00:00`).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "short" }).toUpperCase()
                        : "";
                const detail = matchStats.get(record.jugador_id) ?? [];
                detail.push({
                    label: `J${fixture.jornada}${date ? ` · ${date}` : ""} vs ${opponent}`,
                    goals: record.goles,
                    assists: record.asistencias,
                    penalties: `${record.penaltis_marcados}/${record.penaltis_tirados}`,
                    doublePenalties: `${record.dobles_penaltis_marcados}/${record.dobles_penaltis_tirados}`,
                    directFreeKicks: record.faltas_directas_marcadas,
                    cards: `${record.amarillas}A ${record.rojas}R`,
                });
                matchStats.set(record.jugador_id, detail);
            }
        }
        const callupCounts = new Map<string, number>();
        const matchCallups = new Map<string, Set<string>>();
        for (const callup of (callupResult.data ?? []) as unknown as CallupRecord[]) {
            if (callup.convocado) callupCounts.set(callup.jugador_id, (callupCounts.get(callup.jugador_id) ?? 0) + 1);
            const players = matchCallups.get(callup.partido_id) ?? new Set<string>();
            if (callup.convocado) players.add(callup.jugador_id);
            matchCallups.set(callup.partido_id, players);
        }
        const squad: Player[] = ((playerResult.data ?? []) as unknown as PlayerRecord[]).map((player) => {
            const totals = seasonStats.get(player.id);
            const yellow = totals?.amarillas ?? 0;
            const red = totals?.rojas ?? 0;
            return {
                id: player.id,
                name: player.nombre,
                position: player.posicion || "Por definir",
                number: player.dorsal,
                photo: player.foto_url,
                video: player.video_url,
                goals: totals?.goles ?? 0,
                assists: totals?.asistencias ?? 0,
                games: callupCounts.get(player.id) ?? 0,
                cards: `${yellow}A ${red}R`,
                penalties: `${totals?.penaltis_marcados ?? 0}/${totals?.penaltis_tirados ?? 0}`,
                doublePenalties: `${totals?.dobles_penaltis_marcados ?? 0}/${totals?.dobles_penaltis_tirados ?? 0}`,
                directFreeKicks: totals?.faltas_directas_marcadas ?? 0,
                matchStats: matchStats.get(player.id),
            };
        });
        const results: MatchItem[] = (matchResult.data ?? [])
            .filter((match) => match.equipo_local === FEATURED_TEAM || match.equipo_visitante === FEATURED_TEAM)
            .map((match) => {
                const confirmedDate = match.fecha ? new Date(match.fecha) : null;
                const upcoming = confirmedDate
                    ? confirmedDate.getTime() >= Date.now()
                    : !match.fecha_prevista || new Date(`${match.fecha_prevista}T23:59:59`).getTime() >= Date.now();
                const status = match.estado === "finalizado" ? "done" : upcoming ? "next" : "pending";
                const dateText = confirmedDate
                    ? `${confirmedDate.toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", weekday: "short", day: "2-digit", month: "short" }).toUpperCase()} · ${confirmedDate.toLocaleTimeString("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" })}${match.campo ? ` · ${match.campo}` : ""}`
                    : match.fecha_prevista
                        ? `PREVISIÓN FIN DE SEMANA DEL ${new Date(`${match.fecha_prevista}T12:00:00`).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "short" }).toUpperCase()} · HORA Y CAMPO POR CONFIRMAR`
                        : "FECHA Y CAMPO POR CONFIRMAR";
                return {
                    key: match.id,
                    date: `${dateText} · ${status === "done" ? "FINAL" : status === "pending" ? "PENDIENTE" : "PRÓXIMO"}`,
                    home: match.equipo_local,
                    away: match.equipo_visitante,
                    callupPhotoUrl: match.foto_convocatoria_url,
                    score: match.goles_local === null || match.goles_visitante === null ? status === "pending" ? "PENDIENTE" : "PRÓXIMO" : `${match.goles_local} — ${match.goles_visitante}`,
                    status,
                    callups: matchCallups.has(match.id)
                        ? squad.map((player) => ({ name: player.name, calledUp: matchCallups.get(match.id)?.has(player.id) ?? false }))
                        : undefined,
                };
            });
        const table: Standing[] = (tableResult.data ?? []).map((team) => ({
            position: team.posicion,
            name: team.equipo,
            played: team.jugados,
            won: team.ganados,
            drawn: team.empatados,
            lost: team.perdidos,
            goalsFor: team.goles_favor,
            goalsAgainst: team.goles_contra,
            goalDifference: team.diferencia,
            points: team.puntos,
        }));
        return <TeamDashboard squad={squad} results={results} table={table} dataState="ready" />;
    } catch (error) {
        if (error instanceof Error && "digest" in error && error.digest === "DYNAMIC_SERVER_USAGE") throw error;
        console.error("Failed to load team dashboard", error);
        return <TeamDashboard squad={[]} results={[]} table={[]} dataState="error" />;
    }
}