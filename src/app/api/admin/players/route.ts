import { NextResponse } from "next/server";
import { parsePlayerRosterCsv } from "@/lib/imports/parse-player-roster";
import { requireAdmin } from "@/lib/supabase/require-admin";

export const runtime = "nodejs";

function escapeCsv(value: string | number | null): string {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export async function GET() {
    const authorization = await requireAdmin();
    if ("response" in authorization) return authorization.response;
    const { adminClient } = authorization;

    const { data: players, error } = await adminClient
        .from("jugadores")
        .select("id,nombre,dorsal,posicion")
        .eq("activo", true)
        .order("dorsal");
    if (error) return NextResponse.json({ error: "No se pudo consultar la plantilla de jugadores." }, { status: 500 });

    const rows = [
        ["jugador_id", "nombre", "dorsal", "posicion"].map(escapeCsv).join(";"),
        ...(players ?? []).map((player) => [player.id, player.nombre, player.dorsal, player.posicion].map(escapeCsv).join(";")),
    ];
    return new Response(`\uFEFF${rows.join("\r\n")}`, {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'attachment; filename="jugadores-caninos.csv"',
            "Cache-Control": "private, no-store",
        },
    });
}

export async function POST(request: Request) {
    try {
        const authorization = await requireAdmin();
        if ("response" in authorization) return authorization.response;
        const { adminClient } = authorization;

        const formData = await request.formData();
        const file = formData.get("archivo");
        if (!(file instanceof File)) return NextResponse.json({ error: "Selecciona un archivo CSV." }, { status: 400 });
        if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "El límite es 5 MB." }, { status: 413 });

        const jugadores = parsePlayerRosterCsv(await file.text());
        const { data, error } = await adminClient.rpc("importar_ficha_jugadores", { p_jugadores: jugadores });
        if (error) return NextResponse.json({ error: error.message }, { status: 422 });
        return NextResponse.json({ ok: true, ...data });
    } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo importar la plantilla de jugadores.";
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
