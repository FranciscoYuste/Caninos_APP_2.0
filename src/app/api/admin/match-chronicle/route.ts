import { NextResponse } from "next/server";
import { ACTIVE_PHASE, ACTIVE_SEASON, isFeaturedMatch } from "@/lib/config";
import { requireAdmin } from "@/lib/supabase/require-admin";

export const runtime = "nodejs";

const MATCH_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_CHRONICLE_LENGTH = 100000;

export async function POST(request: Request) {
    try {
        const authorization = await requireAdmin();
        if ("response" in authorization) return authorization.response;
        const { adminClient } = authorization;

        const body = await request.json() as { partido_id?: unknown; cronica?: unknown };
        const matchId = typeof body.partido_id === "string" ? body.partido_id : "";
        if (!MATCH_ID_PATTERN.test(matchId)) {
            return NextResponse.json({ error: "El partido indicado no es válido." }, { status: 400 });
        }
        if (typeof body.cronica !== "string" || body.cronica.length > MAX_CHRONICLE_LENGTH) {
            return NextResponse.json({ error: "La crónica debe ser un texto de hasta 100.000 caracteres." }, { status: 400 });
        }

        const { data: match, error: matchError } = await adminClient
            .from("partidos")
            .select("temporada,fase,equipo_local,equipo_visitante")
            .eq("id", matchId)
            .maybeSingle();
        if (matchError) {
            console.error("Could not verify match for chronicle", matchError);
            return NextResponse.json({ error: "No se pudo consultar el partido." }, { status: 500 });
        }
        if (!match) return NextResponse.json({ error: "No existe el partido indicado." }, { status: 404 });
        if (match.temporada !== ACTIVE_SEASON || match.fase !== ACTIVE_PHASE || !isFeaturedMatch(match)) {
            return NextResponse.json({ error: `Solo se pueden editar crónicas de partidos de los Caninos en la competición activa (${ACTIVE_SEASON}).` }, { status: 400 });
        }

        const { error: updateError } = await adminClient
            .from("partidos")
            .update({ cronica: body.cronica.trim() || null })
            .eq("id", matchId);
        if (updateError) {
            console.error("Could not save match chronicle", updateError);
            return NextResponse.json({ error: "No se pudo guardar la crónica." }, { status: 500 });
        }
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Match chronicle update failed", error);
        const message = error instanceof Error ? error.message : "No se pudo actualizar la crónica.";
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
