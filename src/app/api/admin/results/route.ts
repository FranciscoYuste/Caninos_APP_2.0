import { NextResponse } from "next/server";
import { loadAdminCompetition } from "@/lib/admin-competition";
import { requireAdmin } from "@/lib/supabase/require-admin";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ResultInput = { partido_id: string; goles_local: number | null; goles_visitante: number | null };

function asGoals(value: unknown): number | null {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 99) {
        throw new Error("Los goles deben ser un número entre 0 y 99.");
    }
    return value;
}

// Resultados desde el formulario del admin (cualquier partido de la competición, también los de
// los rivales). Dejar los dos goles vacíos borra el resultado. Recalcula la clasificación.
export async function POST(request: Request) {
    try {
        const authorization = await requireAdmin();
        if ("response" in authorization) return authorization.response;
        const { adminClient } = authorization;

        const body = await request.json() as { competicion_id?: unknown; partidos?: unknown };
        const competition = await loadAdminCompetition(adminClient, body.competicion_id);
        if (!competition) return NextResponse.json({ error: "Competición no válida." }, { status: 400 });
        if (!Array.isArray(body.partidos) || !body.partidos.length || body.partidos.length > 60) {
            return NextResponse.json({ error: "Indica al menos un partido." }, { status: 400 });
        }
        const results: ResultInput[] = body.partidos.map((item) => {
            const result = item as { partido_id?: unknown; goles_local?: unknown; goles_visitante?: unknown };
            if (typeof result.partido_id !== "string" || !UUID_PATTERN.test(result.partido_id)) {
                throw new Error("Algún partido no es válido.");
            }
            const home = asGoals(result.goles_local);
            const away = asGoals(result.goles_visitante);
            if ((home === null) !== (away === null)) throw new Error("Indica los goles de los dos equipos o deja ambos vacíos.");
            return { partido_id: result.partido_id, goles_local: home, goles_visitante: away };
        });
        const ids = results.map((result) => result.partido_id);
        if (new Set(ids).size !== ids.length) return NextResponse.json({ error: "Hay partidos repetidos." }, { status: 400 });

        const { count, error: matchError } = await adminClient
            .from("partidos").select("id", { count: "exact", head: true })
            .in("id", ids)
            .eq("temporada", competition.season).eq("fase", competition.phase).eq("grupo", competition.group);
        if (matchError) {
            console.error("Could not verify matches for results form", matchError);
            return NextResponse.json({ error: "No se pudieron consultar los partidos." }, { status: 500 });
        }
        if (count !== ids.length) {
            return NextResponse.json({ error: "Algún partido no pertenece a la competición que estás gestionando." }, { status: 400 });
        }

        const { data, error } = await adminClient.rpc("guardar_resultados", { p_partidos: results });
        if (error) return NextResponse.json({ error: error.message }, { status: 422 });
        return NextResponse.json({ ok: true, ...data });
    } catch (error) {
        console.error("Results form failed", error);
        const message = error instanceof Error ? error.message : "No se pudieron guardar los resultados.";
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
