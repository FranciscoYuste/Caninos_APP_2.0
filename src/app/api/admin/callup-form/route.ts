import { NextResponse } from "next/server";
import { ACTIVE_PHASE, ACTIVE_SEASON, isFeaturedMatch } from "@/lib/config";
import { normalizeDate, normalizeTime } from "@/lib/imports/parse-convocatoria";
import { requireAdmin } from "@/lib/supabase/require-admin";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CallupFormBody = {
    partido_id?: unknown;
    fecha?: unknown;
    hora?: unknown;
    campo?: unknown;
    jugadores?: unknown;
};

// Convocatoria de un partido desde el formulario del admin. Reutiliza importar_convocatorias,
// la misma función transaccional que el CSV, con un único partido.
export async function POST(request: Request) {
    try {
        const authorization = await requireAdmin();
        if ("response" in authorization) return authorization.response;
        const { adminClient } = authorization;

        const body = await request.json() as CallupFormBody;
        const matchId = typeof body.partido_id === "string" ? body.partido_id : "";
        if (!UUID_PATTERN.test(matchId)) return NextResponse.json({ error: "El partido indicado no es válido." }, { status: 400 });

        const rawDate = typeof body.fecha === "string" ? body.fecha.trim() : "";
        const rawTime = typeof body.hora === "string" ? body.hora.trim() : "";
        const field = typeof body.campo === "string" ? body.campo.trim() : "";
        if (Boolean(rawDate) !== Boolean(rawTime)) {
            return NextResponse.json({ error: "Indica fecha y hora juntas, o deja ambas vacías." }, { status: 400 });
        }
        if (field.length > 120) return NextResponse.json({ error: "El campo no puede superar 120 caracteres." }, { status: 400 });
        const date = rawDate ? normalizeDate(rawDate) : "";
        const time = rawTime ? normalizeTime(rawTime) : "";

        if (!Array.isArray(body.jugadores) || body.jugadores.length > 60) {
            return NextResponse.json({ error: "La lista de jugadores no es válida." }, { status: 400 });
        }
        const players = body.jugadores.map((item) => {
            const player = item as { jugador_id?: unknown; convocado?: unknown };
            if (typeof player.jugador_id !== "string" || !UUID_PATTERN.test(player.jugador_id) || typeof player.convocado !== "boolean") {
                throw new Error("La lista de jugadores no es válida.");
            }
            return { jugador_id: player.jugador_id, convocado: player.convocado };
        });
        if (new Set(players.map((player) => player.jugador_id)).size !== players.length) {
            return NextResponse.json({ error: "Hay jugadores repetidos en la convocatoria." }, { status: 400 });
        }

        const { data: match, error: matchError } = await adminClient
            .from("partidos")
            .select("temporada,fase,grupo,jornada,equipo_local,equipo_visitante")
            .eq("id", matchId)
            .maybeSingle();
        if (matchError) {
            console.error("Could not verify match for callup form", matchError);
            return NextResponse.json({ error: "No se pudo consultar el partido." }, { status: 500 });
        }
        if (!match) return NextResponse.json({ error: "No existe el partido indicado." }, { status: 404 });
        if (match.temporada !== ACTIVE_SEASON || match.fase !== ACTIVE_PHASE || !isFeaturedMatch(match)) {
            return NextResponse.json({ error: `Solo se pueden convocar partidos del Bayern en la competición activa (${ACTIVE_SEASON}).` }, { status: 400 });
        }

        if (players.length) {
            const { data: activePlayers, error: playersError } = await adminClient
                .from("jugadores").select("id").eq("activo", true).in("id", players.map((player) => player.jugador_id));
            if (playersError) {
                console.error("Could not verify callup players", playersError);
                return NextResponse.json({ error: "No se pudo consultar la plantilla." }, { status: 500 });
            }
            if ((activePlayers ?? []).length !== players.length) {
                return NextResponse.json({ error: "Algún jugador no existe o no está activo." }, { status: 400 });
            }
        }

        const { data, error } = await adminClient.rpc("importar_convocatorias", {
            p_temporada: match.temporada,
            p_fase: match.fase,
            p_grupo: match.grupo,
            p_partidos: [{
                jornada: match.jornada,
                fecha: date,
                hora: time,
                campo: field,
                equipo_local: match.equipo_local,
                equipo_visitante: match.equipo_visitante,
                actualizar_convocatoria: players.length > 0,
                jugadores: players,
            }],
        });
        if (error) return NextResponse.json({ error: error.message }, { status: 422 });
        return NextResponse.json({ ok: true, ...data });
    } catch (error) {
        console.error("Callup form failed", error);
        const message = error instanceof Error ? error.message : "No se pudo guardar la convocatoria.";
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
