import { cache } from "react";
import type { KatsuCard, MatchItem, Player, RoundMatchItem, Standing } from "@/lib/team-types";
import { FEATURED_TEAM, isFeaturedMatch } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PlayerRecord = {
    id: string; nombre: string; posicion: string; dorsal: number | null; activo: boolean; foto_url: string | null; video_url: string | null; lesionado: boolean; descripcion_lesion: string | null;
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

export type TeamData = {
    squad: Player[];
    results: MatchItem[];
    roundMatches: RoundMatchItem[];
    table: Standing[];
    katsuCards: KatsuCard[];
};

// Carga los datos públicos de una competición (temporada + fase + grupo). cache() hace que el
// layout y la página de una misma petición compartan una sola tanda de consultas.
export const getTeamData = cache(async (season: string, phase: string, group: string): Promise<TeamData | null> => {
    try {
        const supabase = await createSupabaseServerClient();
        const temporada = season;
        const [playerResult, matchResult, tableResult, callupResult, statsResult] = await Promise.all([
            supabase.from("jugadores").select("id,nombre,posicion,dorsal,activo,foto_url,video_url,lesionado,descripcion_lesion").order("dorsal", { nullsFirst: false }),
            supabase.from("partidos").select("id,jornada,fecha,fecha_prevista,campo,equipo_local,equipo_visitante,goles_local,goles_visitante,estado,foto_convocatoria_url,jugador_katsu_id,cronica").eq("temporada", temporada).eq("fase", phase).eq("grupo", group).order("fecha_prevista"),
            supabase.from("clasificacion").select("equipo,posicion,jugados,ganados,empatados,perdidos,goles_favor,goles_contra,diferencia,puntos").eq("temporada", temporada).eq("fase", phase).eq("grupo", group).order("posicion"),
            supabase.from("convocatorias").select("partido_id,jugador_id,convocado,partidos!inner(temporada,fase,grupo)").eq("partidos.temporada", temporada).eq("partidos.fase", phase).eq("partidos.grupo", group),
            supabase.from("estadisticas").select("jugador_id,goles,asistencias,penaltis_marcados,penaltis_tirados,dobles_penaltis_marcados,dobles_penaltis_tirados,faltas_directas_marcadas,amarillas,rojas,partidos!inner(jornada,fecha,fecha_prevista,equipo_local,equipo_visitante,temporada,fase,grupo)").eq("partidos.temporada", temporada).eq("partidos.fase", phase).eq("partidos.grupo", group),
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
                    jornada: fixture.jornada,
                    label: `J${fixture.jornada}${date ? ` · ${date}` : ""} vs ${opponent}`,
                    goals: record.goles,
                    assists: record.asistencias,
                    penalties: `${record.penaltis_marcados}/${record.penaltis_tirados}`,
                    doublePenalties: `${record.dobles_penaltis_marcados}/${record.dobles_penaltis_tirados}`,
                    directFreeKicks: record.faltas_directas_marcadas,
                    yellowCards: record.amarillas,
                    redCards: record.rojas,
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
        // Jornadas en las que cada jugador fue KATSU, para su carta.
        const katsuRounds = new Map<string, number[]>();
        for (const match of (matchResult.data ?? []).filter(isFeaturedMatch)) {
            if (match.jugador_katsu_id) katsuRounds.set(match.jugador_katsu_id, [...(katsuRounds.get(match.jugador_katsu_id) ?? []), match.jornada]);
        }
        // Plantilla: jugadores activos y, en temporadas pasadas, también quienes ya no están pero jugaron esta competición.
        const squad: Player[] = ((playerResult.data ?? []) as unknown as PlayerRecord[])
            .filter((player) => player.activo || callupCounts.has(player.id))
            .map((player) => {
            const totals = seasonStats.get(player.id);
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
                yellowCards: totals?.amarillas ?? 0,
                redCards: totals?.rojas ?? 0,
                penalties: `${totals?.penaltis_marcados ?? 0}/${totals?.penaltis_tirados ?? 0}`,
                doublePenalties: `${totals?.dobles_penaltis_marcados ?? 0}/${totals?.dobles_penaltis_tirados ?? 0}`,
                directFreeKicks: totals?.faltas_directas_marcadas ?? 0,
                injured: player.lesionado,
                injuryDescription: player.descripcion_lesion,
                katsuRounds: (katsuRounds.get(player.id) ?? []).sort((a, b) => a - b),
                matchStats: matchStats.get(player.id)?.sort((a, b) => a.jornada - b.jornada),
            };
        });
        const roundMatches: RoundMatchItem[] = (matchResult.data ?? []).map((match) => ({
            key: match.id,
            jornada: match.jornada,
            home: match.equipo_local,
            away: match.equipo_visitante,
            homeGoals: match.goles_local,
            awayGoals: match.goles_visitante,
            score: match.goles_local === null || match.goles_visitante === null
                ? "PENDIENTE"
                : `${match.goles_local} — ${match.goles_visitante}`,
        }));
        const now = Date.now();
        const results: MatchItem[] = (matchResult.data ?? [])
            .filter(isFeaturedMatch)
            .map((match) => {
                const confirmedDate = match.fecha ? new Date(match.fecha) : null;
                const upcoming = confirmedDate
                    ? confirmedDate.getTime() >= now
                    : !match.fecha_prevista || new Date(`${match.fecha_prevista}T23:59:59`).getTime() >= now;
                const status = match.estado === "finalizado" ? "done" : upcoming ? "next" : "pending";
                const dateText = confirmedDate
                    ? `${confirmedDate.toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", weekday: "short", day: "2-digit", month: "short" }).toUpperCase()} · ${confirmedDate.toLocaleTimeString("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" })}${match.campo ? ` · ${match.campo}` : ""}`
                    : match.fecha_prevista
                        ? `PREVISIÓN FIN DE SEMANA DEL ${new Date(`${match.fecha_prevista}T12:00:00`).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "short" }).toUpperCase()} · HORA Y CAMPO POR CONFIRMAR`
                        : "FECHA Y CAMPO POR CONFIRMAR";
                return {
                    key: match.id,
                    jornada: match.jornada,
                    date: `${dateText} · ${status === "done" ? "FINAL" : status === "pending" ? "PENDIENTE" : "PRÓXIMO"}`,
                    startsAt: match.fecha,
                    field: match.campo,
                    home: match.equipo_local,
                    away: match.equipo_visitante,
                    chronicle: match.cronica,
                    callupPhotoUrl: match.foto_convocatoria_url,
                    finalScore: match.goles_local === null || match.goles_visitante === null
                        ? null
                        : `${match.goles_local} — ${match.goles_visitante}`,
                    score: match.goles_local === null || match.goles_visitante === null ? status === "pending" ? "PENDIENTE" : "PRÓXIMO" : `${match.goles_local} — ${match.goles_visitante}`,
                    status,
                    callups: matchCallups.has(match.id)
                        ? squad.map((player) => ({ name: player.name, calledUp: matchCallups.get(match.id)?.has(player.id) ?? false }))
                        : undefined,
                };
            });
        const playerById = new Map(squad.map((player) => [player.id, player]));
        const katsuCards: KatsuCard[] = (matchResult.data ?? [])
            .filter(isFeaturedMatch)
            .flatMap((match) => {
                const player = match.jugador_katsu_id ? playerById.get(match.jugador_katsu_id) : undefined;
                if (!player) return [];
                return [{
                    key: match.id,
                    season: temporada,
                    jornada: match.jornada,
                    home: match.equipo_local,
                    away: match.equipo_visitante,
                    score: match.goles_local === null || match.goles_visitante === null
                        ? null
                        : `${match.goles_local} — ${match.goles_visitante}`,
                    player,
                }];
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
        return { squad, results, roundMatches, table, katsuCards };
    } catch (error) {
        if (error instanceof Error && "digest" in error && error.digest === "DYNAMIC_SERVER_USAGE") throw error;
        console.error("Failed to load team dashboard", error);
        return null;
    }
});
export function getEmptyMessage(data: TeamData | null): string {
    return data
        ? "Todavía no hay registros en Supabase."
        : "No se pudieron cargar datos. Revisa la conexión y las migraciones de Supabase.";
}
