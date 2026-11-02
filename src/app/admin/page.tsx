import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/admin-panel";
import type { HubMatch } from "@/components/admin-match-hub";
import type { MediaPlayer } from "@/components/admin-media";
import type { ResultMatch } from "@/components/admin-results-editor";
import type { RosterPlayer } from "@/components/admin-roster-manager";
import { loadAdminCompetitions } from "@/lib/admin-competition";
import { isFeaturedMatch } from "@/lib/config";
import { madridDate, madridTime } from "@/lib/madrid-time";
import { EMPTY_STAT_LINE, MATCH_STAT_FIELDS, type MatchStatLine } from "@/lib/players";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const STAT_COLUMNS = MATCH_STAT_FIELDS.map(({ key }) => key).join(",");

// «sáb 8 nov · 18:00» si el horario está confirmado; si no, la fecha prevista.
function scheduleLabel(confirmed: string | null, planned: string | null): string {
    const date = (value: string) => new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", weekday: "short", day: "numeric", month: "short" }).format(new Date(value));
    if (confirmed) return `${date(confirmed)} · ${madridTime(confirmed)}`;
    if (planned) return `Previsto ${date(planned)} · horario sin confirmar`;
    return "Fecha sin confirmar";
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ competicion?: string }> }) {
    const sessionClient = await createSupabaseServerClient();
    const { data: { user } } = await sessionClient.auth.getUser();
    if (!user) redirect("/login?next=%2Fadmin");

    const adminClient = createSupabaseAdminClient();
    const { data: profile } = await adminClient.from("perfiles").select("rol").eq("id", user.id).single();
    if (profile?.rol !== "admin") redirect("/");

    // Competición que se gestiona: la elegida en el selector o, por defecto, la que está en curso.
    const competitions = await loadAdminCompetitions(adminClient);
    const requestedId = (await searchParams).competicion;
    const competition = competitions.find((item) => item.id === requestedId)
        ?? competitions.find((item) => item.status === "en_curso")
        ?? competitions[0];
    if (!competition) throw new Error("No hay competiciones dadas de alta. Ejecuta la migración de competiciones.");

    const [matchResult, playerResult, callupResult, statsResult, teamResult] = await Promise.all([
        adminClient
            .from("partidos")
            .select("id,jornada,fecha,fecha_prevista,campo,equipo_local,equipo_visitante,goles_local,goles_visitante,jugador_katsu_id,cronica,foto_convocatoria_url")
            .eq("temporada", competition.season)
            .eq("fase", competition.phase)
            .eq("grupo", competition.group)
            .order("jornada")
            .order("fecha_prevista"),
        adminClient
            .from("jugadores")
            .select("id,nombre,dorsal,posicion,activo,lesionado,descripcion_lesion,foto_url,video_url")
            .order("dorsal", { nullsFirst: false })
            .order("nombre"),
        adminClient
            .from("convocatorias")
            .select("partido_id,jugador_id,convocado,partidos!inner(temporada,fase,grupo)")
            .eq("partidos.temporada", competition.season)
            .eq("partidos.fase", competition.phase)
            .eq("partidos.grupo", competition.group),
        adminClient
            .from("estadisticas")
            .select(`partido_id,jugador_id,${STAT_COLUMNS},partidos!inner(temporada,fase,grupo)`)
            .eq("partidos.temporada", competition.season)
            .eq("partidos.fase", competition.phase)
            .eq("partidos.grupo", competition.group),
        adminClient.from("equipos").select("codigo,nombre").order("codigo"),
    ]);
    const queryErrors = [
        { resource: "partidos para administración", error: matchResult.error },
        { resource: "jugadores para administración", error: playerResult.error },
        { resource: "convocatorias para administración", error: callupResult.error },
        { resource: "estadísticas para administración", error: statsResult.error },
        { resource: "equipos para administración", error: teamResult.error },
    ].filter(({ error }) => error);
    if (queryErrors.length) {
        console.error("Could not load match administration data", queryErrors);
        throw new Error("No se pudieron cargar los partidos y jugadores para administración.");
    }

    const matches = matchResult.data ?? [];
    const callupsByMatch = new Map<string, Record<string, boolean>>();
    for (const callup of callupResult.data ?? []) {
        callupsByMatch.set(callup.partido_id, { ...callupsByMatch.get(callup.partido_id), [callup.jugador_id]: callup.convocado });
    }
    const statsByMatch = new Map<string, Record<string, MatchStatLine>>();
    for (const row of (statsResult.data ?? []) as unknown as Array<Record<string, unknown> & { partido_id: string; jugador_id: string }>) {
        const line = Object.fromEntries(MATCH_STAT_FIELDS.map(({ key }) => [key, Number(row[key] ?? 0)])) as MatchStatLine;
        statsByMatch.set(row.partido_id, { ...statsByMatch.get(row.partido_id), [row.jugador_id]: { ...EMPTY_STAT_LINE, ...line } });
    }

    const roundMatches: ResultMatch[] = matches.map((match) => ({
        id: match.id,
        jornada: match.jornada,
        home: match.equipo_local,
        away: match.equipo_visitante,
        homeGoals: match.goles_local,
        awayGoals: match.goles_visitante,
        kickoff: match.fecha ?? match.fecha_prevista,
    }));
    const hubMatches: HubMatch[] = matches.filter(isFeaturedMatch).map((match) => ({
        id: match.id,
        jornada: match.jornada,
        home: match.equipo_local,
        away: match.equipo_visitante,
        kickoff: match.fecha ?? match.fecha_prevista,
        scheduleLabel: scheduleLabel(match.fecha, match.fecha_prevista) + (match.campo ? ` · ${match.campo}` : ""),
        date: match.fecha ? madridDate(match.fecha) : "",
        time: match.fecha ? madridTime(match.fecha) : "",
        field: match.campo ?? "",
        homeGoals: match.goles_local,
        awayGoals: match.goles_visitante,
        callups: callupsByMatch.get(match.id) ?? null,
        stats: statsByMatch.get(match.id) ?? {},
        katsuId: match.jugador_katsu_id,
        chronicle: match.cronica,
        photo: match.foto_convocatoria_url,
    }));

    const allPlayers = playerResult.data ?? [];
    const activePlayers = allPlayers.filter((player) => player.activo);
    const roster: RosterPlayer[] = allPlayers.map((player) => ({
        id: player.id,
        name: player.nombre,
        number: player.dorsal,
        position: player.posicion,
        active: player.activo,
    }));
    const mediaPlayers: MediaPlayer[] = activePlayers.map((player) => ({
        id: player.id,
        name: player.nombre,
        number: player.dorsal,
        photo: player.foto_url,
        video: player.video_url,
    }));

    return (
        <AdminPanel
            key={competition.id}
            competition={competition}
            competitions={competitions}
            teams={(teamResult.data ?? []).map((team) => ({ code: team.codigo, name: team.nombre }))}
            hubMatches={hubMatches}
            roundMatches={roundMatches}
            players={activePlayers.map((player) => ({ id: player.id, name: player.nombre, number: player.dorsal }))}
            roster={roster}
            injuryPlayers={activePlayers.map((player) => ({
                id: player.id,
                name: player.nombre,
                number: player.dorsal,
                injured: player.lesionado,
                injuryDescription: player.descripcion_lesion,
            }))}
            mediaPlayers={mediaPlayers}
        />
    );
}
