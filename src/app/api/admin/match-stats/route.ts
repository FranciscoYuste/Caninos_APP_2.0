import { NextResponse } from "next/server";
import { isManagedMatch } from "@/lib/admin-competition";
import { isFeaturedMatch } from "@/lib/config";
import { MATCH_STAT_FIELDS, hasStats, type MatchStatLine } from "@/lib/players";
import { requireAdmin } from "@/lib/supabase/require-admin";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Estadísticas de un partido desde el formulario del admin. Reutiliza importar_estadisticas_jugadores,
// la misma función transaccional que el CSV, con un único partido: sustituye todas sus estadísticas.
export async function POST(request: Request) {
    try {
        const authorization = await requireAdmin();
        if ("response" in authorization) return authorization.response;
        const { adminClient } = authorization;

        const body = await request.json() as { partido_id?: unknown; estadisticas?: unknown };
        const matchId = typeof body.partido_id === "string" ? body.partido_id : "";
        if (!UUID_PATTERN.test(matchId)) return NextResponse.json({ error: "El partido indicado no es válido." }, { status: 400 });
        if (!Array.isArray(body.estadisticas) || body.estadisticas.length > 60) {
            return NextResponse.json({ error: "La lista de estadísticas no es válida." }, { status: 400 });
        }

        const lines = body.estadisticas.map((item) => {
            const raw = item as Record<string, unknown>;
            if (typeof raw.jugador_id !== "string" || !UUID_PATTERN.test(raw.jugador_id)) {
                throw new Error("Algún jugador no es válido.");
            }
            const line = Object.fromEntries(MATCH_STAT_FIELDS.map(({ key, label }) => {
                const value = raw[key] ?? 0;
                if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 99) {
                    throw new Error(`${label} debe ser un número entre 0 y 99.`);
                }
                return [key, value];
            })) as MatchStatLine;
            if (line.penaltis_marcados > line.penaltis_tirados || line.dobles_penaltis_marcados > line.dobles_penaltis_tirados) {
                throw new Error("No puede haber más penaltis marcados que tirados.");
            }
            return { jugador_id: raw.jugador_id, ...line };
        }).filter(hasStats);
        if (new Set(lines.map((line) => line.jugador_id)).size !== lines.length) {
            return NextResponse.json({ error: "Hay jugadores repetidos." }, { status: 400 });
        }

        const { data: match, error: matchError } = await adminClient
            .from("partidos")
            .select("temporada,fase,grupo,jornada,equipo_local,equipo_visitante")
            .eq("id", matchId)
            .maybeSingle();
        if (matchError) {
            console.error("Could not verify match for stats form", matchError);
            return NextResponse.json({ error: "No se pudo consultar el partido." }, { status: 500 });
        }
        if (!match) return NextResponse.json({ error: "No existe el partido indicado." }, { status: 404 });
        if (!isFeaturedMatch(match) || !(await isManagedMatch(adminClient, match))) {
            return NextResponse.json({ error: "Solo se pueden editar estadísticas de partidos del Bayern de una competición dada de alta." }, { status: 400 });
        }

        const { data, error } = await adminClient.rpc("importar_estadisticas_jugadores", {
            p_temporada: match.temporada,
            p_fase: match.fase,
            p_grupo: match.grupo,
            p_estadisticas: [{
                jornada: match.jornada,
                equipo_local: match.equipo_local,
                equipo_visitante: match.equipo_visitante,
                estadisticas: lines,
            }],
        });
        if (error) return NextResponse.json({ error: error.message }, { status: 422 });
        return NextResponse.json({ ok: true, ...data });
    } catch (error) {
        console.error("Match stats form failed", error);
        const message = error instanceof Error ? error.message : "No se pudieron guardar las estadísticas.";
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
