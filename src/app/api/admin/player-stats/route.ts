import { NextResponse } from "next/server";
import { parsePlayerStatsCsv } from "@/lib/imports/parse-player-stats";
import { assertSeason, loadAdminCompetition, loadImportContext } from "@/lib/admin-competition";
import { requireAdmin } from "@/lib/supabase/require-admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
    try {
        const authorization = await requireAdmin();
        if ("response" in authorization) return authorization.response;
        const { adminClient } = authorization;

        const formData = await request.formData();
        const file = formData.get("archivo");
        if (!(file instanceof File)) return NextResponse.json({ error: "Selecciona un archivo." }, { status: 400 });
        if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "El límite es 5 MB." }, { status: 413 });
        const competition = await loadAdminCompetition(adminClient, formData.get("competicion_id"));
        if (!competition) return NextResponse.json({ error: "Competición no válida." }, { status: 400 });

        const payload = parsePlayerStatsCsv(await file.text(), await loadImportContext(adminClient, competition));
        assertSeason(payload.temporada, competition);
        const { data, error } = await adminClient.rpc("importar_estadisticas_jugadores", {
            p_temporada: competition.season,
            p_fase: competition.phase,
            p_grupo: competition.group,
            p_estadisticas: payload.partidos,
        });
        if (error) return NextResponse.json({ error: error.message }, { status: 422 });
        return NextResponse.json({ ok: true, ...data });
    } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo procesar las estadísticas.";
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
