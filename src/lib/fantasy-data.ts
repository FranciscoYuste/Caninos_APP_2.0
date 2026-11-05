import { cache } from "react";
import { FEATURED_TEAM, isFeaturedMatch } from "@/lib/config";
import { buildFantasyRanking, isFantasyAbsence, type FantasyInputMatch, type FantasyInputRow, type FantasyPlayerRow, type FantasyStats } from "@/lib/fantasy";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type StatsRecord = FantasyStats & { partido_id: string; jugador_id: string };

// Ranking fantasy de una competición. Devuelve null si falla la consulta (p. ej. sin la migración).
export const getFantasyRanking = cache(async (season: string, phase: string, group: string): Promise<FantasyPlayerRow[] | null> => {
    try {
        const supabase = await createSupabaseServerClient();
        const [playerResult, matchResult, callupResult, statsResult, fantasyResult] = await Promise.all([
            supabase.from("jugadores").select("id,nombre,dorsal,posicion,activo"),
            supabase.from("partidos").select("id,jornada,equipo_local,equipo_visitante,goles_local,goles_visitante,jugador_katsu_id,dobles_penaltis_en_contra").eq("temporada", season).eq("fase", phase).eq("grupo", group),
            supabase.from("convocatorias").select("partido_id,jugador_id,convocado,partidos!inner(temporada,fase,grupo)").eq("partidos.temporada", season).eq("partidos.fase", phase).eq("partidos.grupo", group),
            supabase.from("estadisticas").select("partido_id,jugador_id,goles,asistencias,penaltis_marcados,penaltis_tirados,dobles_penaltis_marcados,dobles_penaltis_tirados,amarillas,rojas,partidos!inner(temporada,fase,grupo)").eq("partidos.temporada", season).eq("partidos.fase", phase).eq("partidos.grupo", group),
            supabase.from("fantasy_partido").select("partido_id,jugador_id,ausencia,portero,penaltis_provocados,penaltis_cometidos,penaltis_cometidos_gol,penaltis_parados,dobles_penaltis_parados,goles_propia,partidos!inner(temporada,fase,grupo)").eq("partidos.temporada", season).eq("partidos.fase", phase).eq("partidos.grupo", group),
        ]);
        const failed = [playerResult, matchResult, callupResult, statsResult, fantasyResult].find((result) => result.error);
        if (failed?.error) {
            console.error("Fantasy queries failed", failed.error);
            return null;
        }

        const calledUpByMatch = new Map<string, Set<string>>();
        for (const callup of callupResult.data ?? []) {
            const set = calledUpByMatch.get(callup.partido_id) ?? new Set<string>();
            if (callup.convocado) set.add(callup.jugador_id);
            calledUpByMatch.set(callup.partido_id, set);
        }
        const matches: FantasyInputMatch[] = (matchResult.data ?? [])
            .filter((match) => isFeaturedMatch(match) && match.goles_local !== null && match.goles_visitante !== null && calledUpByMatch.has(match.id))
            .map((match) => {
                const home = match.equipo_local === FEATURED_TEAM;
                return {
                    id: match.id,
                    jornada: match.jornada,
                    opponent: home ? match.equipo_visitante : match.equipo_local,
                    score: `${match.goles_local}-${match.goles_visitante}`,
                    conceded: (home ? match.goles_visitante : match.goles_local) ?? 0,
                    katsuId: match.jugador_katsu_id,
                    doublePenaltiesAgainst: match.dobles_penaltis_en_contra ?? 0,
                    calledUp: calledUpByMatch.get(match.id) ?? new Set<string>(),
                };
            });
        const stats = new Map<string, FantasyStats>();
        for (const record of (statsResult.data ?? []) as unknown as StatsRecord[]) stats.set(`${record.partido_id}:${record.jugador_id}`, record);
        const rows = ((fantasyResult.data ?? []) as unknown as FantasyInputRow[])
            .map((row) => ({ ...row, ausencia: isFantasyAbsence(row.ausencia) ? row.ausencia : null }));
        // Plantilla de la competición: activos y quienes fueron convocados alguna vez en ella.
        const calledUpAnywhere = new Set(matches.flatMap((match) => [...match.calledUp]));
        const players = (playerResult.data ?? [])
            .filter((player) => player.activo || calledUpAnywhere.has(player.id))
            .map((player) => ({ id: player.id, name: player.nombre, number: player.dorsal, position: player.posicion, active: player.activo }));

        return buildFantasyRanking({ players, matches, stats, rows });
    } catch (error) {
        if (error instanceof Error && "digest" in error && error.digest === "DYNAMIC_SERVER_USAGE") throw error;
        console.error("Failed to load fantasy ranking", error);
        return null;
    }
});
