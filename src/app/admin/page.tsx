import { redirect } from "next/navigation";
import { AdminImporter } from "@/components/admin-importer";
import type { CallupFormMatch } from "@/components/admin-callup-form";
import type { MediaMatch, MediaPlayer } from "@/components/admin-media-manager";
import { ACTIVE_PHASE, ACTIVE_SEASON, isFeaturedMatch } from "@/lib/config";
import { madridDate, madridTime } from "@/lib/madrid-time";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminPage() {
    const sessionClient = await createSupabaseServerClient();
    const { data: { user } } = await sessionClient.auth.getUser();
    if (!user) redirect("/login?next=%2Fadmin");

    const adminClient = createSupabaseAdminClient();
    const { data: profile } = await adminClient.from("perfiles").select("rol").eq("id", user.id).single();
    if (profile?.rol !== "admin") redirect("/");

    const [matchResult, playerResult, callupResult] = await Promise.all([
        adminClient
            .from("partidos")
            .select("id,jornada,fecha,campo,equipo_local,equipo_visitante,goles_local,goles_visitante,jugador_katsu_id,cronica,foto_convocatoria_url")
            .eq("temporada", ACTIVE_SEASON)
            .eq("fase", ACTIVE_PHASE)
            .order("jornada"),
        adminClient
            .from("jugadores")
            .select("id,nombre,dorsal,lesionado,descripcion_lesion,foto_url,video_url")
            .eq("activo", true)
            .order("dorsal", { nullsFirst: false }),
        adminClient
            .from("convocatorias")
            .select("partido_id,jugador_id,convocado,partidos!inner(temporada,fase)")
            .eq("partidos.temporada", ACTIVE_SEASON)
            .eq("partidos.fase", ACTIVE_PHASE),
    ]);
    const queryErrors = [
        { resource: "partidos para administración", error: matchResult.error },
        { resource: "jugadores para administración", error: playerResult.error },
        { resource: "convocatorias para administración", error: callupResult.error },
    ].filter(({ error }) => error);
    if (queryErrors.length) {
        console.error("Could not load match administration data", queryErrors);
        throw new Error("No se pudieron cargar los partidos y jugadores para administración.");
    }
    const featuredMatches = (matchResult.data ?? []).filter(isFeaturedMatch);
    const katsuMatches = featuredMatches.map((match) => ({
        id: match.id,
        jornada: match.jornada,
        home: match.equipo_local,
        away: match.equipo_visitante,
        score: match.goles_local === null || match.goles_visitante === null
            ? null
            : `${match.goles_local} — ${match.goles_visitante}`,
        playerId: match.jugador_katsu_id,
    }));
    const chronicleMatches = featuredMatches.map((match) => ({
        id: match.id,
        jornada: match.jornada,
        home: match.equipo_local,
        away: match.equipo_visitante,
        chronicle: match.cronica,
    }));
    const callupsByMatch = new Map<string, Record<string, boolean>>();
    for (const callup of callupResult.data ?? []) {
        callupsByMatch.set(callup.partido_id, { ...callupsByMatch.get(callup.partido_id), [callup.jugador_id]: callup.convocado });
    }
    const callupMatches: CallupFormMatch[] = featuredMatches.map((match) => ({
        id: match.id,
        jornada: match.jornada,
        home: match.equipo_local,
        away: match.equipo_visitante,
        date: match.fecha ? madridDate(match.fecha) : "",
        time: match.fecha ? madridTime(match.fecha) : "",
        field: match.campo ?? "",
        played: match.goles_local !== null && match.goles_visitante !== null,
        callups: callupsByMatch.get(match.id) ?? null,
    }));
    const mediaMatches: MediaMatch[] = featuredMatches.map((match) => ({
        id: match.id,
        jornada: match.jornada,
        home: match.equipo_local,
        away: match.equipo_visitante,
        photo: match.foto_convocatoria_url,
    }));
    const katsuPlayers = (playerResult.data ?? []).map((player) => ({
        id: player.id,
        name: player.nombre,
        number: player.dorsal,
    }));
    const injuryPlayers = (playerResult.data ?? []).map((player) => ({
        id: player.id,
        name: player.nombre,
        number: player.dorsal,
        injured: player.lesionado,
        injuryDescription: player.descripcion_lesion,
    }));
    const mediaPlayers: MediaPlayer[] = (playerResult.data ?? []).map((player) => ({
        id: player.id,
        name: player.nombre,
        number: player.dorsal,
        photo: player.foto_url,
        video: player.video_url,
    }));

    return (
        <AdminImporter
            katsuMatches={katsuMatches}
            katsuPlayers={katsuPlayers}
            injuryPlayers={injuryPlayers}
            chronicleMatches={chronicleMatches}
            callupMatches={callupMatches}
            mediaMatches={mediaMatches}
            mediaPlayers={mediaPlayers}
        />
    );
}
