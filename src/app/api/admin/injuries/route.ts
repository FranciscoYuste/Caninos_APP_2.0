import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const PLAYER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

        const body = await request.json() as { jugador_id?: unknown; lesionado?: unknown; descripcion_lesion?: unknown };
        if (typeof body.jugador_id !== "string" || !PLAYER_ID_PATTERN.test(body.jugador_id)) {
            return NextResponse.json({ error: "El jugador indicado no es válido." }, { status: 400 });
        }
        if (typeof body.lesionado !== "boolean") {
            return NextResponse.json({ error: "El estado de lesión debe ser sí o no." }, { status: 400 });
        }
        if (body.descripcion_lesion !== undefined &&
            body.descripcion_lesion !== null &&
            (typeof body.descripcion_lesion !== "string" || body.descripcion_lesion.trim().length > 240)) {
            return NextResponse.json({ error: "La descripción no puede superar 240 caracteres." }, { status: 400 });
        }
        const injuryDescription = body.lesionado && typeof body.descripcion_lesion === "string"
            ? body.descripcion_lesion.trim() || null
            : null;

        const { data: player, error: playerError } = await adminClient
            .from("jugadores")
            .select("id")
            .eq("id", body.jugador_id)
            .eq("activo", true)
            .maybeSingle();
        if (playerError) {
            console.error("Could not verify player for injury status update", playerError);
            return NextResponse.json({ error: "No se pudo consultar al jugador." }, { status: 500 });
        }
        if (!player) return NextResponse.json({ error: "El jugador no existe o no está activo." }, { status: 404 });

        const { error: updateError } = await adminClient
            .from("jugadores")
            .update({ lesionado: body.lesionado, descripcion_lesion: injuryDescription })
            .eq("id", body.jugador_id);
        if (updateError) {
            console.error("Could not save player injury status", updateError);
            return NextResponse.json({ error: "No se pudo guardar el estado del jugador." }, { status: 500 });
        }
        return NextResponse.json({ ok: true, lesionado: body.lesionado, descripcion_lesion: injuryDescription });
    } catch (error) {
        console.error("Player injury update failed", error);
        const message = error instanceof Error ? error.message : "No se pudo actualizar el estado del jugador.";
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
