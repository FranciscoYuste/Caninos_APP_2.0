import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MEDIA_BUCKET } from "@/lib/media";
import { MAX_PLAYER_NAME_LENGTH, isPlayerPosition } from "@/lib/players";
import { requireAdmin } from "@/lib/supabase/require-admin";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RosterBody = { accion?: unknown; jugador_id?: unknown; jugadores?: unknown; nombre?: unknown; dorsal?: unknown; posicion?: unknown };

function asName(value: unknown): string {
    const name = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
    if (!name || name.length > MAX_PLAYER_NAME_LENGTH) throw new Error(`El nombre es obligatorio y admite hasta ${MAX_PLAYER_NAME_LENGTH} caracteres.`);
    return name;
}

function asNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 99) {
        throw new Error("El dorsal debe ser un número entre 0 y 99 o quedar vacío.");
    }
    return value;
}

function asPosition(value: unknown): string {
    if (!isPlayerPosition(value)) throw new Error("La posición no es válida.");
    return value;
}

function asPlayerId(value: unknown): string {
    if (typeof value !== "string" || !UUID_PATTERN.test(value)) throw new Error("El jugador indicado no es válido.");
    return value;
}

// Jugador activo que ya lleva ese dorsal, si lo hay.
async function dorsalOwner(adminClient: SupabaseClient, dorsal: number | null, exceptId?: string): Promise<string | null> {
    if (dorsal === null) return null;
    let query = adminClient.from("jugadores").select("nombre").eq("activo", true).eq("dorsal", dorsal);
    if (exceptId) query = query.neq("id", exceptId);
    const { data, error } = await query.limit(1);
    if (error) throw new Error("No se pudo comprobar el dorsal.");
    return data?.[0]?.nombre ?? null;
}

// Gestión de la plantilla común: guardar cambios de varios jugadores a la vez, dar de alta,
// dar de baja (conserva su historial), recuperar y eliminar jugadores creados por error.
export async function POST(request: Request) {
    try {
        const authorization = await requireAdmin();
        if ("response" in authorization) return authorization.response;
        const { adminClient } = authorization;

        const body = await request.json() as RosterBody;

        if (body.accion === "guardar") {
            if (!Array.isArray(body.jugadores) || !body.jugadores.length || body.jugadores.length > 60) {
                return NextResponse.json({ error: "No hay cambios que guardar." }, { status: 400 });
            }
            const players = body.jugadores.map((item) => {
                const player = item as RosterBody;
                return { jugador_id: asPlayerId(player.jugador_id), nombre: asName(player.nombre), dorsal: asNumber(player.dorsal), posicion: asPosition(player.posicion) };
            });
            const { data, error } = await adminClient.rpc("importar_ficha_jugadores", { p_jugadores: players });
            if (error) return NextResponse.json({ error: error.message }, { status: 422 });
            return NextResponse.json({ ok: true, ...data });
        }

        if (body.accion === "crear") {
            const name = asName(body.nombre);
            const dorsal = asNumber(body.dorsal);
            const position = asPosition(body.posicion);
            const owner = await dorsalOwner(adminClient, dorsal);
            if (owner) return NextResponse.json({ error: `El dorsal ${dorsal} ya lo lleva ${owner}.` }, { status: 409 });
            const { data, error } = await adminClient
                .from("jugadores").insert({ nombre: name, dorsal, posicion: position }).select("id").single();
            if (error) {
                console.error("Could not create player", error);
                return NextResponse.json({ error: "No se pudo dar de alta al jugador." }, { status: 500 });
            }
            return NextResponse.json({ ok: true, id: data.id });
        }

        const playerId = asPlayerId(body.jugador_id);
        const { data: player, error: playerError } = await adminClient
            .from("jugadores").select("id,nombre,dorsal,activo").eq("id", playerId).maybeSingle();
        if (playerError) {
            console.error("Could not load roster player", playerError);
            return NextResponse.json({ error: "No se pudo consultar al jugador." }, { status: 500 });
        }
        if (!player) return NextResponse.json({ error: "El jugador no existe." }, { status: 404 });

        if (body.accion === "baja") {
            // Sigue apareciendo en las competiciones en las que fue convocado.
            const { error } = await adminClient
                .from("jugadores").update({ activo: false, lesionado: false, descripcion_lesion: null }).eq("id", playerId);
            if (error) {
                console.error("Could not deactivate player", error);
                return NextResponse.json({ error: "No se pudo dar de baja al jugador." }, { status: 500 });
            }
            return NextResponse.json({ ok: true });
        }

        if (body.accion === "alta") {
            // Si otro jugador activo heredó su dorsal, vuelve sin dorsal.
            const owner = await dorsalOwner(adminClient, player.dorsal, playerId);
            const { error } = await adminClient
                .from("jugadores").update({ activo: true, ...(owner ? { dorsal: null } : {}) }).eq("id", playerId);
            if (error) {
                console.error("Could not reactivate player", error);
                return NextResponse.json({ error: "No se pudo recuperar al jugador." }, { status: 500 });
            }
            return NextResponse.json({ ok: true, dorsal_liberado: Boolean(owner), ocupante: owner });
        }

        if (body.accion === "eliminar") {
            if (player.activo) return NextResponse.json({ error: "Da de baja al jugador antes de eliminarlo." }, { status: 400 });
            const [callups, stats, katsu] = await Promise.all([
                adminClient.from("convocatorias").select("jugador_id", { count: "exact", head: true }).eq("jugador_id", playerId),
                adminClient.from("estadisticas").select("jugador_id", { count: "exact", head: true }).eq("jugador_id", playerId),
                adminClient.from("partidos").select("id", { count: "exact", head: true }).eq("jugador_katsu_id", playerId),
            ]);
            if (callups.error || stats.error || katsu.error) {
                console.error("Could not check player history", { callups: callups.error, stats: stats.error, katsu: katsu.error });
                return NextResponse.json({ error: "No se pudo comprobar el historial del jugador." }, { status: 500 });
            }
            if ((callups.count ?? 0) + (stats.count ?? 0) + (katsu.count ?? 0) > 0) {
                return NextResponse.json({ error: `${player.nombre} tiene convocatorias o estadísticas: se queda de baja para conservar su historial.` }, { status: 409 });
            }

            const folder = `jugadores/${playerId}`;
            const { data: files } = await adminClient.storage.from(MEDIA_BUCKET).list(folder);
            if (files?.length) {
                const { error: storageError } = await adminClient.storage.from(MEDIA_BUCKET).remove(files.map((file) => `${folder}/${file.name}`));
                if (storageError) console.error("Could not remove player media", storageError);
            }
            const { error } = await adminClient.from("jugadores").delete().eq("id", playerId);
            if (error) {
                console.error("Could not delete player", error);
                return NextResponse.json({ error: "No se pudo eliminar al jugador." }, { status: 500 });
            }
            return NextResponse.json({ ok: true });
        }

        return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
    } catch (error) {
        console.error("Roster update failed", error);
        const message = error instanceof Error ? error.message : "No se pudo actualizar la plantilla.";
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
