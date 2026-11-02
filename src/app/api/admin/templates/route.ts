import { NextResponse } from "next/server";
import { loadAdminCompetition } from "@/lib/admin-competition";
import { isFeaturedMatch } from "@/lib/config";
import { madridDate, madridTime } from "@/lib/madrid-time";
import { requireAdmin } from "@/lib/supabase/require-admin";

export const runtime = "nodejs";

const STAT_COLUMNS = [
    "goles",
    "asistencias",
    "penaltis_marcados",
    "penaltis_tirados",
    "dobles_penaltis_marcados",
    "dobles_penaltis_tirados",
    "faltas_directas_marcadas",
    "amarillas",
    "rojas",
] as const;

type Fixture = {
    id: string;
    jornada: number;
    fecha: string | null;
    fecha_prevista: string | null;
    campo: string | null;
    equipo_local: string;
    equipo_visitante: string;
    goles_local: number | null;
    goles_visitante: number | null;
};

function csvCell(value: string | number | null | undefined): string {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function csvResponse(filename: string, rows: Array<Array<string | number | null | undefined>>) {
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
    return new Response(csv, {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "private, no-store",
        },
    });
}

export async function GET(request: Request) {
    const authorization = await requireAdmin();
    if ("response" in authorization) return authorization.response;
    const { adminClient } = authorization;

    try {
        const searchParams = new URL(request.url).searchParams;
        const type = searchParams.get("tipo");
        const competition = await loadAdminCompetition(adminClient, searchParams.get("competicion"));
        if (!competition) return NextResponse.json({ error: "Competición no válida." }, { status: 400 });
        const { season: SEASON, phase, group } = competition;
        const fileSuffix = `${competition.slug}-${SEASON}`;
        if (!["resultados", "convocatoria", "estadisticas"].includes(type ?? "")) {
            return NextResponse.json({ error: "Tipo de plantilla no válido." }, { status: 400 });
        }

        if (type === "resultados") {
            const { data, error } = await adminClient.from("partidos")
                .select("jornada,equipo_local,equipo_visitante,goles_local,goles_visitante")
                .eq("temporada", SEASON).eq("fase", phase).eq("grupo", group)
                .order("jornada").order("equipo_local");
            if (error) throw new Error("No se pudieron consultar los partidos de la competición.");
            const matches = data ?? [];
            // Competición nueva sin calendario: plantilla vacía con códigos de equipo para cargarlo.
            if (!matches.length) {
                return csvResponse(`calendario-${fileSuffix}.csv`, [
                    ["temporada", "jornada", "codigo_local", "codigo_visitante", "goles_local", "goles_visitante"],
                    [SEASON, 1, "", "", "", ""],
                ]);
            }
            return csvResponse(`resultados-${fileSuffix}.csv`, [
                ["temporada", "jornada", "equipo_local", "equipo_visitante", "goles_local", "goles_visitante"],
                ...matches.map((match) => [SEASON, match.jornada, match.equipo_local, match.equipo_visitante, match.goles_local, match.goles_visitante]),
            ]);
        }

        const { data: fixtureData, error: fixtureError } = await adminClient.from("partidos")
            .select("id,jornada,fecha,fecha_prevista,campo,equipo_local,equipo_visitante,goles_local,goles_visitante")
            .eq("temporada", SEASON).eq("fase", phase).eq("grupo", group)
            .order("jornada");
        if (fixtureError) throw new Error("No se pudieron consultar los partidos del Bayern.");
        const fixtures = ((fixtureData ?? []) as Fixture[])
            .filter(isFeaturedMatch);
        if (!fixtures.length) throw new Error("No hay partidos del Bayern cargados para esta competición y grupo.");

        const { data: roster, error: rosterError } = await adminClient.from("jugadores")
            .select("id,nombre").eq("activo", true).order("nombre");
        if (rosterError) throw new Error("No se pudo consultar la plantilla de jugadores.");
        if (!roster?.length) throw new Error("No hay jugadores activos para generar la plantilla.");

        const fixtureIds = fixtures.map((fixture) => fixture.id);
        if (type === "convocatoria") {
            const { data: callups, error } = await adminClient.from("convocatorias")
                .select("partido_id,jugador_id,convocado").in("partido_id", fixtureIds);
            if (error) throw new Error("No se pudieron consultar las convocatorias existentes.");
            const savedCallups = new Map((callups ?? []).map((callup) => [`${callup.partido_id}|${callup.jugador_id}`, callup.convocado]));
            const publishedCallupFixtures = new Set((callups ?? []).map((callup) => callup.partido_id));
            return csvResponse(`convocatoria-${fileSuffix}.csv`, [
                ["temporada", "jornada", "equipo_local", "equipo_visitante", "fecha_prevista", "fecha", "hora", "campo", "jugador_id", "nombre", "convocado"],
                ...fixtures.flatMap((fixture) => roster.map((player, playerIndex) => {
                    const callupKey = `${fixture.id}|${player.id}`;
                    return [
                        SEASON,
                        fixture.jornada,
                        fixture.equipo_local,
                        fixture.equipo_visitante,
                        playerIndex === 0 ? fixture.fecha_prevista : "",
                        playerIndex === 0 && fixture.fecha ? madridDate(fixture.fecha) : "",
                        playerIndex === 0 && fixture.fecha ? madridTime(fixture.fecha) : "",
                        playerIndex === 0 ? fixture.campo : "",
                        player.id,
                        player.nombre,
                        publishedCallupFixtures.has(fixture.id) ? savedCallups.get(callupKey) ? "sí" : "no" : "",
                    ];
                })),
            ]);
        }

        const { data: stats, error: statsError } = await adminClient.from("estadisticas")
            .select("partido_id,jugador_id,goles,asistencias,penaltis_marcados,penaltis_tirados,dobles_penaltis_marcados,dobles_penaltis_tirados,faltas_directas_marcadas,amarillas,rojas")
            .in("partido_id", fixtureIds);
        if (statsError) throw new Error("No se pudieron consultar las estadísticas existentes.");
        const savedStats = new Map((stats ?? []).map((stat) => [`${stat.partido_id}|${stat.jugador_id}`, stat]));
        return csvResponse(`estadisticas-${fileSuffix}.csv`, [
            ["temporada", "jornada", "equipo_local", "equipo_visitante", "jugador_id", "nombre", ...STAT_COLUMNS],
            ...fixtures.flatMap((fixture) => roster.map((player) => {
                const current = savedStats.get(`${fixture.id}|${player.id}`);
                return [
                    SEASON,
                    fixture.jornada,
                    fixture.equipo_local,
                    fixture.equipo_visitante,
                    player.id,
                    player.nombre,
                    ...STAT_COLUMNS.map((column) => current?.[column] ?? ""),
                ];
            })),
        ]);
    } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo generar la plantilla.";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
