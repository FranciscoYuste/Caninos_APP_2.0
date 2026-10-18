import { NextResponse } from "next/server";
import { competitionSlug, isCompetitionPhase, type CompetitionPhase } from "@/lib/competitions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const SEASON = "2026-2027";
const FEATURED_TEAM = "Bayern D.L.Caninos";
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

function madridDate(value: string): string {
    return new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Europe/Madrid",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date(value));
}

function madridTime(value: string): string {
    return new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Madrid",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).format(new Date(value));
}

export async function GET(request: Request) {
    const sessionClient = await createSupabaseServerClient();
    const { data: { user } } = await sessionClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Inicia sesión para continuar." }, { status: 401 });

    const adminClient = createSupabaseAdminClient();
    const { data: profile, error: profileError } = await adminClient
        .from("perfiles").select("rol").eq("id", user.id).single();
    if (profileError || profile?.rol !== "admin") {
        return NextResponse.json({ error: "Se requiere el rol de administrador." }, { status: 403 });
    }

    try {
        const searchParams = new URL(request.url).searchParams;
        const type = searchParams.get("tipo");
        const rawPhase = searchParams.get("fase") ?? "campeon_invierno";
        if (!isCompetitionPhase(rawPhase)) throw new Error("Fase de competición no válida.");
        const phase: CompetitionPhase = rawPhase;
        const group = (searchParams.get("grupo") ?? "").trim();
        if (group.length > 80) throw new Error("El grupo no puede superar 80 caracteres.");
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
            if (!matches.length) throw new Error("No hay calendario de esta competición y grupo cargado en Supabase.");
            return csvResponse(`resultados-${competitionSlug(phase)}-${SEASON}.csv`, [
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
            .filter((fixture) => fixture.equipo_local === FEATURED_TEAM || fixture.equipo_visitante === FEATURED_TEAM);
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
            return csvResponse(`convocatoria-${competitionSlug(phase)}-${SEASON}.csv`, [
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
        return csvResponse(`estadisticas-${competitionSlug(phase)}-${SEASON}.csv`, [
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
