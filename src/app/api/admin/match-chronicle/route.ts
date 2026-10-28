import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const FEATURED_TEAM = "Bayern D.L.Caninos";
const MATCH_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_CHRONICLE_LENGTH = 100000;

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
        if (match.temporada !== "2026-2027" || match.fase !== "campeon_invierno" ||
            (match.equipo_local !== FEATURED_TEAM && match.equipo_visitante !== FEATURED_TEAM)) {
            return NextResponse.json({ error: "Solo se pueden editar crónicas de partidos de los Caninos en la liga de invierno 2026-2027." }, { status: 400 });
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
