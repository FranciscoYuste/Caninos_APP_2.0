import { NextResponse } from "next/server";
import { isManagedMatch } from "@/lib/admin-competition";
import { isFeaturedMatch } from "@/lib/config";
import { EMPTY_FANTASY_EXTRA, isFantasyAbsence, type FantasyExtra } from "@/lib/fantasy";
import { MATCH_STAT_FIELDS, hasStats, type MatchStatLine } from "@/lib/players";
import { requireAdmin } from "@/lib/supabase/require-admin";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FANTASY_KEYS = Object.keys(EMPTY_FANTASY_EXTRA) as Array<keyof FantasyExtra>;

function count(value: unknown, label: string): number {
    const number = value ?? 0;
    if (typeof number !== "number" || !Number.isInteger(number) || number < 0 || number > 99) {
        throw new Error(`${label} debe ser un número entre 0 y 99.`);
    }
    return number;
}

function playerId(value: unknown): string {
    if (typeof value !== "string" || !UUID_PATTERN.test(value)) throw new Error("Algún jugador no es válido.");
    return value;
}

function assertUnique(ids: string[]) {
    if (new Set(ids).size !== ids.length) throw new Error("Hay jugadores repetidos.");
}

function parseStats(list: unknown[]) {
    const lines = list.map((item) => {
        const raw = item as Record<string, unknown>;
        const jugador_id = playerId(raw.jugador_id);
        const line = Object.fromEntries(MATCH_STAT_FIELDS.map(({ key, label }) => [key, count(raw[key], label)])) as MatchStatLine;
        if (line.penaltis_marcados > line.penaltis_tirados || line.dobles_penaltis_marcados > line.dobles_penaltis_tirados) {
            throw new Error("No puede haber más penaltis marcados que tirados.");
        }
        return { jugador_id, ...line };
    }).filter(hasStats);
    assertUnique(lines.map((line) => line.jugador_id));
    return lines;
}

function parseFantasy(raw: Record<string, unknown>) {
    if (!Array.isArray(raw.jugadores) || raw.jugadores.length > 60) throw new Error("La lista del fantasy no es válida.");
    const doublePenaltiesAgainst = count(raw.dobles_penaltis_en_contra, "Los dobles penaltis en contra");
    const players = raw.jugadores.map((item) => {
        const row = item as Record<string, unknown>;
        const jugador_id = playerId(row.jugador_id);
        if (row.ausencia !== null && row.ausencia !== undefined && !isFantasyAbsence(row.ausencia)) throw new Error("Algún motivo de ausencia no es válido.");
        const extra = Object.fromEntries(FANTASY_KEYS.map((key) => [key, count(row[key], "Cada dato del fantasy")])) as FantasyExtra;
        if (extra.penaltis_cometidos_gol > extra.penaltis_cometidos) throw new Error("No puede haber más penaltis cometidos con gol que cometidos.");
        return { jugador_id, ausencia: row.ausencia ?? null, portero: row.portero === true, ...extra };
    });
    assertUnique(players.map((player) => player.jugador_id));
    return { doublePenaltiesAgainst, players };
}

// Paso «Estadísticas y fantasy» de un partido. Las estadísticas sustituyen todas las del partido
// (importar_estadisticas_jugadores, la misma función que el CSV). Si llega también el fantasy
// (ausencias, portero, penaltis provocados/cometidos/parados, goles en propia y dobles penaltis
// en contra), se guarda todo en una transacción con guardar_estadisticas_fantasy_partido.
export async function POST(request: Request) {
    try {
        const authorization = await requireAdmin();
        if ("response" in authorization) return authorization.response;
        const { adminClient } = authorization;

        const body = await request.json() as { partido_id?: unknown; estadisticas?: unknown; fantasy?: unknown };
        const matchId = typeof body.partido_id === "string" ? body.partido_id : "";
        if (!UUID_PATTERN.test(matchId)) return NextResponse.json({ error: "El partido indicado no es válido." }, { status: 400 });
        if (!Array.isArray(body.estadisticas) || body.estadisticas.length > 60) {
            return NextResponse.json({ error: "La lista de estadísticas no es válida." }, { status: 400 });
        }
        const lines = parseStats(body.estadisticas);
        const fantasy = body.fantasy && typeof body.fantasy === "object" ? parseFantasy(body.fantasy as Record<string, unknown>) : null;

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

        const { data, error } = fantasy
            ? await adminClient.rpc("guardar_estadisticas_fantasy_partido", {
                p_partido_id: matchId,
                p_estadisticas: lines,
                p_dobles_penaltis_en_contra: fantasy.doublePenaltiesAgainst,
                p_jugadores: fantasy.players,
            })
            : await adminClient.rpc("importar_estadisticas_jugadores", {
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
