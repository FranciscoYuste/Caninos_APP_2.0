import { NextResponse } from "next/server";
import { parseConvocatoriaCsv } from "@/lib/imports/parse-convocatoria";
import { isCompetitionPhase } from "@/lib/competitions";
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
        const phase = String(formData.get("fase") ?? "");
        const group = String(formData.get("grupo") ?? "").trim();
        if (!isCompetitionPhase(phase)) return NextResponse.json({ error: "Fase de competición no válida." }, { status: 400 });
        if (group.length > 80) return NextResponse.json({ error: "El grupo no puede superar 80 caracteres." }, { status: 400 });

        const payload = parseConvocatoriaCsv(await file.text());
        const partidos = payload.partidos.map((partido) => ({
            ...partido,
            jugadores: partido.actualizar_convocatoria
                ? partido.jugadores
                : [],
        }));
        const { data, error } = await adminClient.rpc("importar_convocatorias", {
            p_temporada: payload.temporada,
            p_fase: phase,
            p_grupo: group,
            p_partidos: partidos,
        });
        if (error) return NextResponse.json({ error: error.message }, { status: 422 });
        return NextResponse.json({ ok: true, ...data });
    } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo procesar el archivo de convocatoria.";
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
