import { NextResponse } from "next/server";
import { isManagedMatch } from "@/lib/admin-competition";
import { isFeaturedMatch } from "@/lib/config";
import { requireAdmin } from "@/lib/supabase/require-admin";

export const runtime = "nodejs";

const MATCH_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
    try {
        const authorization = await requireAdmin();
        if ("response" in authorization) return authorization.response;
        const { adminClient } = authorization;

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
            .select("temporada,fase,grupo,equipo_local,equipo_visitante")
            .eq("id", matchId)
            .maybeSingle();
        if (matchError) {
            console.error("Could not verify KATSU match", matchError);
            return NextResponse.json({ error: "No se pudo consultar el partido." }, { status: 500 });
        }
        if (!match) return NextResponse.json({ error: "No existe el partido indicado." }, { status: 404 });
        if (!isFeaturedMatch(match) || !(await isManagedMatch(adminClient, match))) {
            return NextResponse.json({ error: "Solo se puede asignar KATSU a partidos del Bayern de una competición dada de alta." }, { status: 400 });
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
