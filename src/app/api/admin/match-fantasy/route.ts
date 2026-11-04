import { NextResponse } from "next/server";
import { isManagedMatch } from "@/lib/admin-competition";
import { isFeaturedMatch } from "@/lib/config";
import { EMPTY_FANTASY_EXTRA, isFantasyAbsence, type FantasyExtra } from "@/lib/fantasy";
import { requireAdmin } from "@/lib/supabase/require-admin";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EXTRA_KEYS = Object.keys(EMPTY_FANTASY_EXTRA) as Array<keyof FantasyExtra>;

function count(value: unknown, label: string): number {
    const number = value ?? 0;
    if (typeof number !== "number" || !Number.isInteger(number) || number < 0 || number > 99) {
        throw new Error(`${label} debe ser un número entre 0 y 99.`);
    }
    return number;
}

// Datos del fantasy de un partido que no salen de las estadísticas: motivo de cada ausencia,
// portero, penaltis provocados/cometidos/parados, goles en propia y dobles penaltis en contra.
// Sustituye todo lo guardado del partido (guardar_fantasy_partido).
export async function POST(request: Request) {
    try {
        const authorization = await requireAdmin();
        if ("response" in authorization) return authorization.response;
        const { adminClient } = authorization;

        const body = await request.json() as { partido_id?: unknown; dobles_penaltis_en_contra?: unknown; jugadores?: unknown };
        const matchId = typeof body.partido_id === "string" ? body.partido_id : "";
        if (!UUID_PATTERN.test(matchId)) return NextResponse.json({ error: "El partido indicado no es válido." }, { status: 400 });
        if (!Array.isArray(body.jugadores) || body.jugadores.length > 60) {
            return NextResponse.json({ error: "La lista de jugadores no es válida." }, { status: 400 });
        }
        const doublePenaltiesAgainst = count(body.dobles_penaltis_en_contra, "Los dobles penaltis en contra");

        const players = body.jugadores.map((item) => {
            const raw = item as Record<string, unknown>;
            if (typeof raw.jugador_id !== "string" || !UUID_PATTERN.test(raw.jugador_id)) throw new Error("Algún jugador no es válido.");
            if (raw.ausencia !== null && raw.ausencia !== undefined && !isFantasyAbsence(raw.ausencia)) throw new Error("Algún motivo de ausencia no es válido.");
            const extra = Object.fromEntries(EXTRA_KEYS.map((key) => [key, count(raw[key], "Cada dato")])) as FantasyExtra;
            if (extra.penaltis_cometidos_gol > extra.penaltis_cometidos) throw new Error("No puede haber más penaltis cometidos con gol que cometidos.");
            return { jugador_id: raw.jugador_id, ausencia: raw.ausencia ?? null, portero: raw.portero === true, ...extra };
        });
        if (new Set(players.map((player) => player.jugador_id)).size !== players.length) {
            return NextResponse.json({ error: "Hay jugadores repetidos." }, { status: 400 });
        }

        const { data: match, error: matchError } = await adminClient
            .from("partidos")
            .select("temporada,fase,grupo,equipo_local,equipo_visitante")
            .eq("id", matchId)
            .maybeSingle();
        if (matchError) {
            console.error("Could not verify match for fantasy form", matchError);
            return NextResponse.json({ error: "No se pudo consultar el partido." }, { status: 500 });
        }
        if (!match) return NextResponse.json({ error: "No existe el partido indicado." }, { status: 404 });
        if (!isFeaturedMatch(match) || !(await isManagedMatch(adminClient, match))) {
            return NextResponse.json({ error: "Solo se puede puntuar el fantasy de partidos del Bayern de una competición dada de alta." }, { status: 400 });
        }

        const { data, error } = await adminClient.rpc("guardar_fantasy_partido", {
            p_partido_id: matchId,
            p_dobles_penaltis_en_contra: doublePenaltiesAgainst,
            p_jugadores: players,
        });
        if (error) return NextResponse.json({ error: error.message }, { status: 422 });
        return NextResponse.json({ ok: true, ...data });
    } catch (error) {
        console.error("Match fantasy form failed", error);
        const message = error instanceof Error ? error.message : "No se pudo guardar el fantasy.";
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
