import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const FEATURED_TEAM = "Bayern D.L.Caninos";
const MATCH_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
    try {
        const sessionClient = await createSupabaseServerClient();
        const { data: { user } } = await sessionClient.auth.getUser();
        if (!user) return NextResponse.json({ error: "Inicia sesión para continuar." }, { status: 401 });

        const adminClient = createSupabaseAdminClient();
        const { data: profile, error: profileError } = await adminClient
            .from("perfiles").select("rol").eq("id", user.id).single();
        if (profileError || profile?.rol !== "admin") {
            return NextResponse.json({ error: "Se requiere el rol de administrador." }, { status: 403 });
        }

        const body = await request.json() as { partido_id?: unknown; jugador_id?: unknown };
        const matchId = typeof body.partido_id === "string" ? body.partido_id : "";
        const playerId = body.jugador_id === null ? null : typeof body.jugador_id === "string" ? body.jugador_id : undefined;
        if (!MATCH_ID_PATTERN.test(matchId)) {
            return NextResponse.json({ error: "El partido indicado no es válido." }, { status: 400 });
        }
        if (playerId === undefined || (playerId !== null && !MATCH_ID_PATTERN.test(playerId))) {
            return NextResponse.json({ error: "El jugador indicado no es válido." }, { status: 400 });
        }

        const { data: match, error: matchError } = await adminClient
            .from("partidos")
            .select("temporada,fase,equipo_local,equipo_visitante")
            .eq("id", matchId)
            .maybeSingle();
        if (matchError) {
            console.error("Could not verify KATSU match", matchError);
            return NextResponse.json({ error: "No se pudo consultar el partido." }, { status: 500 });
        }
        if (!match) return NextResponse.json({ error: "No existe el partido indicado." }, { status: 404 });
        if (match.temporada !== "2026-2027" || match.fase !== "campeon_invierno" ||
            (match.equipo_local !== FEATURED_TEAM && match.equipo_visitante !== FEATURED_TEAM)) {
            return NextResponse.json({ error: "Solo se puede asignar KATSU a partidos del Bayern en la liga de invierno 2026-2027." }, { status: 400 });
        }

        if (playerId) {
            const { data: player, error: playerError } = await adminClient
                .from("jugadores")
                .select("id")
                .eq("id", playerId)
                .eq("activo", true)
                .maybeSingle();
            if (playerError) {
                console.error("Could not verify KATSU player", playerError);
                return NextResponse.json({ error: "No se pudo consultar el jugador." }, { status: 500 });
            }
            if (!player) return NextResponse.json({ error: "El jugador no existe o no está activo." }, { status: 400 });
        }

        const { error: updateError } = await adminClient
            .from("partidos")
            .update({ jugador_katsu_id: playerId })
            .eq("id", matchId);
        if (updateError) {
            console.error("Could not save KATSU player", updateError);
            return NextResponse.json({ error: "No se pudo guardar el jugador KATSU." }, { status: 500 });
        }
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("KATSU player update failed", error);
        const message = error instanceof Error ? error.message : "No se pudo actualizar el jugador KATSU.";
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
