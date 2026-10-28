import { redirect } from "next/navigation";
import { AdminImporter } from "@/components/admin-importer";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminPage() {
    const sessionClient = await createSupabaseServerClient();
    const { data: { user } } = await sessionClient.auth.getUser();
    if (!user) redirect("/login?next=%2Fadmin");

    const adminClient = createSupabaseAdminClient();
    const { data: profile } = await adminClient.from("perfiles").select("rol").eq("id", user.id).single();
    if (profile?.rol !== "admin") redirect("/");

    const [matchResult, playerResult] = await Promise.all([
        adminClient
            .from("partidos")
            .select("id,jornada,equipo_local,equipo_visitante,goles_local,goles_visitante,jugador_katsu_id,cronica")
            .eq("temporada", "2026-2027")
            .eq("fase", "campeon_invierno")
            .order("jornada"),
        adminClient
            .from("jugadores")
            .select("id,nombre,dorsal,lesionado,descripcion_lesion")
            .eq("activo", true)
            .order("dorsal", { nullsFirst: false }),
    ]);
    const queryErrors = [
        { resource: "partidos para administración", error: matchResult.error },
        { resource: "jugadores para KATSU", error: playerResult.error },
    ].filter(({ error }) => error);
    if (queryErrors.length) {
        console.error("Could not load match administration data", queryErrors);
        throw new Error("No se pudieron cargar los partidos y jugadores para administración.");
    }
    const katsuMatches = (matchResult.data ?? [])
        .filter((match) => match.equipo_local === "Bayern D.L.Caninos" || match.equipo_visitante === "Bayern D.L.Caninos")
        .map((match) => ({
            id: match.id,
            jornada: match.jornada,
            home: match.equipo_local,
            away: match.equipo_visitante,
            score: match.goles_local === null || match.goles_visitante === null
                ? null
                : `${match.goles_local} — ${match.goles_visitante}`,
            playerId: match.jugador_katsu_id,
        }));
    const chronicleMatches = (matchResult.data ?? [])
        .filter((match) => match.equipo_local === "Bayern D.L.Caninos" || match.equipo_visitante === "Bayern D.L.Caninos")
        .map((match) => ({
        id: match.id,
        jornada: match.jornada,
        home: match.equipo_local,
        away: match.equipo_visitante,
        chronicle: match.cronica,
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

    return <AdminImporter katsuMatches={katsuMatches} katsuPlayers={katsuPlayers} injuryPlayers={injuryPlayers} chronicleMatches={chronicleMatches} />;
}